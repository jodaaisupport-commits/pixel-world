// Headless-Smoke-Test: lädt das Spiel, prüft die Konsole, simuliert Bewegung, Kollision,
// Häuser betreten/verlassen, NPC-Gespräch, Gebietswechsel, Items, Inventar, Quests, Kampf,
// Tod/Respawn, Laden und Speichern/Laden, beide Geschichten inkl. Bosse; speichert Screenshots.
// Nutzung:  python3 -m http.server 8080 &   dann:  node tools/verify.mjs
import { chromium, devices } from 'playwright-core';
import fs from 'node:fs';
import { runArc2 } from './verify-arc2.mjs';
import { runMobile } from './verify-mobile.mjs';

const URL = process.env.URL || 'http://localhost:8080/';
const OUT = new globalThis.URL('../screenshots/', import.meta.url).pathname;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
const ignoreNoise = (s) => /service.?worker|sw\.js|Failed to register|favicon|mods\/|chrome-extension/i.test(s || '');
page.on('console', (m) => { const t = m.text(); if (m.type() === 'error' || m.type() === 'warning') { if (!ignoreNoise(t)) problems.push(`console.${m.type()}: ${t}`); } else console.log('  [page]', t); });
page.on('pageerror', (e) => { if (!ignoreNoise(e.message)) problems.push('pageerror: ' + e.message); });
page.on('requestfailed', (r) => { if (!ignoreNoise(r.url())) problems.push('requestfailed: ' + r.url()); });
page.on('response', (r) => { if (r.status() >= 400 && !ignoreNoise(r.url())) problems.push(`http ${r.status()}: ${r.url()}`); });

await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'reset=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
await page.waitForTimeout(600);

const checks = {};
const check = (name, ok, info) => { checks[name] = { ok: !!ok, ...(info !== undefined ? { info } : {}) }; console.log(`${ok ? '✔' : '✘'} ${name}`, info !== undefined ? JSON.stringify(info) : ''); };
const pos = () => page.evaluate(() => { const g = window.__game; return { scene: g.sceneId, x: +g.player.x.toFixed(1), y: +g.player.y.toFixed(1), tx: Math.floor(g.player.x / 16), ty: Math.floor((g.player.y - 2) / 16) }; });
const shot = (name) => page.screenshot({ path: OUT + name });
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
/** Taste halten, bis die Szene wechselt (inkl. Überblendung). */
async function walkUntilScene(key, sceneId, timeout = 4000) {
  // Übergangstest: Gegner im aktuellen Gebiet entfernen, damit kein Rückstoß den Weg verstellt
  await page.evaluate(() => { const s = window.__game.scene; if (s && s.enemies) s.enemies.length = 0; });
  await page.keyboard.down(key);
  try { await page.waitForFunction((id) => window.__game.sceneId === id, sceneId, { timeout }); } catch { /* geprüft unten */ }
  await page.keyboard.up(key);
  await page.waitForFunction(() => !window.__game.fading, null, { timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(120);
  return pos();
}
async function goTo(id, tx, ty, dir) {
  await page.evaluate(([i, x, y, d]) => window.__game.goTo(i, x, y, d), [id, tx, ty, dir]);
  await page.waitForFunction((i) => window.__game.sceneId === i && !window.__game.fading, id, { timeout: 4000 });
  await page.waitForTimeout(250);
}
const teleport = (tx, ty, dir) => page.evaluate(([x, y, d]) => window.__game.teleport(x, y, d), [tx, ty, dir]);
const dialogState = () => page.evaluate(() => { const d = document.getElementById('dialog'); return { visible: !d.classList.contains('hidden'), name: d.querySelector('.dlg-name').textContent, text: d.querySelector('.dlg-text').textContent, page: d.querySelector('.dlg-more').dataset.page }; });

// ------------------------------------------------------------ 0. Story-Intro (neues Spiel)
const G0 = (fn, a) => page.evaluate(fn, a);
const tracksSeen = new Set();
const noteTrack = async () => { const t = await G0(() => window.__game.audio.state.track); if (t) tracksSeen.add(t); return t; };
async function dialogOpen() { return G0(() => !document.getElementById('dialog').classList.contains('hidden')); }
/** Dialog per E durchblättern (erst Text komplett, dann weiter). */
async function talkThrough(max = 48) {
  for (let i = 0; i < max; i++) {
    if (!(await dialogOpen())) return i;
    await page.keyboard.press('KeyE'); await page.waitForTimeout(110); // einzeln drücken: ein zweites E nach dem Schließen würde neu anreden
  }
  return max;
}
await page.keyboard.press('KeyX'); // erste Eingabe → AudioContext darf starten
await page.waitForTimeout(2600);
const intro0 = await G0(() => ({ cine: window.__game.cine, ch: window.__game.story.ch, title: document.querySelector('#cine .cine-title')?.textContent || '' }));
check('Intro-Zwischensequenz startet bei neuem Spiel', intro0.cine && intro0.cine.total >= 4 && intro0.ch === 0, intro0);
await shot('story-intro.png');
const panelsSeen = new Set();
for (let i = 0; i < 30; i++) {
  const c = await G0(() => window.__game.cine);
  if (!c) break;
  panelsSeen.add(c.idx);
  if (c.idx === 2 && !panelsSeen.has('shot')) { await page.waitForTimeout(2200); await shot('story-intro-2.png'); panelsSeen.add('shot'); }
  await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await page.keyboard.press('KeyE'); await page.waitForTimeout(700);
}
check('Intro: alle Tafeln durchgeblättert', [0, 1, 2, 3, 4].every((i) => panelsSeen.has(i)), [...panelsSeen]);
await page.waitForFunction(() => !document.getElementById('dialog').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(700);
const lina = await dialogState();
await shot('story-lina.png');
check('Geskriptete Szene: Lina läuft herbei und spricht', lina.visible && /Lina/.test(lina.name), lina.name);
await talkThrough();
await page.waitForFunction(() => !window.__game.script, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(500);
const ch1 = await G0(() => ({ ch: window.__game.story.ch, banner: document.getElementById('banner').textContent }));
check('Kapitel 1 beginnt nach dem Intro', ch1.ch === 1 && /Kapitel 1/.test(ch1.banner), ch1);
const au0 = await G0(() => window.__game.audio.state);
await noteTrack();
check('AudioContext ohne Fehler erzeugt, Dorfmusik läuft', au0.ready && au0.ctxState !== 'closed' && au0.errors.length === 0 && au0.track === 'village', { ctx: au0.ctxState, track: au0.track, errors: au0.errors });
check('Soundeffekte werden ausgelöst (Dialog-Blips, Auswahl)', (au0.played.blip || 0) > 10 && (au0.played.select || 0) > 0, au0.played);
await G0(() => window.__game.teleport(57.5, 31, 'down'));
await page.waitForTimeout(3200); // Banner ausblenden lassen

// ------------------------------------------------------------ 1. Bewegung
const spawn = await pos();
await shot('spawn.png');
await hold('KeyS', 700);
await hold('ArrowLeft', 1600);
await page.keyboard.down('KeyS'); await page.keyboard.down('KeyA');
await page.waitForTimeout(500);
await page.keyboard.up('KeyS'); await page.keyboard.up('KeyA');
await hold('KeyW', 350);
await page.keyboard.down('KeyD');
await page.waitForTimeout(160); // Screenshot mitten in der Laufanimation
await shot('moved.png');
await page.keyboard.up('KeyD');
const moved = await pos();
check('Bewegung (WASD/Pfeile)', moved.x !== spawn.x || moved.y !== spawn.y, { spawn, moved });

// ------------------------------------------------------------ 2. Kollision + Laufanimation bei Blockade
const collision = await page.evaluate(async () => {
  const g = window.__game;
  g.teleport(44, 27); // unter der Hauswand der Taverne (Tür ist bei x=46)
  g.input.up = true;
  await new Promise((r) => setTimeout(r, 900));
  const movingWhileBlocked = g.player.moving;
  g.input.up = false;
  const p = g.player;
  return { endY: p.y, blockedByHouse: p.y > 25 * 16, tileInsideSolid: g.world.isSolid(Math.floor(p.x / 16), Math.floor((p.y - 6) / 16)), movingWhileBlocked };
});
check('Kollision mit Hauswand', collision.blockedByHouse && !collision.tileInsideSolid, collision);
check('Keine Laufanimation, wenn blockiert', !collision.movingWhileBlocked);
const water = await page.evaluate(async () => {
  const g = window.__game, w = g.world;
  for (let y = 40; y < 60; y++) for (let x = 5; x < 40; x++)
    if (!w.isSolid(x, y) && !w.isSolid(x - 1, y) && w.tileAt(x + 1, y) === 5 && w.tileAt(x + 2, y) === 5) {
      g.teleport(x, y);
      g.input.right = true;
      await new Promise((r) => setTimeout(r, 900));
      g.input.right = false;
      return { from: x, endTileX: Math.floor((g.player.x + 5) / 16), blocked: Math.floor((g.player.x + 5) / 16) <= x };
    }
  return { note: 'kein Testufer gefunden' };
});
check('Wasser blockiert', water.blocked !== false, water);

// ------------------------------------------------------------ 3. Extras Dorf
await teleport(46, 22);
await page.waitForTimeout(200);
await shot('behind-roof.png');
await teleport(20, 40);
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyT');
await page.waitForTimeout(250);
await shot('lake-minimap-evening.png');
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyT'); await page.keyboard.press('KeyT');
await teleport(41, 28);
await page.waitForTimeout(100);
await page.keyboard.press('KeyE');
await page.waitForTimeout(150);
const sign = await dialogState();
await shot('sign-dialog.png');
await page.keyboard.press('KeyE'); await page.keyboard.press('Escape');
check('Schild lesen', sign.visible && sign.text.length > 0, sign.text.slice(0, 40));

// ------------------------------------------------------------ 4. Haus betreten (laufen) und verlassen
await teleport(46, 27, 'up');
await page.waitForTimeout(150);
const inTav = await walkUntilScene('KeyW', 'taverne');
check('Taverne durch die Tür betreten', inTav.scene === 'taverne', inTav);
await page.waitForTimeout(400);
await shot('interior-taverne.png');

// ------------------------------------------------------------ 5. NPC-Gespräch (Wirtin Greta)
async function talkTo(id) {
  const placed = await page.evaluate((nid) => {
    const g = window.__game, n = g.scene.npcs.find((k) => k.id === nid);
    if (!n) return null;
    n.mode = n.mode === 'wander' ? 'wander' : n.mode;
    const ntx = Math.floor(n.x / 16), nty = Math.floor((n.y - 2) / 16);
    for (const [dx, dy, dir] of [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]) {
      if (!g.world.isSolid(ntx + dx, nty + dy)) { n.state = 'idle'; n.timer = 5; g.teleport(ntx + dx, nty + dy, dir); n.x = ntx * 16 + 8; n.y = nty * 16 + 12; return { ntx, nty, dir }; }
    }
    return { ntx, nty, dir: 'none' };
  }, id);
  await page.waitForTimeout(80);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(150);
  return { placed, ...(await dialogState()) };
}
const greta = await talkTo('greta');
check('NPC anreden (E): Dialog mit Namen', greta.visible && /Greta/.test(greta.name), { name: greta.name, page: greta.page });
await page.waitForTimeout(1800); // Schreibmaschinen-Effekt laufen lassen
const typed = await dialogState();
await shot('npc-dialog.png');
check('Schreibmaschinen-Text läuft', typed.text.length > greta.text.length, { before: greta.text.length, after: typed.text.length });
let pages = 1, guard = 0;
while ((await dialogState()).visible && guard++ < 20) {
  await page.keyboard.press('KeyE'); await page.waitForTimeout(60);
  const d = await dialogState();
  if (d.visible && d.page && +d.page.split('/')[0] > pages) pages = +d.page.split('/')[0];
}
const afterTalk = await dialogState();
check('Mehrseitiger Dialog wird geblättert und geschlossen', pages >= 2 && !afterTalk.visible, { pages });

// verlassen: nach unten durch die Tür
await page.evaluate(() => window.__game.teleport(6, 8, 'down'));
const outTav = await walkUntilScene('KeyS', 'village');
check('Taverne verlassen → zurück vor der Tür', outTav.scene === 'village' && outTav.tx === 46 && Math.abs(outTav.ty - 26) <= 1, outTav);

// Krämer per E an der Tür betreten
await teleport(67, 25, 'up');
await page.waitForTimeout(100);
await page.keyboard.press('KeyE');
await page.waitForFunction(() => window.__game.sceneId === 'kraemer' && !window.__game.fading, null, { timeout: 4000 }).catch(() => {});
await page.waitForTimeout(400);
const inKr = await pos();
check('Krämerladen per E betreten', inKr.scene === 'kraemer', inKr);
await shot('interior-kraemer.png');
const anton = await talkTo('anton');
check('Krämer Anton spricht', anton.visible && anton.name.length > 0, anton.name);
await page.keyboard.press('Escape');
await goTo('schmiede', 6, 7, 'up'); await shot('interior-schmiede.png');
await goTo('zuhause', 6, 7, 'up'); await shot('interior-zuhause.png');

// ------------------------------------------------------------ 6. Neue Gebiete betreten (über Wege am Kartenrand)
await goTo('village', 59, 3, 'up');
const dw = await walkUntilScene('KeyW', 'dunkelwald');
check('Dunkelwald über den Nordweg betreten', dw.scene === 'dunkelwald', dw);
const popup = await page.evaluate(() => { const a = document.getElementById('area'); return { show: a.classList.contains('show'), text: a.textContent }; });
check('Gebietsname wird eingeblendet', popup.show && /Dunkelwald/.test(popup.text), popup.text);
await teleport(30, 30, 'up'); await page.waitForTimeout(500);
await shot('area-dunkelwald.png');
await page.keyboard.press('KeyM'); await page.waitForTimeout(150);
await shot('area-dunkelwald-minimap.png');
await page.keyboard.press('KeyM');

await goTo('village', 93, 32, 'right');
const bg = await walkUntilScene('KeyD', 'berge');
check('Graufels-Berge über den Ostweg betreten', bg.scene === 'berge', bg);
await teleport(40, 11, 'up'); await page.waitForTimeout(500);
await shot('area-berge.png');
const ho = await walkUntilScene('KeyW', 'hoehle');
check('Höhle über den Mineneingang betreten', ho.scene === 'hoehle', ho);
await teleport(20, 22, 'up'); await page.waitForTimeout(500);
await shot('area-hoehle.png');
await teleport(20, 27, 'down');
const back = await walkUntilScene('KeyS', 'berge');
check('Höhle verlassen → zurück in die Berge', back.scene === 'berge', back);

await goTo('village', 56, 69, 'down');
const ku = await walkUntilScene('KeyS', 'kueste');
check('Küste über den Südweg betreten', ku.scene === 'kueste', ku);
await teleport(40, 18, 'down'); await page.waitForTimeout(500);
await shot('area-kueste.png');

// Rückweg zum Dorf über den Kartenrand
await teleport(35, 2, 'up');
const vb = await walkUntilScene('KeyW', 'village');
check('Von der Küste zurück ins Dorf', vb.scene === 'village', vb);

// ============================================================ Phase 3: Items, Kampf, Quests, Speichern
const G = (fn, arg) => page.evaluate(fn, arg);
const advanceDialog = async (max = 12) => { for (let i = 0; i < max && (await dialogState()).visible; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(70); } };
const advanceToChoice = async () => { for (let i = 0; i < 12; i++) { if (await G(() => window.__game.dialog.choosing)) return true; await page.keyboard.press('KeyE'); await page.waitForTimeout(70); } return false; };
const enemyCount = () => G(() => window.__game.enemies.length);
check('Dorf ist sicher (keine Gegner)', (await G(() => window.__game.world.enemies.length)) === 0 && (await G(() => window.__game.sceneId)) === 'village');

// --- Gegenstand aufheben (Taler im Dorf, durch Hinlaufen)
const coinPick = await G(() => { const g = window.__game, p = g.world.pickups.find((k) => !g.game.taken[k.key]); g.teleport(p.tx - 1, p.ty, 'right'); return { key: p.key, before: g.game.coins }; });
await hold('KeyD', 450);
const coinAfter = await G((k) => ({ coins: window.__game.game.coins, taken: !!window.__game.game.taken[k] }), coinPick.key);
check('Gegenstand aufheben (Taler)', coinAfter.taken && coinAfter.coins > coinPick.before, { before: coinPick.before, after: coinAfter.coins });

// --- Ohne Schwert kein Angriff; Schwert von Bruno (Quest 1)
await page.keyboard.press('KeyJ'); await page.waitForTimeout(80);
check('Ohne Waffe kein Schwertschlag', !(await G(() => !!window.__game.player.atk)));
await goTo('schmiede', 6, 7, 'up');
const bruno = await talkTo('bruno');
check('Schmied Bruno anreden', bruno.visible && /Bruno/.test(bruno.name), bruno.name);
await advanceDialog();
await page.waitForTimeout(150);
const sword = await G(() => ({ weapon: window.__game.game.weapon, q: window.__game.game.quests.schwert }));
check('Quest „Ein Schwert für unterwegs“ abgeschlossen → Eisenschwert', sword.weapon === 'schwert' && sword.q === 'done', sword);

// --- Inventar öffnen
await page.keyboard.press('KeyI'); await page.waitForTimeout(150);
const inv1 = await G(() => { const el = document.getElementById('inv'); return { visible: !el.classList.contains('hidden'), text: el.textContent }; });
check('Inventar öffnet mit I', inv1.visible && /Eisenschwert/.test(inv1.text));
await page.keyboard.press('KeyI'); await page.waitForTimeout(80);
check('Inventar schließt mit I', await G(() => document.getElementById('inv').classList.contains('hidden')));

// --- Quest annehmen (Mira, Auswahl „Ja“)
await goTo('dunkelwald', 50, 33, 'up');
await G(() => { window.__game.scene.enemies.length = 0; });
await talkTo('mira');
const choice = await advanceToChoice();
await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
const qAccepted = await G(() => window.__game.game.quests.kraeuter);
check('Quest annehmen (Mira: Kräuter)', choice && qAccepted === 'active', { choice, state: qAccepted });

// --- Kampf: Schleim treffen und besiegen
const clearOverlays = () => G(() => { for (const id of ['banner', 'area']) document.getElementById(id).classList.remove('show'); document.getElementById('toasts').innerHTML = ''; });
/** Gegner vom Typ `type` an einen freien Platz rechts neben die Figur stellen und mit J besiegen. */
async function fight(type, areaShot, spot) {
  const info = await G(([t, sp]) => {
    const g = window.__game;
    const e = g.enemies.find((k) => k.type === t) || g.enemies[0];
    // zwei weitere Gegner derselben Art stillstehend in die Nähe stellen (fürs Bild), Rest entfernen
    const extra = g.enemies.filter((k) => k !== e && k.type === e.type).slice(0, 2);
    g.scene.enemies = [e, ...extra];
    g.teleport(sp[0], sp[1], 'right');
    e.frozen = true; e.x = g.player.x + 20; e.y = g.player.y;
    extra.forEach((k, i) => { k.frozen = true; k.x = g.player.x + [58, -44][i]; k.y = g.player.y + [-30, 34][i]; });
    window.__target = e.uid;
    return { type: e.type, hp: e.hp, uid: e.uid };
  }, [type, spot]);
  let shotTaken = !areaShot, hits = 0;
  for (let i = 0; i < 10; i++) {
    const alive = await G(() => { const g = window.__game, e = g.enemies.find((k) => k.uid === window.__target); if (!e) return false; e.x = g.player.x + 20; e.y = g.player.y; e.kbt = 0; g.player.dir = 'right'; return true; });
    if (!alive) break;
    if (!shotTaken) { await clearOverlays(); await page.waitForTimeout(650); }
    await page.keyboard.press('KeyJ');
    if (!shotTaken) { await page.waitForTimeout(30); await shot(areaShot); shotTaken = true; }
    await page.waitForTimeout(330);
    hits++;
  }
  await page.waitForTimeout(200);
  const res = await G(() => ({ left: window.__game.enemies.filter((k) => k.uid === window.__target).length, drops: window.__game.drops.map((d) => d.item) }));
  await G(() => { window.__game.game.hp = window.__game.game.maxHp; window.__game.scene.enemies = []; });
  return { ...info, swings: hits, ...res };
}
await goTo('dunkelwald', 32, 38, 'up'); // erneutes Betreten → Gegner wieder da
const slime = await fight('slime', 'combat-dunkelwald.png', [30, 39]);
check('Gegner treffen und besiegen (Schleim)', slime.left === 0, slime);

// --- Schaden nehmen (Knockback, Unverwundbarkeit)
await goTo('dunkelwald', 32, 40, 'up');
const dmg = await G(async () => {
  const g = window.__game, e = g.enemies[0];
  g.scene.enemies = [e];
  const hp0 = g.game.hp, x0 = g.player.x, y0 = g.player.y;
  g.player.inv = 0;
  e.x = g.player.x; e.y = g.player.y - 2;
  await new Promise((r) => setTimeout(r, 120));
  return { hp0, hp1: g.game.hp, inv: +g.player.inv.toFixed(2), knock: +Math.hypot(g.player.x - x0, g.player.y - y0).toFixed(1) };
});
check('Schaden nehmen (Herzen, Rückstoß, Blinken)', dmg.hp1 < dmg.hp0 && dmg.inv > 0, dmg);

// --- Moorkraut sammeln (Hinlaufen), Quest abschließen
await goTo('dunkelwald', 20, 30, 'up');
await G(() => { window.__game.scene.enemies.length = 0; });
let herbs = 0;
for (let i = 0; i < 5; i++) {
  const t = await G(() => { const g = window.__game, p = g.world.pickups.find((k) => k.item === 'moorkraut' && !g.game.taken[k.key]); if (!p) return null;
    for (const [dx, dir] of [[-1, 'right'], [1, 'left']]) if (!g.world.isSolid(p.tx + dx, p.ty)) { g.teleport(p.tx + dx, p.ty, dir); return dir; }
    g.teleport(p.tx, p.ty); return 'none'; });
  if (!t) break;
  if (t !== 'none') await hold(t === 'right' ? 'KeyD' : 'KeyA', 420); else await page.waitForTimeout(150);
  herbs = await G(() => window.__game.game.inv.moorkraut || 0);
}
check('Moorkraut gesammelt (5/5)', herbs >= 5, herbs);
await goTo('dunkelwald', 50, 33, 'up');
await G(() => { window.__game.scene.enemies.length = 0; });
await talkTo('mira');
await advanceDialog();
await page.waitForTimeout(450);
const qDone = await G(() => ({ q: window.__game.game.quests.kraeuter, maxHp: window.__game.game.maxHp, potions: window.__game.game.inv.heiltrank, banner: document.getElementById('banner').textContent }));
await shot('quest-complete.png');
check('Quest abschließen (Mira: 2 Heiltränke, +1 Herz)', qDone.q === 'done' && qDone.maxHp === 8 && qDone.potions === 2 && /abgeschlossen/i.test(qDone.banner), qDone);

// --- Gegner erscheinen beim Wiederbetreten neu
await goTo('village', 59, 3, 'up');
await goTo('dunkelwald', 31.5, 45, 'up');
check('Gegner erscheinen beim Betreten neu', (await enemyCount()) >= 8, await enemyCount());

// --- Kampf an der Küste (Krabbe) und in den Bergen (Felsgolem)
await goTo('kueste', 30, 16, 'down');
const crab = await fight('crab', 'combat-kueste.png', [30, 16]);
check('Krabbe besiegt', crab.left === 0, crab);
await goTo('berge', 30, 30, 'up');
const golem = await fight('golem', 'combat-berge.png', [32, 32]);
check('Felsgolem besiegt (lässt Eisenerz fallen)', golem.left === 0 && golem.drops.includes('eisenerz'), golem);
await page.waitForTimeout(300);
for (let i = 0; i < 4; i++) {
  const more = await G(() => { const g = window.__game, d = g.drops[0]; if (!d) return false; g.player.x = d.x; g.player.y = d.y + 4; return true; });
  if (!more) break;
  await page.waitForTimeout(160);
}
const ore = await G(() => window.__game.game.inv.eisenerz || 0);
check('Beute aufsammeln (Eisenerz)', ore >= 1, ore);

// --- Truhe öffnen (Kristallhöhle: Sternenerz)
await goTo('hoehle', 25, 6, 'up');
await G(() => { window.__game.scene.enemies.length = 0; });
await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
const chest = await G(() => ({ opened: Object.keys(window.__game.game.opened), star: window.__game.game.inv.sternenerz || 0, text: document.querySelector('#dialog .dlg-text').textContent }));
await advanceDialog();
check('Truhe in der Höhle öffnen (Sternenerz)', chest.star === 1 && chest.opened.length === 1, chest);
const bat = await (async () => { await goTo('hoehle', 20, 22, 'up'); return fight('bat', 'combat-hoehle.png', [20, 22]); })();
check('Fledermaus besiegt', bat.left === 0, bat);

// --- Quest bei Fischer Jan annehmen, Questlog
await goTo('village', 18, 46, 'down');
await talkTo('jan');
await advanceToChoice(); await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
check('Quest annehmen (Jan: Kompass)', (await G(() => window.__game.game.quests.kompass)) === 'active');
// weitere Quests annehmen: Bruno (Kristallklinge) und Erwin (Kristalle)
await goTo('schmiede', 6, 7, 'up');
await talkTo('bruno'); await advanceToChoice(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
await goTo('berge', 40, 13, 'up');
await G(() => { window.__game.scene.enemies.length = 0; });
await talkTo('erwin'); await advanceToChoice(); await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
const q3 = await G(() => window.__game.game.quests);
check('Quests annehmen (Bruno: Klinge, Erwin: Kristalle)', q3.klinge === 'active' && q3.kristalle === 'active', q3);
await clearOverlays(); await page.waitForTimeout(600);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(200);
const ql = await G(() => { const el = document.getElementById('questlog'); return { visible: !el.classList.contains('hidden'), text: el.textContent }; });
await shot('questlog.png');
check('Questlog (Q) zeigt Quests', ql.visible && /Kompass/.test(ql.text) && /Kräuter für Mira/.test(ql.text));
await page.keyboard.press('Escape');

// --- Laden bei Krämer Anton
await goTo('kraemer', 6, 7, 'up');
await talkTo('anton');
await advanceToChoice(); await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
const coins0 = await G(() => window.__game.game.coins);
await clearOverlays(); await page.waitForTimeout(600);
await page.keyboard.press('KeyE'); await page.waitForTimeout(150); // Apfel kaufen
const shop = await G(() => ({ mode: window.__game.ui.mode, coins: window.__game.game.coins, apples: window.__game.game.inv.apfel || 0 }));
await shot('shop.png');
check('Laden: Apfel kaufen', shop.mode === 'shop' && shop.apples === 1 && shop.coins === coins0 - 5, { coins0, ...shop });
await page.keyboard.press('Escape');

// --- Inventar-Screenshot + Trank benutzen
await G(() => { window.__game.game.hp = 3; });
await clearOverlays(); await page.waitForTimeout(600);
await page.keyboard.press('KeyI'); await page.waitForTimeout(150);
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80);
await shot('inventory.png');
const use = await G(() => { const g = window.__game; const items = Object.keys(g.game.inv).filter((k) => g.game.inv[k] > 0); g.ui.sel = items.indexOf('heiltrank'); g.ui.render(); return g.game.hp; });
await page.keyboard.press('KeyE'); await page.waitForTimeout(100);
const used = await G(() => ({ hp: window.__game.game.hp, potions: window.__game.game.inv.heiltrank }));
check('Heiltrank im Inventar benutzen', used.hp > use && used.potions === 1, { before: use, ...used });
await page.keyboard.press('Escape');

// --- Tod und Respawn im Dorf
await goTo('berge', 30, 30, 'up');
await G(() => { const g = window.__game; g.game.hp = 1; const e = g.enemies[0]; g.scene.enemies = [e]; g.player.inv = 0; e.x = g.player.x; e.y = g.player.y - 2; });
await page.waitForTimeout(400);
const dying = await G(() => window.__game.dying);
await page.waitForFunction(() => window.__game.sceneId === 'village' && !window.__game.fading, null, { timeout: 6000 }).catch(() => {});
await page.waitForTimeout(200);
const resp = await G(() => ({ scene: window.__game.sceneId, hp: window.__game.game.hp, maxHp: window.__game.game.maxHp }));
check('Tod → Respawn im Dorf mit vollen Herzen', dying && resp.scene === 'village' && resp.hp === resp.maxHp, resp);

// --- Speichern / Laden (Reload behält Fortschritt), Reset
await goTo('village', 57, 33, 'down'); // Gebietswechsel = Autosave
const before = await G(() => { const g = window.__game.game; return JSON.stringify({ coins: g.coins, inv: g.inv, quests: g.quests, weapon: g.weapon, maxHp: g.maxHp, opened: g.opened }); });
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
await page.waitForTimeout(400);
const after = await G(() => { const g = window.__game.game; return JSON.stringify({ coins: g.coins, inv: g.inv, quests: g.quests, weapon: g.weapon, maxHp: g.maxHp, opened: g.opened }); });
const afterPos = await pos();
check('Speichern/Laden: Fortschritt bleibt nach Neuladen erhalten', before === after && afterPos.scene === 'village', { same: before === after, pos: afterPos });
// ------------------------------------------------------------ 7. Hauptgeschichte „Der Kristallfluch“
async function talkStory(id) {
  await G((i) => { const g = window.__game, n = g.scene.npcs.find((k) => k.id === i); n.state = 'idle'; n.timer = 5; g.player.x = n.x; g.player.y = n.y + 15; g.player.dir = 'up'; g.player.kbt = 0; }, id);
  await page.waitForTimeout(60);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(350);
  const d = await dialogState(); let text = d.text;
  for (let i = 0; i < 48 && (await dialogOpen()); i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(110); if (await dialogOpen()) text += ' ' + (await dialogState()).text; }
  return { name: d.name, text };
}
const story = () => G(() => ({ ch: window.__game.story.ch, f: { ...window.__game.story.flags } }));
/** Laufendes Skript zu Ende spielen: offene Dialoge weiterblättern, bis das Skript fertig ist. */
async function finishScript(timeout = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout && (await G(() => window.__game.script))) { if (await dialogOpen()) await page.keyboard.press('KeyE'); await page.waitForTimeout(140); }
}
const waitScript = () => page.waitForFunction(() => !window.__game.script, null, { timeout: 20000 }).catch(() => {});
const clearEnemies = () => G(() => { window.__game.scene.enemies.length = 0; });
// Kapitel 1 → 2: Oma Hilde (Schwert-Quest ist schon erledigt)
await goTo('zuhause', 8, 8, 'up');
const hil = await talkStory('hilde');
await page.waitForTimeout(700);
let sst = await story();
check('Kapitel 1: Oma Hilde erzählt vom Kristallherz → Kapitel 2', /Kristallherz/.test(hil.text) && sst.f.hilde && sst.ch === 2, { ch: sst.ch });
await page.waitForTimeout(2600);
await page.keyboard.press('KeyQ'); await page.waitForTimeout(300);
const qlMain = await G(() => { const m = document.querySelector('#questlog .quest.main'); return m ? m.textContent : ''; });
await shot('questlog-main.png');
await page.keyboard.press('KeyQ');
check('Questlog: Hauptquest hervorgehoben (Kapitel 2/5)', /Hauptquest/.test(qlMain) && /Kapitel 2/.test(qlMain), qlMain.slice(0, 80));
// Kapitel 2: Mira → Schrein (geskriptet: Kameraschwenk, Bildschirmbeben, Schattenschleime)
await goTo('dunkelwald', 50, 33, 'up'); await clearEnemies();
await noteTrack();
const mi = await talkStory('mira');
check('Mira spricht über den Nebel (Story-Dialog)', (await story()).f.mira && /Nebel/.test(mi.text), mi.text.slice(0, 60));
await goTo('dunkelwald', 31.5, 8.6, 'up'); await clearEnemies();
await page.keyboard.press('KeyE'); await page.waitForTimeout(300); await talkThrough(6);
await page.waitForTimeout(1950);
await shot('story-schrein.png');
const shrineCam = await G(() => ({ cam: !!window.__game.state.cam, shake: window.__game.state.shake > 0 }));
await page.waitForTimeout(3200); await finishScript(); await page.waitForTimeout(500);
sst = await story();
const shadows = await G(() => window.__game.enemies.filter((e) => e.type === 'schatten').length);
check('Schrein-Szene: Kameraschwenk + Beben, Schattenschleime erscheinen → Kapitel 3', shrineCam.cam && sst.f.schrein && sst.ch === 3 && shadows === 3, { shrineCam, ch: sst.ch, shadows });
// Kapitel 3: Erwin, Grubenlampe, Sprengpulver, Geröll
await goTo('berge', 43, 13, 'up'); await clearEnemies(); await noteTrack();
const er1 = await talkStory('erwin');
await G(() => { const g = window.__game; g.game.lamp = true; g.G.markDirty(); }); // Lampe (Nebenquest) per Debug
const er2 = await talkStory('erwin');
check('Erwin: Weststollen + Sprengpulver nach der Grubenlampe', /Weststollen/.test(er1.text) && (await G(() => window.__game.G.has('sprengpulver'))), er2.text.slice(0, 50));
await goTo('hoehle', 9.5, 12.6, 'left'); await clearEnemies(); await noteTrack();
await hold('KeyA', 900);
const blocked = await pos();
check('Geröll versperrt den Weststollen', blocked.scene === 'hoehle' && blocked.tx >= 7, blocked);
await G(() => window.__game.teleport(7.5, 12.6, 'left'));
await page.keyboard.press('KeyE'); await page.waitForTimeout(300); await talkThrough(6);
await page.waitForTimeout(1650); await shot('story-sprengung.png');
await page.waitForTimeout(1000); await finishScript(); await page.waitForTimeout(400);
sst = await story();
check('Sprengung: Geröll weg → Kapitel 4', sst.f.rubble && sst.ch === 4, { ch: sst.ch });
const tf = await walkUntilScene('KeyA', 'tiefe', 5000);
check('Treppe hinab in den Kristallschlund', tf.scene === 'tiefe', tf);
// Kapitel 4: Siegeltor (Gate: nur mit Kristallklinge)
await goTo('tiefe', 15.5, 22.6, 'up');
await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
let gateText = '';
for (let i = 0; i < 20 && (await dialogOpen()); i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(110); if (await dialogOpen()) gateText += ' ' + (await dialogState()).text; }
check('Siegeltor bleibt ohne Kristallklinge zu', !(await story()).f.tor && /Sternenerz/.test(gateText), gateText.slice(0, 60));
await G(() => { const g = window.__game; g.G.give('kristallklinge', 1, true); g.game.weapon = 'kristallklinge'; g.game.quests.klinge = 'done'; g.G.markDirty(); }); // Nebenquest per Debug
await page.waitForTimeout(400);
await page.keyboard.press('KeyE'); await page.waitForTimeout(300); await talkThrough(6);
await page.waitForTimeout(700); await shot('story-siegel.png');
await page.waitForTimeout(3000); await finishScript(); await page.waitForTimeout(400);
sst = await story();
check('Kristallklinge bricht das Siegel → Kapitel 5', sst.f.tor && sst.ch === 5, { ch: sst.ch });

// ------------------------------------------------------------ 8. Bosskampf: Umbrakor
const boss = () => G(() => { const g = window.__game, b = g.boss; return { fight: g.fight, script: g.script, hp: b && b.hp, max: b && b.maxHp, phase: b && b.phase, st: b && b.state, lock: !!g.story.flags.arena_lock, bar: !document.getElementById('bossbar').classList.contains('hidden'), track: g.audio.state.track, scene: g.sceneId }; });
const heal = () => G(() => { const g = window.__game; g.game.hp = g.game.maxHp; });
await hold('KeyW', 900);
await page.waitForFunction(() => window.__game.fight && !window.__game.script, null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(400);
let bs = await boss(); await noteTrack();
check('Arena betreten → Boss-Intro, Tore verriegelt, Lebensleiste, Bossmusik', bs.fight && bs.lock && bs.bar && bs.track === 'boss' && bs.st !== 'sleep', bs);
await heal(); await page.waitForTimeout(2600); await heal();
await shot('boss-phase1.png');
// echter Schwertschlag
const hp0 = (await boss()).hp;
for (let i = 0; i < 12 && (await boss()).hp >= hp0; i++) {
  await G(() => { const g = window.__game, b = g.boss; g.teleport(b.x / 16 - 0.5, (b.y + 18) / 16 - 0.75, 'up'); g.game.hp = g.game.maxHp; });
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(160);
}
bs = await boss();
check('Boss nimmt Schwertschaden (Trefferblitz)', bs.hp < hp0, { hp0, hp: bs.hp });
await G(() => window.__game.teleport(15.5, 17, 'up'));
await G(() => { const g = window.__game, b = g.boss; for (let k = 0; k < 60 && b.phase < 2; k++) { b.inv = 0; if (b.state !== 'transition') b.hurt(1, g.bossEnv); } });
await page.waitForTimeout(400);
bs = await boss();
check('Phasenwechsel bei 2/3 Leben (Übergangseffekt)', bs.phase === 2 && bs.st === 'transition', bs);
await page.waitForTimeout(2400); await heal();
await G(() => window.__game.teleport(15.5, 16.5, 'up'));
await page.waitForFunction(() => { const b = window.__game.boss; window.__game.game.hp = window.__game.game.maxHp; return b && ['spikes', 'summon'].includes(b.state); }, null, { timeout: 12000, polling: 50 }).catch(() => {});
await page.waitForTimeout(700); await heal();
await shot('boss-phase2.png');
bs = await boss();
check('Phase 2 greift an (neue Angriffsmuster)', bs.phase === 2 && bs.fight, bs);
// Tod in der Arena → Neustart vor der Arena
await G(() => { const g = window.__game; g.game.hp = 1; g.player.inv = 0; g.bossEnv.hurt(2, g.boss); });
await page.waitForTimeout(300);
await page.waitForFunction(() => window.__game.sceneId === 'tiefe' && !window.__game.fading && !window.__game.dying, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(400);
const rsp = await G(() => { const g = window.__game; return { scene: g.sceneId, ty: Math.floor(g.player.y / 16), hp: g.game.hp, max: g.game.maxHp, boss: g.boss && g.boss.state, bhp: g.boss && g.boss.hp, lock: !!g.story.flags.arena_lock, fight: g.fight }; });
check('Tod im Bosskampf → Neuversuch vor der Arena (Boss zurückgesetzt)', rsp.scene === 'tiefe' && rsp.ty >= 22 && rsp.hp === rsp.max && rsp.boss === 'sleep' && rsp.bhp === 36 && !rsp.lock && !rsp.fight, rsp);
await page.keyboard.down('KeyW');
await page.waitForFunction(() => window.__game.script || window.__game.fight, null, { timeout: 8000 }).catch(() => {});
await page.keyboard.up('KeyW');
await page.waitForFunction(() => window.__game.fight && !window.__game.script, null, { timeout: 15000 }).catch(() => {});
await heal();
/** Debug-Schaden (wartet Phasenübergänge ab), bis die Bedingung erfüllt ist. */
async function damageUntil(cond, dmg = 1, timeout = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const r = await G(([c, d]) => { const g = window.__game, b = g.boss; if (!b || new Function('b', 'return ' + c)(b)) return true; if (b.vulnerable) b.hurt(d, g.bossEnv); g.game.hp = g.game.maxHp; return false; }, [cond, dmg]);
    if (r) return true;
    await page.waitForTimeout(80);
  }
  return false;
}
await damageUntil('b.phase >= 3');
await page.waitForTimeout(3600); await heal();
await shot('boss-phase3.png');
bs = await boss();
check('Phase 3 erreicht', bs.phase === 3, bs);
await damageUntil("b.hp <= 0 || b.state === 'dying'", 2);
await page.waitForFunction(() => !window.__game.fight, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(1500);
for (let i = 0; i < 20 && !(await G(() => window.__game.cine)); i++) { if (await dialogOpen()) await talkThrough(4); await page.waitForTimeout(400); }
const outro = await G(() => ({ cine: window.__game.cine, done: !!window.__game.story.flags.boss_done, title: window.__game.game.title, herz: window.__game.G.count('kristallherz'), track: window.__game.audio.state.track }));
await noteTrack();
check('Boss besiegt → Belohnung (Herzcontainer, Titel, Splitter) + Outro', outro.done && outro.cine && outro.title === 'Held von Pixeldorf' && outro.herz === 1 && outro.track === 'ending', outro);
await page.waitForTimeout(2600); await shot('story-outro.png');
for (let i = 0; i < 30 && !(await G(() => window.__game.credits)); i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(150); await page.keyboard.press('KeyE'); await page.waitForTimeout(600); }
await page.waitForTimeout(12000);
await shot('ending.png');
check('Abspann (Credits) wird gezeigt', await G(() => window.__game.credits));
await page.keyboard.press('KeyE');
await page.waitForFunction(() => window.__game.sceneId === 'village' && !window.__game.script && !window.__game.fading, null, { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(600);
const post = await G(() => ({ ch: window.__game.story.ch, scene: window.__game.sceneId, banner: document.getElementById('banner').textContent }));
check('Nach dem Abspann: freies Spiel (Kapitel 6, Hauptquest abgeschlossen)', post.ch === 6 && post.scene === 'village' && /abgeschlossen/.test(post.banner), post);
await page.waitForTimeout(3000);
const linaPost = await talkStory('lina');
check('Geänderte NPC-Dialoge nach dem Ende (Lina)', /Held/.test(linaPost.text), linaPost.text.slice(0, 60));
await goTo('dunkelwald', 32, 40, 'up');
const fogGone = await G(() => window.__game.story.flags.boss_done);
await shot('story-nachher-dunkelwald.png');
check('Nebel im Dunkelwald verschwunden', fogGone);

// ------------------------------------------------------------ 9a. Zweite Geschichte „Die Sternensplitter“ (tools/verify-arc2.mjs)
await runArc2({ page, URL, OUT, check, problems });

// ------------------------------------------------------------ 9. Audio: Optionen, Umschalten, Persistenz
await goTo('village', 57, 33, 'down');
await page.waitForTimeout(2600);
await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
// Zeile „Musik-Lautstärke“ ansteuern (Stumm, Musik, dann Lautstärke)
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(150);
const opt = await G(() => ({ open: !document.getElementById('options').classList.contains('hidden'), text: document.getElementById('options').textContent, vol: window.__game.audio.settings.musicVol }));
await shot('options.png');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
check('Optionsmenü (P): Lautstärke einstellbar', opt.open && /Musik-Lautstärke/.test(opt.text) && opt.vol > 0.6, { vol: opt.vol });
await page.keyboard.press('KeyN'); await page.waitForTimeout(80); await page.keyboard.press('KeyB'); await page.waitForTimeout(200);
const muted = await G(() => window.__game.audio.settings);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
const persisted = await G(() => window.__game.audio.settings);
check('N/B schalten Musik/Effekte, Einstellung bleibt gespeichert', muted.music === false && muted.sfx === false && persisted.music === false && persisted.sfx === false, persisted);
await page.keyboard.press('KeyN'); await page.keyboard.press('KeyB');
await G(() => window.__game.audio.setSettings({ musicVol: 0.6 }));
await page.waitForTimeout(400);
const au1 = await G(() => window.__game.audio.state);
check('Musik wechselt je Gebiet (Dorf, Wald, Berge, Höhle, Boss, Ende)', ['village', 'forest', 'mountain', 'cave', 'boss', 'ending'].every((t) => tracksSeen.has(t)) && au1.errors.length === 0, [...tracksSeen]);
// Musikprobe: Dorf-Thema offline rendern (OfflineAudioContext → WAV)
const wav = await G(() => window.__game.audio.renderWav('village', 20));
fs.writeFileSync(OUT + 'music-sample.wav', Buffer.from(wav, 'base64'));
check('Musikprobe gerendert (screenshots/music-sample.wav)', fs.statSync(OUT + 'music-sample.wav').size > 1e6, fs.statSync(OUT + 'music-sample.wav').size);

await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'reset=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
const fresh = await G(() => ({ coins: window.__game.game.coins, weapon: window.__game.game.weapon, url: location.search }));
check('?reset=1 startet ein neues Spiel', fresh.coins === 10 && !fresh.weapon, fresh);

const desk = await G(() => ({ touch: document.body.classList.contains('touch'), hidden: document.getElementById('touch').classList.contains('hidden'), a: getComputedStyle(document.querySelector('#touch .t-a')).display !== 'none' && document.querySelector('#touch .t-a').getBoundingClientRect().width > 0 }));
check('Desktop: keine Touch-Steuerung eingeblendet', !desk.touch && desk.hidden && !desk.a, desk);
const man = await G(() => fetch('manifest.webmanifest').then((r) => r.json()).then(async (m) => ({ name: m.name, icons: await Promise.all(m.icons.map((i) => fetch(i.src).then((r) => r.ok))) })));
check('Web-App-Manifest und Icons erreichbar', man.name === 'Pixel World' && man.icons.every(Boolean), man);

if (process.env.FULLMAP) {
  const data = await page.evaluate(() => window.__game.fullMapDataURL());
  fs.writeFileSync(process.env.FULLMAP, Buffer.from(data.split(',')[1], 'base64'));
}
// ------------------------------------------------------------ 10. v100 Features
await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'reset=1&nointro=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
await page.waitForTimeout(400);
const v100 = await G(() => {
  const st = window.__game.features || window.__game.v100?.status?.();
  return { done: st?.done, total: st?.total, hasVulkan: !!window.__game.MAPS?.vulkaninsel, hasGrotte: !!window.__game.MAPS?.grotte, sw: 'serviceWorker' in navigator, loadbar: !!document.getElementById('loadbar'), settings: !!window.__game.v100?.settings };
});
check('v100 Features markiert (≥90/100)', v100.done >= 90, v100);
check('Vulkaninsel + Grotte registriert', v100.hasVulkan && v100.hasGrotte, v100);
check('Ladebalken + Settings vorhanden', v100.loadbar && v100.settings, v100);
await goTo('kueste', 58, 20, 'right');
await page.waitForTimeout(200);
await G(() => { try { window.__game.goTo('vulkaninsel', 12, 22, 'left'); } catch (e) { console.error(e); } });
await page.waitForFunction(() => window.__game.sceneId === 'vulkaninsel' && !window.__game.fading, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(300);
const vul = await G(() => window.__game.sceneId);
check('Vulkaninsel betretbar', vul === 'vulkaninsel', vul);
await G(() => { try { window.__game.goTo('grotte', 10, 14, 'up'); } catch (e) { console.error(e); } });
await page.waitForFunction(() => window.__game.sceneId === 'grotte' && !window.__game.fading, null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(300);
const gr = await G(() => window.__game.sceneId);
check('Unterwasser-Grotte betretbar', gr === 'grotte', gr);
await goTo('village', 57, 32, 'down');
await page.keyboard.press('KeyK');
const dodge = await G(() => window.__game.player.dodgeT > 0 || window.__game.player.dodgeCd > 0 || window.__game.player.inv > 0);
check('Ausweichen (K) setzt I-Frame/Cooldown', dodge);
await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
const opt2 = await G(() => document.getElementById('options').textContent);
await page.keyboard.press('Escape');
check('Optionen: Seed / Slot / Vibration', /Seed|Speicherplatz|Vibration/.test(opt2), opt2.slice(0, 120));
const mods = await G(() => fetch('mods/index.json').then((r) => r.ok));
check('Mod-Index erreichbar', mods);

await runMobile({ browser, URL, OUT, check: (n, ok, info) => check(n, ok, info), devices });
await browser.close();

check('Konsole fehlerfrei', problems.length === 0, problems);
const failed = Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k);
console.log(failed.length ? `VERIFY: FAILED (${failed.join(', ')})` : `VERIFY: OK (${Object.keys(checks).length} Prüfungen)`);
process.exit(failed.length ? 1 : 0);
