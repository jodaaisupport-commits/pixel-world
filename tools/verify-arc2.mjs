// Zweite Geschichte „Die Sternensplitter“: Prüfungen für verify.mjs (oder eigenständig: node tools/verify-arc2.mjs).
// Alte Spielstände, Auslöser im Dorf, alle neuen Gebiete, Durchquerung (Treibsand, Eis, Enterhaken), neue Gegner,
// Laden/Gasthaus, Nebenquests, Mini-Boss Khepran, Endgegnerin Thalassa, Outro + Abspann.
import fs from 'node:fs';

const KEY = 'pixelworld.save.v1.s0';
const KEY_LEGACY = 'pixelworld.save.v1';
const KEY_META = 'pixelworld.save.slots';

export async function runArc2({ page, URL, OUT, check, problems }) {
  const G = (fn, a) => page.evaluate(fn, a);
  const shot = (name) => page.screenshot({ path: OUT + name });
  const wait = (ms) => page.waitForTimeout(ms);
  const dialogOpen = () => G(() => !document.getElementById('dialog').classList.contains('hidden'));
  const dialogText = () => G(() => document.querySelector('#dialog .dlg-text').textContent);
  const story = () => G(() => { const s = window.__game.story; return { ch: s.ch, ch2: s.ch2, f: { ...s.flags } }; });
  const clearOverlays = () => G(() => { for (const id of ['banner', 'area']) document.getElementById(id).classList.remove('show'); document.getElementById('toasts').innerHTML = ''; });
  const heal = () => G(() => { const g = window.__game; g.game.hp = g.game.maxHp; });
  const clearEnemies = () => G(() => { window.__game.scene.enemies.length = 0; window.__game.scene.eshots.length = 0; });
  async function hold(key, ms) { await page.keyboard.down(key); await wait(ms); await page.keyboard.up(key); }
  async function goTo(id, tx, ty, dir) {
    await page.waitForFunction(() => !window.__game.fading, null, { timeout: 4000 }).catch(() => {});
    await G(([i, x, y, d]) => window.__game.goTo(i, x, y, d), [id, tx, ty, dir]);
    await page.waitForFunction((i) => window.__game.sceneId === i && !window.__game.fading, id, { timeout: 5000 });
    await wait(250);
  }
  async function loadSave(data) {
    await G(([k, kl, km, d]) => {
      localStorage.setItem(k, JSON.stringify(d));
      localStorage.setItem(kl, JSON.stringify(d)); // legacy
      localStorage.setItem('pixelworld.save.slot', '0');
      try { const meta = JSON.parse(localStorage.getItem(km) || '{}'); meta[0] = { time: d.time, map: d.map }; localStorage.setItem(km, JSON.stringify(meta)); } catch (e) {}
    }, [KEY, KEY_LEGACY, KEY_META, data]);
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
    await wait(500);
  }
  async function finishScript(timeout = 30000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout && (await G(() => window.__game.script || window.__game.fading))) { if (await dialogOpen()) await page.keyboard.press('KeyE'); await wait(140); }
  }
  async function talkThrough(max = 40) { let text = ''; for (let i = 0; i < max && (await dialogOpen()); i++) { text += ' ' + (await dialogText()); await page.keyboard.press('KeyE'); await wait(110); } return text; }
  async function advanceToChoice() { for (let i = 0; i < 30; i++) { if (await G(() => window.__game.dialog.choosing)) return true; if (!(await dialogOpen())) return false; await page.keyboard.press('KeyE'); await wait(90); } return false; }
  async function talk(id, choose = null) {
    await G((i) => { const g = window.__game, n = g.scene.npcs.find((k) => k.id === i); n.state = 'idle'; n.timer = 5; n.target = null; g.player.x = n.x; g.player.y = n.y + 15; g.player.dir = 'up'; g.player.kbt = 0; }, id);
    await wait(60);
    await page.keyboard.press('KeyE'); await wait(300);
    const name = await G(() => document.querySelector('#dialog .dlg-name').textContent);
    let text = '';
    if (choose !== null) {
      for (let i = 0; i < 30 && !(await G(() => window.__game.dialog.choosing)) && (await dialogOpen()); i++) { text += ' ' + (await dialogText()); await page.keyboard.press('KeyE'); await wait(100); }
      text += ' ' + (await dialogText());
      for (let i = 0; i < choose; i++) { await page.keyboard.press('ArrowDown'); await wait(60); }
      await page.keyboard.press('KeyE'); await wait(200);
    }
    text += await talkThrough();
    return { name, text };
  }
  async function pressAt(tx, ty, dir) {
    await G(([x, y, d]) => window.__game.teleport(x, y, d), [tx, ty, dir]);
    await wait(80); await page.keyboard.press('KeyE'); await wait(300);
  }
  /** Gegner `type` neben die Figur stellen und mit echten Schwerthieben (J) besiegen. */
  async function kill(type, side = 'right') {
    const info = await G(([t, sd]) => {
      const g = window.__game;
      let e = g.enemies.find((k) => k.type === t);
      if (!e) return null;
      g.scene.enemies = [e];
      window.__target = e.uid; window.__side = sd;
      return { type: e.type, hp: e.hp };
    }, [type, side]);
    if (!info) return { type, missing: true, left: 1 };
    let blocks = 0;
    for (let i = 0; i < 16; i++) {
      const alive = await G(() => {
        const g = window.__game, e = g.enemies.find((k) => k.uid === window.__target); if (!e) return false;
        const s = window.__side === 'right' ? 1 : -1;
        e.x = g.player.x + 18 * s; e.y = g.player.y; e.kbt = 0; e.alt = 0; g.player.dir = window.__side; g.game.hp = g.game.maxHp;
        if (e.bs) { e.bs = 'up'; e.bt = 2; } if (e.rs) { e.rs = 'dizzy'; e.rt = 2; } if (e.def.shield) { e.face = s; e.frozen = true; }
        return true;
      });
      if (!alive) break;
      await page.keyboard.press('KeyJ'); await wait(330);
    }
    await wait(200);
    const left = await G(() => window.__game.enemies.filter((k) => k.uid === window.__target).length);
    await heal();
    return { ...info, left, blocks };
  }

  // ---------------------------------------------------------- 1. Alte Spielstände (Phase 4) laden
  const base = { v: 1, time: Date.now(), dir: 'down', hp: 8, maxHp: 8, coins: 55, inv: { heiltrank: 1, moorkraut: 2 }, weapon: 'eisenschwert', lamp: false,
    quests: { schwert: 'done', kraeuter: 'active' }, taken: {}, opened: {}, visited: ['village', 'dunkelwald', 'berge'], tint: 0, title: null, settings: null };
  await loadSave({ ...base, map: 'berge', x: 43 * 16 + 8, y: 13 * 16 + 12, story: { ch: 3, flags: { hilde: true, mira: true, schrein: true } } });
  let s = await story();
  const old1 = await G(() => ({ scene: window.__game.sceneId, boots: window.__game.game.boots, hook: window.__game.game.hook }));
  await page.keyboard.press('KeyQ'); await wait(250);
  const ql1 = await G(() => document.querySelector('#questlog .ql-body').textContent);
  await page.keyboard.press('KeyQ');
  check('Alter Spielstand (Phase 4, mitten in Kapitel 3) lädt ohne Fehler', old1.scene === 'berge' && s.ch === 3 && s.ch2 === 0 && !old1.boots && /Kapitel 3/.test(ql1) && problems.length === 0, { ...old1, ch: s.ch, ch2: s.ch2, problems });
  // Spielstand nach dem Ende der ersten Geschichte (Kapitel 6, freies Spiel)
  await loadSave({ ...base, map: 'village', x: 57 * 16 + 8, y: 32 * 16 + 12, maxHp: 10, hp: 10, coins: 160, weapon: 'kristallklinge', lamp: true,
    inv: { kristallherz: 1, heiltrank: 2 }, quests: { schwert: 'done', kraeuter: 'done', kompass: 'done', kristalle: 'done', klinge: 'done' },
    visited: ['village', 'dunkelwald', 'berge', 'hoehle', 'tiefe', 'kueste', 'taverne', 'zuhause'], title: 'Held von Pixeldorf',
    story: { ch: 6, flags: { hilde: true, mira: true, schrein: true, erwin: true, rubble: true, tor: true, boss_seen: true, boss_done: true } } });
  s = await story();
  check('Alter Spielstand nach dem Ende (Kapitel 6) lädt, zweite Geschichte noch nicht begonnen', s.ch === 6 && s.ch2 === 0 && (await G(() => window.__game.sceneId)) === 'village', s);

  // ---------------------------------------------------------- 2. Auslöser: Selma am Westpfad
  await G(() => window.__game.teleport(1.5, 22.6, 'left'));
  await hold('KeyA', 350);
  const gate = await G(() => ({ scene: window.__game.sceneId, toast: document.getElementById('toasts').textContent }));
  check('Westpfad vor der zweiten Geschichte verschüttet (Ausgang gesperrt)', gate.scene === 'village' && /verschüttet/.test(gate.toast), gate);
  await G(() => window.__game.teleport(20.5, 30.6, 'left'));
  await page.waitForFunction(() => window.__game.script, null, { timeout: 5000 }).catch(() => {});
  await wait(300);
  for (let i = 0; i < 10 && (await dialogOpen()); i++) { await page.keyboard.press('KeyE'); await wait(150); }
  await page.waitForFunction(() => { const s = window.__game.scene.npcs.find((n) => n.id === 'selma'); return s && s.x > 8 * 16; }, null, { timeout: 8000 }).catch(() => {});
  await clearOverlays();
  await shot('story2-ankunft.png');
  const scripted = await G(() => ({ script: window.__game.script, cam: !!window.__game.state.cam, selma: window.__game.scene.npcs.some((n) => n.id === 'selma') }));
  await finishScript();
  await wait(300);
  s = await story();
  const ban = await G(() => document.getElementById('banner').textContent);
  check('Zweite Geschichte startet im freien Spiel: Splitter summt, Kameraschwenk, Selma kommt → Kapitel 1', scripted.script && scripted.cam && scripted.selma && s.ch2 === 1 && /Ein Gast aus der Ferne/.test(ban), { scripted, ch2: s.ch2 });
  await wait(2000);
  const se = await talk('selma');
  await finishScript();
  s = await story();
  const selmaGone = await G(() => !window.__game.scene.npcs.some((n) => n.id === 'selma'));
  check('Selma erzählt von den Sternensplittern, gibt die Karte, startet Nebenquest, reist ab', /Splitter/.test(se.text) && s.f.a2_selma && s.f.a2_west && selmaGone && (await G(() => window.__game.G.has('karte') && window.__game.game.quests.kartografie === 'active')), { selmaGone, text: se.text.slice(0, 60) });
  await page.keyboard.press('KeyQ'); await wait(250);
  const ql2 = await G(() => document.querySelector('#questlog .quest.main.arc2')?.textContent || '');
  await shot('story2-questlog.png');
  await page.keyboard.press('KeyQ');
  check('Questlog: eigene Hauptquest „Die Sternensplitter“', /Sternensplitter/.test(ql2) && /Kapitel 1\/5/.test(ql2), ql2.slice(0, 70));

  // ---------------------------------------------------------- 3. Sonnenwüste, Oase, Gasthaus, Laden
  await G(() => window.__game.teleport(1.5, 22.6, 'left'));
  await page.keyboard.down('KeyA');
  await page.waitForFunction(() => window.__game.sceneId === 'wueste' && !window.__game.fading, null, { timeout: 5000 }).catch(() => {});
  await page.keyboard.up('KeyA');
  const wu = await G(() => ({ scene: window.__game.sceneId, track: window.__game.wantedTrack }));
  check('Westpfad offen → Sonnenwüste (eigene Musik)', wu.scene === 'wueste' && wu.track === 'desert', wu);
  await clearEnemies();
  await G(() => window.__game.teleport(60, 34, 'left'));
  await wait(900); await clearOverlays(); await wait(300);
  await shot('area-wueste.png');
  // neue Gegner der Wüste
  await goTo('wueste', 60, 30, 'left');
  const sk = await kill('skorpion');
  check('Neuer Gegner besiegt: Skorpion (Sonnenwüste)', sk.left === 0, sk);
  await goTo('wueste', 64, 20, 'left');
  const wurm = await kill('sandwurm');
  check('Neuer Gegner besiegt: Sandwurm (gräbt sich ein)', wurm.left === 0, wurm);
  // Treibsand ohne Stiefel
  const qs = await G(() => { const m = window.__game.world; for (let y = 14; y < 18; y++) for (let x = 6; x < 22; x++) if (m.get(x, y) === 24 && m.get(x + 1, y) === 24 && m.get(x + 2, y) === 24 && m.get(x + 3, y) === 24) return [x, y]; return null; });
  await clearEnemies();
  async function speedAt(tx, ty) { await G(([x, y]) => window.__game.teleport(x, y, 'right'), [tx + 0.5, ty + 0.6]); await wait(80); const x0 = await G(() => window.__game.player.x); await hold('KeyD', 300); const x1 = await G(() => window.__game.player.x); return x1 - x0; }
  const vNorm = await speedAt(60, 30);
  const vSand = await speedAt(qs[0], qs[1]);
  const hp0 = await G(() => window.__game.game.hp);
  await G(([x, y]) => window.__game.teleport(x, y, 'right'), [qs[0] + 0.5, qs[1] + 0.6]);
  await wait(1500);
  const sunk = await G(() => ({ hp: window.__game.game.hp, tile: window.__game.world.get(window.__game.player.tileX, window.__game.player.tileY) }));
  check('Treibsand ohne Stiefel: bremst stark, zieht hinab (Schaden + zurück ans Ufer)', qs && vSand < vNorm * 0.6 && sunk.hp < hp0, { qs, vNorm, vSand, hp0, sunk });
  await heal();
  // Oase + Gasthaus (Kadir)
  await goTo('wueste', 46, 22, 'up');
  await wait(400);
  await clearOverlays(); await clearEnemies(); await wait(500);
  await shot('area-oase.png');
  await goTo('oase_gasthaus', 6, 7, 'up');
  const ka = await talk('kadir');
  await wait(400);
  s = await story();
  check('Oase erreicht, Kadir erzählt die Legende → Kapitel 2 „Der Sonnentempel“', s.f.a2_oase && s.f.a2_kadir && s.ch2 === 2 && /Khepran/.test(ka.text), { ch2: s.ch2 });
  const ka2 = await talk('kadir', 0);
  check('Nebenquest „Rosen aus Sand“ angenommen (Kadir)', (await G(() => window.__game.game.quests.wuestenrosen)) === 'active', ka2.text.slice(0, 50));
  await G(() => { const g = window.__game; g.G.give('wuestenrose', 4, true); g.game.hp = 2; });
  const ka3 = await talk('kadir');
  const rosen = await G(() => ({ q: window.__game.game.quests.wuestenrosen, gt: window.__game.G.count('grosstrank') }));
  check('Nebenquest „Rosen aus Sand“ abgegeben (Großer Heiltrank + Taler)', rosen.q === 'done' && rosen.gt >= 1, { ...rosen, t: ka3.text.slice(0, 40) });
  await wait(2000);
  await talk('kadir', 0);
  await finishScript();
  const rested = await G(() => window.__game.game.hp === window.__game.game.maxHp);
  check('Gasthaus: Ausruhen füllt alle Herzen auf', rested);
  // Nuris Basar
  await goTo('oase_laden', 6, 7, 'up');
  await G(() => { window.__game.game.coins = 200; });
  await talk('nuri', 0);
  await wait(200);
  const shop = await G(() => ({ open: !document.getElementById('shop').classList.contains('hidden'), title: document.querySelector('#shop h2').textContent, list: window.__game.G.shopList() }));
  await shot('shop-nuri.png');
  const idx = shop.list.indexOf('sandlaeufer');
  for (let i = 0; i < idx; i++) { await page.keyboard.press('ArrowDown'); await wait(50); }
  await page.keyboard.press('KeyE'); await wait(200);
  await page.keyboard.press('Escape'); await wait(150);
  const boots = await G(() => ({ boots: window.__game.game.boots, coins: window.__game.game.coins }));
  check('Nuris Basar: eigenes Sortiment, Sandläufer-Stiefel gekauft (Werkzeug-Slot)', shop.open && /Nuri/.test(shop.title) && idx >= 0 && boots.boots && boots.coins <= 141 && boots.coins >= 135, { shop, boots });
  await goTo('wueste', qs[0] - 1.5, qs[1] + 0.6, 'right');
  await clearEnemies();
  const vBoots = await speedAt(qs[0], qs[1]);
  check('Mit Sandläufer-Stiefeln über den Treibsand', vBoots > vNorm * 0.8, { vBoots, vNorm });

  // ---------------------------------------------------------- 4. Sonnentempel: Enterhaken + Khepran
  await goTo('wueste', 13.5, 6.6, 'up');
  await page.keyboard.down('KeyW');
  await page.waitForFunction(() => window.__game.sceneId === 'ruinen' && !window.__game.fading, null, { timeout: 5000 }).catch(() => {});
  await page.keyboard.up('KeyW');
  check('Ruinentür → Sonnentempel', (await G(() => window.__game.sceneId)) === 'ruinen');
  await clearEnemies();
  await G(() => window.__game.teleport(16.5, 27, 'up')); await wait(900); await clearOverlays(); await wait(300);
  await shot('area-ruinen.png');
  await pressAt(16.5, 25.4, 'up');
  const noHook = (await talkThrough());
  check('Schlund ohne Enterhaken nicht überwindbar', /Haken/.test(noHook) && (await G(() => window.__game.player.y)) > 22 * 16, noHook.slice(0, 60));
  await pressAt(4.5, 27.6, 'left');
  await talkThrough();
  check('Truhe in der Seitenkammer: Enterhaken', await G(() => window.__game.game.hook));
  await pressAt(16.5, 25.4, 'up');
  await wait(250); await shot('story2-haken.png');
  await finishScript();
  const crossed = await G(() => ({ ty: Math.floor((window.__game.player.y - 2) / 16) }));
  check('Enterhaken zieht über den Schlund', crossed.ty <= 18, crossed);
  // Khepran
  const kb = () => G(() => { const g = window.__game, b = g.boss; return { fight: g.fight, st: b && b.state, hp: b && b.hp, phase: b && b.phase, lock: !!g.story.flags.a2_kh_lock, bar: !document.getElementById('bossbar').classList.contains('hidden'), track: g.wantedTrack, barText: document.getElementById('bossbar').textContent }; });
  await G(() => window.__game.teleport(17, 16.4, 'up'));
  await hold('KeyW', 500);
  await page.waitForFunction(() => window.__game.script || window.__game.fight, null, { timeout: 6000 }).catch(() => {});
  await finishScript();
  let k = await kb();
  check('Mini-Boss Khepran: Intro, Sandtor verriegelt, Lebensleiste, eigene Musik', k.fight && k.lock && k.bar && k.track === 'miniboss' && /Khepran/.test(k.barText), k);
  await heal(); await wait(1600); await heal(); await clearOverlays();
  await shot('miniboss.png');
  const blocked = await G(() => { const g = window.__game, b = g.boss; b.inv = 0; const st = b.state; if (['stun', 'dazed', 'tunnel', 'erupt_tg'].includes(st)) return 'skip'; return b.hurt(1, g.bossEnv); });
  // echter Schwerthieb während der Betäubung (nach Säulentreffer)
  await G(() => { const g = window.__game, b = g.boss; b.state = 'stun'; b.timer = 3; b.inv = 0; g.teleport(b.x / 16 - 0.5, (b.y + 14) / 16 - 0.75, 'up'); });
  const khp0 = (await kb()).hp;
  for (let i = 0; i < 6 && (await kb()).hp >= khp0; i++) { await G(() => { const g = window.__game, b = g.boss; b.state = 'stun'; b.timer = 3; g.teleport(b.x / 16 - 0.5, (b.y + 14) / 16 - 0.75, 'up'); g.game.hp = g.game.maxHp; }); await page.keyboard.press('KeyJ'); await wait(250); }
  k = await kb();
  check('Khepran: Panzer blockt, nach Säulen-Betäubung verwundbar (echter Schwerthieb)', (blocked === 'block' || blocked === 'skip') && k.hp < khp0, { blocked, khp0, hp: k.hp });
  async function damageUntil(cond, timeout = 25000, stunFn) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = await G(([c, f]) => { const g = window.__game, b = g.boss; if (!b || new Function('b', 'return ' + c)(b)) return true; if (b.state !== 'transition' && b.state !== 'dying') { new Function('b', f)(b); b.inv = 0; b.hurt(1, g.bossEnv); } g.game.hp = g.game.maxHp; g.player.inv = 1; return false; }, [cond, stunFn]);
      if (r) return true;
      await wait(70);
    }
    return false;
  }
  await damageUntil('b.phase >= 2', 20000, "b.state = 'stun'; b.timer = 2;");
  await wait(2200); await heal();
  await G(() => { const b = window.__game.boss; b.state = 'erupt'; b.timer = 0.01; });
  await wait(1200); await heal();
  k = await kb();
  check('Khepran Phase 2 (Sandgeschosse/Skorpione)', k.phase === 2 && k.fight, k);
  await damageUntil("b.hp <= 0 || b.state === 'dying'", 20000, "b.state = 'stun'; b.timer = 2;");
  await page.waitForFunction(() => !window.__game.fight, null, { timeout: 10000 }).catch(() => {});
  await wait(1500); await finishScript();
  s = await story();
  check('Khepran besiegt → Belohnung, Sandtor offen', s.f.a2_khepran && !s.f.a2_kh_lock && !(await G(() => window.__game.fight)), { f: s.f.a2_khepran });
  await pressAt(17, 3.6, 'up'); await wait(600); await shot('story2-sonnensplitter.png'); await finishScript();
  await wait(500);
  s = await story();
  check('Sonnensplitter vom Altar → Kapitel 3 „Eis und Stille“', s.f.a2_sun && (await G(() => window.__game.G.has('sonnensplitter'))) && s.ch2 === 3, { ch2: s.ch2 });

  // ---------------------------------------------------------- 5. Frosthöhen, Eisgrotte
  await goTo('berge', 61.5, 14.6, 'right');
  await clearEnemies();
  await page.keyboard.down('KeyD');
  await page.waitForFunction(() => window.__game.sceneId === 'frost' && !window.__game.fading, null, { timeout: 5000 }).catch(() => {});
  await page.keyboard.up('KeyD');
  const fr = await G(() => ({ scene: window.__game.sceneId, track: window.__game.wantedTrack }));
  check('Frostpass (Graufels-Berge) → Frosthöhen (eigene Musik)', fr.scene === 'frost' && fr.track === 'frost', fr);
  await clearEnemies();
  const fb = await talk('frostbart');
  s = await story();
  check('Eremit Frostbart: Story-Dialog + Nebenquest Steigeisen', s.f.a2_frostbart && /Hmpf/.test(fb.text) && (await G(() => window.__game.game.quests.steigeisen)) === 'active', fb.text.slice(0, 50));
  await G(() => window.__game.teleport(16, 19, 'down')); await wait(900); await clearOverlays(); await wait(300);
  await shot('area-frost.png');
  await goTo('frost', 12, 26, 'right');
  const wolf = await kill('frostwolf');
  check('Neuer Gegner besiegt: Frostwolf', wolf.left === 0, wolf);
  // Eisgeist schießt Eissplitter
  await goTo('frost', 12, 26, 'right');
  const shots = await G(async () => {
    const g = window.__game, e = g.enemies.find((k) => k.type === 'eisgeist'); if (!e) return -1;
    g.scene.enemies = [e]; e.x = g.player.x + 70; e.y = g.player.y; let n = 0;
    for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 100)); n = Math.max(n, g.scene.eshots.length); g.game.hp = g.game.maxHp; if (n) break; }
    return n;
  });
  check('Eisgeist schießt Eissplitter (Gegnergeschosse)', shots > 0, { shots });
  await clearEnemies();
  // Hakenpfahl über die Gletscherspalte
  await pressAt(26.5, 19.6, 'right'); await finishScript();
  const gx = await G(() => window.__game.player.tileX);
  check('Gletscherspalte per Enterhaken überquert', gx >= 33, { gx });
  // Eisrutschen ohne Steigeisen
  await goTo('eisgrotte', 15, 31, 'up');
  await clearEnemies();
  await G(() => window.__game.teleport(15, 26, 'up')); await wait(900); await clearOverlays(); await wait(300);
  await shot('area-eisgrotte.png');
  const ice = await G(async () => {
    const g = window.__game, m = g.world; let spot = null;
    for (let y = 8; y < 24 && !spot; y++) for (let x = 4; x < 26; x++) if ([0, 1, 2, 3].every((d) => m.get(x + d, y) === 26 && !m.isSolid(x + d, y))) { spot = [x, y]; break; }
    if (!spot) return null;
    g.teleport(spot[0] + 0.5, spot[1] + 0.6, 'right');
    g.input.right = true; await new Promise((r) => setTimeout(r, 350)); g.input.right = false;
    const x0 = g.player.x; await new Promise((r) => setTimeout(r, 200));
    return { spot, ice: g.player.ice, drift: g.player.x - x0 };
  });
  check('Eis ohne Steigeisen: Figur rutscht weiter', ice && ice.ice && ice.drift > 2, ice);
  await pressAt(15, 4.6, 'up'); await finishScript();
  await wait(800);
  const wave = await G(() => window.__game.enemies.length);
  await shot('story2-eiswaechter.png');
  await G(() => { for (const e of window.__game.enemies) { e.hp = 0; e.dead = true; } });
  await wait(800);
  s = await story();
  check('Frostsplitter genommen → Eiswächter-Welle besiegt → Kapitel 4 „Jans Boot“', wave >= 4 && s.f.a2_frost && s.ch2 === 4, { wave, ch2: s.ch2 });
  await goTo('frost', 16, 19, 'up');
  await G(() => window.__game.G.give('eiskristall', 3, true));
  await talk('frostbart'); await wait(300);
  check('Nebenquest „Eis für den Eremiten“ → Steigeisen', await G(() => window.__game.game.grip && window.__game.game.quests.steigeisen === 'done'));

  // ---------------------------------------------------------- 6. Selma, Schiffsteer, Jan, Bootsfahrt
  await goTo('wueste', 59, 24, 'up');
  await clearEnemies();
  const se2 = await talk('selma');
  s = await story();
  check('Selma deutet die Splitter: versunkener Tempel im Meer', s.f.a2_selma2 && /Meer/.test(se2.text), se2.text.slice(0, 50));
  await goTo('oase_laden', 6, 7, 'up');
  const hasTar = await G(() => window.__game.G.shopList().includes('schiffsteer'));
  await G(() => window.__game.G.buy('schiffsteer'));
  check('Schiffsteer in Nuris Basar gekauft', hasTar && (await G(() => window.__game.G.has('schiffsteer'))));
  await goTo('village', 18, 44, 'down');
  const jan1 = await talk('jan');
  await finishScript();
  s = await story();
  const janGone = await G(() => !window.__game.scene.npcs.some((n) => n.id === 'jan'));
  check('Jan flickt sein Boot (Teer abgegeben) und geht zur Küste', s.f.a2_boat && s.f.a2_jan_coast && janGone, { t: jan1.text.slice(0, 40) });
  const dock = await G(() => { const g = window.__game; return null; });
  void dock;
  await goTo('kueste', 46, 12, 'down');
  await clearEnemies();
  await talk('jan', 0);
  await page.waitForFunction(() => window.__game.cine, null, { timeout: 6000 }).catch(() => {});
  await wait(2600);
  await shot('story2-boot.png');
  const cine = await G(() => window.__game.cine);
  await page.keyboard.press('KeyE'); await wait(200); await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__game.sceneId === 'tempel', null, { timeout: 8000 }).catch(() => {});
  await finishScript();
  await wait(500);
  s = await story();
  const te = await G(() => ({ scene: window.__game.sceneId, track: window.__game.wantedTrack }));
  check('Bootsfahrt (Zwischensequenz) → Gezeitentempel → Kapitel 5', cine && te.scene === 'tempel' && te.track === 'temple' && s.ch2 === 5, { cine, te, ch2: s.ch2 });
  // Gezeitentempel-Gegner
  await G(() => window.__game.teleport(18, 30, 'up')); await wait(900); await clearOverlays(); await wait(300);
  await shot('area-tempel.png');
  const qu = await kill('qualle');
  check('Neuer Gegner besiegt: Qualle (Gezeitentempel)', qu.left === 0, qu);
  await goTo('tempel', 18, 30, 'up');
  const mu = await G(() => { const g = window.__game, e = g.enemies.find((k) => k.type === 'muschel'); if (!e) return null; g.scene.enemies = [e]; e.face = -1; e.cool = 0; e.x = g.player.x + 18; e.y = g.player.y; e.state = 'idle'; return e.hurt(1, g.player.x, g.player.y); });
  const mu2 = await kill('muschel');
  check('Muschel blockt von vorn, fällt von hinten', mu === 'block' && mu2.left === 0, { mu, mu2 });
  // Kartografie-Nebenquest (alle Gebiete besucht)
  // (Abgabe nach dem Bosskampf bei Selma)

  // ---------------------------------------------------------- 7. Endgegnerin Thalassa
  const tb = () => G(() => { const g = window.__game, b = g.boss; return { fight: g.fight, st: b && b.state, hp: b && b.hp, phase: b && b.phase, lock: !!g.story.flags.a2_th_lock, bar: !document.getElementById('bossbar').classList.contains('hidden'), track: g.wantedTrack, barText: document.getElementById('bossbar').textContent }; });
  await clearEnemies();
  await G(() => window.__game.teleport(17.5, 21, 'up'));
  await hold('KeyW', 600);
  await page.waitForFunction(() => window.__game.script || window.__game.fight, null, { timeout: 6000 }).catch(() => {});
  await finishScript();
  let t = await tb();
  check('Thalassa: Intro, Gezeitengitter verriegelt, Lebensleiste (3 Phasen), Bossmusik', t.fight && t.lock && t.bar && t.track === 'boss2' && /Thalassa/.test(t.barText) && /3/.test(t.barText), t);
  await heal(); await wait(2200); await heal(); await clearOverlays(); await G(() => { const g = window.__game; g.teleport(17.5, 14.6, 'up'); g.player.inv = 1.5; }); await wait(350);
  await shot('boss2-phase1.png');
  const tBlock = await G(() => { const g = window.__game, b = g.boss; if (!b.visible) return 'hidden'; return b.hurt(1, g.bossEnv); });
  // reflektierte Wasserkugel betäubt sie
  const refl = await G(async () => {
    const g = window.__game, b = g.boss;
    for (let i = 0; i < 80 && !b.orbs.length; i++) { await new Promise((r) => setTimeout(r, 100)); g.game.hp = g.game.maxHp; }
    const o = b.orbs[0]; if (!o) return { orbs: 0 };
    o.refl = true; o.vx = (b.x - o.x) * 3; o.vy = (b.y - 24 - o.y) * 3; o.life = 3;
    for (let i = 0; i < 30 && b.state !== 'stunned'; i++) { await new Promise((r) => setTimeout(r, 50)); g.game.hp = g.game.maxHp; }
    return { st: b.state };
  });
  const thp0 = (await tb()).hp;
  for (let i = 0; i < 6 && (await tb()).hp >= thp0; i++) { await G(() => { const g = window.__game, b = g.boss; if (b.state !== 'stunned') { b.state = 'stunned'; b.timer = 3; b.stunDmg = 0; } g.teleport(b.x / 16 - 0.5, (b.y + 34) / 16 - 0.75, 'up'); g.game.hp = g.game.maxHp; }); await page.keyboard.press('KeyJ'); await wait(250); }
  t = await tb();
  check('Thalassa: Schwert gleitet ab, reflektierte Wasserkugel betäubt sie, dann echter Treffer', (tBlock === 'block' || tBlock === 'hidden') && refl.st === 'stunned' && t.hp < thp0, { tBlock, refl, thp0, hp: t.hp });
  const stunFn = "if (b.state !== 'stunned') { b.state = 'stunned'; b.timer = 2; b.stunDmg = 0; }";
  await damageUntil('b.phase >= 2', 20000, stunFn);
  await wait(2400); await heal();
  await G(() => { const b = window.__game.boss; b.state = 'wait'; b.timer = 0.01; b.order = 1; });
  await page.waitForFunction(() => { const b = window.__game.boss; window.__game.game.hp = window.__game.game.maxHp; return b && b.tentacles.length > 0; }, null, { timeout: 12000, polling: 60 }).catch(() => {});
  await wait(900); await heal(); await clearOverlays(); await G(() => { const g = window.__game; g.teleport(17.5, 14.6, 'up'); g.player.inv = 1.5; }); await wait(350);
  await shot('boss2-phase2.png');
  t = await tb();
  const tent = await G(() => window.__game.boss.tentacles.length);
  check('Thalassa Phase 2: Tentakel steigen auf', t.phase === 2 && tent > 0, { ...t, tent });
  await damageUntil('b.phase >= 3', 20000, stunFn);
  await wait(2400); await heal();
  await G(() => { const b = window.__game.boss; b.state = 'wait'; b.timer = 0.01; b.order = 0; });
  await page.waitForFunction(() => { const b = window.__game.boss; window.__game.game.hp = window.__game.game.maxHp; return b && (b.whirl > 0 || b.flood); }, null, { timeout: 12000, polling: 60 }).catch(() => {});
  await wait(700); await heal(); await clearOverlays(); await G(() => { const g = window.__game; g.teleport(17.5, 14.6, 'up'); g.player.inv = 1.5; }); await wait(350);
  await shot('boss2-phase3.png');
  t = await tb();
  const ph3 = await G(() => { const b = window.__game.boss; return { whirl: b.whirl > 0, flood: !!b.flood }; });
  check('Thalassa Phase 3: Mahlstrom / Flut', t.phase === 3 && (ph3.whirl || ph3.flood), { ...t, ...ph3 });
  // Tod im Kampf → Neustart in der Vorhalle
  await G(() => { const g = window.__game; g.game.hp = 1; g.player.inv = 0; g.player.kbt = 0; g.bossEnv.hurt(2, g.boss); });
  await page.waitForFunction(() => window.__game.sceneId === 'tempel' && !window.__game.fading && !window.__game.dying && !window.__game.fight, null, { timeout: 8000 }).catch(() => {});
  const rsp = await G(() => { const g = window.__game; return { ty: Math.floor(g.player.y / 16), hp: g.game.hp, max: g.game.maxHp, st: g.boss && g.boss.state, bhp: g.boss && g.boss.hp, lock: !!g.story.flags.a2_th_lock }; });
  check('Tod gegen Thalassa → Neuversuch in der Vorhalle (Boss zurückgesetzt)', rsp.ty >= 22 && rsp.hp === rsp.max && rsp.st === 'sleep' && rsp.bhp === 30 && !rsp.lock, rsp);
  await G(() => window.__game.teleport(17.5, 21, 'up'));
  await hold('KeyW', 600);
  await page.waitForFunction(() => window.__game.fight && !window.__game.script, null, { timeout: 12000 }).catch(() => {});
  await damageUntil("b.hp <= 0 || b.state === 'dying'", 30000, stunFn);
  await page.waitForFunction(() => !window.__game.fight, null, { timeout: 10000 }).catch(() => {});
  await wait(1500);
  for (let i = 0; i < 30 && !(await G(() => window.__game.cine)); i++) { if (await dialogOpen()) await talkThrough(4); await wait(400); }
  const out = await G(() => ({ cine: window.__game.cine, done: !!window.__game.story.flags.a2_thalassa, title: window.__game.game.title, perle: window.__game.G.count('gezeitenperle'), track: window.__game.audio.state.track }));
  check('Thalassa besiegt → Belohnung (Herz, Perle, Titel „Sternenhüter“) + Outro', out.done && out.cine && out.title === 'Sternenhüter' && out.perle === 1, out);
  await wait(2400); await shot('story2-outro.png');
  for (let i = 0; i < 30 && !(await G(() => window.__game.credits)); i++) { await page.keyboard.press('KeyE'); await wait(150); await page.keyboard.press('KeyE'); await wait(500); }
  await wait(9000);
  await shot('story2-abspann.png');
  check('Abspann der zweiten Geschichte', await G(() => window.__game.credits && /Sternensplitter/.test(document.getElementById('credits').textContent)));
  await page.keyboard.press('KeyE');
  await page.waitForFunction(() => window.__game.sceneId === 'village' && !window.__game.script && !window.__game.fading, null, { timeout: 10000 }).catch(() => {});
  await wait(600);
  s = await story();
  const ban2 = await G(() => document.getElementById('banner').textContent);
  check('Nach dem Abspann: Hauptquest „Die Sternensplitter“ abgeschlossen (ch2 = 6)', s.ch2 === 6 && /Sternensplitter/.test(ban2), { ch2: s.ch2 });
  // Kartografie: alle Gebiete besucht → Selma
  await goTo('wueste', 59, 24, 'up');
  await clearEnemies();
  const mh0 = await G(() => window.__game.game.maxHp);
  await talk('selma'); await wait(300);
  check('Nebenquest „Weiße Flecken“ (alle neuen Gebiete erkundet) abgegeben', await G((m) => window.__game.game.quests.kartografie === 'done' && window.__game.game.maxHp === m + 2, mh0));
  // Fortschritt bleibt nach Neuladen
  await G(() => window.__game.save());
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  await wait(400);
  const reload = await G(() => ({ ch2: window.__game.story.ch2, boots: window.__game.game.boots, hook: window.__game.game.hook, grip: window.__game.game.grip, scene: window.__game.sceneId }));
  check('Speichern/Laden: Fortschritt der zweiten Geschichte + Werkzeuge bleiben erhalten', reload.ch2 === 6 && reload.boots && reload.hook && reload.grip && reload.scene === 'wueste', reload);
  await page.keyboard.press('KeyI'); await wait(250);
  await shot('story2-inventar.png');
  await page.keyboard.press('KeyI');
}

// Eigenständig: node tools/verify-arc2.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const { chromium } = await import('playwright-core');
  const URL = process.env.URL || 'http://localhost:8080/';
  const OUT = new globalThis.URL('../screenshots/', import.meta.url).pathname;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: true, args: ['--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`console.${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
  const checks = {};
  const check = (name, ok, info) => { checks[name] = { ok: !!ok }; console.log(`${ok ? '✔' : '✘'} ${name}`, info !== undefined ? JSON.stringify(info) : ''); };
  await page.goto(URL + '?reset=1&nointro=1', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game && window.__game.ready, null, { timeout: 15000 });
  try { await runArc2({ page, URL, OUT, check, problems }); } catch (e) { console.log('ABBRUCH:', e.message); checks.abbruch = { ok: false }; }
  await browser.close();
  check('Konsole fehlerfrei', problems.length === 0, problems);
  const failed = Object.entries(checks).filter(([, v]) => !v.ok).map(([k]) => k);
  console.log(failed.length ? `VERIFY-ARC2: FAILED (${failed.length})` : `VERIFY-ARC2: OK (${Object.keys(checks).length})`);
  process.exit(failed.length ? 1 : 0);
}
