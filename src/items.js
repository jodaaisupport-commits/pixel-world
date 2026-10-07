// Gegenstände: Definitionen (Name, Beschreibung, Typ) und prozedurale 16x16-Icons.
import { Pix } from './pix.js';

/**
 * type: 'coin' (Taler-Zähler), 'heal' (sofort beim Aufheben), 'use' (im Inventar benutzbar),
 *       'quest' (Questgegenstand), 'key', 'material', 'equip' (Ausrüstung), 'upgrade' (sofort: +1 Herz)
 */
export const ITEMS = {
  taler: { name: 'Taler', type: 'coin', desc: 'Die Währung im Pixeldorf. Klimpert schön.' },
  herz: { name: 'Herz', type: 'heal', heal: 2, desc: 'Stellt ein Herz wieder her.' },
  herzcontainer: { name: 'Herzcontainer', type: 'upgrade', desc: 'Erhöht die maximale Anzahl Herzen um eins.' },
  apfel: { name: 'Apfel', type: 'use', heal: 2, price: 5, desc: 'Knackig und süß. Stellt 1 Herz wieder her.' },
  heiltrank: { name: 'Heiltrank', type: 'use', heal: 6, price: 20, desc: 'Ein roter Trank von Mira. Stellt 3 Herzen wieder her.' },
  grosstrank: { name: 'Großer Trank', type: 'use', heal: 99, price: 45, desc: 'Leuchtet golden. Füllt alle Herzen wieder auf.' },
  moorkraut: { name: 'Moorkraut', type: 'quest', desc: 'Ein bläulich schimmerndes Kraut aus dem Nebelmoor. Mira braucht es für ihre Tränke.' },
  kompass: { name: 'Jans Kompass', type: 'quest', desc: 'Ein alter Messingkompass. Auf dem Deckel ist ein „J“ eingraviert.' },
  kristall: { name: 'Blauer Kristall', type: 'material', desc: 'Ein kalt leuchtender Kristall aus der alten Mine. Erwin sammelt sie.' },
  eisenerz: { name: 'Eisenerz', type: 'material', desc: 'Schweres, rostrotes Erz aus den Graufels-Bergen. Bruno kann damit schmieden.' },
  sternenerz: { name: 'Sternenerz', type: 'material', desc: 'Funkelt, als wären Sterne darin gefangen. Äußerst selten.' },
  schluessel: { name: 'Alter Schlüssel', type: 'key', desc: 'Rostig. Der Bart hat die Form eines kleinen Leuchtturms.' },
  schwert: { name: 'Eisenschwert', type: 'equip', slot: 'weapon', dmg: 1, reach: 0, desc: 'Brunos altes Schwert. Nicht schön, aber es schneidet. (Schaden 1)' },
  kristallklinge: { name: 'Kristallklinge', type: 'equip', slot: 'weapon', dmg: 2, reach: 4, desc: 'Von Bruno geschmiedet, mit Sternenerz veredelt. Schaden 2, größere Reichweite.' },
  grubenlampe: { name: 'Grubenlampe', type: 'equip', slot: 'lamp', desc: 'Erwins alte Lampe. In Höhlen siehst du deutlich weiter.' },
};

function coinIcon(f = 0) {
  // f: Drehphase 0..3 (Breite variiert)
  const p = new Pix(16, 16);
  const hw = [4.5, 3.5, 1.5, 3.5][f];
  p.ellipse(8, 9, hw, 4.5, '#8a5a12');
  p.ellipse(8, 8, hw, 4.5, '#e0a82a');
  if (hw > 2) { p.ellipse(8, 8, hw - 1.5, 3, '#ffd23f'); p.vline(8, 6, 10, '#c98a1a'); p.set(7, 6, '#fff3a6'); }
  else p.vline(8, 4, 12, '#fff3a6');
  return p.outlined('#3a2410');
}
function heartIcon(kind = 'full') {
  const p = new Pix(16, 16);
  const rows = ['.##...##.', '#####.###', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....'];
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c !== '#') return;
    let col = '#e83b3b';
    if (kind === 'empty') col = '#4a3038';
    else if (kind === 'half' && x > 4) col = '#4a3038';
    if (kind !== 'empty' && y >= 4 && !(kind === 'half' && x > 4)) col = '#c42a35';
    p.set(x + 3, y + 4, col);
  }));
  if (kind !== 'empty') { p.set(4, 5, '#ffd0d0'); p.set(5, 5, '#ff9a9a'); p.set(4, 6, '#ff9a9a'); }
  return p.outlined('#2a0f14');
}
function bottle(c1, c2, cork = '#a8763e') {
  const p = new Pix(16, 16);
  p.rect(7, 2, 3, 2, cork);
  p.rect(7, 4, 3, 2, '#cfe8f0');
  p.ellipse(8, 10, 4.5, 4.5, c2);
  p.ellipse(8, 10.5, 3.5, 3.5, c1);
  p.rect(7, 4, 3, 3, '#cfe8f0');
  p.set(6, 8, '#ffffff'); p.set(6, 9, '#ffffffaa');
  return p.outlined('#1e1418');
}
function apple() {
  const p = new Pix(16, 16);
  p.ellipse(8, 10, 5, 4.5, '#c42a35');
  p.ellipse(7, 9, 3, 3, '#e83b3b');
  p.set(6, 8, '#ffb0a0');
  p.vline(8, 3, 6, '#6b4228'); p.rect(9, 3, 3, 2, '#5aa83a'); p.set(12, 3, '#3d7a2a');
  return p.outlined('#2a0f14');
}
function herb() {
  const p = new Pix(16, 16);
  const leaf = (x, y, dx) => { for (let i = 0; i < 4; i++) { p.set(x + i * dx, y - i, '#5fb0a8'); p.set(x + i * dx, y - i + 1, '#3a7a78'); } };
  p.vline(8, 5, 14, '#2f6a50');
  leaf(7, 12, -1); leaf(9, 11, 1); leaf(7, 8, -1); leaf(9, 7, 1);
  p.ellipse(8, 4, 2, 2, '#9ad8f0'); p.set(8, 3, '#e6f8ff'); p.set(5, 5, '#b8f0ff'); p.set(11, 4, '#b8f0ff');
  return p.outlined('#0f2420');
}
function compass() {
  const p = new Pix(16, 16);
  p.ellipse(8, 9, 6, 6, '#a8762a'); p.ellipse(8, 9, 5, 5, '#e0b84a'); p.ellipse(8, 9, 4, 4, '#f4ecd8');
  p.rect(7, 1, 3, 3, '#a8762a'); p.set(8, 2, '#e0b84a');
  p.vline(8, 6, 8, '#c42a35'); p.vline(8, 10, 12, '#3a3a4a'); p.set(8, 9, '#1e1418');
  p.set(5, 7, '#ffffff');
  return p.outlined('#2a1a10');
}
function crystalIcon() {
  const p = new Pix(16, 16);
  const shard = (cx, top, bot, hw, c1, c2) => { for (let y = top; y <= bot; y++) { const t = Math.min(1, (y - top) / 3); const w = Math.round(hw * t); for (let x = cx - w; x <= cx + w; x++) p.set(x, y, x < cx ? c1 : c2); } };
  shard(8, 1, 14, 3, '#9ef0ff', '#3ab8e8');
  shard(4, 6, 14, 2, '#7ad8f0', '#2a90c8');
  shard(12, 5, 14, 2, '#7ad8f0', '#2a90c8');
  p.vline(7, 4, 10, '#e6fcff');
  return p.outlined('#0c2030');
}
function ore(base, spot, spot2) {
  const p = new Pix(16, 16);
  p.ellipse(8, 10, 6, 4.5, '#4a4440'); p.ellipse(7, 9, 5, 4, base); p.ellipse(6, 8, 2.5, 1.5, '#ffffff22');
  for (const [x, y] of [[5, 9], [9, 8], [10, 11], [7, 11], [11, 9]]) p.set(x, y, spot);
  if (spot2) for (const [x, y] of [[6, 7], [9, 10], [4, 11]]) p.set(x, y, spot2);
  return p.outlined('#1a1614');
}
function keyIcon() {
  const p = new Pix(16, 16);
  p.ellipse(5, 6, 3.5, 3.5, '#b8862a');
  for (const [x, y] of [[4, 5], [5, 5], [4, 6], [5, 6]]) p.erase(x, y);
  p.hline(8, 14, 6, '#d9a63a'); p.hline(8, 14, 7, '#8a5a1a');
  p.vline(12, 8, 10, '#d9a63a'); p.vline(14, 8, 11, '#d9a63a');
  p.set(3, 4, '#ffe08a');
  return p.outlined('#2a1a08');
}
export function swordPix(kind = 'schwert', len = 10) {
  // Klinge diagonal nach rechts oben, 16x16 (Griff links unten)
  const p = new Pix(16, 16);
  const crystal = kind === 'kristallklinge';
  const b1 = crystal ? '#9ef0ff' : '#e6e6ee', b2 = crystal ? '#3ab8e8' : '#9a9aae';
  for (let i = 0; i < len; i++) { p.set(4 + i, 11 - i, b1); p.set(5 + i, 11 - i, b2); }
  p.set(4 + len, 11 - len, b1);
  for (let i = 0; i < 4; i++) p.set(1 + i, 14 - i, '#6b4228');
  p.set(1, 15, '#d9a63a'); p.set(0, 15, '#d9a63a');
  for (const [x, y] of [[2, 10], [3, 11], [5, 13], [6, 14], [4, 12]]) p.set(x, y, crystal ? '#c98aff' : '#d9a63a');
  return p.outlined('#1a1418');
}
function lamp() {
  const p = new Pix(16, 16);
  p.hline(6, 10, 1, '#4a4440'); p.set(5, 2, '#4a4440'); p.set(11, 2, '#4a4440');
  p.rect(5, 4, 7, 2, '#6a5a3a'); p.rect(5, 6, 7, 6, '#ffe08a'); p.rect(7, 7, 3, 4, '#fff7d0');
  p.vline(5, 6, 11, '#8a7a5a'); p.vline(11, 6, 11, '#8a7a5a'); p.rect(4, 12, 9, 2, '#6a5a3a');
  return p.outlined('#1a1410');
}

/** Alle Icons als Canvas (16x16) + HUD-Herzen + Münz-Animationsframes. */
export function buildItemArt() {
  const icons = {
    taler: coinIcon(0).canvas(),
    herz: heartIcon('full').canvas(),
    herzcontainer: (() => { const p = heartIcon('full'); for (const [x, y] of [[1, 2], [14, 2], [15, 13], [0, 12], [8, 0]]) p.set(x, y, '#fff3a6'); return p.canvas(); })(),
    apfel: apple().canvas(),
    heiltrank: bottle('#e83b3b', '#a82030').canvas(),
    grosstrank: bottle('#ffd23f', '#d99a1a').canvas(),
    moorkraut: herb().canvas(),
    kompass: compass().canvas(),
    kristall: crystalIcon().canvas(),
    eisenerz: ore('#7a5a4a', '#c46a3a', '#e8a070').canvas(),
    sternenerz: ore('#3a3a5a', '#fff7a0', '#c8a8ff').canvas(),
    schluessel: keyIcon().canvas(),
    schwert: swordPix('schwert').canvas(),
    kristallklinge: swordPix('kristallklinge').canvas(),
    grubenlampe: lamp().canvas(),
  };
  return {
    icons,
    coinFrames: [0, 1, 2, 1].map((f) => coinIcon(f).canvas()),
    hearts: { full: heartIcon('full').canvas(), half: heartIcon('half').canvas(), empty: heartIcon('empty').canvas() },
    sword: { schwert: swordPix('schwert', 6).canvas(), kristallklinge: swordPix('kristallklinge', 8).canvas() },
  };
}
