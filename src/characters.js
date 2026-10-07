// Spielfigur & NPCs: handgezeichnete ASCII-Pixelmaps (16x20 pro Frame),
// eingefärbt über ein "Look"-Objekt plus optionale Extras (Bart, Schürze, Hut …).
import { Pix } from './pix.js';

export const PLAYER_LOOK = {
  o: '#2a1d1a', h: '#6b3b22', H: '#94552e', s: '#f5c9a0', S: '#d99a6c', e: '#1d1b2a',
  t: '#3d8a4a', T: '#2b6538', L: '#62b26a', b: '#5a3a20', p: '#6a5236', k: '#3a2618', y: '#ffd23f',
  extras: [],
};

const HEAD_DOWN = [
  '................',
  '....oooooooo....',
  '...ohhHHHHhho...',
  '..ohhhHHHHhhho..',
  '..ohhhhhhhhhho..',
  '..ohhsssssshho..',
  '..ohsessssesho..',
  '..oSsessssesSo..',
  '...osssSSssso...',
  '....oossssoo....',
];
const HEAD_UP = [
  '................',
  '....oooooooo....',
  '...ohhHHHHhho...',
  '..ohhhHHHHhhho..',
  '..ohhhhHHhhhho..',
  '..ohhhhhhhhhho..',
  '..ohhhhhhhhhho..',
  '..oShhhhhhhhSo..',
  '...ohhhhhhhho...',
  '....oossssoo....',
];
const BODY_FRONT = [
  '...otLttttLto...',
  '..oSttttttttSo..',
  '..oSTttttttTSo..',
  '..osbbbybbbbso..',
  '...oTttttttTo...',
  '...oppppppppo...',
];
const BODY_BACK = [
  '...otttttttto...',
  '..oSttttttttSo..',
  '..oSTttttttTSo..',
  '..osbbbbbbbbso..',
  '...oTttttttTo...',
  '...oppppppppo...',
];
const LEGS_FRONT = [
  ['....oppooppo....', '....oppooppo....', '....okkookko....', '.....oo..oo.....'],
  ['....oppooppo....', '....oppookko....', '....okko.oo.....', '.....oo.........'],
  ['....oppooppo....', '....okkooppo....', '.....oo.okko....', '.........oo.....'],
];
const HEAD_SIDE = [
  '................',
  '.....ooooooo....',
  '....ohhHHHhho...',
  '...ohhHHHHhhho..',
  '...ohhhhhhhhho..',
  '..ossshhhhhhho..',
  '..osesshhhhhho..',
  '.osssssShhhhho..',
  '..osssssShhho...',
  '...oosssooo.....',
];
const BODY_SIDE = [
  '....otttLLto....',
  '....otTTTtto....',
  '....otTTTtto....',
  '....obbsbbbo....',
  '....otttttto....',
  '....oppppppo....',
];
const LEGS_SIDE = [
  ['.....oppppo.....', '.....oppppo.....', '....okkkkko.....', '.....ooooo......'],
  ['....opppppo.....', '...oppo.oppo....', '..okko...okko...', '..ooo.....ooo...'],
  ['.....oppppo.....', '....oppoopo.....', '...okko.oko.....', '...ooo..oo......'],
];

function fromAscii(rows, look) {
  const p = new Pix(16, 20);
  rows.forEach((row, y) => {
    if (row.length !== 16) console.warn('Sprite-Zeile hat nicht 16 Zeichen:', y, row);
    [...row].forEach((ch, x) => { if (ch !== '.') p.set(x, y, look[ch]); });
  });
  return p;
}

// --- Extras: werden nach dem Grund-Sprite pro Richtung aufgemalt -------------
const painted = (p, x, y) => p.alpha(x, y) > 0;
function applyExtras(p, view, look) {
  const ex = look.extras || [];
  const o = look.o;
  for (const e of ex) {
    if (e === 'longhair') {
      if (view === 'side') { for (let y = 5; y <= 11; y++) { p.set(12, y, look.h); p.set(13, y, y > 9 ? look.H : look.h); p.set(14, y, o); } p.hline(12, 13, 12, o); }
      else for (let y = 6; y <= 11; y++) { p.set(1, y, o); p.set(14, y, o); p.set(2, y, look.h); p.set(13, y, look.h); if (view === 'up') { p.set(3, y, look.h); p.set(12, y, look.h); } }
      if (view !== 'side') { p.set(2, 12, o); p.set(13, 12, o); }
    }
    if (e === 'pigtails') {
      if (view === 'side') { p.set(13, 6, look.h); p.set(14, 6, o); p.set(13, 7, look.h); p.set(14, 7, look.h); p.set(15, 7, o); p.set(14, 8, o); }
      else for (const x of [0, 1, 14, 15]) for (let y = 5; y <= 8; y++) p.set(x, y, (x === 0 || x === 15 || y === 5 || y === 8) ? o : look.h);
    }
    if (e === 'beard') {
      const c = look.beard || look.h;
      if (view === 'down') { p.hline(4, 11, 8, c); p.hline(5, 10, 9, c); p.set(4, 7, c); p.set(11, 7, c); p.hline(6, 9, 10, c); p.hline(7, 8, 8, look.S); }
      if (view === 'side') { p.hline(2, 7, 8, c); p.hline(3, 6, 9, c); p.set(4, 10, c); }
    }
    if (e === 'apron') {
      const c = look.apron || '#e8e0d0', d = look.apronD || '#c4b9a5';
      if (view === 'down') { for (let y = 11; y <= 15; y++) p.hline(5, 10, y, y === 15 ? d : c); p.set(5, 10, c); p.set(10, 10, c); }
      if (view === 'side') for (let y = 11; y <= 15; y++) p.hline(4, 6, y, y === 15 ? d : c);
    }
    if (e === 'hat') {
      const c = look.hat || '#5a4632', d = look.hatD || '#3d2f22';
      const brimY = 2;
      for (let x = 3; x <= 12; x++) p.set(x, 0, x === 3 || x === 12 ? o : c);
      for (let x = 3; x <= 12; x++) p.set(x, 1, c);
      p.hline(view === 'side' ? 0 : 1, view === 'side' ? 13 : 14, brimY, d);
      p.hline(view === 'side' ? 0 : 1, view === 'side' ? 13 : 14, brimY + 1, o);
      if (look.hatBand) p.hline(4, 11, 1, look.hatBand);
    }
    if (e === 'kerchief') {
      const c = look.kerchief || '#c23b3b', d = '#8a2626';
      for (let y = 1; y <= 4; y++) for (let x = 2; x <= 13; x++) if (painted(p, x, y) && !(x === 2 || x === 13) || (y === 1 && x > 3 && x < 12)) p.set(x, y, (x + y) % 3 === 0 ? d : c);
      if (view === 'down') { p.set(3, 4, d); p.set(12, 4, d); }
      if (view === 'up') { p.set(7, 9, c); p.set(8, 9, c); p.set(7, 10, d); }
    }
    if (e === 'dress') {
      const c = look.dress || look.t, d = look.dressD || look.T;
      for (let y = 15; y <= 17; y++) {
        const w = y - 15;
        for (let x = 3 - w; x <= 12 + w; x++) p.set(x, y, x === 3 - w || x === 12 + w ? o : (x + y) % 5 === 0 ? d : c);
      }
      p.hline(2, 13, 18, o);
    }
    if (e === 'glasses' && view === 'down') { p.set(4, 6, o); p.set(5, 6, look.e); p.set(6, 6, o); p.set(9, 6, o); p.set(10, 6, look.e); p.set(11, 6, o); p.hline(6, 9, 6, o); }
  }
}

/** Baut alle Frames einer Figur: {down,up,left,right: [stand, schrittA, schrittB], shadow}. */
export function buildCharacter(lookIn) {
  const look = { ...PLAYER_LOOK, ...lookIn };
  const frames = { down: [], up: [], left: [], right: [] };
  for (let f = 0; f < 3; f++) {
    const d = fromAscii([...HEAD_DOWN, ...BODY_FRONT, ...LEGS_FRONT[f]], look); applyExtras(d, 'down', look);
    const u = fromAscii([...HEAD_UP, ...BODY_BACK, ...LEGS_FRONT[f]], look); applyExtras(u, 'up', look);
    const s = fromAscii([...HEAD_SIDE, ...BODY_SIDE, ...LEGS_SIDE[f]], look); applyExtras(s, 'side', look);
    frames.down.push(d.canvas());
    frames.up.push(u.canvas());
    frames.left.push(s.canvas());
    frames.right.push(s.flipX().canvas());
  }
  const sh = new Pix(12, 4);
  sh.ellipse(6, 2, 6, 2, '#00000048');
  frames.shadow = sh.canvas();
  return frames;
}
