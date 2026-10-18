// Handgestaltete Innenräume der vier Dorfhäuser (13x10 Tiles).
// Reihe 0 = Wandoberseite, 1-2 = Wandfront, 3-8 = Boden, 9 = Wand mit Tür (6,9).
import { createMap, T } from '../map.js';
import { TS } from '../pix.js';

const W = 13, H = 10, DOOR_X = 6;

export function room({ id, name, floor, outside, dark = 0.22, to = 'village' }) {
  const m = createMap({
    id, name, W, H, fill: T.WALL, kind: 'interior',
    styles: { floor: floor === 'flag' ? 'schmiede' : id, wall: 'wall_' + id, mat: id },
    ambience: { dark, darkColor: '24,12,6', playerLight: 0 },
  });
  m.fill(1, 3, W - 2, H - 2, floor === 'flag' ? T.FLAG : T.WOOD);
  m.set(DOOR_X, H - 1, T.MAT);
  m.exit(DOOR_X, H - 1, 1, 1, to, outside[0], outside[1], 'down', 'door');
  m.spawn = { x: DOOR_X * TS + 8, y: (H - 2) * TS + 12 };
  m.bg = '#0b0706';
  return m;
}
export const wallDecal = (m, sprite, tx, py = 18) => m.decal(sprite, tx * TS, py);

function taverne() {
  const m = room({ id: 'taverne', name: 'Taverne „Zum Goldenen Krug“', floor: 'wood', outside: [46, 26] });
  m.decal('rug_red', 5 * TS, 5 * TS);
  wallDecal(m, 'window', 4); wallDecal(m, 'window', 7);
  wallDecal(m, 'painting1', 5, 16);
  m.place('fireplace', 1, 3, 2, 1);
  m.light(2 * TS, 3 * TS + 10, 70, 'rgba(255,150,60,0.55)', 1);
  m.place('kegs', 10, 3, 2, 1);
  m.place('counter_v3', 9, 4, 1, 3);
  m.place('barrel', 11, 8);
  m.place('table_mugs', 2, 5, 2, 1); m.place('stool', 1, 5); m.place('stool', 4, 5);
  m.place('table_candle', 2, 7, 2, 1); m.place('stool', 1, 7); m.place('stool', 4, 7);
  m.light(3 * TS, 7 * TS + 2, 36, 'rgba(255,200,110,0.45)', 1);
  m.place('plant1', 8, 3);
  m.npcs.push({ id: 'greta', x: 10, y: 5, mode: 'stand', dir: 'left' });
  return m.finalize();
}

function kraemer() {
  const m = room({ id: 'kraemer', name: 'Krämerladen', floor: 'wood', outside: [67, 25] });
  m.decal('rug_green', 4.5 * TS, 6.5 * TS);
  m.place('shelf_goods', 1, 3, 2, 1); m.place('shelf_books', 3, 3, 2, 1);
  m.place('shelf_goods', 8, 3, 2, 1); m.place('shelf_goods', 10, 3, 2, 1);
  wallDecal(m, 'window', 6);
  m.place('counter_h4', 4, 5, 4, 1);
  m.place('sack', 1, 7); m.place('sack', 1, 8); m.place('crate', 11, 7); m.place('barrel', 11, 8); m.place('crate', 10, 8);
  m.place('plant0', 5, 3);
  m.light(6 * TS + 8, 2 * TS + 8, 60, 'rgba(255,240,200,0.35)');
  m.npcs.push({ id: 'anton', x: 6, y: 4, mode: 'wander', home: [5, 4, 7, 4], speed: 18 });
  return m.finalize();
}

function schmiede() {
  const m = room({ id: 'schmiede', name: 'Schmiede', floor: 'flag', outside: [67, 38], dark: 0.35 });
  m.place('forge', 9, 3, 2, 1);
  m.light(10 * TS, 3 * TS + 6, 80, 'rgba(255,120,40,0.6)', 1.5);
  wallDecal(m, 'weaponrack', 2, 20); wallDecal(m, 'pots', 5, 18);
  m.decal('coal', 11 * TS - 2, 5 * TS + 4);
  m.place('anvil', 8, 5);
  m.place('barrel', 1, 7); m.place('crate', 1, 8); m.place('crate', 11, 8); m.place('barrel', 2, 8);
  m.place('table_map', 2, 4, 2, 1); m.place('stool', 4, 4);
  m.place('sack', 11, 7);
  m.npcs.push({ id: 'bruno', x: 7, y: 5, mode: 'stand', dir: 'right' });
  return m.finalize();
}

function zuhause() {
  const m = room({ id: 'zuhause', name: 'Oma Hildes Haus', floor: 'wood', outside: [46, 38] });
  m.decal('rug_blue', 8 * TS, 5 * TS);
  wallDecal(m, 'window', 3); wallDecal(m, 'window', 8); wallDecal(m, 'painting0', 6, 16);
  m.place('bed_red', 1, 3, 1, 2);
  m.place('shelf_books', 4, 3, 2, 1);
  m.place('fireplace', 9, 3, 2, 1);
  m.light(10 * TS, 3 * TS + 10, 64, 'rgba(255,150,60,0.5)', 1);
  m.place('plant1', 11, 3); m.place('plant0', 1, 8); m.place('plant0', 11, 8);
  m.place('table_bread', 4, 6, 2, 1); m.place('stool', 3, 6); m.place('stool', 6, 6);
  m.npcs.push({ id: 'hilde', x: 8, y: 7, mode: 'wander', home: [7, 5, 10, 8], speed: 16 });
  return m.finalize();
}

export const INTERIORS = { taverne, kraemer, schmiede, zuhause };
