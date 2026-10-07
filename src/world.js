// Weltgenerierung: seeded Noise für Biome + handplatziertes Dorf.
import { makeValueNoise, fbm, hash2, clamp } from './noise.js';
import { T } from './map.js';
export { T };
export const MAP_W = 96;
export const MAP_H = 72;
export const DEFAULT_SEED = 20261007;

const LAKE = { x: 24, y: 51, r: 13 };
const VILLAGE = { x0: 40, y0: 18, x1: 79, y1: 43 };
const POND = { x: 79, y: 56, r: 5 };
const RIVER = [[41, -2], [40, 8], [37, 18], [35.5, 28], [32, 38], [27, 45]];

export function generateWorld(seed = DEFAULT_SEED) {
  const W = MAP_W, H = MAP_H, N = W * H;
  const ground = new Uint8Array(N);
  const solid = new Uint8Array(N);
  const noTree = new Uint8Array(N);
  const occupied = new Uint8Array(N);
  const idx = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const get = (x, y) => ground[idx(clamp(x, 0, W - 1), clamp(y, 0, H - 1))];

  const nE = makeValueNoise(seed), nM = makeValueNoise(seed + 17);
  const nF = makeValueNoise(seed + 33), nP = makeValueNoise(seed + 51);

  // ---- 1) Noise-Felder (normalisiert)
  const elev = new Float32Array(N), moist = new Float32Array(N);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      elev[idx(x, y)] = fbm(nE, x / 16, y / 16, 4);
      moist[idx(x, y)] = fbm(nM, x / 13, y / 13, 4);
    }
  for (const f of [elev, moist]) {
    let lo = Infinity, hi = -Infinity;
    for (const v of f) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let i = 0; i < N; i++) f[i] = (f[i] - lo) / (hi - lo);
  }

  // ---- 2) Gestaltung: See-Becken, Waldrand an der Kartengrenze, Dorf-Plateau
  const vcx = (VILLAGE.x0 + VILLAGE.x1) / 2, vcy = (VILLAGE.y0 + VILLAGE.y1) / 2;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y);
      let e = elev[i] * 0.55 + 0.35, m = moist[i];
      const dl = Math.hypot(x - LAKE.x, (y - LAKE.y) * 1.15) / LAKE.r + (nP(x / 6, y / 6) - 0.5) * 0.45;
      e -= clamp(1.3 - dl, 0, 1) * 0.55;
      const dp = Math.hypot(x - POND.x, (y - POND.y) * 1.3) / POND.r + (nP(x / 4 + 9, y / 4) - 0.5) * 0.5;
      e -= clamp(1.25 - dp, 0, 1) * 0.6;
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      m += clamp(1 - edge / 7, 0, 1) * 0.65;
      e += clamp(1 - edge / 4, 0, 1) * 0.25;
      // Nordosten waldiger, Süden offener
      m += (x / W) * 0.12 - (y / H) * 0.18 + 0.04;
      const dvx = Math.max(VILLAGE.x0 - x, 0, x - VILLAGE.x1), dvy = Math.max(VILLAGE.y0 - y, 0, y - VILLAGE.y1);
      const k = clamp(1 - Math.hypot(dvx, dvy) / 7, 0, 1);
      e = e * (1 - k) + Math.max(e, 0.65) * k;
      m = m * (1 - k) + Math.min(m, 0.25) * k;
      elev[i] = e; moist[i] = m;
    }

  // ---- 3) Klassifikation
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y), e = elev[i], m = moist[i];
      let t;
      if (e < 0.33) t = T.WATER;
      else if (m > 0.62) t = T.FOREST;
      else t = fbm(nF, x / 6, y / 6, 2) > 0.63 ? T.FLOWER : T.GRASS;
      ground[i] = t;
    }
  // Wasserflächen glätten (zellulärer Automat, entfernt Zacken und Einzeltiles)
  for (let pass = 0; pass < 2; pass++) {
    const next = ground.slice();
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (ground[idx(x + dx, y + dy)] === T.WATER) n++;
        const w = ground[idx(x, y)] === T.WATER;
        if (w && n < 4) next[idx(x, y)] = moist[idx(x, y)] > 0.62 ? T.FOREST : T.GRASS;
        else if (!w && n >= 6) next[idx(x, y)] = T.WATER;
      }
    ground.set(next);
  }
  // Sandstrand: Landtiles nahe am Wasser (Breite leicht verrauscht)
  {
    const isW = (x, y) => inb(x, y) && ground[idx(x, y)] === T.WATER;
    const sand = [];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (isW(x, y)) continue;
        const r = 1.2 + nP(x / 5 + 20, y / 5) * 1.6;
        let near = false;
        for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.hypot(dx, dy) <= r && isW(x + dx, y + dy)) { near = true; break; }
        if (near) sand.push(idx(x, y));
      }
    for (const i of sand) ground[i] = T.SAND;
  }

  // ---- 4) Fluss (geschlängelte Polyline vom Nordrand in den See)
  const riverPts = [];
  for (let s = 0; s < RIVER.length - 1; s++) {
    const [ax, ay] = RIVER[s], [bx, by] = RIVER[s + 1];
    const len = Math.hypot(bx - ax, by - ay);
    for (let t = 0; t < len; t += 0.25) {
      const u = t / len;
      const px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
      const wob = (nP(px / 7, py / 7) - 0.5) * 4;
      riverPts.push([px + wob, py]);
    }
  }
  for (const [px, py] of riverPts)
    for (let y = Math.floor(py - 4); y <= py + 4; y++)
      for (let x = Math.floor(px - 4); x <= px + 4; x++) {
        if (!inb(x, y)) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        const i = idx(x, y);
        if (d < 1.6) ground[i] = T.WATER;
        else if (d < 2.6 && ground[i] !== T.WATER) ground[i] = T.SAND;
        if (d < 3.6) noTree[i] = 1;
      }

  // ---- 5) Tiefes Wasser (mind. 2 Tiles vom Ufer)
  const deep = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (ground[idx(x, y)] !== T.WATER) continue;
      let all = true;
      for (let dy = -3; dy <= 3 && all; dy++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dy * dy <= 7 && get(x + dx, y + dy) !== T.WATER) { all = false; break; }
      if (all) deep.push(idx(x, y));
    }
  for (const i of deep) ground[i] = T.DEEP;

  // Kleine Sand-Inseln im Wasser / Einzeltiles glätten
  for (let pass = 0; pass < 2; pass++)
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const t = get(x, y);
        const nb = [get(x - 1, y), get(x + 1, y), get(x, y - 1), get(x, y + 1)];
        const same = nb.filter((n) => n === t).length;
        if (same <= 1 && t !== T.WATER && t !== T.DEEP) {
          const counts = {};
          nb.forEach((n) => (counts[n] = (counts[n] || 0) + 1));
          ground[idx(x, y)] = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
        }
      }

  // ---- 6) Dorf freiräumen
  for (let y = VILLAGE.y0; y <= VILLAGE.y1; y++)
    for (let x = VILLAGE.x0; x <= VILLAGE.x1; x++) {
      const i = idx(x, y);
      if (ground[i] === T.WATER || ground[i] === T.DEEP) continue;
      ground[i] = fbm(nF, x / 6, y / 6, 2) > 0.7 ? T.FLOWER : T.GRASS;
      noTree[i] = 1;
    }

  // ---- 7) Wege
  function carve(points, width = 2, wobble = 0) {
    for (let s = 0; s < points.length - 1; s++) {
      const [ax, ay] = points[s], [bx, by] = points[s + 1];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      for (let t = 0; t <= len; t += 0.2) {
        const u = t / len;
        let px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
        if (wobble) {
          const w = (nP(px / 9 + 40, py / 9) - 0.5) * wobble * Math.sin(Math.PI * u);
          px += nx * w; py += ny * w;
        }
        for (let dy = 0; dy < width; dy++)
          for (let dx = 0; dx < width; dx++) {
            const x = Math.floor(px) + dx, y = Math.floor(py) + dy;
            if (!inb(x, y)) continue;
            const i = idx(x, y), g = ground[i];
            if (g === T.WATER || g === T.DEEP) ground[i] = T.BRIDGE;
            else if (g !== T.STONE && g !== T.FARM && g !== T.BRIDGE) ground[i] = T.DIRT;
          }
        for (let dy = -2; dy <= width + 1; dy++)
          for (let dx = -2; dx <= width + 1; dx++) {
            const x = Math.floor(px) + dx, y = Math.floor(py) + dy;
            if (inb(x, y)) noTree[idx(x, y)] = 1;
          }
      }
    }
  }
  const fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) { ground[idx(x, y)] = t; noTree[idx(x, y)] = 1; } };

  // Hauptstraße West-Ost, mit Brücke über den Fluss
  carve([[52, 29], [40, 29], [30, 29]], 2, 0);
  carve([[30, 29], [18, 31]], 2, 4);
  carve([[18, 31], [17, 46]], 2, 3); // runter zum See -> Steg
  carve([[63, 29], [75, 29], [79, 29]], 2, 0);
  carve([[79, 29], [90, 32]], 2, 5);
  carve([[90, 32], [95, 32]], 2, 0);   // -> Graufels-Berge (Osten)
  // Süd- und Nordweg
  carve([[57, 34], [57, 44], [56, 63]], 2, 6);
  carve([[56, 63], [56, 71]], 2, 0);   // -> Möwenbucht (Süden)
  carve([[61, 25], [61, 18], [59, 7]], 2, 5);
  carve([[59, 7], [59, 0]], 2, 0);     // -> Dunkelwald (Norden)

  // Steg in den See verlängern
  {
    let end = -1;
    for (let y = 36; y < H; y++) if (ground[idx(17, y)] === T.BRIDGE || ground[idx(18, y)] === T.BRIDGE) end = y;
    if (end > 0) for (let y = end - 1; y <= end + 3; y++) for (const x of [17, 18]) {
      const g = ground[idx(x, y)];
      if (g === T.WATER || g === T.DEEP || (y <= end && g !== T.BRIDGE)) ground[idx(x, y)] = T.BRIDGE;
    }
  }
  // Brücken rechteckig machen (Bounding-Box jeder Brücken-Komponente auffüllen)
  {
    const seen = new Uint8Array(N);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        if (ground[idx(x, y)] !== T.BRIDGE || seen[idx(x, y)]) continue;
        const st = [[x, y]]; seen[idx(x, y)] = 1;
        let x0 = x, x1 = x, y0 = y, y1 = y;
        while (st.length) {
          const [cx, cy] = st.pop();
          x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, ny = cy + dy;
            if (inb(nx, ny) && !seen[idx(nx, ny)] && ground[idx(nx, ny)] === T.BRIDGE) { seen[idx(nx, ny)] = 1; st.push([nx, ny]); }
          }
        }
        for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
          const g = ground[idx(xx, yy)];
          if (g === T.WATER || g === T.DEEP || g === T.SAND || g === T.DIRT) ground[idx(xx, yy)] = T.BRIDGE;
        }
      }
  }
  // Dorfplatz
  fill(53, 26, 62, 33, T.STONE);
  // Garten (Beet) östlich vom blauen Haus
  fill(72, 22, 77, 26, T.FARM);

  // Lichtungen am Wegende
  const clearing = (cx, cy, r, t = T.GRASS) => {
    for (let y = cy - r; y <= cy + r; y++)
      for (let x = cx - r; x <= cx + r; x++) {
        if (!inb(x, y) || Math.hypot(x - cx, y - cy) > r + (hash2(x, y, 5) - 0.5)) continue;
        const i = idx(x, y);
        if (ground[i] !== T.DIRT && ground[i] !== T.WATER && ground[i] !== T.DEEP && ground[i] !== T.BRIDGE) ground[i] = hash2(x, y, 9) < 0.35 ? T.FLOWER : t;
        noTree[i] = 1;
      }
  };
  clearing(89, 32, 4);
  clearing(59, 7, 4);
  clearing(56, 63, 5);

  // ---- 8) Objekte
  const objects = [];
  const interact = [];
  function place(sprite, tx, ty, fw = 1, fh = 1, solidFrom = 0) {
    objects.push({ sprite, tx, ty, fw, fh });
    for (let y = ty; y < ty + fh; y++)
      for (let x = tx; x < tx + fw; x++) {
        if (!inb(x, y)) continue;
        occupied[idx(x, y)] = 1;
        if (y - ty >= solidFrom) solid[idx(x, y)] = 1;
      }
  }

  // Häuser (5x4 Tiles, oberste Reihe begehbar -> man kann hinter das Dach laufen)
  const houses = [
    { x: 44, y: 22, roof: 'red', id: 'taverne' },
    { x: 65, y: 21, roof: 'blue', id: 'kraemer' },
    { x: 44, y: 34, roof: 'green', id: 'zuhause' },
    { x: 65, y: 34, roof: 'plum', id: 'schmiede' },
  ];
  const exits = [];
  const doors = [];
  for (const h of houses) {
    place('house_' + h.roof, h.x, h.y, 5, 4, 1);
    const dx = h.x + 2, dy = h.y + 4;
    // Pfad von der Tür zur Straße
    if (h.y < 29) carve([[dx, dy], [dx, 29]], 1, 0);
    else {
      const side = h.x < 57 ? h.x + 6 : h.x - 2;
      carve([[dx, dy], [dx, dy + 1], [side, dy + 1], [side, 31]], 1, 0);
    }
    // Tür begehbar machen + Übergang in den Innenraum
    doors.push([dx, dy - 1]);
    exits.push({ x: dx, y: dy - 1, w: 1, h: 1, to: h.id, tx: 6, ty: 8, dir: 'up', kind: 'door' });
  }
  // Brunnen auf dem Platz, Schild am Dorfeingang
  place('well', 57, 26, 2, 2);
  interact.push({ x: 57.5, y: 27, text: 'Ein alter Brunnen. Tief unten glitzert das Wasser.' });
  for (const [x, y, v] of [[53, 26, 0], [62, 26, 1], [53, 33, 1], [62, 33, 0]]) place('planter' + v, x, y);
  place('lamp', 55, 26); place('lamp', 60, 26); place('lamp', 52, 31); place('lamp', 64, 32);
  place('sign', 41, 27);
  interact.push({ x: 41, y: 27, text: 'Pixeldorf – Willkommen!  ←  Fluss & See   |   →  Ostwald   |   ↓  Blumenwiese' });
  place('sign', 62, 4);
  interact.push({ x: 62, y: 4, text: '↑ Dunkelwald. Bei Dunkelheit nicht vom Weg abkommen!' });
  place('sign', 92, 30);
  interact.push({ x: 92, y: 30, text: '→ Graufels-Berge & alte Kristallmine' });
  place('sign', 59, 67);
  interact.push({ x: 59, y: 67, text: '↓ Möwenbucht – Strand, Leuchtturm & frische Brise' });
  place('sign', 19, 36);
  interact.push({ x: 19, y: 36, text: 'Zum Steg am Spiegelsee. Angeln verboten! (Noch.)' });

  // Gartenzaun
  for (let x = 71; x <= 78; x++) {
    if (x !== 74 && x !== 75) place(x === 71 || x === 78 ? 'fenceP' : 'fenceH', x, 27);
    place(x === 71 || x === 78 ? 'fenceP' : 'fenceH', x, 21);
  }
  for (let y = 22; y <= 26; y++) { place('fenceV', 71, y); place('fenceV', 78, y); }
  carve([[74, 28], [74, 29]], 2, 0);

  // Deko im Dorf
  place('crate', 63, 25); place('barrel', 64, 25);
  place('barrel', 49, 37); place('crate', 43, 25);
  for (const [x, y, s] of [[42, 20, 'oak0'], [52, 20, 'oak2'], [70, 33, 'oak1'], [42, 40, 'oak0'], [51, 39, 'bush1'],
    [64, 40, 'bush0'], [76, 38, 'oak1'], [79, 20, 'pine0'], [52, 34, 'bush0'], [62, 19, 'bush1']])
    if (!solid[idx(x, y)] && ground[idx(x, y)] !== T.DIRT) place(s, x, y);
  // Blumenbeete vor den Häusern
  for (const h of houses) for (const x of [h.x, h.x + 1, h.x + 3, h.x + 4]) {
    const i = idx(x, h.y + 4);
    if (ground[i] === T.GRASS) ground[i] = T.FLOWER;
  }

  // ---- 9) Bäume, Büsche, Felsen (prozedural)
  const treeAt = new Uint8Array(N);
  for (let y = 1; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = idx(x, y), g = ground[i];
      if (noTree[i] || occupied[i]) continue;
      const h = hash2(x, y, seed + 3);
      const near = (dx, dy) => inb(x + dx, y + dy) && treeAt[idx(x + dx, y + dy)];
      if (g === T.FOREST) {
        if (near(-1, 0) || near(-1, -1) || near(0, -1) || near(1, -1)) continue;
        if (h < 0.62) {
          const pine = nF(x / 10 + 70, y / 10) > 0.55;
          const v = Math.floor(hash2(x, y, 77) * (pine ? 2 : 3));
          place(pine ? 'pine' + v : 'oak' + (v === 2 && hash2(x, y, 8) < 0.7 ? 0 : v), x, y);
          treeAt[i] = 1;
        } else if (h < 0.7) place('bush' + (hash2(x, y, 4) < 0.25 ? 1 : 0), x, y);
      } else if (g === T.GRASS || g === T.FLOWER) {
        if (near(-1, 0) || near(0, -1)) continue;
        const grove = nM(x / 5 + 50, y / 5 + 50);
        if (grove > 0.72 && h < 0.3 && !near(-1, -1) && !near(1, -1)) { place('oak' + Math.floor(hash2(x, y, 6) * 3), x, y); treeAt[i] = 1; }
        else if (h < 0.025) { place('oak' + Math.floor(hash2(x, y, 6) * 3), x, y); treeAt[i] = 1; }
        else if (h < 0.05) place('bush' + (hash2(x, y, 4) < 0.3 ? 1 : 0), x, y);
        else if (h < 0.06) place('rock' + (hash2(x, y, 2) < 0.5 ? 1 : 0), x, y);
      } else if (g === T.SAND && h < 0.015) place('rock1', x, y);
    }

  // Wasser blockiert
  for (let i = 0; i < N; i++) if (ground[i] === T.WATER || ground[i] === T.DEEP) solid[i] = 1;

  for (const [x, y] of doors) solid[idx(x, y)] = 0;
  exits.push({ x: 59, y: 0, w: 2, h: 1, to: 'dunkelwald', tx: 31.5, ty: 45, dir: 'up', kind: 'edge' });
  exits.push({ x: 95, y: 32, w: 1, h: 2, to: 'berge', tx: 2, ty: 24, dir: 'right', kind: 'edge' });
  exits.push({ x: 56, y: 71, w: 2, h: 1, to: 'kueste', tx: 35.5, ty: 2, dir: 'down', kind: 'edge' });
  objects.sort((a, b) => (a.ty + a.fh) - (b.ty + b.fh));

  const inVillage = (tx, ty) => tx >= VILLAGE.x0 && tx <= VILLAGE.x1 && ty >= VILLAGE.y0 && ty <= VILLAGE.y1;
  function biomeAt(tx, ty) {
    if (!inb(tx, ty)) return '???';
    const g = ground[idx(tx, ty)];
    if (g === T.STONE) return 'Dorfplatz';
    if (g === T.FARM) return 'Gemüsegarten';
    if (g === T.BRIDGE) return Math.hypot(tx - LAKE.x, ty - LAKE.y) < LAKE.r + 4 ? 'Steg am Spiegelsee' : 'Holzbrücke';
    if (inVillage(tx, ty)) return 'Pixeldorf';
    if (g === T.SAND) return Math.hypot(tx - LAKE.x, ty - LAKE.y) < LAKE.r + 5 ? 'Seeufer' : 'Flussufer';
    if (g === T.FOREST) return tx > W / 2 ? 'Ostwald' : 'Westwald';
    if (g === T.DIRT) return 'Feldweg';
    if (g === T.FLOWER) return 'Blumenwiese';
    if (g === T.WATER || g === T.DEEP) return 'Wasser';
    return ty > H * 0.6 ? 'Südwiese' : 'Wiese';
  }

  const npcs = [
    { id: 'lina', x: 56, y: 31, mode: 'wander', home: [52, 29, 63, 34] },
    { id: 'jan', x: 18, y: 48, mode: 'stand', dir: 'down' },
  ];
  // Fischer steht am Ende des Stegs
  for (let y = H - 1; y > 36; y--) if (ground[idx(18, y)] === T.BRIDGE) { npcs[1].y = y - 1; break; }

  return {
    id: 'village', name: 'Pixeldorf', kind: 'outdoor', styles: {}, ambience: {}, decals: [], lights: [], bg: '#1b2a1e',
    exits, npcs,
    W, H, seed, ground, solid, objects, interact,
    spawn: { x: 57.5 * 16 + 8, y: 31 * 16 + 12 },
    isSolid(tx, ty) { return !inb(tx, ty) || solid[idx(tx, ty)] === 1; },
    tileAt(tx, ty) { return get(tx, ty); },
    biomeAt,
  };
}
