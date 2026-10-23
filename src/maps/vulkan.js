// Vulkaninsel – neue spielbare Region (Item 47) + Unterwasser-Grotte (48) + Warp-Steine.
import { createMap, T } from '../map.js';
import { TS } from '../pix.js';

export function vulkaninsel() {
  const W = 36, H = 28;
  const m = createMap({
    id: 'vulkaninsel', name: 'Vulkaninsel', W, H, fill: T.STONE, seed: 9001, kind: 'outdoor',
    ambience: { dark: 0.15, darkColor: '40,10,5', particles: 'embers' },
  });
  m.bg = '#1a0a08';
  // Lava-See (Wasser-Tiles als Lava-Stand-in)
  for (let y = 8; y < 16; y++) for (let x = 12; x < 24; x++) m.set(x, y, T.DEEP);
  // Pfad
  for (let y = 18; y < 21; y++) for (let x = 10; x < 26; x++) m.set(x, y, T.DIRT);
  for (let y = 14; y < 20; y++) for (let x = 16; x < 19; x++) m.set(x, y, T.DIRT);
  for (let y = 8; y < 14; y++) for (let x = 12; x < 24; x++) if (m.get(x, y) !== T.DEEP) m.set(x, y, T.DIRT);
  // Rand-Sand/Stein
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (m.get(x, y) === T.STONE && (x < 4 || x > W - 5 || y < 3)) m.set(x, y, T.SAND);
  }
  m.place('rock0', 8, 16); m.place('rock1', 26, 12);
  m.place('rock0', 22, 6); m.place('barrel', 11, 19);
  m.enemies.push({ type: 'golem', x: 20, y: 12 }, { type: 'skorpion', x: 14, y: 20 }, { type: 'staubgeist', x: 24, y: 18 });
  m.pickups.push({ key: 'vulkan_obs1', item: 'obsidian', n: 1, tx: 22, ty: 10 });
  m.pickups.push({ key: 'vulkan_herz', item: 'herz', n: 1, tx: 11, ty: 19 });
  m.chests.push({ key: 'vulkan_chest', tx: 28, ty: 8, contents: [['obsidian', 2], ['taler', 30]] });
  m.interact.push(
    { id: 'warp_vulkan', x: 12, y: 22, text: 'Ein warmer Warp-Stein. Er pulsiert im Takt der Lava.' },
    { id: 'break_rock_v1', x: 8, y: 16, text: 'Ein brüchiger Obsidianfelsen. Mit dem Schwert …?' },
    { id: 'lore_vulkan', x: 18, y: 6, text: 'Eine Tafel: „Das Feuer unter dem Meer hüütet den vierten Splitter – oder das, was von ihm blieb.“' },
  );
  m.exit(10, H - 1, 16, 1, 'kueste', 58, 18, 'down');
  m.npcs.push({ id: 'runen', x: 15, y: 20, mode: 'wander', home: [13, 18, 17, 22], speed: 12 });
  m.spawn = { x: 12 * TS + 8, y: 22 * TS + 12 };
  m.biomeAt = () => 'Vulkaninsel';
  m.meta = {
    climb: (x, y) => y < 10 && x > 14 && x < 22,
    water: (x, y) => m.get(x, y) === T.DEEP || m.get(x, y) === T.WATER,
  };
  return m.finalize();
}

export function grotte() {
  const W = 24, H = 18;
  const m = createMap({
    id: 'grotte', name: 'Unterwasser-Grotte', W, H, fill: T.CAVEWALL, seed: 9002, kind: 'cave',
    ambience: { dark: 0.55, darkColor: '0,20,40', playerLight: 70, particles: 'bubbles' },
  });
  m.bg = '#020814';
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) m.set(x, y, T.CAVE);
  for (let y = 4; y < 10; y++) for (let x = 8; x < 16; x++) m.set(x, y, T.WATER);
  m.enemies.push({ type: 'qualle', x: 12, y: 8 }, { type: 'qualle', x: 16, y: 10 }, { type: 'muschel', x: 6, y: 12 });
  m.pickups.push({ key: 'grotte_perle', item: 'perle', n: 1, tx: 12, ty: 5 });
  m.pickups.push({ key: 'grotte_muschel', item: 'muschel', n: 1, tx: 18, ty: 12 });
  m.chests.push({ key: 'grotte_chest', tx: 4, ty: 4, contents: [['grosstrank', 1], ['taler', 25]] });
  m.interact.push(
    { id: 'warp_grotte', x: 10, y: 14, text: 'Ein kühler Warp-Stein, bedeckt mit Muscheln.' },
    { id: 'lore_grotte', x: 20, y: 6, text: 'Inschrift im Korallenstein: „Thalassas Tränen wurden zu Perlen.“' },
  );
  m.exit(9, H - 1, 4, 1, 'kueste', 30, 28, 'up');
  m.spawn = { x: 10 * TS + 8, y: 14 * TS + 12 };
  m.biomeAt = () => 'Unterwasser-Grotte';
  m.meta = { water: (x, y) => m.get(x, y) === T.WATER || m.get(x, y) === T.DEEP };
  return m.finalize();
}

export const VULKAN_MAPS = { vulkaninsel, grotte };
