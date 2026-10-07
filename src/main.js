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
const itemArt = buildItemArt();
const enemyArt = buildEnemyArt();
const camera = new Camera(16, 16);
const state = { visited: new Set(), scene: null, tint: 0, fade: null, armed: true, time: 0, dying: 0, respawn: false, loading: false, shake: 0 };
const params = new URLSearchParams(location.search);
if (params.get('reset')) { clearSave(); params.delete('reset'); history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params : '')); }
const saved = loadGame();
/** Spielstand: Herzen (in halben Herzen), Taler, Inventar, Ausrüstung, Quests, Welt-Flags. */
const game = newGameState();
if (saved) {
  for (const k of ['hp', 'maxHp', 'coins', 'inv', 'weapon', 'lamp', 'quests', 'taken', 'opened']) if (saved[k] !== undefined) game[k] = saved[k];
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
  const scene = { id, map, ground, objects, npcs, nightLights, mini: buildMinimap(map), particles: [], enemies: [], drops: [], fx: [] };
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
  /** Gegenstand erhalten (Taler, Herzen, Ausrüstung und Upgrades werden direkt angewendet). */
  give(id, n = 1, silent = false) {
    const d = ITEMS[id];
    if (!d) return;
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
    applyEquipment();
    ui.toast(`Erhalten: ${d.name}`, id);
    G.markDirty();
  },
  startQuest(id) {
    if (game.quests[id]) return;
    game.quests[id] = 'active';
    ui.banner('Neue Quest', QUESTS[id].title, [], 'Details im Questlog (Q)');
    saveNow();
  },
  completeQuest(id, rewards = []) {
    game.quests[id] = 'done';
    ui.banner('Quest abgeschlossen', QUESTS[id].title, rewards, 'Belohnung erhalten');
    saveNow();
  },
  useItem(id) {
    const d = ITEMS[id];
    if (!d || d.type !== 'use') { ui.toast(d ? `${d.name} kann man nicht benutzen.` : ''); return; }
    if (game.hp >= game.maxHp) { ui.toast('Du hast schon alle Herzen.'); return; }
    game.hp = Math.min(game.maxHp, game.hp + d.heal);
    G.take(id, 1);
    ui.toast(`${d.name} benutzt. ♥`, id);
  },
  buy(id) {
    const d = ITEMS[id];
    if (game.coins < d.price) { ui.toast('Nicht genug Taler!'); return; }
    game.coins -= d.price;
    game.inv[id] = count(id) + 1;
    ui.toast(`Gekauft: ${d.name} (−${d.price} Taler)`, id);
    G.markDirty();
  },
  openShop() { stopInput(); ui.toggle('shop'); },
  markDirty() { state.dirty = true; },
};
const ui = new UI(itemArt, G);
Object.defineProperty(player, 'hp', { get: () => game.hp });
state.lastSave = 0;
function saveNow() {
  if (!state.scene) return;
  saveGame(game, { map: state.scene.id, x: player.x, y: player.y, dir: player.dir, visited: state.visited, tint: state.tint });
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
    return;
  }
  if (c.locked) G.take(c.locked, 1);
  game.opened[c.key] = true;
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
  player.startAttack();
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
        if (e.hurt(weapon.dmg, player.x, player.y - 6)) {
          addFx({ type: 'spark', x: e.x, y: e.y - 8 - (e.alt || 0), t: 0, dur: 0.22 });
          state.shake = 0.08;
        }
      }
    }
  }
  for (const e of sc.enemies) {
    e.update(dt, sc.map, player);
    if (!e.dead && player.inv <= 0 && player.kbt <= 0 && e.touches(player)) hurtPlayer(e.def.dmg, e);
  }
  // Besiegte Gegner: Rauchwolke + Beute
  for (const e of sc.enemies.filter((k) => k.dead)) {
    addFx({ type: 'poof', x: e.x, y: e.y - 6 - (e.alt || 0), t: 0, dur: 0.45 });
    for (const [item, chance, n] of e.def.drops) {
      if (Math.random() >= chance) continue;
      if (item === 'herz' && game.hp >= game.maxHp && Math.random() < 0.6) continue;
      sc.drops.push({ item, n, x: e.x + (Math.random() - 0.5) * 10, y: e.y + (Math.random() - 0.5) * 6, t: 0, life: 14 });
    }
  }
  sc.enemies = sc.enemies.filter((k) => !k.dead);
}
function hurtPlayer(dmg, from) {
  game.hp = Math.max(0, game.hp - dmg);
  player.knockback(from.x, from.y);
  player.inv = 1.0;
  player.atk = null;
  state.shake = 0.15;
  ui.pulse();
  from.state = 'retreat'; from.timer = 0.6;
  addFx({ type: 'hit', x: player.x, y: player.y - 10, t: 0, dur: 0.25 });
  G.markDirty();
  if (game.hp <= 0) {
    state.dying = 1.3;
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
    const k = f.t / f.dur, x = Math.round(f.x - cam.x), y = Math.round(f.y - cam.y);
    if (f.type === 'poof') {
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
  };
}
function drawMarkers(sc, time) {
  for (const n of sc.npcs) {
    const m = questMarker(n.id, G);
    if (!m) continue;
    const img = markers[m];
    const bob = Math.round(Math.sin(time / 220) * 1.5);
    bctx.drawImage(img, Math.round(n.x - camera.x - img.width / 2), Math.round(n.y - camera.y - 36 + bob));
  }
}

function enterScene(id, tx, ty, dir) {
  const sc = getScene(id);
  state.scene = sc;
  camera.worldW = sc.map.W * TS; camera.worldH = sc.map.H * TS;
  if (tx === undefined) { player.x = sc.map.spawn.x; player.y = sc.map.spawn.y; }
  else { player.x = tx * TS + 8; player.y = ty * TS + 12; }
  if (dir) player.dir = dir;
  player.moving = false;
  state.armed = false;
  const first = !state.visited.has(id);
  state.visited.add(id);
  mini.width = sc.map.W; mini.height = sc.map.H;
  const k = Math.max(1, Math.floor(Math.min(192 / sc.map.W, 144 / sc.map.H)));
  mini.style.width = sc.map.W * k + 'px'; mini.style.height = sc.map.H * k + 'px';
  sc.particles = [];
  // Gegner erscheinen bei jedem Betreten neu, Beute verschwindet
  sc.enemies = sc.map.enemies.map((e) => new Enemy(e, enemyArt));
  sc.drops = []; sc.fx = [];
  player.atk = null; player.kbt = 0;
  showArea(sc.map.name, first);
  if (state.respawn) {
    state.respawn = false;
    game.hp = game.maxHp;
    const lost = Math.floor(game.coins * 0.1);
    game.coins -= lost;
    ui.toast(lost ? `Oma Hilde hat dich gesund gepflegt. (−${lost} Taler)` : 'Oma Hilde hat dich gesund gepflegt.', 'herz');
    deathEl.classList.remove('show');
  }
  if (!state.loading) saveNow();
}
function goTo(id, tx, ty, dir) {
  if (state.fade) return;
  ui.close();
  state.fade = { phase: 'out', t: 0, target: [id, tx, ty, dir] };
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
window.addEventListener('keydown', (e) => {
  if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  // Fenster (Inventar/Questlog/Laden) haben Vorrang, das Spiel ist dann pausiert
  if (ui.open) { if (!e.repeat || KEYMAP[e.code]) ui.key(e.code); return; }
  if (dialog.open) {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') dialog.move(-1);
    else if (e.code === 'ArrowDown' || e.code === 'KeyS') dialog.move(1);
    else if (!e.repeat && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) dialog.advance();
    else if (e.code === 'Escape') dialog.close();
    return;
  }
  const k = KEYMAP[e.code];
  if (k) { if (!state.fade) input[k] = true; return; }
  if (e.repeat) return;
  if (e.code === 'KeyM') miniWrap.classList.toggle('hidden');
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
    const qt = questTalk(n.id, G);
    if (qt) dialog.show(n.name, qt.pages, () => { n.talking = false; if (qt.onClose) qt.onClose(); }, qt.choice || null);
    else dialog.show(n.name, n.pages(state), () => { n.talking = false; });
  } else if (t.type === 'door') goTo(t.exit.to, t.exit.tx, t.exit.ty, t.exit.dir);
  else if (t.type === 'chest') openChest(t.chest);
  else dialog.show(null, t.item.text);
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
  const want = { fireflies: 36, snow: 90, dust: 40, gulls: 4 }[kind] || 0;
  const rnd = Math.random;
  while (P.length < want) P.push({ x: cam.x + rnd() * cam.w, y: cam.y + rnd() * cam.h, vx: 0, vy: 0, ph: rnd() * 6.28, s: rnd() });
  for (const p of P) {
    p.ph += dt;
    if (kind === 'fireflies') { p.vx += (rnd() - 0.5) * 20 * dt; p.vy += (rnd() - 0.5) * 20 * dt; p.vx *= 0.98; p.vy *= 0.98; }
    else if (kind === 'snow') { p.vx = -8 - p.s * 6 + Math.sin(p.ph * 1.5) * 6; p.vy = 14 + p.s * 16; }
    else if (kind === 'dust') { p.vx = Math.sin(p.ph * 0.5 + p.s * 9) * 3; p.vy = -2 - p.s * 2; }
    else if (kind === 'gulls') { p.vx = -26 - p.s * 14; p.vy = Math.sin(p.ph) * 4; }
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
  const lights = [...map.lights];
  if (outdoor && state.tint === 2) { dark = Math.max(dark, 0.62); col = amb.dark ? col : '10,16,48'; pl = Math.max(pl, 46); lights.push(...sc.nightLights); }
  if (dark <= 0) return;
  const visible = lights.filter((l) => l.x + l.r > cam.x && l.x - l.r < cam.x + cam.w && l.y + l.r > cam.y && l.y - l.r < cam.y + cam.h);
  if (pl && game.lamp && map.kind === 'cave') pl *= 1.7;
  if (pl) visible.push({ x: player.x, y: player.y - 8, r: pl, color: game.lamp && map.kind === 'cave' ? 'rgba(255,220,140,0.25)' : null, flicker: 0.3 });
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
  camera.follow(player.x, player.y - 10);
  if (state.shake > 0) { camera.x += Math.round((Math.random() - 0.5) * 3); camera.y += Math.round((Math.random() - 0.5) * 3); }
  bctx.fillStyle = sc.map.bg;
  bctx.fillRect(0, 0, cam.w, cam.h);
  bctx.drawImage(sc.ground[f], -cam.x, -cam.y);

  const list = [];
  for (const o of sc.objects) if (cam.visible(o.x, o.y, o.w, o.h, 8)) list.push(o);
  for (const n of sc.npcs) list.push(n);
  for (const e of sc.enemies) if (cam.visible(e.x - 16, e.y - 32, 32, 36, 8)) list.push(e);
  list.push(player);
  drawPickups(sc, time);
  list.sort((a, b) => a.sortY - b.sortY);
  let occluded = false, afterPlayer = false;
  const pb = player.bounds;
  for (const o of list) {
    if (o === player) { player.draw(bctx, cam); afterPlayer = true; continue; }
    if (o instanceof NPC || o instanceof Enemy) { o.draw(bctx, cam); continue; }
    let img = o.s.frames ? o.s.frames[af % o.s.frames.length] : o.s.canvas;
    if (o.chest && game.opened[o.chest]) img = art.sprites[o.locked ? 'chest_locked_open' : 'chest_open'].canvas;
    bctx.drawImage(img, o.x - cam.x, o.y - cam.y);
    if (afterPlayer && o.x < pb.x + pb.w && o.x + o.w > pb.x && o.y < pb.y + pb.h && o.y + o.h > pb.y) occluded = true;
  }
  if (occluded) player.draw(bctx, cam, 0.38);
  drawFx(sc);
  drawMarkers(sc, time);
  lighting(time);
  drawParticles();
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
  const t = !dialog.open && !state.fade && !ui.open && !state.dying ? findTarget() : null;
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
  for (const e of sc.map.exits) if (fx >= e.x && fx < e.x + e.w && fy >= e.y && fy < e.y + e.h) inside = e;
  if (!inside) { state.armed = true; return; }
  if (state.armed) goTo(inside.to, inside.tx, inside.ty, inside.dir);
}

// ---------------------------------------------------------------- Loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time = now;
  const sc = state.scene;
  if (state.fade) {
    state.fade.t += dt;
    if (state.fade.phase === 'out' && state.fade.t >= 0.22) { enterScene(...state.fade.target); state.fade = { phase: 'in', t: 0 }; }
    else if (state.fade.phase === 'in' && state.fade.t >= 0.22) state.fade = null;
  } else if (state.dying) {
    state.dying -= dt;
    player.moving = false;
    updateFx(sc, dt);
    if (state.dying <= 0) { state.dying = 0; state.respawn = true; player.inv = 0; goTo('village', 57.5, 32, 'down'); }
  } else if (!ui.open) {
    if (!dialog.open) player.update(dt, input, sc.map);
    else player.moving = false;
    for (const n of sc.npcs) n.update(dt, sc.map, player);
    if (!dialog.open) { updateCombat(sc, dt); updatePickups(sc, dt); checkExits(); }
    updateFx(sc, dt);
  }
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
if (saved) ui.toast('Spielstand geladen.');
else ui.toast('Neue Quest: ' + QUESTS.schwert.title);
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
  teleport(tx, ty, dir) { player.x = tx * TS + 8; player.y = ty * TS + 12; if (dir) player.dir = dir; },
  goTo(id, tx, ty, dir) { goTo(id, tx, ty, dir); },
  interact, attack, game, G, ui,
  get enemies() { return state.scene.enemies; },
  get drops() { return state.scene.drops; },
  get dying() { return state.dying > 0; },
  save: () => saveNow(),
  fullMapDataURL(id) {
    const sc = id ? getScene(id) : state.scene;
    const c = document.createElement('canvas');
    c.width = sc.map.W * TS; c.height = sc.map.H * TS;
    const x = c.getContext('2d');
    x.drawImage(sc.ground[0], 0, 0);
    const list = [...sc.objects].sort((a, b) => a.sortY - b.sortY);
    for (const o of list) x.drawImage(o.s.canvas, o.x, o.y);
    for (const n of sc.npcs) n.draw(x, { x: 0, y: 0 });
    return c.toDataURL('image/png');
  },
};
