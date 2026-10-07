// Headless-Smoke-Test: lädt das Spiel, prüft die Konsole, simuliert Bewegung, Kollision,
// Häuser betreten/verlassen, NPC-Gespräch, Gebietswechsel, Items, Inventar, Quests, Kampf,
// Tod/Respawn, Laden und Speichern/Laden; speichert Screenshots.
// Nutzung:  python3 -m http.server 8080 &   dann:  node tools/verify.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const URL = process.env.URL || 'http://localhost:8080/';
const OUT = new globalThis.URL('../screenshots/', import.meta.url).pathname;
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--use-gl=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const problems = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`); else console.log('  [page]', m.text()); });
page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => problems.push('requestfailed: ' + r.url()));
page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });

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
await page.goto(URL + (URL.includes('?') ? '&' : '?') + 'reset=1', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
const fresh = await G(() => ({ coins: window.__game.game.coins, weapon: window.__game.game.weapon, url: location.search }));
check('?reset=1 startet ein neues Spiel', fresh.coins === 10 && !fresh.weapon, fresh);

if (process.env.FULLMAP) {
  const data = await page.evaluate(() => window.__game.fullMapDataURL());
  fs.writeFileSync(process.env.FULLMAP, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();

check('Konsole fehlerfrei', problems.length === 0, problems);
const failed = Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k);
console.log(failed.length ? `VERIFY: FAILED (${failed.join(', ')})` : `VERIFY: OK (${Object.keys(checks).length} Prüfungen)`);
process.exit(failed.length ? 1 : 0);
