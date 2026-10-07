// Headless-Smoke-Test: lädt das Spiel, prüft die Konsole, simuliert Bewegung,
// testet Kollision und speichert Screenshots.
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
const pos = () => page.evaluate(() => ({ x: +window.__game.player.x.toFixed(1), y: +window.__game.player.y.toFixed(1), place: document.getElementById('hud-place').textContent }));

const spawn = await pos();
await page.screenshot({ path: OUT + 'spawn.png' });

// Bewegung: halten von Tasten (WASD + Pfeile)
async function hold(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }
await hold('KeyS', 700);
const afterDown = await pos();
await hold('ArrowLeft', 1600);
const afterLeft = await pos();
await page.keyboard.down('KeyS'); await page.keyboard.down('KeyA');
await page.waitForTimeout(500);
await page.keyboard.up('KeyS'); await page.keyboard.up('KeyA');
await hold('KeyW', 350);
await page.keyboard.down('KeyD');
await page.waitForTimeout(160); // Screenshot mitten in der Laufanimation
await page.screenshot({ path: OUT + 'moved.png' });
await page.keyboard.up('KeyD');
const moved = await pos();

// Kollision: Figur unter das rote Haus stellen und nach oben gegen die Wand laufen
const collision = await page.evaluate(async () => {
  const g = window.__game;
  g.teleport(44, 27); // unter Haus (44..48, 22..25)
  const startY = g.player.y;
  g.input.up = true;
  await new Promise((r) => setTimeout(r, 900));
  g.input.up = false;
  const p = g.player;
  const tx = Math.floor(p.x / 16), tyTop = Math.floor((p.y - 6) / 16);
  // Wasser-Test: am Steg vorbei ins Wasser laufen
  return { startY, endY: p.y, blockedByHouse: p.y > 25 * 16, tileInsideSolid: g.world.isSolid(tx, tyTop) };
});
const water = await page.evaluate(async () => {
  const g = window.__game, w = g.world;
  // nächstes Wasser-Tile rechts neben Land suchen
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
// Extra-Screenshots: hinter dem Dach (Geist-Silhouette) und Minimap + Abendlicht
await page.evaluate(() => window.__game.teleport(46, 22));
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + 'behind-roof.png' });
await page.evaluate(() => window.__game.teleport(20, 40));
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyT');
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + 'lake-minimap-evening.png' });
await page.keyboard.press('KeyM');
await page.keyboard.press('KeyT'); await page.keyboard.press('KeyT');
// Interaktion: Schild am Dorfeingang lesen
await page.evaluate(() => window.__game.teleport(41, 28));
await page.waitForTimeout(100);
await page.keyboard.press('KeyE');
await page.waitForTimeout(100);
const dialog = await page.evaluate(() => { const d = document.getElementById('dialog'); return { visible: !d.classList.contains('hidden'), text: d.textContent }; });
await page.screenshot({ path: OUT + 'sign-dialog.png' });
await page.keyboard.press('KeyE');
// Übersicht der gesamten Karte (nur zur Kontrolle)
if (process.env.FULLMAP) {
  const data = await page.evaluate(() => window.__game.fullMapDataURL());
  fs.writeFileSync(process.env.FULLMAP, Buffer.from(data.split(',')[1], 'base64'));
}
await browser.close();

const result = { spawn, afterDown, afterLeft, moved, collision, water, dialog, problems };
console.log(JSON.stringify(result, null, 2));
const ok = problems.length === 0 && (moved.x !== spawn.x || moved.y !== spawn.y) && collision.blockedByHouse && !collision.tileInsideSolid && water.blocked !== false && dialog.visible;
console.log(ok ? 'VERIFY: OK' : 'VERIFY: FAILED');
process.exit(ok ? 0 : 1);
