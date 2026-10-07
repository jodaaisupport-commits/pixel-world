// Einstiegspunkt: Setup, Eingabe, Game-Loop, Rendering, HUD.
import { buildArt, TS } from './tiles.js';
import { generateWorld, DEFAULT_SEED } from './world.js';
import { bakeGround, buildMinimap, WATER_FRAMES } from './render.js';
import { Player } from './player.js';
import { Camera } from './camera.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || DEFAULT_SEED;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const buffer = document.createElement('canvas'); // Low-Res-Puffer (1 Pixel = 1 Art-Pixel)
const bctx = buffer.getContext('2d');
const hudPlace = document.getElementById('hud-place');
const hudCoords = document.getElementById('hud-coords');
const hudPrompt = document.getElementById('prompt');
const dialog = document.getElementById('dialog');
const miniWrap = document.getElementById('minimap');
const mini = document.getElementById('minimap-canvas');
const mctx = mini.getContext('2d');

const art = buildArt();
const world = generateWorld(seed);
const ground = bakeGround(world, art);
const miniBase = buildMinimap(world);
mini.width = world.W; mini.height = world.H;

const camera = new Camera(world.W * TS, world.H * TS);
const player = new Player(world.spawn.x, world.spawn.y, art.player);

// Objekte mit Pixelpositionen vorberechnen
const objects = world.objects.map((o) => {
  const s = art.sprites[o.sprite];
  const x = o.tx * TS + s.ox, y = (o.ty + o.fh) * TS + s.oy;
  return { ...o, s, x, y, w: s.w, h: s.h, sortY: (o.ty + o.fh) * TS };
});

// ---------------------------------------------------------------- Eingabe
const input = { up: false, down: false, left: false, right: false, run: false };
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
};
let scale = 3;
let tint = 0; // 0 Tag, 1 Abend, 2 Nacht
const TINTS = [null, 'rgba(255,150,90,0.5)', 'rgba(40,55,120,0.55)'];
const TINT_NAMES = ['Tag', 'Abend', 'Nacht'];
let dialogOpen = false;

window.addEventListener('keydown', (e) => {
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); if (dialogOpen && k !== 'run') closeDialog(); return; }
  if (e.repeat) return;
  if (e.code === 'KeyM') miniWrap.classList.toggle('hidden');
  else if (e.code === 'KeyT') tint = (tint + 1) % TINTS.length;
  else if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); dialogOpen ? closeDialog() : tryInteract(); }
  else if (e.code === 'Equal' || e.code === 'NumpadAdd') { scale = Math.min(6, scale + 1); resize(); }
  else if (e.code === 'Minus' || e.code === 'NumpadSubtract') { scale = Math.max(2, scale - 1); resize(); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) input[k] = false; });
window.addEventListener('blur', () => { for (const k in input) input[k] = false; });

function nearestInteractable() {
  let best = null, bd = 26;
  for (const it of world.interact) {
    const d = Math.hypot(it.x * TS + 8 - player.x, (it.y + 1) * TS - player.y);
    if (d < bd) { bd = d; best = it; }
  }
  return best;
}
function tryInteract() {
  const it = nearestInteractable();
  if (!it) return;
  dialog.textContent = it.text;
  dialog.classList.remove('hidden');
  dialogOpen = true;
}
function closeDialog() { dialog.classList.add('hidden'); dialogOpen = false; }

// ---------------------------------------------------------------- Größe
function resize() {
  if (innerWidth < 700) scale = Math.min(scale, 2);
  // gerade Puffergrößen -> jitterfreie Kamera
  const vw = Math.ceil(innerWidth / scale / 2) * 2;
  const vh = Math.ceil(innerHeight / scale / 2) * 2;
  buffer.width = vw; buffer.height = vh;
  canvas.width = vw * scale; canvas.height = vh * scale;
  canvas.style.width = vw * scale + 'px';
  canvas.style.height = vh * scale + 'px';
  bctx.imageSmoothingEnabled = false;
  ctx.imageSmoothingEnabled = false;
  camera.resize(vw, vh);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- Rendering
function render(time) {
  const f = Math.floor(time / 280) % WATER_FRAMES;
  camera.follow(player.x, player.y - 10);
  const cam = camera;
  bctx.fillStyle = '#1b2a1e';
  bctx.fillRect(0, 0, cam.w, cam.h);
  bctx.drawImage(ground[f], cam.x, cam.y, cam.w, cam.h, 0, 0, cam.w, cam.h);

  // y-sortierte Objekte + Spieler
  const list = [];
  for (const o of objects) if (cam.visible(o.x, o.y, o.w, o.h, 8)) list.push(o);
  const pl = { player: true, sortY: player.y };
  list.push(pl);
  list.sort((a, b) => a.sortY - b.sortY);
  let occluded = false, afterPlayer = false;
  const pb = player.bounds;
  for (const o of list) {
    if (o.player) { player.draw(bctx, cam); afterPlayer = true; continue; }
    bctx.drawImage(o.s.canvas, o.x - cam.x, o.y - cam.y);
    if (afterPlayer && o.x < pb.x + pb.w && o.x + o.w > pb.x && o.y < pb.y + pb.h && o.y + o.h > pb.y) occluded = true;
  }
  // verdeckte Figur als "Geist" durchscheinen lassen
  if (occluded) player.draw(bctx, cam, 0.38);

  if (TINTS[tint]) {
    bctx.globalCompositeOperation = 'multiply';
    bctx.fillStyle = TINTS[tint];
    bctx.fillRect(0, 0, cam.w, cam.h);
    if (tint === 2) { bctx.globalCompositeOperation = 'source-over'; bctx.fillStyle = 'rgba(20,30,70,0.25)'; bctx.fillRect(0, 0, cam.w, cam.h); }
    if (tint === 2) { // Laternen und Fenster leuchten nachts
      bctx.globalCompositeOperation = 'lighter';
      for (const o of list) {
        if (o.player) continue;
        const spots = o.sprite === 'lamp' ? [[o.x + 6, o.y + 7, 34]] : o.sprite.startsWith('house') ? [[o.x + 20, o.y + 54, 16], [o.x + 62, o.y + 54, 16]] : null;
        if (!spots) continue;
        for (const [gx, gy, r] of spots) {
          const sx = gx - cam.x, sy = gy - cam.y;
          const grad = bctx.createRadialGradient(sx, sy, 0, sx, sy, r);
          grad.addColorStop(0, 'rgba(255,200,110,0.55)');
          grad.addColorStop(1, 'rgba(255,200,110,0)');
          bctx.fillStyle = grad;
          bctx.fillRect(sx - r, sy - r, r * 2, r * 2);
        }
      }
    }
    bctx.globalCompositeOperation = 'source-over';
  }

  ctx.drawImage(buffer, 0, 0, cam.w * scale, cam.h * scale);
}

let lastHud = '';
function updateHud() {
  const tx = player.tileX, ty = player.tileY;
  const place = world.biomeAt(tx, ty);
  const s = `${place}|${tx}|${ty}|${tint}`;
  if (s !== lastHud) {
    lastHud = s;
    hudPlace.textContent = place;
    hudCoords.textContent = `X ${String(tx).padStart(2, '0')}  Y ${String(ty).padStart(2, '0')}  ·  ${TINT_NAMES[tint]}`;
  }
  const it = nearestInteractable();
  hudPrompt.classList.toggle('hidden', !it || dialogOpen);
  if (!miniWrap.classList.contains('hidden')) {
    mctx.drawImage(miniBase, 0, 0);
    mctx.strokeStyle = 'rgba(255,255,255,0.8)';
    mctx.lineWidth = 1;
    mctx.strokeRect(Math.floor(camera.x / TS) + 0.5, Math.floor(camera.y / TS) + 0.5, Math.round(camera.w / TS), Math.round(camera.h / TS));
    mctx.fillStyle = '#ffe14d';
    mctx.fillRect(tx - 1, ty - 1, 3, 3);
    mctx.fillStyle = '#20161a';
    mctx.fillRect(tx, ty, 1, 1);
  }
}

// ---------------------------------------------------------------- Loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!dialogOpen) player.update(dt, input, world);
  render(now);
  updateHud();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Debug-/Test-Hooks
window.__game = {
  world, player, camera, art, input,
  get scale() { return scale; },
  ready: true,
  teleport(tx, ty) { player.x = tx * TS + 8; player.y = ty * TS + 12; },
  mapDataURL(f = 0) { return ground[f].toDataURL('image/png'); },
  fullMapDataURL() {
    const c = document.createElement('canvas');
    c.width = world.W * TS; c.height = world.H * TS;
    const x = c.getContext('2d');
    x.drawImage(ground[0], 0, 0);
    for (const o of objects) x.drawImage(o.s.canvas, o.x, o.y);
    return c.toDataURL('image/png');
  },
};
console.log(`[pixel-world] seed=${seed} art=${art.buildMs.toFixed(0)}ms objects=${objects.length}`);
