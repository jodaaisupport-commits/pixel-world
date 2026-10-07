// Gegner: prozedurale Sprites (Schleim, Moorschleim, Fledermaus, Krabbe, Wolf, Felsgolem) und einfache KI.
import { Pix, TS } from './pix.js';
import { hitsTiles } from './collision.js';
import { RAISED } from './map.js';

// ---------------------------------------------------------------- Sprites
function slimeFrames(c1, c2, c3) {
  const out = [];
  const shapes = [[7, 5.5], [7.5, 5], [6.2, 6.8], [6.6, 6.2]];
  for (const [rx, ry] of shapes) {
    const p = new Pix(16, 14);
    const cy = 13 - ry;
    p.ellipse(8, cy, rx, ry, c3);
    p.ellipse(8, cy - 0.5, rx - 0.6, ry - 0.8, c1);
    p.ellipse(6.5, cy - ry * 0.45, rx * 0.35, ry * 0.25, c2);
    p.set(5, Math.round(cy - ry * 0.6), '#ffffff');
    const ey = Math.round(cy - 0.5);
    for (const ex of [6, 10]) { p.set(ex, ey, '#ffffff'); p.set(ex, ey + 1, '#1a1020'); p.set(ex - 1, ey, '#ffffff'); p.set(ex - 1, ey + 1, '#ffffff'); }
    p.hline(7, 9, ey + 3, c3);
    out.push(p.outlined('#10161a'));
  }
  return out;
}
function batFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(18, 12);
    const wy = [1, 4, 7][f];
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const x = 9 + s * (2 + i), y0 = Math.round(5 + (wy - 5) * (i / 6)), y1 = Math.round(y0 + 3 - i * 0.35);
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) p.set(x, y, i % 3 === 2 ? '#3a2448' : '#4e3260');
      }
    }
    p.ellipse(9, 6, 2.6, 3.2, '#5a3a70'); p.ellipse(9, 5.5, 1.6, 2, '#6e4a88');
    p.set(7, 2, '#5a3a70'); p.set(11, 2, '#5a3a70'); // Ohren
    p.set(8, 5, '#ff4a4a'); p.set(10, 5, '#ff4a4a');
    p.set(8, 8, '#ffffff'); p.set(10, 8, '#ffffff');
    out.push(p.outlined('#120a18'));
  }
  return out;
}
function crabFrames() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(20, 13);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { // Beine
      const x = 10 + s * (3 + i * 2), up = (i + f) % 2;
      p.set(x, 9 + up, '#b8402a'); p.set(x + s, 10 + up, '#b8402a'); p.set(x + s, 11, '#8a2a1a');
    }
    p.ellipse(10, 7.5, 6, 3.6, '#a8341f'); p.ellipse(10, 7, 5.2, 3, '#e05a3a'); p.hline(7, 12, 5, '#f08a5a');
    for (const s of [-1, 1]) { // Scheren
      const cx = 10 + s * 8, cy = 4 + (f && s > 0 ? 1 : 0);
      p.ellipse(cx, cy, 2.2, 2, '#e05a3a'); p.set(cx + s, cy - 2, '#e05a3a'); p.set(cx, cy - 2, '#a8341f'); p.set(cx - s, cy + 1, '#f08a5a');
      p.set(10 + s * 6, 6, '#c84a2a');
    }
    for (const ex of [8, 12]) { p.vline(ex, 2, 4, '#a8341f'); p.set(ex, 1, '#ffffff'); p.set(ex, 2, '#1a1010'); }
    out.push(p.outlined('#2a0e08'));
  }
  return out;
}
function wolfFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(22, 15);
    const g0 = '#4a4a56', g1 = '#6e6e7c', g2 = '#9a9aa8', g3 = '#c8c8d2';
    // Beine
    const lg = [[0, 0, 0, 0], [1, -1, -1, 1], [-1, 1, 1, -1]][f];
    [[6, lg[0]], [8, lg[1]], [14, lg[2]], [16, lg[3]]].forEach(([x, o]) => { p.vline(x + o, 10, 13, g0); p.set(x + o, 14, '#2a2a30'); });
    p.ellipse(11, 8.5, 6.5, 3.4, g1); p.hline(6, 16, 6, g2); p.ellipse(11, 10, 4, 1.4, g3);
    // Schwanz
    p.set(4, 7, g1); p.set(3, 6, g1); p.set(2, 5, g2); p.set(3, 7, g1); p.set(2, 6, g1);
    // Kopf
    p.ellipse(17, 6, 3.2, 2.8, g1); p.rect(19, 6, 3, 2, g2); p.set(21, 6, '#1a1a20');
    p.set(16, 3, g1); p.set(16, 2, g0); p.set(18, 3, g1); p.set(18, 2, g0);
    p.set(18, 5, '#ffd23f'); p.hline(19, 20, 8, g3);
    out.push(p.outlined('#16161c'));
  }
  return out;
}
function golemFrames() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(22, 24);
    const r0 = '#4e4842', r1 = '#6e665c', r2 = '#8e8476', r3 = '#aea392', moss = '#5a8a3a';
    // Beine
    p.rect(6, 18 + (f ? 0 : 1), 4, 5 - (f ? 0 : 1), r0); p.rect(12, 18 + (f ? 1 : 0), 4, 5 - (f ? 1 : 0), r0);
    // Körper
    p.rect(4, 8, 14, 11, r1); p.rect(5, 9, 12, 4, r2); p.hline(5, 16, 8, r3); p.hline(4, 17, 18, r0);
    p.set(8, 14, r0); p.set(9, 15, r0); p.set(13, 12, r0); p.set(14, 13, r0);
    // Arme
    const ay = f ? 1 : 0;
    p.rect(0, 9 + ay, 4, 9, r1); p.rect(0, 16 + ay, 4, 3, r2); p.rect(18, 10 - ay, 4, 9, r1); p.rect(18, 17 - ay, 4, 3, r2);
    // Kopf
    p.rect(7, 2, 8, 7, r1); p.hline(7, 14, 2, r3); p.rect(8, 3, 6, 2, r2);
    p.set(9, 5, '#7af0ff'); p.set(12, 5, '#7af0ff'); p.set(10, 5, '#3ab8e8'); p.set(13, 5, '#3ab8e8');
    // Moos + Kristall
    for (const [x, y] of [[5, 8], [6, 8], [7, 7], [16, 8], [15, 7], [1, 9], [2, 9], [19, 10]]) p.set(x, y, moss);
    p.set(11, 10, '#7af0ff'); p.set(11, 11, '#3ab8e8'); p.set(10, 11, '#7af0ff');
    out.push(p.outlined('#1a1612'));
  }
  return out;
}
function white(canvas) {
  const c = document.createElement('canvas');
  c.width = canvas.width; c.height = canvas.height;
  const x = c.getContext('2d');
  x.drawImage(canvas, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function buildEnemyArt() {
  const mk = (frames) => { const cv = frames.map((f) => f.canvas()); return { frames: cv, white: cv.map(white), w: cv[0].width, h: cv[0].height }; };
  const wolf = wolfFrames();
  return {
    slime: mk(slimeFrames('#5ccf5c', '#a8f0a0', '#2f8a3a')),
    moorslime: mk(slimeFrames('#9a6ad8', '#d8b8ff', '#5a3a98')),
    bat: mk(batFrames()),
    crab: mk(crabFrames()),
    wolf: mk(wolf), wolfL: mk(wolf.map((p) => p.flipX())),
    golem: mk(golemFrames()),
  };
}

// ---------------------------------------------------------------- Definitionen
export const ENEMY_DEFS = {
  slime: { name: 'Schleim', hp: 2, speed: 20, chase: 34, aggro: 80, dmg: 1, hw: 6, h: 7, art: 'slime', hop: true, drops: [['taler', 0.65, 1], ['herz', 0.25, 1]] },
  moorslime: { name: 'Moorschleim', hp: 3, speed: 18, chase: 32, aggro: 85, dmg: 1, hw: 6, h: 7, art: 'moorslime', hop: true, drops: [['taler', 0.8, 2], ['herz', 0.3, 1]] },
  bat: { name: 'Fledermaus', hp: 1, speed: 30, chase: 50, aggro: 100, dmg: 1, hw: 6, h: 6, art: 'bat', fly: true, drops: [['taler', 0.5, 1], ['herz', 0.25, 1]] },
  crab: { name: 'Krabbe', hp: 3, speed: 22, chase: 36, aggro: 72, dmg: 1, hw: 7, h: 6, art: 'crab', sideways: true, drops: [['taler', 0.75, 2], ['herz', 0.25, 1]] },
  wolf: { name: 'Bergwolf', hp: 3, speed: 26, chase: 46, aggro: 100, dmg: 1, hw: 7, h: 6, art: 'wolf', lunge: true, drops: [['taler', 0.8, 3], ['herz', 0.3, 1]] },
  golem: { name: 'Felsgolem', hp: 6, speed: 11, chase: 18, aggro: 90, dmg: 2, hw: 8, h: 8, art: 'golem', heavy: true, drops: [['eisenerz', 1, 1], ['taler', 1, 5]] },
};

let nextId = 1;
export class Enemy {
  constructor(spec, art) {
    this.uid = nextId++;
    this.type = spec.type;
    this.def = ENEMY_DEFS[spec.type];
    this.art = art;
    this.x = spec.x * TS + 8; this.y = spec.y * TS + 12;
    this.homeX = this.x; this.homeY = this.y;
    this.hp = this.def.hp;
    this.state = 'wander'; this.timer = Math.random() * 1.5; this.vx = 0; this.vy = 0;
    this.kbx = 0; this.kby = 0; this.kbt = 0;
    this.flash = 0; this.inv = 0; this.anim = Math.random() * 4;
    this.face = 1; this.dead = false; this.cool = 0; this.alt = 0;
  }
  get sortY() { return this.y; }
  get box() { const d = this.def; return { x: this.x - d.hw, y: this.y - d.h - (d.fly ? 8 : d.heavy ? 10 : 2), w: d.hw * 2, h: d.h + (d.fly ? 6 : d.heavy ? 10 : 2) }; }

  blocked(map, x, y) {
    const d = this.def;
    if (d.fly) {
      const x0 = Math.floor((x - 5) / TS), x1 = Math.floor((x + 5) / TS), y0 = Math.floor((y - 5) / TS), y1 = Math.floor((y - 0.01) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (!map.inb(tx, ty) || RAISED.has(map.get(tx, ty))) return true;
    } else if (hitsTiles(map, x, y, d.hw - 1, Math.min(d.h, 7))) return true;
    const tx = Math.floor(x / TS), ty = Math.floor((y - 2) / TS);
    for (const e of map.exits) if (tx >= e.x - 1 && tx < e.x + e.w + 1 && ty >= e.y - 1 && ty < e.y + e.h + 1) return true;
    for (const n of map.entities || []) if (Math.abs(n.x - x) < 12 && Math.abs(n.y - y) < 10) return true;
    return false;
  }
  move(map, dx, dy) {
    let moved = false;
    if (dx && !this.blocked(map, this.x + dx, this.y)) { this.x += dx; moved = true; }
    if (dy && !this.blocked(map, this.x, this.y + dy)) { this.y += dy; moved = true; }
    return moved;
  }
  /** Treffer durch das Schwert. */
  hurt(dmg, fromX, fromY) {
    if (this.inv > 0 || this.dead) return false;
    this.hp -= dmg;
    this.flash = 0.16; this.inv = 0.28;
    const dx = this.x - fromX, dy = this.y - fromY, l = Math.hypot(dx, dy) || 1;
    const k = this.def.heavy ? 70 : 150;
    this.kbx = (dx / l) * k; this.kby = (dy / l) * k; this.kbt = 0.16;
    this.state = 'chase';
    if (this.hp <= 0) this.dead = true;
    return true;
  }
  update(dt, map, player) {
    const d = this.def;
    this.flash = Math.max(0, this.flash - dt); this.inv = Math.max(0, this.inv - dt); this.cool = Math.max(0, this.cool - dt);
    this.anim += dt * (d.fly ? 10 : d.hop ? 6 : 7);
    if (this.kbt > 0) { this.kbt -= dt; this.move(map, this.kbx * dt, this.kby * dt); return; }
    if (this.frozen) { this.moving = false; return; } // Test-Hook: Gegner steht still
    const px = player.x, py = player.y, dx = px - this.x, dy = py - this.y, dist = Math.hypot(dx, dy);
    const alive = player.hp > 0;
    if (this.state !== 'chase' && dist < d.aggro && alive) { this.state = 'chase'; this.timer = 0; }
    if (this.state === 'chase' && (dist > d.aggro * 1.7 || !alive)) { this.state = 'wander'; this.timer = 0.5; }
    let mx = 0, my = 0, sp = d.speed;
    if (this.state === 'retreat') {
      this.timer -= dt; mx = -dx; my = -dy; sp = d.speed;
      if (this.timer <= 0) this.state = 'chase';
    } else if (this.state === 'chase') {
      sp = d.chase; mx = dx; my = dy;
      if (d.fly) { const t = this.anim * 0.35; mx += Math.cos(t) * 30; my += Math.sin(t * 1.3) * 30; }
      if (d.sideways) { my *= 0.45; }
      if (d.lunge) {
        if (this.state2 === 'crouch') { mx = my = 0; this.timer -= dt; if (this.timer <= 0) { this.state2 = 'lunge'; this.timer = 0.32; this.lx = dx / (dist || 1); this.ly = dy / (dist || 1); } }
        else if (this.state2 === 'lunge') { mx = this.lx; my = this.ly; sp = d.chase * 2.6; this.timer -= dt; if (this.timer <= 0) { this.state2 = null; this.cool = 1.1; } }
        else if (dist < 52 && this.cool <= 0) { this.state2 = 'crouch'; this.timer = 0.38; mx = my = 0; }
      }
    } else { // wandern
      this.timer -= dt;
      if (this.timer <= 0) {
        if (Math.random() < 0.35) { this.vx = this.vy = 0; }
        else {
          const a = Math.random() * Math.PI * 2;
          this.vx = Math.cos(a); this.vy = Math.sin(a);
          // nicht zu weit vom Startpunkt
          const hx = this.homeX - this.x, hy = this.homeY - this.y;
          if (Math.hypot(hx, hy) > 56) { const l = Math.hypot(hx, hy); this.vx = hx / l; this.vy = hy / l; }
          if (d.sideways) this.vy *= 0.3;
        }
        this.timer = 0.6 + Math.random() * 1.4;
      }
      mx = this.vx; my = this.vy;
    }
    // Schleime bewegen sich nur in der "Sprung"-Phase
    if (d.hop) { const ph = this.anim % 4; if (ph < 1.6) { mx = my = 0; } else sp *= 1.6; }
    const l = Math.hypot(mx, my);
    if (l > 0.01) {
      const ok = this.move(map, (mx / l) * sp * dt, (my / l) * sp * dt);
      if (Math.abs(mx) > 0.1) this.face = mx < 0 ? -1 : 1;
      if (!ok && this.state === 'wander') this.timer = 0;
      this.moving = true;
    } else this.moving = false;
    if (d.fly) this.alt = 9 + Math.sin(this.anim * 0.6) * 2;
  }
  /** Kontakt mit der Spielfigur? */
  touches(player) {
    const b = this.box, px0 = player.x - 5, px1 = player.x + 5, py0 = player.y - 13, py1 = player.y;
    return b.x < px1 && b.x + b.w > px0 && b.y < py1 && b.y + b.h > py0;
  }
  draw(ctx, cam) {
    const d = this.def;
    let a = this.art[d.art];
    if (d.lunge && this.face < 0) a = this.art.wolfL;
    let f;
    if (d.fly) f = Math.floor(this.anim) % 3;
    else if (d.hop) f = Math.floor(this.anim) % 4;
    else f = this.moving ? 1 + (Math.floor(this.anim) % (a.frames.length - 1 || 1)) : 0;
    if (d.lunge && this.state2 === 'crouch') f = 0;
    f = Math.min(f, a.frames.length - 1);
    const img = this.flash > 0 && Math.floor(this.flash * 40) % 2 === 0 ? a.white[f] : a.frames[f];
    const sx = Math.round(this.x - a.w / 2 - cam.x), sy = Math.round(this.y - a.h - cam.y - (this.alt || 0) + (d.fly ? 0 : 1));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const sw = Math.round(d.hw * 1.6);
    ctx.fillRect(Math.round(this.x - sw / 2 - cam.x), Math.round(this.y - cam.y - 1), sw, 2);
    ctx.fillRect(Math.round(this.x - sw / 2 + 1 - cam.x), Math.round(this.y - cam.y - 2), sw - 2, 1);
    if (d.lunge && this.state2 === 'crouch') ctx.drawImage(img, sx, sy + 1);
    else ctx.drawImage(img, sx, sy);
  }
}
