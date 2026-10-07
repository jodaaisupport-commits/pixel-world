// Spielfigur: 4 Richtungen, Laufanimation, AABB-Kollision gegen Tile-Grid.
import { TS } from './tiles.js';

const WALK_CYCLE = [1, 0, 2, 0];
// Hitbox relativ zum Fußpunkt (x = Mitte, y = Unterkante)
const HB = { hw: 5, h: 6 };

export class Player {
  constructor(x, y, frames) {
    this.x = x; this.y = y;
    this.frames = frames;
    this.dir = 'down';
    this.moving = false;
    this.anim = 0;
    this.speed = 78; // px/s
  }

  collides(world, x, y) {
    const x0 = Math.floor((x - HB.hw) / TS), x1 = Math.floor((x + HB.hw - 0.001) / TS);
    const y0 = Math.floor((y - HB.h) / TS), y1 = Math.floor((y - 0.001) / TS);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++) if (world.isSolid(tx, ty)) return true;
    return false;
  }

  /** Bewegt entlang einer Achse; bei Kollision bündig an die Kante + Ecken-Rutschen. */
  moveAxis(world, dx, dy) {
    if (!dx && !dy) return true;
    const nx = this.x + dx, ny = this.y + dy;
    if (!this.collides(world, nx, ny)) { this.x = nx; this.y = ny; return true; }
    // so weit wie möglich heranschieben (in 0.25px-Schritten)
    const steps = Math.ceil(Math.abs(dx + dy) / 0.25);
    const sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
      if (this.collides(world, this.x + sx, this.y + sy)) break;
      this.x += sx; this.y += sy;
    }
    // Ecken-Assist: knapp an einer Kante vorbei? Dann seitlich drumherum gleiten.
    const amt = Math.abs(dx + dy);
    for (const off of [1, 2, 3, 4, 5, 6]) {
      for (const sgn of [-1, 1]) {
        const ox = dy ? sgn * off : 0, oy = dx ? sgn * off : 0;
        if (!this.collides(world, this.x + ox, this.y + oy) && !this.collides(world, this.x + ox + Math.sign(dx) * 1, this.y + oy + Math.sign(dy) * 1)) {
          const sx2 = Math.sign(ox) * Math.min(amt, Math.abs(ox)), sy2 = Math.sign(oy) * Math.min(amt, Math.abs(oy));
          if (!this.collides(world, this.x + sx2, this.y + sy2)) { this.x += sx2; this.y += sy2; }
          return false;
        }
      }
    }
    return false;
  }

  update(dt, input, world) {
    let vx = 0, vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    this.moving = vx !== 0 || vy !== 0;
    if (this.moving) {
      // Blickrichtung: aktuelle Richtung behalten, wenn sie noch gedrückt ist
      const want = [];
      if (vy < 0) want.push('up'); if (vy > 0) want.push('down');
      if (vx < 0) want.push('left'); if (vx > 0) want.push('right');
      if (!want.includes(this.dir)) this.dir = vx !== 0 ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      const len = Math.hypot(vx, vy);
      const sp = this.speed * (input.run ? 1.65 : 1) * dt;
      this.moveAxis(world, (vx / len) * sp, 0);
      this.moveAxis(world, 0, (vy / len) * sp);
      this.anim += dt * (input.run ? 12 : 8);
    } else this.anim = 0;
    // Kartengrenzen
    this.x = Math.max(HB.hw, Math.min(world.W * TS - HB.hw, this.x));
    this.y = Math.max(HB.h, Math.min(world.H * TS, this.y));
  }

  get frame() { return this.moving ? WALK_CYCLE[Math.floor(this.anim) % 4] : 0; }
  get tileX() { return Math.floor(this.x / TS); }
  get tileY() { return Math.floor((this.y - 3) / TS); }
  /** Sprite-Rechteck in Welt-Pixeln */
  get bounds() { return { x: Math.round(this.x) - 8, y: Math.round(this.y) - 20, w: 16, h: 20 }; }

  draw(ctx, cam, alpha = 1) {
    const b = this.bounds;
    const sx = b.x - cam.x, sy = b.y - cam.y;
    ctx.globalAlpha = alpha;
    if (alpha === 1) ctx.drawImage(this.frames.shadow, sx + 2, sy + 17);
    const bob = this.moving && this.frame !== 0 ? -1 : 0;
    ctx.drawImage(this.frames[this.dir][this.frame], sx, sy + bob);
    ctx.globalAlpha = 1;
  }
}
