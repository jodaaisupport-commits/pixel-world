// Headless-Smoke-Test: lädt das Spiel, prüft die Konsole, simuliert Bewegung, Kollision,
// Häuser betreten/verlassen, NPC-Gespräch und Gebietswechsel; speichert Screenshots.
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

await page.goto(URL, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
await page.waitForTimeout(600);

const checks = {};
const check = (name, ok, info) => { checks[name] = { ok: !!ok, ...(info !== undefined ? { info } : {}) }; console.log(`${ok ? '✔' : '✘'} ${name}`, info !== undefined ? JSON.stringify(info) : ''); };
const pos = () => page.evaluate(() => { const g = window.__game; return { scene: g.sceneId, x: +g.player.x.toFixed(1), y: +g.player.y.toFixed(1), tx: Math.floor(g.player.x / 16), ty: Math.floor((g.player.y - 2) / 16) }; });
const shot = (name) => page.screenshot({ path: OUT + name });
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
/** Taste halten, bis die Szene wechselt (inkl. Überblendung). */
async function walkUntilScene(key, sceneId, timeout = 4000) {
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

if (process.env.FULLMAP) {
  const data = await page.evaluate(() => window.__game.fullMapDataURL());
  fs.writeFileSync(process.env.FULLMAP, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();

check('Konsole fehlerfrei', problems.length === 0, problems);
const failed = Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k);
console.log(failed.length ? `VERIFY: FAILED (${failed.join(', ')})` : `VERIFY: OK (${Object.keys(checks).length} Prüfungen)`);
process.exit(failed.length ? 1 : 0);
