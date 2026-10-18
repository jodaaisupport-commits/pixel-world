// NPCs: wandern in einem Heimbereich oder stehen an ihrem Posten, 4-Richtungs-Animation,
// Kollision mit Welt, Spieler und anderen NPCs.
import { TS } from './pix.js';
import { HB, hitsTiles, hitsBodies } from './collision.js';
import { mulberry32 } from './noise.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const WALK_CYCLE = [1, 0, 2, 0];

export class NPC {
  constructor(spec, def, frames) {
    this.id = spec.id;
    this.name = def.name;
    this.def = def;
    this.frames = frames;
    this.x = spec.x * TS + 8;
    this.y = spec.y * TS + 12;
    this.homeDir = spec.dir || 'down';
    this.dir = this.homeDir;
    this.mode = spec.mode || 'stand';
    this.home = spec.home || null; // [x0, y0, x1, y1] in Tiles
    this.speed = spec.speed || 28;
    this.state = 'idle';
    this.timer = 1 + (spec.x % 3);
    this.target = null;
    this.moving = false;
    this.anim = 0;
    this.talking = false;
    this.rng = mulberry32(spec.x * 131 + spec.y * 71 + this.id.length);
  }

  blocked(map, x, y, player) {
    if (hitsTiles(map, x, y)) return true;
    if (hitsBodies([player, ...map.entities], x, y, this)) return true;
    // NPCs meiden Übergänge (Türen, Kartenränder)
    const tx = Math.floor(x / TS), ty = Math.floor((y - 2) / TS);
    return map.exits.some((e) => tx >= e.x && tx < e.x + e.w && ty >= e.y && ty < e.y + e.h);
  }

  facePlayer(player) {
    const dx = player.x - this.x, dy = player.y - this.y;
    this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }

  /** Geskriptete Bewegung (Zwischensequenzen): erst waagerecht, dann senkrecht, ohne Kollision. */
  walkTo(tx, ty, speed = 60) { return new Promise((res) => { this.script = { tx, ty, speed, res }; }); }
  update(dt, map, player) {
    this.moving = false;
    if (this.script) {
      const s = this.script, dx = s.tx - this.x, dy = s.ty - this.y, step = s.speed * dt;
      if (Math.abs(dx) > 0.5) { this.dir = dx < 0 ? 'left' : 'right'; this.x += Math.sign(dx) * Math.min(step, Math.abs(dx)); }
      else if (Math.abs(dy) > 0.5) { this.dir = dy < 0 ? 'up' : 'down'; this.y += Math.sign(dy) * Math.min(step, Math.abs(dy)); }
      else { this.script = null; this.state = 'idle'; this.timer = 2; s.res(); return; }
      this.moving = true; this.anim += dt * (s.speed > 40 ? 12 : 7);
      return;
    }
    if (this.talking) { this.facePlayer(player); this.anim = 0; return; }
    this.timer -= dt;
    if (this.mode === 'stand') {
      if (this.timer <= 0) { // ab und zu umschauen, dann zurück zur Grundhaltung
        this.dir = this.dir === this.homeDir ? ['left', 'right', 'down', 'up'][Math.floor(this.rng() * 4)] : this.homeDir;
        this.timer = this.dir === this.homeDir ? 2.5 + this.rng() * 3 : 0.8 + this.rng();
      }
      return;
    }
    if (this.state === 'idle') {
      if (this.timer > 0) return;
      const names = Object.keys(DIRS);
      const d = names[Math.floor(this.rng() * 4)];
      const dist = (1 + Math.floor(this.rng() * 3)) * TS;
      let tx = this.x + DIRS[d][0] * dist, ty = this.y + DIRS[d][1] * dist;
      if (this.home) {
        const [x0, y0, x1, y1] = this.home;
        tx = Math.max(x0 * TS + 8, Math.min(x1 * TS + 8, tx));
        ty = Math.max(y0 * TS + 12, Math.min(y1 * TS + 12, ty));
      }
      if (Math.hypot(tx - this.x, ty - this.y) < 4) { this.timer = 0.5; return; }
      this.dir = d; this.target = [tx, ty]; this.state = 'walk'; this.timer = 4;
      return;
    }
    // walk
    const [tx, ty] = this.target;
    const dx = tx - this.x, dy = ty - this.y;
    const step = this.speed * dt;
    let nx = this.x, ny = this.y;
    if (Math.abs(dx) > 0.5) nx += Math.sign(dx) * Math.min(step, Math.abs(dx));
    else if (Math.abs(dy) > 0.5) ny += Math.sign(dy) * Math.min(step, Math.abs(dy));
    else { this.state = 'idle'; this.timer = 1.2 + this.rng() * 2.5; return; }
    if (this.blocked(map, nx, ny, player) || this.timer <= 0) { this.state = 'idle'; this.timer = 0.6 + this.rng() * 1.5; return; }
    this.x = nx; this.y = ny;
    this.moving = true;
    this.anim += dt * 7;
  }

  get frame() { return this.moving ? WALK_CYCLE[Math.floor(this.anim) % 4] : 0; }
  get bounds() { return { x: Math.round(this.x) - 8, y: Math.round(this.y) - 20, w: 16, h: 20 }; }
  get sortY() { return this.y; }

  draw(ctx, cam) {
    const b = this.bounds;
    const sx = b.x - cam.x, sy = b.y - cam.y;
    ctx.drawImage(this.frames.shadow, sx + 2, sy + 17);
    const bob = this.moving && this.frame !== 0 ? -1 : 0;
    ctx.drawImage(this.frames[this.dir][this.frame], sx, sy + bob);
  }

  pages(state) { return typeof this.def.pages === 'function' ? this.def.pages(state) : this.def.pages; }
}

export { HB };
