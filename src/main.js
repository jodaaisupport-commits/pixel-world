// Einstiegspunkt: Szenen-/Kartensystem, Eingabe, Game-Loop, Rendering, Licht, HUD.
import { buildArt, TS } from './tiles.js';
import { MAPS } from './maps/index.js';
import { bakeGround, buildMinimap, WATER_FRAMES } from './render.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { NPC } from './npc.js';
import { NPC_DEFS } from './npcs.js';
import { Dialog } from './dialog.js';

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
const camera = new Camera(16, 16);
const state = { visited: new Set(), scene: null, tint: 0, fade: null, armed: true, time: 0 };
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
  const scene = { id, map, ground, objects, npcs, nightLights, mini: buildMinimap(map), particles: [] };
  console.log(`[pixel-world] Szene ${id} (${map.W}x${map.H}) in ${(performance.now() - t0).toFixed(0)}ms`);
  return scene;
}
function getScene(id) {
  if (!sceneCache.has(id)) sceneCache.set(id, buildScene(id));
  return sceneCache.get(id);
}

const player = new Player(0, 0, art.player);
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
  showArea(sc.map.name, first);
}
function goTo(id, tx, ty, dir) {
  if (state.fade) return;
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
  const k = KEYMAP[e.code];
  if (k) { e.preventDefault(); if (!state.fade) input[k] = true; return; }
  if (e.repeat) return;
  if (e.code === 'KeyM') miniWrap.classList.toggle('hidden');
  else if (e.code === 'KeyT') state.tint = (state.tint + 1) % 3;
  else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (dialog.open) dialog.advance(); else if (!state.fade) interact(); }
  else if (e.code === 'Escape' && dialog.open) dialog.close();
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') { scale = Math.min(6, scale + 1); resize(); }
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') { scale = Math.max(2, scale - 1); resize(); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });
window.addEventListener('blur', () => { for (const k in input) input[k] = false; });

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
    dialog.show(n.name, n.pages(state), () => { n.talking = false; });
  } else if (t.type === 'door') goTo(t.exit.to, t.exit.tx, t.exit.ty, t.exit.dir);
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
  if (pl) visible.push({ x: player.x, y: player.y - 8, r: pl, color: null, flicker: 0.3 });
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
  bctx.fillStyle = sc.map.bg;
  bctx.fillRect(0, 0, cam.w, cam.h);
  bctx.drawImage(sc.ground[f], -cam.x, -cam.y);

  const list = [];
  for (const o of sc.objects) if (cam.visible(o.x, o.y, o.w, o.h, 8)) list.push(o);
  for (const n of sc.npcs) list.push(n);
  list.push(player);
  list.sort((a, b) => a.sortY - b.sortY);
  let occluded = false, afterPlayer = false;
  const pb = player.bounds;
  for (const o of list) {
    if (o === player) { player.draw(bctx, cam); afterPlayer = true; continue; }
    if (o instanceof NPC) { o.draw(bctx, cam); continue; }
    const img = o.s.frames ? o.s.frames[af % o.s.frames.length] : o.s.canvas;
    bctx.drawImage(img, o.x - cam.x, o.y - cam.y);
    if (afterPlayer && o.x < pb.x + pb.w && o.x + o.w > pb.x && o.y < pb.y + pb.h && o.y + o.h > pb.y) occluded = true;
  }
  if (occluded) player.draw(bctx, cam, 0.38);
  lighting(time);
  drawParticles();
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
  const t = !dialog.open && !state.fade ? findTarget() : null;
  hudPrompt.classList.toggle('hidden', !t);
  if (t) hudPrompt.innerHTML = `<b>E</b> – ${t.type === 'npc' ? 'sprechen mit ' + t.npc.name : t.type === 'door' ? 'eintreten' : 'ansehen'}`;
  if (!miniWrap.classList.contains('hidden')) {
    mctx.drawImage(sc.mini, 0, 0);
    mctx.strokeStyle = 'rgba(255,255,255,0.8)';
    mctx.lineWidth = 1;
    mctx.strokeRect(Math.floor(camera.x / TS) + 0.5, Math.floor(camera.y / TS) + 0.5, Math.round(camera.w / TS), Math.round(camera.h / TS));
    mctx.fillStyle = '#ff5ad1';
    for (const n of sc.npcs) mctx.fillRect(Math.floor(n.x / TS), Math.floor((n.y - 3) / TS), 1, 1);
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
  } else {
    if (!dialog.open) player.update(dt, input, sc.map);
    else player.moving = false;
    for (const n of sc.npcs) n.update(dt, sc.map, player);
    if (!dialog.open) checkExits();
  }
  dialog.update(dt);
  updateParticles(dt);
  render(now);
  updateHud();
  requestAnimationFrame(frame);
}

const params = new URLSearchParams(location.search);
enterScene(params.get('map') && MAPS[params.get('map')] ? params.get('map') : 'village');
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
  interact,
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
