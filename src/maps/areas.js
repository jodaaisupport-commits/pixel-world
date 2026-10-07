// Neue Gebiete außerhalb des Dorfes: Dunkelwald (N), Graufels-Berge (O) mit Kristallhöhle, Möwenbucht (S).
import { createMap, carvePath, T } from '../map.js';
import { TS } from '../pix.js';
import { makeValueNoise, fbm } from '../noise.js';

/** Bäume mit Mindestabstand auf passenden Tiles verteilen. */
function scatterTrees(m, ok, pick, density, noTree) {
  const at = new Uint8Array(m.W * m.H);
  for (let y = 1; y < m.H; y++)
    for (let x = 0; x < m.W; x++) {
      const i = m.idx(x, y);
      if (noTree[i] || m.occupied[i] || !ok(m.get(x, y), x, y)) continue;
      const near = (dx, dy) => m.inb(x + dx, y + dy) && at[m.idx(x + dx, y + dy)];
      if (near(-1, 0) || near(-1, -1) || near(0, -1) || near(1, -1)) continue;
      if (m.hash(x, y, 3) < density(x, y)) { m.place(pick(x, y), x, y); at[i] = 1; }
    }
}
const markAround = (m, mask, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.inb(x, y)) mask[m.idx(x, y)] = 1; };

// ============================================================ Dunkelwald
export function dunkelwald() {
  const W = 64, H = 48, seed = 4242;
  const m = createMap({
    id: 'dunkelwald', name: 'Dunkelwald', W, H, fill: T.DFOREST, seed,
    ambience: { dark: 0.5, darkColor: '6,12,26', playerLight: 72, particles: 'fireflies', tint: 'rgba(70,110,170,0.35)' },
  });
  m.bg = '#060c10';
  const n = makeValueNoise(seed), nw = makeValueNoise(seed + 9);
  const noTree = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (fbm(n, x / 8, y / 8, 3) < 0.36) m.set(x, y, T.DGRASS);
  // Sumpf im Westen
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 13) / 7.5, (y - 27) / 5.5) + (fbm(nw, x / 4, y / 4, 2) - 0.5) * 0.6;
    if (d < 1) m.set(x, y, T.SWAMP);
    else if (d < 1.45) { m.set(x, y, T.DGRASS); noTree[m.idx(x, y)] = 1; }
  }
  const path = (pts, wob = 3) => {
    carvePath(m, pts, { width: 2, wobble: wob, noise: nw, tile: T.DIRT, keep: [T.SWAMP] });
    carvePath(m, pts, { width: 2, wobble: wob, noise: nw, onTile: (x, y) => markAround(m, noTree, x - 2, y - 2, x + 2, y + 2) });
  };
  path([[31, 47], [31, 40], [27, 33], [30, 25], [33, 18], [31.5, 12]]);
  path([[28, 31], [20, 28]], 2);
  path([[31, 22], [42, 25], [48, 31]], 3);
  const clearing = (cx, cy, r, t = T.DGRASS) => {
    for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++)
      if (m.inb(x, y) && Math.hypot(x - cx, y - cy) <= r + (m.hash(x, y, 5) - 0.5)) { if (m.get(x, y) !== T.DIRT) m.set(x, y, t); noTree[m.idx(x, y)] = 1; }
  };
  clearing(32, 8, 6); clearing(50, 31, 4);
  // Schrein mit Säulen
  m.place('shrine', 31, 7, 2, 1);
  m.light(32 * TS, 7 * TS + 4, 64, 'rgba(190,130,255,0.6)', 0.6);
  m.interact.push({ x: 31.5, y: 7, text: 'Ein uralter Schrein. Die Rune pulsiert sanft violett … als würde sie auf etwas warten.' });
  for (const [x, y, v] of [[27, 5, 0], [36, 5, 1], [26, 10, 1], [37, 10, 0]]) m.place('pillar' + v, x, y);
  // Glühpilz-Ring + Kräuterfrau
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2, x = Math.round(50 + Math.cos(a) * 3.4), y = Math.round(31 + Math.sin(a) * 2.6);
    m.place('shroom' + (k % 2), x, y, 1, 1, 99);
    m.light(x * TS + 8, y * TS + 8, 26, k % 2 ? 'rgba(120,230,255,0.55)' : 'rgba(200,140,255,0.55)', 0.4);
  }
  m.place('cauldron', 52, 30);
  m.light(52 * TS + 8, 30 * TS + 6, 40, 'rgba(120,255,120,0.5)', 0.8);
  m.npcs.push({ id: 'mira', x: 50, y: 31, mode: 'wander', home: [48, 30, 51, 32], speed: 14 });
  m.place('sign', 33, 43);
  m.interact.push({ x: 33, y: 43, text: '↓ Pixeldorf   ↑ Alter Schrein   → Glühpilzlichtung   ← Moor' });
  // Bäume, tote Bäume, Glühpilze
  scatterTrees(m, (t) => t === T.DFOREST || t === T.DGRASS,
    (x, y) => (m.hash(x, y, 8) < 0.13 ? 'deadtree' : 'darkoak' + (m.hash(x, y, 9) < 0.2 ? 1 : 0)),
    (x, y) => (m.get(x, y) === T.DFOREST ? 0.7 : 0.08), noTree);
  let shrooms = 0;
  for (let y = 2; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = m.idx(x, y);
    if (m.occupied[i] || m.get(x, y) !== T.DFOREST || m.hash(x, y, 31) > 0.035 || shrooms > 40) continue;
    m.place('shroom' + (m.hash(x, y, 2) < 0.5 ? 1 : 0), x, y, 1, 1, 99);
    m.light(x * TS + 8, y * TS + 8, 22, m.hash(x, y, 2) < 0.5 ? 'rgba(120,230,255,0.45)' : 'rgba(200,140,255,0.45)', 0.4);
    shrooms++;
  }
  m.exit(31, H - 1, 2, 1, 'village', 59.5, 2, 'down');
  m.spawn = { x: 32 * TS, y: 45 * TS + 12 };
  m.biomeAt = (tx, ty) => {
    const t = m.get(tx, ty);
    if (Math.hypot(tx - 32, ty - 8) < 7) return 'Alter Schrein';
    if (Math.hypot(tx - 50, ty - 31) < 5) return 'Glühpilzlichtung';
    if (t === T.SWAMP || Math.hypot((tx - 13) / 9, (ty - 27) / 7) < 1) return 'Nebelmoor';
    return 'Dunkelwald';
  };
  return m.finalize();
}

// ============================================================ Graufels-Berge
export function berge() {
  const W = 64, H = 48, seed = 777;
  const m = createMap({
    id: 'berge', name: 'Graufels-Berge', W, H, fill: T.ROCKY, seed,
    styles: { cliff: 'cliff', snowLine: 15 },
    ambience: { particles: 'snow', tint: 'rgba(170,190,230,0.30)' },
  });
  m.bg = '#3a332d';
  const n = makeValueNoise(seed), n2 = makeValueNoise(seed + 5);
  const noTree = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = fbm(n, x / 9, y / 9, 3);
    const band = 6 + fbm(n2, x / 6, 0.5, 2) * 4;
    const edge = Math.min(x, W - 1 - x, H - 1 - y);
    let t = T.ROCKY;
    if (fbm(n2, x / 7 + 20, y / 7, 2) > 0.6 && y > 18) t = T.GRASS;
    if (y < 16 + fbm(n2, x / 5, 3, 2) * 4) t = T.SNOW;
    if (e > 0.64 || y < band || edge < 2) t = T.CLIFF;
    m.set(x, y, t);
  }
  // Kleiner Bergsee
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - 18) / 4.5, (y - 36) / 3.2) + (fbm(n2, x / 3, y / 3, 2) - 0.5) * 0.5;
    if (d < 1) m.set(x, y, T.WATER); else if (d < 1.6 && m.get(x, y) === T.CLIFF) m.set(x, y, T.ROCKY);
  }
  // Klippenwand mit Mineneingang
  for (let x = 34; x <= 47; x++) { for (let y = 0; y <= 8; y++) m.set(x, y, T.CLIFF); for (let y = 9; y <= 13; y++) m.set(x, y, T.SNOW); }
  const path = (pts, wob = 3) => {
    carvePath(m, pts, { width: 2, wobble: wob, noise: n, onTile: (x, y) => { if (m.get(x, y) !== T.WATER) m.set(x, y, T.DIRT); } });
    carvePath(m, pts, { width: 2, wobble: wob, noise: n, onTile: (x, y) => { markAround(m, noTree, x - 2, y - 2, x + 2, y + 2); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.get(x + dx, y + dy) === T.CLIFF && y + dy > 8) m.set(x + dx, y + dy, T.ROCKY); } });
  };
  path([[0, 23], [12, 24], [22, 20], [33, 15], [40, 10]]);
  path([[12, 24], [16, 32]], 2);
  // Klippen säubern: zu dünne Felsstücke entfernen (Front braucht >= 3 Tiles Höhe)
  for (let pass = 0; pass < 2; pass++)
    for (let x = 0; x < W; x++) {
      let y = 0;
      while (y < H) {
        if (m.get(x, y) !== T.CLIFF) { y++; continue; }
        let y2 = y; while (y2 < H && m.get(x, y2) === T.CLIFF) y2++;
        if (y2 - y < 3 && y2 < H && y > 0) for (let k = y; k < y2; k++) m.set(x, k, y < 14 ? T.SNOW : T.ROCKY);
        y = y2;
      }
    }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
    if (m.get(x, y) === T.CLIFF && m.get(x - 1, y) !== T.CLIFF && m.get(x + 1, y) !== T.CLIFF) m.set(x, y, y < 14 ? T.SNOW : T.ROCKY);
  for (let y = 22; y <= 25; y++) for (let x = 0; x <= 2; x++) if (m.get(x, y) === T.CLIFF) m.set(x, y, y === 23 || y === 24 ? T.DIRT : T.ROCKY);
  // Mineneingang (Decal über der Felsfront, zwei begehbare Tiles)
  m.decal('cave_entrance', 40 * TS, 7 * TS);
  m.exit(40, 8, 2, 1, 'hoehle', 20, 27, 'up', 'door');
  m.place('sign', 38, 10);
  m.interact.push({ x: 38, y: 10, text: 'ALTE KRISTALLMINE – Betreten auf eigene Gefahr! (gez. Bergmann Erwin)' });
  m.place('crate', 43, 9); m.place('barrel', 44, 9);
  m.light(40 * TS + 16, 8 * TS + 8, 30, 'rgba(120,220,255,0.35)');
  m.npcs.push({ id: 'erwin', x: 43, y: 11, mode: 'wander', home: [42, 10, 45, 12], speed: 16 });
  // Bäume, Felsen
  markAround(m, noTree, 36, 8, 46, 13);
  scatterTrees(m, (t) => t === T.SNOW || t === T.GRASS || t === T.ROCKY,
    (x, y) => (m.get(x, y) === T.GRASS ? 'pine' + (m.hash(x, y, 4) < 0.5 ? 0 : 1) : 'snowpine' + (m.hash(x, y, 4) < 0.5 ? 0 : 1)),
    (x, y) => (m.get(x, y) === T.GRASS ? 0.22 : m.get(x, y) === T.SNOW ? 0.07 : 0.035), noTree);
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 3; x++) {
    const i = m.idx(x, y), h = m.hash(x, y, 13);
    if (noTree[i] || m.occupied[i] || m.occupied[i + 1]) continue;
    const t = m.get(x, y), t2 = m.get(x + 1, y);
    if (h < 0.012 && (t === T.ROCKY || t === T.SNOW) && (t2 === T.ROCKY || t2 === T.SNOW)) m.place('boulder', x, y, 2, 1);
    else if (h < 0.03 && t === T.ROCKY) m.place('rock' + (h < 0.02 ? 0 : 1), x, y);
  }
  m.exit(0, 23, 1, 2, 'village', 93, 32, 'left');
  m.spawn = { x: 2 * TS + 8, y: 24 * TS + 12 };
  m.biomeAt = (tx, ty) => {
    const t = m.get(tx, ty);
    if (tx >= 35 && tx <= 46 && ty <= 13) return 'Alte Kristallmine';
    if (Math.hypot((tx - 18) / 6, (ty - 36) / 5) < 1) return 'Bergsee';
    if (t === T.SNOW) return 'Schneefeld';
    if (t === T.GRASS) return 'Almwiese';
    return 'Graufels-Berge';
  };
  return m.finalize([[40, 8], [41, 8]]);
}

// ============================================================ Möwenbucht
export function kueste() {
  const W = 72, H = 40, seed = 9090;
  const m = createMap({ id: 'kueste', name: 'Möwenbucht', W, H, fill: T.GRASS, seed, ambience: { particles: 'gulls' } });
  m.bg = '#21508c';
  const n = makeValueNoise(seed);
  const noTree = new Uint8Array(W * H);
  const shore = (x) => 21 + (fbm(n, x / 11, 3, 3) - 0.5) * 9 + Math.sin(x / 8) * 1.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = shore(x);
    let t;
    if (y < s - 8 + (fbm(n, x / 5, y / 5, 2) - 0.5) * 4) t = (y < 3 + fbm(n, x / 4, 9, 2) * 2) ? T.FOREST : (fbm(n, x / 5 + 7, y / 5, 2) > 0.64 ? T.FLOWER : T.GRASS);
    else if (y < s) t = T.SAND;
    else if (y < s + 4) t = T.WATER;
    else t = T.DEEP;
    m.set(x, y, t);
  }
  // Felsvorsprung mit Leuchtturm im Osten
  for (let y = 0; y < H; y++) for (let x = 56; x < W; x++) {
    const d = Math.hypot((x - 63) / 6, (y - (shore(63) + 1)) / 4);
    if (d < 1) m.set(x, y, T.ROCKY); else if (d < 1.4 && m.get(x, y) === T.DEEP) m.set(x, y, T.WATER);
  }
  const ly = Math.round(shore(63));
  m.place('lighthouse', 62, ly - 1, 2, 2);
  m.interact.push({ x: 62.5, y: ly + 1, text: 'Der alte Leuchtturm. Die Tür klemmt – aber oben brennt noch immer ein Licht.' });
  // Weg vom Dorf
  carvePath(m, [[35, 0], [35, 6], [36, 11]], { width: 2, wobble: 3, noise: n, onTile: (x, y) => { if (m.get(x, y) !== T.SAND) m.set(x, y, T.DIRT); markAround(m, noTree, x - 2, y - 1, x + 2, y + 1); } });
  // Steg ins Meer + Boot
  const sy = Math.round(shore(45));
  for (let y = sy - 1; y < sy + 6; y++) for (const x of [45, 46]) if (m.get(x, y) !== T.GRASS) m.set(x, y, T.BRIDGE);
  m.decal('boat', 47 * TS + 2, (sy + 3) * TS + 2);
  m.interact.push({ x: 46, y: sy + 4, text: 'Jans altes Ruderboot. Ein Leck, so groß wie eine Faust. Heute fährt hier niemand raus.' });
  // Strandhütte, Sandburg, Palmen, Felsen, Seesterne
  const hy = Math.round(shore(22)) - 6;
  m.place('hut', 21, hy, 3, 3, 1);
  m.place('sandcastle', 31, Math.round(shore(31)) - 2);
  m.place('sign', 38, 11);
  m.interact.push({ x: 38, y: 11, text: 'Möwenbucht – Baden auf eigene Gefahr. Möwen nicht füttern!' });
  markAround(m, noTree, 20, hy - 1, 24, hy + 3);
  for (let y = 1; y < H; y++) for (let x = 1; x < W - 1; x++) {
    const i = m.idx(x, y), t = m.get(x, y), h = m.hash(x, y, 3);
    if (noTree[i] || m.occupied[i]) continue;
    if (t === T.SAND && h < 0.045 && !m.occupied[i - 1] && !m.occupied[i - W]) m.place('palm' + (m.hash(x, y, 4) < 0.5 ? 0 : 1), x, y);
    else if (t === T.SAND && h < 0.06) m.place('rock' + (h < 0.052 ? 0 : 1), x, y);
    else if (t === T.SAND && h < 0.08) m.decal('starfish', x * TS + 3, y * TS + 4);
    else if (t === T.FOREST && h < 0.6 && !m.occupied[i - 1]) m.place('oak' + Math.floor(m.hash(x, y, 6) * 3), x, y);
    else if ((t === T.GRASS || t === T.FLOWER) && h < 0.03) m.place('bush' + (h < 0.01 ? 1 : 0), x, y);
    else if (t === T.ROCKY && h < 0.08) m.place('rock0', x, y);
  }
  m.exit(35, 0, 2, 1, 'village', 56.5, 69, 'up');
  m.spawn = { x: 36 * TS, y: 2 * TS + 12 };
  m.biomeAt = (tx, ty) => {
    const t = m.get(tx, ty);
    if (t === T.BRIDGE) return 'Bootssteg';
    if (tx >= 56) return 'Leuchtturmklippe';
    if (t === T.SAND) return 'Möwenbucht – Strand';
    return 'Möwenbucht';
  };
  return m.finalize();
}

// ============================================================ Kristallhöhle
export function hoehle() {
  const W = 40, H = 30, seed = 3131;
  const m = createMap({
    id: 'hoehle', name: 'Kristallhöhle', W, H, fill: T.CAVEWALL, seed, kind: 'cave',
    ambience: { dark: 0.84, darkColor: '5,3,10', playerLight: 84, particles: 'dust' },
  });
  m.bg = '#050308';
  const n = makeValueNoise(seed);
  const floor = (x, y) => { if (x > 0 && y > 0 && x < W - 1 && y < H - 1) m.set(x, y, T.CAVE); };
  carvePath(m, [[19.5, 28], [19, 22], [13, 17], [9, 10], [17, 5], [27, 6], [32, 14], [28, 22], [21, 22]], { width: 3, wobble: 4, noise: n, onTile: floor });
  const chamber = (cx, cy, r) => { for (let y = cy - r - 2; y <= cy + r + 2; y++) for (let x = cx - r - 2; x <= cx + r + 2; x++) if (Math.hypot(x - cx, (y - cy) * 1.2) < r + (fbm(n, x / 3, y / 3, 2) - 0.5) * 2.5) floor(x, y); };
  chamber(11, 12, 4); chamber(25, 6, 4); chamber(31, 17, 5); chamber(19, 23, 3);
  // Wände etwas ausfransen (nur Boden hinzufügen -> Verbindungen bleiben erhalten)
  const next = m.ground.slice();
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    if (m.get(x, y) === T.CAVE) continue;
    let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (m.get(x + dx, y + dy) === T.CAVE) c++;
    if (c >= 5) next[m.idx(x, y)] = T.CAVE;
  }
  m.ground.set(next);
  // Unterirdischer Teich
  for (let y = 13; y <= 21; y++) for (let x = 27; x <= 36; x++)
    if (m.get(x, y) === T.CAVE && Math.hypot((x - 32) / 2.8, (y - 17.5) / 2) + (fbm(n, x / 2, y / 2, 2) - 0.5) * 0.4 < 1) m.set(x, y, T.WATER);
  // Eingang unten
  for (let y = 26; y < H; y++) for (const x of [19, 20]) m.set(x, y, T.CAVE);
  m.exit(19, H - 1, 2, 1, 'berge', 40.5, 9, 'down', 'door');
  m.spawn = { x: 20 * TS, y: 27 * TS + 12 };
  // Kristalle an Wänden (Licht!), Stalagmiten, Truhe
  const crystalSpots = [[8, 9, 0], [14, 10, 1], [10, 15, 0], [22, 4, 1], [29, 5, 0], [26, 9, 1], [34, 13, 0], [35, 21, 1], [28, 20, 0], [17, 21, 1], [23, 25, 0], [5, 12, 1]];
  for (const [x, y, v] of crystalSpots) {
    let px = x, py = y;
    // nächstes Bodentile mit Wand dahinter suchen
    outer: for (let r = 0; r < 4; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (m.get(xx, yy) === T.CAVE && !m.occupied[m.idx(xx, yy)] && (m.get(xx, yy - 1) === T.CAVEWALL || m.get(xx - 1, yy) === T.CAVEWALL || m.get(xx + 1, yy) === T.CAVEWALL)) { px = xx; py = yy; break outer; }
    }
    if (m.get(px, py) !== T.CAVE || (Math.abs(px - 19.5) < 2 && py > 24)) continue;
    m.place('crystal' + v, px, py);
    m.light(px * TS + 8, py * TS + 2, 46, v ? 'rgba(190,120,255,0.65)' : 'rgba(90,220,255,0.65)', 0.5);
  }
  for (let y = 2; y < H - 3; y++) for (let x = 2; x < W - 2; x++) {
    const i = m.idx(x, y), h = m.hash(x, y, 7);
    if (m.get(x, y) !== T.CAVE || m.occupied[i]) continue;
    let walls = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (m.get(x + dx, y + dy) === T.CAVEWALL) walls++;
    if (walls >= 1 && h < 0.12) m.place('stalagmite' + (h < 0.06 ? 0 : 1), x, y);
    else if (h > 0.97) m.decal(h > 0.985 ? 'bones' : 'puddle', x * TS, y * TS + 4);
  }
  m.place('chest', 25, 5);
  m.interact.push({ x: 25, y: 5, text: 'Eine alte Truhe! … Leer. Nur ein Zettel: „Fortsetzung folgt. – E.“' });
  m.light(25 * TS + 8, 5 * TS + 8, 30, 'rgba(255,210,100,0.45)', 0.3);
  m.biomeAt = (tx, ty) => (Math.hypot(tx - 25, ty - 6) < 5 ? 'Schatzkammer' : Math.hypot(tx - 32, ty - 17) < 6 ? 'Unterirdischer See' : 'Kristallhöhle');
  return m.finalize();
}
