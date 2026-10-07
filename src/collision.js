// Gemeinsame Kollisionsprüfung für Spieler und NPCs (Hitbox am Fußpunkt).
import { TS } from './pix.js';

export const HB = { hw: 5, h: 6 };

export function hitsTiles(map, x, y, hw = HB.hw, h = HB.h) {
  const x0 = Math.floor((x - hw) / TS), x1 = Math.floor((x + hw - 0.001) / TS);
  const y0 = Math.floor((y - h) / TS), y1 = Math.floor((y - 0.001) / TS);
  for (let ty = y0; ty <= y1; ty++)
    for (let tx = x0; tx <= x1; tx++) if (map.isSolid(tx, ty)) return true;
  return false;
}

export function hitsBodies(bodies, x, y, self, hw = HB.hw, h = HB.h) {
  for (const b of bodies) {
    if (!b || b === self) continue;
    if (Math.abs(b.x - x) < hw * 2 - 1 && y - h < b.y - 1 && b.y - HB.h + 1 < y) return true;
  }
  return false;
}
