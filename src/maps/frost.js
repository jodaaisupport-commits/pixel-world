// Frosthöhen (hinter den Graufels-Bergen) und die Eisgrotte mit dem Frostsplitter.
import { createMap, T, SOLID_TILES } from '../map.js';
import { TS } from '../pix.js';
import { makeValueNoise, fbm } from '../noise.js';

const freeRect = (m, x, y, w, h, ok = () => true) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++)
    if (!m.inb(xx, yy) || m.occupied[m.idx(xx, yy)] || SOLID_TILES.has(m.get(xx, yy)) || !ok(m.get(xx, yy))) return false;
  return true;
};

export const FROST_HOOKS = [{ a: [27, 20], b: [33, 20] }, { a: [27, 38], b: [33, 38] }];
export const ICECAVE_DOOR = { x: 46, y: 7 };

export function frost() {
  const W = 64, H = 48, seed = 8282;
  const m = createMap({
    id: 'frost', name: 'Frosthöhen', W, H, fill: T.SNOW, seed,
    styles: { cliff: 'icecliff' },
    ambience: { particles: 'snow', tint: 'rgba(175,205,245,0.34)' },
  });
  m.bg = '#2a3a4c';
  const n = makeValueNoise(seed), n2 = makeValueNoise(seed + 3);
  const keep = new Uint8Array(W * H);
  const mark = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.inb(x, y)) keep[m.idx(x, y)] = 1; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = fbm(n, x / 8, y / 8, 3), edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    let t = T.SNOW;
    if (fbm(n2, x / 7, y / 7, 2) > 0.66) t = T.ROCKY;
    if (edge < 2 || e > 0.7 || y < 5) t = T.CLIFF;
    m.set(x, y, t);
  }
  // Eisseen (rutschig!)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    for (const [cx, cy, rx, ry] of [[17, 33, 7, 4], [46, 27, 8, 5], [52, 40, 5, 3]]) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry) + (fbm(n, x / 3, y / 3, 2) - 0.5) * 0.3;
      if (d < 1) m.set(x, y, T.ICE);
    }
  }
  // Gletscherspalte (Nord-Süd), nur per Enterhaken passierbar
  for (let y = 0; y < H; y++) {
    const off = Math.round((fbm(n2, 2, y / 6, 2) - 0.5) * 2);
    for (let x = 28 + off; x <= 31 + off; x++) m.set(x, y, y < 5 ? T.CLIFF : T.CHASM);
    for (const x of [27 + off, 32 + off]) if (m.get(x, y) === T.CLIFF && y >= 5) m.set(x, y, T.SNOW);
  }
  // Haken-Plätze freiräumen (beide Seiten), Spalte an diesen Stellen exakt ausrichten
  for (const h of FROST_HOOKS) {
    for (let x = 22; x <= 38; x++) for (let y = h.a[1] - 2; y <= h.a[1] + 2; y++) if (x < 28 || x > 31) { if (m.get(x, y) !== T.ICE) m.set(x, y, T.SNOW); } else m.set(x, y, T.CHASM);
    for (let y = h.a[1] - 2; y <= h.a[1] + 2; y++) { m.set(27, y, T.SNOW); m.set(32, y, T.SNOW); }
    mark(h.a[0] - 1, h.a[1] - 1, h.b[0] + 1, h.b[1] + 1);
  }
  // Nordwand mit dem Eingang zur Eisgrotte
  for (let y = 0; y <= ICECAVE_DOOR.y; y++) for (let x = 38; x <= 56; x++) m.set(x, y, T.CLIFF);
  for (let y = ICECAVE_DOOR.y + 1; y <= ICECAVE_DOOR.y + 4; y++) for (let x = 40; x <= 54; x++) m.set(x, y, T.SNOW);
  mark(42, ICECAVE_DOOR.y + 1, 51, ICECAVE_DOOR.y + 4);
  // Eingang West (vom Frostpass)
  for (let y = 19; y <= 26; y++) for (let x = 0; x <= 8; x++) if (Math.abs(y - 22.5) < 3 - x * 0.1 || x > 3) { if (m.get(x, y) === T.CLIFF || x < 3) m.set(x, y, T.SNOW); }
  for (let y = 20; y <= 25; y++) for (let x = 0; x <= 2; x++) m.set(x, y, y === 22 || y === 23 ? T.SNOW : T.CLIFF);
  for (let y = 15; y <= 28; y++) for (let x = 3; x <= 25; x++) if (m.get(x, y) === T.CLIFF) m.set(x, y, T.SNOW);
  mark(0, 21, 8, 24);
  // Hütte von Eremit Frostbart
  for (let y = 9; y <= 18; y++) for (let x = 6; x <= 20; x++) if (m.get(x, y) === T.CLIFF || m.get(x, y) === T.ICE) m.set(x, y, T.SNOW);
  // Klippen säubern
  for (let pass = 0; pass < 2; pass++) for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (m.get(x, y) !== T.CLIFF) { y++; continue; }
      let y2 = y; while (y2 < H && m.get(x, y2) === T.CLIFF) y2++;
      if (y2 - y < 3 && y2 < H && y > 0) for (let k = y; k < y2; k++) m.set(x, k, T.SNOW);
      y = y2;
    }
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
    if (m.get(x, y) === T.CLIFF && m.get(x - 1, y) !== T.CLIFF && m.get(x + 1, y) !== T.CLIFF) m.set(x, y, T.SNOW);
  m.place('cabin', 9, 10, 4, 3, 1);
  m.interact.push({ x: 11, y: 13, text: 'Frostbarts Hütte. An der Tür hängt ein Schild: „Bin draußen. Bin immer draußen.“' });
  const fire = m.place('campfire', 15, 14);
  m.light(fire.tx * TS + 8, fire.ty * TS + 8, 60, 'rgba(255,170,80,0.6)', 0.8);
  m.place('log', 13, 15, 2, 1); m.place('snowman', 18, 12);
  m.interact.push({ x: 18, y: 12, text: 'Ein Schneemann mit Frostbarts altem Hut. Er sieht ein bisschen grimmig aus. Genau wie sein Erbauer.' });
  mark(7, 9, 20, 18);
  m.npcs.push({ id: 'frostbart', x: 16, y: 16, mode: 'wander', home: [14, 15, 18, 17], speed: 12 });
  // Haken-Pfähle
  FROST_HOOKS.forEach((h, i) => {
    m.place('hookpost', h.a[0], h.a[1], 1, 1, 0, { hook: h.b });
    m.place('hookpost', h.b[0], h.b[1], 1, 1, 0, { hook: h.a });
    m.interact.push({ x: h.a[0], y: h.a[1], id: 'hook', to: h.b, text: 'Ein Pfahl mit einem Eisenring, halb vereist. Drüben steht ein zweiter.' });
    m.interact.push({ x: h.b[0], y: h.b[1], id: 'hook', to: h.a, text: 'Ein Pfahl mit einem Eisenring, halb vereist.' });
  });
  // Eisgrotte
  m.decal('icecave_entrance', ICECAVE_DOOR.x * TS, (ICECAVE_DOOR.y - 1) * TS);
  m.exit(ICECAVE_DOOR.x, ICECAVE_DOOR.y, 2, 1, 'eisgrotte', 15, 31.5, 'up', 'door');
  m.light(ICECAVE_DOOR.x * TS + 16, ICECAVE_DOOR.y * TS + 8, 34, 'rgba(140,220,255,0.4)');
  m.place('sign', 44, 10);
  m.interact.push({ x: 44, y: 10, text: 'Eisgrotte. Wer hier hineingeht, kommt als Eiszapfen wieder heraus. – F.' });
  // Deko
  for (let y = 5; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = m.idx(x, y), t = m.get(x, y), h = m.hash(x, y, 5);
    if (keep[i] || m.occupied[i]) continue;
    if (t === T.SNOW && h < 0.06 && freeRect(m, x, y - 1, 1, 2)) m.place('snowpine' + (m.hash(x, y, 4) < 0.5 ? 0 : 1), x, y);
    else if ((t === T.SNOW || t === T.ROCKY) && h < 0.075) m.place('icespike' + (h < 0.068 ? 0 : 1), x, y);
    else if (t === T.ROCKY && h < 0.1) m.place('rock' + (h < 0.09 ? 0 : 1), x, y);
    else if (t === T.SNOW && h > 0.975) m.decal('snowdrift', x * TS - 6, y * TS + 6);
    else if (t === T.ICE && h < 0.012 && freeRect(m, x, y, 2, 1, (g) => g === T.ICE)) m.place('icechunk', x, y, 2, 1);
  }
  // Eiskristalle (Nebenquest), Truhe, Taler
  for (const [x, y] of [[40, 34], [56, 18], [8, 40], [36, 44]]) { const f = m.findFree(x, y, (t) => t === T.SNOW || t === T.ROCKY); if (f) m.pickup('eiskristall', f[0], f[1]); }
  { const f = m.findFree(58, 44, (t) => t === T.SNOW); if (f) m.chest(f[0], f[1], [['herzcontainer', 1]]); }
  for (const [x, y] of [[22, 40], [50, 14]]) { const f = m.findFree(x, y, (t) => t === T.SNOW); if (f) m.pickup('taler', f[0], f[1], 4); }
  m.exit(0, 22, 1, 2, 'berge', 62, 14.5, 'left');
  m.spawn = { x: 2 * TS + 8, y: 22 * TS + 12 };
  const snow = (t, x, y) => (t === T.SNOW || t === T.ROCKY) && !keep[m.idx(x, y)];
  m.scatterEnemies('frostwolf', 1, (t, x, y) => snow(t, x, y) && x < 26 && y > 26, 21);
  m.scatterEnemies('frostwolf', 2, (t, x, y) => snow(t, x, y) && x > 34, 22);
  m.scatterEnemies('eisgeist', 3, (t, x, y) => snow(t, x, y) && x > 34, 23);
  m.scatterEnemies('eisigel', 2, (t, x, y) => (t === T.SNOW || t === T.ICE) && x > 34 && !keep[m.idx(x, y)], 24);
  m.scatterEnemies('eisigel', 1, (t, x, y) => t === T.SNOW && x < 26 && y > 28, 25);
  m.biomeAt = (tx, ty) => {
    const t = m.get(tx, ty);
    if (t === T.CHASM || (tx >= 26 && tx <= 33)) return 'Gletscherspalte';
    if (tx < 22 && ty < 20) return 'Frostbarts Lager';
    if (t === T.ICE) return 'Eissee';
    if (ty <= 12 && tx > 36) return 'Vor der Eisgrotte';
    return 'Frosthöhen';
  };
  return m.finalize();
}

export function eisgrotte() {
  const W = 30, H = 34, seed = 9393;
  const m = createMap({
    id: 'eisgrotte', name: 'Eisgrotte', W, H, fill: T.CAVEWALL, seed, kind: 'cave',
    styles: { cavewall: 'ice' },
    ambience: { dark: 0.5, darkColor: '4,16,36', playerLight: 84, particles: 'glitter' },
  });
  m.bg = '#04101c';
  const n = makeValueNoise(seed);
  const floor = (x, y, t) => { if (x > 0 && y > 0 && x < W - 1 && y < H) m.set(x, y, t); };
  for (let y = 28; y < H; y++) for (let x = 13; x <= 16; x++) floor(x, y, T.SNOW);
  for (let y = 1; y < 29; y++) for (let x = 1; x < W - 1; x++) {
    const dx = (x + 0.5 - 15) / 13, dy = (y + 0.5 - 15) / 13.5;
    if (dx * dx + dy * dy + (fbm(n, x / 3, y / 3, 2) - 0.5) * 0.35 < 1) floor(x, y, fbm(n, x / 4 + 5, y / 4, 2) > 0.62 ? T.SNOW : T.ICE);
  }
  for (let y = 2; y <= 6; y++) for (let x = 11; x <= 18; x++) floor(x, y, T.SNOW);
  for (let y = 24; y <= 29; y++) for (let x = 12; x <= 17; x++) floor(x, y, T.SNOW);
  m.exit(14, H - 1, 2, 1, 'frost', ICECAVE_DOOR.x + 0.5, ICECAVE_DOOR.y + 1.5, 'down', 'door');
  m.decal('stairs_up', 14 * TS, (H - 2) * TS);
  m.spawn = { x: 15 * TS, y: 31 * TS + 12 };
  m.place('frostaltar', 14, 3, 2, 1, 0, { hideIf: 'a2_frost' });
  m.place('frostaltar_empty', 14, 3, 2, 1, 0, { showIf: 'a2_frost' });
  m.interact.push({ x: 14.5, y: 3, id: 'frostaltar', text: 'Ein Altar aus Eis.' });
  m.light(15 * TS, 3 * TS, 80, 'rgba(150,230,255,0.6)', 0.3);
  for (const [x, y, v] of [[6, 10, 0], [23, 9, 1], [9, 20, 1], [21, 21, 0], [12, 14, 0], [18, 15, 1], [5, 16, 1], [25, 16, 0]]) if (m.get(x, y) !== T.CAVEWALL) {
    m.place('icespike' + v, x, y);
    m.light(x * TS + 8, y * TS - 4, 36, 'rgba(120,210,255,0.5)', 0.4);
  }
  for (const [x, y] of [[8, 25], [21, 6]]) if (m.get(x, y) !== T.CAVEWALL) m.place('icechunk', x, y, 2, 1);
  { const f = m.findFree(24, 22, (t) => t === T.ICE || t === T.SNOW); if (f) m.chest(f[0], f[1], [['eiskristall', 1], ['taler', 20]]); }
  m.enemy('eisgeist', 8, 14); m.enemy('eisigel', 20, 18); m.enemy('eisgeist', 22, 11);
  m.biomeAt = (tx, ty) => (ty <= 7 ? 'Altar des Frosts' : 'Eisgrotte');
  return m.finalize();
}

export const FROST_MAPS = { frost, eisgrotte };
