// Mini-Boss "Khepran, der Skarabäus-Koloss" (Sonnentempel): gräbt sich ein und bricht mit Schockwelle
// hervor, stürmt auf dich zu und rammt sich an den Säulen fest. Verwundbar nur, wenn er benommen ist.
import { Pix } from './pix.js';
import { hash2 } from './noise.js';

export const KH_NAME = 'Khepran';
export const KH_TITLE = 'Der Skarabäus-Koloss';
const OUT = '#1e1206';
const SH = ['#5a3a14', '#8a5a1e', '#c8962e', '#e8b84a', '#fff1a6'];
const LAPIS = ['#1a2a5a', '#2f4a8a', '#4a7ac8'];

function beetle(frame, flipped) {
  const p = new Pix(52, 44), cx = 26;
  // Beine
  const legs = [[10, 22], [8, 30], [10, 37], [42, 22], [44, 30], [42, 37]];
  legs.forEach(([x, y], i) => {
    const s = x < cx ? -1 : 1, o = ((i + frame) % 2) * 2 - 1;
    for (let k = 0; k < 6; k++) p.set(x + s * k * 0.8, y + o * (k > 3 ? 1 : 0) + (flipped ? -k * 0.6 : 0), k % 2 ? SH[0] : '#3a240c');
  });
  if (flipped) { // auf dem Rücken: Bauch nach oben, zappelnde Beine
    p.ellipse(cx, 28, 17, 12, '#6a4a2a'); p.ellipse(cx, 27, 14, 9, '#8a6a3a');
    for (let y = 20; y < 38; y += 4) p.hline(cx - 10, cx + 10, y, '#5a3a1a');
    p.ellipse(cx, 16, 7, 5, '#5a3a14');
    return p.outlined(OUT);
  }
  // Panzer (zwei Flügeldecken mit Goldrand)
  for (let y = 6; y < 42; y++) for (let x = 6; x < 46; x++) {
    const dx = (x + 0.5 - cx) / 18, dy = (y + 0.5 - 25) / 16;
    const r = dx * dx + dy * dy;
    if (r > 1) continue;
    const l = -(dx * 0.5 + dy * 0.85) + (hash2(x, y, 11) - 0.5) * 0.15;
    let c = SH[l > 0.55 ? 4 : l > 0.1 ? 3 : l > -0.4 ? 2 : 1];
    if (r > 0.86) c = SH[1];
    if (Math.abs(x + 0.5 - cx) < 1) c = SH[0]; // Naht
    p.set(x, y, c);
  }
  // Lapis-Ornamente
  for (const s of [-1, 1]) { p.ellipse(cx + s * 8, 26, 3.5, 5, LAPIS[1]); p.ellipse(cx + s * 8, 25, 2, 3, LAPIS[2]); p.set(cx + s * 8 - 1, 23, '#ffffff'); }
  // Kopf mit Horn (vorn = unten)
  p.ellipse(cx, 40, 9, 4, '#4a2e10'); p.ellipse(cx, 39, 7, 3, '#6a4416');
  for (let k = 0; k < 7; k++) { p.set(cx, 36 - k, k > 4 ? SH[4] : SH[3]); p.set(cx - 1, 37 - k, SH[1]); }
  p.set(cx - 5, 39, frame ? '#ff6a4a' : '#ff3a2a'); p.set(cx + 5, 39, frame ? '#ff6a4a' : '#ff3a2a');
  // Sonnenscheibe auf dem Rücken
  p.ellipse(cx, 13, 5, 3.5, frame ? '#fff1a6' : '#ffd23f');
  return p.outlined(OUT);
}
const white = (c) => { const w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); return w; };

export function buildKhepranArt() {
  const walk = [0, 1].map((f) => beetle(f, false).canvas());
  const flip = [0, 1].map((f) => beetle(f, true).canvas());
  return { walk, flip, white: walk.map(white), whiteFlip: flip.map(white) };
}

export class Khepran {
  constructor(x, y, art, arena, pillars) {
    this.art = art; this.arena = arena; this.pillars = pillars;
    this.x = x; this.y = y; this.maxHp = 16; this.hp = 16; this.ghost = 16; this.phase = 1; this.phases = 2;
    this.transitionText = 'Khepran gräbt sich tiefer ein!';
    this.state = 'sleep'; this.timer = 0; this.flash = 0; this.inv = 0; this.anim = 0; this.dead = false; this.uid = 'boss';
    this.order = 0; this.projs = []; this.dir = [0, 1]; this.lineLen = 0; this.dmgInStun = 0;
  }
  get sortY() { return this.y; }
  get hidden() { return this.state === 'tunnel' || this.state === 'erupt_tg'; }
  get box() { return { x: this.x - 18, y: this.y - 34, w: 36, h: 34 }; }
  get vulnerable() { return (this.state === 'stun' || this.state === 'dazed') && this.inv <= 0; }
  wake() { this.state = 'idle'; this.timer = 1.0; }
  hurt(dmg, env) {
    if (this.dead || this.state === 'dying' || this.hidden) return null;
    if (!this.vulnerable) { env.sfx('clink'); return 'block'; }
    this.hp = Math.max(0, this.hp - dmg); this.flash = 0.14; this.inv = 0.2; env.sfx('hit');
    if (this.hp <= 0) { this.state = 'dying'; this.timer = 2.4; this.projs = []; env.sfx('roar'); env.onDying(); return 'hit'; }
    if (this.phase === 1 && this.hp <= this.maxHp / 2) {
      this.phase = 2; this.state = 'transition'; this.timer = 1.8; this.inv = 1.8; this.projs = [];
      env.sfx('phase'); env.shake(0.7); env.onPhase(2);
      env.fx({ type: 'shock', x: this.x, y: this.y - 14, t: 0, dur: 0.7, c: '255,210,120' });
      const p = env.player; if (Math.hypot(p.x - this.x, p.y - this.y) < 60) p.knockback(this.x, this.y, 240);
    }
    return 'hit';
  }
  choose(env) {
    const pool = this.phase === 1 ? ['charge', 'burrow', 'charge'] : ['burrow', 'charge', env.minions() < 2 ? 'summon' : 'charge', 'burrow'];
    return pool[this.order++ % pool.length];
  }
  rayLen(map) { let l = 0; while (l < 320) { l += 6; const x = this.x + this.dir[0] * l, y = this.y - 4 + this.dir[1] * l; if (map.isSolid(Math.floor(x / 16), Math.floor(y / 16))) break; } return l; }
  solidAt(map, x, y) {
    for (const [dx, dy] of [[-12, -2], [12, -2], [-12, -10], [12, -10], [0, 0]]) if (map.isSolid(Math.floor((x + dx) / 16), Math.floor((y + dy) / 16))) return [Math.floor((x + dx) / 16), Math.floor((y + dy) / 16)];
    return null;
  }
  update(dt, env) {
    if (this.dead) return;
    this.anim += dt; this.flash = Math.max(0, this.flash - dt); this.inv = Math.max(0, this.inv - dt); this.timer -= dt;
    this.ghost += (this.hp - this.ghost) * Math.min(1, dt * 3);
    const p = env.player, dx = p.x - this.x, dy = p.y - this.y, dist = Math.hypot(dx, dy) || 1;
    // Sandgeschosse (Phase 2)
    const sw = env.swordBox();
    for (const s of this.projs) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (env.map.isSolid(Math.floor(s.x / 16), Math.floor((s.y + 6) / 16))) s.life = 0;
      if (sw && s.x > sw.x && s.x < sw.x + sw.w && s.y > sw.y && s.y < sw.y + sw.h) { s.life = 0; env.fx({ type: 'spark', x: s.x, y: s.y, t: 0, dur: 0.2 }); env.sfx('clink', {}, 0.05); continue; }
      if (s.life > 0 && Math.hypot(s.x - p.x, s.y - (p.y - 7)) < 6.5 && env.canHurt()) { s.life = 0; env.hurt(1, s); }
    }
    this.projs = this.projs.filter((s) => s.life > 0);
    switch (this.state) {
      case 'sleep': case 'intro': return;
      case 'dying':
        if (Math.random() < dt * 8) { env.fx({ type: 'boom', x: this.x + (Math.random() - 0.5) * 36, y: this.y - 16 + (Math.random() - 0.5) * 24, t: 0, dur: 0.4 }); env.sfx('explosion', {}, 0.12); }
        env.shake(0.08);
        if (this.timer <= 0) { this.dead = true; env.onDefeated(); }
        return;
      case 'transition': if (this.timer <= 0) { this.state = 'burrow'; this.timer = 0.6; env.sfx('burrow'); } return;
      case 'idle': {
        const sp = this.phase === 1 ? 24 : 34;
        this.move(env.map, dx / dist * sp * dt, dy / dist * sp * dt);
        if (this.timer <= 0) {
          const a = this.choose(env);
          if (a === 'charge') { this.state = 'charge_tg'; this.timer = this.phase === 1 ? 0.9 : 0.7; env.sfx('warn'); }
          else if (a === 'burrow') { this.state = 'burrow'; this.timer = 0.6; env.sfx('burrow'); }
          else { this.state = 'summon'; this.timer = 1.0; env.sfx('roar'); env.shake(0.3); }
        }
        break;
      }
      case 'charge_tg':
        if (this.timer > 0.2) { this.dir = [dx / dist, dy / dist]; this.lineLen = this.rayLen(env.map); }
        if (Math.random() < dt * 14) env.fx({ type: 'debris', x: this.x + (Math.random() - 0.5) * 20, y: this.y - 2, vx: -this.dir[0] * 60 + (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, t: 0, dur: 0.4, c: '#d9a35a' });
        if (this.timer <= 0) { this.state = 'charge'; this.left = 340; env.sfx('charge'); }
        break;
      case 'charge': {
        const sp = this.phase === 1 ? 190 : 220, step = sp * dt;
        const nx = this.x + this.dir[0] * step, ny = this.y + this.dir[1] * step;
        const hit = this.solidAt(env.map, nx, ny);
        this.left -= step;
        if (hit || this.left <= 0) {
          const pillar = hit && this.pillars.some(([px, py]) => Math.abs(px - hit[0]) <= 0 && Math.abs(py - hit[1]) <= 0);
          env.sfx('thud'); env.shake(pillar ? 0.6 : 0.3);
          for (let i = 0; i < 10; i++) env.fx({ type: 'debris', x: this.x + this.dir[0] * 14, y: this.y - 10, vx: (Math.random() - 0.5) * 140, vy: -50 - Math.random() * 60, t: 0, dur: 0.6, c: i % 2 ? '#cfac74' : '#8a6a42' });
          if (pillar) { this.state = 'stun'; this.timer = 2.6; this.dmgInStun = 0; env.sfx('bonk'); }
          else { this.state = 'recover'; this.timer = 0.7; }
          return;
        }
        this.x = nx; this.y = ny;
        if (Math.random() < 0.6) env.fx({ type: 'debris', x: this.x, y: this.y - 2, vx: (Math.random() - 0.5) * 30, vy: -20, t: 0, dur: 0.35, c: '#d9a35a' });
        break;
      }
      case 'burrow': if (this.timer <= 0) { this.state = 'tunnel'; this.timer = this.phase === 1 ? 2.0 : 1.6; } break;
      case 'tunnel': {
        const sp = this.phase === 1 ? 72 : 92;
        this.move(env.map, dx / dist * sp * dt, dy / dist * sp * dt);
        if (Math.random() < dt * 18) env.fx({ type: 'debris', x: this.x + (Math.random() - 0.5) * 14, y: this.y - 2, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, t: 0, dur: 0.4, c: '#d9a35a' });
        env.sfx('burrow', {}, 0.5);
        if (this.timer <= 0 || dist < 8) { this.state = 'erupt_tg'; this.timer = 0.6; env.sfx('warn'); }
        break;
      }
      case 'erupt_tg': if (this.timer <= 0) this.erupt(env); break;
      case 'summon':
        if (this.timer <= 0.5 && !this.spawned) { this.spawned = true; for (const s of [-1, 1]) env.spawn('skorpion', this.x + s * 40, this.y + 10); env.sfx('summon'); }
        if (this.timer <= 0) { this.spawned = false; this.state = 'recover'; this.timer = 0.6; }
        break;
      case 'stun': case 'dazed': case 'recover':
        if (this.timer <= 0) { this.state = 'idle'; this.timer = this.phase === 1 ? 1.4 : 1.0; }
        break;
    }
    // Kontaktschaden
    if (!['sleep', 'intro', 'dying', 'transition', 'stun', 'dazed', 'tunnel', 'erupt_tg', 'burrow'].includes(this.state) && env.canHurt()) {
      if (Math.abs(p.x - this.x) < 18 && p.y > this.y - 22 && p.y < this.y + 6) env.hurt(this.state === 'charge' ? 2 : 1, this);
    }
  }
  erupt(env) {
    const p = env.player;
    this.state = 'dazed'; this.timer = this.phase === 1 ? 1.5 : 1.1; this.dmgInStun = 0;
    env.sfx('burrowUp'); env.sfx('explosion'); env.shake(0.6);
    env.fx({ type: 'shock', x: this.x, y: this.y - 4, t: 0, dur: 0.5, c: '255,210,120' });
    for (let i = 0; i < 14; i++) env.fx({ type: 'debris', x: this.x, y: this.y - 6, vx: Math.cos(i * 0.45) * 110, vy: Math.sin(i * 0.45) * 60 - 70, t: 0, dur: 0.7, c: i % 2 ? '#e2ad66' : '#b8864a' });
    if (Math.hypot(p.x - this.x, (p.y - this.y) * 1.3) < 30 && env.canHurt()) env.hurt(2, this);
    if (this.phase === 2) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; this.projs.push({ x: this.x, y: this.y - 10, vx: Math.cos(a) * 85, vy: Math.sin(a) * 85, life: 2.5 }); }
  }
  move(map, dx, dy) {
    const A = this.arena;
    const ok = (x, y) => !this.solidAt(map, x, y) && ((x - A.cx) / A.rx) ** 2 + ((y - A.cy) / A.ry) ** 2 < 1;
    if (ok(this.x + dx, this.y)) this.x += dx;
    if (ok(this.x, this.y + dy)) this.y += dy;
  }
  lights() {
    const l = [{ x: this.x, y: this.y - 18, r: 60, color: this.phase === 2 ? 'rgba(255,120,60,0.45)' : 'rgba(255,200,90,0.45)', flicker: 0.4 }];
    for (const s of this.projs) l.push({ x: s.x, y: s.y, r: 12, color: 'rgba(255,200,120,0.6)', flicker: 0 });
    return l;
  }
  drawGround(ctx, cam, time) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    if (this.dead) return;
    if (this.hidden) { // Erdhügel + Staub
      const shake = this.state === 'erupt_tg' ? Math.round((Math.random() - 0.5) * 3) : 0, w = this.state === 'erupt_tg' ? 16 : 11;
      ctx.fillStyle = '#6a4a22'; ctx.fillRect(x - w + shake, y - 3, w * 2, 4);
      ctx.fillStyle = '#b8864a'; ctx.fillRect(x - w + 3 + shake, y - 6, w * 2 - 6, 3);
      ctx.fillStyle = '#e4c892'; ctx.fillRect(x - 3 + shake, y - 8, 6, 2);
      if (this.state === 'erupt_tg') { ctx.strokeStyle = `rgba(255,80,60,${0.5 + 0.5 * (Math.floor(time / 80) % 2)})`; ctx.beginPath(); ctx.ellipse(x + 0.5, y - 1.5, 30, 22, 0, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 19, 5, 0, 0, Math.PI * 2); ctx.fill();
    if (this.state === 'charge_tg') {
      const blink = Math.floor(time / 90) % 2;
      ctx.fillStyle = blink ? 'rgba(255,90,40,0.55)' : 'rgba(255,90,40,0.3)';
      for (let l = 20; l < this.lineLen; l += 7) ctx.fillRect(Math.round(x + this.dir[0] * l) - 2, Math.round(y - 4 + this.dir[1] * l) - 1, 4, 3);
    }
  }
  draw(ctx, cam, time = 0) {
    if (this.dead || this.hidden) return;
    const flipped = this.state === 'stun';
    const f = Math.floor(this.anim * (this.state === 'charge' ? 12 : flipped ? 8 : 5)) % 2;
    let sink = 0;
    if (this.state === 'burrow') sink = Math.round((1 - this.timer / 0.6) * 30);
    if (this.state === 'dazed') sink = Math.max(0, Math.round((this.timer - (this.phase === 1 ? 1.2 : 0.8)) * 60));
    const shake = this.state === 'charge_tg' || this.state === 'transition' || this.state === 'dying' ? Math.round((Math.random() - 0.5) * 3) : 0;
    const flashOn = this.flash > 0 || (this.state === 'dying' && Math.floor(this.timer * 14) % 2 === 0) || (this.state === 'transition' && Math.floor(this.timer * 10) % 2 === 0);
    const img = flipped ? (flashOn ? this.art.whiteFlip[f] : this.art.flip[f]) : (flashOn ? this.art.white[f] : this.art.walk[f]);
    const bx = Math.round(this.x - cam.x - 27) + shake, by = Math.round(this.y - cam.y - 42);
    const h = img.height - sink;
    if (h > 0) ctx.drawImage(img, 0, 0, img.width, h, bx, by + sink, img.width, h);
    if (this.state === 'stun' || this.state === 'dazed') { ctx.fillStyle = '#ffe88a'; for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(this.x - cam.x + Math.cos(this.anim * 5 + i * 1.6) * 14), by + 4 + Math.round(Math.sin(this.anim * 5 + i * 1.6) * 3), 2, 2); }
  }
  drawAir(ctx, cam) {
    for (const s of this.projs) {
      const x = Math.round(s.x - cam.x), y = Math.round(s.y - cam.y);
      ctx.fillStyle = '#b8864a'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#f0c886'; ctx.fillRect(x - 1, y - 1, 3, 3);
    }
  }
}
