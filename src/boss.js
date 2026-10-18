// Endgegner "Umbrakor, das verderbte Kristallherz": prozeduraler 48×48-Sprite (3 Phasen),
// Angriffsmuster mit Vorwarnung (Splittersalven, Ansturm, Kristallstacheln, Beschwörung, Spirale).
import { Pix } from './pix.js';
import { hash2 } from './noise.js';

const OUT = '#120a18';
const PALS = {
  1: { c: ['#26113a', '#43206a', '#6c38a0', '#9c68d4', '#d9bcff'], glow: '#ff5ad1', vein: '#ff8ae0' },
  2: { c: ['#2a1038', '#4a1d62', '#78339a', '#ab5fd0', '#e6b8ff'], glow: '#ff4fb0', vein: '#ff9ad8' },
  3: { c: ['#3a0a24', '#6a1440', '#a82660', '#e04a8a', '#ffc0dc'], glow: '#ff2a5a', vein: '#ffd0e0' },
};
const ROCK = ['#2e2a36', '#4a4556', '#6a6478', '#8f899e'];

function bodyPix(phase, frame) {
  const P = PALS[phase], p = new Pix(48, 48), cx = 24, cy = 25;
  // Kristallkern (Raute mit Facetten)
  for (let y = 0; y < 48; y++) for (let x = 0; x < 48; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.abs(dx) / 13 + Math.abs(dy) / 19;
    if (d > 1) continue;
    let k = dx < 0 ? (dy < 0 ? 3 : 2) : (dy < 0 ? 2 : 1);
    if (d < 0.5) k = Math.min(4, k + 1);
    if (d > 0.88) k = Math.max(0, k - 1);
    if (Math.abs(dx) < 0.8 && dy < 0) k = 4; // Grat
    p.set(x, y, P.c[k]);
    // verderbte Adern
    const v = hash2(Math.floor(x / 2), Math.floor(y / 2), 77 + phase);
    if (d > 0.3 && d < 0.85 && v < 0.11 + frame * 0.05) p.set(x, y, frame ? P.vein : P.glow);
  }
  // innere Glut
  p.ellipse(cx, cy + 2, 6, 8, P.glow + (frame ? 'b0' : '80'));
  // Augenhöhle (Auge selbst wird zur Laufzeit gezeichnet)
  p.ellipse(cx, cy - 1, 6, 4, '#1a0c26');
  if (phase === 1 || phase === 2) {
    // Felspanzer
    const plate = (px, py, rx, ry, crack) => {
      for (let y = Math.floor(py - ry); y <= py + ry; y++) for (let x = Math.floor(px - rx); x <= px + rx; x++) {
        const dx = (x + 0.5 - px) / rx, dy = (y + 0.5 - py) / ry, r = dx * dx + dy * dy + (hash2(x, y, 5) - 0.5) * 0.25;
        if (r > 1) continue;
        const l = -(dx * 0.6 + dy * 0.8);
        p.set(x, y, ROCK[l > 0.45 ? 3 : l > -0.1 ? 2 : l > -0.6 ? 1 : 0]);
      }
      if (crack) for (let i = 0; i < ry * 1.6; i++) { const x = Math.round(px + Math.sin(i * 1.7 + px) * 2), y = Math.round(py - ry + 1 + i); p.set(x, y, P.glow); p.set(x + 1, y, '#1a0c26'); }
    };
    const cr = phase === 2;
    plate(9, 27, 7, 12, cr); plate(39, 27, 7, 12, cr);
    if (phase === 1) plate(24, 7, 9, 5, false);
    plate(24, 44, 7, 3.5, cr);
    if (phase === 1) { plate(13, 12, 4, 4, false); plate(35, 12, 4, 4, false); }
    if (phase === 2) for (const [x, y] of [[6, 18], [41, 36], [12, 38], [36, 16]]) { p.erase(x, y); p.erase(x + 1, y); p.erase(x, y + 1); }
  } else {
    // Phase 3: nackter Kern mit Stacheln
    const spike = (ax, ay, bx, by, w) => {
      const n = Math.ceil(Math.hypot(bx - ax, by - ay));
      for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, ww = w * (1 - t); for (let o = -ww; o <= ww; o += 0.5) p.set(x + o * 0.9, y + o * 0.3, t > 0.7 ? PALS[3].c[4] : PALS[3].c[o < 0 ? 3 : 2]); }
    };
    spike(14, 18, 2, 8, 2.5); spike(34, 18, 46, 8, 2.5); spike(12, 32, 1, 40, 2.5); spike(36, 32, 47, 40, 2.5);
    spike(20, 8, 16, 0, 2); spike(28, 8, 32, 0, 2); spike(24, 42, 24, 47, 2);
  }
  return p.outlined(OUT);
}
const white = (c) => { const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); return w; };

export function buildBossArt() {
  const body = {}, flash = {};
  for (const ph of [1, 2, 3]) { body[ph] = [0, 1].map((f) => bodyPix(ph, f).canvas()); flash[ph] = white(body[ph][0]); }
  const shard = new Pix(7, 7); shard.ellipse(3.5, 3.5, 3.5, 3.5, '#ff5ad155'); shard.rect(2, 2, 3, 3, '#ff8ae0'); shard.set(3, 2, '#ffffff'); shard.set(3, 3, '#ffe0f6');
  const orb = new Pix(5, 9); for (let y = 0; y < 9; y++) { const w = y < 4 ? y / 2 : (8 - y) / 2; for (let x = Math.round(2 - w); x <= Math.round(2 + w); x++) orb.set(x, y, x < 2 ? '#d9bcff' : '#8a4fc0'); }
  const spike = new Pix(11, 18);
  for (let y = 0; y < 18; y++) { const w = (y / 17) * 4.5; for (let x = Math.round(5 - w); x <= Math.round(5 + w); x++) spike.set(x, y, x < 5 ? '#f0c8ff' : x === 5 ? '#ffffff' : '#a060e0'); }
  for (const [x, y] of [[1, 10], [9, 9]]) { spike.set(x, y, '#c890ff'); spike.set(x, y + 1, '#c890ff'); }
  return { body, flash, shard: shard.canvas(), orb: orb.outlined(OUT).canvas(), spike: spike.outlined(OUT).canvas() };
}

export const BOSS_NAME = 'Umbrakor';
export const BOSS_TITLE = 'Das verderbte Kristallherz';

export class Boss {
  constructor(x, y, art, arena) {
    this.art = art; this.arena = arena; // { cx, cy, rx, ry } in Pixeln
    this.x = x; this.y = y; this.maxHp = 36; this.hp = 36; this.phase = 1;
    this.state = 'sleep'; this.timer = 0; this.flash = 0; this.inv = 0; this.anim = 0; this.dead = false;
    this.projs = []; this.marks = []; this.portals = []; this.spikes = [];
    this.order = 0; this.last = null; this.eyeGlow = 0; this.eyeOpen = 0; this.frozen = false; this.charges = 0; this.uid = 'boss';
    this.dashDir = [0, 1]; this.dashLeft = 0; this.lineLen = 0; this.ang = 0; this.ghost = this.hp;
  }
  get sortY() { return this.y; }
  get bob() { return Math.round(Math.sin(this.anim * 2.2) * 2); }
  get box() { return { x: this.x - 16, y: this.y - 50 - this.bob, w: 32, h: 40 }; }
  get vulnerable() { return !['sleep', 'transition', 'dying', 'intro'].includes(this.state) && this.inv <= 0; }
  wake() { this.state = 'idle'; this.timer = 1.0; this.eyeOpen = 1; }

  /** Schwerttreffer. Rückgabe: 'hit' | 'block' | null */
  hurt(dmg, env) {
    if (this.dead || this.state === 'dying') return null;
    if (!this.vulnerable) { env.sfx('clink'); return 'block'; }
    this.hp = Math.max(0, this.hp - dmg); this.flash = 0.14; this.inv = 0.22;
    env.sfx('hit');
    if (this.hp <= 0) { this.state = 'dying'; this.timer = 3.2; this.projs = []; this.marks = []; this.portals = []; env.sfx('roar'); env.onDying(); return 'hit'; }
    if (this.phase === 1 && this.hp <= this.maxHp * 2 / 3) this.enterPhase(2, env);
    else if (this.phase === 2 && this.hp <= this.maxHp / 3) this.enterPhase(3, env);
    return 'hit';
  }
  enterPhase(n, env) {
    this.phase = n; this.state = 'transition'; this.timer = 2.1; this.inv = 2.1;
    this.projs = []; this.marks = []; this.portals = []; this.charges = 0;
    env.sfx('phase'); env.shake(0.8); env.onPhase(n);
    env.fx({ type: 'shock', x: this.x, y: this.y - 26, t: 0, dur: 0.7 });
    for (let i = 0; i < 18; i++) env.fx({ type: 'debris', x: this.x, y: this.y - 28, vx: Math.cos(i * 0.35) * (50 + (i % 4) * 25), vy: Math.sin(i * 0.35) * 40 - 50, t: 0, dur: 0.9, c: n === 3 ? '#8f899e' : '#6a6478' });
    const p = env.player, dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
    if (d < 70) p.knockback(this.x, this.y, 260);
  }
  clampArena(x, y, k = 0.72) {
    const A = this.arena, dx = (x - A.cx) / (A.rx * k), dy = (y - A.cy) / (A.ry * k), r = Math.hypot(dx, dy);
    return r <= 1 ? [x, y] : [A.cx + (dx / r) * A.rx * k, A.cy + (dy / r) * A.ry * k];
  }
  choose(env) {
    const ph = this.phase, minions = env.minions();
    let pool;
    if (ph === 1) pool = ['volley', 'charge'];
    else if (ph === 2) pool = ['volley', 'charge', 'spikes', minions < 2 ? 'summon' : 'spikes'];
    else pool = ['spiral', 'charge', 'spikes', 'ring', minions < 2 ? 'summon' : 'spiral'];
    let a = pool[this.order++ % pool.length];
    if (a === this.last) a = pool[this.order++ % pool.length];
    this.last = a;
    return a;
  }
  fire(angle, speed, env) { this.projs.push({ x: this.x, y: this.y - 28, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 4 }); }
  aim(env) { const p = env.player; return Math.atan2(p.y - 7 - (this.y - 28), p.x - this.x); }

  update(dt, env) {
    if (this.dead) return;
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.inv = Math.max(0, this.inv - dt);
    this.ghost += (this.hp - this.ghost) * Math.min(1, dt * 3);
    this.eyeGlow = Math.max(0, this.eyeGlow - dt * 2);
    this.updateHazards(dt, env);
    if (this.state === 'sleep' || this.state === 'intro' || this.frozen) return;
    const p = env.player, sp = [0, 32, 42, 58][this.phase];
    this.timer -= dt;
    switch (this.state) {
      case 'dying': {
        if (Math.random() < dt * 9) { env.fx({ type: 'boom', x: this.x + (Math.random() - 0.5) * 40, y: this.y - 30 + (Math.random() - 0.5) * 36, t: 0, dur: 0.4 }); env.sfx('explosion', {}, 0.12); }
        env.shake(0.1);
        if (this.timer <= 0) { this.dead = true; env.onDefeated(); }
        return;
      }
      case 'transition': {
        const A = this.arena; this.x += (A.cx - this.x) * Math.min(1, dt * 2); this.y += (A.cy - 10 - this.y) * Math.min(1, dt * 2);
        if (this.timer <= 0) { this.state = 'idle'; this.timer = 0.8; }
        return;
      }
      case 'idle': {
        const dx = this.x - p.x, dy = this.y - p.y, d = Math.hypot(dx, dy) || 1;
        let [tx, ty] = this.clampArena(p.x + (dx / d) * 84, p.y + (dy / d) * 70);
        const mx = tx - this.x, my = ty - this.y, md = Math.hypot(mx, my);
        if (md > 2) { this.x += (mx / md) * Math.min(md, sp * dt); this.y += (my / md) * Math.min(md, sp * dt); }
        if (this.timer <= 0) this.begin(this.choose(env), env);
        return;
      }
      case 'volley': case 'ring': {
        this.eyeGlow = 1;
        if (this.timer <= 0) {
          env.sfx('shoot');
          const a = this.aim(env), n = this.phase === 1 ? 5 : 7, spread = this.phase === 1 ? 0.22 : 0.18, v = [0, 88, 98, 108][this.phase];
          if (this.state === 'ring') for (let i = 0; i < 14; i++) this.fire(a + (i / 14) * Math.PI * 2 + 0.22, 72, env);
          for (let i = 0; i < n; i++) this.fire(a + (i - (n - 1) / 2) * spread, v, env);
          if (this.phase >= 2 && this.state === 'volley' && !this.second) { this.second = true; this.timer = 0.45; return; }
          this.second = false; this.recover(0.55);
        }
        return;
      }
      case 'charge_tg': {
        if (this.timer > 0.25) { const a = this.aim(env); this.dashDir = [Math.cos(a), Math.sin(a) * 0.9]; this.lineLen = this.rayLen(env.map); }
        if (this.timer <= 0) { this.state = 'dash'; this.dashLeft = 300; env.sfx('charge'); }
        return;
      }
      case 'dash': {
        const v = [0, 230, 250, 275][this.phase] * dt, nx = this.x + this.dashDir[0] * v, ny = this.y + this.dashDir[1] * v;
        this.dashLeft -= v;
        if (this.blocked(env.map, nx, ny) || this.dashLeft <= 0) {
          env.sfx('thud'); env.shake(0.35);
          for (let i = 0; i < 8; i++) env.fx({ type: 'debris', x: this.x, y: this.y - 6, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 60, t: 0, dur: 0.6, c: '#6a6478' });
          if (this.phase === 3 && this.charges < 1) { this.charges++; this.state = 'charge_tg'; this.timer = 0.55; return; }
          this.charges = 0; this.state = 'stun'; this.timer = this.phase === 1 ? 1.4 : 1.0; return;
        }
        this.x = nx; this.y = ny;
        if (Math.random() < 0.5) env.fx({ type: 'trail', x: this.x, y: this.y - 26, t: 0, dur: 0.25 });
        return;
      }
      case 'stun': if (this.timer <= 0) this.recover(0.3); return;
      case 'spikes': {
        if (!this.marks.length && !this.spawned) {
          this.spawned = true; env.sfx('warn');
          const n = this.phase === 2 ? 4 : 6;
          this.marks.push({ x: p.x, y: p.y - 3, t: 0, dur: 0.95 });
          for (let i = 1; i < n; i++) { const a = i * 2.4 + this.anim, r = 22 + (i % 3) * 16; const [x, y] = this.clampArena(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8, 0.95); this.marks.push({ x, y, t: -i * 0.06, dur: 0.95 }); }
        }
        if (this.timer <= 0) { this.spawned = false; this.recover(0.6); }
        return;
      }
      case 'summon': {
        if (!this.portals.length && !this.spawned) {
          this.spawned = true; env.sfx('summon');
          for (const s of [-1, 1]) { const [x, y] = this.clampArena(this.x + s * 46, this.y + 18, 0.9); this.portals.push({ x, y, t: 0, dur: 0.9 }); }
        }
        if (this.timer <= 0) { this.spawned = false; this.recover(0.5); }
        return;
      }
      case 'spiral': {
        this.eyeGlow = 1;
        this.cool = (this.cool || 0) - dt;
        if (this.cool <= 0) { this.cool = 0.12; this.ang += 0.36; for (const o of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) this.fire(this.ang + o, 70, env); env.sfx('shoot', {}, 0.1); }
        if (this.timer <= 0) this.recover(0.7);
        return;
      }
      case 'recover': if (this.timer <= 0) { this.state = 'idle'; this.timer = [0, 1.25, 0.95, 0.7][this.phase]; } return;
    }
  }
  begin(a, env) {
    this.state = a;
    if (a === 'volley' || a === 'ring') { this.timer = 0.75; env.sfx('warn'); }
    else if (a === 'charge') { this.state = 'charge_tg'; this.timer = this.phase === 1 ? 0.95 : 0.8; this.lineLen = this.rayLen(env.map); env.sfx('warn'); }
    else if (a === 'spikes') this.timer = 1.6;
    else if (a === 'summon') this.timer = 1.4;
    else if (a === 'spiral') { this.timer = 2.6; this.ang = this.aim(env); }
  }
  recover(t) { this.state = 'recover'; this.timer = t; }
  blocked(map, x, y) {
    const A = this.arena, dx = (x - A.cx) / A.rx, dy = (y - A.cy) / A.ry;
    if (dx * dx + dy * dy > 0.86) return true;
    return map.isSolid(Math.floor(x / 16), Math.floor((y - 4) / 16));
  }
  rayLen(map) { let l = 0; while (l < 300 && !this.blocked(map, this.x + this.dashDir[0] * l, this.y + this.dashDir[1] * l)) l += 6; return l; }

  updateHazards(dt, env) {
    const p = env.player, pcx = p.x, pcy = p.y - 7;
    const sw = env.swordBox();
    for (const s of this.projs) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (env.map.isSolid(Math.floor(s.x / 16), Math.floor((s.y + 8) / 16))) s.life = 0;
      if (sw && s.x > sw.x && s.x < sw.x + sw.w && s.y > sw.y && s.y < sw.y + sw.h) { s.life = 0; env.fx({ type: 'spark', x: s.x, y: s.y, t: 0, dur: 0.2 }); env.sfx('clink', {}, 0.05); continue; }
      if (s.life > 0 && Math.hypot(s.x - pcx, s.y - pcy) < 6.5 && env.canHurt()) { s.life = 0; env.hurt(1, s); }
    }
    this.projs = this.projs.filter((s) => s.life > 0);
    for (const m of this.marks) {
      const was = m.t < m.dur; m.t += dt;
      if (was && m.t >= m.dur) { env.sfx('spike', {}, 0.05); this.spikes.push({ x: m.x, y: m.y, t: 0 }); if (Math.hypot(p.x - m.x, (p.y - 3 - m.y) * 1.25) < 13 && env.canHurt()) env.hurt(2, m); }
    }
    this.marks = this.marks.filter((m) => m.t < m.dur);
    for (const s of this.spikes) s.t += dt;
    this.spikes = this.spikes.filter((s) => s.t < 0.45);
    for (const q of this.portals) { const was = q.t < q.dur; q.t += dt; if (was && q.t >= q.dur) env.spawn('schatten', q.x, q.y); }
    this.portals = this.portals.filter((q) => q.t < q.dur);
    // Kontakt
    if (!['sleep', 'intro', 'dying', 'transition'].includes(this.state) && env.canHurt()) {
      if (Math.abs(p.x - this.x) < 17 && p.y > this.y - 34 && p.y < this.y + 5) env.hurt(this.state === 'dash' ? 2 : 1, this);
    }
  }

  /** Bodenebene: Schatten, Warnzeichen. */
  drawGround(ctx, cam, time) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (!this.dead) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y - 2, 17 - this.bob * 0.5, 5, 0, 0, Math.PI * 2); ctx.fill(); }
    if (this.state === 'charge_tg') {
      const blink = Math.floor(time / 90) % 2;
      ctx.fillStyle = blink ? 'rgba(255,60,80,0.55)' : 'rgba(255,60,80,0.3)';
      for (let l = 18; l < this.lineLen; l += 7) ctx.fillRect(Math.round(x + this.dashDir[0] * l) - 2, Math.round(y - 4 + this.dashDir[1] * l) - 1, 4, 3);
      const ex = x + this.dashDir[0] * this.lineLen, ey = y - 4 + this.dashDir[1] * this.lineLen;
      ctx.fillStyle = 'rgba(255,90,90,0.8)'; ctx.fillRect(Math.round(ex) - 3, Math.round(ey) - 3, 6, 6);
    }
    for (const m of this.marks) {
      if (m.t < 0) continue;
      const k = m.t / m.dur, mx = Math.round(m.x - cam.x), my = Math.round(m.y - cam.y);
      ctx.fillStyle = `rgba(255,50,90,${0.15 + k * 0.3})`; ctx.beginPath(); ctx.ellipse(mx, my, 12 * k + 1, 9 * k + 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,120,150,${0.6 + 0.4 * (Math.floor(time / 80) % 2)})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(mx + 0.5, my + 0.5, 12, 9, 0, 0, Math.PI * 2); ctx.stroke();
    }
    for (const q of this.portals) {
      const k = q.t / q.dur, qx = Math.round(q.x - cam.x), qy = Math.round(q.y - cam.y);
      for (let i = 0; i < 10; i++) { const a = i * 0.63 + time / 150, r = 4 + k * 9; ctx.fillStyle = i % 2 ? '#b066ff' : '#ff5ad1'; ctx.fillRect(Math.round(qx + Math.cos(a) * r), Math.round(qy + Math.sin(a) * r * 0.6), 2, 1); }
    }
  }
  draw(ctx, cam, time = 0) {
    if (this.dead) return;
    for (const s of this.spikes) {
      const k = Math.min(1, s.t / 0.08), h = Math.round(this.art.spike.height * k);
      ctx.drawImage(this.art.spike, 0, 0, this.art.spike.width, h, Math.round(s.x - cam.x - 6), Math.round(s.y - cam.y - h + 3), this.art.spike.width, h);
    }
    const bx = Math.round(this.x - cam.x - 25), by = Math.round(this.y - cam.y - 58 - this.bob);
    const shakeX = this.state === 'charge_tg' || this.state === 'dying' || this.state === 'transition' ? Math.round((Math.random() - 0.5) * 3) : 0;
    const fr = this.art.body[this.phase][Math.floor(this.anim * 3) % 2];
    const flashOn = this.flash > 0 || (this.state === 'dying' && Math.floor(this.timer * 14) % 2 === 0) || (this.state === 'transition' && Math.floor(this.timer * 10) % 2 === 0);
    // Orbit-Splitter hinter dem Körper
    const nOrb = [0, 4, 3, 6][this.phase], orbR = this.phase === 3 ? 30 : 27, sp = this.phase === 3 ? 2.2 : 1.2;
    const orbs = [];
    for (let i = 0; i < nOrb; i++) { const a = this.anim * sp + (i / nOrb) * Math.PI * 2; orbs.push([Math.cos(a) * orbR, Math.sin(a) * orbR * 0.42, Math.sin(a)]); }
    for (const [ox, oy, z] of orbs) if (z < 0) ctx.drawImage(this.art.orb, Math.round(bx + 25 + ox - 3), Math.round(by + 30 + oy - 5));
    ctx.drawImage(flashOn ? this.art.flash[this.phase] : fr, bx + shakeX, by);
    if (!flashOn) this.drawEye(ctx, bx + shakeX + 25, by + 25, cam);
    for (const [ox, oy, z] of orbs) if (z >= 0) ctx.drawImage(this.art.orb, Math.round(bx + 25 + ox - 3), Math.round(by + 30 + oy - 5));
  }
  drawEye(ctx, ex, ey, cam) {
    if (this.state === 'sleep' && this.eyeOpen <= 0) { ctx.fillStyle = '#e080c0'; ctx.fillRect(ex - 4, ey, 8, 1); return; }
    const p = this.target || { x: this.x, y: this.y + 40 };
    const dx = Math.max(-2, Math.min(2, Math.round((p.x - this.x) / 30))), dy = Math.max(-1, Math.min(1, Math.round((p.y - this.y + 20) / 50)));
    const blink = this.state !== 'dying' && Math.floor(this.anim * 10) % 47 === 0;
    ctx.fillStyle = this.eyeGlow > 0.3 ? '#ffd0e8' : '#ffe9a8';
    if (blink) { ctx.fillRect(ex - 5, ey, 10, 1); return; }
    ctx.fillRect(ex - 4, ey - 2, 8, 5); ctx.fillRect(ex - 5, ey - 1, 10, 3);
    ctx.fillStyle = this.phase === 3 || this.eyeGlow > 0.3 ? '#e0103a' : '#5a1030';
    ctx.fillRect(ex - 1 + dx, ey - 2 + dy, 3, 5);
    ctx.fillStyle = '#12060c'; ctx.fillRect(ex + dx, ey - 1 + dy, 1, 3);
    if (this.eyeGlow > 0.3) { ctx.fillStyle = 'rgba(255,80,160,0.35)'; ctx.fillRect(ex - 7, ey - 4, 14, 9); }
  }
  /** Projektile über allem. */
  drawAir(ctx, cam) {
    for (const s of this.projs) ctx.drawImage(this.art.shard, Math.round(s.x - cam.x - 3), Math.round(s.y - cam.y - 3));
  }
}
