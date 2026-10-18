// Pixel-Art für die Hauptgeschichte: Geröll, Treppen, Siegeltor, Arena-Gitter, Kristallsäulen,
// Runenkreis, gereinigter Kristall.
import { Pix } from './pix.js';
import { hash2 } from './noise.js';
import { APAL } from './tiles-areas.js';

const reg = (art, name, s) => {
  const base = s.frames ? s.frames[0] : s.pix;
  art.sprites[name] = { canvas: base.canvas(), frames: s.frames ? s.frames.map((f) => f.canvas()) : null, ox: s.ox, oy: s.oy, w: base.w, h: base.h };
};
const ROCK = ['#3a3440', '#564e5e', '#746a7c', '#968ca0', '#b8afc0'];

function rubble() {
  const p = new Pix(32, 34);
  const blobs = [[7, 27, 7, 6], [24, 27, 7, 6], [15, 29, 8, 5], [11, 18, 7, 6], [22, 17, 7, 6], [16, 9, 6, 5], [5, 13, 4, 4], [27, 11, 4, 5], [16, 21, 5, 4]];
  blobs.sort((a, b) => a[1] - b[1]);
  for (const [cx, cy, rx, ry] of blobs) {
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r = dx * dx + dy * dy + (hash2(x, y, 3) - 0.5) * 0.3;
      if (r > 1) continue;
      const l = -(dx * 0.6 + dy * 0.8) + (hash2(x, y, 9) - 0.5) * 0.3;
      p.set(x, y, ROCK[l > 0.6 ? 4 : l > 0.2 ? 3 : l > -0.3 ? 2 : l > -0.7 ? 1 : 0]);
    }
  }
  for (const [x, y] of [[3, 31], [29, 31], [14, 33], [20, 32]]) { p.set(x, y, ROCK[2]); p.set(x + 1, y, ROCK[1]); }
  // Holzbalken
  for (let i = 0; i < 18; i++) { p.set(6 + i, 24 - Math.round(i * 0.45), '#6a4a2a'); p.set(6 + i, 25 - Math.round(i * 0.45), '#4a3018'); }
  return { pix: p.outlined('#120c16'), ox: -1, oy: -35 };
}
function stairs(dir) {
  // Treppe nach unten (dir 'w' = nach Westen, 's' = nach Süden/oben ins Bild)
  const p = new Pix(32, 32);
  for (let i = 0; i < 6; i++) {
    const c = ['#5e566a', '#4a4356', '#383244', '#2a2434', '#1c1824', '#100c16'][i];
    if (dir === 'w') { p.rect(26 - i * 5, 1, 5, 30, c); p.vline(26 - i * 5, 1, 30, '#7a7088'); }
    else { p.rect(1, 26 - i * 5, 30, 5, c); p.hline(1, 30, 26 - i * 5, '#7a7088'); }
  }
  return p;
}
function stairsUp() {
  const p = new Pix(32, 32);
  for (let i = 0; i < 6; i++) { const c = ['#2a2434', '#383244', '#4a4356', '#5e566a', '#706880', '#847c94'][i]; p.rect(1, 26 - i * 5, 30, 5, c); p.hline(1, 30, 30 - i * 5, '#1c1824'); }
  return p;
}
function gatePillar() {
  const p = new Pix(16, 44);
  p.rect(2, 6, 12, 38, '#4a4356'); p.rect(3, 6, 3, 38, '#625a70'); p.vline(12, 6, 43, '#2e2838');
  p.rect(0, 0, 16, 7, '#5e566a'); p.hline(0, 15, 0, '#847c94'); p.hline(0, 15, 6, '#2e2838');
  p.rect(0, 40, 16, 4, '#5e566a');
  for (let y = 12; y < 38; y += 7) { p.set(7, y, '#b066ff'); p.set(8, y + 1, '#b066ff'); p.set(7, y + 2, '#ff5ad1'); }
  return { pix: p.outlined('#120c16'), ox: -1, oy: -45 };
}
function sealGate(frame) {
  const p = new Pix(64, 40);
  p.rect(0, 0, 64, 40, '#2a2238');
  for (let x = 0; x < 64; x += 8) { p.vline(x, 0, 39, '#1a1424'); p.vline(x + 1, 0, 39, '#3a3048'); }
  p.rect(0, 0, 64, 4, '#463c58'); p.hline(0, 63, 0, '#5e5274');
  // Runenkreis in der Mitte
  const glow = frame ? '#ff7ae0' : '#b066ff';
  p.ellipse(32, 21, 12, 12, '#1a1028');
  for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; p.set(32 + Math.cos(t) * 11, 21 + Math.sin(t) * 11, glow); }
  for (let a = 0; a < 3; a++) { const t = (a / 3) * Math.PI * 2 - Math.PI / 2; for (let r = 0; r < 9; r++) p.set(32 + Math.cos(t) * r, 21 + Math.sin(t) * r, glow); }
  p.ellipse(32, 21, 2.5, 2.5, frame ? '#ffe0f6' : '#e0b0ff');
  for (const [x, y] of [[8, 12], [56, 12], [10, 30], [54, 30]]) { p.set(x, y, glow); p.set(x, y + 1, glow); p.set(x + 1, y + 1, glow); }
  return p.outlined('#120c16');
}
function arenaBars(frame) {
  const p = new Pix(64, 36);
  for (let x = 2; x < 64; x += 8) {
    for (let y = 0; y < 36; y++) { const w = y > 30 ? 1 : 2; for (let i = 0; i < w; i++) p.set(x + i + 1, y, i ? '#a02050' : '#ff4a7a'); }
    p.set(x + 1, 35, '#ffc0d0'); p.set(x + 2, 34, '#ffc0d0');
  }
  p.hline(0, 63, 6, frame ? '#ff7aa0' : '#c03060'); p.hline(0, 63, 20, frame ? '#ff7aa0' : '#c03060');
  return p.outlined('#200810');
}
function pillar(v) {
  const p = new Pix(16, 42);
  p.rect(3, 18, 10, 22, '#4a4356'); p.rect(4, 18, 3, 22, '#625a70'); p.vline(12, 18, 39, '#2e2838');
  p.rect(1, 37, 14, 5, '#5e566a'); p.hline(1, 14, 37, '#847c94');
  p.rect(2, 14, 12, 5, '#5e566a'); p.hline(2, 13, 14, '#847c94');
  const c = v ? ['#5a2a9a', '#9a5ae0', '#e0c0ff'] : ['#1f5a8a', '#4aa8e0', '#c8f0ff'];
  for (let y = 0; y < 15; y++) { const w = y < 9 ? y * 0.45 : (15 - y) * 0.7; for (let x = Math.round(8 - w); x <= Math.round(8 + w); x++) p.set(x, y, x < 8 ? c[2] : x === 8 ? c[1] : c[0]); }
  return { pix: p.outlined('#120c16'), ox: -1, oy: -43 };
}
function pureCrystal(frame) {
  const p = new Pix(26, 36);
  p.rect(3, 28, 20, 6, '#5e566a'); p.hline(3, 22, 28, '#847c94'); p.hline(3, 22, 33, '#2e2838');
  const c = ['#2a6aa8', '#5ab4f0', '#bfeaff', '#ffffff'];
  for (let y = 0; y < 28; y++) { const w = y < 10 ? y * 0.8 : (28 - y) * 0.44; for (let x = Math.round(13 - w); x <= Math.round(13 + w); x++) p.set(x, y, x < 11 ? c[2] : x < 13 ? c[1 + frame] : x === 13 ? c[3] : c[0]); }
  return p.outlined('#0c1a2a');
}
function runeCircle() {
  const p = new Pix(112, 76), cx = 56, cy = 38;
  for (let a = 0; a < 360; a += 0.5) { const t = (a * Math.PI) / 180; for (const [rx, ry, c] of [[52, 34, '#5a2a7a'], [44, 29, '#3e1e58'], [24, 16, '#5a2a7a']]) p.set(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry, c); }
  for (let i = 0; i < 6; i++) { const t = (i / 6) * Math.PI * 2; for (let r = 24; r < 44; r += 0.5) p.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r * 0.66, '#4a2268'); }
  for (let i = 0; i < 12; i++) { const t = (i / 12) * Math.PI * 2 + 0.26, x = cx + Math.cos(t) * 48, y = cy + Math.sin(t) * 31.5; p.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#7a3aa0'); p.set(Math.round(x), Math.round(y), '#c080ff'); }
  return p.canvas();
}
function cracks() {
  const p = new Pix(24, 16);
  let x = 2, y = 8; for (let i = 0; i < 20; i++) { p.set(x, y, '#1a1420'); x += 1; y += Math.round((hash2(i, 3, 1) - 0.5) * 2); y = Math.max(1, Math.min(14, y)); }
  return p.canvas();
}

export function buildStoryArt(art) {
  reg(art, 'rubble', rubble());
  reg(art, 'gatepillar', gatePillar());
  reg(art, 'sealgate', { frames: [0, 1].map(sealGate), ox: 0, oy: -40 });
  reg(art, 'arenabars', { frames: [0, 1].map(arenaBars), ox: 0, oy: -36 });
  reg(art, 'pillar0', pillar(0)); reg(art, 'pillar1', pillar(1));
  reg(art, 'purecrystal', { frames: [0, 1].map(pureCrystal), ox: -6, oy: -38 });
  art.decals.stairs_w = stairs('w').canvas();
  art.decals.stairs_up = stairsUp().canvas();
  art.decals.runecircle = runeCircle();
  art.decals.cracks = cracks();
}
