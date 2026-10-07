// Zusätzliche Pixel-Art für Phase 3: offene Truhe, Lager (Zelt, Lagerfeuer), Steinmännchen,
// Baumstamm, Erzadern, Bergblumen, verschlossene Truhe.
import { PAL, Pix } from './pix.js';
import { APAL } from './tiles-areas.js';

const reg = (art, name, s) => {
  const base = s.frames ? s.frames[0] : s.pix;
  art.sprites[name] = { canvas: base.canvas(), frames: s.frames ? s.frames.map((f) => f.canvas()) : null, ox: s.ox, oy: s.oy, w: base.w, h: base.h };
};

function chestOpen(locked) {
  const p = new Pix(14, 14);
  p.rect(0, 4, 14, 10, PAL.wd2); p.hline(0, 13, 13, PAL.wd0);
  p.rect(1, 5, 12, 3, '#20140c'); // Innenraum
  p.rect(0, 0, 14, 4, PAL.wd1); p.hline(1, 12, 0, PAL.wd3); p.hline(0, 13, 3, PAL.wd0); // Deckel hochgeklappt
  p.vline(3, 0, 13, '#7a7a86'); p.vline(10, 0, 13, '#7a7a86');
  p.set(5, 6, '#ffd23f'); p.set(8, 6, '#fff3a6');
  return { pix: p.outlined(), ox: 0, oy: -16 };
}
function chestLocked() {
  const p = new Pix(14, 12);
  p.rect(0, 2, 14, 10, '#5a4a6a'); p.rect(0, 0, 14, 5, '#6e5a82'); p.hline(1, 12, 0, '#8a76a0');
  p.hline(0, 13, 5, '#3a2e48'); p.vline(3, 0, 11, '#d9a63a'); p.vline(10, 0, 11, '#d9a63a');
  p.rect(5, 4, 4, 4, '#d9a63a'); p.set(6, 5, '#20161a'); p.set(7, 5, '#20161a'); p.set(6, 6, '#20161a');
  p.hline(0, 13, 11, '#3a2e48');
  return { pix: p.outlined(), ox: 0, oy: -14 };
}
function chestLockedOpen() {
  const p = new Pix(14, 14);
  p.rect(0, 4, 14, 10, '#5a4a6a'); p.hline(0, 13, 13, '#3a2e48');
  p.rect(1, 5, 12, 3, '#160e1c');
  p.rect(0, 0, 14, 4, '#6e5a82'); p.hline(1, 12, 0, '#8a76a0'); p.hline(0, 13, 3, '#3a2e48');
  p.vline(3, 0, 13, '#d9a63a'); p.vline(10, 0, 13, '#d9a63a');
  return { pix: p.outlined(), ox: 0, oy: -16 };
}
function tent() {
  const p = new Pix(34, 26);
  p.ellipse(17, 24, 16, 2.5, '#00000040');
  for (let y = 2; y < 24; y++) {
    const hw = (y - 2) * 0.75;
    for (let x = Math.round(17 - hw); x <= Math.round(17 + hw); x++) p.set(x, y, x < 17 ? '#b8743a' : '#8a5426');
  }
  for (let y = 10; y < 24; y++) { const hw = (y - 10) * 0.32; for (let x = Math.round(17 - hw); x <= Math.round(17 + hw); x++) p.set(x, y, '#2a1810'); }
  for (let i = 0; i < 22; i++) { p.set(Math.round(17 - i * 0.75), 2 + i, '#d89a5a'); }
  p.vline(17, 0, 3, PAL.wd1); p.set(18, 0, '#e83b3b'); p.set(19, 1, '#e83b3b'); p.set(18, 1, '#c42a35');
  for (const x of [3, 31]) { p.set(x, 23, PAL.wd0); p.set(x, 22, PAL.wd1); }
  return { pix: p.outlined(), ox: -1, oy: -26 };
}
function campfire(frames = 3) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pix(16, 16);
    for (const [x, y] of [[2, 13], [4, 14], [7, 14], [10, 14], [12, 13], [13, 11], [1, 11]]) { p.set(x, y, '#7f8696'); p.set(x + 1, y, '#555a69'); }
    p.hline(3, 12, 12, PAL.wd1); p.hline(4, 11, 13, PAL.wd0);
    p.set(3, 11, PAL.wd2); p.set(12, 11, PAL.wd2);
    const h = [8, 9, 7][f];
    for (let y = 0; y < h; y++) {
      const hw = Math.max(0, 3.6 * (1 - y / h)) + ((y + f) % 2) * 0.5;
      for (let x = Math.round(8 - hw); x <= Math.round(7.5 + hw); x++) p.set(x + ((y + f) % 3 === 0 ? 1 : 0) - 0.5, 11 - y, y < h * 0.35 ? '#ff7a2a' : y < h * 0.7 ? '#ffb83a' : '#fff1a6');
    }
    p.set(6 + f, 1 + (f % 2), '#ffb83a');
    out.push(p);
  }
  return { frames: out, ox: 0, oy: -16 };
}
function log() {
  const p = new Pix(30, 12);
  p.ellipse(15, 10, 14, 2, '#00000040');
  p.rect(4, 2, 22, 7, PAL.wd2); p.hline(4, 25, 2, PAL.wd3); p.hline(4, 25, 8, PAL.wd0);
  for (const x of [8, 14, 19]) p.vline(x, 3, 7, PAL.wd1);
  p.ellipse(4, 5.5, 3, 3.5, PAL.d2); p.ellipse(4, 5.5, 1.6, 2, PAL.d1); p.set(4, 5, PAL.wd1);
  p.set(16, 1, '#4e9a45'); p.set(17, 1, '#66b350'); p.set(22, 1, '#4e9a45');
  return { pix: p.outlined(), ox: 0, oy: -12 };
}
function cairn() {
  const p = new Pix(14, 18);
  p.ellipse(7, 16, 6, 1.6, '#00000040');
  const stone = (cx, cy, rx, ry) => { p.ellipse(cx, cy, rx, ry, APAL.rk1); p.ellipse(cx - 0.6, cy - 0.6, rx - 1, ry - 0.8, APAL.rk2); p.set(Math.round(cx - rx / 2), Math.round(cy - ry / 2), APAL.rk3); };
  stone(7, 14, 6, 2.6); stone(7, 10, 4.6, 2.2); stone(7, 6.5, 3.4, 1.8); stone(7, 3.5, 2.2, 1.4);
  return { pix: p.outlined(), ox: 1, oy: -18 };
}
function deadBush() {
  const p = new Pix(14, 12);
  p.ellipse(7, 11, 5, 1.2, '#00000035');
  const c = '#8a6a4a';
  for (const [x0, dx] of [[7, 0], [7, -1], [7, 1]]) for (let i = 0; i < 7; i++) p.set(x0 + Math.round(dx * i * 0.7), 10 - i, c);
  for (const [x, y] of [[3, 5], [4, 6], [11, 4], [10, 5], [6, 3], [8, 2], [2, 7], [12, 7]]) p.set(x, y, '#a88a66');
  return { pix: p.outlined(), ox: 1, oy: -12 };
}
function oreVein() {
  const p = new Pix(16, 12);
  p.ellipse(8, 7, 7, 4.5, APAL.rk0); p.ellipse(7, 6, 6, 3.6, APAL.rk1); p.ellipse(6, 5, 3, 1.6, APAL.rk2);
  for (const [x, y] of [[4, 6], [8, 5], [10, 8], [6, 8], [11, 6]]) { p.set(x, y, '#c46a3a'); p.set(x + 1, y, '#e8a070'); }
  return p.outlined('#2a2420');
}
function edelweiss() {
  const p = new Pix(10, 8);
  const fl = (cx, cy) => { for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [-1, 1]]) p.set(cx + dx, cy + dy, '#f4f8fc'); p.set(cx, cy, '#ffd23f'); };
  p.set(3, 6, '#5a8a4a'); p.set(7, 7, '#5a8a4a'); p.set(4, 7, '#5a8a4a');
  fl(3, 3); fl(7, 5);
  return p;
}
function heather() {
  const p = new Pix(12, 8);
  for (const [x, y] of [[2, 4], [3, 3], [4, 5], [6, 2], [7, 4], [9, 3], [8, 5], [5, 4]]) { p.set(x, y, '#b685e6'); p.set(x, y + 1, '#8a5ac0'); p.set(x, y + 2, '#4e7a3a'); }
  return p;
}

export function buildExtraArt(art) {
  reg(art, 'chest_open', chestOpen());
  reg(art, 'chest_locked', chestLocked());
  reg(art, 'chest_locked_open', chestLockedOpen());
  reg(art, 'tent', tent());
  reg(art, 'campfire', campfire());
  reg(art, 'log', log());
  reg(art, 'cairn', cairn());
  reg(art, 'deadbush', deadBush());
  art.decals.orevein = oreVein().canvas();
  art.decals.edelweiss = edelweiss().canvas();
  art.decals.heather = heather().canvas();
}
