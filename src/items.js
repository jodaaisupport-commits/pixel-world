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
  sprengpulver: { name: 'Sprengpulver', type: 'quest', desc: 'Erwins letztes Fässchen Sprengpulver. Damit lässt sich Geröll wegsprengen. Nicht schütteln!' },
  kristallherz: { name: 'Splitter des Kristallherzens', type: 'quest', desc: 'Ein warm leuchtender, blauer Splitter. Erinnerung an den Sieg über Umbrakor.' },
  grubenlampe: { name: 'Grubenlampe', type: 'equip', slot: 'lamp', desc: 'Erwins alte Lampe. In Höhlen siehst du deutlich weiter.' },
  // ---- Zweite Geschichte „Die Sternensplitter“
  karte: { name: 'Karte der Westlande', type: 'quest', desc: 'Selmas Karte, noch voller weißer Flecken. Ganz im Westen hat sie eine Sonne gemalt und ein Fragezeichen.' },
  dattel: { name: 'Datteln', type: 'use', heal: 4, price: 8, desc: 'Süß und klebrig, frisch aus der Oase. Stellen 2 Herzen wieder her.' },
  sandlaeufer: { name: 'Sandläufer', type: 'equip', slot: 'boots', price: 60, desc: 'Breite Wüstenstiefel mit Flechtsohle. Damit sinkst du im Treibsand nicht ein.' },
  enterhaken: { name: 'Enterhaken', type: 'equip', slot: 'hook', desc: 'Ein Wurfhaken an langer Kette. An Pfählen mit Eisenring (E) ziehst du dich über Abgründe.' },
  steigeisen: { name: 'Steigeisen', type: 'equip', slot: 'grip', desc: 'Frostbarts alte Steigeisen. Auf Eis rutschst du nicht mehr aus.' },
  sonnensplitter: { name: 'Sonnensplitter', type: 'quest', desc: 'Ein goldener Sternensplitter aus dem Sonnentempel. Er ist warm wie ein Sommertag.' },
  frostsplitter: { name: 'Frostsplitter', type: 'quest', desc: 'Ein eisblauer Sternensplitter aus der Eisgrotte. Er beschlägt, wenn man ihn anhaucht.' },
  schiffsteer: { name: 'Schiffsteer', type: 'quest', price: 30, desc: 'Ein Topf zäher, schwarzer Teer. Damit lässt sich ein Boot abdichten.' },
  wuestenrose: { name: 'Wüstenrose', type: 'quest', desc: 'Eine Blüte aus Sandkristall. Kadir sammelt sie für seine Gäste.' },
  eiskristall: { name: 'Eiskristall', type: 'material', desc: 'Ein Kristall, der niemals schmilzt. Frostbart kann damit etwas anfangen.' },
  gezeitenperle: { name: 'Perle der Gezeiten', type: 'quest', desc: 'Thalassas Herz, gereinigt. In ihr rauscht leise das Meer.' },
};
/** Ausrüstungs-Slots für Werkzeuge (Zustand in state[slot] = true). */
export const TOOL_SLOTS = { boots: 'sandlaeufer', hook: 'enterhaken', grip: 'steigeisen' };

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
function powder() {
  const p = new Pix(16, 16);
  p.rect(3, 5, 10, 9, '#8c5e36'); p.hline(3, 12, 5, '#b07e4c'); p.hline(3, 12, 13, '#3d2516');
  p.hline(3, 12, 7, '#4a4a52'); p.hline(3, 12, 11, '#4a4a52'); p.vline(3, 5, 13, '#664226');
  p.rect(6, 8, 4, 2, '#e8dcc2'); p.set(7, 8, '#20161a'); p.set(8, 9, '#20161a');
  p.vline(8, 2, 4, '#c9b89a'); p.set(9, 1, '#ffb83a'); p.set(9, 0, '#fff1a6'); p.set(10, 1, '#ff7a2a');
  return p.outlined('#1a1410');
}
function heartShard() {
  const p = new Pix(16, 16);
  for (let y = 1; y < 15; y++) { const w = y < 6 ? y * 0.9 : (15 - y) * 0.55; for (let x = Math.round(8 - w); x <= Math.round(8 + w); x++) p.set(x, y, x < 7 ? '#bfeaff' : x === 7 || x === 8 ? '#ffffff' : '#3a8ad0'); }
  p.set(3, 3, '#fff7d0'); p.set(13, 5, '#fff7d0');
  return p.outlined('#0c1a2a');
}
function lamp() {
  const p = new Pix(16, 16);
  p.hline(6, 10, 1, '#4a4440'); p.set(5, 2, '#4a4440'); p.set(11, 2, '#4a4440');
  p.rect(5, 4, 7, 2, '#6a5a3a'); p.rect(5, 6, 7, 6, '#ffe08a'); p.rect(7, 7, 3, 4, '#fff7d0');
  p.vline(5, 6, 11, '#8a7a5a'); p.vline(11, 6, 11, '#8a7a5a'); p.rect(4, 12, 9, 2, '#6a5a3a');
  return p.outlined('#1a1410');
}

function bootsIcon() {
  const p = new Pix(16, 16);
  p.rect(4, 3, 5, 8, '#a06a3a'); p.rect(4, 10, 9, 4, '#a06a3a'); p.hline(4, 12, 13, '#5a3a20'); p.hline(3, 13, 14, '#d9b860');
  p.vline(4, 3, 12, '#7a4a2a'); p.hline(4, 8, 3, '#c98a5a'); for (let y = 5; y < 10; y += 2) p.hline(5, 8, y, '#e8d090');
  return p.outlined('#2a1a10');
}
function hookIcon() {
  const p = new Pix(16, 16);
  for (let i = 0; i < 6; i++) { p.set(2 + i, 13 - i, i % 2 ? '#6a6a76' : '#9a9aa8'); }
  p.vline(9, 2, 8, '#c8c8d2'); p.vline(10, 2, 8, '#8a8a96');
  p.set(7, 3, '#c8c8d2'); p.set(6, 4, '#c8c8d2'); p.set(12, 3, '#c8c8d2'); p.set(13, 4, '#c8c8d2'); p.hline(7, 12, 2, '#e8e8f0');
  return p.outlined('#16161c');
}
function crampons() {
  const p = new Pix(16, 16);
  p.rect(3, 6, 10, 4, '#5a6a7a'); p.hline(3, 12, 6, '#8a9aaa');
  for (let x = 3; x < 13; x += 2) { p.vline(x, 10, 13, '#c8d2dc'); p.set(x, 14, '#ffffff'); }
  p.rect(5, 3, 6, 3, '#7a4a2a');
  return p.outlined('#16161c');
}
function shard(c0, c1, c2) {
  const p = new Pix(16, 16);
  for (let y = 1; y < 15; y++) { const w = y < 6 ? y * 0.8 : (15 - y) * 0.5; for (let x = Math.round(8 - w); x <= Math.round(8 + w); x++) p.set(x, y, x < 7 ? c0 : x < 9 ? c1 : c2); }
  p.set(3, 4, '#ffffff'); p.set(12, 8, '#ffffff');
  return p.outlined('#1a1410');
}
function pearl() { const p = new Pix(16, 16); p.ellipse(8, 9, 5, 5, '#c8b8e8'); p.ellipse(8, 8, 4, 4, '#f0e8ff'); p.ellipse(6, 6, 1.5, 1.5, '#ffffff'); return p.outlined('#2a2040'); }
function tar() { const p = new Pix(16, 16); p.rect(3, 5, 10, 9, '#4a4a52'); p.hline(3, 12, 5, '#6a6a76'); p.ellipse(8, 5, 5, 1.6, '#16161c'); p.set(10, 4, '#4a4a60'); p.vline(5, 6, 13, '#3a3a44'); return p.outlined('#0a0a0e'); }
function rose() { const p = new Pix(16, 16); for (const [x, y, r] of [[8, 9, 4], [5, 8, 2.5], [11, 8, 2.5], [8, 5, 2.5]]) p.ellipse(x, y, r, r * 0.7, '#d9a872'); p.ellipse(8, 8, 2, 1.5, '#f0d0a0'); p.set(7, 7, '#ffffff'); return p.outlined('#4a3020'); }
function iceCrystal() { const p = new Pix(16, 16); for (const [x, t] of [[8, 2], [5, 6], [11, 5]]) for (let y = t; y < 14; y++) { p.set(x, y, '#bfe6f6'); p.set(x + 1, y, '#5a9cc4'); } p.set(8, 2, '#ffffff'); return p.outlined('#1a2a3a'); }
function dates() { const p = new Pix(16, 16); for (const [x, y] of [[5, 7], [9, 6], [7, 10], [11, 10]]) { p.ellipse(x, y, 2.2, 3, '#7a3a1a'); p.set(x - 1, y - 1, '#b0603a'); } p.vline(8, 1, 5, '#6a8a3a'); return p.outlined('#2a1008'); }
function mapIcon() { const p = new Pix(16, 16); p.rect(2, 3, 12, 10, '#e8d8b0'); for (let x = 2; x < 14; x += 4) p.vline(x, 3, 12, '#c8b890'); p.set(11, 5, '#ffb83a'); p.set(12, 5, '#ffb83a'); p.set(11, 6, '#ffb83a'); p.hline(4, 9, 9, '#a85a32'); p.set(5, 7, '#3a7a9a'); return p.outlined('#3a2a1a'); }

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
    sprengpulver: powder().canvas(),
    kristallherz: heartShard().canvas(),
    karte: mapIcon().canvas(), dattel: dates().canvas(), sandlaeufer: bootsIcon().canvas(), enterhaken: hookIcon().canvas(),
    steigeisen: crampons().canvas(), sonnensplitter: shard('#fff1a6', '#ffffff', '#ffb83a').canvas(), frostsplitter: shard('#e0f8ff', '#ffffff', '#5ab8e8').canvas(),
    schiffsteer: tar().canvas(), wuestenrose: rose().canvas(), eiskristall: iceCrystal().canvas(), gezeitenperle: pearl().canvas(),
    speer: swordPix('schwert').canvas(), bogen: (() => { const p = new Pix(16,16); p.rect(3,2,2,12,'#8a5a2a'); p.vline(12,3,12,'#cfc2a8'); p.hline(5,3,12,'#e8dcc2'); p.hline(5,12,12,'#e8dcc2'); return p.outlined('#20161a').canvas(); })(),
    schild: (() => { const p = new Pix(16,16); p.ellipse(8,9,6,7,'#8a6a3a'); p.ellipse(8,9,4,5,'#c9a86a'); p.vline(8,4,14,'#ffe14d'); return p.outlined('#20161a').canvas(); })(),
    saat: (() => { const p = new Pix(16,16); for (const [x,y] of [[5,8],[8,6],[11,9],[7,11]]) p.ellipse(x,y,1.5,2,'#6a8a3a'); return p.outlined('#203010').canvas(); })(),
    karotte: (() => { const p = new Pix(16,16); p.ellipse(8,10,3,5,'#e07030'); p.vline(8,3,6,'#5a8a2a'); return p.outlined('#401808').canvas(); })(),
    muschel: (() => { const p = new Pix(16,16); p.ellipse(8,10,6,4,'#f0d8c0'); p.ellipse(8,9,4,3,'#fff6e8'); return p.outlined('#4a3020').canvas(); })(),
    gluehpilz: (() => { const p = new Pix(16,16); p.ellipse(8,7,5,4,'#a0ff80'); p.rect(7,9,3,5,'#e8dcc2'); return p.outlined('#203010').canvas(); })(),
    obsidian: ore('#1a1a22','#4a4a5a','#8a8aaa').canvas(),
    perle: pearl().canvas(),
    obsidianschwert: swordPix('kristallklinge').canvas(),
    helm_leder: (() => { const p = new Pix(16,16); p.ellipse(8,8,6,5,'#8a5a2a'); return p.outlined('#20100a').canvas(); })(),
    ruestung_leder: (() => { const p = new Pix(16,16); p.rect(4,4,8,10,'#8a5a2a'); return p.outlined('#20100a').canvas(); })(),
    amulett_glueck: (() => { const p = new Pix(16,16); p.ellipse(8,10,3,3,'#ffe14d'); p.vline(8,3,8,'#cfc2a8'); return p.outlined('#402000').canvas(); })(),
    skin_rot: (() => { const p = new Pix(16,16); p.rect(4,4,8,10,'#c8423a'); return p.outlined('#20161a').canvas(); })(),
    skin_blau: (() => { const p = new Pix(16,16); p.rect(4,4,8,10,'#3a7ac8'); return p.outlined('#20161a').canvas(); })(),
  };
  return {
    icons,
    coinFrames: [0, 1, 2, 1].map((f) => coinIcon(f).canvas()),
    hearts: { full: heartIcon('full').canvas(), half: heartIcon('half').canvas(), empty: heartIcon('empty').canvas() },
    sword: { schwert: swordPix('schwert', 6).canvas(), kristallklinge: swordPix('kristallklinge', 8).canvas(), speer: swordPix('schwert', 9).canvas(), bogen: swordPix('schwert', 5).canvas(), obsidianschwert: swordPix('kristallklinge', 8).canvas() },
  };
}
