// Backen des Bodens jeder Karte in große Offscreen-Canvases (eine pro Wasser-Frame),
// inkl. Terrain-Übergängen, Klippen/Wänden, Decals; außerdem Minimap-Erzeugung.
import { T, RAISED } from './map.js';
import { PAL, TS } from './tiles.js';
import { APAL } from './tiles-areas.js';
import { hash2 } from './noise.js';

export const WATER_FRAMES = 4;

// Rang: höheres Terrain überlappt niedrigeres mit gezackter Kante (null = keine Übergänge).
const PRI = {
  [T.DEEP]: 0, [T.WATER]: 1, [T.SWAMP]: 1, [T.SAND]: 2, [T.DIRT]: 3, [T.STONE]: 3, [T.FARM]: 3, [T.ROCKY]: 3, [T.CAVE]: 3,
  [T.GRASS]: 4, [T.FLOWER]: 4, [T.DGRASS]: 4, [T.SNOW]: 4.5, [T.FOREST]: 5, [T.DFOREST]: 5, [T.BRIDGE]: -1,
};
const pri = (t) => (PRI[t] === undefined ? -1 : PRI[t]);
const UPPER = {
  [T.WATER]: [PAL.w1, null, null], [T.SWAMP]: [APAL.sw1, null, null],
  [T.SAND]: [PAL.s1, PAL.s2, PAL.s0], [T.DIRT]: [PAL.d1, PAL.d2, null], [T.STONE]: [PAL.st1, null, null], [T.FARM]: [PAL.d1, null, null],
  [T.GRASS]: [PAL.g1, PAL.g2, PAL.g0], [T.FLOWER]: [PAL.g1, PAL.g2, PAL.g0], [T.FOREST]: [PAL.f1, PAL.f2, PAL.f0],
  [T.DGRASS]: [APAL.dg1, APAL.dg2, APAL.dg0], [T.DFOREST]: [APAL.df1, APAL.df2, APAL.df0],
  [T.ROCKY]: [APAL.rk1, APAL.rk2, APAL.rk0], [T.SNOW]: [APAL.sn1, APAL.sn2, APAL.sn0], [T.CAVE]: [APAL.cv1, APAL.cv2, APAL.cv0],
};
const LOWER_RIM = (lower, phase) => {
  switch (lower) {
    case T.WATER: return phase ? [PAL.w3, PAL.w4, PAL.w2] : [PAL.w4, PAL.w3];
    case T.SWAMP: return phase ? [APAL.sw2, APAL.sw3] : [APAL.sw3, APAL.sw2];
    case T.SAND: return [PAL.s0];
    case T.DIRT: case T.FARM: return [PAL.d0];
    case T.STONE: return [PAL.st0];
    case T.GRASS: case T.FLOWER: return [PAL.g0];
    case T.DGRASS: return [APAL.dg0];
    case T.ROCKY: return [APAL.rk0];
    case T.CAVE: return [APAL.cv0];
    case T.SNOW: return [APAL.sn0];
    default: return [];
  }
};

const SIDES = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]];
const CORNERS = [['NW', -1, -1], ['NE', 1, -1], ['SW', -1, 1], ['SE', 1, 1]];
const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

function raisedStyle(map, t, y = 99) {
  if (t === T.CLIFF) return map.styles.snowLine && y < map.styles.snowLine ? 'cliffSnow' : (map.styles.cliff || 'cliff');
  if (t === T.CAVEWALL) return 'cave';
  if (t === T.WALL) return map.styles.wall || 'wall_zuhause';
  return null;
}

function baseTile(art, map, t, x, y, f) {
  const h = hash2(x, y, 7);
  const tl = art.tiles;
  switch (t) {
    case T.GRASS: return tl.grass[h < 0.55 ? 0 : h < 0.82 ? 1 : h < 0.95 ? 2 : 3];
    case T.FLOWER: return tl.flower[Math.floor(hash2(x >> 2, y >> 2, 11) * 6 + h * 1.6) % 6];
    case T.FOREST: return tl.forest[Math.floor(h * 3)];
    case T.DIRT: return tl.dirt[h < 0.6 ? 0 : h < 0.88 ? 1 : 2];
    case T.SAND: return tl.sand[h < 0.6 ? 0 : h < 0.9 ? 1 : 2];
    case T.WATER: return tl.water[f][Math.floor(h * 4)];
    case T.DEEP: return tl.deep[f][Math.floor(h * 2)];
    case T.STONE: return tl.stone[Math.floor(h * 2)];
    case T.FARM: return tl.farm[(x % 3 === 0) ? 0 : 1 + (Math.floor(x / 2) + y) % 3];
    case T.DGRASS: return tl.dgrass[h < 0.6 ? 0 : h < 0.9 ? 1 : 2];
    case T.DFOREST: return tl.dforest[Math.floor(h * 3)];
    case T.SWAMP: return tl.swamp[f][Math.floor(h * 2)];
    case T.ROCKY: return tl.rocky[h < 0.5 ? 0 : h < 0.8 ? 1 : h < 0.95 ? 2 : 3];
    case T.SNOW: return tl.snow[Math.floor(h * 3)];
    case T.CAVE: return tl.cave[h < 0.6 ? 0 : h < 0.9 ? 1 : 2];
    case T.WOOD: return (tl.wood[map.styles.floor] || tl.wood.zuhause)[Math.floor(h * 3)];
    case T.FLAG: return tl.flag[Math.floor(h * 2)];
    case T.MAT: return tl.mat[map.styles.mat || map.styles.floor] || tl.mat.wood;
    case T.VOID: return tl.void;
    default: return tl.grass[0];
  }
}

// Ausrichtung jeder Brücke/jedes Stegs anhand der Bounding-Box der Komponente
function bridgeOrientation(map) {
  const { W, H } = map;
  const orient = new Int8Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (map.tileAt(x, y) !== T.BRIDGE || orient[y * W + x]) continue;
      const stack = [[x, y]], comp = [];
      orient[y * W + x] = -1;
      let x0 = x, x1 = x, y0 = y, y1 = y;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        comp.push(cy * W + cx);
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (const [, dx, dy] of SIDES) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || orient[ny * W + nx] || map.tileAt(nx, ny) !== T.BRIDGE) continue;
          orient[ny * W + nx] = -1;
          stack.push([nx, ny]);
        }
      }
      const o = x1 - x0 >= y1 - y0 ? 1 : 2;
      for (const i of comp) orient[i] = o;
    }
  return orient;
}

export function bakeGround(map, art) {
  const { W, H } = map;
  const frames = [];
  const orient = bridgeOrientation(map);
  const g = (x, y) => map.tileAt(x, y);
  const isR = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? true : RAISED.has(g(x, y));
  const hasWater = map.ground.some((t) => t === T.WATER || t === T.DEEP || t === T.SWAMP);
  const nFrames = hasWater ? WATER_FRAMES : 1;
  for (let f = 0; f < nFrames; f++) {
    const c = document.createElement('canvas');
    c.width = W * TS; c.height = H * TS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Pass 1: Basis-Tiles (inkl. Ober-/Frontseiten erhabener Tiles)
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = g(x, y), px = x * TS, py = y * TS;
        if (t === T.BRIDGE) { ctx.drawImage(orient[y * W + x] === 1 ? art.tiles.bridgeH : art.tiles.bridgeV, px, py); continue; }
        const rs = raisedStyle(map, t, y);
        if (rs) {
          const set = art.raised[rs];
          const v = Math.floor(hash2(x, y, 21) * set.top.length);
          const below1 = isR(x, y + 1), below2 = isR(x, y + 2);
          const img = !below1 ? set.faceL[v % set.faceL.length] : !below2 ? set.faceU[v % set.faceU.length] : set.top[v];
          ctx.drawImage(img, px, py);
          continue;
        }
        ctx.drawImage(baseTile(art, map, t, x, y, f), px, py);
      }

    // Pass 2: Übergänge, Kanten, Geländer, Schatten, Deko
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = g(x, y), px = x * TS, py = y * TS;
        const rs = raisedStyle(map, t, y);
        if (rs || t === T.VOID) {
          const set = rs ? art.raised[rs] : null;
          if (!set) continue;
          const face = !isR(x, y + 1) || !isR(x, y + 2);
          ctx.fillStyle = set.rim;
          if (!face) {
            if (!isR(x, y - 1)) ctx.fillRect(px, py, TS, set.interior ? 2 : 1);
            if (!isR(x - 1, y)) ctx.fillRect(px, py, set.interior ? 2 : 1, TS);
            if (!isR(x + 1, y)) ctx.fillRect(px + TS - (set.interior ? 2 : 1), py, set.interior ? 2 : 1, TS);
          } else {
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            if (!isR(x - 1, y)) ctx.fillRect(px, py, 1, TS);
            if (!isR(x + 1, y)) ctx.fillRect(px + TS - 1, py, 1, TS);
          }
          continue;
        }
        if (t === T.STONE) {
          ctx.fillStyle = '#6e685f';
          if (g(x, y - 1) !== T.STONE) ctx.fillRect(px, py, TS, 1);
          if (g(x, y + 1) !== T.STONE) ctx.fillRect(px, py + TS - 2, TS, 2);
          if (g(x - 1, y) !== T.STONE) ctx.fillRect(px, py, 1, TS);
          if (g(x + 1, y) !== T.STONE) ctx.fillRect(px + TS - 1, py, 1, TS);
        } else if (t === T.BRIDGE) {
          for (const [s, dx, dy] of SIDES) {
            const n = g(x + dx, y + dy);
            if (n === T.WATER || n === T.DEEP || n === T.SWAMP) ctx.drawImage(art.rails[s], px, py);
          }
        } else if (PRI[t] !== undefined) {
          const p = pri(t);
          const variant = hash2(x, y, 3) < 0.5 ? 0 : 1;
          const higher = {};
          for (const [s, dx, dy] of SIDES) higher[s] = pri(g(x + dx, y + dy)) > p;
          // Treppenstufe? -> diagonales Stück statt zweier Kanten
          let diag = null;
          for (const [cn, cdx, cdy] of CORNERS) {
            const a = cn[0], b = cn[1];
            if (higher[a] && higher[b] && !higher[OPP[a]] && !higher[OPP[b]] &&
              !(pri(g(x - cdx, y + cdy)) > p) && !(pri(g(x + cdx, y - cdy)) > p)) { diag = cn; break; }
          }
          const rimsFor = (n) => [UPPER[n][2], ...LOWER_RIM(t, f % 2)].filter(Boolean);
          if (diag) {
            const n = g(x, y + (diag[0] === 'N' ? -1 : 1));
            ctx.drawImage(art.edge(UPPER[n][0], UPPER[n][1], rimsFor(n), 'd' + diag, 0), px, py);
          } else {
            for (const [s, dx, dy] of SIDES) {
              if (!higher[s]) continue;
              const n = g(x + dx, y + dy);
              ctx.drawImage(art.edge(UPPER[n][0], UPPER[n][1], rimsFor(n), s, variant), px, py);
            }
            for (const [s] of CORNERS) { // Innenecken runden
              if (!higher[s[0]] || !higher[s[1]]) continue;
              const n = g(x, y + (s[0] === 'N' ? -1 : 1));
              ctx.drawImage(art.edge(UPPER[n][0], null, rimsFor(n), 'c' + s, 0), px, py);
            }
            for (const [s, dx, dy] of CORNERS) {
              const n = g(x + dx, y + dy);
              if (!(pri(n) > p) || higher[s[0]] || higher[s[1]]) continue;
              ctx.drawImage(art.edge(UPPER[n][0], null, rimsFor(n), s, 0), px, py);
            }
          }
        }
        // Schatten unter Wänden/Klippen
        if (isR(x, y - 1) && y > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.30)'; ctx.fillRect(px, py, TS, 2);
          ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(px, py + 2, TS, 3);
        }
        if (map.kind === 'interior' || map.kind === 'cave') {
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          if (isR(x - 1, y)) ctx.fillRect(px, py, 3, TS);
          if (isR(x + 1, y)) ctx.fillRect(px + TS - 2, py, 2, TS);
        }
        // Boden-Deko
        const h = hash2(x, y, 99);
        let deco = null;
        if (t === T.FOREST || t === T.DFOREST) deco = h < 0.05 ? 'mushroom' : h < 0.14 ? 'fern' : null;
        else if (t === T.GRASS || t === T.ROCKY || t === T.DGRASS || t === T.CAVE) deco = h < 0.015 ? 'pebbles' : null;
        else if (t === T.SAND) {
          const nearWater = SIDES.some(([, dx, dy]) => g(x + dx, y + dy) === T.WATER);
          deco = nearWater && h < 0.3 && map.id !== 'kueste' ? 'reeds' : h < 0.04 ? 'shell' : null;
        } else if (t === T.WATER && map.id !== 'kueste') {
          const nearLand = SIDES.some(([, dx, dy]) => pri(g(x + dx, y + dy)) > 1);
          if (!nearLand && h < 0.1) deco = h < 0.035 ? 'lily1' : 'lily0';
        } else if (t === T.SWAMP) {
          if (h < 0.12) deco = 'lily0';
        }
        if (deco) ctx.drawImage(art.deco[deco], px, py);
      }
    for (const d of map.decals) ctx.drawImage(art.decals[d.sprite], d.x, d.y);
    frames.push(c);
  }
  return frames;
}

const MINI = {
  [T.GRASS]: '#4e9a45', [T.FLOWER]: '#6fb257', [T.FOREST]: '#2b5f37', [T.DIRT]: '#bd8e5c', [T.SAND]: '#e2c78c',
  [T.WATER]: '#3d84c6', [T.DEEP]: '#2e6cae', [T.STONE]: '#a8a297', [T.BRIDGE]: '#8c5e36', [T.FARM]: '#7a5232',
  [T.DGRASS]: '#2c5747', [T.DFOREST]: '#162a25', [T.SWAMP]: '#33594b', [T.ROCKY]: '#958a7d', [T.CLIFF]: '#5b524b',
  [T.SNOW]: '#e6edf5', [T.WOOD]: '#9c7046', [T.WALL]: '#3a2a20', [T.FLAG]: '#7c7771', [T.CAVE]: '#3a3242',
  [T.CAVEWALL]: '#120e16', [T.VOID]: '#000000', [T.MAT]: '#a63c33',
};
export function buildMinimap(map) {
  const c = document.createElement('canvas');
  c.width = map.W; c.height = map.H;
  const ctx = c.getContext('2d');
  for (let y = 0; y < map.H; y++)
    for (let x = 0; x < map.W; x++) { ctx.fillStyle = MINI[map.tileAt(x, y)] || '#000'; ctx.fillRect(x, y, 1, 1); }
  for (const o of map.objects) {
    const s = o.sprite;
    if (/oak|pine|palm|deadtree/.test(s)) ctx.fillStyle = '#1b4127';
    else if (s.startsWith('house') || s === 'hut' || s === 'lighthouse') ctx.fillStyle = '#b84b3b';
    else if (s.startsWith('crystal')) ctx.fillStyle = '#9ef0ff';
    else if (map.kind === 'interior') ctx.fillStyle = '#6e4628';
    else continue;
    ctx.fillRect(o.tx, o.ty, o.fw, o.fh);
  }
  for (const e of map.exits) { ctx.fillStyle = '#ffe14d'; ctx.fillRect(e.x, e.y, e.w, e.h); }
  return c;
}
