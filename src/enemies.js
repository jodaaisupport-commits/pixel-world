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
// ---- Gegner der zweiten Geschichte
function scorpionFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(22, 16);
    const c0 = '#6a3a14', c1 = '#a8601e', c2 = '#d98a32', c3 = '#f8c070';
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const x = 11 + s * (2 + i * 2), up = (i + f) % 2; p.set(x, 11 + up, c0); p.set(x + s, 12 + up, c0); }
    p.ellipse(11, 10, 5, 2.6, c1); p.hline(8, 14, 9, c2);
    // Schwanz (Bogen nach oben, Stachel)
    const tail = [[6, 9], [4, 8], [3, 6], [3, 4], [4, 2], [6, 1], [8, 1]];
    tail.forEach(([x, y], i) => { p.set(x, y, i % 2 ? c1 : c2); p.set(x, y + 1, c0); });
    p.set(9, 2, '#ff4a4a'); p.set(9, 1, c3);
    // Scheren
    const cy = 8 + (f === 2 ? -1 : 0);
    p.ellipse(18, cy, 2.4, 1.8, c2); p.set(20, cy - 1, c2); p.set(20, cy + 1, c1); p.set(16, 9, c1);
    p.set(14, 8, '#1a0a00'); p.set(15, 8, '#ffffff');
    out.push(p.outlined('#2a1206'));
  }
  return out;
}
function dustFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(18, 22);
    for (let y = 0; y < 20; y++) {
      const w = 2 + (20 - y) * 0.32, cx = 9 + Math.sin(y / 3 + f * 2.1) * 2;
      for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
        const band = (y + f * 2 + Math.round(x / 2)) % 4;
        if (band === 3 && y > 3) continue;
        p.set(x, y, band === 0 ? '#f0d0a0' : band === 1 ? '#d8a868' : '#b8864a');
      }
    }
    p.set(7, 7, '#2a1a10'); p.set(11, 7, '#2a1a10'); p.set(7, 6, '#ffe88a'); p.set(11, 6, '#ffe88a');
    out.push(p.outlined('#5a3a1a'));
  }
  return out;
}
function wormFrames() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(18, 20);
    for (let i = 0; i < 4; i++) { const y = 18 - i * 4, x = 9 + Math.round(Math.sin(i + f) * 1.5); p.ellipse(x, y, 5 - i * 0.4, 3, i % 2 ? '#c87a4a' : '#e89a62'); p.hline(x - 3, x + 3, y - 2, '#f8c890'); }
    p.ellipse(9, 4, 5, 4, '#b8603a'); p.ellipse(9, 4, 3, 2.4, '#3a0a0a');
    for (const x of [6, 8, 10, 12]) p.set(x, 3 + (x % 4 ? 0 : 1), '#ffffff');
    out.push(p.outlined('#3a1a0a'));
  }
  return out;
}
function wispFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(18, 20);
    p.ellipse(9, 8, 6, 6, '#8cc8e6'); p.ellipse(9, 7, 4.6, 4.6, '#bfe6f6'); p.ellipse(8, 6, 2.4, 2.4, '#effbff');
    for (let i = 0; i < 4; i++) { const x = 4 + i * 3, l = 4 + ((i + f) % 3) * 2; p.vline(x, 12, 12 + l, i % 2 ? '#8cc8e6' : '#5a9cc4'); }
    p.set(7, 8, '#1a3a5a'); p.set(11, 8, '#1a3a5a'); p.hline(8, 10, 11, '#1a3a5a');
    for (const [x, y] of [[2, 3], [16, 5], [3, 12]]) if ((x + f) % 2) p.set(x, y, '#ffffff');
    out.push(p.outlined('#1a3a5a'));
  }
  return out;
}
function hedgehogFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(20, 16);
    if (f === 2) { // eingerollt
      p.ellipse(10, 9, 7, 6.5, '#5a9cc4');
      for (let a = 0; a < 12; a++) { const x = 10 + Math.cos(a / 12 * 6.28) * 8, y = 9 + Math.sin(a / 12 * 6.28) * 7.5; p.set(x, y, '#effbff'); }
      p.ellipse(8, 7, 3, 2.5, '#8cc8e6');
    } else {
      p.ellipse(10, 10, 7, 4.5, '#5a9cc4');
      for (let x = 4; x < 17; x += 2) { p.set(x, 5 + (x % 4 ? 0 : 1), '#effbff'); p.set(x, 6 + (x % 4 ? 0 : 1), '#bfe6f6'); }
      p.ellipse(16, 11, 3, 2.4, '#d8c0a0'); p.set(19, 11, '#1a1a20'); p.set(16, 10, '#1a1a20');
      p.set(7 + f, 14, '#3a2a20'); p.set(13 - f, 14, '#3a2a20');
    }
    out.push(p.outlined('#1a2a3a'));
  }
  return out;
}
function jellyFrames() {
  const out = [];
  for (let f = 0; f < 3; f++) {
    const p = new Pix(18, 22);
    const sq = [0, 1, 0][f];
    p.ellipse(9, 7, 7 + sq * 0.5, 5.5 - sq * 0.5, '#d88ad8b0'); p.ellipse(9, 6, 5, 3.6, '#f0c0f0c0'); p.set(6, 4, '#ffffff');
    for (let i = 0; i < 5; i++) { const x = 4 + i * 2.5; for (let y = 12; y < 18 + ((i + f) % 2) * 3; y++) p.set(x + Math.round(Math.sin(y / 2 + f + i) * 0.8), y, i % 2 ? '#b86ab8' : '#e8a0e8'); }
    p.set(7, 7, '#5a1a5a'); p.set(11, 7, '#5a1a5a');
    out.push(p.outlined('#4a1a4a'));
  }
  return out;
}
function shellKnightFrames() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const p = new Pix(20, 20);
    p.rect(7, 14, 2, 4 + f, '#3a6a8a'); p.rect(11, 14, 2, 5 - f, '#3a6a8a');
    p.ellipse(10, 10, 6, 6, '#4a8aa8'); p.ellipse(10, 9, 4, 4, '#6ab0c8');
    // Muschelschild (vorn)
    for (let y = 3; y < 18; y++) { const w = Math.round(Math.sin((y - 3) / 15 * Math.PI) * 5); for (let x = 15 - w; x <= 15 + w; x++) p.set(x, y, (x + y) % 3 ? '#e8d8c8' : '#c8a890'); }
    p.vline(15, 3, 17, '#a88870');
    p.rect(6, 2, 7, 4, '#2a5a7a'); p.set(8, 4, '#ffd23f'); p.set(11, 4, '#ffd23f');
    p.vline(3, 4 + f, 16, '#c8c8d2'); p.set(3, 3 + f, '#ffffff'); // Dreizack
    p.set(2, 4 + f, '#c8c8d2'); p.set(4, 4 + f, '#c8c8d2');
    out.push(p.outlined('#0a1a2a'));
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
const FROST = { '#4a4a56': '#5a7a9a', '#6e6e7c': '#a9c8e0', '#9a9aa8': '#d6e8f4', '#c8c8d2': '#ffffff', '#ffd23f': '#5ae0ff' };
function recolor(p, map) {
  const q = new Pix(p.w, p.h); q.d.set(p.d);
  const hex = (i) => '#' + [0, 1, 2].map((k) => q.d[i + k].toString(16).padStart(2, '0')).join('');
  for (let i = 0; i < q.d.length; i += 4) { if (!q.d[i + 3]) continue; const c = map[hex(i)]; if (c) { q.d[i] = parseInt(c.slice(1, 3), 16); q.d[i + 1] = parseInt(c.slice(3, 5), 16); q.d[i + 2] = parseInt(c.slice(5, 7), 16); } }
  return q;
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
    skorpion: mk(scorpionFrames()), skorpionL: mk(scorpionFrames().map((p) => p.flipX())),
    staubgeist: mk(dustFrames()), sandwurm: mk(wormFrames()), eisgeist: mk(wispFrames()),
    frostwolf: mk(wolf.map((p) => recolor(p, FROST))), frostwolfL: mk(wolf.map((p) => recolor(p, FROST).flipX())),
    eisigel: mk(hedgehogFrames()), eisigelL: mk(hedgehogFrames().map((p) => p.flipX())),
    qualle: mk(jellyFrames()), muschel: mk(shellKnightFrames()), muschelL: mk(shellKnightFrames().map((p) => p.flipX())),
  };
}

// ---------------------------------------------------------------- Definitionen
export const ENEMY_DEFS = {
  slime: { name: 'Schleim', hp: 2, speed: 20, chase: 34, aggro: 80, dmg: 1, hw: 6, h: 7, art: 'slime', hop: true, drops: [['taler', 0.65, 1], ['herz', 0.25, 1]] },
  moorslime: { name: 'Moorschleim', hp: 3, speed: 18, chase: 32, aggro: 85, dmg: 1, hw: 6, h: 7, art: 'moorslime', hop: true, drops: [['taler', 0.8, 2], ['herz', 0.3, 1]] },
  bat: { name: 'Fledermaus', hp: 1, speed: 30, chase: 50, aggro: 100, dmg: 1, hw: 6, h: 6, art: 'bat', fly: true, drops: [['taler', 0.5, 1], ['herz', 0.25, 1]] },
  crab: { name: 'Krabbe', hp: 3, speed: 22, chase: 36, aggro: 72, dmg: 1, hw: 7, h: 6, art: 'crab', sideways: true, drops: [['taler', 0.75, 2], ['herz', 0.25, 1]] },
  wolf: { name: 'Bergwolf', hp: 3, speed: 26, chase: 46, aggro: 100, dmg: 1, hw: 7, h: 6, art: 'wolf', lunge: true, drops: [['taler', 0.8, 3], ['herz', 0.3, 1]] },
  schatten: { name: 'Schattenschleim', hp: 2, speed: 22, chase: 40, aggro: 200, dmg: 1, hw: 6, h: 7, art: 'moorslime', hop: true, drops: [['herz', 0.45, 1]] },
  golem: { name: 'Felsgolem', hp: 6, speed: 11, chase: 18, aggro: 90, dmg: 2, hw: 8, h: 8, art: 'golem', heavy: true, drops: [['eisenerz', 1, 1], ['taler', 1, 5]] },
  // Sonnenwüste
  skorpion: { name: 'Wüstenskorpion', hp: 3, speed: 24, chase: 44, aggro: 96, dmg: 1, hw: 8, h: 6, art: 'skorpion', lunge: true, drops: [['taler', 0.8, 3], ['herz', 0.3, 1]] },
  staubgeist: { name: 'Staubgeist', hp: 2, speed: 34, chase: 46, aggro: 110, dmg: 1, hw: 6, h: 7, art: 'staubgeist', fly: true, erratic: true, drops: [['taler', 0.6, 2], ['herz', 0.3, 1]] },
  sandwurm: { name: 'Sandwurm', hp: 3, speed: 26, chase: 34, aggro: 110, dmg: 1, hw: 7, h: 8, art: 'sandwurm', burrow: true, drops: [['taler', 0.9, 4], ['herz', 0.35, 1]] },
  // Frosthöhen & Eisgrotte
  eisgeist: { name: 'Eisgeist', hp: 2, speed: 20, chase: 24, aggro: 120, dmg: 1, hw: 6, h: 7, art: 'eisgeist', fly: true, shooter: { every: 2.4, speed: 92, range: 150 }, drops: [['eiskristall', 0.5, 1], ['herz', 0.3, 1]] },
  frostwolf: { name: 'Frostwolf', hp: 4, speed: 28, chase: 50, aggro: 110, dmg: 1, hw: 7, h: 6, art: 'frostwolf', lunge: true, drops: [['taler', 0.8, 4], ['herz', 0.35, 1]] },
  eisigel: { name: 'Eisigel', hp: 3, speed: 14, chase: 18, aggro: 120, dmg: 1, hw: 7, h: 6, art: 'eisigel', roller: true, drops: [['eiskristall', 0.4, 1], ['taler', 0.7, 3]] },
  // Gezeitentempel
  qualle: { name: 'Tiefseequalle', hp: 2, speed: 14, chase: 22, aggro: 100, dmg: 1, hw: 6, h: 7, art: 'qualle', fly: true, drops: [['herz', 0.45, 1], ['taler', 0.5, 2]] },
  muschel: { name: 'Muschelkrieger', hp: 4, speed: 16, chase: 28, aggro: 100, dmg: 1, hw: 7, h: 8, art: 'muschel', shield: true, lunge: true, drops: [['taler', 1, 5], ['herz', 0.35, 1]] },
  tentakel: { name: 'Tentakel', hp: 2, speed: 0, chase: 0, aggro: 300, dmg: 1, hw: 6, h: 8, art: 'qualle', fly: true, drops: [] },
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
    const d = this.def;
    if (d.burrow && this.bs !== 'up') return false;
    if (d.roller && (this.rs === 'roll' || this.rs === 'curl')) { this.inv = 0.2; return 'block'; }
    if (d.shield) {
      const fx = fromX - this.x, fy = fromY - this.y;
      if (Math.sign(fx) === this.face && Math.abs(fx) > Math.abs(fy) * 0.8 && this.cool < 0.3 && this.state2 !== 'lunge') {
        this.inv = 0.2; this.kbx = -this.face * 40; this.kbt = 0.06; return 'block';
      }
    }
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
    if (d.burrow && this.updateBurrow(dt, map, dx, dy, dist, alive)) return;
    if (d.roller && this.updateRoller(dt, map, dx, dy, dist, alive)) return;
    if (d.shooter && alive) this.updateShooter(dt, dx, dy, dist);
    if (this.type === 'tentakel') { this.moving = true; this.alt = 4 + Math.sin(this.anim * 0.5) * 3; return; }
    if (this.state !== 'chase' && dist < d.aggro && alive) { this.state = 'chase'; this.timer = 0; }
    if (this.state === 'chase' && (dist > d.aggro * 1.7 || !alive)) { this.state = 'wander'; this.timer = 0.5; }
    let mx = 0, my = 0, sp = d.speed;
    if (this.state === 'retreat') {
      this.timer -= dt; mx = -dx; my = -dy; sp = d.speed;
      if (this.timer <= 0) this.state = 'chase';
    } else if (this.state === 'chase') {
      sp = d.chase; mx = dx; my = dy;
      if (d.fly) { const t = this.anim * 0.35; mx += Math.cos(t) * 30; my += Math.sin(t * 1.3) * 30; }
      if (d.erratic) {
        this.jt = (this.jt || 0) - dt;
        if (this.jt <= 0) { this.jt = 0.3 + Math.random() * 0.4; const a = Math.random() * 6.28; this.jx = Math.cos(a) * 70; this.jy = Math.sin(a) * 70; }
        mx += this.jx; my += this.jy;
      }
      if (d.shooter && dist < 70) { mx = -dx; my = -dy; sp = d.speed; } // hält Abstand
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
  /** Sandwurm: gräbt sich ein, taucht unter der Spielfigur auf. true = Update erledigt. */
  updateBurrow(dt, map, dx, dy, dist, alive) {
    const d = this.def;
    if (!this.bs) { this.bs = 'under'; this.bt = 0; }
    this.bt -= dt;
    if (this.bs === 'under') {
      if (alive && dist < d.aggro) {
        if (dist < 10 && this.cool <= 0) { this.bs = 'rise'; this.bt = 0.65; this.sfx = 'burrow'; this.moving = false; return true; }
        const l = dist || 1; this.move(map, dx / l * d.chase * dt, dy / l * d.chase * dt); this.moving = true;
        if (Math.abs(dx) > 1) this.face = dx < 0 ? -1 : 1;
      } else this.moving = false;
      return true;
    }
    if (this.bs === 'rise') { if (this.bt <= 0) { this.bs = 'up'; this.bt = 1.9; this.sfx = 'burrowUp'; } return true; }
    if (this.bs === 'up') { this.moving = true; if (this.bt <= 0) { this.bs = 'sink'; this.bt = 0.4; } return true; }
    if (this.bs === 'sink') { if (this.bt <= 0) { this.bs = 'under'; this.cool = 1.4; } return true; }
    return false;
  }
  /** Eisigel: rollt in gerader Linie auf die Spielfigur zu. */
  updateRoller(dt, map, dx, dy, dist, alive) {
    if (this.rs === 'curl') { this.rt -= dt; if (this.rt <= 0) { this.rs = 'roll'; this.rt = 1.6; this.sfx = 'roll'; } return true; }
    if (this.rs === 'roll') {
      this.rt -= dt; this.anim += dt * 10;
      const ok = this.move(map, this.rx * 135 * dt, this.ry * 135 * dt);
      if (!ok || this.rt <= 0) { this.rs = 'dizzy'; this.rt = 1.3; if (!ok) this.sfx = 'bonk'; }
      return true;
    }
    if (this.rs === 'dizzy') { this.rt -= dt; this.moving = false; if (this.rt <= 0) { this.rs = null; this.cool = 0.8; } return true; }
    if (alive && this.cool <= 0 && dist < 120 && (Math.abs(dx) < 9 || Math.abs(dy) < 9)) {
      this.rs = 'curl'; this.rt = 0.5;
      if (Math.abs(dx) > Math.abs(dy)) { this.rx = Math.sign(dx); this.ry = 0; this.face = this.rx; } else { this.rx = 0; this.ry = Math.sign(dy); }
      return true;
    }
    return false;
  }
  /** Eisgeist: lädt sich auf und schießt Eissplitter. */
  updateShooter(dt, dx, dy, dist) {
    const s = this.def.shooter;
    if (this.state !== 'chase' || dist > s.range) { this.st = Math.max(this.st || 0, 0.9); this.charging = false; return; }
    this.st = (this.st ?? s.every) - dt;
    this.charging = this.st < 0.5;
    if (this.st <= 0) {
      this.st = s.every + Math.random() * 0.6;
      const l = dist || 1, oy = (this.alt || 0) + 8;
      (this.out ||= []).push({ x: this.x, y: this.y - oy, vx: dx / l * s.speed, vy: (dy + oy - 6) / l * s.speed, life: 2.4, kind: 'ice', dmg: this.def.dmg });
      this.sfx = 'shoot';
    }
  }
  /** Kontakt mit der Spielfigur? */
  touches(player) {
    if (this.def.burrow && this.bs !== 'up') return false;
    const b = this.box, px0 = player.x - 5, px1 = player.x + 5, py0 = player.y - 13, py1 = player.y;
    return b.x < px1 && b.x + b.w > px0 && b.y < py1 && b.y + b.h > py0;
  }
  draw(ctx, cam) {
    const d = this.def;
    let a = this.art[d.art];
    if (this.face < 0 && this.art[d.art + 'L']) a = this.art[d.art + 'L'];
    if (d.burrow && this.bs !== 'up') { this.drawMound(ctx, cam); return; }
    let f;
    if (d.fly) f = Math.floor(this.anim) % 3;
    else if (d.hop) f = Math.floor(this.anim) % 4;
    else f = this.moving ? 1 + (Math.floor(this.anim) % (a.frames.length - 1 || 1)) : 0;
    if (d.lunge && this.state2 === 'crouch') f = 0;
    if (d.roller) f = this.rs === 'curl' || this.rs === 'roll' || this.rs === 'dizzy' ? 2 : this.moving ? Math.floor(this.anim) % 2 : 0;
    if (d.shield) f = Math.floor(this.anim) % 2;
    f = Math.min(f, a.frames.length - 1);
    const img = this.flash > 0 && Math.floor(this.flash * 40) % 2 === 0 ? a.white[f] : a.frames[f];
    const sx = Math.round(this.x - a.w / 2 - cam.x), sy = Math.round(this.y - a.h - cam.y - (this.alt || 0) + (d.fly ? 0 : 1));
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const sw = Math.round(d.hw * 1.6);
    ctx.fillRect(Math.round(this.x - sw / 2 - cam.x), Math.round(this.y - cam.y - 1), sw, 2);
    ctx.fillRect(Math.round(this.x - sw / 2 + 1 - cam.x), Math.round(this.y - cam.y - 2), sw - 2, 1);
    if (d.lunge && this.state2 === 'crouch') ctx.drawImage(img, sx, sy + 1);
    else if (d.burrow && this.bs === 'up') { const t = Math.min(1, (1.9 - this.bt) * 5), hh = Math.round(a.h * t); ctx.drawImage(img, 0, 0, a.w, hh, sx, sy + a.h - hh, a.w, hh); }
    else ctx.drawImage(img, sx, sy);
    if (this.charging) {
      const r = 3 + (Math.sin(this.anim * 3) + 1) * 1.5;
      ctx.fillStyle = 'rgba(200,240,255,0.75)'; ctx.beginPath(); ctx.arc(Math.round(this.x - cam.x), sy + a.h / 2 - 2, r, 0, 7); ctx.fill();
    }
    if (this.rs === 'dizzy') { ctx.fillStyle = '#ffe88a'; const t = this.anim; for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(this.x - cam.x + Math.cos(t + i * 2.1) * 7), sy - 2 + Math.round(Math.sin(t + i * 2.1) * 2), 2, 2); }
  }
  drawMound(ctx, cam) {
    const x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    const rise = this.bs === 'rise', sh = rise ? (Math.random() * 2 - 1) : 0, w = rise ? 9 : 6;
    ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x - w + sh, y - 2, w * 2, 3);
    ctx.fillStyle = '#d9a35a'; ctx.fillRect(x - w + 2 + sh, y - 4, w * 2 - 4, 2);
    ctx.fillStyle = '#f0c886'; ctx.fillRect(x - 2 + sh, y - 5, 4, 1);
    if (this.moving || rise) for (let i = 0; i < (rise ? 4 : 2); i++) { ctx.fillStyle = i % 2 ? '#e2ad66' : '#b8864a'; ctx.fillRect(x - 10 + Math.random() * 20, y - 6 - Math.random() * (rise ? 8 : 3), 2, 2); }
  }
}
