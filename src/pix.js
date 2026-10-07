// Gemeinsame Pixel-Art-Grundlagen: Palette, Pixel-Puffer, kleine Helfer.
export const TS = 16; // Tile-Größe in Pixeln

// Handverlesene Palette (warm, leicht entsättigt, Stardew/Zelda-Feeling).
export const PAL = {
  out: '#20161a',
  g0: '#3a7a3a', g1: '#4e9a45', g2: '#66b350', g3: '#88cc62',
  f0: '#1f4a2e', f1: '#2b5f37', f2: '#3a7442', f3: '#4d8a4c',
  d0: '#7a5232', d1: '#a6764a', d2: '#bd8e5c', d3: '#d6ab76',
  s0: '#c3a265', s1: '#e2c78c', s2: '#efdaa6', s3: '#f9eecb',
  w0: '#21508c', w1: '#2e6cae', w2: '#3d84c6', w3: '#78bbe6', w4: '#d6f1ff',
  st0: '#555a69', st1: '#7f8696', st2: '#a4abb8', st3: '#ccd2da',
  wd0: '#3d2516', wd1: '#664226', wd2: '#8c5e36', wd3: '#b07e4c',
  l0: '#163a25', l1: '#21562e', l2: '#2e7638', l3: '#479843', l4: '#7cc15a',
  p0: '#0f2c22', p1: '#18432f', p2: '#225e40', p3: '#337d52', p4: '#4f9a63',
  pl0: '#a48d68', pl1: '#d8c49c', pl2: '#efe2c2',
  win0: '#3c6f99', win1: '#7fc8ec', win2: '#d6f2ff',
  fw: '#f6f3ea', fy: '#ffd23f', fp: '#f27ea0', fb: '#7fb2ff', fr: '#e5484d', fv: '#b685e6',
  shadow: '#00000040',
};

export const ROOFS = {
  red: ['#5e2125', '#8f3530', '#b84b3b', '#dd7553'],
  blue: ['#1f2f57', '#2f4a85', '#456db3', '#6f97d6'],
  green: ['#1f4030', '#2f5e3e', '#477f4c', '#6ba266'],
  plum: ['#3f2140', '#61335e', '#844a7c', '#a86e9b'],
};

// ---------------------------------------------------------------------------
// Pix: minimaler Pixel-Puffer mit Hilfsfunktionen, wird zu einem Canvas.
// ---------------------------------------------------------------------------
const colorCache = new Map();
function parseColor(c) {
  let v = colorCache.get(c);
  if (v) return v;
  let h = c.slice(1);
  if (h.length === 3) h = [...h].map((ch) => ch + ch).join('');
  v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16),
    h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255];
  colorCache.set(c, v);
  return v;
}

export class Pix {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b, a] = parseColor(c);
    const i = (y * this.w + x) * 4, d = this.d;
    if (a === 255 || d[i + 3] === 0) { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; return; }
    const af = a / 255; // einfaches "over"-Blending
    d[i] = d[i] * (1 - af) + r * af;
    d[i + 1] = d[i + 1] * (1 - af) + g * af;
    d[i + 2] = d[i + 2] * (1 - af) + b * af;
    d[i + 3] = Math.max(d[i + 3], a);
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.d[(y * this.w + x) * 4 + 3];
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  hline(x0, x1, y, c) { for (let x = x0; x <= x1; x++) this.set(x, y, c); }
  vline(x, y0, y1, c) { for (let y = y0; y <= y1; y++) this.set(x, y, c); }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
  }
  /** Neuer Puffer (+1px Rand) mit dunkler Kontur um alle deckenden Pixel. */
  outlined(col = PAL.out) {
    const o = new Pix(this.w + 2, this.h + 2);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4, j = ((y + 1) * o.w + x + 1) * 4;
        for (let k = 0; k < 4; k++) o.d[j + k] = this.d[i + k];
      }
    const solid = (x, y) => o.alpha(x, y) >= 160;
    const add = [];
    for (let y = 0; y < o.h; y++)
      for (let x = 0; x < o.w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) add.push(x, y);
      }
    for (let i = 0; i < add.length; i += 2) {
      const j = (add[i + 1] * o.w + add[i]) * 4;
      o.d[j + 3] = 0; // Schatten unter der Kontur ersetzen
      o.set(add[i], add[i + 1], col);
    }
    return o;
  }
  flipX() {
    const o = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4, j = (y * this.w + (this.w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) o.d[j + k] = this.d[i + k];
      }
    return o;
  }
  canvas() {
    const c = document.createElement('canvas');
    c.width = this.w; c.height = this.h;
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
export const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));


// Gemeinsame Baum-Helfer (Blätterdach aus Klumpen, Stamm)
export function canopy(p, clumps, cols, outCol) {
  const mask = new Uint8Array(p.w * p.h);
  clumps.sort((a, b) => a.y - b.y);
  for (const c of clumps) {
    for (let y = Math.floor(c.y - c.r); y <= Math.ceil(c.y + c.r); y++)
      for (let x = Math.floor(c.x - c.r); x <= Math.ceil(c.x + c.r); x++) {
        if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
        const dx = x + 0.5 - c.x, dy = y + 0.5 - c.y, d2 = dx * dx + dy * dy;
        if (d2 > c.r * c.r) continue;
        const nx = dx / c.r, ny = dy / c.r;
        let l = -(nx * 0.55 + ny * 0.85) + c.bias;
        let idx = l > 0.62 ? 3 : l > 0.12 ? 2 : l > -0.5 ? 1 : 0;
        // Dithering an den Übergängen
        if (idx < 3 && Math.abs(l - [-0.5, 0.12, 0.62][idx]) < 0.09 && (x + y) % 2 === 0) idx++;
        if (d2 > (c.r - 1.1) * (c.r - 1.1) && nx * 0.45 + ny * 0.9 > 0.35) idx = 0; // Klumpen-Unterkante
        p.set(x, y, cols[idx]);
        if (idx === 3 && (x * 3 + y * 5) % 7 === 0) p.set(x, y, cols[4] || cols[3]);
        mask[y * p.w + x] = 1;
      }
  }
  const add = [];
  for (let y = 0; y < p.h; y++)
    for (let x = 0; x < p.w; x++) {
      if (mask[y * p.w + x]) continue;
      const m = (xx, yy) => xx >= 0 && yy >= 0 && xx < p.w && yy < p.h && mask[yy * p.w + xx];
      if (m(x - 1, y) || m(x + 1, y) || m(x, y - 1) || m(x, y + 1)) add.push(x, y);
    }
  for (let i = 0; i < add.length; i += 2) {
    const j = (add[i + 1] * p.w + add[i]) * 4;
    if (p.d[j + 3] === 255 && p.d[j] < 140 && add[i + 1] > 20) continue; // Stamm nicht übermalen
    p.d[j + 3] = 0; p.set(add[i], add[i + 1], outCol);
  }
}

export function trunk(p, cx, top, bottom, w = 6) {
  const x0 = cx - w / 2;
  p.rect(x0, top, w, bottom - top + 1, PAL.wd1);
  p.vline(x0, top, bottom, PAL.wd0);
  p.vline(x0 + w - 1, top, bottom, PAL.wd0);
  p.vline(x0 + 1, top, bottom, PAL.wd2);
  p.vline(x0 + 2, top + 2, bottom - 1, PAL.wd3);
  p.set(x0 - 1, bottom, PAL.wd0); p.set(x0 + w, bottom, PAL.wd0);
  p.set(x0 - 1, bottom - 1, PAL.wd1); p.set(x0 + w, bottom - 1, PAL.wd1);
  p.hline(x0 - 1, x0 + w, bottom + 1, PAL.out);
  p.set(x0 + 3, top + 6, PAL.wd0); p.set(x0 + 3, top + 7, PAL.wd0);
}

