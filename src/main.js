// Einstiegspunkt: Szenen-/Kartensystem, Eingabe, Game-Loop, Rendering, Licht, HUD.
import { buildArt, TS } from './tiles.js';
import { Pix } from './pix.js';
import { MAPS } from './maps/index.js';
import { bakeGround, buildMinimap, WATER_FRAMES } from './render.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { NPC } from './npc.js';
import { NPC_DEFS } from './npcs.js';
import { Dialog } from './dialog.js';
import { buildExtraArt } from './tiles-extra.js';
import { ITEMS, buildItemArt } from './items.js';
import { Enemy, buildEnemyArt } from './enemies.js';
import { questTalk, questMarker, QUESTS } from './quests.js';
import { UI } from './ui.js';
import { newGameState, saveGame, loadGame, clearSave } from './save.js';
import { AudioEngine, TRACK_NAMES } from './audio.js';
import { Boss, buildBossArt, BOSS_NAME, BOSS_TITLE } from './boss.js';
import { CHAPTERS, INTRO, OUTRO, CREDITS, MAIN_TITLE, storyTalk, storyMarker } from './story.js';
import { buildStoryArt } from './tiles-story.js';
import { buildArc2Art } from './tiles-arc2.js';
import { ARENA, ARENA_RESPAWN } from './maps/tiefe.js';
import { createArc2 } from './arc2.js';
import { T } from './map.js';
import { makeValueNoise, fbm } from './noise.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
const buffer = document.createElement('canvas'); // Low-Res-Puffer (1 Pixel = 1 Art-Pixel)
const bctx = buffer.getContext('2d');
const light = document.createElement('canvas'); // Dunkelheits-/Licht-Ebene
const lctx = light.getContext('2d');
const hudPlace = $('hud-place'), hudCoords = $('hud-coords'), hudPrompt = $('prompt');
const miniWrap = $('minimap'), mini = $('minimap-canvas'), mctx = mini.getContext('2d');
const areaPopup = $('area');
const dialog = new Dialog($('dialog'));

const art = buildArt();
buildExtraArt(art);
buildStoryArt(art);
buildArc2Art(art);
const itemArt = buildItemArt();
const bossArt = buildBossArt();
const audio = new AudioEngine();
const enemyArt = buildEnemyArt();
const camera = new Camera(16, 16);
const state = { visited: new Set(), scene: null, tint: 0, fade: null, armed: true, time: 0, dying: 0, respawn: false, loading: false, shake: 0 };
const params = new URLSearchParams(location.search);
if (params.get('reset')) { clearSave(); params.delete('reset'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '')); }
const saved = loadGame();
/** Spielstand: Herzen (in halben Herzen), Taler, Inventar, Ausrüstung, Quests, Welt-Flags. */
const game = newGameState();
if (saved) {
  for (const k of ['hp', 'maxHp', 'coins', 'inv', 'weapon', 'lamp', 'boots', 'hook', 'grip', 'quests', 'taken', 'opened', 'story', 'title']) if (saved[k] !== undefined && saved[k] !== null) game[k] = saved[k];
  if (!game.story || typeof game.story.ch !== 'number') game.story = { ch: 1, flags: {} }; // alter Spielstand ohne Geschichte
  if (typeof game.story.ch2 !== 'number') game.story.ch2 = 0; // Spielstand vor der zweiten Geschichte
  game.story.flags ||= {};
  for (const v of saved.visited || []) state.visited.add(v);
  state.tint = saved.tint || 0;
  if (game.hp <= 0) game.hp = game.maxHp;
}
const markers = buildMarkers();
const TINT_NAMES = ['Tag', 'Abend', 'Nacht'];

// ---------------------------------------------------------------- Szenen
const sceneCache = new Map();
function buildScene(id) {
  const t0 = performance.now();
  const map = MAPS[id]();
  const ground = bakeGround(map, art);
  const objects = map.objects.map((o) => {
    const s = art.sprites[o.sprite];
    if (!s) throw new Error('Unbekanntes Sprite: ' + o.sprite);
    const x = o.tx * TS + s.ox, y = (o.ty + o.fh) * TS + s.oy;
    return { ...o, s, x, y, w: s.w, h: s.h, sortY: (o.ty + o.fh) * TS };
  });
  const npcs = map.npcs.map((spec) => new NPC(spec, NPC_DEFS[spec.id], art.buildCharacter(NPC_DEFS[spec.id].look)));
  map.entities = npcs;
  // Nachtlichter (Laternen, Fenster) für Außenkarten
  const nightLights = [];
  for (const o of objects) {
    if (o.sprite === 'lamp') nightLights.push({ x: o.x + 6, y: o.y + 7, r: 52, color: 'rgba(255,200,110,0.55)', flicker: 0.4 });
    if (o.sprite.startsWith('house')) for (const dx of [20, 62]) nightLights.push({ x: o.x + dx, y: o.y + 54, r: 26, color: 'rgba(255,190,100,0.5)', flicker: 0.2 });
    if (o.sprite === 'lighthouse') nightLights.push({ x: o.x + 16, y: o.y + 12, r: 90, color: 'rgba(255,230,140,0.55)', flicker: 0.1 });
  }
  const scene = { id, map, ground, objects, npcs, allNpcs: npcs, nightLights, mini: buildMinimap(map), particles: [], enemies: [], drops: [], fx: [], eshots: [] };
  map.pickups = map.pickups || []; map.chests = map.chests || []; map.enemies = map.enemies || [];
  console.log(`[pixel-world] Szene ${id} (${map.W}x${map.H}) in ${(performance.now() - t0).toFixed(0)}ms`);
  return scene;
}
function getScene(id) {
  if (!sceneCache.has(id)) sceneCache.set(id, buildScene(id));
  return sceneCache.get(id);
}

const player = new Player(0, 0, art.player);
// ---------------------------------------------------------------- Spielzustand-API (Quests, UI, Items)
const deathEl = $('death');
const count = (id) => game.inv[id] || 0;
const G = {
  state: game,
  count, has: (id, n = 1) => count(id) >= n,
  toast: (t, icon) => ui.toast(t, icon),
  audio,
  sfx: (n, o, th) => audio.sfx(n, o, th),
  trackName: () => TRACK_NAMES[audio.track] || '—',
  /** Gegenstand erhalten (Taler, Herzen, Ausrüstung und Upgrades werden direkt angewendet). */
  give(id, n = 1, silent = false) {
    const d = ITEMS[id];
    if (!d) return;
    if (!silent) audio.sfx(d.type === 'coin' ? 'coin' : d.type === 'heal' ? 'heal' : 'item', {}, 0.05);
    if (d.type === 'coin') { game.coins += n; if (!silent) ui.toast(`+${n} Taler`, 'taler'); }
    else if (d.type === 'heal') { game.hp = Math.min(game.maxHp, game.hp + d.heal * n); if (!silent) ui.toast('+1 Herz', 'herz'); }
    else if (d.type === 'upgrade') G.addMaxHearts(n);
    else if (d.type === 'equip') G.equip(id);
    else {
      game.inv[id] = count(id) + n;
      if (!silent) {
        let extra = '';
        if (id === 'moorkraut' && game.quests.kraeuter === 'active') extra = ` (${Math.min(5, count(id))}/5)`;
        if (id === 'kristall' && game.quests.kristalle === 'active') extra = ` (${Math.min(3, count(id))}/3)`;
        if (id === 'eisenerz' && game.quests.klinge === 'active') extra = ` (${Math.min(3, count(id))}/3)`;
        if (id === 'wuestenrose' && game.quests.wuestenrosen === 'active') extra = ` (${Math.min(4, count(id))}/4)`;
        if (id === 'eiskristall' && game.quests.steigeisen === 'active') extra = ` (${Math.min(3, count(id))}/3)`;
        ui.toast(`+${n > 1 ? n + ' ' : ''}${d.name}${extra}`, id);
      }
    }
    G.markDirty();
  },
  take(id, n = 1) { game.inv[id] = Math.max(0, count(id) - n); if (!game.inv[id]) delete game.inv[id]; G.markDirty(); },
  addCoins(n) { G.give('taler', n); },
  addMaxHearts(n) { game.maxHp = Math.min(20, game.maxHp + 2 * n); game.hp = game.maxHp; ui.toast('Herzcontainer! +1 Herz', 'herzcontainer'); G.markDirty(); },
  healFull() { game.hp = game.maxHp; G.markDirty(); },
  equip(id) {
    const d = ITEMS[id];
    if (d.slot === 'weapon') game.weapon = id; else if (d.slot === 'lamp') game.lamp = true;
    else if (TOOL_FLAG[d.slot]) game[TOOL_FLAG[d.slot]] = true;
    applyEquipment();
    ui.toast(`Erhalten: ${d.name}`, id);
    G.markDirty();
  },
  startQuest(id) {
    if (game.quests[id]) return;
    game.quests[id] = 'active';
    ui.banner('Neue Quest', QUESTS[id].title, [], 'Details im Questlog (Q)');
    audio.sfx('questNew');
    saveNow();
  },
  completeQuest(id, rewards = []) {
    game.quests[id] = 'done';
    ui.banner('Quest abgeschlossen', QUESTS[id].title, rewards, 'Belohnung erhalten');
    audio.sfx('fanfare');
    saveNow();
  },
  useItem(id) {
    const d = ITEMS[id];
    if (!d || d.type !== 'use') { ui.toast(d ? `${d.name} kann man nicht benutzen.` : ''); return; }
    if (game.hp >= game.maxHp) { ui.toast('Du hast schon alle Herzen.'); return; }
    game.hp = Math.min(game.maxHp, game.hp + d.heal);
    G.take(id, 1);
    audio.sfx('heal');
    ui.toast(`${d.name} benutzt. ♥`, id);
  },
  buy(id) {
    const d = ITEMS[id];
    if (game.coins < d.price) { ui.toast('Nicht genug Taler!'); return; }
    if (d.type === 'equip' && game[TOOL_FLAG[d.slot]]) { ui.toast('Das hast du schon.'); return; }
    game.coins -= d.price;
    audio.sfx('buy');
    if (d.type === 'equip') { G.equip(id); ui.toast(`Gekauft: ${d.name} (−${d.price} Taler)`, id); G.markDirty(); return; }
    game.inv[id] = count(id) + 1;
    ui.toast(`Gekauft: ${d.name} (−${d.price} Taler)`, id);
    G.markDirty();
  },
  openShop() { stopInput(); ui.toggle('shop'); },
  /** Sortiment hängt vom Laden ab (Antons Krämerladen im Dorf, Nuris Basar in der Oase). */
  shopList() {
    if (state.scene.id !== 'oase_laden') return ['apfel', 'heiltrank', 'grosstrank'];
    const l = ['dattel', 'heiltrank', 'grosstrank'];
    if (!game.boots) l.push('sandlaeufer');
    if ((game.story.ch2 || 0) >= 4 && !G.has('schiffsteer') && !game.story.flags.a2_boat) l.push('schiffsteer');
    return l;
  },
  shopTitle: () => (state.scene.id === 'oase_laden' ? 'Nuris Basar' : 'Antons Krämerladen'),
  rest: () => arc2.rest(),
  visited: (id) => state.visited.has(id),
  markDirty() { state.dirty = true; },
};
const TOOL_FLAG = { boots: 'boots', hook: 'hook', grip: 'grip' };
const ui = new UI(itemArt, G);
Object.defineProperty(player, 'hp', { get: () => game.hp });
state.lastSave = 0;
function saveNow() {
  if (!state.scene) return;
  if (state.cineMode) return;
  let map = state.scene.id, x = player.x, y = player.y;
  const bc = BOSSES[map];
  if (bc && state.fight) { x = bc.respawn[0] * TS + 8; y = bc.respawn[1] * TS + 12; }
  saveGame(game, { map, x, y, dir: player.dir, visited: state.visited, tint: state.tint, settings: audio.settings });
  state.dirty = false; state.lastSave = performance.now();
}
function applyEquipment() {
  player.sword = game.weapon ? itemArt.sword[game.weapon] : null;
  player.swordLong = game.weapon === 'kristallklinge';
}

// ---------------------------------------------------------------- Truhen, Kampf, Beute
function openChest(c) {
  if (c.locked && !G.has(c.locked)) {
    dialog.show(null, `Verschlossen. Das Schlüsselloch hat die Form eines kleinen Leuchtturms.`);
    audio.sfx('clink');
    return;
  }
  if (c.locked) G.take(c.locked, 1);
  game.opened[c.key] = true;
  audio.sfx('chest');
  const names = [];
  for (const [id, n] of c.contents) { G.give(id, n); names.push(id === 'taler' ? `${n} Taler` : (n > 1 ? n + '× ' : '') + ITEMS[id].name); }
  addFx({ type: 'sparkle', x: c.tx * TS + 8, y: c.ty * TS + 2, t: 0, dur: 0.8 });
  dialog.show(null, (c.locked ? 'Der alte Schlüssel passt! ' : '') + 'Du öffnest die Truhe … ' + names.join(', ') + '!');
  saveNow();
}
let noSwordHint = 0;
function attack() {
  if (dialog.open || ui.open || state.fade || state.dying) return;
  if (!game.weapon) {
    if (performance.now() - noSwordHint > 2500) { noSwordHint = performance.now(); ui.toast('Du hast noch keine Waffe – frag Schmied Bruno!'); }
    return;
  }
  if (player.startAttack()) audio.sfx('swing', { long: game.weapon === 'kristallklinge' });
}
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function addFx(f) { state.scene.fx.push(f); }
function updateCombat(sc, dt) {
  const weapon = game.weapon && ITEMS[game.weapon];
  // Schwerttreffer
  if (player.atk && weapon) {
    const p = player.atk.t / player.atk.dur;
    if (p > 0.08 && p < 0.85) {
      const box = player.swordBox(weapon.reach);
      for (const e of sc.enemies) {
        if (player.atk.hit.has(e.uid) || !overlap(box, e.box)) continue;
        player.atk.hit.add(e.uid);
        const r = e.hurt(weapon.dmg, player.x, player.y - 6);
        if (r === 'block') { addFx({ type: 'spark', x: e.x, y: e.y - 8 - (e.alt || 0), t: 0, dur: 0.15 }); audio.sfx('clink', {}, 0.05); }
        else if (r) {
          addFx({ type: 'spark', x: e.x, y: e.y - 8 - (e.alt || 0), t: 0, dur: 0.22 });
          state.shake = 0.08;
          audio.sfx('hit', {}, 0.04);
        }
      }
      const b = sc.boss;
      if (b && state.fight && !player.atk.hit.has('boss') && overlap(box, b.box)) {
        player.atk.hit.add('boss');
        const r = b.hurt(weapon.dmg, bossEnv);
        if (r === 'hit') { addFx({ type: 'spark', x: (box.x + box.w / 2 + b.x) / 2, y: b.y - 28, t: 0, dur: 0.25 }); state.shake = Math.max(state.shake, 0.1); }
        else if (r === 'block') addFx({ type: 'spark', x: b.x, y: b.y - 28, t: 0, dur: 0.15 });
      }
    }
  }
  for (const e of sc.enemies) {
    e.update(dt, sc.map, player);
    if (!e.dead && player.inv <= 0 && player.kbt <= 0 && e.touches(player)) hurtPlayer(e.def.dmg, e);
    if (e.sfx) { audio.sfx(e.sfx, {}, 0.08); e.sfx = null; }
    if (e.out && e.out.length) { sc.eshots.push(...e.out); e.out.length = 0; }
  }
  updateShots(sc, dt);
  // Besiegte Gegner: Rauchwolke + Beute
  for (const e of sc.enemies.filter((k) => k.dead)) {
    addFx({ type: 'poof', x: e.x, y: e.y - 6 - (e.alt || 0), t: 0, dur: 0.45 });
    audio.sfx('enemyDie', {}, 0.05);
    for (const [item, chance, n] of e.def.drops) {
      if (Math.random() >= chance) continue;
      if (item === 'herz' && game.hp >= game.maxHp && Math.random() < 0.6) continue;
      sc.drops.push({ item, n, x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 6, t: 0, life: 14 });
    }
  }
  sc.enemies = sc.enemies.filter((k) => !k.dead);
}
/** Gegnergeschosse (Eissplitter): prallen an Wänden ab, das Schwert zerschlägt sie. */
function updateShots(sc, dt) {
  if (!sc.eshots.length) return;
  const sw = player.atk && game.weapon ? player.swordBox(ITEMS[game.weapon].reach) : null;
  for (const s of sc.eshots) {
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (sc.map.isSolid(Math.floor(s.x / TS), Math.floor((s.y + 6) / TS))) { s.life = 0; addFx({ type: 'spark', x: s.x, y: s.y, t: 0, dur: 0.18 }); continue; }
    if (sw && s.x > sw.x && s.x < sw.x + sw.w && s.y > sw.y && s.y < sw.y + sw.h) { s.life = 0; addFx({ type: 'spark', x: s.x, y: s.y, t: 0, dur: 0.2 }); audio.sfx('clink', {}, 0.05); continue; }
    if (player.inv <= 0 && player.kbt <= 0 && !state.dying && Math.abs(s.x - player.x) < 6 && s.y > player.y - 16 && s.y < player.y + 2) {
      s.life = 0; hurtPlayer(s.dmg || 1, { x: s.x - s.vx * 0.1, y: s.y - s.vy * 0.1 }); if (s.kind === 'ice') audio.sfx('freeze', {}, 0.1);
    }
  }
  sc.eshots = sc.eshots.filter((s) => s.life > 0);
}
function drawShots(sc) {
  for (const s of sc.eshots) {
    const x = Math.round(s.x - camera.x), y = Math.round(s.y - camera.y);
    bctx.fillStyle = 'rgba(0,0,0,0.25)'; bctx.fillRect(x - 2, y + 10, 4, 1);
    bctx.fillStyle = '#e8fbff'; bctx.fillRect(x - 1, y - 2, 3, 5); bctx.fillRect(x - 2, y - 1, 5, 3);
    bctx.fillStyle = '#7ad0f0'; bctx.fillRect(x, y - 3, 1, 7); bctx.fillRect(x - 3, y, 7, 1);
  }
}
function hurtPlayer(dmg, from) {
  game.hp = Math.max(0, game.hp - dmg);
  player.knockback(from.x, from.y);
  player.inv = 1.0;
  player.atk = null;
  state.shake = 0.15;
  ui.pulse();
  if (from instanceof Enemy) { from.state = 'retreat'; from.timer = 0.6; }
  audio.sfx('hurt', {}, 0.1);
  addFx({ type: 'hit', x: player.x, y: player.y - 10, t: 0, dur: 0.25 });
  G.markDirty();
  if (game.hp <= 0) {
    state.dying = 1.3;
    audio.sfx('death');
    stopInput();
    dialog.open && dialog.close();
    deathEl.classList.add('show');
  }
}
function updatePickups(sc, dt) {
  const px = player.x, py = player.y - 4;
  const near = (x, y) => Math.hypot(x - px, y - py) < 11;
  for (const p of sc.map.pickups) {
    if (game.taken[p.key]) continue;
    const x = p.tx * TS + 8, y = p.ty * TS + 10;
    if (!near(x, y)) continue;
    if (ITEMS[p.item].type === 'heal' && game.hp >= game.maxHp) continue;
    game.taken[p.key] = true;
    G.give(p.item, p.n);
    addFx({ type: 'sparkle', x, y: y - 6, t: 0, dur: 0.5 });
  }
  for (const d of sc.drops) {
    d.t += dt;
    if (d.t < 0.35) continue; // kurz "hüpfen", dann einsammelbar
    if (!near(d.x, d.y)) continue;
    if (ITEMS[d.item].type === 'heal' && game.hp >= game.maxHp) continue;
    d.life = 0;
    G.give(d.item, d.n);
    addFx({ type: 'sparkle', x: d.x, y: d.y - 6, t: 0, dur: 0.4 });
  }
  for (const d of sc.drops) if (d.t >= 0.35) d.life -= dt;
  sc.drops = sc.drops.filter((d) => d.life > 0);
}
function updateFx(sc, dt) {
  for (const f of sc.fx) f.t += dt;
  sc.fx = sc.fx.filter((f) => f.t < f.dur);
}
function drawFx(sc) {
  const cam = camera;
  for (const f of sc.fx) {
    if (f.t < 0) continue;
    const k = f.t / f.dur, x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
    if (f.type === 'shock') {
      bctx.strokeStyle = `rgba(${f.c || '255,140,220'},${1 - k})`; bctx.lineWidth = 2;
      bctx.beginPath(); bctx.ellipse(x, y, 6 + k * 90, 4 + k * 60, 0, 0, Math.PI * 2); bctx.stroke(); bctx.lineWidth = 1;
    } else if (f.type === 'debris') {
      bctx.fillStyle = f.c || '#6a6478';
      bctx.fillRect(Math.round(x + f.vx * f.t), Math.round(y + f.vy * f.t + 170 * f.t * f.t), 2, 2);
    } else if (f.type === 'boom') {
      const r = 2 + k * 11;
      bctx.fillStyle = `rgba(255,${Math.round(230 - k * 150)},${Math.round(200 - k * 180)},${1 - k})`;
      bctx.beginPath(); bctx.arc(x, y, r, 0, Math.PI * 2); bctx.fill();
      if (k < 0.4) { bctx.fillStyle = '#ffffff'; bctx.fillRect(x - 2, y - 2, 4, 4); }
    } else if (f.type === 'trail') {
      bctx.fillStyle = `rgba(200,90,255,${0.5 * (1 - k)})`; bctx.fillRect(x - 8, y - 10, 16, 20);
    } else if (f.type === 'poof') {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + i, r = 3 + k * 12;
        bctx.fillStyle = i % 3 ? `rgba(235,235,240,${1 - k})` : `rgba(160,160,175,${1 - k})`;
        const sz = k < 0.5 ? 2 : 1;
        bctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.8 - k * 4), sz, sz);
      }
    } else if (f.type === 'spark' || f.type === 'hit') {
      bctx.fillStyle = f.type === 'hit' ? `rgba(255,80,80,${1 - k})` : `rgba(255,255,220,${1 - k})`;
      const r = 2 + k * 7;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]]) bctx.fillRect(Math.round(x + dx * r), Math.round(y + dy * r), 1, 1);
      if (k < 0.4) bctx.fillRect(x - 1, y - 1, 3, 3);
    } else if (f.type === 'splash') {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2, r = 2 + k * 12;
        bctx.fillStyle = i % 2 ? `rgba(220,250,255,${1 - k})` : `rgba(90,200,240,${1 - k})`;
        bctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.5 - Math.sin(k * Math.PI) * 8), 2, 2);
      }
      bctx.strokeStyle = `rgba(200,245,255,${0.7 * (1 - k)})`; bctx.beginPath(); bctx.ellipse(x, y, 3 + k * 14, 1.5 + k * 6, 0, 0, Math.PI * 2); bctx.stroke();
    } else if (f.type === 'sparkle') {
      bctx.fillStyle = `rgba(255,240,150,${1 - k})`;
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + k * 2; bctx.fillRect(Math.round(x + Math.cos(a) * (3 + k * 8)), Math.round(y + Math.sin(a) * (3 + k * 8) - k * 6), 1, 1); }
    }
  }
}
function drawPickupIcon(id, x, y, time, phase = 0) {
  const cam = camera;
  const bob = Math.round(Math.sin(time / 260 + phase) * 1.5);
  const sx = Math.round(x - cam.x), sy = Math.round(y - cam.y);
  bctx.fillStyle = 'rgba(0,0,0,0.25)'; bctx.fillRect(sx - 4, sy + 2, 8, 2);
  if (id === 'taler') bctx.drawImage(itemArt.coinFrames[Math.floor(time / 120 + phase) % 4], sx - 9, sy - 14 + bob);
  else bctx.drawImage(itemArt.icons[id], sx - 9, sy - 15 + bob);
  if (ITEMS[id].type === 'quest' || ITEMS[id].type === 'material') {
    // Funkeln
    const tw = Math.floor(time / 180 + phase * 3) % 8;
    if (tw < 2) { bctx.fillStyle = 'rgba(255,255,255,0.9)'; const ox = [5, -6][tw], oy = [-12, -8][tw]; bctx.fillRect(sx + ox, sy + oy + bob, 1, 3); bctx.fillRect(sx + ox - 1, sy + oy + 1 + bob, 3, 1); }
  }
}
function drawPickups(sc, time) {
  const cam = camera;
  for (const p of sc.map.pickups) {
    if (game.taken[p.key]) continue;
    const x = p.tx * TS + 8, y = p.ty * TS + 10;
    if (!cam.visible(x - 10, y - 18, 20, 22, 4)) continue;
    drawPickupIcon(p.item, x, y, time, p.tx + p.ty);
  }
  for (const d of sc.drops) {
    if (d.life < 3 && Math.floor(d.life * 8) % 2 === 0) continue; // blinkt vor dem Verschwinden
    const hop = d.t < 0.35 ? -Math.sin((d.t / 0.35) * Math.PI) * 8 : 0;
    drawPickupIcon(d.item, d.x, d.y + hop, time, d.x);
  }
}
function buildMarkers() {
  const mk = (rows, fill) => {
    const p = new Pix(7, 11);
    rows.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') p.set(x, y, fill); else if (c === 'o') p.set(x, y, '#20161a'); }));
    return p.outlined('#20161a').canvas();
  };
  return {
    '!': mk(['.###.', '.###.', '.###.', '.###.', '..#..', '..#..', '.....', '.###.', '.###.'], '#ffe14d'),
    '?': mk(['.###.', '##.##', '...##', '..##.', '.##..', '.##..', '.....', '.##..', '.##..'], '#7ad8ff'),
    S: mk(['.###.', '#####', '.###.', '.###.', '..#..', '..#..', '.....', '.###.', '.###.'], '#ff9a3c'),
  };
}
function drawMarkers(sc, time) {
  for (const n of sc.npcs) {
    const m = storyMarker(n.id, G, game.story) || arc2.marker(n.id, sc.id) || questMarker(n.id, G);
    if (!m) continue;
    const img = markers[m];
    const bob = Math.round(Math.sin(time / 220) * 1.5);
    bctx.drawImage(img, Math.round(n.x - camera.x - img.width / 2), Math.round(n.y - camera.y - 36 + bob));
  }
}

function enterScene(id, tx, ty, dir, opts = {}) {
  const sc = getScene(id);
  state.cineMode = !!opts.silent;
  state.scene = sc;
  camera.worldW = sc.map.W * TS; camera.worldH = sc.map.H * TS;
  if (tx === undefined) { player.x = sc.map.spawn.x; player.y = sc.map.spawn.y; }
  else { player.x = tx * TS + 8; player.y = ty * TS + 12; }
  if (dir) player.dir = dir;
  player.moving = false;
  state.armed = false;
  const first = !state.visited.has(id);
  if (!opts.silent) state.visited.add(id);
  mini.width = sc.map.W; mini.height = sc.map.H;
  const k = Math.max(1, Math.floor(Math.min(192 / sc.map.W, 144 / sc.map.H)));
  mini.style.width = sc.map.W * k + 'px'; mini.style.height = sc.map.H * k + 'px';
  sc.particles = [];
  // Gegner erscheinen bei jedem Betreten neu, Beute verschwindet
  sc.enemies = sc.map.enemies.map((e) => new Enemy(e, enemyArt));
  sc.drops = []; sc.fx = []; sc.eshots = [];
  player.atk = null; player.kbt = 0;
  refreshFlags(sc);
  const bc = BOSSES[id];
  sc.boss = bc && !game.story.flags[bc.done] ? bc.make() : null;
  state.fight = false; ui.bossBar(null);
  if (bc && game.story.flags[bc.lock]) setFlag(bc.lock, false);
  arc2.onEnter(sc);
  if (!opts.silent) showArea(sc.map.name, first);
  if (state.respawn === 'arena') {
    state.respawn = false; game.hp = game.maxHp;
    ui.toast('Du rappelst dich wieder auf … Atme durch und versuch es noch einmal!', 'herz');
    deathEl.classList.remove('show');
  } else if (state.respawn) {
    state.respawn = false;
    game.hp = game.maxHp;
    const lost = Math.floor(game.coins * 0.1);
    game.coins -= lost;
    ui.toast(lost ? `Oma Hilde hat dich gesund gepflegt. (−${lost} Taler)` : 'Oma Hilde hat dich gesund gepflegt.', 'herz');
    deathEl.classList.remove('show');
  }
  if (!state.loading && !opts.silent) saveNow();
}
function goTo(id, tx, ty, dir, opts = {}) {
  if (state.fade) return;
  ui.close();
  state.fade = { phase: 'out', t: 0, target: [id, tx, ty, dir, opts], done: opts.done || null };
  for (const k in input) input[k] = false;
}
let areaTimer = null;
function showArea(name, first) {
  areaPopup.innerHTML = `<small>${first ? 'Neues Gebiet' : 'Gebiet'}</small>${name}`;
  areaPopup.classList.remove('show');
  void areaPopup.offsetWidth;
  areaPopup.classList.add('show');
  clearTimeout(areaTimer);
  areaTimer = setTimeout(() => areaPopup.classList.remove('show'), 2400);
}

// ---------------------------------------------------------------- Eingabe
const input = { up: false, down: false, left: false, right: false, run: false };
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};
let scale = 3;
window.addEventListener('pointerdown', () => audio.unlock());
window.addEventListener('keydown', (e) => {
  audio.unlock();
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (state.credits) { if (!e.repeat && ['KeyE', 'Space', 'Enter', 'Escape'].includes(e.code) && state.credits.ready) state.credits.res(); return; }
  if (state.cine && !dialog.open) {
    if (e.repeat) return;
    if (e.code === 'Escape') { state.cine.skip = true; state.cine.next && state.cine.next(); }
    else if (['KeyE', 'Space', 'Enter'].includes(e.code) && ui.cineDone()) { audio.sfx('select'); state.cine.next && state.cine.next(); }
    return;
  }
  // Fenster (Inventar/Questlog/Laden) haben Vorrang, das Spiel ist dann pausiert
  if (ui.open) { if (!e.repeat || KEYMAP[e.code]) ui.key(e.code); return; }
  if (dialog.open) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dialog.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') dialog.move(1);
    else if (!e.repeat && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) dialog.advance();
    else if (e.code === 'Escape') dialog.close();
    return;
  }
  if (state.script) return;
  const k = KEYMAP[e.code];
  if (k) { if (!state.fade) input[k] = true; return; }
  if (e.repeat) return;
  if (e.code === 'KeyN') { audio.setSettings({ music: !audio.settings.music }); ui.toast(`Musik: ${audio.settings.music ? 'an' : 'aus'}`); }
  else if (e.code === 'KeyB') { audio.setSettings({ sfx: !audio.settings.sfx }); ui.toast(`Soundeffekte: ${audio.settings.sfx ? 'an' : 'aus'}`); }
  else if (e.code === 'KeyP' || e.code === 'Escape') { stopInput(); ui.toggle('options'); }
  else if (e.code === 'KeyM') miniWrap.classList.toggle('hidden');
  else if (e.code === 'KeyT') state.tint = (state.tint + 1) % 3;
  else if (state.fade || state.dying) return;
  else if (e.code === 'KeyE' || e.code === 'Enter') interact();
  else if (e.code === 'Space') { if (findTarget()) interact(); else attack(); }
  else if (e.code === 'KeyJ') attack();
  else if (e.code === 'KeyI' || e.code === 'Tab') { stopInput(); ui.toggle('inv'); }
  else if (e.code === 'KeyQ') { stopInput(); ui.toggle('quests'); }
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') { scale = Math.min(6, scale + 1); resize(); }
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') { scale = Math.max(2, scale - 1); resize(); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });
function stopInput() { for (const k in input) input[k] = false; }
window.addEventListener('blur', stopInput);

const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
/** Was liegt vor der Figur? NPC > Tür > Schild/Objekt in der Nähe. */
function findTarget() {
  const sc = state.scene, [dx, dy] = DIRV[player.dir];
  const fx = player.x + dx * 12, fy = player.y - 4 + dy * 12;
  let best = null, bd = 22;
  for (const n of sc.npcs) {
    const d = Math.hypot(n.x - fx, n.y - 4 - fy);
    if (d < bd) { bd = d; best = { type: 'npc', npc: n }; }
  }
  if (best) return best;
  const tx = Math.floor(fx / TS), ty = Math.floor((player.y - 2 + dy * 12) / TS);
  for (const e of sc.map.exits)
    if (e.kind === 'door' && tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h) return { type: 'door', exit: e };
  for (const c of sc.map.chests) {
    if (game.opened[c.key]) continue;
    if (Math.hypot(c.tx * TS + 8 - fx, c.ty * TS + 10 - fy) < 16) return { type: 'chest', chest: c };
  }
  let it = null; bd = 26;
  for (const i of sc.map.interact) {
    const d = Math.hypot(i.x * TS + 8 - player.x, (i.y + 1) * TS - player.y);
    if (d < bd) { bd = d; it = { type: 'sign', item: i }; }
  }
  return it;
}
function interact() {
  const t = findTarget();
  if (!t) return;
  if (t.type === 'npc') {
    const n = t.npc;
    n.talking = true;
    n.facePlayer(player);
    let st = storyTalk(n.id, G, game.story);
    const s2 = arc2.talk(n.id);
    if (s2 && (s2.override || !st)) st = s2;
    else if (s2 && s2.prefix && !st.override) st = { ...st, prefix: [...s2.prefix, ...(st.prefix || [])] };
    const qt = st && st.override ? st.override : questTalk(n.id, G);
    let pages = qt ? qt.pages : n.pages(state);
    if (st && st.prefix) pages = [...st.prefix, ...pages];
    dialog.show(n.name, pages, () => { n.talking = false; if (st && st.prefix && st.onClose) st.onClose(); if (qt && qt.onClose) qt.onClose(); }, (qt && qt.choice) || null);
  } else if (t.type === 'door') { audio.sfx('door'); goTo(t.exit.to, t.exit.tx, t.exit.ty, t.exit.dir); }
  else if (t.type === 'chest') openChest(t.chest);
  else if (!(t.item.id && (storyInteract(t.item) || arc2.interact(t.item)))) dialog.show(null, t.item.text);
}

// ---------------------------------------------------------------- Größe
function resize() {
  if (innerWidth < 700) scale = Math.min(scale, 2);
  const vw = Math.ceil(innerWidth / scale / 2) * 2;
  const vh = Math.ceil(innerHeight / scale / 2) * 2;
  buffer.width = vw; buffer.height = vh;
  light.width = vw; light.height = vh;
  canvas.width = vw * scale; canvas.height = vh * scale;
  canvas.style.width = vw * scale + 'px';
  canvas.style.height = vh * scale + 'px';
  bctx.imageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  camera.resize(vw, vh);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- Partikel
function updateParticles(dt) {
  const sc = state.scene, kind = sc.map.ambience.particles, cam = camera;
  if (!kind) return;
  const P = sc.particles;
  const want = { fireflies: 36, snow: 90, dust: 40, gulls: 4, sand: 70, glitter: 40, bubbles: 30 }[kind] || 0;
  const rnd = Math.random;
  while (P.length < want) P.push({ x: cam.x + rnd() * cam.w, y: cam.y + rnd() * cam.h, vx: 0, vy: 0, ph: rnd() * 6.28, s: rnd() });
  for (const p of P) {
    p.ph += dt;
    if (kind === 'fireflies') { p.vx += (rnd() - 0.5) * 20 * dt; p.vy += (rnd() - 0.5) * 20 * dt; p.vx *= 0.98; p.vy *= 0.98; }
    else if (kind === 'snow') { p.vx = -8 - p.s * 6 + Math.sin(p.ph * 1.5) * 6; p.vy = 14 + p.s * 16; }
    else if (kind === 'dust') { p.vx = Math.sin(p.ph * 0.5 + p.s * 9) * 3; p.vy = -2 - p.s * 2; }
    else if (kind === 'gulls') { p.vx = -26 - p.s * 14; p.vy = Math.sin(p.ph) * 4; }
    else if (kind === 'sand') { p.vx = 34 + p.s * 40 + Math.sin(p.ph * 2) * 8; p.vy = Math.sin(p.ph * 1.3 + p.s * 7) * 6; }
    else if (kind === 'glitter') { p.vx = Math.sin(p.ph * 0.4 + p.s * 9) * 3; p.vy = 3 + p.s * 3; }
    else if (kind === 'bubbles') { p.vx = Math.sin(p.ph * 2 + p.s * 9) * 4; p.vy = -8 - p.s * 10; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    const m = 12;
    if (p.x < cam.x - m) p.x += cam.w + 2 * m; else if (p.x > cam.x + cam.w + m) p.x -= cam.w + 2 * m;
    if (p.y < cam.y - m) p.y += cam.h + 2 * m; else if (p.y > cam.y + cam.h + m) p.y -= cam.h + 2 * m;
  }
}
function drawParticles() {
  const sc = state.scene, kind = sc.map.ambience.particles, cam = camera;
  if (!kind) return;
  for (const p of sc.particles) {
    const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
    if (kind === 'fireflies') {
      const a = 0.35 + 0.65 * Math.max(0, Math.sin(p.ph * 2.2 + p.s * 10));
      bctx.fillStyle = `rgba(220,255,140,${a})`; bctx.fillRect(x, y, 1, 1);
      bctx.fillStyle = `rgba(200,255,120,${a * 0.25})`; bctx.fillRect(x - 1, y, 3, 1); bctx.fillRect(x, y - 1, 1, 3);
    } else if (kind === 'snow') {
      bctx.fillStyle = 'rgba(255,255,255,0.85)'; bctx.fillRect(x, y, p.s > 0.7 ? 2 : 1, p.s > 0.7 ? 2 : 1);
    } else if (kind === 'dust') {
      bctx.fillStyle = `rgba(200,190,255,${0.15 + 0.2 * Math.sin(p.ph + p.s * 5) ** 2})`; bctx.fillRect(x, y, 1, 1);
    } else if (kind === 'sand') {
      bctx.fillStyle = p.s > 0.5 ? 'rgba(240,210,150,0.55)' : 'rgba(210,170,110,0.45)'; bctx.fillRect(x, y, p.s > 0.85 ? 2 : 1, 1);
    } else if (kind === 'glitter') {
      const a = Math.max(0, Math.sin(p.ph * 3 + p.s * 20)); if (a > 0.6) { bctx.fillStyle = `rgba(220,245,255,${a})`; bctx.fillRect(x, y, 1, 1); if (a > 0.95) { bctx.fillRect(x - 1, y, 3, 1); bctx.fillRect(x, y - 1, 1, 3); } }
    } else if (kind === 'bubbles') {
      bctx.strokeStyle = `rgba(170,240,255,${0.3 + 0.3 * p.s})`; bctx.strokeRect(x + 0.5, y + 0.5, p.s > 0.7 ? 2 : 1, p.s > 0.7 ? 2 : 1);
    } else if (kind === 'gulls') {
      const flap = Math.floor(p.ph * 6 + p.s * 4) % 2;
      bctx.fillStyle = '#f4f4f0';
      bctx.fillRect(x - 2, y - flap, 2, 1); bctx.fillRect(x + 1, y - flap, 2, 1); bctx.fillRect(x, y, 1, 1);
      bctx.fillStyle = 'rgba(0,0,0,0.15)'; bctx.fillRect(x - 1, y + 14, 3, 1);
    }
  }
}

// ---------------------------------------------------------------- Rendering
function lighting(time) {
  const sc = state.scene, map = sc.map, amb = map.ambience, cam = camera;
  const outdoor = map.kind === 'outdoor';
  if (outdoor && state.tint === 1) { bctx.globalCompositeOperation = 'multiply'; bctx.fillStyle = 'rgba(255,150,90,0.5)'; bctx.fillRect(0, 0, cam.w, cam.h); }
  if (amb.tint) { bctx.globalCompositeOperation = 'multiply'; bctx.fillStyle = amb.tint; bctx.fillRect(0, 0, cam.w, cam.h); }
  bctx.globalCompositeOperation = 'source-over';
  let dark = amb.dark || 0, col = amb.darkColor || '10,16,48', pl = amb.playerLight || 0;
  const lights = map.lights.filter((l) => !l.showIf || game.story.flags[l.showIf]);
  if (sc.boss && !sc.boss.dead && sc.boss.lights) lights.push(...sc.boss.lights());
  else if (sc.boss && !sc.boss.dead) { const b = sc.boss; lights.push({ x: b.x, y: b.y - 30, r: 70 + b.eyeGlow * 20, color: b.phase === 3 ? 'rgba(255,60,90,0.5)' : 'rgba(255,80,200,0.45)', flicker: 0.6 });
    for (const pr of b.projs) lights.push({ x: pr.x, y: pr.y, r: 14, color: 'rgba(255,90,210,0.6)', flicker: 0 });
    for (const m of b.marks) lights.push({ x: m.x, y: m.y, r: 16, color: 'rgba(255,50,90,0.5)', flicker: 0 }); }
  if (outdoor && state.tint === 2) { dark = Math.max(dark, 0.62); col = amb.dark ? col : '10,16,48'; pl = Math.max(pl, 46); lights.push(...sc.nightLights); }
  if (dark <= 0) return;
  const visible = lights.filter((l) => l.x + l.r > cam.x && l.x - l.r < cam.x + cam.w && l.y + l.r > cam.y && l.y - l.r < cam.y + cam.h);
  if (pl && game.lamp && map.kind === 'cave') pl *= 1.7;
  if (pl && !state.hidePlayer) visible.push({ x: player.x, y: player.y - 8, r: pl, color: game.lamp && map.kind === 'cave' ? 'rgba(255,220,140,0.25)' : null, flicker: 0.3 });
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, cam.w, cam.h);
  lctx.fillStyle = `rgba(${col},${dark})`;
  lctx.fillRect(0, 0, cam.w, cam.h);
  lctx.globalCompositeOperation = 'destination-out';
  const radius = (l, i) => l.r * (1 + Math.sin(time / 130 + i * 1.7) * 0.04 * (l.flicker || 0) + Math.sin(time / 57 + i) * 0.02 * (l.flicker || 0));
  visible.forEach((l, i) => {
    const sx = l.x - cam.x, sy = l.y - cam.y, r = radius(l, i);
    const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g; lctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  });
  bctx.drawImage(light, 0, 0);
  bctx.globalCompositeOperation = 'lighter';
  visible.forEach((l, i) => {
    if (!l.color) return;
    const sx = l.x - cam.x, sy = l.y - cam.y, r = radius(l, i) * 0.8;
    const g = bctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, l.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    bctx.fillStyle = g; bctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  });
  bctx.globalCompositeOperation = 'source-over';
}

function render(time) {
  const sc = state.scene, cam = camera;
  const f = Math.floor(time / 280) % sc.ground.length;
  const af = Math.floor(time / 140);
  if (state.cam) camera.follow(state.cam.x, state.cam.y);
  else { const c = camFocus(); camera.follow(c.x, c.y); }
  if (state.shake > 0) { camera.x += Math.round((Math.random() - 0.5) * 3); camera.y += Math.round((Math.random() - 0.5) * 3); }
  bctx.fillStyle = sc.map.bg;
  bctx.fillRect(0, 0, cam.w, cam.h);
  bctx.drawImage(sc.ground[f], -cam.x, -cam.y);

  const list = [];
  for (const o of sc.objects) if (!o.hidden && cam.visible(o.x, o.y, o.w, o.h, 8)) list.push(o);
  for (const n of sc.npcs) list.push(n);
  for (const e of sc.enemies) if (cam.visible(e.x - 16, e.y - 32, 32, 36, 8)) list.push(e);
  if (sc.boss && !sc.boss.dead) { sc.boss.drawGround(bctx, cam, time); list.push(sc.boss); }
  if (!state.hidePlayer) list.push(player);
  drawPickups(sc, time);
  list.sort((a, b) => a.sortY - b.sortY);
  let occluded = false, afterPlayer = false;
  const pb = player.bounds;
  for (const o of list) {
    if (o === player) { player.draw(bctx, cam); afterPlayer = true; continue; }
    if (o instanceof NPC || o instanceof Enemy) { o.draw(bctx, cam); continue; }
    if (o === sc.boss) { o.draw(bctx, cam, time); continue; }
    let img = o.s.frames ? o.s.frames[af % o.s.frames.length] : o.s.canvas;
    if (o.chest && game.opened[o.chest]) img = art.sprites[o.locked ? 'chest_locked_open' : 'chest_open'].canvas;
    bctx.drawImage(img, o.x - cam.x, o.y - cam.y);
    if (afterPlayer && o.x < pb.x + pb.w && o.x + o.w > pb.x && o.y < pb.y + pb.h && o.y + o.h > pb.y) occluded = true;
  }
  if (occluded && !state.hidePlayer) player.draw(bctx, cam, 0.38);
  if (sc.boss) sc.boss.drawAir(bctx, cam);
  drawShots(sc);
  arc2.draw(bctx, cam);
  drawFx(sc);
  drawFuse(time);
  if (!state.cine) drawMarkers(sc, time);
  lighting(time);
  drawFog(sc, time);
  drawParticles();
  if (state.flash) {
    const k = state.flash.t / state.flash.dur;
    bctx.fillStyle = `rgba(${state.flash.c},${Math.max(0, 0.75 * (1 - k))})`; bctx.fillRect(0, 0, cam.w, cam.h);
  }
  if (state.dying) { bctx.fillStyle = `rgba(120,0,0,${Math.min(0.45, (1.3 - state.dying) * 0.6)})`; bctx.fillRect(0, 0, cam.w, cam.h); }
  if (state.fade) {
    const a = state.fade.phase === 'out' ? state.fade.t / 0.22 : 1 - state.fade.t / 0.22;
    bctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, a))})`;
    bctx.fillRect(0, 0, cam.w, cam.h);
  }
  ctx.drawImage(buffer, 0, 0, cam.w * scale, cam.h * scale);
}

let lastHud = '';
function updateHud() {
  const sc = state.scene, tx = player.tileX, ty = player.tileY;
  const place = sc.map.biomeAt(tx, ty);
  const timeName = sc.map.kind === 'outdoor' ? TINT_NAMES[state.tint] : sc.map.kind === 'cave' ? 'Untergrund' : 'Drinnen';
  const s = `${place}|${tx}|${ty}|${timeName}`;
  if (s !== lastHud) {
    lastHud = s;
    hudPlace.textContent = place;
    hudCoords.textContent = `X ${String(tx).padStart(2, '0')}  Y ${String(ty).padStart(2, '0')}  ·  ${timeName}`;
  }
  ui.updateHud();
  const t = !dialog.open && !state.fade && !ui.open && !state.dying && !state.script ? findTarget() : null;
  hudPrompt.classList.toggle('hidden', !t);
  if (t) hudPrompt.innerHTML = `<b>E</b> – ${t.type === 'npc' ? 'sprechen mit ' + t.npc.name : t.type === 'door' ? 'eintreten' : t.type === 'chest' ? 'Truhe öffnen' : 'ansehen'}`;
  if (!miniWrap.classList.contains('hidden')) {
    mctx.drawImage(sc.mini, 0, 0);
    mctx.strokeStyle = 'rgba(255,255,255,0.8)';
    mctx.lineWidth = 1;
    mctx.strokeRect(Math.floor(camera.x / TS) + 0.5, Math.floor(camera.y / TS) + 0.5, Math.round(camera.w / TS), Math.round(camera.h / TS));
    mctx.fillStyle = '#ff5ad1';
    for (const n of sc.npcs) mctx.fillRect(Math.floor(n.x / TS), Math.floor((n.y - 3) / TS), 1, 1);
    mctx.fillStyle = '#ff3030';
    for (const e of sc.enemies) mctx.fillRect(Math.floor(e.x / TS), Math.floor((e.y - 3) / TS), 1, 1);
    mctx.fillStyle = '#ffd23f';
    for (const c of sc.map.chests) if (!game.opened[c.key]) mctx.fillRect(c.tx, c.ty, 1, 1);
    mctx.fillStyle = '#ffe14d'; mctx.fillRect(tx - 1, ty - 1, 3, 3);
    mctx.fillStyle = '#20161a'; mctx.fillRect(tx, ty, 1, 1);
  }
}

function checkExits() {
  const sc = state.scene;
  const fx = Math.floor(player.x / TS), fy = Math.floor((player.y - 2) / TS);
  let inside = null;
  for (const e of sc.map.exits) {
    // Rand-Ausgänge: ein Tile Toleranz entlang der Kante (man rutscht sonst knapp daneben vorbei)
    const g = e.kind === 'edge' ? 1 : 0, gx = e.h === 1 ? g : 0, gy = e.w === 1 ? g : 0;
    if (fx >= e.x - gx && fx < e.x + e.w + gx && fy >= e.y - gy && fy < e.y + e.h + gy) inside = e;
  }
  if (!inside) { state.armed = true; return; }
  if (inside.need && !game.story.flags[inside.need]) {
    if (performance.now() - (state.needToast ?? -1e9) > 2500) { state.needToast = performance.now(); ui.toast(inside.needText || 'Hier geht es nicht weiter.'); audio.sfx('bonk', {}, 0.3); }
    player.x += inside.dir === 'left' ? 6 : inside.dir === 'right' ? -6 : 0; player.y += inside.dir === 'up' ? 6 : inside.dir === 'down' ? -6 : 0;
    return;
  }
  if (state.armed) { if (inside.kind === 'door') audio.sfx('door'); goTo(inside.to, inside.tx, inside.ty, inside.dir); }
}

// ---------------------------------------------------------------- Story-Flags (Objekte ein-/ausblenden)
function refreshFlags(sc) {
  const f = game.story.flags, fl = sc.objects.filter((o) => o.hideIf || o.showIf);
  const cells = (o, cb) => { for (let y = o.ty + (o.solidFrom || 0); y < o.ty + o.fh; y++) for (let x = o.tx; x < o.tx + o.fw; x++) if (sc.map.inb(x, y)) cb(sc.map.idx(x, y)); };
  // erst alle Fußabdrücke freigeben, dann sichtbare wieder blockieren (Objekte dürfen sich überlappen)
  for (const o of fl) { o.hidden = !!((o.hideIf && f[o.hideIf]) || (o.showIf && !f[o.showIf])); cells(o, (i) => { sc.map.solid[i] = 0; }); }
  for (const o of fl) if (!o.hidden) cells(o, (i) => { sc.map.solid[i] = 1; });
  // NPCs mit Bedingungen (z. B. Selma reist ab, Jan wartet an der Küste)
  sc.npcs = sc.allNpcs.filter((n) => { const sp = n.spec || {}; return !((sp.hideIf && f[sp.hideIf]) || (sp.showIf && !f[sp.showIf])); });
  sc.map.entities = sc.npcs;
}
function setFlag(k, v = true) { game.story.flags[k] = v; if (state.scene) refreshFlags(state.scene); G.markDirty(); }

// ---------------------------------------------------------------- Skript-Werkzeuge (Zwischensequenzen)
const NOINPUT = {};
const VOICE = { 'Oma Hilde': 1.25, Lina: 1.5, 'Schmied Bruno': 0.7, 'Bergmann Erwin': 0.75, 'Kräuterfrau Mira': 1.1, 'Fischer Jan': 0.85, 'Wirtin Greta': 1.15, 'Krämer Anton': 0.95, Inschrift: 0.6, 'Kartografin Selma': 1.3, 'Wirt Kadir': 0.8, 'Händlerin Nuri': 1.05, 'Eremit Frostbart': 0.6 };
const timers = [];
const wait = (s) => new Promise((r) => timers.push({ t: s, r }));
function updateTimers(dt) { for (const t of [...timers]) { t.t -= dt; if (t.t <= 0) { timers.splice(timers.indexOf(t), 1); t.r(); } } }
const say = (name, pages) => new Promise((r) => dialog.show(name, pages, () => r()));
function pan(x, y, dur) {
  return new Promise((res) => {
    const from = state.cam ? { ...state.cam } : camFocus();
    state.cam = { ...from }; state.panAnim = { from, to: { x, y }, t: 0, dur, res };
  });
}
function updatePan(dt) {
  const a = state.panAnim; if (!a) return;
  a.t += dt; const k = Math.min(1, a.t / a.dur), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
  state.cam.x = a.from.x + (a.to.x - a.from.x) * e; state.cam.y = a.from.y + (a.to.y - a.from.y) * e;
  if (k >= 1) { state.panAnim = null; a.res(); }
}
/** Normaler Kamerapunkt; im Bosskampf zwischen Spieler und Boss, damit beide im Bild bleiben. */
function camFocus() {
  const b = state.scene && state.scene.boss;
  if (state.fight && b && !b.dead) return { x: player.x * 0.6 + b.x * 0.4, y: (player.y - 10) * 0.6 + (b.y - 30) * 0.4 };
  return { x: player.x, y: player.y - 10 };
}
async function panBack(dur) { const c = camFocus(); await pan(c.x, c.y, dur); state.cam = null; }
function walkPlayer(dir, dur) { return new Promise((res) => { state.autoWalk = { dir, t: dur, res }; }); }
function autoInput(dt) {
  const a = state.autoWalk; a.t -= dt;
  if (a.t <= 0) { state.autoWalk = null; a.res(); return NOINPUT; }
  return { [a.dir]: true };
}
function fadeTo(id, tx, ty, dir, silent = false) { return new Promise((res) => goTo(id, tx, ty, dir, { silent, done: res })); }
async function runScript(fn) {
  if (state.script) return;
  state.script = true; stopInput(); ui.letterbox(true); ui.close();
  try { await fn(); } catch (e) { console.error(e); }
  finally { state.script = false; ui.letterbox(false); state.cam = null; state.panAnim = null; }
}
function spawnEnemyAt(type, x, y) {
  const tx = Math.floor(x / TS), ty = Math.floor((y - 4) / TS);
  if (state.scene.map.isSolid(tx, ty)) return null;
  const e = new Enemy({ type, x: tx, y: ty }, enemyArt);
  e.x = x; e.y = y;
  state.scene.enemies.push(e);
  addFx({ type: 'poof', x, y: y - 6, t: 0, dur: 0.5 });
  return e;
}
function drawFuse(time) {
  if (!state.fuse) return;
  const x = Math.round(state.fuse.x - camera.x), y = Math.round(state.fuse.y - camera.y);
  for (let i = 0; i < 6; i++) { bctx.fillStyle = i % 2 ? '#fff1a6' : '#ff9a3a'; bctx.fillRect(x + Math.round((Math.random() - 0.5) * 8), y + Math.round((Math.random() - 0.5) * 8), 1, 1); }
  bctx.fillStyle = '#ffffff'; bctx.fillRect(x, y, 2, 2);
}

// ---------------------------------------------------------------- Nebel (Verderbnis, bis Umbrakor fällt)
const fogTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), img = x.createImageData(128, 128), n = makeValueNoise(4242);
  for (let y = 0; y < 128; y++) for (let i = 0; i < 128; i++) {
    // kachelbares Rauschen (Mischung über die Ränder)
    const u = i / 128, v = y / 128, s = (a, b) => fbm(n, a * 4, b * 4, 3);
    const val = s(u, v) * (1 - u) * (1 - v) + s(u - 1, v) * u * (1 - v) + s(u, v - 1) * (1 - u) * v + s(u - 1, v - 1) * u * v;
    const a = Math.max(0, (val - 0.42) * 2.4);
    const k = (y * 128 + i) * 4; img.data[k] = 150; img.data[k + 1] = 70; img.data[k + 2] = 200; img.data[k + 3] = Math.min(255, a * 255);
  }
  x.putImageData(img, 0, 0); return c;
})();
let fogPat = null;
function drawFog(sc, time) {
  if (game.story.flags.boss_done) return;
  const amt = { dunkelwald: 0.42, hoehle: 0.2, tiefe: 0.3 }[sc.id];
  if (!amt) return;
  fogPat ||= bctx.createPattern(fogTex, 'repeat');
  const boost = state.fogBoost || 0;
  for (const [sp, a, off] of [[6, 1, 0], [-4, 0.7, 64]]) {
    const ox = -((camera.x + time / 1000 * sp + off) % 128) - 128, oy = -((camera.y + off * 0.5) % 128) - 128;
    bctx.save(); bctx.globalAlpha = Math.min(0.9, amt * a + boost); bctx.translate(Math.round(ox), Math.round(oy));
    bctx.fillStyle = fogPat; bctx.fillRect(0, 0, camera.w + 256, camera.h + 256); bctx.restore();
  }
}

// ---------------------------------------------------------------- Audio-Steuerung
function wantedTrack() {
  if (state.musicOverride !== undefined) return state.musicOverride;
  const sc = state.scene; if (!sc) return null;
  if (sc.boss && state.fight) return BOSSES[sc.id].music;
  const a2 = arc2.track(sc); if (a2) return a2;
  if (sc.id === 'village') return state.tint === 2 ? 'night' : 'village';
  return { dunkelwald: 'forest', berge: 'mountain', hoehle: 'cave', tiefe: 'cave', kueste: 'beach' }[sc.id] || 'tavern';
}
const SURF = { [0]: 'grass', [1]: 'grass', [2]: 'grass', [3]: 'dirt', [4]: 'sand', [7]: 'stone', [8]: 'wood', [9]: 'dirt', [10]: 'grass', [11]: 'grass', [13]: 'stone', [15]: 'snow', [16]: 'wood', [19]: 'stone', [22]: 'wood', [T.DUNE]: 'sand', [T.QSAND]: 'sand', [T.RUIN]: 'stone', [T.ICE]: 'stone', [T.TEMPLE]: 'stone' };
let lastStep = 0;
function footsteps() {
  const f = player.moving ? player.frame : 0;
  if (f && f !== lastStep) audio.sfx('step', { surface: SURF[state.scene.map.get(player.tileX, player.tileY)] || 'dirt' });
  lastStep = f;
}

// ---------------------------------------------------------------- Hauptgeschichte
function chapterBanner(n) {
  ui.banner(`Kapitel ${n}`, CHAPTERS[n].title, [], `Hauptquest „${MAIN_TITLE}“ – Ziele im Questlog (Q)`, 'chapter');
  audio.sfx('chapter');
}
function storyCheck() {
  const st = game.story;
  if (st.ch < 1 || st.ch > 4) return;
  const C = CHAPTERS[st.ch];
  if (C.steps(G, st.flags, game.quests).every((x) => x.done)) { st.ch++; chapterBanner(st.ch); saveNow(); }
}
let storyT = 0;
function storyUpdate(sc, dt) {
  storyT -= dt;
  if (storyT <= 0 && !state.script) { storyT = 0.25; storyCheck(); }
  // Arena betreten → Bosskampf
  const b = sc.boss, bc = BOSSES[sc.id];
  if (b && b.state === 'sleep' && !state.script && !state.fade && bc.trigger()) bc.intro();
  arc2.update(sc, dt);
}
function storyInteract(it) {
  const f = game.story.flags, ch = game.story.ch, q = game.quests;
  if (it.id === 'schrein') {
    if (ch === 2 && f.mira && q.kraeuter === 'done' && !f.schrein) { shrineScene(); return true; }
    if (f.boss_done) dialog.show(null, 'Der Riss im Siegelstein hat sich geschlossen. Die Rune leuchtet ruhig und blau.');
    else if (f.schrein) dialog.show(null, 'Der Siegelstein ist gesprungen. Aus dem Riss steigt noch immer feiner violetter Nebel.');
    else dialog.show(null, [it.text, ch === 2 ? 'Vielleicht weiß Kräuterfrau Mira, was es damit auf sich hat.' : 'Ein kalter Hauch weht aus dem Stein.']);
    return true;
  }
  if (it.id === 'schutt') {
    if (f.rubble) dialog.show(null, 'Reste des Gerölls. Eine alte Treppe führt hinab in den Kristallschlund.');
    else rubbleScene();
    return true;
  }
  if (it.id === 'siegel') {
    if (f.tor) dialog.show(null, 'Das zerbrochene Siegeltor. Dahinter liegt die Halle des Herzens.');
    else sealScene();
    return true;
  }
  return false;
}

async function playCine(panels) {
  state.cine = { idx: 0, panels, skip: false, next: null };
  state.hidePlayer = true; ui.close(); stopInput();
  for (let i = 0; i < panels.length && !state.cine.skip; i++) {
    const p = panels[i];
    state.cine.idx = i;
    if (state.scene.id !== p.scene) await fadeTo(p.scene, p.to[0], p.to[1], 'down', true);
    const from = { x: p.from[0] * TS + 8, y: p.from[1] * TS + 8 }, to = { x: p.to[0] * TS + 8, y: p.to[1] * TS + 8 };
    state.cam = { ...from }; state.panAnim = { from, to, t: 0, dur: 9, res: () => {} };
    ui.cine(p, i, panels.length);
    await new Promise((r) => { state.cine.next = r; });
  }
  const skipped = state.cine.skip;
  ui.cine(null); state.cine = null; state.panAnim = null; state.cam = null; state.hidePlayer = false;
  return skipped;
}
function showCredits(lines = CREDITS) {
  return new Promise((res) => {
    state.credits = { ready: false, res: () => { ui.credits(null); state.credits = null; res(); } };
    ui.credits(lines);
    setTimeout(() => { if (state.credits) state.credits.ready = true; }, 2500);
  });
}
async function introSequence() {
  state.script = true; state.musicOverride = 'forest';
  const skipped = await playCine(INTRO);
  await fadeTo('village', 57.5, 31, 'down', true);
  state.cineMode = false; state.musicOverride = undefined; state.script = false;
  game.story.ch = 1;
  if (!skipped) await linaScene();
  chapterBanner(1);
  saveNow();
}
async function linaScene() {
  await runScript(async () => {
    const lina = state.scene.npcs.find((n) => n.id === 'lina');
    if (!lina) return;
    player.dir = 'down';
    lina.x = player.x - 88; lina.y = player.y + 40; lina.state = 'idle';
    await wait(0.4);
    await lina.walkTo(player.x - 16, player.y + 40, 75);
    await lina.walkTo(player.x - 16, player.y, 75);
    lina.dir = 'right'; player.dir = 'left';
    lina.talking = true;
    await say('Lina', ['Da bist du ja! Endlich bist du wach!',
      'Hast du den Nebel über dem Dunkelwald gesehen? Ganz violett! Oma Hilde sagt, das ist ein ganz schlechtes Zeichen.',
      'Sie will dich sofort sprechen! Ihr Haus ist das mit dem grünen Dach, gleich südwestlich vom Dorfplatz. Beeil dich!']);
    lina.talking = false;
    await lina.walkTo(56 * TS + 8, player.y, 70);
  });
}
async function shrineScene() {
  await runScript(async () => {
    player.dir = 'up';
    await say(null, ['Du legst die Hand auf den Schrein. Die Rune flackert … und glüht plötzlich grell violett auf!']);
    audio.sfx('pulse'); state.shake = 0.5; state.flash = { c: '170,60,255', t: 0, dur: 0.7 };
    await wait(0.5);
    await pan(14 * TS, 26 * TS, 1.8);
    audio.sfx('pulse'); state.shake = 1.1; state.flash = { c: '170,60,255', t: 0, dur: 0.9 }; state.fogBoost = 0.35;
    await wait(1.5);
    state.fogBoost = 0;
    await panBack(1.2);
    for (const [dx, dy] of [[-44, 34], [44, 34], [0, 56]]) spawnEnemyAt('schatten', player.x + dx, player.y + dy);
    audio.sfx('summon');
    await say('Inschrift', ['»Tief unter dem Graufels schläft das Herz, das alles Licht verschlingt.',
      'Drei hüten seinen Schlaf: der Stein im Wald, das Licht im Schacht und die Klinge aus Sternenerz.«',
      'Der Siegelstein ist gesprungen! Der Nebel kommt aus der Tiefe der Kristallmine. Bergmann Erwin muss davon erfahren.']);
    setFlag('schrein');
    ui.toast('Schattenschleime steigen aus dem Moor!');
  });
}
async function rubbleScene() {
  const f = game.story.flags;
  if (!G.has('sprengpulver')) {
    dialog.show(null, f.erwin ? ['Ein Haufen Geröll versperrt den alten Weststollen. Dahinter pfeift kalter Wind herauf.', 'Mit bloßen Händen ist da nichts zu machen. Erwin hat sicher eine Idee.']
      : ['Ein Haufen Geröll versperrt einen alten Stollen. Dahinter pfeift kalter Wind … und ganz leise ein Flüstern.']);
    return;
  }
  await runScript(async () => {
    player.dir = 'left';
    await say(null, ['Du legst Erwins Sprengpulver an das Geröll und zündest die Lunte an …']);
    G.take('sprengpulver');
    state.fuse = { x: 6 * TS + 4, y: 13 * TS + 6 };
    audio.sfx('fuse');
    await walkPlayer('right', 0.5);
    player.dir = 'left';
    await wait(0.9);
    state.fuse = null;
    audio.sfx('explosion', { big: true }); state.shake = 1.0; state.flash = { c: '255,236,200', t: 0, dur: 0.5 };
    for (let i = 0; i < 16; i++) addFx({ type: 'poof', x: 6 * TS + (Math.random() - 0.5) * 34, y: 13 * TS + (Math.random() - 0.5) * 26, t: -i * 0.03, dur: 0.7 });
    for (let i = 0; i < 20; i++) addFx({ type: 'debris', x: 6 * TS, y: 12 * TS + 10, vx: (Math.random() - 0.5) * 200, vy: -60 - Math.random() * 90, t: 0, dur: 0.8, c: i % 2 ? '#746a7c' : '#564e5e' });
    setFlag('rubble');
    await wait(1.1);
    await say(null, ['Der Weg ist frei! Eine alte Treppe führt hinab in die Dunkelheit. Kalte, violette Luft weht herauf.']);
  });
}
async function sealScene() {
  if (game.weapon !== 'kristallklinge') {
    audio.sfx('clink');
    dialog.show(null, ['Ein Tor aus schwarzem Kristall. In seiner Mitte pulsiert eine Rune – im Takt eines fernen, schweren Herzens.',
      'Dein Schwert prallt funkensprühend ab. Nur eine Klinge aus Sternenerz könnte dieses Siegel brechen … Bruno!']);
    return;
  }
  await runScript(async () => {
    player.dir = 'up';
    await say(null, ['Die Kristallklinge beginnt in deiner Hand zu summen. Das Siegel antwortet mit einem dumpfen Pochen …']);
    player.startAttack(); audio.sfx('swing', { long: true });
    await wait(0.25);
    audio.sfx('gate'); state.shake = 1.2; state.flash = { c: '200,120,255', t: 0, dur: 0.9 };
    for (let i = 0; i < 12; i++) addFx({ type: 'sparkle', x: 14 * TS + Math.random() * 64, y: 20 * TS + Math.random() * 30, t: -i * 0.05, dur: 0.8 });
    await wait(0.6);
    setFlag('tor');
    for (let i = 0; i < 10; i++) addFx({ type: 'poof', x: 14 * TS + Math.random() * 64, y: 21 * TS + 8, t: -i * 0.04, dur: 0.6 });
    await wait(0.9);
    const b = state.scene.boss;
    if (b) { await pan(b.x, b.y - 30, 1.5); await wait(0.8); }
    await say(null, ['Das Siegel zerbricht! Dahinter, in einer runden Halle, schwebt etwas Riesiges. Es pocht. Langsam. Schwer.']);
    await panBack(1.0);
  });
}
async function bossIntro() {
  await runScript(async () => {
    const b = state.scene.boss, first = !game.story.flags.boss_seen;
    setFlag('arena_lock'); audio.sfx('thud'); state.shake = 0.5;
    for (let i = 0; i < 8; i++) addFx({ type: 'poof', x: 14 * TS + Math.random() * 64, y: 21 * TS + 6, t: -i * 0.03, dur: 0.5 });
    state.musicOverride = null;
    await wait(0.5);
    await pan(b.x, b.y - 30, first ? 1.4 : 0.6);
    await wait(first ? 0.6 : 0.2);
    b.state = 'intro'; b.eyeOpen = 1; b.eyeGlow = 1;
    audio.sfx('roar'); state.shake = 1.3; state.flash = { c: '255,60,140', t: 0, dur: 0.6 };
    ui.banner('Endgegner', BOSS_NAME, [], BOSS_TITLE, 'boss');
    state.fight = true; ui.bossBar(b, BOSS_NAME, BOSS_TITLE);
    await wait(first ? 1.6 : 0.8);
    await panBack(first ? 0.8 : 0.4);
    setFlag('boss_seen');
    state.musicOverride = undefined;
    b.wake();
  });
}
const bossEnv = {
  get player() { return player; },
  get map() { return state.scene.map; },
  sfx: (n, o, th) => audio.sfx(n, o, th),
  shake: (s) => { state.shake = Math.max(state.shake, s); },
  fx: (f) => addFx(f),
  canHurt: () => player.inv <= 0 && player.kbt <= 0 && !state.dying && !state.script,
  hurt: (dmg, from) => hurtPlayer(dmg, from),
  swordBox: () => (player.atk && game.weapon ? player.swordBox(ITEMS[game.weapon].reach) : null),
  minions: () => state.scene.enemies.length,
  spawn: (type, x, y) => spawnEnemyAt(type, x, y),
  onPhase: (n) => {
    state.flash = { c: '255,120,220', t: 0, dur: 0.6 };
    BOSSES[state.scene.id].onPhase(n);
  },
  onStun: () => { const bc = BOSSES[state.scene.id]; if (bc.onStun) bc.onStun(); },
  scripted: () => !!state.script,
  onDying: () => { for (const e of state.scene.enemies) addFx({ type: 'poof', x: e.x, y: e.y - 6, t: 0, dur: 0.45 }); state.scene.enemies = []; state.scene.eshots = []; },
  onDefeated: () => BOSSES[state.scene.id].defeated(),
};
/** Boss-Register: je Karte Erzeugung, Flags (besiegt / Arena verschlossen), Auslöser, Musik, Texte. */
const BOSSES = {
  tiefe: {
    name: BOSS_NAME, title: BOSS_TITLE, music: 'boss', done: 'boss_done', lock: 'arena_lock', respawn: ARENA_RESPAWN,
    make: () => new Boss(ARENA.cx, ARENA.cy - 6, bossArt, ARENA),
    trigger: () => game.story.flags.tor && game.story.ch >= 5 && player.y < 19.6 * TS,
    intro: () => bossIntro(),
    onPhase: (n) => ui.banner(`Phase ${n}`, n === 2 ? 'Der Panzer bricht!' : 'Umbrakor rast!', [], n === 2 ? 'Achtung: Kristallstacheln und Schattenschleime' : 'Splitterspiralen! Schlag die Splitter mit dem Schwert weg.', 'boss'),
    defeated: () => bossDefeated(),
  },
};
async function bossDefeated() {
  state.fight = false;
  await runScript(async () => {
    state.flash = { c: '255,255,255', t: 0, dur: 1.8 }; audio.sfx('explosion', { big: true }); state.shake = 1.4;
    for (let i = 0; i < 24; i++) addFx({ type: 'debris', x: ARENA.cx, y: ARENA.cy - 30, vx: Math.cos(i) * (60 + (i % 5) * 30), vy: Math.sin(i) * 50 - 60, t: 0, dur: 1.0, c: i % 2 ? '#d9bcff' : '#ff8ae0' });
    ui.bossBar(null);
    setFlag('boss_done'); setFlag('arena_lock', false);
    state.musicOverride = 'ending';
    await wait(1.8);
    G.addMaxHearts(1); game.coins += 100; G.give('kristallherz', 1, true); game.title = 'Held von Pixeldorf';
    audio.sfx('fanfare');
    await say(null, ['Umbrakor zerspringt in tausend Splitter. Ein einziger blauer Splitter bleibt warm in deiner Hand liegen.',
      'Erhalten: Herzcontainer, 100 Taler und der Titel „Held von Pixeldorf“.']);
  });
  state.script = true;
  await playCine(OUTRO);
  await showCredits();
  game.story.ch = 6;
  await fadeTo('village', 57.5, 32, 'down');
  state.cineMode = false; state.script = false; state.musicOverride = undefined;
  ui.banner('Hauptquest abgeschlossen', MAIN_TITLE, ['Herzcontainer', '100 Taler', 'Titel: Held von Pixeldorf'], 'Freies Spiel – die Welt gehört dir!', 'chapter');
  audio.sfx('fanfare');
  saveNow();
}

// ---------------------------------------------------------------- Zweite Geschichte
const arc2 = createArc2({
  G, game, state, player, ui, audio, dialog,
  runScript, wait, say, pan, panBack, walkPlayer, fadeTo, playCine, showCredits, spawnEnemyAt, addFx, setFlag, saveNow, getScene, hurtPlayer,
  shake: (s) => { state.shake = Math.max(state.shake, s); },
});
for (const [id, cfg] of Object.entries(arc2.bosses)) BOSSES[id] = { ...cfg, intro: () => arc2.bossIntro(cfg) };

// ---------------------------------------------------------------- Loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time = now;
  const sc = state.scene;
  if (state.fade) {
    state.fade.t += dt;
    if (state.fade.phase === 'out' && state.fade.t >= 0.22) { enterScene(...state.fade.target); state.fade = { phase: 'in', t: 0, done: state.fade.done }; }
    else if (state.fade.phase === 'in' && state.fade.t >= 0.22) { const d = state.fade.done; state.fade = null; if (d) d(); }
  } else if (state.dying) {
    state.dying -= dt;
    player.moving = false;
    updateFx(sc, dt);
    if (state.dying <= 0) {
      state.dying = 0; player.inv = 0;
      const bc = BOSSES[sc.id];
      if (bc && (sc.id === 'tiefe' || state.fight)) { state.respawn = 'arena'; goTo(sc.id, bc.respawn[0], bc.respawn[1], 'up'); }
      else { state.respawn = true; goTo('village', 57.5, 32, 'down'); }
    }
  } else if (!ui.open) {
    updateTimers(dt); updatePan(dt);
    const inp = state.autoWalk ? autoInput(dt) : state.script || state.cine ? NOINPUT : input;
    if (!dialog.open && !state.cine) player.update(dt, inp, sc.map);
    else player.moving = false;
    for (const n of sc.npcs) n.update(dt, sc.map, player);
    if (!dialog.open && !state.cine) {
      if (!state.script) { updateCombat(sc, dt); updatePickups(sc, dt); checkExits(); }
      if (sc.boss) { sc.boss.target = player; if (!state.script || sc.boss.state === 'dying') sc.boss.update(dt, bossEnv); }
      if (sc.boss && state.fight) ui.bossBar(sc.boss, BOSSES[sc.id].name, BOSSES[sc.id].title);
      storyUpdate(sc, dt);
    }
    updateFx(sc, dt);
    footsteps();
  }
  if (state.flash) { state.flash.t += dt; if (state.flash.t >= state.flash.dur) state.flash = null; }
  if (state.cine && ui.cineTick(dt)) audio.sfx('blip', { pitch: 0.8 }, 0.03);
  const want = wantedTrack();
  if (want !== audio.track) audio.music(want);
  state.shake = Math.max(0, state.shake - dt);
  if (state.dirty && now - state.lastSave > 1500 && !state.fade) saveNow();
  dialog.update(dt);
  updateParticles(dt);
  render(now);
  updateHud();
  requestAnimationFrame(frame);
}

state.loading = true;
const startMap = params.get('map') && MAPS[params.get('map')] ? params.get('map') : null;
if (startMap) enterScene(startMap);
else if (saved && MAPS[saved.map]) { enterScene(saved.map); player.x = saved.x; player.y = saved.y; player.dir = saved.dir || 'down'; }
else enterScene('village');
state.loading = false;
applyEquipment();
ui.updateHud();
dialog.onBlip = (name) => audio.sfx('blip', { pitch: VOICE[name] || 1 }, 0.02);
dialog.onSelect = () => audio.sfx('select');
if (saved) ui.toast('Spielstand geladen.');
if (game.story.ch === 0) {
  if (params.get('nointro')) { game.story.ch = 1; chapterBanner(1); }
  else introSequence();
} else if (!saved) ui.toast('Neue Quest: ' + QUESTS.schwert.title);
requestAnimationFrame(frame);

// Debug-/Test-Hooks
window.__game = {
  player, camera, art, input, state, dialog,
  get scene() { return state.scene; },
  get sceneId() { return state.scene.id; },
  get world() { return state.scene.map; },
  get scale() { return scale; },
  get fading() { return !!state.fade; },
  ready: true,
  teleport(tx, ty, dir) { player.x = tx * TS + 8; player.y = ty * TS + 12; if (dir) player.dir = dir; player.kbt = 0; player.kbx = player.kby = 0; },
  goTo(id, tx, ty, dir) { goTo(id, tx, ty, dir); },
  interact, attack, game, G, ui,
  get enemies() { return state.scene.enemies; },
  get drops() { return state.scene.drops; },
  get dying() { return state.dying > 0; },
  save: () => saveNow(),
  audio, bossEnv,
  get story() { return game.story; },
  get boss() { return state.scene.boss; },
  get fight() { return !!state.fight; },
  get script() { return !!state.script; },
  get cine() { return state.cine ? { idx: state.cine.idx, total: state.cine.panels.length } : null; },
  get credits() { return !!state.credits; },
  get wantedTrack() { return wantedTrack(); },
  setStory(ch, flags = {}) { game.story.ch = ch; Object.assign(game.story.flags, flags); refreshFlags(state.scene); saveNow(); },
  setFlag, storyCheck, arc2,
  setStory2(ch2, flags = {}) { game.story.ch2 = ch2; Object.assign(game.story.flags, flags); refreshFlags(state.scene); saveNow(); },
  get bossConfig() { return BOSSES[state.scene.id] || null; },
  fullMapDataURL(id) {
    const sc = id ? getScene(id) : state.scene;
    refreshFlags(sc);
    const c = document.createElement('canvas');
    c.width = sc.map.W * TS; c.height = sc.map.H * TS;
    const x = c.getContext('2d');
    x.drawImage(sc.ground[0], 0, 0);
    const list = sc.objects.filter((o) => !o.hidden).sort((a, b) => a.sortY - b.sortY);
    for (const o of list) x.drawImage(o.s.canvas, o.x, o.y);
    for (const n of sc.npcs) n.draw(x, { x: 0, y: 0 });
    return c.toDataURL('image/png');
  },
};
