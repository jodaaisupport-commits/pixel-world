// Endgegner der zweiten Geschichte: "Thalassa, die Herrin der Gezeiten" (Gezeitentempel).
// Taucht zwischen fünf Becken ab und auf (Blasen kündigen sie an), schleudert Wasserkugeln, die man mit dem
// Schwert zurückschlagen kann (Treffer = sie ist benommen und verwundbar), flutet eine Hälfte der Halle,
// lässt in Phase 2 Tentakel aus dem Boden schießen und zieht dich in Phase 3 mit einem Strudel heran.
import { Pix } from './pix.js';
import { RAISED } from './map.js';

export const TH_NAME = 'Thalassa';
export const TH_TITLE = 'Die Herrin der Gezeiten';
const OUT = '#06141c';

function bodyPix(frame, phase) {
  const p = new Pix(48, 56), cx = 24;
  const skin = phase === 3 ? ['#2a6a8a', '#3a8aa8', '#5ab0c8'] : ['#2a7a7a', '#3a9a94', '#5ac0b0'];
  const hair = phase === 3 ? ['#5a1a6a', '#8a2a9a', '#c05ad0'] : ['#3a2a7a', '#5a3aa8', '#8a6ad8'];
  // Haar (fließt nach außen)
  for (let y = 4; y < 52; y++) {
    const w = 10 + Math.sin(y / 5 + frame * 1.6) * 3 + (y > 20 ? (y - 20) * 0.35 : 0);
    for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
      if (Math.abs(x - cx) < 7 && y > 16) continue;
      const k = (Math.floor((x + y + frame * 2) / 3) % 3);
      p.set(x, y, hair[k]);
    }
  }
  // Oberkörper
  for (let y = 18; y < 52; y++) { const w = y < 26 ? 5 + (y - 18) * 0.4 : 8 - (y - 26) * 0.05; for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) p.set(x, y, x < cx - w * 0.4 ? skin[2] : x > cx + w * 0.5 ? skin[0] : skin[1]); }
  // Schuppen-Gewand
  for (let y = 30; y < 52; y++) for (let x = cx - 8; x <= cx + 8; x++) if ((x + (y % 2)) % 3 === 0) p.set(x, y, '#1f5a6a');
  // Arme (erhoben)
  for (let k = 0; k < 12; k++) { p.set(cx - 8 - k * 0.7, 28 - k * (frame ? 1 : 0.8), skin[1]); p.set(cx - 9 - k * 0.7, 28 - k * (frame ? 1 : 0.8), skin[0]); p.set(cx + 8 + k * 0.7, 28 - k * (frame ? 0.8 : 1), skin[1]); p.set(cx + 9 + k * 0.7, 28 - k * (frame ? 0.8 : 1), skin[0]); }
  // Kopf
  p.ellipse(cx, 12, 6, 7, skin[1]); p.ellipse(cx - 2, 10, 3, 4, skin[2]);
  p.set(cx - 3, 12, '#e0fff8'); p.set(cx + 3, 12, '#e0fff8'); p.set(cx - 3, 13, '#7af0d8'); p.set(cx + 3, 13, '#7af0d8');
  p.hline(cx - 1, cx + 1, 16, '#1a3a4a');
  // Korallenkrone
  for (const [x, h] of [[-6, 4], [-3, 6], [0, 8], [3, 6], [6, 4]]) for (let k = 0; k < h; k++) p.set(cx + x, 5 - k, k === h - 1 ? '#ffb0c0' : '#e05a7a');
  // Perle am Hals
  p.ellipse(cx, 21, 2, 2, '#f0e8ff'); p.set(cx - 1, 20, '#ffffff');
  return p.outlined(OUT);
}
function stunnedPix() {
  const p = new Pix(56, 30), cx = 28;
  for (let x = 4; x < 52; x++) for (let y = 10; y < 26; y++) { const d = Math.abs(y - 18) - (x < 14 ? (14 - x) * 0.3 : 0); if (d < 6 - Math.abs(x - 28) * 0.05) p.set(x, y, (x + y) % 3 ? '#5a3aa8' : '#3a2a7a'); }
  for (let x = 14; x < 46; x++) for (let y = 14; y < 23; y++) p.set(x, y, y < 16 ? '#5ac0b0' : y > 20 ? '#2a7a7a' : '#3a9a94');
  p.ellipse(10, 17, 6, 6, '#3a9a94');
  for (const [x, y] of [[8, 15], [12, 15]]) { p.set(x - 1, y - 1, '#e0fff8'); p.set(x + 1, y + 1, '#e0fff8'); p.set(x + 1, y - 1, '#e0fff8'); p.set(x - 1, y + 1, '#e0fff8'); }
  for (const [x, h] of [[4, 3], [6, 5], [8, 6]]) for (let k = 0; k < h; k++) p.set(x - k * 0.5, 12 - k, '#e05a7a');
  // Fischschwanz
  for (let k = 0; k < 8; k++) { p.set(46 + k, 18 - k * 0.6, '#2a7a7a'); p.set(46 + k, 18 + k * 0.6, '#2a7a7a'); }
  return p.outlined(OUT);
}
const white = (c) => { const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); return w; };
function tentaclePix(f) {
  const p = new Pix(14, 34);
  for (let y = 0; y < 32; y++) { const w = 1.5 + y * 0.12, x0 = 7 + Math.sin(y / 5 + f * 1.4) * (3 - y * 0.08); for (let x = Math.round(x0 - w); x <= Math.round(x0 + w); x++) p.set(x, y, x < x0 ? '#8a3aa8' : '#5a2a7a'); if (y % 4 === 2) p.set(x0 + w - 1, y, '#f0b0ff'); }
  return p.outlined(OUT);
}
export function buildThalassaArt() {
  const body = {}; const flash = {};
  for (const ph of [1, 2, 3]) { body[ph] = [0, 1].map((f) => bodyPix(f, ph).canvas()); flash[ph] = body[ph].map(white); }
  const st = stunnedPix().canvas();
  return { body, flash, stunned: st, stunnedW: white(st), tentacle: [0, 1].map((f) => tentaclePix(f).canvas()) };
}

export class Thalassa {
  constructor(art, arena, pools, TS = 16) {
    this.art = art; this.arena = arena; this.TS = TS;
    this.pools = pools.map(([x, y], i) => ({ x: x * TS + (i === 0 ? 0 : 8), y: y * TS + (i === 0 ? 8 : 2) }));
    this.pool = 0; const p0 = this.pools[0]; this.x = p0.x; this.y = p0.y;
    this.maxHp = 30; this.hp = 30; this.ghost = 30; this.phase = 1; this.phases = 3;
    this.transitionText = 'Die Gezeiten wenden sich!';
    this.state = 'sleep'; this.timer = 0; this.flash = 0; this.inv = 0; this.anim = 0; this.dead = false; this.uid = 'boss';
    this.orbs = []; this.tentacles = []; this.flood = null; this.whirl = 0; this.order = 0; this.stunDmg = 0; this.rise = 1;
    this.bubbles = [];
  }
  get sortY() { return this.y + (this.state === 'stunned' ? 24 : 6); }
  get box() { return this.state === 'stunned' ? { x: this.x - 26, y: this.y + 4, w: 52, h: 26 } : { x: this.x - 14, y: this.y - 40, w: 28, h: 44 }; }
  get visible() { return !['under', 'emerge_tg'].includes(this.state) && !this.dead; }
  get vulnerable() { return this.state === 'stunned' && this.inv <= 0; }
  wake() { this.state = 'surface'; this.timer = 1.2; this.rise = 1; }
  hurt(dmg, env) {
    if (this.dead || this.state === 'dying' || !this.visible) return null;
    if (!this.vulnerable) { env.sfx('clink'); env.fx({ type: 'spark', x: this.x, y: this.y - 20, t: 0, dur: 0.2 }); return 'block'; }
    this.hp = Math.max(0, this.hp - dmg); this.flash = 0.14; this.inv = 0.22; this.stunDmg += dmg; env.sfx('hit');
    if (this.hp <= 0) { this.state = 'dying'; this.timer = 3.0; this.orbs = []; this.tentacles = []; this.flood = null; this.whirl = 0; env.sfx('roar'); env.onDying(); return 'hit'; }
    const next = this.phase === 1 && this.hp <= this.maxHp * 2 / 3 ? 2 : this.phase === 2 && this.hp <= this.maxHp / 3 ? 3 : 0;
    if (next) {
      this.phase = next; this.state = 'transition'; this.timer = 2.0; this.inv = 2.0; this.orbs = []; this.flood = null; this.whirl = 0;
      this.y = this.pools[this.pool].y; env.sfx('phase'); env.sfx('tide'); env.shake(0.8); env.onPhase(next);
      env.fx({ type: 'shock', x: this.x, y: this.y - 10, t: 0, dur: 0.8, c: '120,230,255' });
      const p = env.player; if (Math.hypot(p.x - this.x, p.y - this.y) < 70) p.knockback(this.x, this.y, 260);
    } else if (this.stunDmg >= 6) this.endStun(env);
    return 'hit';
  }
  endStun(env) { this.state = 'submerge'; this.timer = 0.6; this.y = this.pools[this.pool].y; env.sfx('splash'); }
  choose(env) {
    const pools = {
      1: ['orb', 'orb', 'tide'],
      2: ['orb', 'tentacles', 'orb', 'tide'],
      3: ['whirl', 'orb', 'tentacles', 'tide'],
    }[this.phase];
    return pools[this.order++ % pools.length];
  }
  fireOrb(env, spread = 0) {
    const p = env.player, sx = this.x, sy = this.y - 30;
    const a = Math.atan2(p.y - 8 - sy, p.x - sx) + spread, sp = [0, 78, 92, 108][this.phase];
    this.orbs.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 6, refl: false, r: 5 });
    env.sfx('shoot'); env.sfx('bubble', {}, 0.1);
  }
  update(dt, env) {
    if (this.dead) return;
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.inv = Math.max(0, this.inv - dt); this.timer -= dt;
    this.ghost += (this.hp - this.ghost) * Math.min(1, dt * 3);
    const p = env.player;
    this.updateHazards(dt, env);
    switch (this.state) {
      case 'sleep': case 'intro': return;
      case 'dying':
        if (Math.random() < dt * 9) { env.fx({ type: 'boom', x: this.x + (Math.random() - 0.5) * 40, y: this.y - 24 + (Math.random() - 0.5) * 30, t: 0, dur: 0.4, c2: 1 }); env.sfx('splash', {}, 0.15); }
        env.shake(0.1);
        if (this.timer <= 0) { this.dead = true; env.onDefeated(); }
        return;
      case 'transition': if (this.timer <= 0) { this.state = 'submerge'; this.timer = 0.6; env.sfx('splash'); } return;
      case 'surface':
        this.rise = Math.min(1, this.rise + dt * 3);
        if (this.timer <= 0) this.begin(this.choose(env), env);
        break;
      case 'orb_tg':
        if (this.timer <= 0) {
          this.fireOrb(env);
          if (this.phase === 3) { this.fireOrb(env, 0.35); this.fireOrb(env, -0.35); }
          this.shots = (this.shots || 1) - 1;
          if (this.shots > 0) { this.timer = 0.75; } else { this.state = 'wait'; this.timer = 2.2; }
        }
        break;
      case 'wait': if (this.timer <= 0) { this.state = 'submerge'; this.timer = 0.6; env.sfx('splash'); } break;
      case 'tide_tg':
        if (Math.random() < dt * 4) env.sfx('bubble', {}, 0.2);
        if (this.timer <= 0) {
          this.flood.on = true; this.flood.t = 0.9; env.sfx('tide'); env.shake(0.6);
          if (this.inFlood(p) && env.canHurt()) { env.hurt(2, { x: p.x + (this.flood.side === 'left' ? -40 : this.flood.side === 'right' ? 40 : 0), y: p.y + (this.flood.side === 'top' ? -40 : this.flood.side === 'bottom' ? 40 : 0) }); }
          this.state = 'wait'; this.timer = 1.2;
        }
        break;
      case 'tent_tg':
        if (this.timer <= 0) { this.state = 'wait'; this.timer = 2.0; }
        break;
      case 'whirl':
        this.whirl = Math.min(1, this.whirl + dt * 2);
        this.cool = (this.cool || 0) - dt;
        if (this.cool <= 0) { this.cool = 1.1; this.fireOrb(env); }
        if (this.timer <= 0) { this.state = 'wait'; this.timer = 1.0; }
        break;
      case 'stunned': if (this.timer <= 0) this.endStun(env); break;
      case 'submerge':
        this.rise = Math.max(0, this.timer / 0.6); this.whirl = Math.max(0, this.whirl - dt * 2);
        if (this.timer <= 0) {
          let n; do { n = 1 + Math.floor(Math.random() * 4); } while (n === this.pool && Math.random() < 0.9);
          if (this.phase === 1 && this.order % 3 === 0) n = 0;
          this.from = { x: this.x, y: this.y }; this.pool = n; this.state = 'under'; this.timer = 1.0;
        }
        break;
      case 'under': {
        const k = 1 - Math.max(0, this.timer) / 1.0, to = this.pools[this.pool];
        this.x = this.from.x + (to.x - this.from.x) * k; this.y = this.from.y + (to.y - this.from.y) * k;
        if (Math.random() < dt * 20) this.bubbles.push({ x: this.x + (Math.random() - 0.5) * 10, y: this.y + (Math.random() - 0.5) * 6, t: 0 });
        if (this.timer <= 0) { this.state = 'emerge_tg'; this.timer = 0.75; env.sfx('bubble'); }
        break;
      }
      case 'emerge_tg':
        if (Math.random() < dt * 30) this.bubbles.push({ x: this.x + (Math.random() - 0.5) * 22, y: this.y + (Math.random() - 0.5) * 10, t: 0 });
        if (this.timer <= 0) { this.state = 'surface'; this.timer = 0.6; this.rise = 0; env.sfx('splash'); env.fx({ type: 'shock', x: this.x, y: this.y, t: 0, dur: 0.4, c: '120,230,255' }); }
        break;
    }
    if (this.visible && this.state !== 'stunned' && this.state !== 'dying' && this.state !== 'transition' && env.canHurt()) {
      if (Math.abs(p.x - this.x) < 14 && p.y > this.y - 10 && p.y < this.y + 10) env.hurt(1, this);
    }
  }
  begin(a, env) {
    const A = this.arena, p = env.player;
    if (a === 'orb') { this.state = 'orb_tg'; this.timer = 0.8; this.shots = this.phase === 1 ? 1 : 2; env.sfx('warn'); }
    else if (a === 'tide') {
      const sides = Math.abs(p.x - A.cx) > Math.abs(p.y - A.cy) * 1.4 ? ['left', 'right'] : ['top', 'bottom'];
      const side = sides[(p.x < A.cx && sides[0] === 'left') || (p.y < A.cy && sides[0] === 'top') ? 0 : 1];
      this.flood = { side, on: false, t: 0, tg: 1.5 }; this.state = 'tide_tg'; this.timer = this.phase === 3 ? 1.2 : 1.5; env.sfx('warn'); env.sfx('wave');
    } else if (a === 'tentacles') {
      const n = this.phase === 3 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2, r = i === 0 ? 0 : 20 + Math.random() * 40;
        let x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r * 0.7;
        if (!this.floorAt(env.map, x, y)) continue;
        this.tentacles.push({ x, y, t: -i * 0.25, dur: 0.85, up: 0, hp: 2, life: 3.2, hit: false, f: Math.random() * 3 });
      }
      this.state = 'tent_tg'; this.timer = 0.9; env.sfx('summon'); env.sfx('bubble');
    } else if (a === 'whirl') { this.state = 'whirl'; this.timer = 3.6; this.cool = 0.6; env.sfx('tide'); }
  }
  floorAt(map, x, y) { const tx = Math.floor(x / this.TS), ty = Math.floor((y - 2) / this.TS); return !map.isSolid(tx, ty); }
  inFlood(p) {
    const f = this.flood, A = this.arena; if (!f) return false;
    if (f.side === 'left') return p.x < A.cx - 6;
    if (f.side === 'right') return p.x > A.cx + 6;
    if (f.side === 'top') return p.y < A.cy - 4;
    return p.y > A.cy + 4;
  }
  updateHazards(dt, env) {
    const p = env.player, sw = env.swordBox(), TS = this.TS;
    for (const o of this.orbs) {
      o.x += o.vx * dt; o.y += o.vy * dt; o.life -= dt;
      const tx = Math.floor(o.x / TS), ty = Math.floor((o.y + 10) / TS);
      if (!env.map.inb(tx, ty) || RAISED.has(env.map.get(tx, ty))) { o.life = 0; env.fx({ type: 'splash', x: o.x, y: o.y, t: 0, dur: 0.35 }); env.sfx('splash', {}, 0.1); continue; }
      if (!o.refl && sw && o.x > sw.x - 3 && o.x < sw.x + sw.w + 3 && o.y > sw.y - 3 && o.y < sw.y + sw.h + 3) {
        // Zurückgeschlagen! Fliegt zurück zu Thalassa.
        const dx = this.x - o.x, dy = this.y - 26 - o.y, l = Math.hypot(dx, dy) || 1, sp = Math.hypot(o.vx, o.vy) * 1.5 + 30;
        o.vx = dx / l * sp; o.vy = dy / l * sp; o.refl = true; o.life = 4;
        env.sfx('clink'); env.sfx('splash', {}, 0.05); env.fx({ type: 'spark', x: o.x, y: o.y, t: 0, dur: 0.25 }); env.shake(0.1);
        continue;
      }
      if (o.refl) {
        if (this.visible && this.state !== 'stunned' && this.state !== 'dying' && this.state !== 'transition' && Math.hypot(o.x - this.x, o.y - (this.y - 24)) < 18) {
          o.life = 0; this.state = 'stunned'; this.timer = 3.0; this.stunDmg = 0; this.orbs = this.orbs.filter((k) => k.refl && k !== o);
          this.y = this.pools[this.pool].y + (this.pool === 0 ? 18 : 16); this.whirl = 0;
          env.sfx('bonk'); env.sfx('splash'); env.shake(0.5); env.fx({ type: 'splash', x: this.x, y: this.y, t: 0, dur: 0.5 });
          env.onStun && env.onStun();
          return;
        }
        continue;
      }
      if (o.life > 0 && Math.hypot(o.x - p.x, o.y - (p.y - 8)) < 8 && env.canHurt()) { o.life = 0; env.hurt(1, o); env.sfx('splash'); env.fx({ type: 'splash', x: o.x, y: o.y, t: 0, dur: 0.35 }); }
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);
    for (const t of this.tentacles) {
      const was = t.t < t.dur; t.t += dt; t.f += dt * 6;
      if (t.t < 0) continue;
      if (was && t.t >= t.dur) { t.up = 1; env.sfx('spike', {}, 0.05); env.sfx('splash', {}, 0.08); if (Math.hypot(p.x - t.x, (p.y - t.y) * 1.3) < 12 && env.canHurt()) env.hurt(1, t); }
      if (t.t >= t.dur) {
        t.life -= dt;
        if (sw && t.x > sw.x - 4 && t.x < sw.x + sw.w + 4 && t.y - 16 > sw.y - 18 && t.y - 16 < sw.y + sw.h + 18 && !t.cut) { t.hp--; t.cut = 0.3; env.sfx('hit', {}, 0.05); env.fx({ type: 'spark', x: t.x, y: t.y - 14, t: 0, dur: 0.2 }); if (t.hp <= 0) { t.life = 0; env.fx({ type: 'poof', x: t.x, y: t.y - 8, t: 0, dur: 0.45 }); } }
        if (t.cut) { t.cut -= dt; if (t.cut <= 0) t.cut = 0; }
        if (t.life > 0 && Math.abs(p.x - t.x) < 7 && Math.abs(p.y - t.y) < 6 && env.canHurt()) env.hurt(1, t);
      }
    }
    this.tentacles = this.tentacles.filter((t) => t.life > 0);
    if (this.flood && this.flood.on) { this.flood.t -= dt; if (this.flood.t <= 0) this.flood = null; }
    // Strudel: zieht die Spielfigur zum Becken
    if (this.whirl > 0 && this.state === 'whirl' && !env.scripted()) {
      const dx = this.x - p.x, dy = this.y + 16 - p.y, l = Math.hypot(dx, dy) || 1, f = 34 * this.whirl * dt;
      if (l > 20) { p.moveAxis(env.map, dx / l * f, 0); p.moveAxis(env.map, 0, dy / l * f); }
      if (Math.random() < dt * 3) env.sfx('wind', {}, 0.8);
    }
    for (const b of this.bubbles) b.t += dt;
    this.bubbles = this.bubbles.filter((b) => b.t < 0.6);
  }
  lights() {
    const l = [];
    if (this.visible) l.push({ x: this.x, y: this.y - 24, r: 70, color: this.phase === 3 ? 'rgba(200,90,255,0.45)' : 'rgba(90,230,230,0.45)', flicker: 0.5 });
    for (const o of this.orbs) l.push({ x: o.x, y: o.y, r: 16, color: o.refl ? 'rgba(255,255,200,0.6)' : 'rgba(90,200,255,0.6)', flicker: 0 });
    return l;
  }
  drawGround(ctx, cam, time) {
    if (this.dead) return;
    const A = this.arena;
    // Flut (Vorwarnung + Welle)
    if (this.flood) {
      const f = this.flood, k = f.on ? 0.55 : 0.12 + 0.2 * (1 - Math.max(0, this.timer) / 1.5) + 0.08 * (Math.floor(time / 120) % 2);
      ctx.fillStyle = `rgba(40,140,220,${k})`;
      const x0 = A.cx - A.rx - cam.x, y0 = A.cy - A.ry - cam.y, w = A.rx * 2, h = A.ry * 2;
      if (f.side === 'left') ctx.fillRect(Math.round(x0), Math.round(y0), Math.round(w / 2), Math.round(h));
      else if (f.side === 'right') ctx.fillRect(Math.round(x0 + w / 2), Math.round(y0), Math.round(w / 2), Math.round(h));
      else if (f.side === 'top') ctx.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h / 2));
      else ctx.fillRect(Math.round(x0), Math.round(y0 + h / 2), Math.round(w), Math.round(h / 2));
      ctx.fillStyle = `rgba(200,240,255,${f.on ? 0.6 : 0.3})`;
      for (let i = 0; i < 24; i++) { const xx = (i * 37 + time / 20) % w, yy = (i * 53) % h; if ((f.side === 'left' && xx > w / 2) || (f.side === 'right' && xx < w / 2) || (f.side === 'top' && yy > h / 2) || (f.side === 'bottom' && yy < h / 2)) continue; ctx.fillRect(Math.round(x0 + xx), Math.round(y0 + yy), 3, 1); }
    }
    // Wasserring/Blasen
    for (const b of this.bubbles) { ctx.fillStyle = `rgba(220,250,255,${1 - b.t / 0.6})`; ctx.fillRect(Math.round(b.x - cam.x), Math.round(b.y - cam.y - b.t * 10), 2, 2); }
    if (this.state === 'emerge_tg') { ctx.strokeStyle = `rgba(200,250,255,${0.5 + 0.4 * (Math.floor(time / 90) % 2)})`; ctx.beginPath(); ctx.ellipse(Math.round(this.x - cam.x) + 0.5, Math.round(this.y - cam.y) + 0.5, 14, 6, 0, 0, Math.PI * 2); ctx.stroke(); }
    if (this.whirl > 0) {
      const x = this.x - cam.x, y = this.y + 4 - cam.y;
      for (let i = 0; i < 40; i++) { const a = i * 0.5 + time / 200, r = 6 + (i % 10) * 7 * this.whirl; ctx.fillStyle = i % 2 ? 'rgba(160,230,255,0.6)' : 'rgba(90,160,220,0.5)'; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.55), 2, 1); }
    }
    for (const t of this.tentacles) {
      if (t.t < 0 || t.t >= t.dur) continue;
      const k = t.t / t.dur, x = Math.round(t.x - cam.x), y = Math.round(t.y - cam.y);
      ctx.fillStyle = `rgba(160,60,200,${0.2 + k * 0.4})`; ctx.beginPath(); ctx.ellipse(x, y, 9 * k + 2, 5 * k + 1, 0, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(230,240,255,0.8)'; ctx.fillRect(x - 5 + Math.round(Math.random() * 10), y - 3 + Math.round(Math.random() * 4), 2, 2); }
    }
    if (this.visible) { ctx.strokeStyle = 'rgba(200,250,255,0.55)'; ctx.beginPath(); ctx.ellipse(Math.round(this.x - cam.x) + 0.5, Math.round(this.y - cam.y) + 0.5, 12 + Math.sin(time / 200) * 2, 4, 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  draw(ctx, cam, time = 0) {
    if (this.dead) return;
    for (const t of this.tentacles) {
      if (t.t < t.dur) continue;
      const img = this.art.tentacle[Math.floor(t.f) % 2], up = Math.min(1, (t.t - t.dur) * 8), h = Math.round(img.height * up);
      ctx.drawImage(img, 0, 0, img.width, h, Math.round(t.x - cam.x - img.width / 2), Math.round(t.y - cam.y - h + 2), img.width, h);
    }
    if (!this.visible) return;
    const flashOn = this.flash > 0 || (this.state === 'dying' && Math.floor(this.timer * 14) % 2 === 0) || (this.state === 'transition' && Math.floor(this.timer * 10) % 2 === 0);
    if (this.state === 'stunned') {
      const img = flashOn ? this.art.stunnedW : this.art.stunned;
      ctx.drawImage(img, Math.round(this.x - cam.x - img.width / 2), Math.round(this.y - cam.y));
      ctx.fillStyle = '#ffe88a'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(this.x - cam.x - 18 + Math.cos(this.anim * 5 + i * 1.6) * 10), Math.round(this.y - cam.y + 4 + Math.sin(this.anim * 5 + i * 1.6) * 3), 2, 2);
      return;
    }
    const f = Math.floor(this.anim * 3) % 2, img = flashOn ? this.art.flash[this.phase][f] : this.art.body[this.phase][f];
    const vis = Math.round(img.height * Math.max(0.05, this.rise)) - 4;
    const shake = this.state === 'transition' || this.state === 'dying' ? Math.round((Math.random() - 0.5) * 3) : 0;
    const bob = Math.round(Math.sin(this.anim * 2) * 1.5);
    ctx.drawImage(img, 0, 0, img.width, vis, Math.round(this.x - cam.x - img.width / 2) + shake, Math.round(this.y - cam.y - vis + 2) + bob, img.width, vis);
    if (this.state === 'orb_tg' || this.state === 'whirl') {
      const r = 3 + (1 - Math.max(0, this.timer) / 0.8) * 4 + Math.sin(time / 60);
      ctx.fillStyle = 'rgba(160,230,255,0.85)'; ctx.beginPath(); ctx.arc(Math.round(this.x - cam.x), Math.round(this.y - cam.y - 34 + bob), Math.max(2, r), 0, 7); ctx.fill();
    }
  }
  drawAir(ctx, cam) {
    for (const o of this.orbs) {
      const x = Math.round(o.x - cam.x), y = Math.round(o.y - cam.y);
      ctx.fillStyle = o.refl ? '#fff6c0' : '#3a9ad8'; ctx.beginPath(); ctx.arc(x, y, o.r, 0, 7); ctx.fill();
      ctx.fillStyle = o.refl ? '#ffffff' : '#a8e8ff'; ctx.beginPath(); ctx.arc(x - 1, y - 1, o.r - 2.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 2, y - 3, 2, 1);
    }
  }
}
