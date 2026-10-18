// Mobil-Prüfungen (Phase 6): Chrome mit Geräte-Emulation (Touch, Quer- und Hochformat).
// Joystick bewegt die Figur, Multi-Touch (laufen + Schwert), A spricht/blättert, B schlägt, Fenster per Antippen.
// Von verify.mjs aufgerufen oder eigenständig: node tools/verify-mobile.mjs
import fs from 'node:fs';

export async function runMobile({ browser, URL, OUT, check, devices }) {
  const problems = [];
  async function open(device) {
    const ctx = await browser.newContext({ ...device });
    const page = await ctx.newPage();
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`[${device.viewport.width}x${device.viewport.height}] console.${m.type()}: ${m.text()}`); });
    page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(`http ${r.status()}: ${r.url()}`); });
    await page.goto(URL + '?reset=1&nointro=1', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
    await page.waitForTimeout(500);
    const cdp = await ctx.newCDPSession(page);
    return { ctx, page, cdp };
  }
  const G = (page, fn, a) => page.evaluate(fn, a);
  const center = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, vis: r.width > 0 && getComputedStyle(document.querySelector(s)).display !== 'none' }; }, sel);
  const touch = (cdp, type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  const clearOverlays = (page) => G(page, () => { for (const id of ['banner', 'area']) document.getElementById(id).classList.remove('show'); document.getElementById('toasts').innerHTML = ''; }).then(() => page.waitForTimeout(450));
  const tap = async (page, sel) => { const c = await center(page, sel); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(160); return c; };

  // ---------------------------------------------------------- Querformat (Pixel 7)
  const L = await open(devices['Pixel 7 landscape']);
  let { page, cdp } = L;
  const lay = await G(page, () => ({
    touch: document.body.classList.contains('touch'), ctrl: !document.getElementById('touch').classList.contains('hidden'),
    help: getComputedStyle(document.getElementById('help')).display, scroll: document.scrollingElement.scrollHeight <= innerHeight + 1 && document.scrollingElement.scrollWidth <= innerWidth + 1,
    canvasW: document.getElementById('game').getBoundingClientRect().width, vw: innerWidth, scale: window.__game.scale, ta: getComputedStyle(document.body).touchAction,
  }));
  check('Mobil quer: Touch-Steuerung automatisch an, Tastaturhilfe aus, kein Scrollen, Bild füllt den Schirm', lay.touch && lay.ctrl && lay.help === 'none' && lay.scroll && lay.canvasW >= lay.vw && lay.ta === 'none', lay);
  // Startpunkt im Dorf, Schwert geben
  await G(page, () => { const g = window.__game; g.G.equip('schwert'); g.game.quests.schwert = 'done'; g.teleport(54, 30, 'right'); g.scene.enemies.length = 0; });
  await page.waitForTimeout(300);
  // Joystick: Daumen auf den Stick, nach rechts ziehen
  const st = await center(page, '.t-stick');
  const x0 = await G(page, () => window.__game.player.x);
  await touch(cdp, 'touchStart', [[st.x, st.y, 1]]);
  for (let i = 1; i <= 6; i++) { await touch(cdp, 'touchMove', [[st.x + i * 7, st.y, 1]]); await page.waitForTimeout(30); }
  await page.waitForTimeout(500);
  const mid = await G(page, () => ({ x: window.__game.player.x, dir: window.__game.player.dir, moving: window.__game.player.moving }));
  // Multi-Touch: Daumen bleibt auf dem Stick, zweiter Finger tippt B
  const b = await center(page, '.t-b');
  await touch(cdp, 'touchStart', [[st.x + 42, st.y, 1], [b.x, b.y, 2]]);
  await page.waitForTimeout(60);
  const swing = await G(page, () => ({ atk: !!window.__game.player.atk, moving: window.__game.player.moving }));
  await touch(cdp, 'touchEnd', [[st.x + 42, st.y, 1]]);
  await page.waitForTimeout(80);
  await touch(cdp, 'touchEnd', []);
  await page.waitForTimeout(300);
  const after = await G(page, () => ({ x: window.__game.player.x, moving: window.__game.player.moving }));
  check('Joystick bewegt die Figur (8 Richtungen, Totzone), Loslassen stoppt', mid.x - x0 > 20 && mid.dir === 'right' && mid.moving && !after.moving, { x0, mid, after });
  check('Multi-Touch: laufen und gleichzeitig mit B zuschlagen', swing.atk && swing.moving, swing);
  // Weit drücken = rennen
  await G(page, () => window.__game.teleport(48, 30, 'right'));
  const runV = await (async () => {
    const a = await G(page, () => window.__game.player.x);
    await touch(cdp, 'touchStart', [[st.x, st.y, 3]]); await touch(cdp, 'touchMove', [[st.x + 18, st.y, 3]]); await page.waitForTimeout(400);
    const bb = await G(page, () => window.__game.player.x);
    await touch(cdp, 'touchMove', [[st.x + 60, st.y, 3]]); await page.waitForTimeout(400);
    const c = await G(page, () => window.__game.player.x);
    await touch(cdp, 'touchEnd', []); await page.waitForTimeout(200);
    return { slow: bb - a, fast: c - bb };
  })();
  check('Joystick weit drücken → rennen', runV.fast > runV.slow * 1.3, runV);
  // A: NPC ansprechen, Dialog durch Antippen weiterblättern
  await G(page, () => { const g = window.__game, n = g.scene.npcs.find((k) => k.id === 'lina'); const tx = Math.floor(n.x / 16), ty = Math.floor((n.y - 2) / 16); n.state = 'idle'; n.timer = 30; for (const [dx, dy, dir] of [[0, 1, 'up'], [-1, 0, 'right'], [1, 0, 'left'], [0, -1, 'down']]) if (!g.world.isSolid(tx + dx, ty + dy)) { g.teleport(tx + dx, ty + dy, dir); n.x = tx * 16 + 8; n.y = ty * 16 + 12; break; } });
  await page.waitForTimeout(80);
  await tap(page, '.t-a');
  await page.waitForTimeout(900);
  const d1 = await G(page, () => ({ open: window.__game.dialog.open, name: window.__game.dialog.name, page: window.__game.dialog.page }));
  await clearOverlays(page);
  await page.screenshot({ path: OUT + 'mobile-dialog.png' });
  await tap(page, '#dialog'); await page.waitForTimeout(250); await tap(page, '#dialog');
  await page.waitForTimeout(250);
  const d2 = await G(page, () => ({ open: window.__game.dialog.open, page: window.__game.dialog.page }));
  for (let i = 0; i < 20 && (await G(page, () => window.__game.dialog.open)); i++) { await tap(page, '.t-a'); await page.waitForTimeout(80); }
  const d3 = await G(page, () => window.__game.dialog.open);
  check('A spricht NPC an, Antippen/A blättert und schließt den Dialog', d1.open && d1.name === 'Lina' && (d2.page > d1.page || !d2.open) && !d3, { d1, d2, d3 });
  // Auswahl per Antippen (Ja/Nein)
  await G(page, () => window.__game.dialog.show('Test', ['Frage?'], null, { options: ['Eins', 'Zwei'], onSelect: (i) => { window.__picked = i; } }));
  await page.waitForFunction(() => window.__game.dialog.choosing);
  await tap(page, '#dialog .dlg-choices [data-i="1"]');
  check('Dialog-Auswahl per Antippen', (await G(page, () => window.__picked)) === 1);
  // Inventar: öffnen, Platz antippen, Trank benutzen, schließen
  await G(page, () => { const g = window.__game; g.G.give('apfel', 2, true); g.G.give('heiltrank', 1, true); g.game.hp = 2; });
  await tap(page, '.t-sm[data-k="inv"]');
  const invOpen = await G(page, () => !document.getElementById('inv').classList.contains('hidden'));
  await tap(page, '#inv .slot[data-i="1"]');
  const sel = await G(page, () => window.__game.ui.sel);
  await clearOverlays(page);
  await page.screenshot({ path: OUT + 'mobile-inventory.png' });
  await tap(page, '#inv .slot[data-i="1"]'); // zweites Antippen = benutzen
  const hp = await G(page, () => window.__game.game.hp);
  await tap(page, '#inv .win-close');
  const invClosed = await G(page, () => document.getElementById('inv').classList.contains('hidden'));
  check('Inventar per Antippen: öffnen, Platz wählen, benutzen, ✕ schließt', invOpen && sel === 1 && hp > 2 && invClosed, { invOpen, sel, hp, invClosed });
  // Questlog: öffnen, mit B schließen
  await tap(page, '.t-sm[data-k="quest"]');
  const qOpen = await G(page, () => !document.getElementById('questlog').classList.contains('hidden'));
  const bVis = await center(page, '.t-b'); // im Menü weichen Stick und Knöpfe dem Fenster
  await tap(page, '#questlog .win-close');
  const qClosed = await G(page, () => !window.__game.ui.open);
  await tap(page, '.t-sm[data-k="pause"]');
  const optOpen = await G(page, () => !document.getElementById('options').classList.contains('hidden'));
  const optText = await G(page, () => document.getElementById('options').textContent);
  await tap(page, '#options .win-close');
  const allClosed = await G(page, () => !window.__game.ui.open);
  check('Questlog und Optionen per Antippen (Touch-Schalter im Optionsmenü), ✕ schließt', qOpen && qClosed && optOpen && /Touch-Steuerung/.test(optText) && allClosed && !bVis.vis, { qOpen, qClosed, optOpen, allClosed });
  const mm = () => G(page, () => document.getElementById('minimap').classList.contains('hidden'));
  const m0 = await mm(); await tap(page, '.t-sm[data-k="map"]'); const m1 = await mm(); await tap(page, '.t-sm[data-k="map"]'); const m2 = await mm();
  check('Karten-Knopf schaltet die Minimap um', m0 !== m1 && m2 === m0, { m0, m1, m2 });
  // Normales Spielbild
  await G(page, () => { const g = window.__game; g.teleport(57, 31, 'down'); g.game.hp = g.game.maxHp; });
  await page.waitForTimeout(600); await clearOverlays(page);
  await page.screenshot({ path: OUT + 'mobile-landscape.png' });
  const fps = await G(page, () => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
  check('Mobil: Bildrate gemessen (headless, Software-Rendering)', fps > 20, { fps });
  // Zwischensequenz per Antippen
  await G(page, () => { window.__game.state.musicOverride = undefined; });
  await L.ctx.close();

  // ---------------------------------------------------------- Hochformat (iPhone 13)
  const P = await open(devices['iPhone 13']);
  page = P.page;
  await G(page, () => { const g = window.__game; g.teleport(57, 31, 'down'); });
  await page.waitForTimeout(700); await clearOverlays(page);
  await page.screenshot({ path: OUT + 'mobile-portrait.png' });
  const por = await G(page, () => ({
    portrait: document.body.classList.contains('portrait'), hint: getComputedStyle(document.getElementById('rotate-hint')).display,
    canvasH: document.getElementById('game').getBoundingClientRect().height, vh: innerHeight, scale: window.__game.scale,
    a: (() => { const r = document.querySelector('.t-a').getBoundingClientRect(); return r.right <= innerWidth && r.bottom <= innerHeight && r.width >= 60; })(),
  }));
  check('Mobil hoch: spielbar, Steuerung im Bild, Quer-Hinweis sichtbar', por.portrait && por.hint === 'block' && por.canvasH >= por.vh && por.a, por);
  // Joystick nach oben im Hochformat
  const st2 = await center(page, '.t-stick');
  const y0 = await G(page, () => window.__game.player.y);
  await touch(P.cdp, 'touchStart', [[st2.x, st2.y, 1]]); await touch(P.cdp, 'touchMove', [[st2.x, st2.y - 40, 1]]); await page.waitForTimeout(500); await touch(P.cdp, 'touchEnd', []);
  const y1 = await G(page, () => window.__game.player.y);
  check('Hochformat: Joystick nach oben bewegt die Figur', y0 - y1 > 10, { y0, y1 });
  await P.ctx.close();
  check('Mobil: Konsole fehlerfrei', problems.length === 0, problems);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium, devices } = await import('playwright-core');
  const URL = process.env.URL || 'http://localhost:8080/';
  const OUT = new globalThis.URL('../screenshots/', import.meta.url).pathname;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader'] });
  const checks = {};
  const check = (name, ok, info) => { checks[name] = !!ok; console.log(`${ok ? '✔' : '✘'} ${name}`, info !== undefined ? JSON.stringify(info) : ''); };
  try { await runMobile({ browser, URL, OUT, check, devices }); } catch (e) { console.log('ABBRUCH:', e.stack); checks.abbruch = false; }
  await browser.close();
  const failed = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  console.log(failed.length ? `VERIFY-MOBILE: FAILED (${failed.length})` : `VERIFY-MOBILE: OK (${Object.keys(checks).length})`);
  process.exit(failed.length ? 1 : 0);
}
