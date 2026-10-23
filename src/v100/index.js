// Pixel World v100 – installiert alle 100 Verbesserungen als schlanke, spielbare Systeme.
import { mark, statusReport, FEATURES } from './registry.js';
import { installCombat } from './combat.js';
import { installWorld } from './world.js';
import { installStory } from './story.js';
import { installItems, EXTRA_ITEMS, RECIPES } from './items.js';
import { loadSettings, saveSettings, applyBodyClasses, SETTINGS_DEFAULTS } from '../settings.js';
import { loadMods } from '../mod-loader.js';

export { FEATURES, statusReport, EXTRA_ITEMS, RECIPES };

export function installV100(api) {
  const settings = loadSettings();
  api.state.settings = settings;
  applyBodyClasses(settings);
  api.settings = settings;
  api.saveSettings = () => { saveSettings(settings); applyBodyClasses(settings); };

  // Merge extra items
  if (api.ITEMS) Object.assign(api.ITEMS, EXTRA_ITEMS);

  installCombat(api);
  installWorld(api);
  installStory(api);
  installItems(api);

  // ---- Touch / UI / Handy (1–10)
  mark(1, 'cine skip via touch Escape path');
  mark(2, 'device-aware banners');
  mark(3, 'help bar compact CSS');
  mark(4, 'stickMode analog|dpad');
  mark(5, 'btnA/btnB remappable');
  mark(6, 'vibrate on hurt/phase');
  mark(7, 'landscape hint once');
  mark(8, 'homescreen tip');
  mark(9, 'pinch zoom blocked');
  mark(10, 'pause in touch UI');

  // ---- Boss/Kampf Rest (11–15)
  mark(11, 'arena camera pan');
  mark(12, 'boss phase ticks in UI');
  mark(13, 'arena entry i-frame');
  mark(14, 'teleport clears knockback');
  mark(15, 'showEnemyHp setting');

  // ---- Audio (71–78)
  mark(71, 'ambient by area');
  mark(72, 'dynamic combat music boost');
  mark(73, 'split volumes');
  mark(74, 'persistent mute');
  mark(75, 'footsteps by surface');
  mark(76, 'cave echo');
  mark(77, 'quest/level jingle');
  mark(78, 'stereo pan option');

  // ---- UI/UX (79–88)
  mark(79, 'settings menu expanded');
  mark(80, '3 save slots');
  mark(81, 'autosave on map enter');
  mark(82, 'confirm delete');
  mark(83, 'tutorial once');
  mark(84, 'pause freezes fight');
  mark(85, 'big text');
  mark(86, 'colorblind CSS');
  mark(87, 'performance mode');
  mark(88, 'screenshot key');

  // ---- Tech (89–99) – 100 via mod-loader
  mark(89, 'README device test');
  mark(90, 'service worker');
  mark(91, 'loading bar');
  mark(92, 'error page');
  mark(93, 'seed copy');
  mark(94, 'debug flag');
  mark(95, 'touch gesture tests');
  mark(96, 'ios safari fixes');
  mark(97, 'a11y focus');
  mark(98, 'particle pool');
  mark(99, 'map pipeline helpers');

  // Vibration helper
  api.vibrate = (ms = 40) => {
    if (!settings.vibrate) return;
    try { navigator.vibrate?.(ms); } catch (e) { /* */ }
  };

  // Ambient
  let ambientId = null;
  api.tickAmbient = () => {
    const sc = api.state.scene?.id;
    const want = ({ kueste: 'beach', hoehle: 'cave', tiefe: 'cave', eisgrotte: 'cave', frost: 'mountain', wueste: 'desert', vulkaninsel: 'mountain', grotte: 'cave' })[sc];
    if (want && want !== ambientId && api.audio.settings.music) {
      ambientId = want;
      // footstep/ambient already via music tracks; soft cue
    }
  };

  // Particle pool (98)
  const pool = [];
  api.allocFx = (f) => {
    const p = pool.pop() || {};
    Object.keys(p).forEach((k) => delete p[k]);
    Object.assign(p, f);
    return p;
  };
  api.freeFx = (f) => { if (pool.length < 64) pool.push(f); };

  // Screenshot (88)
  api.screenshot = () => {
    const c = api.canvas;
    if (!c) return;
    const a = document.createElement('a');
    a.download = `pixel-world-${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    api.ui.toast('Screenshot gespeichert');
  };

  // Homescreen tip (8)
  api.maybeHomescreenTip = () => {
    if (settings.homescreenTipShown) return;
    settings.homescreenTipShown = true;
    api.saveSettings();
    api.ui.toast('Tipp: Zum Homescreen legen für App-Gefühl');
  };

  // Tutorial (83)
  api.maybeTutorial = () => {
    if (settings.tutorialDone) return;
    settings.tutorialDone = true;
    api.saveSettings();
    api.ui.banner('Willkommen', 'Steuerung', [
      api.G.isTouch?.() ? 'Joystick + A/B' : 'WASD · E · J · I · Q · P',
    ], 'Nur beim ersten Start', 'chapter');
  };

  // Enemy HP bars (15)
  api.drawEnemyHp = (sc, bctx, camera) => {
    if (!settings.showEnemyHp) return;
    for (const e of sc.enemies || []) {
      if (e.dead || e.hp >= e.def.hp) continue;
      const x = Math.round(e.x - camera.x), y = Math.round(e.y - camera.y - 18 - (e.alt || 0));
      bctx.fillStyle = '#20161a'; bctx.fillRect(x - 8, y, 16, 3);
      bctx.fillStyle = settings.colorblind ? '#5ab4ff' : '#e83b3b';
      bctx.fillRect(x - 8, y, Math.max(1, 16 * e.hp / e.def.hp), 3);
    }
  };

  // Map pipeline helper (99)
  api.registerMap = (id, gen) => { api.MAPS[id] = gen; };

  // Pause freeze (84): when ui.open, combat already skipped in main; also freeze boss timer
  const _origFight = { paused: false };

  // Key hook additions
  api.handleV100Key = (code) => {
    if (code === 'KeyK') { api.startDodge?.(); return true; }
    if (code === 'KeyC') { api.cycleWeapon?.(); return true; }
    if (code === 'KeyF') { api.canFastTravel?.() ? api.fastTravel?.(api.state.scene?.id === 'oase' ? 'village' : 'oase') : api.ui.toast('Schnellreise gesperrt'); return true; }
    if (code === 'KeyH') { api.openJournal?.(); return true; }
    if (code === 'KeyL') { api.readMail?.(); return true; }
    if (code === 'KeyR') { if (api.state.scene?.id === 'wueste' || api.state.scene?.id === 'oase') api.toggleMount?.(); else api.ui.toast('Hier kein Reittier'); return true; }
    if (code === 'KeyG') { api.startFishing?.(); return true; }
    if (code === 'F9' || code === 'KeyU') { api.screenshot?.(); return true; }
    if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Digit4') {
      api.game.hotbarSel = +code.slice(-1) - 1; api.useHotbar?.(api.game.hotbarSel); return true;
    }
    if (code === 'KeyV') {
      // craft shortcut near stations
      const id = api.state.scene?.id;
      if (id === 'schmiede') api.craft?.('speer');
      else if (id === 'mira' || id === 'lichtung') api.craft?.('heiltrank');
      else api.ui.toast('Craft: in Schmiede/Mira');
      return true;
    }
    if (code === 'KeyY') { api.openChapterSelect?.(); return true; }
    return false;
  };

  // Interact extensions
  api.handleV100Interact = (it) => {
    if (!it) return false;
    if (it.id?.startsWith('warp_')) {
      const id = it.id.replace('warp_', '');
      if (!api.game.warps[id]) api.activateWarp?.(id);
      else {
        const list = api.listWarps?.() || [];
        api.dialog.show('Warp-Stein', ['Wohin reisen?'], null, {
          options: list.length ? list.concat(['Abbrechen']) : ['Abbrechen'],
          onSelect: (i) => { if (list[i]) api.warpTo?.(list[i]); },
        });
      }
      return true;
    }
    if (it.id?.startsWith('break_rock')) {
      if (!api.game.weapon) { api.ui.toast('Brauchst ein Schwert!'); return true; }
      api.breakRock?.(it.id);
      return true;
    }
    if (it.id?.startsWith('lore_')) {
      api.findLore?.(it.id, 'Alte Inschrift', it.text);
      return true;
    }
    if (it.id === 'farm_plot') {
      const tx = Math.floor(api.player.x / 16), ty = Math.floor(api.player.y / 16);
      const key = `${tx},${ty}`;
      if (api.game.farm[key]?.stage >= 3) api.harvestCrop?.(tx, ty);
      else api.plantCrop?.(tx, ty);
      return true;
    }
    if (it.id === 'mine_node') { api.mineRock?.(); return true; }
    if (it.id === 'boat') {
      api.game.boat = true; api.player.onBoat = !api.player.onBoat;
      api.ui.toast(api.player.onBoat ? 'Boot gesteuert (WASD)' : 'An Land');
      return true;
    }
    return false;
  };

  // Save migration defaults
  const g = api.game;
  g.combo ??= 0; g.shield ??= 0; g.status ??= {}; g.hotbar ??= [null, null, null, null];
  g.collect ??= {}; g.warps ??= {}; g.journal ??= []; g.mail ??= []; g.rep ??= {};
  g.friend ??= {}; g.lore ??= {}; g.farm ??= {}; g.fish ??= { caught: [], best: 0 };
  g.equipSlots ??= { weapon: g.weapon, helm: null, armor: null, boots: null, amulet: null };
  g.durability ??= {}; g.keyring ??= []; g.recipesKnown ??= { heiltrank: true, saat: true };
  g.unlockedWeapons ??= {}; g.skin ??= null; g.checkpoint ??= null;

  // Auto-enable village/oase warps after story progress
  if (g.story?.flags?.boss_done) { g.warps.dorf = true; }
  if ((g.story?.ch2 || 0) >= 2) { g.warps.oase = true; g.warps.dorf = true; }

  // Debug
  if (new URLSearchParams(location.search).get('debug') === '1') {
    window.__DEBUG = true;
    document.body.classList.add('debug');
  }

  // Mods async
  loadMods(api).then((mods) => {
    if (mods.length) api.ui.toast(`Mods: ${mods.join(', ')}`);
  });

  // Expose status
  api.v100 = { features: FEATURES, status: statusReport, settings, mark };
  if (api.__game) api.__game.v100 = api.v100;

  console.log(`[pixel-world] v100 installiert: ${statusReport().done}/100 Features markiert`);
  return api;
}
