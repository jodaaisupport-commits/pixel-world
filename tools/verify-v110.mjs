// v110-Prüfungen: Spielstand-Export/Import, Bestenliste/Cloud (API gemockt), Musik, ausgebaute Features, Slots.
// Von verify.mjs aufgerufen. Die echte API wird nie angesprochen (page.route fängt alles ab).
import fs from 'node:fs';

export async function runV110({ page, URL, OUT, check }) {
  const G = (fn, a) => page.evaluate(fn, a);
  const API = 'https://pixel-world-api.85.190.126.179.sslip.io';
  const apiCalls = [];
  let apiMode = 'ok';
  const board = [{ name: 'Mira', ms: 61000, t: 1 }, { name: 'Bruno', ms: 75000, t: 2 }];
  const cloud = {};
  await page.route(API + '/**', async (route) => {
    const req = route.request(), u = new globalThis.URL(req.url());
    apiCalls.push(req.method() + ' ' + u.pathname);
    if (apiMode === 'down') return route.abort('connectionrefused');
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
    if (u.pathname === '/api/leaderboard') return json(200, { kind: u.searchParams.get('kind'), top: board });
    if (u.pathname === '/api/score') { const b = JSON.parse(req.postData()); board.push({ name: b.name, ms: b.ms, t: 3 }); board.sort((a, c) => a.ms - c.ms); return json(200, { ok: true, best: b.ms, rank: board.findIndex((e) => e.name === b.name) + 1 }); }
    if (u.pathname === '/api/cloud' && req.method() === 'POST') { cloud['TEST-CODE-AB'] = JSON.parse(req.postData()).save; return json(201, { ok: true, code: 'TEST-CODE-AB' }); }
    const m = /^\/api\/cloud\/(.+)$/.exec(u.pathname);
    if (m) { if (req.method() === 'PUT') { cloud[m[1]] = JSON.parse(req.postData()).save; return json(200, { ok: true, code: m[1] }); } return cloud[m[1]] ? json(200, { code: m[1], save: cloud[m[1]] }) : json(404, { error: 'Sync-Code nicht gefunden' }); }
    return json(404, { error: 'x' });
  });
  let dialogMode = 'accept';
  const onDialog = (d) => (dialogMode === 'accept' ? d.accept() : d.dismiss());
  page.on('dialog', onDialog);
  const boot = async (q = 'reset=1&nointro=1') => {
    await page.goto(URL + (URL.includes('?') ? '&' : '?') + q, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
    await page.waitForTimeout(300);
  };
  const waitReload = async () => { await page.waitForTimeout(900); await page.waitForLoadState('networkidle'); await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 }); await page.waitForTimeout(300); };

  // ---------------------------------------------------------- 1 Export/Import
  await boot();
  const codec = await G(async () => {
    const m = await import('../src/v110/savecode.js');
    const d = { v: 1, map: 'village', x: 1, y: 2, hp: 5, maxHp: 6, coins: 42, inv: { apfel: 2 }, quests: {}, story: { ch: 1, flags: {} } };
    const code = m.encodeSave(d), back = m.decodeSave(code);
    const tampered = m.decodeSave(code.slice(0, -3) + 'zzz');
    const bad = m.decodeSave('{"v":1,"map":"x"}');
    const range = m.decodeSave(JSON.stringify({ ...d, coins: -5 }));
    const wrapped = m.decodeSave(m.fileWrap(d));
    return { prefix: code.slice(0, 4), ok: back.data && back.data.coins === 42, tampered: tampered.error, bad: bad.error, range: range.error, wrapped: wrapped.data && wrapped.data.inv.apfel === 2 };
  });
  check('Export-Code: Hin-/Rückweg, Prüfsumme, Validierung, Datei-Hülle', codec.prefix === 'PW1-' && codec.ok && /Prüfsumme/.test(codec.tampered) && codec.bad && codec.range && codec.wrapped, codec);

  await G(() => { const g = window.__game; g.game.coins = 4321; g.G.give('apfel', 3, true); g.save(); });
  await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
  const rowIdx = await G(() => [...document.querySelectorAll('#options .opt-row span')].findIndex((s) => /exportieren/.test(s.textContent)));
  const rowsNow = await G(() => [...document.querySelectorAll('#options .opt-row span')].map((s) => s.textContent.replace(/[▶\s]+/, '').trim()));
  for (let i = 0; i < rowIdx; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('KeyE'); await page.waitForTimeout(300);
  const exp = await G(() => ({ open: !document.getElementById('netwin').classList.contains('hidden'), mode: window.__game.G && document.querySelector('#netwin h2').textContent, code: document.getElementById('net-code').value }));
  check('Optionen → „Spielstand exportieren / importieren“ öffnet Fenster mit Code', rowIdx > 0 && exp.open && exp.code.startsWith('PW1-') && /exportieren/.test(exp.mode), { rowIdx, rows: rowsNow.slice(-6), code: exp.code.slice(0, 16) });
  await page.screenshot({ path: OUT + 'v110-export.png' });
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.click('#net-dl')]);
  const dlPath = dl ? await dl.path() : null;
  const dlOk = dlPath && JSON.parse(fs.readFileSync(dlPath, 'utf8')).pixelWorldSave?.coins === 4321;
  check('Export als .json-Datei (Download)', !!dlOk, dl ? dl.suggestedFilename() : 'kein Download');
  // Import: erst abbrechen (nichts passiert), dann bestätigen
  await G(() => { const g = window.__game; g.game.coins = 7; g.save(); });
  dialogMode = 'dismiss';
  await G((c) => { document.getElementById('net-in').value = c; document.getElementById('net-imp').click(); }, exp.code);
  await page.waitForTimeout(400);
  const notImported = await G(() => window.__game.game.coins);
  dialogMode = 'accept';
  await G((c) => { document.getElementById('net-in').value = c; document.getElementById('net-imp').click(); }, exp.code);
  await waitReload();
  const imported = await G(() => ({ coins: window.__game.game.coins, apfel: window.__game.G.count('apfel') }));
  check('Import fragt vor dem Überschreiben (Abbrechen = unverändert, OK = übernommen)', notImported === 7 && imported.coins === 4321 && imported.apfel >= 3, { notImported, imported });
  // Ungültiger Code → Fehlermeldung, Datei-Import
  await G(() => window.__game.G.openNet('save'));
  await G(() => { document.getElementById('net-in').value = 'PW1-kaputt.abc'; document.getElementById('net-imp').click(); });
  const errMsg = await G(() => document.getElementById('net-m').textContent);
  const tmp = '/tmp/pw-import-test.json';
  fs.writeFileSync(tmp, JSON.stringify({ pixelWorldSave: { v: 1, map: 'village', x: 900, y: 500, dir: 'down', hp: 6, maxHp: 8, coins: 99, inv: { apfel: 1 }, quests: { schwert: 'done' }, story: { ch: 1, ch2: 0, flags: {} }, visited: ['village'] } }));
  await page.setInputFiles('#net-file', tmp);
  await waitReload();
  const fileImp = await G(() => ({ coins: window.__game.game.coins, maxHp: window.__game.game.maxHp }));
  check('Ungültiger Code wird abgelehnt, Datei-Import funktioniert', /✘/.test(errMsg) && fileImp.coins === 99 && fileImp.maxHp === 8, { errMsg, fileImp });

  // ---------------------------------------------------------- 9 Bestenliste / Cloud (gemockt) + Offline
  const best = await G(() => { const n = window.__game.net; localStorage.removeItem('pixelworld.best.v1'); return { rec: n.recordBest('tiefe', 83456), worse: n.recordBest('tiefe', 90000), fmt: n.fmtTime(83456) }; });
  check('Boss-Bestzeit lokal gemerkt (nur Verbesserungen)', best.rec && !best.worse && best.fmt === '1:23.5', best);
  await G(() => window.__game.G.openNet('board'));
  await page.waitForFunction(() => /Mira/.test(document.getElementById('net-list')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
  await page.fill('#net-name', 'Testheld');
  await page.click('#net-sub');
  await page.waitForFunction(() => /Testheld/.test(document.getElementById('net-list')?.textContent || ''), null, { timeout: 5000 }).catch(() => {});
  const lb = await G(() => ({ list: document.getElementById('net-list').textContent, sub: window.__game.net.bests().tiefe?.submitted }));
  check('Bestenliste: laden, Namen eintragen, Platzierung', /Mira/.test(lb.list) && /Testheld/.test(lb.list) && lb.sub, { list: lb.list.slice(0, 80), sub: lb.sub });
  await page.screenshot({ path: OUT + 'v110-leaderboard.png' });
  await G(() => window.__game.G.openNet('cloud'));
  await page.click('#net-up'); await page.waitForTimeout(400);
  const cc = await G(() => document.getElementById('net-cc').textContent);
  await G(() => { window.__game.game.coins = 1; window.__game.save(); });
  await page.fill('#net-ci', 'TEST-CODE-AB'); await page.click('#net-load');
  await waitReload();
  const cloudCoins = await G(() => window.__game.game.coins);
  check('Cloud-Spielstand: sichern (Sync-Code) und auf „anderem Gerät“ laden', cc === 'TEST-CODE-AB' && cloudCoins === 99, { cc, cloudCoins });
  apiMode = 'down';
  await G(() => window.__game.G.openNet('board'));
  await page.waitForFunction(() => /nicht erreichbar/.test(document.getElementById('net-list')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
  const offline = await G(() => ({ list: document.getElementById('net-list').textContent, ready: window.__game.ready }));
  await page.keyboard.press('Escape');
  const t0 = await G(() => window.__game.player.x);
  await page.keyboard.down('KeyD'); await page.waitForTimeout(400); await page.keyboard.up('KeyD');
  const t1 = await G(() => window.__game.player.x);
  check('API nicht erreichbar → freundliche Meldung, Spiel läuft weiter', /nicht erreichbar/.test(offline.list) && offline.ready && t1 > t0, { list: offline.list.slice(0, 60), dx: t1 - t0 });
  apiMode = 'ok';
  const hits = apiCalls.filter((c) => /hit/.test(c)).length;
  check('Keine Besuchszählung von localhost/Tests aus', hits === 0, apiCalls);

  // ---------------------------------------------------------- 6 Musik & Effekte
  const mus = await G(async () => {
    const m = await import('../src/music.js');
    const g = window.__game;
    g.audio.setSettings({ musicVol: 0.3, sfxVol: 0.5 });
    return { combat: !!m.TRACKS.combat, volcano: !!m.TRACKS.volcano, names: [m.TRACKS.combat?.name, m.TRACKS.volcano?.name] };
  });
  await boot('nointro=1');
  const musAfter = await G(() => ({ mv: window.__game.audio.settings.musicVol, sv: window.__game.audio.settings.sfxVol }));
  await page.keyboard.press('KeyP'); await page.waitForTimeout(200);
  const optTxt = await G(() => document.getElementById('options').textContent);
  await page.screenshot({ path: OUT + 'v110-music-settings.png' });
  await page.keyboard.press('Escape');
  check('Musik: Kampf- und Vulkan-Thema, Lautstärken in Optionen & gespeichert', mus.combat && mus.volcano && musAfter.mv === 0.3 && musAfter.sv === 0.5 && /Musik-Lautstärke/.test(optTxt) && /Effekt-Lautstärke/.test(optTxt), { ...mus, musAfter });
  await G(() => window.__game.goTo('vulkaninsel', 12, 22, 'down'));
  await page.waitForFunction(() => window.__game.sceneId === 'vulkaninsel' && !window.__game.fading, null, { timeout: 8000 }).catch(() => {});
  const vt = await G(() => window.__game.wantedTrack);
  await G(() => { const g = window.__game; for (const e of g.enemies) { e.state = 'chase'; e.x = g.player.x + 30; e.y = g.player.y; } g.player.inv = 99; });
  await page.waitForTimeout(2200);
  const ct = await G(() => window.__game.wantedTrack);
  check('Vulkaninsel spielt „Glutinsel“, Gegner in der Nähe → Kampf-Thema', vt === 'volcano' && ct === 'combat', { vt, ct });

  // ---------------------------------------------------------- 7 Ausgebaute Features
  const deep = await G(() => {
    const g = window.__game, va = g.vapi, game = g.game, out = {};
    // Gegnervielfalt: Lavaschleim teilt sich
    const lava = g.enemies.find((e) => e.type === 'lavaschleim');
    const n0 = g.enemies.length;
    if (lava) { lava.hp = 0; lava.dead = true; }
    out.lava = !!lava; out.n0 = n0;
    // Angeln: Art je Gebiet, Fischbuch
    out.fishVulkan = va.pickFish('vulkaninsel');
    g.player.fishing = { t: 0, wait: 0, bite: true, window: 1.25, perfect: 0.35 };
    const r = va.reelFish();
    out.reel = r && r.id; out.perfect = r && r.perfect; out.book = Object.keys(game.fishbook).length; out.inv = g.G.count(r && r.id);
    // Beet: Pflanzen, Regen
    game.farm = {}; game.weather = 'regen';
    game.farm['48,39'] = { stage: 0, crop: 'karotte', t: 0 };
    va.tickFarm(25); out.rainStage = game.farm['48,39'].stage; // 25 s × 2 = 50 → Stufe 2
    va.tickFarm(10); out.ready = game.farm['48,39'].stage;
    const c0 = g.G.count('karotte'); va.harvestCrop(48, 39); out.harvest = g.G.count('karotte') - c0;
    game.weather = 'klar';
    // Questkette Feuerprobe
    va.feuerprobeLore('lore_vulkan'); out.quest = game.quests.feuerprobe;
    out.runen = !!va.feuerprobeRunen();
    va.feuerprobeLore('lore_grotte'); out.recipe = !!game.recipesKnown.obsidianschwert;
    return out;
  });
  await page.waitForTimeout(300);
  const split = await G(() => window.__game.enemies.filter((e) => e.type === 'lavaschleim_klein').length);
  check('Gegnervielfalt: Lavaschleim teilt sich in Glutfunken', deep.lava && split >= 1, { split, n0: deep.n0 });
  check('Angeln: Fischart je Gebiet, perfekter Zug, Fischbuch', deep.fishVulkan === 'glutkarpfen' && deep.reel && deep.perfect && deep.book >= 1 && deep.inv >= 1, deep);
  check('Beet: Regen verdoppelt Wachstum, Ernte', deep.rainStage === 2 && deep.ready === 3 && deep.harvest >= 2, deep);
  check('Questkette „Die Feuerprobe“: Tafel → Runen → Grotte schaltet Rezept frei', deep.quest === 'active' && deep.runen && deep.recipe, deep);
  await page.keyboard.press('KeyQ'); await page.waitForTimeout(200);
  const ql = await G(() => document.getElementById('questlog').textContent);
  await page.keyboard.press('Escape');
  check('Questlog zeigt „Die Feuerprobe“', /Feuerprobe/.test(ql), ql.slice(0, 80));
  await G(() => window.__game.goTo('schmiede', 7, 8, 'up'));
  await page.waitForFunction(() => window.__game.sceneId === 'schmiede' && !window.__game.fading, null, { timeout: 8000 }).catch(() => {});
  await G(() => { const g = window.__game; g.G.give('obsidian', 2, true); g.G.give('glutkern', 1, true); g.G.give('eisenerz', 1, true); });
  await page.keyboard.press('KeyV'); await page.waitForTimeout(500);
  await page.keyboard.press('KeyE'); await page.waitForTimeout(200);
  const wb = await G(() => ({ open: window.__game.dialog.open, opts: [...document.querySelectorAll('#dialog .dlg-choices div')].map((d) => d.textContent.trim()) }));
  const oi = wb.opts.findIndex((o) => /Obsidianschwert/.test(o));
  for (let i = 0; i < oi; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('KeyE'); await page.waitForTimeout(400);
  const forged = await G(() => ({ w: window.__game.game.weapon, done: window.__game.game.quests.feuerprobe, title: window.__game.game.title }));
  check('Werkbank-Menü (V) mit Materialanzeige, Obsidianschwert schließt Questkette ab', wb.open && oi >= 0 && /✔/.test(wb.opts[oi]) && forged.done === 'done', { opts: wb.opts, forged });
  await page.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { if (await G(() => window.__game.dialog.open)) await page.keyboard.press('Escape'); }

  // ---------------------------------------------------------- 7 Speicherplätze laden wirklich
  await G(() => window.__game.save());
  await G(() => window.__game.G.cycleSlot(1));
  await waitReload();
  const slot1 = await G(() => ({ slot: window.__game.G.currentSlot(), coins: window.__game.game.coins }));
  await G(() => window.__game.G.cycleSlot(-1));
  await waitReload();
  const slot0 = await G(() => ({ slot: window.__game.G.currentSlot(), coins: window.__game.game.coins }));
  check('Slot-Wechsel lädt den anderen Speicherplatz (und zurück)', slot1.slot === 1 && slot1.coins === 10 && slot0.slot === 0 && slot0.coins !== 10, { slot1, slot0 });

  page.off('dialog', onDialog);
  await page.unroute(API + '/**');
}
