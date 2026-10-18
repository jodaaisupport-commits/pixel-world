// Gezeitentempel: versunkener Tempel draußen vor der Möwenbucht (nur per Boot erreichbar), Arena der Thalassa.
import { createMap, T } from '../map.js';
import { TS } from '../pix.js';
import { makeValueNoise, fbm } from '../noise.js';

export const TH_ARENA = { cx: 18 * TS, cy: 11 * TS + 8, rx: 14.5 * TS, ry: 8.2 * TS };
export const TH_RESPAWN = [17.5, 27];
/** Becken, aus denen Thalassa auftaucht (Tile-Mitte); Index 0 = großes Mittelbecken. */
export const TH_POOLS = [[18, 10], [9, 7], [27, 7], [9, 15], [27, 15]];
export const TEMPLE_DOCK = { x: 18, y: 41 };

export function tempel() {
  const W = 36, H = 46, seed = 5151;
  const m = createMap({
    id: 'tempel', name: 'Gezeitentempel', W, H, fill: T.CAVEWALL, seed, kind: 'cave',
    styles: { cavewall: 'temple' },
    ambience: { dark: 0.42, darkColor: '0,16,22', playerLight: 80, particles: 'bubbles' },
  });
  m.bg = '#02090b';
  const n = makeValueNoise(seed);
  const floor = (x, y, t = T.TEMPLE) => { if (x > 0 && y > 0 && x < W - 1 && y < H) m.set(x, y, t); };
  // Anlegestelle
  for (let y = 38; y < H; y++) for (let x = 8; x <= 27; x++) floor(x, y, y >= 41 ? (y >= 43 ? T.DEEP : T.WATER) : T.TEMPLE);
  for (let y = 40; y <= 43; y++) for (const x of [17, 18]) floor(x, y, T.BRIDGE);
  // Gang mit Kanälen
  for (let y = 25; y <= 38; y++) for (let x = 11; x <= 24; x++) floor(x, y, (x === 12 || x === 23) && y > 26 && y < 37 ? T.WATER : T.TEMPLE);
  // Vorhalle
  for (let y = 21; y <= 27; y++) for (let x = 5; x <= 30; x++) if (((x + 0.5 - 18) / 13) ** 2 + ((y + 0.5 - 24) / 3.8) ** 2 + (fbm(n, x / 3, y / 3, 2) - 0.5) * 0.25 < 1) floor(x, y);
  for (let y = 19; y <= 22; y++) for (let x = 15; x <= 20; x++) floor(x, y);
  // Arena
  for (let y = 1; y < 20; y++) for (let x = 1; x < W - 1; x++) {
    const dx = (x + 0.5 - 18) / 16, dy = (y + 0.5 - 10.5) / 9.4;
    if (dx * dx + dy * dy + (fbm(n, x / 2.5, y / 2.5, 2) - 0.5) * 0.12 < 1) floor(x, y);
  }
  TH_POOLS.forEach(([cx, cy], i) => {
    const w = i === 0 ? 2 : 1, h = 1;
    for (let y = cy - h; y <= cy + h - (i === 0 ? 0 : 1); y++) for (let x = cx - w; x <= cx + w - (i === 0 ? 1 : 0); x++) floor(x, y, i === 0 && (y === cy) ? T.DEEP : T.WATER);
  });
  // Boot (Rückfahrt)
  m.place('boat2', 19, 43, 1, 1, 99);
  m.interact.push({ x: TEMPLE_DOCK.x, y: TEMPLE_DOCK.y + 1, id: 'boot2', text: 'Jans Boot schaukelt sanft am Steg.' });
  m.exit(17, H - 1, 2, 1, 'kueste', 46, 16, 'up'); // Notausgang (unerreichbar, nur Sicherheit)
  m.spawn = { x: TEMPLE_DOCK.x * TS + 8, y: (TEMPLE_DOCK.y - 1) * TS + 12 };
  // Gezeitengitter vor der Arena
  m.place('tpillar1', 14, 20, 1, 1); m.place('tpillar0', 21, 20, 1, 1);
  m.place('tidebars', 15, 20, 4, 1, 0, { showIf: 'a2_th_lock' });
  m.place('tidebars', 17, 20, 4, 1, 0, { showIf: 'a2_th_lock' });
  // Säulen, Kohlebecken, Korallen, Seetang
  for (const [x, y, v] of [[6, 4, 0], [30, 4, 1], [4, 11, 1], [32, 11, 0], [6, 18, 1], [30, 18, 0]]) if (m.get(x, y) === T.TEMPLE) m.place('tpillar' + v, x, y);
  for (const [x, y] of [[14, 24], [22, 24], [11, 30], [24, 30], [15, 38], [21, 38], [8, 22], [28, 22]]) if (m.get(x, y) === T.TEMPLE) {
    m.place('brazier', x, y);
    m.light(x * TS + 8, y * TS - 6, 54, 'rgba(90,220,255,0.6)', 1);
  }
  for (const [x, y] of [[11, 39], [25, 40], [9, 25], [27, 26], [13, 33], [22, 28]]) if (m.get(x, y) === T.TEMPLE) m.place('seaweed', x, y, 1, 1, 99);
  for (const [x, y, v] of [[10, 40], [26, 39], [6, 24], [29, 24], [14, 28], [21, 34]].map((p, i) => [...p, i % 2])) if (m.get(x, y) === T.TEMPLE) m.place('coral' + v, x, y);
  for (const [x, y] of [[16, 30], [19, 35], [10, 23]]) m.decal('tidepool', x * TS - 4, y * TS + 2);
  m.place('pearlaltar', 17, 2, 2, 1, 0, { showIf: 'a2_thalassa' });
  m.light(18 * TS, 2 * TS, 80, 'rgba(220,200,255,0.55)', 0.3); m.lights[m.lights.length - 1].showIf = 'a2_thalassa';
  m.interact.push({ x: 17.5, y: 2, id: 'pearlaltar', text: 'Ein Altar in Form einer Muschel.' });
  m.light(TH_ARENA.cx, TH_ARENA.cy, 120, 'rgba(60,200,200,0.35)', 0.4);
  { const f = m.findFree(27, 24, (t) => t === T.TEMPLE); if (f) m.chest(f[0], f[1], [['grosstrank', 1], ['taler', 30]]); }
  m.enemy('qualle', 14, 32); m.enemy('qualle', 21, 29); m.enemy('muschel', 18, 26); m.enemy('muschel', 9, 23); m.enemy('qualle', 26, 23);
  m.biomeAt = (tx, ty) => (ty <= 19 ? 'Halle der Gezeiten' : ty <= 27 ? 'Vorhalle' : ty >= 39 ? 'Anlegestelle' : 'Gezeitentempel');
  return m.finalize();
}

export const TEMPEL_MAPS = { tempel };
