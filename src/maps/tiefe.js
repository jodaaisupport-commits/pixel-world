// Kristallschlund: Gang, Vorkammer mit Siegeltor und runde Boss-Arena tief unter der Mine.
import { createMap, T } from '../map.js';
import { TS } from '../pix.js';
import { makeValueNoise, fbm } from '../noise.js';

export const ARENA = { cx: 16 * TS, cy: 11 * TS + 8, rx: 11.5 * TS, ry: 8.6 * TS };
export const ARENA_RESPAWN = [15.5, 25];

export function tiefe() {
  const W = 32, H = 36, seed = 6060;
  const m = createMap({
    id: 'tiefe', name: 'Kristallschlund', W, H, fill: T.CAVEWALL, seed, kind: 'cave',
    ambience: { dark: 0.8, darkColor: '8,2,14', playerLight: 70, particles: 'dust' },
  });
  m.bg = '#050308';
  const n = makeValueNoise(seed);
  const floor = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H) m.set(x, y, T.CAVE); };
  // Gang von der Treppe nach Norden
  for (let y = 27; y < H; y++) for (let x = 14; x <= 17; x++) floor(x + (y > 31 && x === 14 ? 0 : 0), y);
  for (let y = 29; y < 33; y++) { floor(13, y); floor(18, y); }
  // Vorkammer
  for (let y = 21; y <= 29; y++) for (let x = 8; x <= 24; x++) if (((x + 0.5 - 16) / 7.5) ** 2 + ((y + 0.5 - 25) / 3.6) ** 2 + (fbm(n, x / 3, y / 3, 2) - 0.5) * 0.5 < 1) floor(x, y);
  for (let x = 13; x <= 18; x++) floor(x, 21);
  for (let y = 18; y <= 21; y++) for (let x = 13; x <= 18; x++) floor(x, y);
  // Arena
  for (let y = 1; y < 21; y++) for (let x = 2; x < 31; x++) {
    const dx = (x + 0.5 - 16) / 12.5, dy = (y + 0.5 - 11) / 9.4;
    if (dx * dx + dy * dy + (fbm(n, x / 2.5, y / 2.5, 2) - 0.5) * 0.18 < 1) floor(x, y);
  }
  // Ausgang (Treppe hinauf zur Höhle)
  m.exit(15, H - 1, 2, 1, 'hoehle', 3, 12.5, 'right', 'door');
  m.decal('stairs_up', 15 * TS, (H - 2) * TS);
  m.spawn = { x: 16 * TS, y: 33 * TS + 12 };
  // Siegeltor mit Pfeilern
  m.place('gatepillar', 13, 21, 1, 1); m.place('gatepillar', 18, 21, 1, 1);
  m.place('sealgate', 14, 21, 4, 1, 0, { hideIf: 'tor' });
  m.place('arenabars', 14, 21, 4, 1, 0, { showIf: 'arena_lock' });
  m.interact.push({ x: 15.5, y: 22, id: 'siegel', text: 'Ein Tor aus schwarzem Kristall. Eine Rune pulsiert darauf.' });
  m.light(16 * TS, 21 * TS, 46, 'rgba(190,90,255,0.6)', 0.5);
  // Säulen rund um die Arena
  const pil = [[6, 5], [26, 5], [3, 11], [29, 11], [6, 17], [26, 17], [11, 2], [21, 2]];
  pil.forEach(([x, y], i) => {
    m.place('pillar' + (i % 2), x, y, 1, 1);
    m.light(x * TS + 8, y * TS - 22, 54, i % 2 ? 'rgba(170,110,255,0.6)' : 'rgba(90,190,255,0.6)', 0.4);
  });
  m.decal('runecircle', ARENA.cx - 56, ARENA.cy - 38);
  m.place('purecrystal', 15, 10, 1, 1, 0, { showIf: 'boss_done' });
  m.light(ARENA.cx, ARENA.cy - 20, 110, 'rgba(120,200,255,0.55)', 0.2);
  m.lights[m.lights.length - 1].showIf = 'boss_done';
  // Kleinkram im Gang
  for (const [x, y] of [[15, 30], [17, 27], [10, 24], [22, 26]]) m.decal(y % 2 ? 'bones' : 'cracks', x * TS, y * TS + 4);
  for (const [x, y] of [[13, 29], [18, 31], [9, 25], [23, 24]]) if (m.get(x, y) === T.CAVE) m.place('stalagmite' + (x % 2), x, y);
  for (const [x, y, v] of [[14, 27, 0], [17, 33, 1], [8, 26, 1], [24, 25, 0]]) if (m.get(x, y) === T.CAVE) { m.place('crystal' + v, x, y); m.light(x * TS + 8, y * TS + 2, 40, v ? 'rgba(190,120,255,0.6)' : 'rgba(90,220,255,0.6)', 0.5); }
  m.biomeAt = (tx, ty) => (ty <= 20 ? 'Herz der Tiefe' : ty <= 29 ? 'Siegelkammer' : 'Kristallschlund');
  return m.finalize();
}
