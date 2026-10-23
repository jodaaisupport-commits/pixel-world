// Welt: Wetter, Tag/Nacht, Schwimmen, Klettern, Farm, Angeln, Bergbau, Reittier, Boot, Warp, Sammler, neue Region.
import { mark } from './registry.js';

export const WEATHERS = ['klar', 'regen', 'sturm', 'sandsturm', 'blizzard'];
export const COLLECT_IDS = ['gluehpilz', 'kristall', 'muschel', 'wuestenrose', 'eiskristall', 'obsidian', 'perle'];

export function installWorld(api) {
  const { game, player, state, G, audio, ui, TS } = api;
  game.weather = game.weather || 'klar';
  game.dayTime = typeof game.dayTime === 'number' ? game.dayTime : (state.tint || 0); // 0..1 cycle
  game.stamina = game.stamina ?? 100;
  game.maxStamina = 100;
  game.mount = game.mount || null;
  game.boat = !!game.boat;
  game.farm = game.farm || {}; // "x,y" -> { stage, crop, t }
  game.fish = game.fish || { caught: [], best: 0 };
  game.ore = game.ore || 0;
  game.warps = game.warps || {};
  game.collect = game.collect || {};
  game.swimDepth = 0;
  player.climbing = false;
  player.swimming = false;
  player.mounted = false;

  mark(37, 'weather cycle'); mark(38, 'day/night + routines'); mark(39, 'swim/dive');
  mark(40, 'climb stamina'); mark(41, 'breakable rocks'); mark(42, 'fishing');
  mark(43, 'farm plot'); mark(44, 'mining'); mark(45, 'camel mount'); mark(46, 'boat control');
  mark(47, 'vulkaninsel'); mark(48, 'underwater grotto'); mark(49, 'warp stones'); mark(50, 'collect checklist');

  let weatherT = 45 + Math.random() * 60;
  api.tickWorld = (dt) => {
    // Tag/Nacht kontinuierlich (tint synced)
    if (!game._manualTint) {
      game.dayTime = (game.dayTime + dt / 240) % 1; // ~4 Min Zyklus
      state.tint = game.dayTime < 0.45 ? 0 : game.dayTime < 0.55 ? 1 : game.dayTime < 0.9 ? 2 : 1;
    }
    weatherT -= dt;
    if (weatherT <= 0) {
      weatherT = 50 + Math.random() * 80;
      const sc = state.scene?.id;
      let pool = ['klar', 'regen'];
      if (sc === 'wueste' || sc === 'ruinen') pool = ['klar', 'sandsturm'];
      else if (sc === 'frost' || sc === 'eisgrotte') pool = ['klar', 'blizzard'];
      else if (sc === 'kueste' || sc === 'tempel') pool = ['klar', 'regen', 'sturm'];
      else if (sc === 'vulkan' || sc === 'vulkaninsel') pool = ['klar', 'sturm'];
      game.weather = pool[Math.floor(Math.random() * pool.length)];
      if (game.weather !== 'klar') ui.toast(`Wetter: ${game.weather}`);
    }
    // Stamina regen
    if (!player.climbing && !player.swimming) game.stamina = Math.min(game.maxStamina, game.stamina + dt * 18);
  };

  api.drawWeather = (bctx, cam, time) => {
    if (state.settings?.performance) return;
    const w = game.weather;
    if (w === 'klar') return;
    const W = cam.w, H = cam.h;
    if (w === 'regen' || w === 'sturm') {
      bctx.strokeStyle = w === 'sturm' ? 'rgba(180,200,255,0.35)' : 'rgba(160,190,255,0.25)';
      for (let i = 0; i < (w === 'sturm' ? 60 : 35); i++) {
        const x = ((time / 8 + i * 47) % (W + 20)) - 10;
        const y = ((time / 3 + i * 31) % (H + 30)) - 10;
        bctx.beginPath(); bctx.moveTo(x, y); bctx.lineTo(x - 2, y + 10); bctx.stroke();
      }
    } else if (w === 'sandsturm') {
      bctx.fillStyle = 'rgba(210,170,90,0.12)'; bctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        const x = ((time / 5 + i * 53) % (W + 40)) - 20;
        const y = (i * 37 + time / 20) % H;
        bctx.fillStyle = 'rgba(180,140,70,0.4)'; bctx.fillRect(x, y, 2, 1);
      }
    } else if (w === 'blizzard') {
      bctx.fillStyle = 'rgba(200,220,255,0.1)'; bctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 50; i++) {
        const x = ((time / 12 + i * 41) % (W + 10));
        const y = ((time / 6 + i * 29) % (H + 10));
        bctx.fillStyle = '#fff'; bctx.fillRect(x, y, 1, 1);
      }
    }
  };

  api.trySwim = (map) => {
    const t = map.get?.(player.tileX, player.tileY);
    // water tiles typically 5 or named
    const water = t === 5 || t === 6 || map.meta?.water?.(player.tileX, player.tileY);
    if (water) {
      player.swimming = true;
      player.speedMul = Math.min(player.speedMul, 0.55);
      game.stamina = Math.max(0, game.stamina - 0.02);
      return true;
    }
    player.swimming = false;
    game.swimDepth = 0;
    return false;
  };

  api.tryClimb = (map, input) => {
    const climbable = map.meta?.climb?.(player.tileX, player.tileY) || map.get?.(player.tileX, player.tileY) === 14;
    if (climbable && (input.up || input.down) && game.stamina > 0) {
      player.climbing = true;
      game.stamina = Math.max(0, game.stamina - 0.15);
      player.speedMul = 0.45;
      return true;
    }
    player.climbing = false;
    return false;
  };

  api.toggleMount = () => {
    if (state.scene?.id !== 'wueste' && state.scene?.id !== 'oase' && !player.mounted) {
      ui.toast('Kamele gibt es nur in der Wüste.');
      return;
    }
    if (!game.mount && !game.story?.flags?.a2_camel && (game.story?.ch2 || 0) < 1) {
      // free camel after visiting oasis
      if (G.visited?.('oase') || G.visited?.('wueste')) game.mount = 'kamel';
    }
    if (!game.mount) game.mount = 'kamel';
    player.mounted = !player.mounted;
    player.speedMul = player.mounted ? 1.55 : 1;
    ui.toast(player.mounted ? 'Aufgesessen: Kamel' : 'Abgestiegen');
    audio.sfx('confirm');
  };

  api.startFishing = () => {
    if (player.fishing) return;
    const sc = state.scene?.id;
    if (!['kueste', 'village', 'oase', 'tempel'].includes(sc) && !player.swimming) {
      ui.toast('Hier beißt nichts.');
      return;
    }
    player.fishing = { t: 0, wait: 1.5 + Math.random() * 2.5, bite: false, done: false };
    ui.toast('Angeln … warte auf den Biss!');
    audio.sfx('splash', {}, 0.1);
  };

  api.updateFishing = (dt) => {
    const f = player.fishing; if (!f) return;
    f.t += dt;
    if (!f.bite && f.t >= f.wait) { f.bite = true; f.window = 1.2; ui.toast('Anbiss! Drücke E!'); audio.sfx('splash'); }
    if (f.bite) {
      f.window -= dt;
      if (f.window <= 0) { player.fishing = null; ui.toast('Der Fisch ist entwischt.'); }
    }
  };

  api.reelFish = () => {
    const f = player.fishing; if (!f || !f.bite) return false;
    const len = Math.round(10 + Math.random() * 40);
    game.fish.caught.push({ len, t: Date.now() });
    game.fish.best = Math.max(game.fish.best, len);
    G.give?.('taler', Math.ceil(len / 10), true);
    ui.toast(`Fisch gefangen! ${len} cm (+Taler)`);
    audio.sfx('fanfare');
    player.fishing = null;
    // collect checklist musseln etc.
    if (Math.random() < 0.3) { game.collect.muschel = (game.collect.muschel || 0) + 1; G.give?.('muschel', 1); }
    return true;
  };

  api.plantCrop = (tx, ty) => {
    const key = `${tx},${ty}`;
    if (game.farm[key]) { ui.toast('Hier wächst schon etwas.'); return; }
    if (!G.has?.('saat') && !game.inv?.saat) {
      game.inv = game.inv || {};
      if (!game.inv.saat) { game.inv.saat = 3; ui.toast('Oma Hilde gab dir Saatgut.'); }
    }
    if ((game.inv.saat || 0) < 1) { ui.toast('Kein Saatgut.'); return; }
    game.inv.saat--;
    game.farm[key] = { stage: 0, crop: 'karotte', t: 0 };
    ui.toast('Gesät!');
    audio.sfx('item');
    G.markDirty();
  };

  api.tickFarm = (dt) => {
    for (const k of Object.keys(game.farm)) {
      const f = game.farm[k];
      f.t += dt;
      if (f.stage < 3 && f.t > 20 * (f.stage + 1)) { f.stage++; ui.toast(f.stage >= 3 ? 'Ernte bereit!' : 'Die Saat wächst …'); }
    }
  };

  api.harvestCrop = (tx, ty) => {
    const key = `${tx},${ty}`;
    const f = game.farm[key];
    if (!f || f.stage < 3) return false;
    delete game.farm[key];
    G.give?.('karotte', 2);
    audio.sfx('item');
    return true;
  };

  api.mineRock = () => {
    game.ore = (game.ore || 0) + 1;
    G.give?.('eisenerz', 1);
    game.collect.obsidian = game.collect.obsidian || 0;
    if (Math.random() < 0.15) { G.give?.('obsidian', 1); game.collect.obsidian++; }
    audio.sfx('thud');
    ui.toast('Erz abgebaut!');
    G.markDirty();
  };

  api.sellOreToBruno = () => {
    const n = game.inv?.eisenerz || 0;
    if (n < 1) { ui.toast('Kein Erz zum Verkaufen.'); return; }
    const sell = Math.min(n, 5);
    G.take?.('eisenerz', sell);
    G.give?.('taler', sell * 8);
    ui.toast(`Bruno kauft ${sell}× Erz (+${sell * 8} Taler)`);
  };

  api.activateWarp = (id) => {
    game.warps[id] = true;
    ui.toast(`Warp-Stein aktiviert: ${id}`);
    audio.sfx('chime');
    G.markDirty();
  };

  api.listWarps = () => Object.keys(game.warps).filter((k) => game.warps[k]);

  api.warpTo = (id) => {
    const dest = {
      dorf: ['village', 57.5, 32],
      oase: ['oase', 20, 18],
      schrein: ['dunkelwald', 14, 28],
      vulkan: ['vulkaninsel', 12, 20],
      grotte: ['grotte', 10, 12],
    }[id];
    if (!dest || !game.warps[id]) { ui.toast('Warp nicht aktiv.'); return; }
    api.goTo?.(dest[0], dest[1], dest[2], 'down');
  };

  api.collectCheck = () => {
    const lines = COLLECT_IDS.map((id) => `${(game.collect[id] || game.inv?.[id] || 0) > 0 ? '✔' : '○'} ${id}`);
    return lines;
  };

  api.breakRock = (key) => {
    game.story.flags = game.story.flags || {};
    game.story.flags['rock_' + key] = true;
    audio.sfx('explosion', { big: false });
    ui.toast('Fels zertrümmert! Geheimer Weg?');
    G.markDirty();
  };

  return api;
}
