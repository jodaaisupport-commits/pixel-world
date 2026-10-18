// Gemeinsames Karten-Modell für alle Szenen (Oberwelt, Gebiete, Innenräume).
import { hash2 } from './noise.js';

export const T = {
  GRASS: 0, FLOWER: 1, FOREST: 2, DIRT: 3, SAND: 4, WATER: 5, DEEP: 6, STONE: 7, BRIDGE: 8, FARM: 9,
  DGRASS: 10, DFOREST: 11, SWAMP: 12, ROCKY: 13, CLIFF: 14, SNOW: 15,
  WOOD: 16, WALL: 17, FLAG: 18, CAVE: 19, CAVEWALL: 20, VOID: 21, MAT: 22,
  // Zweite Geschichte
  DUNE: 23, QSAND: 24, RUIN: 25, ICE: 26, CHASM: 27, TEMPLE: 28,
};
/** Tiles, die immer blockieren. */
export const SOLID_TILES = new Set([T.WATER, T.DEEP, T.SWAMP, T.CLIFF, T.WALL, T.CAVEWALL, T.VOID, T.CHASM]);
/** "Erhabene" Tiles mit Ober-/Frontseite (Klippen, Höhlen- und Innenwände). */
export const RAISED = new Set([T.CLIFF, T.CAVEWALL, T.WALL, T.VOID]);

/**
 * Erzeugt eine leere Karte mit Hilfsfunktionen. Jede Szene liefert so ein Objekt:
 *  ground/solid (Tile-Raster), objects (y-sortierte Sprites), decals (in den Boden gebacken),
 *  interact (Schilder etc.), exits (Übergänge), npcs (Definitionen), lights, ambience.
 */
export function createMap({ id, name, W, H, fill = T.GRASS, seed = 1, kind = 'outdoor', styles = {}, ambience = {} }) {
  const N = W * H;
  const m = {
    id, name, W, H, seed, kind, styles, ambience,
    ground: new Uint8Array(N).fill(fill),
    solid: new Uint8Array(N),
    occupied: new Uint8Array(N),
    objects: [], decals: [], interact: [], exits: [], npcs: [], lights: [],
    pickups: [], chests: [], enemies: [],
    spawn: { x: 0, y: 0 },
    bg: '#000000',
    idx: (x, y) => y * W + x,
    inb: (x, y) => x >= 0 && y >= 0 && x < W && y < H,
  };
  m.get = (x, y) => m.ground[m.idx(Math.max(0, Math.min(W - 1, x)), Math.max(0, Math.min(H - 1, y)))];
  m.set = (x, y, t) => { if (m.inb(x, y)) m.ground[m.idx(x, y)] = t; };
  m.fill = (x0, y0, x1, y1, t) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m.set(x, y, t); };
  m.hash = (x, y, s = 0) => hash2(x, y, seed + s);
  /** Objekt platzieren; solidFrom = erste blockierende Footprint-Reihe (99 = gar nicht). */
  m.place = (sprite, tx, ty, fw = 1, fh = 1, solidFrom = 0, extra = {}) => {
    const o = { sprite, tx, ty, fw, fh, solidFrom, ...extra };
    m.objects.push(o);
    for (let y = ty; y < ty + fh; y++)
      for (let x = tx; x < tx + fw; x++) {
        if (!m.inb(x, y)) continue;
        m.occupied[m.idx(x, y)] = 1;
        if (y - ty >= solidFrom) m.solid[m.idx(x, y)] = 1;
      }
    return o;
  };
  m.decal = (sprite, px, py) => m.decals.push({ sprite, x: px, y: py });
  m.light = (px, py, r, color = 'rgba(255,190,110,0.5)', flicker = 0) => m.lights.push({ x: px, y: py, r, color, flicker });
  m.exit = (x, y, w, h, to, tx, ty, dir = 'down', kind = 'edge') => m.exits.push({ x, y, w, h, to, tx, ty, dir, kind });
  /** Dauerhaft einsammelbarer Gegenstand (Schlüssel = Karte + Position). */
  m.pickup = (item, tx, ty, n = 1) => m.pickups.push({ item, tx, ty, n, key: `${id}:${tx},${ty}` });
  /** Truhe: contents = [[item, n], ...]; locked = benötigter Schlüssel-Gegenstand. */
  m.chest = (tx, ty, contents, locked = null) => {
    const key = `${id}:chest:${tx},${ty}`;
    m.place(locked ? 'chest_locked' : 'chest', tx, ty, 1, 1, 0, { chest: key, locked });
    m.chests.push({ key, tx, ty, contents, locked });
  };
  m.enemy = (type, tx, ty) => m.enemies.push({ type, x: tx, y: ty });
  /** Nächstes freies, begehbares Tile um (x, y) mit passendem Boden. */
  m.findFree = (x, y, ok = () => true, maxR = 8) => {
    for (let r = 0; r <= maxR; r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (!m.inb(xx, yy) || m.occupied[m.idx(xx, yy)] || SOLID_TILES.has(m.get(xx, yy)) || !ok(m.get(xx, yy), xx, yy)) continue;
        if (m.pickups.some((p) => p.tx === xx && p.ty === yy)) continue;
        return [xx, yy];
      }
    return null;
  };
  /** Gegner zufällig (deterministisch) auf passende, freie Tiles verteilen – fern von Ausgängen/NPCs. */
  m.scatterEnemies = (type, count, ok, salt = 0) => {
    const cands = [];
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
      if (m.occupied[m.idx(x, y)] || SOLID_TILES.has(m.get(x, y)) || !ok(m.get(x, y), x, y)) continue;
      if (m.exits.some((e) => Math.hypot(e.x - x, e.y - y) < 9)) continue;
      if (m.npcs.some((n) => Math.hypot(n.x - x, n.y - y) < 7)) continue;
      cands.push([x, y, hash2(x, y, seed + 900 + salt)]);
    }
    cands.sort((a, b) => a[2] - b[2]);
    const chosen = [];
    for (const [x, y] of cands) {
      if (chosen.length >= count) break;
      if (chosen.some(([cx, cy]) => Math.hypot(cx - x, cy - y) < 6) || m.enemies.some((e) => Math.hypot(e.x - x, e.y - y) < 4)) continue;
      chosen.push([x, y]); m.enemy(type, x, y);
    }
    return chosen;
  };
  m.isSolid = (tx, ty) => !m.inb(tx, ty) || m.solid[m.idx(tx, ty)] === 1;
  m.tileAt = (tx, ty) => m.get(tx, ty);
  m.biomeAt = () => m.name;
  /** Blockierende Tiles in das Kollisionsraster übernehmen, Objekte sortieren. */
  m.finalize = (openTiles = []) => {
    for (let i = 0; i < N; i++) if (SOLID_TILES.has(m.ground[i])) m.solid[i] = 1;
    for (const [x, y] of openTiles) m.solid[m.idx(x, y)] = 0;
    m.objects.sort((a, b) => (a.ty + a.fh) - (b.ty + b.fh));
    return m;
  };
  return m;
}

/** Breiter, leicht geschlängelter Pfad zwischen Wegpunkten (setzt Tile `t`). */
export function carvePath(m, points, { width = 2, wobble = 0, noise = null, tile = T.DIRT, keep = [], onTile = null } = {}) {
  for (let s = 0; s < points.length - 1; s++) {
    const [ax, ay] = points[s], [bx, by] = points[s + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let t = 0; t <= len; t += 0.2) {
      const u = t / len;
      let px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
      if (wobble && noise) {
        const w = (noise(px / 9 + 40, py / 9) - 0.5) * wobble * Math.sin(Math.PI * u);
        px += nx * w; py += ny * w;
      }
      for (let dy = 0; dy < width; dy++)
        for (let dx = 0; dx < width; dx++) {
          const x = Math.floor(px) + dx, y = Math.floor(py) + dy;
          if (!m.inb(x, y)) continue;
          if (onTile) onTile(x, y);
          else if (!keep.includes(m.get(x, y))) m.set(x, y, tile);
        }
    }
  }
}
