// Backen des Bodens in große Offscreen-Canvases (eine pro Wasser-Animationsframe)
// und Minimap-Erzeugung.
import { T } from './world.js';
import { PAL, TS } from './tiles.js';
import { hash2 } from './noise.js';

export const WATER_FRAMES = 4;

// Rang: höheres Terrain überlappt niedrigeres mit gezackter Kante.
const PRI = { [T.DEEP]: 0, [T.WATER]: 1, [T.SAND]: 2, [T.DIRT]: 3, [T.STONE]: 3, [T.FARM]: 3, [T.GRASS]: 4, [T.FLOWER]: 4, [T.FOREST]: 5, [T.BRIDGE]: -1 };
// Farbe der überlappenden Kante (fill, speck, dunkle Lippe)
const UPPER = {
  [T.WATER]: [PAL.w1, null, null],
  [T.SAND]: [PAL.s1, PAL.s2, PAL.s0],
  [T.DIRT]: [PAL.d1, PAL.d2, null],
  [T.STONE]: [PAL.st1, null, null],
  [T.FARM]: [PAL.d1, null, null],
  [T.GRASS]: [PAL.g1, PAL.g2, PAL.g0],
  [T.FLOWER]: [PAL.g1, PAL.g2, PAL.g0],
  [T.FOREST]: [PAL.f1, PAL.f2, PAL.f0],
};
// Schatten/Schaum auf dem unteren Terrain direkt an der Kante
const LOWER_RIM = (lower, phase) => {
  if (lower === T.WATER) return phase ? [PAL.w3, PAL.w4, PAL.w2] : [PAL.w4, PAL.w3];
  if (lower === T.DEEP) return [];
  if (lower === T.SAND) return [PAL.s0];
  if (lower === T.DIRT || lower === T.FARM) return [PAL.d0];
  if (lower === T.STONE) return [PAL.st0];
  if (lower === T.GRASS || lower === T.FLOWER) return [PAL.g0];
  return [];
};

const SIDES = [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]];
const CORNERS = [['NW', -1, -1], ['NE', 1, -1], ['SW', -1, 1], ['SE', 1, 1]];

function baseTile(art, t, x, y, f) {
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
    default: return tl.grass[0];
  }
}

// Ausrichtung jeder Brücke/jedes Stegs anhand der Bounding-Box der Komponente
function bridgeOrientation(world) {
  const { W, H } = world;
  const orient = new Int8Array(W * H); // 1 = horizontal (Ost-West), 2 = vertikal
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (world.tileAt(x, y) !== T.BRIDGE || orient[y * W + x]) continue;
      const stack = [[x, y]], comp = [];
      orient[y * W + x] = -1;
      let x0 = x, x1 = x, y0 = y, y1 = y;
      while (stack.length) {
        const [cx, cy] = stack.pop();
        comp.push(cy * W + cx);
        x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy);
        for (const [, dx, dy] of SIDES) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || orient[ny * W + nx] || world.tileAt(nx, ny) !== T.BRIDGE) continue;
          orient[ny * W + nx] = -1;
          stack.push([nx, ny]);
        }
      }
      const o = x1 - x0 >= y1 - y0 ? 1 : 2;
      for (const i of comp) orient[i] = o;
    }
  return orient;
}

export function bakeGround(world, art) {
  const { W, H } = world;
  const frames = [];
  const orient = bridgeOrientation(world);
  for (let f = 0; f < WATER_FRAMES; f++) {
    const c = document.createElement('canvas');
    c.width = W * TS; c.height = H * TS;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const g = (x, y) => world.tileAt(x, y);

    // Pass 1: Basis-Tiles
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = g(x, y);
        if (t === T.BRIDGE) {
          ctx.drawImage(orient[y * W + x] === 1 ? art.tiles.bridgeH : art.tiles.bridgeV, x * TS, y * TS);
        } else ctx.drawImage(baseTile(art, t, x, y, f), x * TS, y * TS);
      }

    // Pass 2: Übergänge, Kanten, Geländer, Deko
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = g(x, y), px = x * TS, py = y * TS;
        if (t === T.STONE) { // Platz: sauberer Rand statt Gras-Überlappung
          ctx.fillStyle = '#6e685f';
          if (g(x, y - 1) !== T.STONE) ctx.fillRect(px, py, TS, 1);
          if (g(x, y + 1) !== T.STONE) { ctx.fillRect(px, py + TS - 2, TS, 2); }
          if (g(x - 1, y) !== T.STONE) ctx.fillRect(px, py, 1, TS);
          if (g(x + 1, y) !== T.STONE) ctx.fillRect(px + TS - 1, py, 1, TS);
          continue;
        }
        if (t === T.BRIDGE) {
          for (const [s, dx, dy] of SIDES) {
            const n = g(x + dx, y + dy);
            if (n === T.WATER || n === T.DEEP) ctx.drawImage(art.rails[s], px, py);
          }
          continue;
        }
        const p = PRI[t];
        const variant = hash2(x, y, 3) < 0.5 ? 0 : 1;
        const higher = {};
        for (const [s, dx, dy] of SIDES) {
          const n = g(x + dx, y + dy);
          higher[s] = PRI[n] > p;
          if (!higher[s]) continue;
          const [fill, speck, lip] = UPPER[n];
          const rims = [lip, ...LOWER_RIM(t, f % 2)].filter(Boolean);
          ctx.drawImage(art.edge(fill, speck, rims, s, variant), px, py);
        }
        for (const [s] of CORNERS) { // Innenecken runden
          if (!higher[s[0]] || !higher[s[1]]) continue;
          const [, ndx, ndy] = SIDES.find((q) => q[0] === s[0]);
          const n = g(x + ndx, y + ndy);
          const [fill, , lip] = UPPER[n];
          const rims = [lip, ...LOWER_RIM(t, f % 2)].filter(Boolean);
          ctx.drawImage(art.edge(fill, null, rims, 'c' + s, 0), px, py);
        }
        for (const [s, dx, dy] of CORNERS) {
          const n = g(x + dx, y + dy);
          if (!(PRI[n] > p) || higher[s[0]] || higher[s[1]]) continue;
          const [fill, , lip] = UPPER[n];
          const rims = [lip, ...LOWER_RIM(t, f % 2)].filter(Boolean);
          ctx.drawImage(art.edge(fill, null, rims, s, 0), px, py);
        }
        // Boden-Deko
        const h = hash2(x, y, 99);
        let deco = null;
        if (t === T.FOREST) deco = h < 0.05 ? 'mushroom' : h < 0.14 ? 'fern' : null;
        else if (t === T.GRASS) deco = h < 0.012 ? 'pebbles' : null;
        else if (t === T.SAND) {
          const nearWater = SIDES.some(([, dx, dy]) => g(x + dx, y + dy) === T.WATER);
          deco = nearWater && h < 0.3 ? 'reeds' : h < 0.04 ? 'shell' : null;
        } else if (t === T.WATER) {
          const nearLand = SIDES.some(([, dx, dy]) => PRI[g(x + dx, y + dy)] > 1);
          if (!nearLand && h < 0.1) deco = h < 0.035 ? 'lily1' : 'lily0';
        }
        if (deco) ctx.drawImage(art.deco[deco], px, py);
      }
    frames.push(c);
  }
  return frames;
}

const MINI = {
  [T.GRASS]: '#4e9a45', [T.FLOWER]: '#6fb257', [T.FOREST]: '#2b5f37', [T.DIRT]: '#bd8e5c', [T.SAND]: '#e2c78c',
  [T.WATER]: '#3d84c6', [T.DEEP]: '#2e6cae', [T.STONE]: '#a8a297', [T.BRIDGE]: '#8c5e36', [T.FARM]: '#7a5232',
};
export function buildMinimap(world) {
  const c = document.createElement('canvas');
  c.width = world.W; c.height = world.H;
  const ctx = c.getContext('2d');
  for (let y = 0; y < world.H; y++)
    for (let x = 0; x < world.W; x++) { ctx.fillStyle = MINI[world.tileAt(x, y)]; ctx.fillRect(x, y, 1, 1); }
  for (const o of world.objects) {
    if (o.sprite.startsWith('oak') || o.sprite.startsWith('pine')) ctx.fillStyle = '#1b4127';
    else if (o.sprite.startsWith('house')) ctx.fillStyle = '#b84b3b';
    else continue;
    ctx.fillRect(o.tx, o.ty + o.fh - 1, o.fw, o.sprite.startsWith('house') ? -3 : 1);
  }
  return c;
}
