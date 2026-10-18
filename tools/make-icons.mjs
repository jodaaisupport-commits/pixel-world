// Erzeugt die App-Icons (PNG) prozedural: 32×32-Pixel-Motiv (Schwert + Herz auf Wiese), ganzzahlig hochskaliert.
// Nutzung: node tools/make-icons.mjs   → icons/icon-192.png, icon-512.png, apple-touch-icon.png, favicon-32.png
import fs from 'node:fs';
import zlib from 'node:zlib';

const N = 32, px = Array.from({ length: N * N }, () => [0, 0, 0, 0]);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) px[y * N + x] = hex(c); };
// Hintergrund: abgerundetes Quadrat, Himmel → Wiese
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const cx = Math.max(0, Math.abs(x - 15.5) - 11.5), cy = Math.max(0, Math.abs(y - 15.5) - 11.5);
  if (Math.hypot(cx, cy) > 4.2) continue;
  const c = y < 19 ? (y < 8 ? '#6ec6ff' : '#9ad8ff') : (y < 21 ? '#5ab040' : ((x * 7 + y * 3) % 11 === 0 ? '#4a9a34' : '#3e8a2e'));
  set(x, y, c);
}
for (const [x, y] of [[5, 6], [6, 6], [7, 5], [8, 6], [9, 6], [23, 4], [24, 4], [25, 3], [26, 4]]) set(x, y, '#ffffff');
// Sonne
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - 25, y - 9) < 2.6) set(x, y, '#ffe14d');
// Schwert diagonal
for (let i = 0; i < 12; i++) { set(9 + i, 23 - i, '#e8f4ff'); set(10 + i, 23 - i, '#9ab8d0'); set(9 + i, 22 - i, '#ffffff'); }
for (const [x, y] of [[6, 24], [7, 25], [8, 26], [9, 27], [10, 23], [11, 24], [12, 25], [8, 22], [9, 21]]) set(x, y, '#ffb83a');
for (const [x, y] of [[5, 27], [6, 27], [5, 28], [6, 28], [7, 26], [8, 25]]) set(x, y, '#8a5a2a');
// Herz
const heart = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
heart.forEach((r, y) => [...r].forEach((c, x) => { if (c === '#') set(18 + x, 21 + y, y === 0 || x === 0 ? '#ff7a7a' : '#e83040'); }));
// Umriss um Motive
const out = px.map((p) => p.slice());
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const p = px[y * N + x]; if (!p[3]) continue;
  const bg = ['#6ec6ff', '#9ad8ff', '#5ab040', '#4a9a34', '#3e8a2e'].map(hex).some((b) => b.every((v, i) => v === p[i]));
  if (!bg) continue;
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const q = px[(y + dy) * N + x + dx]; return q && q[3] && !['#6ec6ff', '#9ad8ff', '#5ab040', '#4a9a34', '#3e8a2e', '#ffffff'].map(hex).some((b) => b.every((v, i) => v === q[i])); });
  if (nb && !(p[0] === 255 && p[1] === 255)) out[y * N + x] = hex('#20161a');
}
function png(size, opaque) {
  const k = size / N, raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let p = out[Math.floor(y / k) * N + Math.floor(x / k)];
      if (opaque && !p[3]) p = hex('#20161a');
      raw.set(p, y * (size * 4 + 1) + 1 + x * 4);
    }
  }
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let r = 0xffffffff; for (const v of b) r = t[(r ^ v) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dir = new URL('../icons/', import.meta.url).pathname;
fs.mkdirSync(dir, { recursive: true });
for (const [name, size, opaque] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['apple-touch-icon.png', 192, true], ['favicon-32.png', 32, false]]) fs.writeFileSync(dir + name, png(size, opaque));
console.log('Icons geschrieben nach', dir);
