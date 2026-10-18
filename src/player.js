// Spielfigur: 4 Richtungen, Laufanimation, AABB-Kollision gegen Tile-Grid.
import { TS } from './tiles.js';
import { hitsTiles, hitsBodies } from './collision.js';

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
    this.atk = null;      // laufender Schwertschlag { t, dur, hit:Set }
    this.kbx = 0; this.kby = 0; this.kbt = 0; // Rückstoß
    this.inv = 0;         // Unverwundbarkeit nach Treffer (Blinken)
    this.sword = null;    // Schwert-Sprite (Canvas) oder null
    this.dead = false;
    this.speedMul = 1;    // Bremsfaktor (z. B. Treibsand)
    this.ice = false;     // auf Eis: träge Beschleunigung, Weiterrutschen
    this.svx = 0; this.svy = 0;
  }
  get sortY() { return this.y; }
  startAttack() { if (this.atk || this.kbt > 0) return false; this.atk = { t: 0, dur: 0.26, hit: new Set() }; return true; }
  knockback(fromX, fromY, power = 170) {
    const dx = this.x - fromX, dy = this.y - fromY, l = Math.hypot(dx, dy) || 1;
    this.kbx = (dx / l) * power; this.kby = (dy / l) * power; this.kbt = 0.16; this.svx = this.svy = 0;
  }
  /** Trefferfläche des Schwerts in Welt-Pixeln (abhängig von Blickrichtung und Reichweite). */
  swordBox(reach = 0) {
    const x = this.x, y = this.y;
    switch (this.dir) {
      case 'down': return { x: x - 11, y: y - 6, w: 22, h: 18 + reach };
      case 'up': return { x: x - 11, y: y - 32 - reach, w: 22, h: 22 + reach };
      case 'left': return { x: x - 22 - reach, y: y - 22, w: 19 + reach, h: 22 };
      default: return { x: x + 3, y: y - 22, w: 19 + reach, h: 22 };
    }
  }

  collides(world, x, y) {
    return hitsTiles(world, x, y, HB.hw, HB.h) || hitsBodies(world.entities || [], x, y, this, HB.hw, HB.h);
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
    this.inv = Math.max(0, this.inv - dt);
    if (this.atk) { this.atk.t += dt; if (this.atk.t >= this.atk.dur) this.atk = null; }
    if (this.kbt > 0) {
      this.kbt -= dt;
      this.moveAxis(world, this.kbx * dt, 0); this.moveAxis(world, 0, this.kby * dt);
      this.x = Math.max(HB.hw, Math.min(world.W * TS - HB.hw, this.x));
      this.y = Math.max(HB.h, Math.min(world.H * TS, this.y));
      this.moving = false; this.anim = 0;
      return;
    }
    let vx = 0, vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    const wants = vx !== 0 || vy !== 0;
    const ox = this.x, oy = this.y;
    let tvx = 0, tvy = 0;
    if (wants) {
      // Blickrichtung: aktuelle Richtung behalten, wenn sie noch gedrückt ist
      const want = [];
      if (vy < 0) want.push('up'); if (vy > 0) want.push('down');
      if (vx < 0) want.push('left'); if (vx > 0) want.push('right');
      if (!want.includes(this.dir) && !this.atk) this.dir = vx !== 0 ? (vx < 0 ? 'left' : 'right') : (vy < 0 ? 'up' : 'down');
      const len = Math.hypot(vx, vy);
      const sp = this.speed * (input.run ? 1.65 : 1) * (this.atk ? 0.35 : 1) * this.speedMul;
      tvx = (vx / len) * sp; tvy = (vy / len) * sp;
    }
    if (this.ice) { // Eis: Schwung aufbauen und nur langsam abbremsen
      const k = 1 - Math.exp(-dt * (wants ? 2.4 : 0.9));
      this.svx += (tvx - this.svx) * k; this.svy += (tvy - this.svy) * k;
    } else { this.svx = tvx; this.svy = tvy; }
    if (Math.abs(this.svx) > 0.5 && !this.moveAxis(world, this.svx * dt, 0) && this.ice) this.svx = 0;
    if (Math.abs(this.svy) > 0.5 && !this.moveAxis(world, 0, this.svy * dt) && this.ice) this.svy = 0;
    // Kartengrenzen
    this.x = Math.max(HB.hw, Math.min(world.W * TS - HB.hw, this.x));
    this.y = Math.max(HB.h, Math.min(world.H * TS, this.y));
    // Animation nur, wenn sich die Figur tatsächlich bewegt hat (nicht beim Laufen gegen Wände)
    const moved = Math.hypot(this.x - ox, this.y - oy);
    this.moving = wants && moved > 0.05 * (dt * 60);
    this.sliding = this.ice && moved > 0.4 * (dt * 60);
    if (this.moving) this.anim += dt * (input.run ? 12 : 8);
    else this.anim = 0;
  }

  get frame() { return this.moving ? WALK_CYCLE[Math.floor(this.anim) % 4] : 0; }
  get tileX() { return Math.floor(this.x / TS); }
  get tileY() { return Math.floor((this.y - 3) / TS); }
  /** Sprite-Rechteck in Welt-Pixeln */
  get bounds() { return { x: Math.round(this.x) - 8, y: Math.round(this.y) - 20, w: 16, h: 20 }; }

  draw(ctx, cam, alpha = 1) {
    const b = this.bounds;
    const sx = b.x - cam.x, sy = b.y - cam.y;
    if (alpha === 1) ctx.drawImage(this.frames.shadow, sx + 2, sy + 17);
    // Blinken während der Unverwundbarkeit
    if (this.inv > 0 && Math.floor(this.inv * 14) % 2 === 0 && alpha === 1) { if (this.atk) this.drawSword(ctx, cam); return; }
    ctx.globalAlpha = alpha;
    if (this.atk && this.dir === 'up' && alpha === 1) this.drawSword(ctx, cam);
    const bob = this.moving && this.frame !== 0 ? -1 : 0;
    const fr = this.atk ? 2 : this.frame; // Ausfallschritt beim Schlag
    ctx.drawImage(this.frames[this.dir][fr], sx, sy + bob);
    ctx.globalAlpha = 1;
    if (this.atk && this.dir !== 'up' && alpha === 1) this.drawSword(ctx, cam);
  }
  /** Schwert im Bogen schwingen + Pixel-Schlagspur. */
  drawSword(ctx, cam) {
    if (!this.sword) return;
    const base = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[this.dir];
    const p = Math.min(1, this.atk.t / (this.atk.dur * 0.75));
    const e = 1 - (1 - p) * (1 - p);
    const flip = this.dir === 'left' || this.dir === 'up' ? -1 : 1;
    const a0 = base - 1.25 * flip, a = a0 + 2.4 * e * flip;
    const hx = Math.round(this.x - cam.x + ({ right: 3, left: -3, up: 2, down: -2 }[this.dir]));
    const hy = Math.round(this.y - cam.y - 9 + (this.dir === 'down' ? 2 : 0));
    const long = this.swordLong ? 2 : 0;
    // Schlagspur
    ctx.fillStyle = this.swordLong ? 'rgba(160,240,255,0.75)' : 'rgba(255,255,255,0.7)';
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const aa = a0 + (a - a0) * (i / steps);
      if (i / steps < 0.25 && p > 0.6) continue;
      for (const r of [12 + long, 13 + long]) ctx.fillRect(Math.round(hx + Math.cos(aa) * r), Math.round(hy + Math.sin(aa) * r), 1, 1);
    }
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(a + Math.PI / 4);
    ctx.drawImage(this.sword, -3, -16);
    ctx.restore();
  }
}
