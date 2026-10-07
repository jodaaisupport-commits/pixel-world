// Prozedurale Pixel-Art: alle Tiles und Sprites werden hier zur Laufzeit
// pixelgenau in kleine Offscreen-Canvases gemalt (kein externes Asset).
import { mulberry32 } from './noise.js';
import { TS, PAL, ROOFS, Pix, pick, ri, canopy, trunk } from './pix.js';
import { buildCharacter, PLAYER_LOOK } from './characters.js';
import { buildAreaArt } from './tiles-areas.js';
export { TS, PAL, ROOFS, Pix };

// ---------------------------------------------------------------------------
// Boden-Tiles
// ---------------------------------------------------------------------------
function grassBase(p, r, tufts, specks, base = PAL.g1) {
  p.rect(0, 0, 16, 16, base);
  for (let k = 0; k < specks; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), r() < 0.7 ? PAL.g0 : PAL.g2);
  for (let k = 0; k < tufts; k++) {
    const x = ri(r, 1, 12), y = ri(r, 3, 14);
    // kleines Gras-Büschel:  . L .  /  L D L
    p.set(x, y, PAL.g2); p.set(x + 1, y - 1, PAL.g3); p.set(x + 2, y, PAL.g2);
    p.set(x + 1, y, PAL.g0);
  }
}

function grassTile(v) {
  const r = mulberry32(100 + v);
  const p = new Pix(16, 16);
  const conf = [[0, 2], [1, 3], [2, 4], [3, 5]][v];
  grassBase(p, r, conf[0], conf[1]);
  return p;
}

function flowerTile(v) {
  const r = mulberry32(200 + v);
  const p = new Pix(16, 16);
  grassBase(p, r, 1, 2);
  const palettes = [[PAL.fw], [PAL.fy], [PAL.fp], [PAL.fb], [PAL.fw, PAL.fp], [PAL.fy, PAL.fv]];
  const cols = palettes[v % palettes.length];
  const n = 3 + (v % 2);
  const spots = [];
  for (let k = 0; k < n; k++) {
    let x, y, tries = 0;
    do { x = ri(r, 2, 13); y = ri(r, 2, 12); tries++; }
    while (tries < 20 && spots.some((s) => Math.abs(s[0] - x) < 4 && Math.abs(s[1] - y) < 4));
    spots.push([x, y]);
    const c = cols[k % cols.length];
    p.set(x, y + 2, PAL.g0); p.set(x + 1, y + 2, PAL.g2);       // Stiel/Blatt
    p.set(x - 1, y, c); p.set(x + 1, y, c); p.set(x, y - 1, c); p.set(x, y + 1, c);
    p.set(x, y, c === PAL.fy ? PAL.fw : PAL.fy);               // Blütenmitte
  }
  return p;
}

function forestTile(v) {
  const r = mulberry32(300 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, PAL.f1);
  for (let k = 0; k < 6; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), PAL.f0);
  for (let k = 0; k < 3 + v; k++) {
    const x = ri(r, 1, 13), y = ri(r, 1, 14);
    p.set(x, y, PAL.f2); p.set(x + 1, y, PAL.f3);
  }
  return p;
}

function dirtTile(v) {
  const r = mulberry32(400 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, PAL.d1);
  for (let k = 0; k < 5; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), PAL.d2);
  for (let k = 0; k < 3; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), PAL.d0);
  for (let k = 0; k < v; k++) { // Kiesel
    const x = ri(r, 1, 13), y = ri(r, 1, 13);
    p.set(x, y, PAL.d3); p.set(x + 1, y, PAL.d2); p.set(x, y + 1, PAL.d0); p.set(x + 1, y + 1, PAL.d0);
  }
  return p;
}

function sandTile(v) {
  const r = mulberry32(500 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, PAL.s1);
  for (let k = 0; k < 6; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), PAL.s2);
  for (let k = 0; k < 3; k++) p.set(ri(r, 0, 15), ri(r, 0, 15), PAL.s0);
  if (v === 2) { const x = ri(r, 2, 9), y = ri(r, 3, 12); p.hline(x, x + 3, y, PAL.s2); p.hline(x + 1, x + 4, y + 1, PAL.s0); }
  return p;
}

function waterTile(v, f, deep) {
  const r = mulberry32(600 + v * 7 + (deep ? 50 : 0));
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, deep ? PAL.w0 : PAL.w1);
  const waves = deep ? 2 : 3;
  for (let k = 0; k < waves; k++) {
    const bx = ri(r, 0, 15), y = ri(r, 1, 14), len = ri(r, 3, 5), ph = r() * Math.PI * 2;
    const off = Math.round(Math.sin(ph + (f / 4) * Math.PI * 2) * 1.5);
    const col = deep ? PAL.w1 : PAL.w2;
    for (let i = 0; i < len; i++) p.set((bx + off + i + 16) % 16, y, col);
    if (!deep && (f + k) % 4 === 0) p.set((bx + off + 1 + 16) % 16, y - 1, PAL.w3); // Glitzer
  }
  if (!deep && v === 0 && f % 2 === 0) p.set(ri(r, 2, 13), ri(r, 2, 13), PAL.w4);
  return p;
}

function stoneTile(v) {
  // ruhige, warme Steinplatten (versetzte Reihen, 8x5 Platten)
  const r = mulberry32(700 + v);
  const p = new Pix(16, 16);
  const grout = '#857f75', base = '#a8a297', light = '#bdb7ab', dark = '#958f84';
  p.rect(0, 0, 16, 16, grout);
  for (let row = 0; row < 4; row++) {
    const y0 = row * 4, off = row % 2 ? 4 : 0;
    for (let cx = -off; cx < 16; cx += 8) {
      const c = r() < 0.3 ? dark : r() < 0.25 ? light : base;
      for (let y = y0; y < y0 + 3; y++)
        for (let x = cx; x < cx + 7; x++) if (x >= 0 && x < 16) p.set(x, y, c);
      for (let x = cx; x < cx + 7; x++) if (x >= 0 && x < 16) p.set(x, y0, c === light ? '#cfc9bd' : light);
      if (r() < 0.25) p.set(cx + 2 + Math.floor(r() * 3), y0 + 1 + Math.floor(r() * 2), grout);
    }
  }
  return p;
}

function farmTile(v) {
  const r = mulberry32(800 + v);
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, PAL.d0);
  for (let y = 0; y < 16; y += 4) { p.hline(0, 15, y, PAL.d1); p.hline(0, 15, y + 1, PAL.d2); p.hline(0, 15, y + 3, '#5e3d24'); }
  for (let x = 0; x < 16; x++) if (r() < 0.2) p.set(x, ri(r, 0, 3) * 4 + 2, PAL.d1);
  if (v > 0) {
    for (let k = 0; k < 2; k++) {
      const x = 3 + k * 8 + ri(r, 0, 2), y = 1 + ri(r, 0, 2) * 4 + 2;
      if (v === 1) { p.set(x, y, PAL.g2); p.set(x - 1, y - 1, PAL.g3); p.set(x + 1, y - 1, PAL.g3); }
      else if (v === 2) { // Kohl
        p.rect(x - 2, y - 2, 4, 3, PAL.g2); p.set(x - 1, y - 2, PAL.g3); p.set(x, y - 1, PAL.g3); p.hline(x - 2, x + 1, y + 1, PAL.g0);
      } else { // Karotten
        p.set(x, y, '#e88a2e'); p.set(x, y - 1, PAL.g2); p.set(x - 1, y - 2, PAL.g3); p.set(x + 1, y - 2, PAL.g3);
      }
    }
  }
  return p;
}

function bridgeTile(horizontal) {
  const p = new Pix(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const a = horizontal ? x : y; // Laufrichtung der Planken-Fugen
      const b = horizontal ? y : x;
      let c = PAL.wd2;
      if (a % 4 === 3) c = PAL.wd0;
      else if (a % 4 === 0) c = PAL.wd3;
      if ((b === 4 || b === 11) && a % 4 === 1) c = PAL.wd1; // Nägel
      p.set(x, y, c);
    }
  return p;
}

/** Geländer-Overlay für eine Brückenseite ('N','E','S','W'). */
function railOverlay(side) {
  const p = new Pix(16, 16);
  const put = (a, b, c) => { // a = entlang, b = Tiefe von der Kante
    if (side === 'N') p.set(a, b, c);
    else if (side === 'S') p.set(a, 15 - b, c);
    else if (side === 'W') p.set(b, a, c);
    else p.set(15 - b, a, c);
  };
  for (let a = 0; a < 16; a++) {
    put(a, 0, PAL.wd0); put(a, 1, PAL.wd3); put(a, 2, PAL.wd1); put(a, 3, '#00000055');
  }
  for (const a of [1, 2, 9, 10]) { put(a, 1, PAL.wd2); put(a, 2, PAL.wd0); }
  return p;
}

// Kanten-Übergänge: das höherrangige Terrain "überlappt" das Nachbar-Tile.
const JAGS = [
  [2, 3, 3, 2, 2, 3, 4, 3, 2, 2, 3, 3, 2, 3, 3, 2],
  [3, 2, 2, 3, 4, 3, 2, 2, 3, 3, 2, 2, 3, 4, 3, 2],
];
function edgeOverlay(fill, speck, rims, side, variant) {
  const p = new Pix(16, 16);
  const jag = JAGS[variant % JAGS.length];
  const put = (a, b, c) => {
    if (b > 15) return;
    if (side === 'N') p.set(a, b, c);
    else if (side === 'S') p.set(15 - a, 15 - b, c);
    else if (side === 'W') p.set(b, 15 - a, c);
    else p.set(15 - b, a, c);
  };
  for (let a = 0; a < 16; a++) {
    const depth = jag[a];
    for (let b = 0; b < depth; b++) put(a, b, speck && (a * 7 + b * 3) % 11 === 0 ? speck : fill);
    rims.forEach((c, k) => put(a, depth + k, c));
  }
  return p;
}
function cornerOverlay(fill, rims, corner) {
  const p = new Pix(16, 16);
  const put = (x, y, c) => {
    const X = corner === 'NE' || corner === 'SE' ? 15 - x : x;
    const Y = corner === 'SW' || corner === 'SE' ? 15 - y : y;
    p.set(X, Y, c);
  };
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 6; x++) {
      const s = x + y;
      if (s <= 2) put(x, y, fill);
      else if (s - 3 < rims.length) put(x, y, rims[s - 3]);
    }
  return p;
}

/** Diagonales Übergangsstück für Treppenstufen (z. B. schräge Ufer). */
const DJAG = [0, 1, 0, 0, -1, 0, 1, 1, 0, -1, 0, 0, 1, 0, -1, 0];
function diagOverlay(fill, speck, rims, corner) {
  const p = new Pix(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const b = 15 + DJAG[(x - y + 16) % 16];
      const u = x + y;
      let c = null;
      if (u < b) c = speck && (x * 5 + y * 3) % 13 === 0 ? speck : fill;
      else if (u - b < rims.length) c = rims[u - b];
      if (!c) continue;
      const X = corner === 'NE' || corner === 'SE' ? 15 - x : x;
      const Y = corner === 'SW' || corner === 'SE' ? 15 - y : y;
      p.set(X, Y, c);
    }
  return p;
}

/** Innenecke abrunden: beide angrenzenden Seiten sind höherrangig. */
function concaveOverlay(fill, rims, corner, R = 6) {
  const p = new Pix(16, 16);
  for (let y = 0; y < R + 1; y++)
    for (let x = 0; x < R + 1; x++) {
      const d = Math.hypot(R - x - 0.5, R - y - 0.5);
      let c = null;
      if (d > R) c = fill;
      else if (R - d < rims.length) c = rims[Math.floor(R - d)];
      if (!c) continue;
      const X = corner === 'NE' || corner === 'SE' ? 15 - x : x;
      const Y = corner === 'SW' || corner === 'SE' ? 15 - y : y;
      p.set(X, Y, c);
    }
  return p;
}

// ---------------------------------------------------------------------------
// Boden-Deko (wird in den Boden "eingebacken", nicht kollidierend)
// ---------------------------------------------------------------------------
function decoSprites() {
  const d = {};
  let p = new Pix(16, 16); // Pilz
  p.set(7, 9, PAL.fw); p.set(7, 10, PAL.fw); p.set(8, 10, '#d9d2c0');
  p.hline(5, 9, 8, PAL.fr); p.hline(6, 8, 7, PAL.fr); p.set(6, 7, PAL.fw); p.set(8, 8, PAL.fw); p.hline(5, 9, 9, '#00000000');
  p.set(5, 9, '#00000030'); p.set(9, 9, '#00000030'); p.hline(6, 9, 11, '#00000030');
  d.mushroom = p;
  p = new Pix(16, 16); // Farn
  for (const [x, y] of [[4, 10], [5, 9], [6, 8], [7, 7], [8, 8], [9, 9], [10, 10], [7, 8], [7, 9], [7, 10], [6, 10], [8, 10], [5, 11], [9, 11]]) p.set(x, y, PAL.f3);
  p.set(7, 7, PAL.g2); p.set(5, 9, PAL.g2);
  d.fern = p;
  p = new Pix(16, 16); // Kiesel
  p.set(5, 9, PAL.st2); p.set(6, 9, PAL.st1); p.set(5, 10, PAL.st0); p.set(6, 10, PAL.st0);
  p.set(9, 11, PAL.st2); p.set(9, 12, PAL.st0); p.set(10, 12, '#00000030');
  d.pebbles = p;
  p = new Pix(16, 16); // Muschel
  p.set(7, 8, PAL.fp); p.set(8, 8, PAL.fw); p.set(9, 8, PAL.fp); p.set(8, 7, PAL.fw); p.set(8, 9, PAL.s0);
  d.shell = p;
  p = new Pix(16, 16); // Schilf
  for (const [x, top] of [[4, 6], [7, 3], [10, 5], [12, 8]]) {
    for (let y = top; y < 15; y++) p.set(x, y, y < top + 3 ? PAL.wd1 : PAL.g1);
    p.set(x, top - 1, PAL.g2);
    p.set(x + 1, 13, PAL.g0);
  }
  d.reeds = p;
  for (let v = 0; v < 2; v++) { // Seerose
    p = new Pix(16, 16);
    p.ellipse(8, 9, 4, 2.6, PAL.l3);
    p.hline(5, 10, 10, PAL.l2); p.set(8, 8, PAL.w1); p.set(9, 8, PAL.w1); p.set(8, 7, PAL.w1);
    p.hline(5, 11, 12, '#00000025');
    if (v) { p.set(6, 8, PAL.fp); p.set(7, 7, PAL.fw); p.set(6, 7, PAL.fp); }
    d['lily' + v] = p;
  }
  const out = {};
  for (const k in d) out[k] = d[k].canvas();
  return out;
}

// ---------------------------------------------------------------------------
// Objekt-Sprites (y-sortiert, meist blockierend)
// ---------------------------------------------------------------------------
function oakSprite(v) {
  const r = mulberry32(900 + v);
  const p = new Pix(32, 36);
  p.ellipse(16, 32.5, 10, 3.2, PAL.shadow);
  trunk(p, 16, 18, 31);
  const clumps = [];
  const cx = 16, cy = 13 + (v === 2 ? 1 : 0);
  const rx = v === 1 ? 11 : 12, ry = v === 1 ? 10 : 10.5;
  const n = 9;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + r() * 0.4;
    const x = cx + Math.cos(a) * rx * 0.6, y = cy + Math.sin(a) * ry * 0.55;
    clumps.push({ x, y, r: 5 + r() * 1.6, bias: -(y - cy) / 22 });
  }
  clumps.push({ x: cx - 2, y: cy - 2, r: 7, bias: 0.15 });
  clumps.push({ x: cx + 3, y: cy - 4, r: 5, bias: 0.25 });
  clumps.push({ x: cx - 3, y: cy - 6, r: 4.5, bias: 0.3 });
  canopy(p, clumps, [PAL.l0, PAL.l1, PAL.l2, PAL.l3, PAL.l4], PAL.out);
  if (v === 2) for (const [x, y] of [[9, 12], [21, 9], [14, 18], [23, 16], [12, 6]]) { p.set(x, y, PAL.fr); p.set(x + 1, y, '#ff7a6b'); }
  return { pix: p, ox: -8, oy: -34 };
}

function pineSprite(v) {
  const p = new Pix(28, 40);
  p.ellipse(14, 36.5, 8, 2.8, PAL.shadow);
  trunk(p, 14, 28, 35, 4);
  const tiers = v === 0 ? [[3, 8], [9, 11], [16, 13], [23, 13]] : [[2, 7], [7, 9], [13, 11], [19, 13], [25, 13]];
  const cols = [PAL.p0, PAL.p1, PAL.p2, PAL.p3, PAL.p4];
  const mask = new Uint8Array(28 * 40);
  for (const [ty, hw] of tiers) {
    const h = 9;
    for (let y = ty; y < ty + h; y++) {
      const t = (y - ty) / (h - 1);
      const w = Math.max(1, Math.round(hw * (0.25 + 0.75 * t)));
      for (let x = 14 - w; x < 14 + w; x++) {
        const rel = (x + 0.5 - 14) / w;
        let idx = rel < -0.35 ? 3 : rel < 0.25 ? 2 : 1;
        if (y === ty + h - 1 || (y === ty + h - 2 && (x % 3 === 0))) idx = 0;
        if (idx === 3 && (x + y) % 4 === 0 && t < 0.8) idx = 4;
        p.set(x, y, cols[idx]);
        mask[y * 28 + x] = 1;
      }
    }
  }
  const add = [];
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 28; x++) {
      if (mask[y * 28 + x] || y > 30) continue;
      const m = (xx, yy) => xx >= 0 && yy >= 0 && xx < 28 && yy < 40 && mask[yy * 28 + xx];
      if (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1)) add.push(x, y);
    }
  for (let i = 0; i < add.length; i += 2) { const j = (add[i + 1] * 28 + add[i]) * 4; if (p.d[j + 3] === 255) continue; p.d[j + 3] = 0; p.set(add[i], add[i + 1], PAL.out); }
  return { pix: p, ox: -6, oy: -38 };
}

function bushSprite(v) {
  const r = mulberry32(1000 + v);
  const p = new Pix(20, 16);
  p.ellipse(10, 13.5, 8, 2.5, PAL.shadow);
  const clumps = [];
  for (let k = 0; k < 5; k++) clumps.push({ x: 4.5 + k * 2.7 + r(), y: 8 + r() * 2.5, r: 3.6 + r(), bias: 0 });
  clumps.push({ x: 9, y: 6, r: 4.5, bias: 0.25 });
  clumps.push({ x: 12.5, y: 6.5, r: 3.5, bias: 0.2 });
  canopy(p, clumps, [PAL.l0, PAL.l1, PAL.l2, PAL.l3, PAL.l4], PAL.out);
  if (v === 1) for (const [x, y] of [[6, 7], [11, 5], [14, 9], [8, 10]]) { p.set(x, y, PAL.fr); p.set(x, y - 1, '#ff9a8a'); }
  return { pix: p, ox: -2, oy: -15 };
}

function rockSprite(v) {
  const p = new Pix(16, 13);
  p.ellipse(8, 10.5, 7, 2.5, PAL.shadow);
  const rx = v ? 5 : 6.5, ry = v ? 4 : 5;
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 16; x++) {
      const dx = (x + 0.5 - 8) / rx, dy = (y + 0.5 - 7) / ry;
      if (dx * dx + dy * dy > 1 || y > 10) continue;
      const l = -(dx * 0.6 + dy * 0.8);
      p.set(x, y, l > 0.5 ? PAL.st3 : l > 0 ? PAL.st2 : l > -0.5 ? PAL.st1 : PAL.st0);
    }
  if (!v) { p.set(9, 5, PAL.st0); p.set(10, 6, PAL.st0); p.set(10, 7, PAL.st0); p.set(5, 8, PAL.l3); p.set(6, 8, PAL.l2); }
  return { pix: p.outlined(), ox: -1, oy: -13 };
}

function houseSprite(roof) {
  const [r0, r1, r2, r3] = roof;
  const p = new Pix(80, 72);
  // --- Wand
  p.rect(4, 40, 72, 32, PAL.pl1);
  const r = mulberry32(42);
  for (let k = 0; k < 40; k++) p.set(ri(r, 5, 74), ri(r, 44, 64), r() < 0.5 ? PAL.pl2 : PAL.pl0);
  p.rect(4, 40, 72, 3, PAL.wd1); p.hline(4, 75, 43, PAL.wd0); p.hline(4, 75, 44, PAL.pl0); p.hline(4, 75, 45, PAL.pl0);
  for (const x of [4, 73]) { p.rect(x, 40, 3, 26, PAL.wd1); p.vline(x + 2, 40, 65, PAL.wd0); p.vline(x, 40, 65, PAL.wd2); }
  // Fundament
  p.rect(4, 66, 72, 6, PAL.st1);
  p.hline(4, 75, 66, PAL.st2);
  for (let x = 4; x < 76; x++) { if (x % 6 === 0) p.vline(x, 67, 68, PAL.st0); if ((x + 3) % 6 === 0) p.vline(x, 70, 71, PAL.st0); }
  p.hline(4, 75, 69, PAL.st0);
  // Fenster
  for (const wx of [12, 54]) {
    p.rect(wx, 48, 14, 11, PAL.wd0);
    p.rect(wx + 1, 49, 12, 9, PAL.wd2);
    p.rect(wx + 2, 50, 10, 7, PAL.win1);
    p.hline(wx + 2, wx + 11, 50, PAL.win0); p.vline(wx + 2, 50, 56, PAL.win0);
    p.set(wx + 9, 51, PAL.win2); p.set(wx + 10, 52, PAL.win2); p.set(wx + 4, 54, PAL.win2);
    p.vline(wx + 7, 50, 56, PAL.wd1); p.hline(wx + 2, wx + 11, 53, PAL.wd1);
    // Blumenkasten
    p.rect(wx, 59, 14, 3, PAL.wd1); p.hline(wx, wx + 13, 61, PAL.wd0);
    for (let i = 0; i < 14; i += 2) { p.set(wx + i, 58, i % 4 ? PAL.fr : PAL.fy); p.set(wx + i + 1, 58, PAL.g2); }
    p.hline(wx, wx + 13, 62, PAL.pl0);
  }
  // Tür
  p.rect(33, 47, 14, 19, PAL.wd0);
  p.rect(34, 49, 12, 17, PAL.wd2);
  p.hline(35, 44, 48, PAL.wd2);
  for (let x = 36; x < 46; x += 3) p.vline(x, 49, 65, PAL.wd1);
  p.hline(34, 45, 49, PAL.wd3);
  p.set(43, 57, PAL.fy); p.set(43, 58, PAL.wd0);
  p.rect(32, 66, 16, 2, PAL.st3); p.hline(32, 47, 68, PAL.st0);
  // --- Dach (Ziegelreihen, trapezförmig)
  for (let y = 4; y <= 41; y++) {
    const t = (y - 4) / 37;
    const hw = Math.round(30 + 10 * t);
    const x0 = 40 - hw, x1 = 39 + hw;
    const band = Math.floor((y - 4) / 5), k = (y - 4) % 5, off = (band % 2) * 4;
    for (let x = x0; x <= x1; x++) {
      let c = k === 0 ? r3 : k === 4 ? r0 : r2;
      if (k > 0 && k < 4 && (x + off) % 8 === 0) c = r1;
      if (x < x0 + 2 || x > x1 - 2) c = k === 0 ? r2 : r1; // Ortgang etwas dunkler
      p.set(x, y, c);
    }
  }
  p.hline(0, 79, 41, r0); p.hline(1, 78, 42, '#00000044');
  // First
  p.rect(10, 1, 60, 4, r1); p.hline(11, 68, 1, r3); p.hline(10, 69, 4, r0);
  for (let x = 13; x < 68; x += 6) p.set(x, 2, r2);
  // Schornstein
  p.rect(57, 0, 8, 13, PAL.st1); p.rect(56, 0, 10, 3, PAL.st2); p.hline(56, 65, 2, PAL.st0);
  p.hline(57, 64, 6, PAL.st0); p.hline(57, 64, 10, PAL.st0); p.set(60, 4, PAL.st0); p.set(62, 8, PAL.st0); p.set(59, 11, PAL.st0);
  p.vline(64, 3, 12, PAL.st0);
  return { pix: p.outlined(), ox: -1, oy: -73 };
}

function wellSprite() {
  const p = new Pix(32, 40);
  p.ellipse(16, 37, 14, 3, PAL.shadow);
  // Steinring (Vorderseite)
  p.rect(3, 24, 26, 13, PAL.st1);
  for (let y = 24; y < 37; y++) for (let x = 3; x < 29; x++) {
    const row = Math.floor((y - 24) / 4), off = row % 2 ? 3 : 0;
    if ((y - 24) % 4 === 3 || (x + off) % 6 === 0) p.set(x, y, PAL.st0);
    else if ((y - 24) % 4 === 0) p.set(x, y, PAL.st2);
  }
  p.ellipse(16, 23.5, 13, 4, PAL.st2);
  p.ellipse(16, 23.5, 10, 2.6, '#123055');
  p.hline(9, 22, 23, PAL.w0);
  // Pfosten und Dach
  for (const x of [5, 25]) { p.rect(x, 7, 3, 18, PAL.wd1); p.vline(x, 7, 24, PAL.wd2); p.vline(x + 2, 7, 24, PAL.wd0); }
  p.hline(7, 25, 11, PAL.wd0); p.hline(7, 25, 12, PAL.wd2);
  p.vline(16, 13, 19, PAL.wd3); p.rect(14, 19, 5, 4, PAL.wd2); p.hline(14, 18, 19, PAL.wd3); p.hline(14, 18, 22, PAL.wd0);
  const roof = ROOFS.red;
  for (let y = 0; y <= 8; y++) {
    const hw = 9 + y * 0.9;
    for (let x = Math.round(16 - hw); x < Math.round(16 + hw); x++) p.set(x, y, y === 8 ? roof[0] : y % 3 === 0 ? roof[3] : (x + (y % 6 < 3 ? 0 : 2)) % 4 === 0 ? roof[1] : roof[2]);
  }
  return { pix: p.outlined(), ox: -1, oy: -41 };
}

function signSprite() {
  const p = new Pix(16, 18);
  p.ellipse(8, 16.5, 5, 1.6, PAL.shadow);
  p.rect(7, 8, 2, 9, PAL.wd1); p.vline(8, 8, 16, PAL.wd0);
  p.rect(1, 2, 14, 8, PAL.wd2);
  p.hline(1, 14, 2, PAL.wd3); p.hline(1, 14, 9, PAL.wd0);
  p.hline(3, 9, 4, PAL.wd0); p.hline(3, 12, 6, PAL.wd0); p.hline(4, 8, 8, PAL.wd1);
  return { pix: p.outlined(), ox: -1, oy: -19 };
}

function fenceSprite(kind) {
  const p = new Pix(16, 16);
  const post = (x) => { p.rect(x, 3, 3, 12, PAL.wd2); p.vline(x, 3, 14, PAL.wd3); p.vline(x + 2, 3, 14, PAL.wd0); p.hline(x, x + 2, 2, PAL.wd3); p.set(x + 1, 15, '#00000040'); };
  if (kind === 'H') {
    for (const y of [6, 10]) { p.hline(0, 15, y, PAL.wd3); p.hline(0, 15, y + 1, PAL.wd1); }
    post(1); post(12);
  } else if (kind === 'V') {
    p.rect(7, 0, 2, 16, PAL.wd2); p.vline(7, 0, 15, PAL.wd3); p.vline(9, 0, 15, PAL.wd0);
    post(6);
  } else post(6);
  return { pix: p.outlined(), ox: -1, oy: -17 };
}

function crateSprite() {
  const p = new Pix(14, 13);
  p.rect(0, 0, 14, 13, PAL.wd2);
  p.hline(0, 13, 0, PAL.wd3); p.hline(0, 13, 12, PAL.wd0);
  p.rect(0, 0, 2, 13, PAL.wd1); p.rect(12, 0, 2, 13, PAL.wd1);
  for (let i = 2; i < 12; i++) { p.set(i, i, PAL.wd1); p.set(i, i + 1, PAL.wd0); }
  p.hline(2, 11, 4, PAL.wd1); p.hline(2, 11, 8, PAL.wd1);
  return { pix: p.outlined(), ox: 0, oy: -15 };
}

function barrelSprite() {
  const p = new Pix(12, 14);
  for (let y = 0; y < 14; y++) {
    const w = y < 2 || y > 11 ? 5 : 6;
    for (let x = 6 - w; x < 6 + w; x++) p.set(x, y, x < 4 ? PAL.wd3 : x > 8 ? PAL.wd1 : PAL.wd2);
  }
  p.ellipse(6, 1.5, 5, 1.6, PAL.wd1);
  for (const y of [3, 10]) p.hline(0, 11, y, PAL.st0);
  return { pix: p.outlined(), ox: 1, oy: -15 };
}

function lampSprite() {
  const p = new Pix(10, 30);
  p.ellipse(5, 28.5, 4, 1.4, PAL.shadow);
  p.rect(4, 9, 2, 19, PAL.st0); p.vline(4, 9, 27, PAL.st1);
  p.rect(2, 26, 6, 2, PAL.st0); p.hline(2, 7, 26, PAL.st1);
  p.rect(1, 2, 8, 7, '#2c2a33');
  p.rect(2, 3, 6, 5, '#ffe9a6'); p.set(3, 4, '#fffbe6'); p.vline(5, 3, 7, '#c9a24a');
  p.hline(0, 9, 1, '#2c2a33'); p.hline(2, 7, 0, '#2c2a33');
  return { pix: p.outlined(), ox: 2, oy: -31 };
}

function planterSprite(v) {
  const p = new Pix(14, 16);
  p.ellipse(7, 14.5, 6, 1.6, PAL.shadow);
  p.rect(1, 8, 12, 7, PAL.st1); p.hline(1, 12, 8, PAL.st2); p.hline(1, 12, 14, PAL.st0); p.vline(12, 8, 14, PAL.st0);
  p.ellipse(7, 6, 6, 4, PAL.l2); p.ellipse(6, 5, 4, 3, PAL.l3);
  const cols = v ? [PAL.fp, PAL.fw] : [PAL.fy, PAL.fr];
  for (const [x, y, k] of [[3, 5, 0], [6, 3, 1], [9, 5, 0], [5, 7, 1], [10, 7, 1], [8, 2, 0]]) p.set(x, y, cols[k]);
  return { pix: p.outlined(), ox: 0, oy: -17 };
}

// ---------------------------------------------------------------------------
export function buildArt() {
  const t0 = performance.now();
  const tiles = {
    grass: [0, 1, 2, 3].map((v) => grassTile(v).canvas()),
    flower: [0, 1, 2, 3, 4, 5].map((v) => flowerTile(v).canvas()),
    forest: [0, 1, 2].map((v) => forestTile(v).canvas()),
    dirt: [0, 1, 2].map((v) => dirtTile(v).canvas()),
    sand: [0, 1, 2].map((v) => sandTile(v).canvas()),
    stone: [0, 1].map((v) => stoneTile(v).canvas()),
    farm: [0, 1, 2, 3].map((v) => farmTile(v).canvas()),
    bridgeH: bridgeTile(true).canvas(),
    bridgeV: bridgeTile(false).canvas(),
    water: [], deep: [],
  };
  for (let f = 0; f < 4; f++) {
    tiles.water.push([0, 1, 2, 3].map((v) => waterTile(v, f, false).canvas()));
    tiles.deep.push([0, 1].map((v) => waterTile(v, f, true).canvas()));
  }
  const rails = {};
  for (const s of ['N', 'E', 'S', 'W']) rails[s] = railOverlay(s).canvas();

  const edgeCache = new Map();
  function edge(fill, speck, rims, side, variant) {
    const key = [fill, speck, rims.join(','), side, variant].join('|');
    let c = edgeCache.get(key);
    if (!c) {
      const pix = side[0] === 'c' ? concaveOverlay(fill, rims, side.slice(1)) : side[0] === 'd' ? diagOverlay(fill, speck, rims, side.slice(1)) : side.length === 2 ? cornerOverlay(fill, rims, side) : edgeOverlay(fill, speck, rims, side, variant);
      c = pix.canvas(); edgeCache.set(key, c);
    }
    return c;
  }

  const sprites = {};
  const reg = (name, s) => { sprites[name] = { canvas: s.pix.canvas(), ox: s.ox, oy: s.oy, w: s.pix.w, h: s.pix.h }; };
  [0, 1, 2].forEach((v) => reg('oak' + v, oakSprite(v)));
  [0, 1].forEach((v) => reg('pine' + v, pineSprite(v)));
  [0, 1].forEach((v) => reg('bush' + v, bushSprite(v)));
  [0, 1].forEach((v) => reg('rock' + v, rockSprite(v)));
  for (const k in ROOFS) reg('house_' + k, houseSprite(ROOFS[k]));
  reg('well', wellSprite());
  reg('sign', signSprite());
  reg('fenceH', fenceSprite('H'));
  reg('fenceV', fenceSprite('V'));
  reg('fenceP', fenceSprite('P'));
  reg('crate', crateSprite());
  reg('barrel', barrelSprite());
  reg('lamp', lampSprite());
  [0, 1].forEach((v) => reg('planter' + v, planterSprite(v)));

  const art = { tiles, rails, edge, sprites, deco: decoSprites(), player: buildCharacter(PLAYER_LOOK), buildCharacter };
  buildAreaArt(art);
  art.buildMs = performance.now() - t0;
  return art;
}
