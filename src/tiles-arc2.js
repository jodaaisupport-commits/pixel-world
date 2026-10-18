// Pixel-Art der zweiten Geschichte: Sonnenwüste & Oase, Sonnentempel-Ruinen, Frosthöhen & Eisgrotte,
// Gezeitentempel. Böden (Dünen, Treibsand, Ruinenplatten, Eis, Gletscherspalte, Tempelstein) und Objekte.
import { Pix, PAL, ri } from './pix.js';
import { mulberry32, hash2 } from './noise.js';

export const WPAL = {
  du0: '#c98f4e', du1: '#e2ad66', du2: '#f0c582', du3: '#f8dca6',
  qs0: '#6e4a26', qs1: '#94683a', qs2: '#b3844c', qs3: '#cfa264',
  ru0: '#8a6a42', ru1: '#b8925e', ru2: '#cfac74', ru3: '#e4c892',
  ic0: '#5a9cc4', ic1: '#8cc8e6', ic2: '#bfe6f6', ic3: '#effbff',
  ch0: '#05070e', ch1: '#0d1424', ch2: '#1c2a44',
  tp0: '#1f3a3c', tp1: '#2e5254', tp2: '#407070', tp3: '#62968e', tpm: '#2f6a4a',
};

const reg = (art, name, s) => {
  const base = s.frames ? s.frames[0] : s.pix;
  art.sprites[name] = { canvas: base.canvas(), frames: s.frames ? s.frames.map((f) => f.canvas()) : null, ox: s.ox, oy: s.oy, w: base.w, h: base.h };
};
/** Schattierte Ellipse („Blob“) mit Licht von oben links. */
function blob(p, cx, cy, rx, ry, cols, seed = 1, rough = 0.25) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, r = dx * dx + dy * dy + (hash2(x, y, seed) - 0.5) * rough;
    if (r > 1) continue;
    const l = -(dx * 0.6 + dy * 0.8) + (hash2(x, y, seed + 3) - 0.5) * 0.25;
    p.set(x, y, cols[l > 0.55 ? cols.length - 1 : l > 0.1 ? Math.min(cols.length - 1, 2) : l > -0.45 ? 1 : 0]);
  }
}
const shadow = (p, cx, cy, rx, ry = 2.4) => p.ellipse(cx, cy, rx, ry, '#00000048');

// ---------------------------------------------------------------- Böden
function dune(v) {
  const r = mulberry32(5100 + v), p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.du1);
  for (let k = 0; k < 3; k++) { // geschwungene Rippel
    const y0 = 2 + k * 5 + ri(r, 0, 1), ph = r() * 6;
    for (let x = 0; x < 16; x++) { const y = Math.round(y0 + Math.sin(x / 2.6 + ph) * 1.1); p.set(x, y, WPAL.du0); if (x % 3) p.set(x, y - 1, WPAL.du2); }
  }
  for (let k = 0; k < 4 + v; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), r() < 0.5 ? WPAL.du3 : WPAL.du0);
  return p;
}
function qsand(v, f) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.qs2);
  const cx = 8 + (v ? 1 : -1), cy = 8, a0 = f * 0.8 + v;
  for (let i = 0; i < 64; i++) { // Strudel
    const t = i / 64, a = a0 + t * 9, rr = 1 + t * 8;
    const x = Math.round(cx + Math.cos(a) * rr), y = Math.round(cy + Math.sin(a) * rr * 0.8);
    p.set(x, y, t < 0.35 ? WPAL.qs0 : WPAL.qs1);
  }
  p.ellipse(cx, cy, 1.6, 1.2, WPAL.qs0);
  for (let k = 0; k < 6; k++) p.set((k * 5 + f * 3 + v * 7) % 16, (k * 7 + f) % 16, WPAL.qs3);
  return p;
}
function ruinFloor(v) {
  const r = mulberry32(5300 + v), p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.ru0);
  const blocks = v ? [[0, 0, 10, 8], [10, 0, 6, 8], [0, 8, 6, 8], [6, 8, 10, 8]] : [[0, 0, 7, 7], [7, 0, 9, 7], [0, 7, 11, 9], [11, 7, 5, 9]];
  for (const [x, y, w, h] of blocks) {
    p.rect(x, y, w - 1, h - 1, r() < 0.35 ? WPAL.ru1 : WPAL.ru2);
    p.hline(x, x + w - 2, y, WPAL.ru3);
    if (r() < 0.5) { const cx = x + ri(r, 1, w - 3); p.set(cx, y + ri(r, 2, h - 3), WPAL.ru0); p.set(cx + 1, y + ri(r, 2, h - 3), WPAL.ru1); }
  }
  if (v === 2) for (let i = 0; i < 6; i++) p.set(3 + i, 4 + Math.round(i * 0.8), WPAL.ru0); // Riss
  return p;
}
function ice(v) {
  const r = mulberry32(5400 + v), p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.ic1);
  for (let k = 0; k < 3; k++) { const x = ri(r, 0, 12), y = ri(r, 1, 14); for (let i = 0; i < 4; i++) p.set(x + i, y - i, WPAL.ic2); p.set(x + 4, y - 4, WPAL.ic3); }
  if (v === 1) { let x = ri(r, 2, 6), y = ri(r, 2, 6); for (let i = 0; i < 8; i++) { p.set(x, y, WPAL.ic0); x += 1; y += r() < 0.5 ? 1 : 0; } }
  if (v === 2) p.ellipse(8, 9, 3, 2, WPAL.ic0 + '60');
  return p;
}
function chasm(v) {
  const r = mulberry32(5500 + v), p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.ch0);
  for (let k = 0; k < 5; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), WPAL.ch1);
  if (v) p.set(ri(r, 3, 12), ri(r, 3, 12), WPAL.ch2);
  return p;
}
function templeFloor(v) {
  const r = mulberry32(5600 + v), p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, WPAL.tp0);
  const blocks = [[0, 0, 8, 8], [8, 0, 8, 8], [0, 8, 8, 8], [8, 8, 8, 8]];
  for (const [x, y, w, h] of blocks) {
    p.rect(x, y, w - 1, h - 1, r() < 0.4 ? WPAL.tp1 : WPAL.tp2);
    p.hline(x, x + w - 2, y, WPAL.tp3);
    if (r() < 0.4) p.set(x + ri(r, 1, 5), y + ri(r, 2, 5), WPAL.tpm);
  }
  if (v === 1) { p.ellipse(5, 11, 3, 1.5, '#6ab0c070'); p.set(4, 10, '#c8f0f0'); } // Pfütze
  if (v === 2) for (let i = 0; i < 5; i++) { p.set(9 + i, 3, WPAL.tpm); p.set(10 + i, 4, '#3f8a5e'); } // Algen
  return p;
}

// ---------------------------------------------------------------- Wüste & Oase
function cactus(v) {
  if (v === 1) {
    const p = new Pix(16, 16); shadow(p, 8, 14, 6);
    blob(p, 8, 9, 6, 5, ['#2f6a3a', '#3f8a44', '#5aa850', '#7cc466'], 7, 0.1);
    for (let i = 0; i < 5; i++) p.vline(4 + i * 2, 5, 13, i % 2 ? '#2f6a3a' : '#5aa850');
    p.set(8, 3, '#ff6a8a'); p.set(7, 3, '#ff9ab0'); p.set(8, 2, '#ff6a8a');
    return { pix: p.outlined('#163a1e'), ox: 0, oy: -16 };
  }
  const p = new Pix(22, 32); shadow(p, 11, 30, 6);
  const col = (x0, y0, y1, w) => { for (let y = y0; y <= y1; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, x === x0 ? '#2f6a3a' : x === x0 + w - 1 ? '#24502c' : (x - x0) % 2 ? '#3f8a44' : '#5aa850'); p.hline(x0 + 1, x0 + w - 2, y0 - 1, '#5aa850'); };
  col(8, 4, 29, 6);
  col(2, 12, 19, 4); p.rect(5, 18, 3, 3, '#3f8a44');
  col(16, 9, 16, 4); p.rect(14, 15, 3, 3, '#3f8a44');
  for (let y = 6; y < 28; y += 3) { p.set(9, y, '#c8e8a0'); p.set(12, y + 1, '#c8e8a0'); }
  return { pix: p.outlined('#163a1e'), ox: -3, oy: -32 };
}
function adobe(v) {
  const p = new Pix(80, 66), wall = v ? ['#b07a4a', '#c98f5a', '#dba872', '#ecc48e'] : ['#a86e48', '#c08458', '#d69e6c', '#e8b886'];
  shadow(p, 40, 63, 38, 3);
  // Mauern: Kasten mit abgerundeten Kanten + flachem Dach
  p.rect(4, 22, 72, 42, wall[1]);
  const r = mulberry32(5700 + v);
  for (let k = 0; k < 60; k++) p.set(ri(r, 5, 74), ri(r, 24, 62), r() < 0.5 ? wall[0] : wall[2]);
  p.rect(2, 14, 76, 9, wall[2]); p.hline(2, 77, 14, wall[3]); p.hline(2, 77, 22, wall[0]);
  for (let x = 6; x < 76; x += 10) { p.rect(x, 22, 3, 3, '#6b4a2b'); p.set(x, 22, '#8a6440'); } // Dachbalken
  if (v) { p.rect(48, 4, 26, 11, wall[1]); p.hline(48, 73, 4, wall[3]); p.rect(52, 7, 6, 6, '#3a2418'); } // Aufbau
  // Tür (Bogen) in der Mitte (Tile 2 von 5)
  p.rect(33, 42, 14, 22, '#3a2418'); p.ellipse(40, 42, 7, 5, '#3a2418');
  p.rect(35, 44, 10, 20, '#7a4a2a'); p.ellipse(40, 44, 5, 4, '#7a4a2a'); p.vline(40, 42, 63, '#5a3420'); p.set(43, 54, PAL.fy);
  // Fenster mit Gittern
  for (const x of [12, 58]) { p.rect(x, 34, 10, 9, '#3a2418'); p.rect(x + 1, 35, 8, 7, PAL.win1); for (let i = 0; i < 3; i++) p.vline(x + 2 + i * 3, 35, 41, '#6b4a2b'); }
  // Stoffmarkise
  const aw = v ? ['#2f6aa8', '#e8e0c8'] : ['#b83a3a', '#e8e0c8'];
  for (let x = 28; x < 52; x++) for (let y = 30; y < 36; y++) p.set(x, y + (x % 4 === 0 && y === 35 ? 1 : 0), Math.floor((x - 28) / 4) % 2 ? aw[1] : aw[0]);
  p.hline(28, 51, 30, '#00000040');
  // Krüge
  for (const x of [8, 68]) { p.ellipse(x, 59, 3, 4, '#a85a32'); p.hline(x - 1, x + 1, 55, '#c87a4a'); }
  return { pix: p.outlined('#3a2214'), ox: 0, oy: -66 };
}
function stall() {
  const p = new Pix(48, 40); shadow(p, 24, 37, 22);
  for (const x of [3, 43]) p.rect(x, 10, 2, 28, '#6b4a2b');
  for (let x = 0; x < 48; x++) for (let y = 4; y < 12; y++) p.set(x, y + (x % 6 === 0 && y === 11 ? 1 : 0), Math.floor(x / 6) % 2 ? '#f0d890' : '#d9822a');
  p.hline(0, 47, 4, '#fff1b8');
  p.rect(2, 24, 44, 8, '#8a5a32'); p.hline(2, 45, 24, '#b07a4a');
  const goods = ['#e8c84a', '#c84a3a', '#6aa84a', '#d98a3a', '#8a5ac8'];
  for (let i = 0; i < 7; i++) p.ellipse(6 + i * 6, 22, 2.5, 2, goods[i % goods.length]);
  return { pix: p.outlined('#2a1a10'), ox: 0, oy: -40 };
}
function obelisk() {
  const p = new Pix(16, 42); shadow(p, 8, 40, 7);
  for (let y = 6; y < 40; y++) { const w = 3 + Math.round((y - 6) * 0.07); for (let x = 8 - w; x <= 8 + w - 1; x++) p.set(x, y, x < 7 ? WPAL.ru3 : x < 9 ? WPAL.ru2 : WPAL.ru1); }
  for (let y = 0; y < 7; y++) for (let x = 8 - Math.ceil(y / 2); x <= 7 + Math.ceil(y / 2); x++) p.set(x, y, x < 8 ? '#f0d890' : '#d9b860');
  for (let i = 0; i < 4; i++) { p.set(6, 12 + i * 6, WPAL.ru0); p.set(8, 13 + i * 6, WPAL.ru0); p.hline(6, 9, 15 + i * 6, WPAL.ru0); }
  return { pix: p.outlined('#4a3420'), ox: 0, oy: -42 };
}
function ruinPillar(v) {
  const h = v ? 24 : 40, p = new Pix(18, h + 2); shadow(p, 9, h, 8);
  p.rect(1, h - 5, 16, 5, WPAL.ru1); p.hline(1, 16, h - 5, WPAL.ru3);
  for (let y = 4; y < h - 5; y++) for (let x = 3; x < 15; x++) p.set(x, y, x < 6 ? WPAL.ru3 : x % 3 === 0 ? WPAL.ru1 : WPAL.ru2);
  if (!v) { p.rect(1, 1, 16, 4, WPAL.ru2); p.hline(1, 16, 1, WPAL.ru3); }
  else for (let x = 3; x < 15; x++) p.set(x, 3 + (hash2(x, 1, 9) * 3 | 0), '#00000000');
  if (v) { for (let x = 3; x < 15; x++) for (let y = 0; y < 3 + (hash2(x, 2, 4) * 4 | 0); y++) p.erase(x, 4 + y - 1); }
  p.set(7, h - 12, WPAL.ru0); p.set(8, h - 11, WPAL.ru0);
  return { pix: p.outlined('#4a3420'), ox: -1, oy: -(h + 2) };
}
function ruinBlock() {
  const p = new Pix(32, 20); shadow(p, 16, 18, 15);
  p.rect(1, 6, 30, 11, WPAL.ru1); p.rect(1, 3, 30, 4, WPAL.ru2); p.hline(1, 30, 3, WPAL.ru3);
  for (let x = 4; x < 30; x += 7) p.vline(x, 7, 16, WPAL.ru0);
  p.set(12, 10, WPAL.ru3); p.set(20, 12, WPAL.ru0);
  return { pix: p.outlined('#4a3420'), ox: 0, oy: -20 };
}
function sunHead() {
  const p = new Pix(48, 36); shadow(p, 24, 33, 22, 3);
  blob(p, 24, 20, 18, 15, [WPAL.ru0, WPAL.ru1, WPAL.ru2, WPAL.ru3], 21, 0.08);
  // Gesicht
  p.rect(13, 14, 7, 3, WPAL.ru0); p.rect(28, 14, 7, 3, WPAL.ru0); p.set(16, 15, '#ffd23f'); p.set(31, 15, '#ffd23f');
  p.vline(24, 16, 24, WPAL.ru0); p.hline(19, 29, 28, WPAL.ru0);
  for (let i = 0; i < 9; i++) { p.set(6 + i * 4, 4 + (i % 2), '#e8c060'); } // Strahlenkrone
  // halb im Sand
  for (let x = 0; x < 48; x++) for (let y = 30 + Math.round(Math.sin(x / 5) * 1.5); y < 36; y++) p.set(x, y, x % 5 ? WPAL.du1 : WPAL.du2);
  return { pix: p.outlined('#4a3420'), ox: 0, oy: -36 };
}
function sunAltar(full) {
  const frames = [0, 1].map((f) => {
    const p = new Pix(32, 30); shadow(p, 16, 28, 15);
    p.rect(2, 16, 28, 11, WPAL.ru1); p.rect(0, 12, 32, 5, WPAL.ru2); p.hline(0, 31, 12, WPAL.ru3);
    for (let x = 4; x < 30; x += 6) p.vline(x, 18, 26, WPAL.ru0);
    p.ellipse(16, 21, 4, 3, '#a8742a'); p.ellipse(16, 21, 2, 1.6, '#ffd23f');
    if (full) { // Sonnensplitter
      for (let y = 0; y < 11; y++) { const w = y < 5 ? y * 0.8 : (11 - y) * 0.6; for (let x = Math.round(16 - w); x <= Math.round(16 + w); x++) p.set(x, y, x < 16 ? '#fff1a6' : '#ffb83a'); }
      if (f) { p.set(10, 2, '#ffffff'); p.set(22, 6, '#ffffff'); p.set(16, 0, '#ffffff'); }
    }
    return p.outlined('#4a3420');
  });
  return { frames, ox: 0, oy: -30 };
}
function barrier() {
  const p = new Pix(48, 26); shadow(p, 24, 24, 22);
  for (const x of [2, 42]) { p.rect(x, 6, 4, 19, '#6b4a2b'); p.vline(x, 6, 24, '#8a6440'); }
  for (let x = 4; x < 44; x++) for (let y = 9; y < 13; y++) p.set(x, y, Math.floor(x / 5) % 2 ? '#e8e0d0' : '#c83a2a');
  p.rect(20, 14, 8, 6, '#d9b860'); p.hline(20, 27, 14, '#f0d890'); p.set(23, 16, '#3a2418'); p.set(24, 17, '#3a2418');
  return { pix: p.outlined('#2a1a10'), ox: 0, oy: -26 };
}
function sandGate(f) {
  const p = new Pix(64, 40);
  for (let i = 0; i < 8; i++) {
    const x = 4 + i * 8;
    p.rect(x, 2 + (f && i % 2 ? 1 : 0), 3, 36, '#8a6a42'); p.vline(x, 2, 37, '#cfac74');
    p.set(x + 1, 1, '#e4c892');
  }
  p.rect(0, 10, 64, 3, '#6b4a2b'); p.rect(0, 28, 64, 3, '#6b4a2b'); p.hline(0, 63, 10, '#b8925e'); p.hline(0, 63, 28, '#b8925e');
  return p.outlined('#2a1a10');
}

// ---------------------------------------------------------------- Frosthöhen & Eisgrotte
function iceSpike(v) {
  const p = new Pix(18, 26); shadow(p, 9, 24, 7);
  const sp = v ? [[9, 3, 3], [4, 11, 2], [14, 9, 2]] : [[8, 1, 3], [13, 8, 2.5], [4, 13, 2]];
  for (const [x, top, w] of sp) for (let y = top; y < 24; y++) { const ww = Math.max(0, w * (y - top) / 8); for (let xx = Math.round(x - ww); xx <= Math.round(x + ww); xx++) p.set(xx, y, xx < x ? WPAL.ic3 : xx === x ? WPAL.ic2 : WPAL.ic1); }
  p.set(8, 4, '#ffffff');
  return { pix: p.outlined('#2a5a7a'), ox: -1, oy: -26 };
}
function hookPost() {
  const p = new Pix(16, 30); shadow(p, 8, 28, 6);
  p.rect(6, 8, 4, 20, '#5a4a3a'); p.vline(6, 8, 27, '#7a6650'); p.vline(9, 8, 27, '#3a2e24');
  p.rect(5, 6, 6, 3, '#8a7a66');
  p.ellipse(8, 4, 3.5, 3.5, '#8a8a96'); p.ellipse(8, 4, 1.8, 1.8, '#00000000');
  for (const [x, y] of [[7, 3], [8, 3], [7, 4], [8, 4], [7, 5], [8, 5], [9, 4], [6, 4]]) p.erase(x, y);
  p.set(6, 1, '#c8c8d2');
  for (let x = 4; x < 12; x++) p.set(x, 9, '#d6e0ec'); // Schnee
  return { pix: p.outlined('#1a1612'), ox: 0, oy: -30 };
}
function cabin() {
  const p = new Pix(64, 58); shadow(p, 32, 55, 30, 3);
  p.rect(4, 26, 56, 30, '#6b4a2b');
  for (let y = 27; y < 56; y += 4) { p.hline(4, 59, y, '#8a6440'); p.hline(4, 59, y + 2, '#4a3018'); p.set(3, y + 1, '#8a6440'); p.set(60, y + 1, '#8a6440'); }
  p.rect(26, 38, 12, 18, '#3a2418'); p.rect(27, 39, 10, 17, '#5a3a22'); p.set(35, 47, PAL.fy);
  for (const x of [9, 44]) { p.rect(x, 34, 10, 8, '#3a2418'); p.rect(x + 1, 35, 8, 6, PAL.win1); p.set(x + 6, 36, PAL.win2); }
  for (let y = 0; y < 27; y++) { const hw = 6 + Math.round(y * 1.05); for (let x = 32 - hw; x < 32 + hw; x++) p.set(x, y, y < 3 || (x + y) % 9 === 0 ? '#ffffff' : y % 5 === 4 ? '#c9d4e2' : '#eef3f9'); }
  p.hline(2, 61, 26, '#a9b8cc');
  for (let x = 3; x < 61; x += 5) p.vline(x, 27, 27 + (x % 3), '#d6f2fc'); // Eiszapfen
  p.rect(46, 2, 6, 10, '#5b524b'); p.hline(46, 51, 2, '#ffffff');
  return { pix: p.outlined('#1a1410'), ox: 0, oy: -58 };
}
function iceChunk() {
  const p = new Pix(32, 22); shadow(p, 16, 20, 14);
  blob(p, 16, 12, 14, 9, [WPAL.ic0, WPAL.ic1, WPAL.ic2, WPAL.ic3], 31, 0.1);
  p.set(9, 7, '#ffffff'); p.set(10, 6, '#ffffff');
  return { pix: p.outlined('#2a5a7a'), ox: 0, oy: -22 };
}
function frozenAltar(full) {
  const frames = [0, 1].map((f) => {
    const p = new Pix(32, 34); shadow(p, 16, 32, 15);
    p.rect(3, 20, 26, 11, '#6a8aa8'); p.rect(1, 16, 30, 5, '#a9c8e0'); p.hline(1, 30, 16, '#eef3f9');
    for (let x = 5; x < 29; x += 5) p.vline(x, 22, 30, '#4a6a88');
    if (full) {
      for (let y = 1; y < 15; y++) { const w = y < 6 ? y * 0.7 : (15 - y) * 0.45; for (let x = Math.round(16 - w); x <= Math.round(16 + w); x++) p.set(x, y, x < 16 ? '#e0f8ff' : '#6ac8f0'); }
      if (f) { p.set(11, 4, '#ffffff'); p.set(21, 8, '#ffffff'); }
    }
    return p.outlined('#1a2a3a');
  });
  return { frames, ox: 0, oy: -34 };
}
function snowman() {
  const p = new Pix(16, 24); shadow(p, 8, 22, 6);
  p.ellipse(8, 17, 6, 5, '#eef3f9'); p.ellipse(8, 8, 4.5, 4, '#ffffff'); p.ellipse(7, 16, 3, 2, '#ffffff');
  p.set(6, 7, '#1a1a20'); p.set(10, 7, '#1a1a20'); p.set(8, 9, '#ff8a3a'); p.set(9, 9, '#e86a2a');
  p.rect(4, 1, 8, 3, '#2a2a34'); p.hline(3, 12, 4, '#2a2a34');
  for (const y of [14, 17]) p.set(8, y, '#3a3a44');
  return { pix: p.outlined('#5d6a7c'), ox: 0, oy: -24 };
}
function iceEntrance() {
  const p = new Pix(32, 32);
  p.ellipse(16, 22, 13, 16, '#1a3a5a'); p.rect(3, 22, 26, 10, '#1a3a5a');
  p.ellipse(16, 24, 9, 12, '#05121e'); p.rect(7, 24, 18, 8, '#05121e');
  for (let x = 4; x < 29; x += 3) { const l = 2 + ((x * 7) % 5); p.vline(x, 8, 8 + l, WPAL.ic2); p.set(x, 9 + l, WPAL.ic3); } // Eiszapfen
  p.hline(3, 28, 7, '#ffffff'); p.hline(4, 27, 8, WPAL.ic3);
  return p;
}
function ruinEntrance() {
  const p = new Pix(48, 40);
  p.rect(4, 6, 40, 34, WPAL.ru1); p.rect(2, 2, 44, 6, WPAL.ru2); p.hline(2, 45, 2, WPAL.ru3);
  for (let y = 10; y < 40; y += 6) p.hline(4, 43, y, WPAL.ru0);
  p.rect(14, 14, 20, 26, '#120a06'); p.ellipse(24, 14, 10, 6, '#120a06');
  p.ellipse(24, 6, 5, 3, '#ffd23f'); for (let i = 0; i < 7; i++) p.set(18 + i * 2, 2, '#ffe88a');
  for (const x of [6, 38]) { p.rect(x, 12, 4, 28, WPAL.ru2); p.vline(x, 12, 39, WPAL.ru3); }
  return p;
}

// ---------------------------------------------------------------- Gezeitentempel
function tPillar(v) {
  const p = new Pix(18, 42); shadow(p, 9, 40, 8);
  p.rect(1, 35, 16, 5, WPAL.tp1); p.hline(1, 16, 35, WPAL.tp3);
  for (let y = 6; y < 35; y++) for (let x = 3; x < 15; x++) p.set(x, y, x < 6 ? WPAL.tp3 : x % 3 === 0 ? WPAL.tp1 : WPAL.tp2);
  p.rect(1, 2, 16, 5, WPAL.tp2); p.hline(1, 16, 2, '#8ac0b4');
  for (let i = 0; i < 6; i++) p.set(4 + (i * 5) % 10, 10 + i * 4, '#7af0d8'); // leuchtende Runen
  if (v) { blob(p, 13, 30, 4, 4, ['#a83a5a', '#d85a7a', '#f08aa0'], 5, 0.2); blob(p, 5, 36, 3, 2.5, ['#c86a2a', '#e88a4a'], 6, 0.2); }
  else for (let y = 20; y < 36; y++) p.set(4 + Math.round(Math.sin(y / 2) * 1.5), y, '#3f8a5e');
  return { pix: p.outlined('#0a1a1c'), ox: -1, oy: -42 };
}
function coral(v) {
  const p = new Pix(16, 16); shadow(p, 8, 14, 6);
  const c = v ? ['#a83a5a', '#d85a7a', '#f8a0b8'] : ['#c86a2a', '#f08a3a', '#ffc070'];
  for (const [x, top] of [[5, 4], [8, 1], [11, 5], [3, 8], [13, 9]]) { for (let y = top; y < 14; y++) p.set(x + Math.round(Math.sin(y + x) * 0.7), y, y < top + 2 ? c[2] : c[1]); p.set(x, top, c[2]); }
  p.hline(4, 12, 13, c[0]);
  return { pix: p.outlined('#2a0e14'), ox: 0, oy: -16 };
}
function seaweed() {
  const frames = [0, 1, 2].map((f) => {
    const p = new Pix(16, 22);
    for (const [x0, h] of [[5, 18], [9, 21], [12, 14]]) for (let y = 0; y < h; y++) { const x = Math.round(x0 + Math.sin(y / 3 + f * 2.1) * (y / h) * 2); p.set(x, 21 - y, y % 4 ? '#3f8a5e' : '#5aa878'); }
    return p.outlined('#0e2a1e');
  });
  return { frames, ox: 0, oy: -22 };
}
function brazier() {
  const frames = [0, 1, 2].map((f) => {
    const p = new Pix(16, 26); shadow(p, 8, 24, 5);
    p.rect(6, 14, 4, 10, '#4a5a5a'); p.rect(3, 11, 10, 4, '#6a7a7a'); p.hline(3, 12, 11, '#8a9a9a');
    const fl = [[8, 2], [6, 5], [10, 4], [7, 7], [9, 8]];
    for (const [x, y] of fl) { const yy = y + ((f + x) % 3) - 1; p.vline(x, yy, 10, '#3ac8f0'); p.set(x, yy, '#c8f8ff'); }
    p.hline(5, 11, 10, '#6ae0ff');
    return p.outlined('#0a1a1c');
  });
  return { frames, ox: 0, oy: -26 };
}
function tideBars(f) {
  const p = new Pix(64, 40);
  for (let i = 0; i < 9; i++) { const x = 3 + i * 7; p.rect(x, 2, 3, 36, '#2e5254'); p.vline(x, 2, 37, f && i % 2 ? '#7af0d8' : '#62968e'); }
  p.rect(0, 8, 64, 3, '#1f3a3c'); p.rect(0, 30, 64, 3, '#1f3a3c'); p.hline(0, 63, 8, '#62968e'); p.hline(0, 63, 30, '#62968e');
  return p.outlined('#061012');
}
function pearlAltar() {
  const frames = [0, 1].map((f) => {
    const p = new Pix(32, 34); shadow(p, 16, 32, 15);
    p.rect(4, 20, 24, 11, WPAL.tp1); p.rect(2, 16, 28, 5, WPAL.tp2); p.hline(2, 29, 16, WPAL.tp3);
    blob(p, 16, 13, 7, 4, ['#c8a8d8', '#e8d8f0', '#f8f0ff'], 3, 0.05); // Muschel
    p.ellipse(16, 9, 4, 4, f ? '#ffffff' : '#e8f8ff'); p.ellipse(15, 8, 1.5, 1.5, '#ffffff');
    return p.outlined('#0a1a1c');
  });
  return { frames, ox: 0, oy: -34 };
}
function templeEntrance() {
  const p = new Pix(48, 40);
  p.rect(4, 8, 40, 32, WPAL.tp1); p.rect(2, 3, 44, 6, WPAL.tp2); p.hline(2, 45, 3, WPAL.tp3);
  for (let y = 12; y < 40; y += 6) p.hline(4, 43, y, WPAL.tp0);
  p.rect(14, 16, 20, 24, '#020608'); p.ellipse(24, 16, 10, 6, '#020608');
  p.ellipse(24, 7, 4, 2.5, '#7af0d8');
  return p;
}
function boatSprite() {
  const p = new Pix(40, 22);
  p.ellipse(20, 15, 18, 5, '#00000030');
  for (let y = 6; y < 16; y++) { const hw = 18 - (y - 6) * 0.9; for (let x = Math.round(20 - hw); x <= Math.round(20 + hw); x++) p.set(x, y, y === 6 ? '#b07a4a' : y < 9 ? '#8a5a32' : y < 13 ? '#6b4228' : '#4a2c18'); }
  p.rect(6, 7, 28, 2, '#5a3a20'); p.rect(17, 5, 6, 3, '#c9a26a');
  p.hline(4, 35, 11, '#e8e0d0'); // frische Planke
  return p;
}

// ---------------------------------------------------------------- Registrierung
export function buildArc2Art(art) {
  const t = art.tiles;
  t.dune = [0, 1, 2].map((v) => dune(v).canvas());
  t.qsand = [0, 1, 2, 3].map((f) => [0, 1].map((v) => qsand(v, f).canvas()));
  t.ruin = [0, 1, 2].map((v) => ruinFloor(v).canvas());
  t.ice = [0, 1, 2].map((v) => ice(v).canvas());
  t.chasm = [0, 1].map((v) => chasm(v).canvas());
  t.temple = [0, 1, 2].map((v) => templeFloor(v).canvas());
  [0, 1].forEach((v) => reg(art, 'cactus' + v, cactus(v)));
  [0, 1].forEach((v) => reg(art, 'adobe' + v, adobe(v)));
  reg(art, 'stall', stall());
  reg(art, 'obelisk', obelisk());
  [0, 1].forEach((v) => reg(art, 'ruinpillar' + v, ruinPillar(v)));
  reg(art, 'ruinblock', ruinBlock());
  reg(art, 'sunhead', sunHead());
  reg(art, 'sunaltar', sunAltar(true)); reg(art, 'sunaltar_empty', sunAltar(false));
  reg(art, 'barrier', barrier());
  reg(art, 'sandgate', { frames: [0, 1].map(sandGate), ox: 0, oy: -36 });
  [0, 1].forEach((v) => reg(art, 'icespike' + v, iceSpike(v)));
  reg(art, 'hookpost', hookPost());
  reg(art, 'cabin', cabin());
  reg(art, 'icechunk', iceChunk());
  reg(art, 'frostaltar', frozenAltar(true)); reg(art, 'frostaltar_empty', frozenAltar(false));
  reg(art, 'snowman', snowman());
  [0, 1].forEach((v) => reg(art, 'tpillar' + v, tPillar(v)));
  [0, 1].forEach((v) => reg(art, 'coral' + v, coral(v)));
  reg(art, 'seaweed', seaweed());
  reg(art, 'brazier', brazier());
  reg(art, 'tidebars', { frames: [0, 1].map(tideBars), ox: 0, oy: -36 });
  reg(art, 'pearlaltar', pearlAltar());
  reg(art, 'boat2', { pix: boatSprite(), ox: -12, oy: -18 });
  const d = art.decals;
  d.icecave_entrance = iceEntrance().canvas();
  d.ruin_entrance = ruinEntrance().canvas();
  d.temple_entrance = templeEntrance().canvas();
  d.skull = (() => { const p = new Pix(12, 9); p.ellipse(6, 4, 4, 3.5, '#e8e0d0'); p.set(4, 4, '#3a2a20'); p.set(8, 4, '#3a2a20'); p.hline(5, 7, 7, '#cfc6b4'); p.set(1, 2, '#e8e0d0'); p.set(11, 2, '#e8e0d0'); p.set(0, 1, '#e8e0d0'); return p.canvas(); })();
  d.ripples = (() => { const p = new Pix(32, 10); for (let k = 0; k < 3; k++) for (let x = 0; x < 32; x++) { const y = 2 + k * 3 + Math.round(Math.sin(x / 4 + k) * 1); if ((x + k) % 7 < 5) p.set(x, y, WPAL.du0); } return p.canvas(); })();
  d.snowdrift = (() => { const p = new Pix(28, 10); p.ellipse(14, 6, 13, 4, '#eef3f9'); p.ellipse(11, 5, 7, 2.5, '#ffffff'); p.hline(3, 25, 9, '#a9b8cc'); return p.canvas(); })();
  d.tidepool = (() => { const p = new Pix(24, 14); p.ellipse(12, 7, 11, 6, '#1f3a3c'); p.ellipse(12, 7, 9, 4.5, '#2a7a8a'); p.ellipse(10, 6, 4, 2, '#5ac0d0'); p.set(8, 5, '#c8f8ff'); return p.canvas(); })();
  d.footprints = (() => { const p = new Pix(16, 16); for (const [x, y] of [[3, 3], [9, 6], [4, 10], [10, 13]]) { p.set(x, y, '#c98f4e'); p.set(x + 1, y, '#c98f4e'); p.set(x, y + 1, '#c98f4e'); } return p.canvas(); })();
}
