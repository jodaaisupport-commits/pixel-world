// Pixel-Art für die neuen Gebiete (Dunkelwald, Berge, Küste, Höhle) und Innenräume.
import { PAL, Pix, ri, canopy, trunk, ROOFS } from './pix.js';
import { mulberry32 } from './noise.js';

export const APAL = {
  dg0: '#18302c', dg1: '#21423a', dg2: '#2c5747', dg3: '#3f7158',
  df0: '#0f1d1a', df1: '#162a25', df2: '#1f3a31', df3: '#4b3a55',
  sw0: '#163c3e', sw1: '#24585a', sw2: '#33706c', sw3: '#5f9a86', sw4: '#a8d8b0',
  rk0: '#5b524b', rk1: '#7d7368', rk2: '#958a7d', rk3: '#b3a999',
  sn0: '#a9b8cc', sn1: '#d6e0ec', sn2: '#f4f8fc',
  cv0: '#2f2936', cv1: '#3e3646', cv2: '#4e4558', cv3: '#625870',
  fl0: '#4a4744', fl1: '#66625d', fl2: '#7c7771', fl3: '#938d86',
};

const reg = (art, name, s) => {
  const base = s.frames ? s.frames[0] : s.pix;
  art.sprites[name] = { canvas: base.canvas(), frames: s.frames ? s.frames.map((f) => f.canvas()) : null, ox: s.ox, oy: s.oy, w: base.w, h: base.h };
};

// ---------------------------------------------------------------- Boden
function speck(seed, base, specks) {
  const r = mulberry32(seed);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, base);
  for (const [c, n, kind] of specks)
    for (let k = 0; k < n; k++) {
      const x = ri(r, 0, 14), y = ri(r, 1, 14);
      if (kind === 'tuft') { p.set(x, y, c); p.set(x + 1, y - 1, c); p.set(x + 2, y, c); }
      else if (kind === 'pebble') { p.set(x, y, c); p.set(x + 1, y, c); p.set(x, y + 1, '#00000030'); p.set(x + 1, y + 1, '#00000040'); }
      else if (kind === 'dash') { p.hline(x, x + 1 + (k % 2), y, c); }
      else p.set(x, y, c);
    }
  return p;
}

function swampTile(v, f) {
  const r = mulberry32(1300 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, APAL.sw1);
  for (let k = 0; k < 4; k++) {
    const x = ri(r, 0, 15), y = ri(r, 0, 15), len = ri(r, 2, 4), ph = r() * 6.28;
    const off = Math.round(Math.sin(ph + f * 1.57));
    p.hline(x + off, x + off + len, y, APAL.sw2);
    if (k === 0) p.set(x + off + 1, y, APAL.sw3);
  }
  if ((f + v) % 4 === 1) { const x = ri(r, 3, 12), y = ri(r, 3, 12); p.set(x, y, APAL.sw4); p.set(x + 1, y - 1, APAL.sw3); }
  return p;
}

function woodFloor(v, pal) {
  const r = mulberry32(1400 + v);
  const p = new Pix(16, 16);
  for (let row = 0; row < 4; row++) {
    const y0 = row * 4, joint = (ri(r, 2, 13) + row * 5) % 16;
    for (let y = y0; y < y0 + 4; y++)
      for (let x = 0; x < 16; x++) {
        let c = y === y0 ? pal[2] : y === y0 + 3 ? pal[0] : pal[1];
        if (x === joint && y !== y0 + 3) c = pal[0];
        p.set(x, y, c);
      }
    for (let k = 0; k < 2; k++) p.set(ri(r, 0, 15), y0 + ri(r, 1, 2), pal[3]);
  }
  return p;
}

function flagFloor(v) {
  const r = mulberry32(1500 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, APAL.fl0);
  const blocks = v ? [[0, 0, 9, 7], [10, 0, 6, 7], [0, 8, 5, 8], [6, 8, 10, 8]] : [[0, 0, 6, 8], [7, 0, 9, 8], [0, 9, 10, 7], [11, 9, 5, 7]];
  for (const [x, y, w, h] of blocks) {
    const c = r() < 0.3 ? APAL.fl1 : APAL.fl2;
    p.rect(x, y, w - 1, h - 1, c);
    p.hline(x, x + w - 2, y, APAL.fl3);
    if (r() < 0.5) p.set(x + ri(r, 1, w - 3), y + ri(r, 2, h - 3), APAL.fl1);
  }
  return p;
}

function matTile(floorPix, col) {
  const p = new Pix(16, 16);
  p.d.set(floorPix.d);
  p.rect(1, 3, 14, 11, col[0]);
  p.rect(2, 4, 12, 9, col[1]);
  for (let x = 3; x < 13; x += 2) p.vline(x, 5, 11, col[0]);
  p.hline(1, 14, 14, '#00000040');
  return p;
}

// ---------------------------------------------------------------- erhabene Tiles
// Jeder Stil liefert top/faceU/faceL-Varianten (Draufsicht, obere und untere Front).
function rockFace(pal, v, lower, seed) {
  const r = mulberry32(seed + v * 13 + (lower ? 7 : 0));
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, pal.face);
  let x = 0;
  while (x < 16) {
    const w = ri(r, 3, 6);
    p.vline(x, 0, 15, pal.faceL);
    if (w > 3) p.vline(x + 1, ri(r, 2, 8), ri(r, 9, 15), pal.faceL);
    p.vline(Math.min(15, x + w - 1), 0, 15, pal.faceD);
    x += w;
  }
  for (let k = 0; k < 3; k++) { const cx = ri(r, 0, 12), cy = ri(r, 2, 13); p.hline(cx, cx + ri(r, 1, 3), cy, pal.faceD); p.set(cx, cy - 1, pal.faceL); }
  if (!lower) { p.hline(0, 15, 0, pal.ledge); p.hline(0, 15, 1, pal.faceL); p.hline(0, 15, 2, pal.faceD); }
  else {
    p.hline(0, 15, 14, pal.faceD); p.hline(0, 15, 15, pal.base);
    if (pal.moss) for (let k = 0; k < 4; k++) { const mx = ri(r, 0, 14); p.set(mx, 13, pal.moss); p.set(mx + 1, 13, pal.moss); p.set(mx, 12, pal.moss); }
  }
  return p;
}
function rockTop(pal, v, seed) {
  const r = mulberry32(seed + 100 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, pal.top);
  for (let k = 0; k < 9; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), r() < 0.5 ? pal.topD : pal.topL);
  if (v === 2 || v === 3) { // Felsbrocken / Riss
    const x = ri(r, 2, 10), y = ri(r, 3, 11);
    p.rect(x, y, 4, 3, pal.topL); p.hline(x, x + 3, y, pal.ledge || pal.topL); p.hline(x, x + 3, y + 3, pal.topD); p.set(x + 4, y + 1, pal.topD); p.set(x + 4, y + 2, pal.topD);
    if (v === 3) { let cx = ri(r, 1, 6), cy = ri(r, 1, 4); for (let i = 0; i < 7; i++) { p.set(cx, cy, pal.topD); cx += 1; cy += r() < 0.5 ? 1 : 0; } }
  }
  if (pal.tuft && v === 1) for (let k = 0; k < 2; k++) { const x = ri(r, 2, 12), y = ri(r, 3, 13); p.set(x, y, pal.tuft); p.set(x + 1, y - 1, pal.tuftL); p.set(x + 2, y, pal.tuft); }
  if (pal.snowTop && v !== 1) for (let k = 0; k < 10; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), APAL.sn1);
  return p;
}
function wallFace(st, lower) {
  const p = new Pix(16, 16);
  if (st.brick) {
    p.rect(0, 0, 16, 16, st.paper);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4), off = row % 2 ? 4 : 0;
      if (y % 4 === 3 || (x + off) % 8 === 0) p.set(x, y, st.paperD);
      else if (y % 4 === 0) p.set(x, y, st.paperL);
    }
    if (!lower) { p.rect(0, 0, 16, 3, st.beam); p.hline(0, 15, 3, '#00000055'); }
    else { p.hline(0, 15, 14, '#00000040'); p.hline(0, 15, 15, st.base); for (let x = 0; x < 16; x += 3) p.set(x, 13, '#00000030'); }
    return p;
  }
  p.rect(0, 0, 16, 16, st.paper);
  for (let x = 0; x < 16; x++) if (x % 4 === 1) p.vline(x, 0, 15, st.paperD);
  if (st.dots) for (let y = 2; y < 16; y += 5) for (let x = (y % 2) * 2 + 1; x < 16; x += 4) { p.set(x, y, st.dots); p.set(x + 1, y + 1, st.paperD); }
  if (!lower) { p.rect(0, 0, 16, 3, st.beam); p.hline(0, 15, 2, st.beamD); p.hline(0, 15, 3, '#00000040'); }
  else {
    p.rect(0, 6, 16, 10, st.wood);
    p.hline(0, 15, 6, st.woodL); p.hline(0, 15, 7, st.woodD);
    for (let x = 0; x < 16; x += 4) p.vline(x, 8, 14, st.woodD);
    p.hline(0, 15, 15, st.base); p.hline(0, 15, 5, '#00000030');
  }
  return p;
}
function plainTop(c, cl) { const p = new Pix(16, 16); p.rect(0, 0, 16, 16, c); if (cl) { p.set(4, 5, cl); p.set(11, 10, cl); } return p; }

export const ROCK_STYLES = {
  cliff: { top: '#8c8173', topL: '#a39888', topD: '#73695e', face: '#6f6458', faceL: '#8a7e70', faceD: '#4f463e', ledge: '#b5aa99', base: '#3a332d', moss: '#4e7a45', tuft: '#5e8a4a', tuftL: '#7aa860', rim: '#4a423a' },
  cliffSnow: { top: '#c9d4e2', topL: '#eef3f9', topD: '#a9b8cc', face: '#6f6a6a', faceL: '#8c8787', faceD: '#4c4848', ledge: '#f4f8fc', base: '#383434', rim: '#5d6a7c', snowTop: true },
  cave: { top: '#0d0a11', topL: '#15111a', topD: '#08060b', face: '#4a3f55', faceL: '#665a74', faceD: '#2c2533', ledge: '#8a7aa0', base: '#16121a', rim: '#5a4c6a' },
};
export const WALL_STYLES = {
  taverne: { paper: '#8a4a3a', paperD: '#7a3f31', beam: '#4a2e1c', beamD: '#2e1c11', wood: '#5a3a22', woodL: '#7d5432', woodD: '#3d2616', base: '#24160d', dots: null, top: '#24170f' },
  kraemer: { paper: '#5e7a52', paperD: '#526c47', beam: '#5a3a22', beamD: '#3d2616', wood: '#7a5232', woodL: '#9a6a40', woodD: '#55371f', base: '#2e1d10', dots: '#7a9a68', top: '#2b1d14' },
  zuhause: { paper: '#d9c9a3', paperD: '#cbb98f', beam: '#6a4426', beamD: '#4a2e18', wood: '#8c5e36', woodL: '#b07e4c', woodD: '#5e3d22', base: '#3a2616', dots: '#c98a8a', top: '#2d1f17' },
  schmiede: { brick: true, paper: '#6e6a66', paperL: '#86817c', paperD: '#4f4b48', beam: '#3a2a20', base: '#1d1a18', top: '#1e1b19' },
};
const FLOOR_PALS = {
  taverne: ['#5a3a22', '#7a5030', '#8e6038', '#9e6e42'],
  kraemer: ['#6b4429', '#8a5a36', '#a06a40', '#b8804f'],
  zuhause: ['#7a5636', '#9c7046', '#b38452', '#c49660'],
};

// ---------------------------------------------------------------- Bäume & Natur
function darkOak(v) {
  const r = mulberry32(2100 + v);
  const p = new Pix(32, 36);
  p.ellipse(16, 32.5, 10, 3.2, '#00000055');
  trunk(p, 16, 18, 31);
  const clumps = [];
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + r() * 0.4;
    const y = 13 + Math.sin(a) * 5.8;
    clumps.push({ x: 16 + Math.cos(a) * 7.2, y, r: 5 + r() * 1.6, bias: -(y - 13) / 22 });
  }
  clumps.push({ x: 14, y: 11, r: 7, bias: 0.15 }, { x: 19, y: 9, r: 5, bias: 0.25 });
  canopy(p, clumps, ['#0b2124', '#123232', '#1a4640', '#285e52', '#4f8d76'], '#071214');
  if (v === 1) for (const [x, y] of [[10, 10], [22, 14], [15, 6]]) { p.set(x, y, '#9be0ff'); }
  return { pix: p, ox: -8, oy: -34 };
}
function deadTree() {
  const p = new Pix(28, 36);
  p.ellipse(14, 33, 8, 2.5, '#00000055');
  const c = ['#2a221f', '#3e3330', '#5a4c46'];
  p.rect(12, 14, 4, 19, c[1]); p.vline(12, 14, 32, c[0]); p.vline(13, 16, 31, c[2]);
  const br = (x, y, dx, dy, n) => { for (let i = 0; i < n; i++) { p.set(x, y, c[1]); p.set(x, y + 1, c[0]); x += dx; y += dy; if (i % 3 === 2) dy = 0; } };
  br(13, 16, -1, -1, 9); br(14, 14, 1, -1, 10); br(13, 12, 0, -1, 8); br(12, 22, -1, -1, 6); br(15, 20, 1, -1, 7); br(6, 9, -1, -1, 3); br(22, 6, 1, -1, 3);
  return { pix: p.outlined('#0a0809'), ox: -7, oy: -36 };
}
function glowShroom(v) {
  const p = new Pix(14, 12);
  const cap = v ? ['#3fb6c9', '#8ef0ff'] : ['#9a5ad6', '#e3b2ff'];
  for (const [x, y, s] of [[3, 6, 2], [8, 4, 3], [11, 8, 1.6]]) {
    p.vline(x, y, 11, '#d8d0c0');
    p.ellipse(x + 0.5, y, s + 0.5, s * 0.7 + 0.4, cap[0]);
    p.set(x, y - 1, cap[1]); p.set(x - 1, y, cap[1]);
  }
  return { pix: p, ox: 1, oy: -12 };
}
function pillar(v) {
  const p = new Pix(14, 30);
  p.ellipse(7, 28, 6, 2, '#00000050');
  const top = v ? 10 : 2;
  p.rect(2, top, 10, 27 - top, PAL.st1);
  for (let y = top; y < 27; y++) { p.set(2, y, PAL.st2); p.set(3, y, PAL.st2); p.set(11, y, PAL.st0); if (y % 6 === 0) p.hline(2, 11, y, PAL.st0); }
  p.rect(1, 25, 12, 3, PAL.st2); p.hline(1, 12, 27, PAL.st0);
  if (!v) { p.rect(1, 1, 12, 3, PAL.st2); p.hline(1, 12, 3, PAL.st0); }
  else { p.set(3, top - 1, PAL.st1); p.set(4, top - 2, PAL.st1); p.set(8, top - 1, PAL.st1); }
  for (const [x, y] of [[3, 20], [4, 21], [9, 15], [10, 16], [5, 26]]) p.set(x, y, '#3f7a4a');
  return { pix: p.outlined(), ox: 0, oy: -31 };
}
function shrine() {
  const p = new Pix(30, 22);
  p.ellipse(15, 20, 14, 2.5, '#00000050');
  p.rect(1, 8, 28, 12, PAL.st1); p.hline(1, 28, 8, PAL.st2); p.hline(1, 28, 19, PAL.st0);
  for (let x = 1; x < 29; x += 7) p.vline(x, 9, 18, PAL.st0);
  p.rect(5, 1, 20, 8, PAL.st2); p.hline(5, 24, 1, PAL.st3); p.hline(5, 24, 8, PAL.st0);
  const rune = '#c48cff';
  for (const [x, y] of [[14, 3], [15, 3], [13, 4], [16, 4], [14, 5], [15, 5], [14, 6], [15, 6]]) p.set(x, y, rune);
  p.set(14, 4, '#f3e2ff'); p.set(15, 4, '#f3e2ff');
  for (const [x, y] of [[3, 17], [4, 16], [25, 14], [26, 15]]) p.set(x, y, '#3f7a4a');
  return { pix: p.outlined(), ox: 0, oy: -23 };
}
function cauldron(frames = 3) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pix(16, 16);
    p.ellipse(8, 14.5, 7, 1.6, '#00000050');
    p.vline(3, 11, 14, '#222'); p.vline(12, 11, 14, '#222');
    p.ellipse(8, 9.5, 6.5, 5, '#2e2a33'); p.ellipse(7, 8.5, 4, 3, '#3e3946');
    p.ellipse(8, 6, 6, 2, '#1b1820'); p.ellipse(8, 6, 5, 1.4, '#62d36a');
    p.set(5 + f * 2, 5, '#c4ffb0'); p.set(9 - f, 6, '#a6f59a');
    p.set(6 + f, 3 - (f % 2), '#9de88f'); p.set(10 - f, 2, '#7ccf75');
    out.push(p.outlined());
  }
  return { frames: out, ox: -1, oy: -17 };
}
function snowPine(v) {
  const p = new Pix(28, 40);
  p.ellipse(14, 36.5, 8, 2.8, '#00000040');
  trunk(p, 14, 28, 35, 4);
  const tiers = v === 0 ? [[3, 8], [9, 11], [16, 13], [23, 13]] : [[2, 7], [7, 9], [13, 11], [19, 13], [25, 13]];
  const cols = [PAL.p0, PAL.p1, PAL.p2, PAL.p3];
  for (const [ty, hw] of tiers)
    for (let y = ty; y < ty + 9; y++) {
      const t = (y - ty) / 8, w = Math.max(1, Math.round(hw * (0.25 + 0.75 * t)));
      for (let x = 14 - w; x < 14 + w; x++) {
        const rel = (x + 0.5 - 14) / w;
        let c = cols[rel < -0.35 ? 3 : rel < 0.25 ? 2 : 1];
        if (y === ty + 8) c = cols[0];
        if (y - ty < 2 + (x % 3 === 0 ? 1 : 0) || (y === ty + 7 && x % 4 === 1)) c = rel < 0.3 ? APAL.sn2 : APAL.sn1;
        p.set(x, y, c);
      }
    }
  return { pix: p.outlined('#0d1f1a'), ox: -7, oy: -39 };
}
function boulder() {
  const p = new Pix(30, 22);
  p.ellipse(15, 19, 14, 3, '#00000050');
  for (let y = 0; y < 20; y++) for (let x = 0; x < 30; x++) {
    const dx = (x + 0.5 - 15) / 14, dy = (y + 0.5 - 12) / 9;
    if (dx * dx + dy * dy > 1 || y > 19) continue;
    const l = -(dx * 0.6 + dy * 0.8) + ((x * 7 + y * 3) % 5) * 0.03;
    p.set(x, y, l > 0.55 ? APAL.rk3 : l > 0.05 ? APAL.rk2 : l > -0.45 ? APAL.rk1 : APAL.rk0);
  }
  for (const [x, y] of [[12, 8], [13, 9], [13, 10], [20, 12], [21, 13]]) p.set(x, y, APAL.rk0);
  for (let x = 6; x < 13; x++) p.set(x, 4 + Math.abs(x - 9) / 2, APAL.sn2);
  return { pix: p.outlined(), ox: 0, oy: -22 };
}
function palm(v) {
  const p = new Pix(40, 48);
  p.ellipse(20, 45, 10, 2.6, '#00000045');
  const lean = v ? -1 : 1;
  // geschwungener, segmentierter Stamm
  for (let y = 44; y > 14; y--) {
    const t = (44 - y) / 30;
    const cx = 20 + Math.round(lean * t * t * 7);
    p.hline(cx - 2, cx + 1, y, y % 4 === 0 ? '#7a5a36' : '#a07a4c');
    p.set(cx - 2, y, '#5e4428'); p.set(cx + 1, y, y % 4 === 0 ? '#5e4428' : '#c2955e');
  }
  const top = { x: 20 + lean * 7, y: 14 };
  // Wedel
  const frond = (ang, len) => {
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const x = top.x + Math.cos(ang) * i, y = top.y + Math.sin(ang) * i + t * t * 6;
      p.set(x, y, '#2f7a3a'); p.set(x, y - 1, '#4a9a44');
      if (i % 2 === 0 && i > 2) { p.set(x, y + 1, '#24602e'); p.set(x + Math.sin(ang), y + 2, '#2f7a3a'); }
    }
  };
  for (const [a, l] of [[-2.9, 15], [-2.3, 13], [-1.6, 9], [-0.8, 13], [-0.25, 15], [0.35, 12], [2.7, 11], [1.9, 7], [1.2, 7]]) frond(a, l);
  p.ellipse(top.x - 1, top.y + 2, 2.5, 2, '#6b4a2b'); p.set(top.x - 2, top.y + 1, '#9c7046'); p.set(top.x + 1, top.y + 3, '#6b4a2b');
  return { pix: p.outlined('#163421'), ox: -12, oy: -47 };
}
function hut() {
  const p = new Pix(48, 50);
  p.rect(3, 26, 42, 24, '#b08454');
  for (let x = 3; x < 45; x += 4) p.vline(x, 26, 49, '#8a6440');
  p.hline(3, 44, 26, '#6b4a2b');
  p.rect(19, 34, 10, 16, '#4a3020'); p.rect(20, 35, 8, 15, '#6b4a2b'); p.set(26, 42, PAL.fy);
  p.rect(7, 32, 8, 7, '#4a3020'); p.rect(8, 33, 6, 5, PAL.win1); p.set(12, 34, PAL.win2);
  p.rect(33, 32, 8, 7, '#4a3020'); p.rect(34, 33, 6, 5, PAL.win1); p.set(38, 34, PAL.win2);
  for (let y = 0; y < 27; y++) {
    const hw = Math.round(8 + y * 0.62 + 6);
    for (let x = 24 - hw; x < 24 + hw; x++) p.set(x, y, (y + (x % 3)) % 4 === 0 ? '#b8923a' : y % 4 === 3 ? '#a07a2e' : '#d9b55a');
  }
  p.hline(0, 47, 26, '#8a6a26');
  for (let x = 2; x < 46; x += 3) p.set(x, 27, '#c9a24a');
  return { pix: p.outlined(), ox: -1, oy: -51 };
}
function lighthouse() {
  const p = new Pix(32, 84);
  p.ellipse(16, 81, 15, 3, '#00000050');
  for (let y = 22; y < 78; y++) {
    const t = (y - 22) / 56, hw = Math.round(7 + t * 5);
    const band = Math.floor((y - 22) / 9) % 2;
    for (let x = 16 - hw; x < 16 + hw; x++) {
      const rel = (x - (16 - hw)) / (2 * hw);
      const base = band ? ['#b8382f', '#d9564a', '#8a2620'] : ['#e8e4dc', '#fbf8f2', '#bdb6aa'];
      p.set(x, y, rel < 0.3 ? base[1] : rel > 0.75 ? base[2] : base[0]);
    }
  }
  p.rect(5, 76, 22, 6, PAL.st1); p.hline(5, 26, 76, PAL.st2);
  p.rect(13, 64, 6, 12, '#4a3020'); p.rect(14, 65, 4, 11, '#6b4a2b');
  p.rect(14, 40, 4, 5, '#2a3a4a'); p.set(15, 41, PAL.win1);
  p.rect(6, 19, 20, 3, '#3a3a44'); for (let x = 6; x < 26; x += 2) p.vline(x, 16, 18, '#3a3a44'); p.hline(6, 25, 15, '#3a3a44');
  p.rect(10, 8, 12, 8, '#ffe58a'); p.rect(12, 9, 3, 6, '#fff7cf'); p.vline(16, 8, 15, '#c9a24a');
  for (let y = 0; y < 8; y++) { const hw = Math.round(2 + y * 0.9); p.hline(16 - hw, 15 + hw, y, y < 2 ? '#8a2620' : '#b8382f'); }
  return { pix: p.outlined(), ox: -1, oy: -83 };
}
function boatDecal() {
  const p = new Pix(36, 18);
  p.ellipse(18, 10, 17, 6, '#00000030');
  for (let y = 2; y < 15; y++) { const hw = Math.round(15 - Math.abs(y - 8) * 0.9); p.hline(18 - hw, 17 + hw, y, y < 4 ? '#b07e4c' : y > 12 ? '#4a2f1c' : '#8c5e36'); }
  p.rect(6, 5, 24, 6, '#6e4628'); p.vline(12, 5, 10, '#b07e4c'); p.vline(24, 5, 10, '#b07e4c');
  p.hline(28, 35, 4, '#c9a46a');
  return p.outlined();
}
function sandcastle() {
  const p = new Pix(16, 14);
  p.ellipse(8, 12.5, 7, 1.6, '#00000030');
  p.rect(2, 6, 12, 7, PAL.s1); p.hline(2, 13, 6, PAL.s2); p.hline(2, 13, 12, PAL.s0);
  for (const x of [1, 7, 12]) { p.rect(x, 2, 3, 5, PAL.s2); p.set(x, 1, PAL.s3); p.set(x + 2, 1, PAL.s3); p.vline(x + 2, 3, 6, PAL.s0); }
  p.rect(7, 9, 2, 3, PAL.s0); p.vline(8, -1, 2, '#6b4a2b'); p.rect(9, -1, 3, 2, PAL.fr);
  return { pix: p.outlined(), ox: 0, oy: -15 };
}
function crystal(v) {
  const c = v ? ['#5a2a8a', '#9a5ad6', '#d8b0ff', '#f6ecff'] : ['#1f6a8a', '#3fb6d9', '#9ef0ff', '#effcff'];
  const p = new Pix(14, 20);
  p.ellipse(7, 18.5, 6, 1.6, '#00000060');
  const shard = (x, top, w, h) => {
    for (let y = top; y < top + h; y++) {
      const t = (y - top) / h, hw = Math.max(0.5, Math.min(1, t * 3) * w);
      for (let xx = Math.round(x - hw); xx <= Math.round(x + hw); xx++) p.set(xx, y, xx < x ? c[2] : xx === Math.round(x) ? c[1] : c[0]);
    }
    p.set(Math.round(x), top, c[3]);
  };
  shard(4, 6, 2, 12); shard(9, 2, 2.5, 16); shard(12, 10, 1.5, 8);
  return { pix: p.outlined('#120e18'), ox: 0, oy: -21 };
}
function stalagmite(v) {
  const p = new Pix(12, 18);
  p.ellipse(6, 16.5, 5, 1.5, '#00000060');
  const h = v ? 12 : 16;
  for (let y = 17 - h; y < 17; y++) { const t = (y - (17 - h)) / h, hw = Math.max(0.6, t * 4.5); for (let x = Math.round(6 - hw); x <= Math.round(6 + hw); x++) p.set(x, y, x < 5 ? APAL.cv3 : x > 7 ? APAL.cv0 : '#3a3242'); }
  return { pix: p.outlined('#0c0a0f'), ox: 1, oy: -19 };
}
function chest() {
  const p = new Pix(14, 12);
  p.rect(0, 2, 14, 10, PAL.wd2); p.rect(0, 0, 14, 5, PAL.wd1); p.hline(1, 12, 0, PAL.wd3);
  p.hline(0, 13, 5, PAL.wd0); p.vline(3, 0, 11, '#7a7a86'); p.vline(10, 0, 11, '#7a7a86');
  p.rect(6, 4, 2, 3, PAL.fy); p.hline(0, 13, 11, PAL.wd0);
  return { pix: p.outlined(), ox: 0, oy: -14 };
}
function caveEntrance() {
  const p = new Pix(32, 32);
  p.ellipse(16, 22, 13, 16, '#0b0810');
  p.rect(3, 22, 26, 10, '#0b0810');
  p.ellipse(16, 24, 9, 12, '#000000');
  p.rect(7, 24, 18, 8, '#000000');
  // Holzstützen + Querbalken (alte Mine)
  for (const x of [4, 25]) { p.rect(x, 9, 3, 23, PAL.wd1); p.vline(x, 9, 31, PAL.wd2); p.vline(x + 2, 9, 31, PAL.wd0); }
  p.rect(2, 7, 28, 4, PAL.wd2); p.hline(2, 29, 7, PAL.wd3); p.hline(2, 29, 10, PAL.wd0);
  p.set(8, 9, '#888'); p.set(23, 9, '#888');
  // Gleise
  p.hline(10, 21, 30, '#5d5d66'); p.hline(10, 21, 27, '#5d5d66'); for (let x = 10; x < 22; x += 3) p.vline(x, 26, 31, PAL.wd0);
  return p;
}

// ---------------------------------------------------------------- Möbel (Innenräume)
function bed(color) {
  const p = new Pix(14, 28);
  p.rect(0, 0, 14, 27, PAL.wd1);
  p.rect(0, 0, 14, 5, PAL.wd2); p.hline(0, 13, 0, PAL.wd3); p.hline(0, 13, 4, PAL.wd0);
  p.rect(2, 5, 10, 5, '#f2efe6'); p.hline(2, 11, 9, '#d8d2c4'); p.set(3, 6, '#ffffff');
  p.rect(1, 10, 12, 15, color[0]); p.rect(1, 10, 12, 3, color[1]); p.hline(1, 12, 13, color[2]);
  for (let y = 15; y < 25; y += 3) for (let x = 2 + (y % 2); x < 12; x += 3) p.set(x, y, color[1]);
  p.rect(0, 24, 14, 3, PAL.wd2); p.hline(0, 13, 24, PAL.wd3); p.hline(0, 13, 26, PAL.wd0);
  return { pix: p.outlined(), ox: 0, oy: -30 };
}
function table(items) {
  const p = new Pix(30, 22);
  p.ellipse(15, 20.5, 14, 1.8, '#00000040');
  p.rect(0, 0, 30, 13, PAL.wd2);
  for (let y = 0; y < 13; y += 4) p.hline(0, 29, y, PAL.wd3);
  p.hline(0, 29, 12, PAL.wd1);
  p.rect(0, 13, 30, 4, PAL.wd1); p.hline(0, 29, 16, PAL.wd0);
  for (const x of [1, 26]) p.rect(x, 17, 3, 4, PAL.wd0);
  if (items === 'mugs') { for (const x of [6, 20]) { p.rect(x, 3, 4, 5, '#c9a46a'); p.rect(x, 3, 4, 1, '#f6f0dc'); p.set(x + 4, 5, '#c9a46a'); } p.ellipse(14, 7, 3, 2, '#e8e4dc'); p.set(13, 6, '#c26a3a'); }
  if (items === 'candle') { p.rect(13, 2, 3, 6, '#f2ead6'); p.set(14, 1, '#ffd23f'); p.set(14, 0, '#ff9a3a'); p.ellipse(7, 7, 3, 2, '#e8e4dc'); p.ellipse(22, 7, 3, 2, '#e8e4dc'); p.set(22, 6, '#d94a3a'); }
  if (items === 'bread') { p.ellipse(10, 6, 5, 3, '#c98a44'); p.hline(7, 13, 5, '#e0aa62'); p.ellipse(21, 6, 3, 2, '#b8382f'); p.set(20, 5, '#e05a4a'); }
  if (items === 'map') { p.rect(5, 2, 20, 9, '#efe2c2'); p.hline(7, 22, 5, '#a68a5a'); p.set(15, 7, PAL.fr); p.vline(10, 3, 9, '#a68a5a'); }
  return { pix: p.outlined(), ox: 0, oy: -23 };
}
function stool() {
  const p = new Pix(10, 10);
  p.ellipse(5, 9, 4.5, 1.2, '#00000040');
  p.vline(2, 4, 8, PAL.wd0); p.vline(7, 4, 8, PAL.wd0);
  p.ellipse(5, 3, 5, 3, PAL.wd2); p.hline(2, 7, 1, PAL.wd3); p.hline(1, 8, 5, PAL.wd1);
  return { pix: p.outlined(), ox: 2, oy: -13 };
}
function shelf(kind) {
  const p = new Pix(30, 34);
  p.rect(0, 0, 30, 34, PAL.wd1);
  p.rect(2, 2, 26, 30, PAL.wd0);
  const r = mulberry32(kind === 'books' ? 7 : 9);
  const rows = [3, 13, 23];
  for (const y0 of rows) {
    p.hline(1, 28, y0 + 8, PAL.wd2); p.hline(1, 28, y0 + 9, PAL.wd3);
    let x = 3;
    while (x < 27) {
      if (kind === 'books') {
        const w = ri(r, 2, 3), h = ri(r, 5, 8), c = ['#b8382f', '#2f6bb3', '#3d8a4a', '#d9a63a', '#7a4a8a', '#c9b89a'][ri(r, 0, 5)];
        p.rect(x, y0 + 8 - h, w, h, c); p.vline(x, y0 + 8 - h, y0 + 7, '#00000030'); p.set(x + w - 1, y0 + 9 - h, '#ffffff40');
        x += w + (r() < 0.2 ? 1 : 0);
      } else {
        const t = ri(r, 0, 2);
        if (t === 0) { p.rect(x, y0 + 2, 5, 6, '#a7d8e8'); p.rect(x + 1, y0 + 4, 3, 4, ['#d94a3a', '#e8b03a', '#62b26a'][ri(r, 0, 2)]); p.rect(x + 1, y0 + 1, 3, 1, '#8c5e36'); }
        else if (t === 1) { p.ellipse(x + 2.5, y0 + 5, 3, 3.2, '#c9a46a'); p.hline(x + 1, x + 4, y0 + 2, '#a6824a'); }
        else { for (const [dx, dy] of [[1, 6], [3, 6], [2, 4]]) { p.ellipse(x + dx + 0.5, y0 + dy + 0.5, 1.4, 1.4, '#d9433a'); } }
        x += 6;
      }
    }
  }
  p.hline(0, 29, 0, PAL.wd2); p.hline(0, 29, 33, '#00000060');
  return { pix: p.outlined(), ox: 0, oy: -35 };
}
function counter(w, h) {
  const p = new Pix(w, h);
  p.rect(0, 0, w, h, PAL.wd1);
  const topH = h > 24 ? h - 8 : 10;
  p.rect(0, 0, w, topH, PAL.wd3); p.hline(0, w - 1, 0, '#d4a06a');
  for (let y = 3; y < topH; y += 4) p.hline(1, w - 2, y, PAL.wd2);
  p.hline(0, w - 1, topH, PAL.wd0);
  for (let x = 3; x < w; x += 6) p.vline(x, topH + 1, h - 2, PAL.wd0);
  p.hline(0, w - 1, h - 1, '#00000060');
  return p.outlined();
}
function fireplace(frames = 3) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pix(30, 38);
    p.rect(0, 0, 30, 38, PAL.st1);
    for (let y = 0; y < 38; y++) for (let x = 0; x < 30; x++) {
      const row = Math.floor(y / 5), off = row % 2 ? 3 : 0;
      if (y % 5 === 4 || (x + off) % 7 === 0) p.set(x, y, PAL.st0);
      else if (y % 5 === 0) p.set(x, y, PAL.st2);
    }
    p.rect(0, 14, 30, 4, PAL.wd1); p.hline(0, 29, 14, PAL.wd3); p.hline(0, 29, 17, PAL.wd0);
    p.rect(6, 21, 18, 17, '#140c0a');
    p.ellipse(15, 22, 9, 4, '#140c0a');
    p.hline(7, 22, 36, PAL.wd0); p.hline(8, 21, 35, PAL.wd1);
    const flames = [[10, 3], [14, 5], [18, 3], [12, 4], [16, 4]];
    flames.forEach(([x, hgt], i) => {
      const hh = hgt + ((f + i) % 3) - 1;
      for (let y = 0; y < hh; y++) p.set(x + ((y + f + i) % 2), 34 - y, y < 2 ? '#ff6a2a' : y < hh - 1 ? '#ffb43a' : '#fff1a6');
    });
    out.push(p.outlined());
  }
  return { frames: out, ox: -1, oy: -39 };
}
function forge(frames = 3) {
  const out = [];
  for (let f = 0; f < frames; f++) {
    const p = new Pix(30, 30);
    p.rect(0, 6, 30, 24, '#5a3a32');
    for (let y = 6; y < 30; y++) for (let x = 0; x < 30; x++) if (y % 4 === 1 || (x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) p.set(x, y, '#3e2722');
    p.rect(3, 4, 24, 6, '#2a2a2e'); p.hline(3, 26, 4, '#4a4a52');
    p.rect(5, 6, 20, 4, '#000');
    for (let x = 5; x < 25; x++) { const c = ((x + f) % 3 === 0) ? '#fff1a6' : (x + f) % 2 ? '#ff8a2a' : '#d9431a'; p.set(x, 8, c); p.set(x, 9, (x + f) % 4 ? '#d9431a' : '#ff8a2a'); if ((x * 3 + f) % 5 === 0) p.set(x, 7, '#ffb43a'); }
    p.rect(10, 0, 10, 5, '#3a3a40'); p.hline(10, 19, 0, '#55555e');
    p.rect(24, 18, 6, 9, PAL.wd2); p.hline(24, 29, 18, PAL.wd3);
    out.push(p.outlined());
  }
  return { frames: out, ox: -1, oy: -31 };
}
function anvil() {
  const p = new Pix(16, 12);
  p.ellipse(8, 11, 7, 1.5, '#00000050');
  p.rect(5, 6, 6, 5, '#4a4a52'); p.rect(3, 9, 10, 2, '#3a3a40');
  p.rect(1, 2, 14, 4, '#6a6a76'); p.hline(1, 14, 2, '#9a9aa8'); p.rect(13, 3, 3, 2, '#6a6a76'); p.set(0, 3, '#6a6a76');
  return { pix: p.outlined(), ox: -1, oy: -14 };
}
function plant(v) {
  const p = new Pix(12, 18);
  p.rect(2, 11, 8, 6, '#b8603a'); p.hline(1, 10, 11, '#d47a4a'); p.hline(2, 9, 16, '#8a4428');
  const leaf = v ? ['#2f7a38', '#479843', '#7cc15a'] : ['#2e6a4a', '#3f8a5e', '#6ab884'];
  for (const [x, y, rr] of [[6, 6, 4], [3, 8, 2.5], [9, 7, 2.5], [6, 3, 2.5]]) { p.ellipse(x, y, rr, rr, leaf[0]); p.ellipse(x - 0.6, y - 0.6, rr * 0.6, rr * 0.6, leaf[1]); }
  p.set(5, 3, leaf[2]); p.set(8, 5, leaf[2]);
  if (v) { p.set(4, 5, PAL.fp); p.set(9, 4, PAL.fy); }
  return { pix: p.outlined(), ox: 1, oy: -19 };
}
function kegs() {
  const p = new Pix(30, 22);
  p.rect(0, 16, 30, 6, PAL.wd0);
  for (const cx of [7.5, 22.5]) {
    p.ellipse(cx, 10, 7, 8, PAL.wd2); p.ellipse(cx, 10, 5, 6, PAL.wd3); p.ellipse(cx, 10, 2, 2.5, PAL.wd1);
    p.ellipse(cx, 10, 7, 8, null);
    for (let a = 0; a < 6.28; a += 0.05) p.set(cx + Math.cos(a) * 6.6, 10 + Math.sin(a) * 7.6, '#5d5d66');
    p.rect(cx - 1, 15, 2, 3, '#c9a24a');
  }
  return { pix: p.outlined(), ox: -1, oy: -23 };
}
function sack() {
  const p = new Pix(12, 13);
  p.ellipse(6, 8, 5.5, 5, '#c9b07a'); p.ellipse(5, 7, 3, 3, '#dcc690'); p.rect(4, 1, 4, 3, '#b39860'); p.hline(3, 8, 3, '#8a7444');
  p.ellipse(6, 12.5, 5, 1, '#00000040');
  return { pix: p.outlined(), ox: 1, oy: -15 };
}
// Wand- und Boden-Decals
function rug(w, h, c) {
  const p = new Pix(w, h);
  p.rect(0, 0, w, h, c[0]); p.rect(2, 2, w - 4, h - 4, c[1]); p.rect(4, 4, w - 8, h - 8, c[2]);
  for (let x = 5; x < w - 5; x += 4) { p.set(x, 3, c[2]); p.set(x, h - 4, c[2]); }
  // Rauten-Medaillon in der Mitte + Eckornamente
  const cx = w / 2 - 0.5, cy = h / 2 - 0.5, rr = Math.min(w, h) / 2 - 7;
  for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++) {
    const d = Math.abs(x - cx) + Math.abs(y - cy);
    if (d <= rr && d > rr - 1.5) p.set(x, y, c[0]);
    else if (d <= rr - 3 && d > rr - 4.5) p.set(x, y, c[1]);
    else if (d <= 1.5) p.set(x, y, c[0]);
  }
  for (const [x, y] of [[6, 6], [w - 7, 6], [6, h - 7], [w - 7, h - 7]]) { p.set(x, y, c[1]); p.set(x - 1, y, c[1]); p.set(x + 1, y, c[1]); p.set(x, y - 1, c[1]); p.set(x, y + 1, c[1]); }
  return p;
}
function windowIn() {
  const p = new Pix(16, 18);
  p.rect(1, 1, 14, 14, PAL.wd0); p.rect(2, 2, 12, 12, '#9ad6f2'); p.rect(2, 2, 12, 4, '#c6ecff');
  p.vline(8, 2, 13, PAL.wd1); p.hline(2, 13, 8, PAL.wd1); p.set(4, 3, '#ffffff'); p.set(5, 4, '#ffffff');
  p.rect(0, 14, 16, 3, PAL.wd2); p.hline(0, 15, 14, PAL.wd3);
  for (const x of [0, 1, 14, 15]) p.vline(x, 0, 12, '#c95a5a'); p.vline(1, 2, 11, '#e07a7a'); p.vline(14, 2, 11, '#a84444');
  return p;
}
function painting(v) {
  const p = new Pix(16, 12);
  p.rect(0, 0, 16, 12, '#c9a24a'); p.rect(1, 1, 14, 10, '#8a6a26');
  p.rect(2, 2, 12, 8, v ? '#7ab8e0' : '#e0c890');
  if (v) { p.rect(2, 7, 12, 3, '#4e9a45'); p.ellipse(10, 5, 2, 2, '#ffe14d'); p.set(5, 6, '#2b5f37'); p.set(5, 5, '#2b5f37'); }
  else { p.ellipse(8, 6, 3, 3.5, '#6b3b22'); p.ellipse(8, 5, 2, 2, '#f5c9a0'); }
  return p;
}
function weaponRack() {
  const p = new Pix(28, 22);
  p.rect(0, 2, 28, 3, PAL.wd2); p.hline(0, 27, 2, PAL.wd3);
  for (const x of [5, 13]) { p.vline(x, 0, 18, '#c9ced6'); p.vline(x + 1, 0, 18, '#8a909c'); p.hline(x - 2, x + 3, 15, '#c9a24a'); p.vline(x, 16, 20, PAL.wd1); }
  p.vline(21, 1, 20, PAL.wd2); p.rect(22, 2, 4, 6, '#9aa0aa'); p.vline(25, 2, 7, '#c9ced6');
  return p.outlined();
}
function hangingPots() {
  const p = new Pix(30, 14);
  p.hline(0, 29, 1, PAL.wd1);
  for (const [x, c] of [[4, '#c26a3a'], [12, '#7a7a86'], [20, '#c26a3a'], [26, '#5a5a66']]) { p.vline(x, 1, 4, '#3a3a40'); p.ellipse(x, 8, 3, 3, c); p.hline(x - 3, x + 3, 6, '#00000040'); }
  return p;
}

// ---------------------------------------------------------------- Registrierung
export function buildAreaArt(art) {
  const t = art.tiles;
  t.dgrass = [0, 1, 2].map((v) => speck(1100 + v, APAL.dg1, [[APAL.dg0, 4], [APAL.dg2, 2 + v, 'tuft'], [APAL.dg3, v]]).canvas());
  t.dforest = [0, 1, 2].map((v) => speck(1200 + v, APAL.df1, [[APAL.df0, 6], [APAL.df2, 3 + v, 'dash'], [APAL.df3, 1 + v]]).canvas());
  t.swamp = [0, 1, 2, 3].map((f) => [0, 1].map((v) => swampTile(v, f).canvas()));
  t.rocky = [0, 1, 2, 3].map((v) => speck(1600 + v, APAL.rk1, [[APAL.rk0, 4], [APAL.rk2, 5], [APAL.rk3, v, 'pebble']]).canvas());
  t.snow = [0, 1, 2].map((v) => speck(1700 + v, APAL.sn1, [[APAL.sn2, 5], [APAL.sn0, 3, 'dash']]).canvas());
  t.cave = [0, 1, 2].map((v) => speck(1800 + v, APAL.cv1, [[APAL.cv0, 6], [APAL.cv2, 4], [APAL.cv3, v, 'pebble']]).canvas());
  t.flag = [0, 1].map((v) => flagFloor(v).canvas());
  t.wood = {};
  for (const k in FLOOR_PALS) t.wood[k] = [0, 1, 2].map((v) => woodFloor(v, FLOOR_PALS[k]).canvas());
  t.mat = {
    wood: matTile(woodFloor(0, FLOOR_PALS.zuhause), ['#7a2c2a', '#a63c33']).canvas(),
    flag: matTile(flagFloor(0), ['#4a3a2a', '#6b5238']).canvas(),
    taverne: matTile(woodFloor(0, FLOOR_PALS.taverne), ['#2f4a85', '#456db3']).canvas(),
    kraemer: matTile(woodFloor(0, FLOOR_PALS.kraemer), ['#7a2c2a', '#a63c33']).canvas(),
    zuhause: matTile(woodFloor(0, FLOOR_PALS.zuhause), ['#3f6a3a', '#5a8a4c']).canvas(),
    schmiede: matTile(flagFloor(0), ['#4a3a2a', '#6b5238']).canvas(),
    cave: (() => { const p = new Pix(16, 16); p.d.set(speck(1800, APAL.cv1, [[APAL.cv0, 6]]).d); return p.canvas(); })(),
  };
  t.void = plainTop('#000000').canvas();
  // erhabene Tile-Sets
  art.raised = {};
  for (const k in ROCK_STYLES) {
    const pal = ROCK_STYLES[k], seed = 1900 + k.length * 31;
    art.raised[k] = {
      top: [0, 1, 2, 3, 0, 1].map((v) => rockTop(pal, v, seed).canvas()),
      faceU: [0, 1, 2].map((v) => rockFace(pal, v, false, seed).canvas()),
      faceL: [0, 1, 2].map((v) => rockFace(pal, v, true, seed).canvas()),
      rim: pal.rim, ledge: pal.ledge,
    };
  }
  for (const k in WALL_STYLES) {
    const st = WALL_STYLES[k];
    art.raised['wall_' + k] = { top: [plainTop(st.top).canvas()], faceU: [wallFace(st, false).canvas()], faceL: [wallFace(st, true).canvas()], rim: '#7a5232', ledge: '#5a3a22', interior: true };
  }

  [0, 1].forEach((v) => reg(art, 'darkoak' + v, darkOak(v)));
  reg(art, 'deadtree', deadTree());
  [0, 1].forEach((v) => reg(art, 'shroom' + v, glowShroom(v)));
  [0, 1].forEach((v) => reg(art, 'pillar' + v, pillar(v)));
  reg(art, 'shrine', shrine());
  reg(art, 'cauldron', cauldron());
  [0, 1].forEach((v) => reg(art, 'snowpine' + v, snowPine(v)));
  reg(art, 'boulder', boulder());
  [0, 1].forEach((v) => reg(art, 'palm' + v, palm(v)));
  reg(art, 'hut', hut());
  reg(art, 'lighthouse', lighthouse());
  reg(art, 'sandcastle', sandcastle());
  [0, 1].forEach((v) => reg(art, 'crystal' + v, crystal(v)));
  [0, 1].forEach((v) => reg(art, 'stalagmite' + v, stalagmite(v)));
  reg(art, 'chest', chest());
  reg(art, 'bed_red', bed(['#a63c33', '#c95a43', '#7a2c2a']));
  reg(art, 'bed_blue', bed(['#2f4a85', '#456db3', '#1f2f57']));
  for (const it of ['mugs', 'candle', 'bread', 'map']) reg(art, 'table_' + it, table(it));
  reg(art, 'stool', stool());
  reg(art, 'shelf_books', shelf('books'));
  reg(art, 'shelf_goods', shelf('goods'));
  reg(art, 'counter_h3', { pix: counter(46, 22), ox: -1, oy: -23 });
  reg(art, 'counter_h4', { pix: counter(62, 22), ox: -1, oy: -23 });
  reg(art, 'counter_v3', { pix: counter(14, 46), ox: 0, oy: -47 });
  reg(art, 'fireplace', fireplace());
  reg(art, 'forge', forge());
  reg(art, 'anvil', anvil());
  [0, 1].forEach((v) => reg(art, 'plant' + v, plant(v)));
  reg(art, 'kegs', kegs());
  reg(art, 'sack', sack());

  const d = art.decals = {};
  d.rug_red = rug(48, 32, ['#7a2c2a', '#a63c33', '#c9a24a']).canvas();
  d.rug_blue = rug(32, 48, ['#1f2f57', '#2f4a85', '#d9c49c']).canvas();
  d.rug_green = rug(48, 32, ['#2f5e3e', '#477f4c', '#e8d6b0']).canvas();
  d.window = windowIn().canvas();
  d.painting0 = painting(0).canvas();
  d.painting1 = painting(1).canvas();
  d.weaponrack = weaponRack().canvas();
  d.pots = hangingPots().canvas();
  d.cave_entrance = caveEntrance().canvas();
  d.boat = boatDecal().canvas();
  const star = new Pix(9, 9);
  for (const [x, y] of [[4, 0], [4, 1], [4, 2], [0, 3], [1, 3], [2, 3], [3, 3], [5, 3], [6, 3], [7, 3], [8, 3], [3, 4], [4, 4], [5, 4], [2, 5], [6, 5], [1, 6], [7, 6], [4, 3]]) star.set(x, y, '#e8784a');
  star.set(4, 3, '#ffb07a');
  d.starfish = star.canvas();
  d.puddle = (() => { const p = new Pix(16, 10); p.ellipse(8, 5, 7, 3.5, '#2a4a6a'); p.ellipse(7, 4, 4, 2, '#3a6a8a'); p.set(5, 3, '#9ad6f2'); return p.canvas(); })();
  d.bones = (() => { const p = new Pix(12, 8); p.hline(2, 9, 4, '#d8d0c0'); p.set(1, 3, '#d8d0c0'); p.set(1, 5, '#d8d0c0'); p.set(10, 3, '#d8d0c0'); p.set(10, 5, '#d8d0c0'); p.ellipse(4, 2, 2, 1.6, '#cfc6b4'); return p.canvas(); })();
  d.coal = (() => { const p = new Pix(20, 10); p.ellipse(10, 6, 9, 4, '#1a1a1e'); for (let i = 0; i < 12; i++) p.set(3 + (i * 7) % 15, 3 + (i * 3) % 6, '#3a3a44'); return p.canvas(); })();
}
