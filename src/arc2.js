// Laufzeit der zweiten Geschichte „Die Sternensplitter“: Auslöser, Kapitelfortschritt, Durchquerung
// (Treibsand, Eis, Enterhaken), Altäre, Bootsfahrt, Eiswächter-Welle und die Konfiguration der neuen Bosse.
// main.js reicht über `C` seine Skript- und Spielwerkzeuge herein und bleibt so schlank.
import { T } from './map.js';
import { TS } from './pix.js';
import { CHAPTERS2, TITLE2, OUTRO2, CREDITS2, story2Talk, story2Marker } from './story2.js';
import { Khepran, buildKhepranArt, KH_NAME, KH_TITLE } from './miniboss.js';
import { Thalassa, buildThalassaArt, TH_NAME, TH_TITLE } from './boss2.js';
import { KH_ARENA, KH_RESPAWN, KH_PILLARS, OASIS } from './maps/wueste.js';
import { TH_ARENA, TH_RESPAWN, TH_POOLS, TEMPLE_DOCK } from './maps/tempel.js';

const MUSIC = { wueste: 'desert', oase_gasthaus: 'oasis', oase_laden: 'oasis', ruinen: 'desert', frost: 'frost', eisgrotte: 'icecave', tempel: 'temple' };
const WAVE = [['eisgeist', -40, 30], ['eisgeist', 40, 30], ['frostwolf', -56, 52], ['frostwolf', 56, 52], ['eisigel', 0, 64]];

export function createArc2(C) {
  const { G, game, state, player } = C;
  const F = () => game.story.flags;
  const khArt = buildKhepranArt(), thArt = buildThalassaArt();
  let trigT = 0, checkT = 0, sinkT = 0, slideT = 0, safe = null, hook = null, wave = null, stunHint = false;

  function chapterBanner(n) {
    C.ui.banner(`Kapitel ${n}`, CHAPTERS2[n].title, [], `Hauptquest „${TITLE2}“ – Ziele im Questlog (Q)`, 'chapter');
    C.audio.sfx('chapter');
  }
  function check() {
    const st = game.story, ch = st.ch2 || 0;
    if (ch < 1 || ch > 4) return;
    if (CHAPTERS2[ch].steps(G, st.flags).every((x) => x.done)) { st.ch2 = ch + 1; chapterBanner(st.ch2); C.saveNow(); }
  }

  // -------------------------------------------------------------- Szenen
  async function arcStart() {
    await C.runScript(async () => {
      player.dir = 'left';
      C.audio.sfx('chime'); state.flash = { c: '140,220,255', t: 0, dur: 0.8 };
      await C.say(null, ['Dein Kristallsplitter wird warm und beginnt leise zu summen – ein heller, klarer Ton, wie eine Glocke weit im Westen.']);
      C.setFlag('a2_selma_here');
      const s = state.scene.npcs.find((n) => n.id === 'selma');
      if (s) {
        s.x = 2 * TS + 8; s.dir = 'right';
        await C.pan(8 * TS, 30 * TS, 1.4);
        C.audio.sfx('wind');
        await s.walkTo(12 * TS + 8, 30 * TS + 12, 52);
        s.dir = 'right';
        await C.wait(0.4);
        await C.say('Kartografin Selma', ['Hallo?! Ist das hier Pixeldorf? Bitte sag, dass das Pixeldorf ist. Meine Karte sagt, hier ist ein Sumpf.']);
        await C.panBack(1.0);
      }
      game.story.ch2 = 1;
    });
    chapterBanner(1);
    C.saveNow();
  }
  async function selmaLeaves() {
    await C.runScript(async () => {
      const s = state.scene.npcs.find((n) => n.id === 'selma');
      if (s) { await C.wait(0.3); await s.walkTo(4 * TS, s.y, 64); }
      C.setFlag('a2_selma_gone');
    });
    C.ui.toast('Neues Ziel: Folge dem Karawanenweg nach Westen.', 'karte');
  }
  async function janRepairs() {
    await C.runScript(async () => {
      G.take('schiffsteer', 1);
      const j = state.scene.npcs.find((n) => n.id === 'jan');
      if (j) { await C.wait(0.2); await j.walkTo(j.x, j.y - 3 * TS, 60); }
      C.setFlag('a2_boat'); C.setFlag('a2_jan_coast');
    });
    C.ui.toast('Jan ist unterwegs zur Möwenbucht.', 'schiffsteer');
  }
  async function boatRide() {
    if (state.script) return;
    const dock = C.getScene('kueste').map.dock;
    await C.runScript(async () => {
      C.audio.sfx('boat');
      state.musicOverride = 'beach';
      const skipped = await C.playCine([{ scene: 'kueste', from: [dock.x, dock.y], to: [dock.x + 2, dock.y + 12],
        text: 'Jan legt ab. Das Ruder knarrt, die Möwen kreischen – und bald liegt die Bucht weit hinter euch. Unter den Wellen schimmert es grün.' }]);
      void skipped;
      state.musicOverride = undefined;
      await C.fadeTo('tempel', TEMPLE_DOCK.x, TEMPLE_DOCK.y - 1, 'up');
      C.audio.sfx('wave');
      if (!F().a2_tempel_seen) {
        await C.say('Fischer Jan', ['Da wären wir. Der Gezeitentempel … Ich warte hier am Boot. Wenn du zurück willst, sprich mich am Steg an. Oder ruf. Laut.']);
        C.setFlag('a2_tempel_seen');
      }
    });
  }
  async function boatBack() {
    const dock = C.getScene('kueste').map.dock;
    await C.runScript(async () => {
      C.audio.sfx('boat');
      await C.fadeTo('kueste', dock.x - 1, dock.y - 4, 'up');
    });
  }
  async function hookTo(it) {
    if (!game.hook) {
      C.dialog.show(null, [it.text, 'Viel zu weit zum Springen. Mit einem Seil und einem Haken könnte man sich hinüberziehen …']);
      return;
    }
    const map = state.scene.map, [fx, fy] = [it.x, it.y], [tx, ty] = it.to;
    const sx = Math.sign(tx - fx), sy = Math.sign(ty - fy);
    const cand = [[tx + sx, ty + sy], [tx - sy, ty + sx], [tx + sy, ty - sx], [tx, ty + 1]];
    const land = cand.find(([x, y]) => !map.isSolid(x, y)) || cand[0];
    await C.runScript(async () => {
      player.dir = sx > 0 ? 'right' : sx < 0 ? 'left' : sy > 0 ? 'down' : 'up';
      C.audio.sfx('hook');
      hook = { x0: player.x, y0: player.y, x1: land[0] * TS + 8, y1: land[1] * TS + 12, px: tx * TS + 8, py: ty * TS + 4, t: 0, dur: 0.75 };
      await C.wait(0.85);
    });
  }
  async function sunAltar() {
    const f = F();
    if (!f.a2_khepran) { C.dialog.show(null, 'Ein Altar unter einer dicken Sandschicht. Irgendetwas in der Halle bewacht ihn.'); return; }
    if (f.a2_sun) { C.dialog.show(null, 'Der Altar ist leer. Die goldene Sonnenscheibe glimmt noch leicht nach.'); return; }
    await C.runScript(async () => {
      player.dir = 'up';
      await C.say(null, ['Auf dem Altar liegt ein Splitter, so hell wie die Mittagssonne. Er ist warm wie ein Stein am Abend.']);
      C.audio.sfx('chime'); state.flash = { c: '255,220,120', t: 0, dur: 0.9 }; C.shake(0.3);
      for (let i = 0; i < 14; i++) C.addFx({ type: 'sparkle', x: 17 * TS + (Math.random() - 0.5) * 30, y: 2 * TS + Math.random() * 20, t: -i * 0.05, dur: 0.8 });
      G.give('sonnensplitter', 1);
      C.setFlag('a2_sun');
      await C.wait(0.6);
      await C.say(null, ['Dein Kristallsplitter und der Sonnensplitter summen gemeinsam. Vor deinem inneren Auge: ein Gletscher, hinter den Graufels-Bergen im Osten.',
        'Der Frostpass! Er beginnt am Ostrand der Berge.']);
    });
  }
  async function frostAltar() {
    const f = F(), ch = game.story.ch2 || 0;
    if (f.a2_frost_taken) { C.dialog.show(null, f.a2_frost ? 'Der Eisaltar ist leer. Die Grotte ist still.' : 'Die Wächter der Grotte sind erwacht!'); return; }
    if (ch < 3) { C.dialog.show(null, 'Tief im Eis glimmt ein blauer Splitter. Er rührt sich nicht – als würde er auf etwas warten.'); return; }
    await C.runScript(async () => {
      player.dir = 'up';
      await C.say(null, ['Im Eis des Altars steckt ein Splitter, so blau wie ein Wintermorgen. Du ziehst – und er löst sich mit einem hellen Knacken.']);
      C.audio.sfx('freeze'); state.flash = { c: '170,230,255', t: 0, dur: 0.8 };
      G.give('frostsplitter', 1);
      C.setFlag('a2_frost_taken');
      await C.wait(0.5);
      C.audio.sfx('roar'); C.shake(0.9);
      await C.say(null, ['Die Grotte bebt! Aus dem Eis lösen sich die Wächter des Splitters!']);
    });
    spawnWave();
  }
  function spawnWave() {
    const sc = state.scene; if (sc.id !== 'eisgrotte') return;
    wave = [];
    for (const [type, dx, dy] of WAVE) { const e = C.spawnEnemyAt(type, 15 * TS + dx, 6 * TS + dy); if (e) wave.push(e); }
    C.audio.sfx('summon');
    state.musicOverride = 'miniboss';
    C.ui.toast('Besiege die Eiswächter!');
  }
  async function rest() {
    await C.runScript(async () => {
      state.flash = { c: '0,0,0', t: 0, dur: 1.6 };
      C.audio.sfx('heal');
      await C.wait(0.9);
      G.healFull();
    });
    C.ui.toast('Gut geschlafen! Alle Herzen aufgefüllt. Spielstand gespeichert.', 'herz');
    C.saveNow();
  }

  // -------------------------------------------------------------- Bosse
  function bossIntro(cfg) {
    return C.runScript(async () => {
      const b = state.scene.boss, f = F(), first = !f[cfg.seen];
      C.setFlag(cfg.lock); C.audio.sfx('thud'); C.shake(0.5);
      state.musicOverride = null;
      await C.wait(0.4);
      await C.pan(b.x, b.y - 24, first ? 1.3 : 0.6);
      b.state = 'intro';
      C.audio.sfx(cfg.id === 'tempel' ? 'tide' : 'burrowUp'); C.audio.sfx('roar'); C.shake(1.2);
      state.flash = { c: cfg.id === 'tempel' ? '90,220,255' : '255,200,90', t: 0, dur: 0.6 };
      C.ui.banner(cfg.kicker, cfg.name, [], cfg.title, 'boss');
      state.fight = true; C.ui.bossBar(b, cfg.name, cfg.title);
      await C.wait(first ? 1.6 : 0.8);
      if (first) await C.say(null, [cfg.hint]);
      await C.panBack(first ? 0.8 : 0.4);
      C.setFlag(cfg.seen);
      state.musicOverride = undefined;
      b.wake();
    });
  }
  async function khepranDefeated() {
    state.fight = false;
    await C.runScript(async () => {
      state.flash = { c: '255,230,160', t: 0, dur: 1.2 }; C.audio.sfx('explosion', { big: true }); C.shake(1.0);
      for (let i = 0; i < 20; i++) C.addFx({ type: 'debris', x: KH_ARENA.cx, y: KH_ARENA.cy, vx: Math.cos(i) * 90, vy: Math.sin(i) * 50 - 70, t: 0, dur: 1.0, c: i % 2 ? '#e0b060' : '#8a5a2a' });
      C.ui.bossBar(null);
      C.setFlag('a2_khepran'); C.setFlag('a2_kh_lock', false);
      await C.wait(1.4);
      G.addMaxHearts(1); G.addCoins(60);
      C.audio.sfx('fanfare');
      await C.say(null, ['Khepran zerfällt zu einem Haufen goldenen Sandes. Der Wind trägt ihn durch die Halle davon.',
        'Erhalten: Herzcontainer und 60 Taler.', 'Im Norden der Halle beginnt ein Altar zu leuchten.']);
    });
    C.saveNow();
  }
  async function thalassaDefeated() {
    state.fight = false;
    await C.runScript(async () => {
      state.flash = { c: '200,255,255', t: 0, dur: 1.8 }; C.audio.sfx('explosion', { big: true }); C.audio.sfx('tide'); C.shake(1.4);
      for (let i = 0; i < 24; i++) C.addFx({ type: 'splash', x: TH_ARENA.cx + Math.cos(i) * 40, y: TH_ARENA.cy + Math.sin(i) * 20, t: -i * 0.03, dur: 0.8 });
      C.ui.bossBar(null);
      C.setFlag('a2_thalassa'); C.setFlag('a2_th_lock', false);
      state.musicOverride = 'ending';
      await C.wait(1.6);
      await C.pan(18 * TS, 3 * TS, 1.4);
      await C.say(null, ['Thalassa sinkt seufzend in ihr Becken zurück. „Endlich … Ruhe“, flüstert das Wasser.',
        'Auf dem Muschelaltar liegt der letzte Splitter. Als du ihn aufhebst, verschmelzen alle drei mit deinem Kristall zu einem kleinen, warmen Stern.']);
      G.addMaxHearts(1); game.coins += 150; G.give('gezeitenperle', 1, true); game.title = 'Sternenhüter';
      C.audio.sfx('fanfare');
      await C.say(null, ['Erhalten: Herzcontainer, 150 Taler, die Gezeitenperle und der Titel „Sternenhüter“.']);
    });
    state.script = true;
    await C.playCine(OUTRO2);
    await C.showCredits(CREDITS2);
    game.story.ch2 = 6;
    C.setFlag('a2_jan_coast', false);
    await C.fadeTo('village', 57.5, 32, 'down');
    state.cineMode = false; state.script = false; state.musicOverride = undefined;
    C.ui.banner('Hauptquest abgeschlossen', TITLE2, ['Herzcontainer', '150 Taler', 'Titel: Sternenhüter'], 'Freies Spiel – Pixeldorf und die Westlande gehören dir!', 'chapter');
    C.audio.sfx('fanfare');
    C.saveNow();
  }
  const bosses = {
    ruinen: {
      id: 'ruinen', name: KH_NAME, title: KH_TITLE, kicker: 'Wächter', music: 'miniboss', done: 'a2_khepran', lock: 'a2_kh_lock', seen: 'a2_kh_seen', respawn: KH_RESPAWN,
      hint: 'Khepran ist von einem Panzer geschützt. Lass ihn gegen eine Säule krachen – dann ist er verwundbar!',
      make: () => new Khepran(KH_ARENA.cx, KH_ARENA.cy - 8, khArt, KH_ARENA, KH_PILLARS),
      trigger: () => game.hook && player.y < 15.6 * TS,
      onPhase: () => C.ui.banner('Phase 2', 'Khepran gräbt sich tiefer ein!', [], 'Sandgeschosse und Skorpione! Schlag nach dem Auftauchen schnell zu.', 'boss'),
      defeated: khepranDefeated,
    },
    tempel: {
      id: 'tempel', name: TH_NAME, title: TH_TITLE, kicker: 'Endgegner', music: 'boss2', done: 'a2_thalassa', lock: 'a2_th_lock', seen: 'a2_th_seen', respawn: TH_RESPAWN,
      hint: 'Thalassas Körper ist aus Wasser – dein Schwert gleitet einfach hindurch. Schlag ihre Wasserkugeln zu ihr zurück!',
      make: () => new Thalassa(thArt, TH_ARENA, TH_POOLS, TS),
      trigger: () => (game.story.ch2 || 0) >= 5 && player.y < 19.6 * TS,
      onPhase: (n) => C.ui.banner(`Phase ${n}`, n === 2 ? 'Die Tiefe erwacht!' : 'Der Mahlstrom!', [], n === 2 ? 'Tentakel! Aufsteigende Blasen verraten, wo sie auftauchen.' : 'Stemm dich gegen den Sog – und weich der Flut aus!', 'boss'),
      onStun: () => { if (!stunHint) { stunHint = true; C.ui.toast('Thalassa ist benommen – jetzt zuschlagen!'); } },
      defeated: thalassaDefeated,
    },
  };

  const hooks = { scene: (n) => ({ selmaLeaves, janRepairs, boatRide })[n]?.() };

  return {
    bosses, bossIntro,
    talk: (id) => story2Talk(id, G, game.story, hooks),
    marker: (id, sceneId) => story2Marker(id, G, game.story, sceneId),
    track: (sc) => MUSIC[sc.id] || null,
    rest,
    onEnter(sc) {
      wave = null; sinkT = 0; safe = null; hook = null; player.speedMul = 1; player.ice = false;
      if (sc.id === 'eisgrotte' && F().a2_frost_taken && !F().a2_frost) setTimeout(() => { if (state.scene === sc) spawnWave(); }, 600);
      if (state.musicOverride === 'miniboss' && !state.fight) state.musicOverride = undefined;
      if (sc.id.startsWith('oase_')) { if (!F().a2_oase && game.story.ch2) C.setFlag('a2_oase'); }
    },
    interact(it) {
      const f = F();
      switch (it.id) {
        case 'hook': hookTo(it); return true;
        case 'sunaltar': sunAltar(); return true;
        case 'frostaltar': frostAltar(); return true;
        case 'gasthausbett': C.dialog.show(null, [it.text, 'Möchtest du dich ausruhen?'], null, { options: ['Ausruhen', 'Nein'], onSelect: (i) => { if (i === 0) rest(); } }); return true;
        case 'boot':
          if ((game.story.ch2 === 4 || game.story.ch2 === 5) && f.a2_boat) { C.dialog.show(null, ['Jans Boot. Frisch geteert und – fast – dicht.'], null, { options: ['Zum Gezeitentempel fahren', 'Hierbleiben'], onSelect: (i) => { if (i === 0) boatRide(); } }); return true; }
          if (game.story.ch2 >= 6) { C.dialog.show(null, 'Jans Boot. Er fährt jetzt jeden Morgen hinaus.'); return true; }
          return false;
        case 'boot2': C.dialog.show('Fischer Jan', ['Zurück zur Möwenbucht?'], null, { options: ['Ja, zurückfahren', 'Noch nicht'], onSelect: (i) => { if (i === 0) boatBack(); } }); return true;
        case 'pearlaltar': C.dialog.show(null, f.a2_thalassa ? 'Der Muschelaltar ist leer. Das Wasser im Tempel liegt still und klar.' : 'Ein Altar in Form einer Muschel. Etwas schimmert tief im Wasser der Halle.'); return true;
        default: return false;
      }
    },
    update(sc, dt) {
      const f = F(), st = game.story;
      // Auslöser: freies Spiel nach Umbrakor – am Westrand des Dorfes taucht Selma auf
      if (sc.id === 'village' && st.ch >= 6 && !st.ch2 && player.tileX < 34 && !state.script && !state.fade && !C.dialog.open && !state.cine && !state.credits) {
        trigT += dt; if (trigT > 0.6) { trigT = -999; arcStart(); }
      } else if (trigT > 0) trigT = 0;
      checkT -= dt;
      if (checkT <= 0 && !state.script) { checkT = 0.25; check(); }
      if (sc.id === 'wueste' && st.ch2 && !f.a2_oase && Math.hypot(player.x / TS - OASIS.x, player.y / TS - OASIS.y) < 13) { C.setFlag('a2_oase'); C.ui.toast('Die Oase Sandrast!', 'karte'); }
      // Enterhaken-Animation
      if (hook) {
        hook.t += dt; const k = Math.min(1, hook.t / hook.dur);
        if (k > 0.3) { const e = (k - 0.3) / 0.7, s = e * e * (3 - 2 * e); player.x = hook.x0 + (hook.x1 - hook.x0) * s; player.y = hook.y0 + (hook.y1 - hook.y0) * s - Math.sin(s * Math.PI) * 10; }
        if (k >= 1) { player.x = hook.x1; player.y = hook.y1; hook = null; safe = null; }
      }
      // Bodenbeschaffenheit
      const tile = sc.map.get(player.tileX, player.tileY);
      if (tile === T.QSAND && !state.script) {
        if (game.boots) { player.speedMul = 0.92; sinkT = 0; }
        else {
          player.speedMul = 0.42; sinkT += dt;
          if (Math.random() < dt * 6) C.addFx({ type: 'debris', x: player.x + (Math.random() - 0.5) * 10, y: player.y - 2, vx: (Math.random() - 0.5) * 30, vy: -30, t: 0, dur: 0.4, c: '#c9a060' });
          if (sinkT > 1.1) {
            sinkT = 0; C.audio.sfx('sink');
            if (player.inv <= 0) C.hurtPlayer(1, { x: player.x, y: player.y + 1 });
            if (safe && game.hp > 0) { player.x = safe.x; player.y = safe.y; player.kbt = 0; player.kbx = player.kby = 0; }
            if (!f.a2_qs_hint) { C.setFlag('a2_qs_hint'); C.ui.toast('Der Treibsand zieht dich hinab! Mit Sandläufer-Stiefeln kämst du hinüber.', 'sandlaeufer'); }
          }
        }
      } else {
        player.speedMul = 1; sinkT = 0;
        if (!hook && !state.script) safe = { x: player.x, y: player.y };
      }
      player.ice = tile === T.ICE && !game.grip;
      if (player.sliding) { slideT -= dt; if (slideT <= 0) { slideT = 0.45; C.audio.sfx('slide', {}, 0.2); } }
      // Eiswächter-Welle
      if (wave && sc.id === 'eisgrotte') {
        if (wave.every((e) => e.dead || !sc.enemies.includes(e))) {
          wave = null; state.musicOverride = undefined;
          C.setFlag('a2_frost'); C.audio.sfx('fanfare');
          C.ui.banner('Geschafft', 'Die Eiswächter sind besiegt', [], 'Der Frostsplitter gehört dir.', 'chapter');
          C.saveNow();
        }
      }
    },
    /** Zeichnet Enterhaken-Kette und Treibsandkreis (Welt-Koordinaten via Kamera). */
    draw(bctx, cam) {
      if (hook) {
        const k = Math.min(1, hook.t / hook.dur), reach = Math.min(1, k / 0.3);
        const x0 = player.x - cam.x, y0 = player.y - 10 - cam.y, x1 = hook.px - cam.x, y1 = hook.py - cam.y;
        const ex = x0 + (x1 - x0) * reach, ey = y0 + (y1 - y0) * reach, n = Math.max(2, Math.floor(Math.hypot(ex - x0, ey - y0) / 3));
        for (let i = 0; i <= n; i++) { bctx.fillStyle = i % 2 ? '#9aa0aa' : '#5a5e68'; bctx.fillRect(Math.round(x0 + (ex - x0) * i / n), Math.round(y0 + (ey - y0) * i / n), 1, 1); }
        bctx.fillStyle = '#d8dce4'; bctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 3);
      }
      if (sinkT > 0) {
        const x = Math.round(player.x - cam.x), y = Math.round(player.y - cam.y), r = 5 + sinkT * 4;
        bctx.fillStyle = 'rgba(120,80,30,0.5)'; bctx.beginPath(); bctx.ellipse(x, y, r, r * 0.4, 0, 0, Math.PI * 2); bctx.fill();
      }
    },
    /** Spieler sinkt sichtbar ein (für Spieler-Zeichnung: Pixel nach unten). */
    get sink() { return sinkT; },
    debug: { arcStart, spawnWave, boatRide, check, get wave() { return wave; } },
  };
}
