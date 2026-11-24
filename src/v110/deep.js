// v110 (7): Ausbau von schlanken v100-Features.
//  A Angeln (#42): Fischarten je Gebiet mit Seltenheit, Timing-Fenster (perfekter Zug), Fischbuch.
//  B Beet (#43): drei Pflanzen, Regen lässt schneller wachsen, Wachstum läuft auch offline weiter.
//  C Wetter (#37): spürbare Effekte – Regen (Wachstum/Anbiss), Sturm (Blitze), Blizzard (Ausdauer), Sandsturm (Sicht).
//  D Handwerk (#61/#68): Werkbank-Menü an Bruno/Mira/Hilde mit Materialanzeige, Rezepte schalten sich frei.
//  E Gegnervielfalt: Lavaschleim (teilt sich, verbrennt) und Perlkrabbe (Perlen) auf Vulkaninsel/Grotte, Bestiarium.
//  F Questkette (#28/#47): „Die Feuerprobe“ über Vulkaninsel und Grotte bis zum Obsidianschwert.
//  G Speicherplätze (#80): Slot-Wechsel lädt wirklich (in main.js), Boss-Bestzeiten (#22) für die Bestenliste.
import { mark } from '../v100/registry.js';
import { RECIPES as R } from '../v100/items.js';

export const FISH = {
  barsch: { name: 'Flussbarsch', where: ['village', 'oase'], rare: 0.55, len: [12, 30], heal: 2, color: '#7aa860' },
  hering: { name: 'Hering', where: ['kueste'], rare: 0.6, len: [15, 28], heal: 2, color: '#a8c0d8' },
  forelle: { name: 'Regenbogenforelle', where: ['village'], rare: 0.25, len: [20, 45], heal: 3, color: '#e88aa0', rain: true },
  sandaal: { name: 'Sandaal', where: ['oase'], rare: 0.3, len: [18, 40], heal: 2, color: '#d8c070' },
  tintenfisch: { name: 'Tintenfisch', where: ['kueste', 'tempel'], rare: 0.2, len: [25, 60], heal: 3, color: '#a070c0' },
  glutkarpfen: { name: 'Glutkarpfen', where: ['vulkaninsel'], rare: 0.35, len: [25, 55], heal: 4, color: '#e8642a' },
  perlbarbe: { name: 'Perlbarbe', where: ['grotte', 'tempel'], rare: 0.15, len: [20, 40], heal: 3, color: '#e0e8f8', pearl: true },
  sternfisch: { name: 'Sternfisch', where: ['kueste', 'tempel', 'grotte'], rare: 0.05, len: [40, 90], heal: 6, color: '#ffe14d', night: true },
};
export const CROPS = {
  karotte: { name: 'Karotte', grow: 20, yield: [2, 3] },
  kuerbis: { name: 'Kürbis', grow: 35, yield: [1, 2], need: 'ch1' },
  gluehbeere: { name: 'Glühbeere', grow: 28, yield: [2, 4], need: 'gluehpilz' },
};
const FISHING_SPOTS = ['kueste', 'village', 'oase', 'tempel', 'vulkaninsel', 'grotte'];

function iconCanvas(draw) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); draw(x); return c; }
const fishIcon = (col) => iconCanvas((x) => { x.fillStyle = '#20161a'; x.fillRect(2, 6, 11, 5); x.fillRect(12, 4, 3, 9); x.fillStyle = col; x.fillRect(3, 7, 9, 3); x.fillRect(13, 5, 1, 7); x.fillStyle = '#fff'; x.fillRect(4, 7, 1, 1); });
const roundIcon = (col, hi) => iconCanvas((x) => { x.fillStyle = '#20161a'; x.fillRect(3, 4, 10, 10); x.fillStyle = col; x.fillRect(4, 5, 8, 8); x.fillStyle = hi; x.fillRect(5, 6, 2, 2); x.fillStyle = '#4a8a3a'; x.fillRect(7, 2, 2, 3); });

export function installDeep(api) {
  const { game, G, state, player, ui, audio, dialog, ITEMS, QUESTS, QUEST_ORDER } = api;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const icons = api.itemArt?.icons || {};
  const setIcon = (id, c, force = false) => { if (force || !icons[id]) icons[id] = c; if (force || !ui.icon[id]) ui.icon[id] = (icons[id] || c).toDataURL(); };
  game.fishbook = game.fishbook || {};
  game.kills = game.kills || {};
  game.farmClock = game.farmClock || Date.now();

  // ------------------------------------------------ neue Items + Icons
  for (const [id, f] of Object.entries(FISH)) { ITEMS[id] = { name: f.name, type: 'use', heal: f.heal, desc: `Gefangen beim Angeln. Stellt ${f.heal / 2} Herz${f.heal > 2 ? 'en' : ''} wieder her.` }; setIcon(id, fishIcon(f.color)); }
  ITEMS.kuerbis = { name: 'Kürbis', type: 'use', heal: 4, desc: 'Prächtig! Stellt 2 Herzen wieder her.' }; setIcon('kuerbis', roundIcon('#e88a2a', '#ffc070'));
  ITEMS.gluehbeere = { name: 'Glühbeere', type: 'material', desc: 'Leuchtende Beere. Mira braut daraus starke Tränke.' }; setIcon('gluehbeere', roundIcon('#7ad8ff', '#e0f8ff'));
  ITEMS.glutkern = { name: 'Glutkern', type: 'material', desc: 'Der heiße Kern eines Lavaschleims. Bruno nimmt ihn fürs Obsidianschwert.' }; setIcon('glutkern', roundIcon('#e8642a', '#ffe14d'));
  ITEMS.grosstrank = { name: 'Großer Heiltrank', type: 'use', heal: 8, desc: 'Aus Glühbeeren gebraut. Stellt 4 Herzen wieder her.' }; setIcon('grosstrank', icons.heiltrank || roundIcon('#e04a6a', '#ffb0c0'));
  for (const id of ['karotte', 'muschel', 'gluehpilz', 'obsidian', 'perle', 'saat', 'speer', 'bogen', 'schild', 'obsidianschwert', 'helm_leder', 'ruestung_leder', 'amulett_glueck', 'skin_rot', 'skin_blau']) {
    setIcon(id, id === 'perle' || id === 'muschel' ? roundIcon('#e0e8f8', '#fff') : id === 'obsidian' ? roundIcon('#3a2a4a', '#8a6ad8') : roundIcon('#c8a060', '#fff0c0'));
  }

  // ------------------------------------------------ A Angeln
  const bitesFaster = () => (game.weather === 'regen' || game.weather === 'sturm' ? 0.6 : 1);
  api.startFishing = () => {
    if (player.fishing) { api.reelFish(); return; }
    const sc = state.scene?.id;
    if (!FISHING_SPOTS.includes(sc) && !player.swimming) { ui.toast('Hier beißt nichts. Versuch es an Küste, Dorfsee, Oase, Tempel, Vulkaninsel oder Grotte.'); return; }
    player.fishing = { t: 0, wait: (1.5 + Math.random() * 3) * bitesFaster(), bite: false };
    ui.toast('Angeln … warte auf den Biss! (G/E zum Einholen)');
    audio.sfx('splash', {}, 0.1);
  };
  api.updateFishing = (dt) => {
    const f = player.fishing; if (!f) return;
    f.t += dt;
    if (player.moving) { player.fishing = null; ui.toast('Angel eingeholt.'); return; }
    if (!f.bite && f.t >= f.wait) { f.bite = true; f.window = 1.3; f.perfect = 0.35; ui.toast('Anbiss! Jetzt E oder G!'); audio.sfx('splash'); api.vibrate?.(40); }
    if (f.bite) { f.window -= dt; if (f.window <= 0) { player.fishing = null; ui.toast('Der Fisch ist entwischt.'); audio.sfx('bonk', {}, 0.2); } }
  };
  api.pickFish = (sc, night = state.tint === 2) => {
    const pool = Object.entries(FISH).filter(([, f]) => f.where.includes(sc) && (!f.night || night));
    if (!pool.length) return 'barsch';
    const rain = game.weather === 'regen' || game.weather === 'sturm';
    const w = pool.map(([id, f]) => [id, f.rare * (f.rain && rain ? 2 : 1)]);
    let r = Math.random() * w.reduce((s, [, x]) => s + x, 0);
    for (const [id, x] of w) { if ((r -= x) <= 0) return id; }
    return w[0][0];
  };
  api.reelFish = () => {
    const f = player.fishing; if (!f || !f.bite) return false;
    const perfect = 1.3 - f.window <= f.perfect;
    const id = api.pickFish(state.scene?.id), def = FISH[id];
    const len = Math.round(rnd(def.len[0], def.len[1]) * (perfect ? 1.15 : 1));
    const book = game.fishbook[id] || { n: 0, best: 0 };
    const first = !book.n; book.n++; book.best = Math.max(book.best, len); game.fishbook[id] = book;
    game.fish.caught.push({ id, len, t: Date.now() }); if (game.fish.caught.length > 50) game.fish.caught.shift();
    game.fish.best = Math.max(game.fish.best || 0, len);
    G.give(id, 1, true);
    if (perfect) G.give('taler', 3, true);
    if (def.pearl && Math.random() < 0.5) G.give('perle', 1, true);
    ui.toast(`${first ? 'NEU im Fischbuch: ' : ''}${def.name}, ${len} cm${perfect ? ' – perfekter Zug! +3 Taler' : ''}`, id);
    audio.sfx(first ? 'fanfare' : 'item');
    player.fishing = null; G.markDirty();
    return { id, len, perfect };
  };
  api.fishbookLines = () => Object.entries(FISH).map(([id, f]) => (game.fishbook[id] ? `✔ ${f.name} – ${game.fishbook[id].n}× (Rekord ${game.fishbook[id].best} cm)` : `○ ??? (${f.where.join('/')}${f.night ? ', nachts' : ''})`));

  // ------------------------------------------------ B Beet
  const unlockedCrops = () => Object.entries(CROPS).filter(([id, c]) => !c.need || (c.need === 'ch1' ? (game.story?.ch || 0) >= 2 : G.count(c.need) > 0 || game.collect?.[c.need])).map(([id]) => id);
  api.plantCrop = (tx, ty) => {
    const key = `${tx},${ty}`;
    if (game.farm[key]) { const f = game.farm[key]; ui.toast(`${CROPS[f.crop]?.name || f.crop}: Stufe ${f.stage}/3${game.weather === 'regen' ? ' (Regen hilft!)' : ''}`); return; }
    if (!game.inv.saat) { game.inv.saat = 3; ui.toast('Oma Hilde gab dir Saatgut.'); }
    const crops = unlockedCrops();
    const plant = (crop) => {
      if ((game.inv.saat || 0) < 1) { ui.toast('Kein Saatgut. Hilde tauscht Äpfel gegen Saat (V im Haus).'); return; }
      G.take('saat', 1);
      game.farm[key] = { stage: 0, crop, t: 0 };
      ui.toast(`${CROPS[crop].name} gesät!`); audio.sfx('item'); G.markDirty();
    };
    if (crops.length === 1) plant(crops[0]);
    else dialog.show('Beet', ['Was möchtest du säen?'], null, { options: [...crops.map((c) => CROPS[c].name), 'Abbrechen'], onSelect: (i) => { if (crops[i]) plant(crops[i]); } });
  };
  api.tickFarm = (dt) => {
    const mul = game.weather === 'regen' || game.weather === 'sturm' ? 2 : 1;
    for (const k of Object.keys(game.farm)) {
      const f = game.farm[k], c = CROPS[f.crop] || CROPS.karotte;
      f.t += dt * mul;
      while (f.stage < 3 && f.t > c.grow * (f.stage + 1)) { f.stage++; if (f.stage >= 3) ui.toast(`${c.name}: Ernte bereit!`); }
    }
    game.farmClock = Date.now();
  };
  // Offline-Wachstum (max. 10 Min. Spielzeit-Äquivalent)
  const away = Math.min(600, Math.max(0, (Date.now() - (game.farmClock || Date.now())) / 1000));
  if (away > 5) for (const f of Object.values(game.farm)) { const c = CROPS[f.crop] || CROPS.karotte; f.t += away; f.stage = Math.min(3, Math.floor(f.t / c.grow)); }
  api.harvestCrop = (tx, ty) => {
    const key = `${tx},${ty}`, f = game.farm[key];
    if (!f || f.stage < 3) return false;
    const c = CROPS[f.crop] || CROPS.karotte, n = Math.round(rnd(c.yield[0], c.yield[1]));
    delete game.farm[key];
    G.give(f.crop, n);
    if (Math.random() < 0.4) G.give('saat', 1, true);
    audio.sfx('item');
    return true;
  };

  // ------------------------------------------------ C Wetter-Effekte
  let boltT = 4;
  api.tickWeatherFx = (dt) => {
    const w = game.weather;
    if (w === 'sturm' && !state.settings?.performance) {
      boltT -= dt;
      if (boltT <= 0) { boltT = 5 + Math.random() * 8; state.flash = { c: '220,230,255', t: 0, dur: 0.25 }; audio.sfx('thud', {}, 0.5); }
    }
    if (w === 'blizzard' && !player.swimming) game.stamina = Math.max(0, game.stamina - dt * 22); // hebt die Regeneration fast auf
  };
  api.weatherInfo = () => ({ regen: 'Regen: Pflanzen wachsen doppelt so schnell, Fische beißen schneller.', sturm: 'Sturm: Blitze! Pflanzen wachsen schnell.', blizzard: 'Blizzard: Ausdauer regeneriert kaum.', sandsturm: 'Sandsturm: schlechte Sicht.', klar: 'Klarer Himmel.' }[game.weather] || '');
  const drawWeather0 = api.drawWeather;
  api.drawWeather = (bctx, cam, time) => {
    drawWeather0?.(bctx, cam, time);
    if (game.weather === 'sandsturm' && !state.settings?.performance) {
      const px = player.x - cam.x, py = player.y - 8 - cam.y;
      const g = bctx.createRadialGradient(px, py, 40, px, py, Math.max(cam.w, cam.h) * 0.6);
      g.addColorStop(0, 'rgba(200,160,80,0)'); g.addColorStop(1, 'rgba(170,130,60,0.55)');
      bctx.fillStyle = g; bctx.fillRect(0, 0, cam.w, cam.h);
    }
  };

  // ------------------------------------------------ D Handwerk
  Object.assign(R, {
    grosstrank: { station: 'mira', need: { gluehbeere: 3, moorkraut: 1 }, out: ['grosstrank', 1] },
    obsidianschwert: { station: 'bruno', need: { obsidian: 2, glutkern: 1, eisenerz: 1 }, out: ['obsidianschwert', 1] },
    fischsuppe: { station: 'hilde', need: { barsch: 1, karotte: 1 }, out: ['grosstrank', 1] },
  });
  const STATIONS = { schmiede: ['bruno', 'Brunos Werkbank'], zuhause: ['hilde', 'Hildes Küche'] };
  const stationFor = (sid) => STATIONS[sid] || (sid === 'dunkelwald' && Math.hypot(player.x / 16 - 50, player.y / 16 - 31) < 7 ? ['mira', 'Miras Kessel'] : null);
  game.recipesKnown = { heiltrank: true, saat: true, speer: true, schild: true, ...game.recipesKnown };
  api.unlockRecipes = () => {
    const k = game.recipesKnown, add = (id, why) => { if (!k[id]) { k[id] = true; ui.toast(`Neues Rezept: ${id} (${why})`); } };
    if (G.count('eisenerz') > 0 || game.ore) add('bogen', 'Erz gefunden');
    if (G.count('gluehbeere') > 0) add('grosstrank', 'Glühbeeren geerntet');
    if (game.fishbook?.barsch) add('fischsuppe', 'Barsch gefangen');
  };
  const have = (id) => (id === 'taler' ? game.coins : G.count(id));
  const nm = (id) => (id === 'taler' ? 'Taler' : ITEMS[id]?.name || id);
  api.openWorkbench = (sceneId = state.scene?.id) => {
    const st = stationFor(sceneId);
    if (!st) { ui.toast('Werkbänke (V): Schmiede (Bruno), Hildes Haus, bei Mira im Dunkelwald.'); return false; }
    api.unlockRecipes();
    const list = Object.entries(R).filter(([id, r]) => r.station === st[0] && game.recipesKnown[id]);
    if (!list.length) { dialog.show(st[1], ['Noch keine Rezepte bekannt.']); return true; }
    const label = ([id, r]) => { const ok = Object.entries(r.need).every(([m, n]) => have(m) >= n); return `${ok ? '✔' : '✘'} ${nm(r.out[0])}${r.out[1] > 1 ? ' ×' + r.out[1] : ''} ← ${Object.entries(r.need).map(([m, n]) => `${nm(m)} ${Math.min(have(m), n)}/${n}`).join(', ')}`; };
    dialog.show(st[1], ['Was möchtest du herstellen?'], null, {
      options: [...list.map(label), 'Fertig'],
      onSelect: (i) => { if (list[i]) { const ok = api.craft(list[i][0]); if (ok && list[i][0] === 'obsidianschwert') api.feuerprobeDone(); } },
    });
    return true;
  };
  mark(61, 'crafting bank (v110 Werkbank-Menü)'); mark(68, 'recipe book (v110 Freischaltung)');

  // ------------------------------------------------ E Gegner
  api.onEnemyKilled = (e) => {
    const t = e.type || e.def?.name;
    game.kills[t] = (game.kills[t] || 0) + 1;
    if (e.def?.split && !e.small) {
      for (const dx of [-8, 8]) { const s = api.spawnEnemyAt?.('lavaschleim_klein', e.x + dx, e.y); if (s) s.small = true; }
    }
  };
  api.onEnemyTouch = (e) => { if (e.def?.burn) api.applyStatus?.(game, 'poison', 2); };

  // ------------------------------------------------ F Questkette „Die Feuerprobe“
  const fl = () => (game.story.flags ||= {});
  QUESTS.feuerprobe = {
    title: 'Die Feuerprobe', giver: 'Runen-Übersetzer',
    desc: 'Auf der Vulkaninsel erzählt eine Tafel vom „Feuer unter dem Meer“. Folge der Spur bis zur Schmiede.',
    steps: () => [
      { text: 'Lies die Tafel auf der Vulkaninsel.', done: !!fl().fp_lore },
      { text: 'Lass den Runen-Übersetzer die Inschrift deuten.', done: !!fl().fp_runen },
      { text: `Besiege Lavaschleime und sammle einen Glutkern (${Math.min(1, G.count('glutkern'))}/1).`, done: G.count('glutkern') >= 1 || !!fl().fp_done },
      { text: 'Finde in der Unterwasser-Grotte die Korallen-Inschrift.', done: !!fl().fp_grotte },
      { text: `Schmiede bei Bruno das Obsidianschwert (Obsidian ${Math.min(2, G.count('obsidian'))}/2, Werkbank: V).`, done: !!fl().fp_done },
    ],
    reward: 'Obsidianschwert, 60 Taler, Titel „Feuerläufer“',
  };
  if (!QUEST_ORDER.includes('feuerprobe')) QUEST_ORDER.push('feuerprobe');
  api.feuerprobeLore = (id) => {
    if (id === 'lore_vulkan' && !fl().fp_lore) { fl().fp_lore = true; if (!game.quests.feuerprobe) { game.quests.feuerprobe = 'active'; ui.toast('Neue Quest: Die Feuerprobe'); audio.sfx('questNew'); } G.markDirty(); }
    if (id === 'lore_grotte' && fl().fp_runen && !fl().fp_grotte) { fl().fp_grotte = true; game.recipesKnown.obsidianschwert = true; ui.toast('Die Inschrift verrät das Rezept: Obsidianschwert!'); G.markDirty(); }
  };
  api.feuerprobeRunen = () => {
    if (!fl().fp_lore || fl().fp_runen) return null;
    fl().fp_runen = true; G.markDirty();
    return ['„Feuer unter dem Meer“ … das ist kein Rätsel, das ist ein Rezept!', 'Glas aus dem Vulkan, ein Kern aus Glut – und das Wissen der Korallen in der Grotte. Dann schmiedet Bruno dir eine Klinge, die nicht bricht.'];
  };
  api.feuerprobeDone = () => {
    if (fl().fp_done) return;
    fl().fp_done = true; game.coins += 60; game.title = 'Feuerläufer';
    if (game.quests.feuerprobe) G.completeQuest('feuerprobe', ['Obsidianschwert', '60 Taler', 'Titel: Feuerläufer']);
  };

  // ------------------------------------------------ Kampfmusik-Erkennung (für #6)
  let aggroT = 0, calmT = 0;
  api.tickCombatMusic = (dt) => {
    const sc = state.scene;
    const near = !state.fight && !state.script && sc?.enemies?.some((e) => !e.dead && e.state === 'chase' && Math.hypot(e.x - player.x, e.y - player.y) < 110);
    if (near) { aggroT += dt; calmT = 0; } else { calmT += dt; aggroT = Math.max(0, aggroT - dt); }
    if (!state.combatMusic && aggroT > 1.5) state.combatMusic = true;
    if (state.combatMusic && (calmT > 4 || state.fight)) state.combatMusic = false;
  };

  mark(37, 'weather cycle (v110 Effekte)'); mark(42, 'fishing (v110 Arten+Fischbuch)'); mark(43, 'farm plot (v110 Pflanzen)');
  return api;
}
