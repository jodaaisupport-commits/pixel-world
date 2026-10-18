// Sonnenwüste mit der Oase Sandrast, die beiden Oasen-Häuser und die Ruinen des Sonnentempels.
import { createMap, T, SOLID_TILES } from '../map.js';
import { TS } from '../pix.js';
import { makeValueNoise, fbm } from '../noise.js';
import { room, wallDecal } from './interiors.js';

/** Hilfen */
const freeRect = (m, x, y, w, h, ok = () => true) => {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++)
    if (!m.inb(xx, yy) || m.occupied[m.idx(xx, yy)] || SOLID_TILES.has(m.get(xx, yy)) || !ok(m.get(xx, yy))) return false;
  return true;
};
function placeNear(m, sprite, x, y, w = 1, h = 1, solidFrom = 0, ok = () => true, extra = {}) {
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (freeRect(m, x + dx, y + dy, w, h, ok)) return m.place(sprite, x + dx, y + dy, w, h, solidFrom, extra);
  }
  return null;
}

// Wichtige Orte (Tiles)
export const OASIS = { x: 45, y: 15 };
export const GASTHAUS = { x: 49, y: 6 };   // adobe1, 5x4
export const LADEN = { x: 36, y: 6 };      // adobe0, 5x4
export const RUIN_DOOR = { x: 13, y: 5 };

// ============================================================ Sonnenwüste
export function wueste() {
  const W = 80, H = 56, seed = 31337;
  const m = createMap({
    id: 'wueste', name: 'Sonnenwüste', W, H, fill: T.DUNE, seed,
    styles: { cliff: 'canyon' },
    ambience: { particles: 'sand', tint: 'rgba(255,226,190,0.22)' },
  });
  m.bg = '#4a2414';
  const n = makeValueNoise(seed), n2 = makeValueNoise(seed + 7);
  const keep = new Uint8Array(W * H); // keine Deko/Klippen
  const mark = (x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (m.inb(x, y)) keep[m.idx(x, y)] = 1; };
  // Grundboden: Dünen mit helleren Sandflächen, Schluchtwände am Rand und als Tafelberge
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = fbm(n, x / 8, y / 8, 3), edge = Math.min(x, y, W - 1 - x, H - 1 - y);
    let t = fbm(n2, x / 6, y / 6, 2) > 0.62 ? T.SAND : T.DUNE;
    if (edge < 2 || (e > 0.69 && y > 22)) t = T.CLIFF;
    m.set(x, y, t);
  }
  // Nordwest: Plateau der Sonnentempel-Ruinen (Felswand mit Eingang), Ruinenhof, Treibsandfeld
  for (let y = 0; y <= 5; y++) for (let x = 0; x <= 27; x++) m.set(x, y, T.CLIFF);
  for (let y = 6; y <= 11; y++) for (let x = 2; x <= 25; x++) m.set(x, y, (x + y) % 7 === 0 || fbm(n2, x / 3, y / 3, 2) > 0.55 ? T.RUIN : T.DUNE);
  for (let y = 12; y <= 19; y++) for (let x = 2; x <= 25; x++) {
    const wob = (fbm(n, x / 4, y / 4 + 9, 2) - 0.5) * 2.2;
    m.set(x, y, y + wob > 12.6 && y + wob < 19 ? T.QSAND : T.DUNE);
  }
  // Tafelberg östlich davon (verhindert das Umgehen des Treibsands)
  for (let y = 0; y <= 23; y++) for (let x = 26; x <= 31; x++) {
    const d = x - 26 + (fbm(n, x / 3, y / 3, 2) - 0.5) * 2;
    if (y < 21 || d > 1) m.set(x, y, T.CLIFF);
  }
  // Oase Sandrast: Teich, Gras, Palmen
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - OASIS.x) / 4.6, (y - OASIS.y) / 3.2) + (fbm(n, x / 2.5, y / 2.5, 2) - 0.5) * 0.35;
    const g = Math.hypot((x - OASIS.x) / 10, (y - OASIS.y - 1) / 7.5);
    if (d < 0.55) m.set(x, y, T.DEEP); else if (d < 1) m.set(x, y, T.WATER);
    else if (d < 1.25) m.set(x, y, T.SAND);
    else if (g < 1 && y > 2 && x > 32) m.set(x, y, fbm(n2, x / 3, y / 3, 2) > 0.6 ? T.FLOWER : T.GRASS);
  }
  for (let y = 2; y <= 22; y++) for (let x = 32; x <= 60; x++) if (m.get(x, y) === T.CLIFF) m.set(x, y, T.DUNE);
  for (let y = 2; y <= 11; y++) for (let x = 33; x <= 56; x++) if (m.get(x, y) === T.CLIFF || (y < 4)) m.set(x, y, y < 4 ? T.CLIFF : T.DUNE);
  for (let x = 32; x <= 58; x++) for (let y = 0; y <= 3; y++) m.set(x, y, T.CLIFF);
  mark(32, 4, 60, 23);
  // Karawanenpfad: vom Westwald (Ostrand) zur Oase, weiter nach Süden in die Rote Schlucht
  const path = (pts, w = 2) => {
    for (let s = 0; s < pts.length - 1; s++) {
      const [ax, ay] = pts[s], [bx, by] = pts[s + 1], len = Math.hypot(bx - ax, by - ay);
      for (let t = 0; t <= len; t += 0.25) {
        const px = ax + (bx - ax) * t / len, py = ay + (by - ay) * t / len + (fbm(n, px / 7, 3, 2) - 0.5) * 1.5;
        for (let dy = 0; dy < w; dy++) for (let dx = 0; dx < w; dx++) {
          const x = Math.floor(px) + dx, y = Math.floor(py) + dy;
          if (!m.inb(x, y)) continue;
          const g = m.get(x, y);
          if (g !== T.WATER && g !== T.DEEP && g !== T.GRASS && g !== T.FLOWER) m.set(x, y, T.SAND);
          mark(x - 1, y - 1, x + 1, y + 1);
        }
      }
    }
  };
  path([[W, 28], [66, 27], [56, 22], [48, 20]]);
  path([[44, 20], [38, 26], [30, 31], [20, 30], [14, 22]]);
  path([[48, 21], [52, 32], [46, 42], [36, 46]]);
  path([[38, 10], [38, 12], [45, 19]], 1); path([[51, 10], [51, 12], [47, 19]], 1);
  // Schluchtränder säubern: zu dünne Felsstücke entfernen (Front braucht >= 3 Tiles)
  for (let pass = 0; pass < 2; pass++) for (let x = 0; x < W; x++) {
    let y = 0;
    while (y < H) {
      if (m.get(x, y) !== T.CLIFF) { y++; continue; }
      let y2 = y; while (y2 < H && m.get(x, y2) === T.CLIFF) y2++;
      if (y2 - y < 3 && y2 < H && y > 0) for (let k = y; k < y2; k++) m.set(x, k, T.DUNE);
      y = y2;
    }
  }
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++)
    if (m.get(x, y) === T.CLIFF && m.get(x - 1, y) !== T.CLIFF && m.get(x + 1, y) !== T.CLIFF) m.set(x, y, T.DUNE);
  // Ostrand-Durchgang zum Westwald
  for (let y = 26; y <= 30; y++) for (let x = W - 3; x < W; x++) m.set(x, y, y === 26 || y === 30 ? T.DUNE : T.SAND);
  m.exit(W - 1, 27, 1, 3, 'village', 1.5, 22.5, 'right');
  m.spawn = { x: (W - 3) * TS + 8, y: 28 * TS + 12 };
  m.place('sign', W - 6, 25);
  m.interact.push({ x: W - 6, y: 25, text: 'Sonnenwüste. ← Oase Sandrast (1 Tagesmarsch … oder 30 Sekunden)  |  → Pixeldorf' });

  // ---- Oase Sandrast
  m.place('adobe1', GASTHAUS.x, GASTHAUS.y, 5, 4, 1);
  m.exit(GASTHAUS.x + 2, GASTHAUS.y + 3, 1, 1, 'oase_gasthaus', 6, 8, 'up', 'door');
  m.place('adobe0', LADEN.x, LADEN.y, 5, 4, 1);
  m.exit(LADEN.x + 2, LADEN.y + 3, 1, 1, 'oase_laden', 6, 8, 'up', 'door');
  m.place('sign', GASTHAUS.x - 1, GASTHAUS.y + 4);
  m.interact.push({ x: GASTHAUS.x - 1, y: GASTHAUS.y + 4, text: 'Gasthaus „Zur Kühlen Quelle“ – Tee, Betten, Geschichten. Inhaber: Kadir.' });
  m.place('sign', LADEN.x + 5, LADEN.y + 4);
  m.interact.push({ x: LADEN.x + 5, y: LADEN.y + 4, text: 'Nuris Basar – Alles, was man in der Wüste braucht. Und vieles, was nicht. Keine Rückgabe!' });
  m.place('stall', 41, 11, 3, 1);
  m.interact.push({ x: 42, y: 11, text: 'Ein Marktstand voller Datteln, Gewürze und bunter Tücher. „Bitte drinnen bezahlen – Nuri“' });
  m.place('well', 55, 15, 2, 2);
  m.interact.push({ x: 55.5, y: 16, text: 'Ein tiefer Brunnen. Das Wasser ist eiskalt – mitten in der Wüste.' });
  for (const [x, y] of [[39, 13], [51, 13], [40, 18], [50, 18], [44, 11], [53, 19], [37, 16], [56, 12]]) placeNear(m, 'palm' + ((x + y) % 2), x, y, 1, 1, 0, (t) => t === T.GRASS || t === T.SAND || t === T.FLOWER);
  m.place('lamp', 47, 11); m.place('lamp', 43, 20);
  // Selmas Lager (ab Kapitel 2)
  m.place('tent', 57, 19, 2, 1, 0, { showIf: 'a2_selma_gone' });
  m.place('campfire', 60, 21, 1, 1, 0, { showIf: 'a2_selma_gone' });
  m.light(60 * TS + 8, 21 * TS + 8, 50, 'rgba(255,170,80,0.55)', 0.8); m.lights[m.lights.length - 1].showIf = 'a2_selma_gone';
  m.npcs.push({ id: 'selma', x: 59, y: 22, mode: 'wander', home: [57, 21, 61, 23], speed: 14, showIf: 'a2_selma_gone' });

  // ---- Ruinenhof & Tempeleingang
  m.decal('ruin_entrance', (RUIN_DOOR.x - 1) * TS, 6 * TS - 40);
  m.exit(RUIN_DOOR.x, RUIN_DOOR.y, 1, 1, 'ruinen', 16.5, 37.5, 'up', 'door');
  for (const [x, y, v] of [[5, 7, 0], [9, 8, 1], [19, 7, 0], [23, 9, 1], [4, 10, 1]]) placeNear(m, 'ruinpillar' + v, x, y, 1, 1, 0, (t) => t !== T.QSAND);
  placeNear(m, 'ruinblock', 16, 9, 2, 1, 0, (t) => t !== T.QSAND);
  m.place('obelisk', 10, 6); m.place('obelisk', 16, 6);
  m.light(RUIN_DOOR.x * TS + 8, 5 * TS, 30, 'rgba(255,210,90,0.35)');
  m.place('sign', 22, 21);
  m.interact.push({ x: 22, y: 21, text: 'WARNUNG: Treibsand! Wer einsinkt, kommt nicht weit. Sandläufer-Stiefel gibt es bei Nuri. (Unbezahlte Werbung)' });
  // Sonnenkopf und Obelisken in der Wüste
  placeNear(m, 'sunhead', 16, 34, 3, 2, 1, (t) => t === T.DUNE || t === T.SAND);
  m.interact.push({ x: 17, y: 35, text: 'Ein riesiger Steinkopf, halb im Sand versunken. Seine Augen sind aus Bernstein – sie scheinen dir zu folgen.' });
  for (const [x, y] of [[64, 36], [8, 28], [58, 47], [24, 48]]) placeNear(m, 'obelisk', x, y, 1, 1, 0, (t) => t === T.DUNE);
  // Deko: Kakteen, tote Büsche, Felsen, Schädel, Windrippeln, Fußspuren
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = m.idx(x, y), t = m.get(x, y), h = m.hash(x, y, 3);
    if (keep[i] || m.occupied[i]) continue;
    if ((t === T.DUNE || t === T.SAND) && y > 20) {
      if (h < 0.018 && freeRect(m, x - 1, y - 1, 2, 2)) m.place('cactus0', x, y);
      else if (h < 0.03) m.place('cactus1', x, y);
      else if (h < 0.038) m.place('deadbush', x, y, 1, 1, 99);
      else if (h < 0.05) m.place('rock' + (h < 0.044 ? 0 : 1), x, y);
      else if (h > 0.985) m.decal('skull', x * TS + 2, y * TS + 5);
      else if (h > 0.94 && h < 0.96) m.decal('ripples', x * TS - 8, y * TS + 3);
    }
  }
  for (const [x, y] of [[70, 28], [62, 25], [58, 23]]) m.decal('footprints', x * TS, y * TS);
  // Wüstenrosen (Nebenquest), Truhen, Taler
  for (const [x, y] of [[8, 9], [6, 40], [64, 44], [40, 50], [70, 12]]) { const f = m.findFree(x, y, (t) => t === T.DUNE || t === T.SAND || t === T.RUIN); if (f) m.pickup('wuestenrose', f[0], f[1]); }
  { const f = m.findFree(22, 8, (t) => t === T.RUIN || t === T.DUNE); if (f) m.chest(f[0], f[1], [['taler', 25], ['dattel', 2]]); }
  { const f = m.findFree(70, 48, (t) => t === T.DUNE || t === T.SAND); if (f) m.chest(f[0], f[1], [['heiltrank', 1], ['taler', 15]]); }
  for (const [x, y] of [[30, 40], [60, 34], [12, 26]]) { const f = m.findFree(x, y, (t) => t === T.DUNE); if (f) m.pickup('taler', f[0], f[1], 3); }
  // Gegner (nicht in der Oase)
  const wild = (t, x, y) => (t === T.DUNE || t === T.SAND) && !keep[m.idx(x, y)] && y > 22;
  m.scatterEnemies('skorpion', 4, wild, 11);
  m.scatterEnemies('staubgeist', 3, (t, x, y) => wild(t, x, y) && x > 34, 12);
  m.scatterEnemies('sandwurm', 3, (t, x, y) => t === T.DUNE && y > 26 && !keep[m.idx(x, y)], 13);
  m.scatterEnemies('skorpion', 1, (t, x, y) => (t === T.RUIN || t === T.DUNE) && y >= 7 && y <= 10, 14);
  m.biomeAt = (tx, ty) => {
    const t = m.get(tx, ty);
    if (tx >= 33 && tx <= 60 && ty >= 4 && ty <= 23) return 'Oase Sandrast';
    if (t === T.QSAND) return 'Treibsandfeld';
    if (ty <= 11 && tx <= 26) return 'Ruinenhof des Sonnentempels';
    if (Math.hypot(tx - 17, ty - 35) < 6) return 'Tal des Steinkopfs';
    if (ty > 38) return 'Rote Schlucht';
    if (t === T.SAND) return 'Karawanenpfad';
    return 'Sonnenwüste';
  };
  return m.finalize([[RUIN_DOOR.x, RUIN_DOOR.y]]);
}

// ============================================================ Oasen-Häuser
function oase_gasthaus() {
  const m = room({ id: 'oase_gasthaus', name: 'Gasthaus „Zur Kühlen Quelle“', floor: 'wood', outside: [GASTHAUS.x + 2, GASTHAUS.y + 4], to: 'wueste' });
  m.decal('rug_blue', 5 * TS, 5 * TS);
  wallDecal(m, 'window', 3); wallDecal(m, 'window', 9); wallDecal(m, 'painting1', 6, 16);
  m.place('kegs', 1, 3, 2, 1);
  m.place('counter_v3', 9, 4, 1, 3);
  m.place('barrel', 11, 8); m.place('plant1', 11, 3); m.place('plant0', 1, 8);
  m.place('table_mugs', 3, 6, 2, 1); m.place('stool', 2, 6); m.place('stool', 5, 6);
  m.place('bed_blue', 4, 3, 1, 2); m.place('bed_red', 6, 3, 1, 2);
  m.light(6 * TS, 4 * TS, 60, 'rgba(255,200,120,0.4)', 0.6);
  m.npcs.push({ id: 'kadir', x: 10, y: 5, mode: 'stand', dir: 'left' });
  m.interact.push({ x: 4.5, y: 3, id: 'gasthausbett', text: 'Ein weiches Bett mit bunten Kissen.' });
  return m.finalize();
}
function oase_laden() {
  const m = room({ id: 'oase_laden', name: 'Nuris Basar', floor: 'wood', outside: [LADEN.x + 2, LADEN.y + 4], to: 'wueste' });
  m.decal('rug_red', 4.5 * TS, 6.5 * TS);
  m.place('shelf_goods', 1, 3, 2, 1); m.place('shelf_goods', 3, 3, 2, 1); m.place('shelf_books', 8, 3, 2, 1); m.place('shelf_goods', 10, 3, 2, 1);
  wallDecal(m, 'window', 6);
  m.place('counter_h4', 4, 5, 4, 1);
  m.place('sack', 1, 7); m.place('sack', 2, 8); m.place('crate', 11, 7); m.place('barrel', 11, 8); m.place('kegs', 9, 8, 2, 1);
  m.light(6 * TS + 8, 2 * TS + 8, 60, 'rgba(255,230,180,0.35)');
  m.npcs.push({ id: 'nuri', x: 6, y: 4, mode: 'wander', home: [5, 4, 7, 4], speed: 16 });
  return m.finalize();
}

// ============================================================ Sonnentempel (Ruinen, Mini-Boss)
export const KH_ARENA = { cx: 17 * TS, cy: 9 * TS + 8, rx: 12 * TS, ry: 6.6 * TS };
export const KH_RESPAWN = [17.5, 19];
export const KH_PILLARS = [[10, 6], [24, 6], [10, 12], [24, 12]];
export const RUIN_HOOKS = [{ a: [16, 24], b: [16, 18] }];
export function ruinen() {
  const W = 34, H = 40, seed = 4141;
  const m = createMap({
    id: 'ruinen', name: 'Sonnentempel', W, H, fill: T.CAVEWALL, seed, kind: 'cave',
    styles: { cavewall: 'sandstone' },
    ambience: { dark: 0.5, darkColor: '34,16,4', playerLight: 84, particles: 'dust' },
  });
  m.bg = '#120a04';
  const n = makeValueNoise(seed);
  const floor = (x, y, t = T.RUIN) => { if (x > 0 && y > 0 && x < W - 1 && y < H) m.set(x, y, t); };
  // Gang vom Eingang
  for (let y = 31; y < H; y++) for (let x = 15; x <= 18; x++) floor(x, y);
  // Vorhalle mit Seitenkammer (Enterhaken-Truhe)
  for (let y = 24; y <= 31; y++) for (let x = 6; x <= 27; x++) if (((x + 0.5 - 16.5) / 11) ** 2 + ((y + 0.5 - 27.5) / 4.6) ** 2 + (fbm(n, x / 3, y / 3, 2) - 0.5) * 0.3 < 1) floor(x, y);
  for (let y = 25; y <= 29; y++) for (let x = 2; x <= 7; x++) floor(x, y);
  for (let y = 26; y <= 28; y++) for (let x = 26; x <= 31; x++) floor(x, y);
  // Sandschlund (nur mit dem Enterhaken zu überwinden)
  for (let y = 20; y <= 23; y++) for (let x = 6; x <= 27; x++) floor(x, y, y === 20 || y === 23 ? T.RUIN : T.CHASM);
  for (let x = 6; x <= 27; x++) { floor(x, 21, T.CHASM); floor(x, 22, T.CHASM); }
  // Gang zur Arena
  for (let y = 16; y <= 20; y++) for (let x = 13; x <= 20; x++) floor(x, y);
  // Arena
  for (let y = 1; y < 17; y++) for (let x = 2; x < 32; x++) {
    const dx = (x + 0.5 - 17) / 13.4, dy = (y + 0.5 - 9) / 7.6;
    if (dx * dx + dy * dy + (fbm(n, x / 2.5, y / 2.5, 2) - 0.5) * 0.14 < 1) floor(x, y);
  }
  m.exit(16, H - 1, 2, 1, 'wueste', RUIN_DOOR.x + 0.5, RUIN_DOOR.y + 1.5, 'down', 'door');
  m.decal('stairs_up', 16 * TS, (H - 2) * TS);
  m.spawn = { x: 17 * TS, y: 37 * TS + 12 };
  // Seitenkammer: Truhe mit dem Enterhaken
  m.chest(3, 27, [['enterhaken', 1]]);
  m.light(3 * TS + 8, 27 * TS, 44, 'rgba(255,200,90,0.5)', 0.4);
  m.chest(30, 27, [['taler', 20], ['heiltrank', 1]]);
  // Haken-Pfähle über den Schlund
  for (const h of RUIN_HOOKS) {
    m.place('hookpost', h.a[0], h.a[1], 1, 1, 0, { hook: h.b });
    m.place('hookpost', h.b[0], h.b[1], 1, 1, 0, { hook: h.a });
  }
  m.interact.push({ x: 16, y: 24, id: 'hook', to: RUIN_HOOKS[0].b, text: 'Ein Pfahl mit einem Eisenring. Auf der anderen Seite des Schlunds steht ein zweiter.' });
  m.interact.push({ x: 16, y: 18, id: 'hook', to: RUIN_HOOKS[0].a, text: 'Ein Pfahl mit einem Eisenring.' });
  m.place('sign', 12, 24);
  m.interact.push({ x: 12, y: 24, text: 'Inschrift: »Nur wer sich an den Ringen der Sonne hält, überquert den Schlund des Vergessens.«' });
  // Sandtor der Arena + Pfeiler
  m.place('ruinpillar0', 13, 16, 1, 1); m.place('ruinpillar0', 20, 16, 1, 1);
  m.place('sandgate', 14, 16, 4, 1, 0, { showIf: 'a2_kh_lock' });
  m.place('sandgate', 16, 16, 4, 1, 0, { showIf: 'a2_kh_lock' });
  for (const [x, y] of KH_PILLARS) m.place('ruinpillar0', x, y, 1, 1);
  m.place('sunaltar', 16, 2, 2, 1, 0, { showIf: 'a2_khepran', hideIf: 'a2_sun' });
  m.place('sunaltar_empty', 16, 2, 2, 1, 0, { showIf: 'a2_sun' });
  m.interact.push({ x: 16.5, y: 2, id: 'sunaltar', text: 'Ein Altar mit einer goldenen Sonnenscheibe.' });
  m.light(17 * TS, 2 * TS, 70, 'rgba(255,220,110,0.55)', 0.3); m.lights[m.lights.length - 1].showIf = 'a2_khepran';
  for (const [x, y] of [[4, 9], [30, 9], [9, 3], [25, 3], [9, 15], [25, 15]]) if (m.get(x, y) === T.RUIN) m.light(x * TS + 8, y * TS, 40, 'rgba(255,170,70,0.5)', 1);
  for (const [x, y] of [[7, 26], [26, 30], [15, 34], [18, 32]]) if (m.get(x, y) === T.RUIN) m.place('ruinpillar1', x, y);
  for (const [x, y] of [[10, 28], [22, 26], [17, 35]]) m.decal('skull', x * TS, y * TS + 4);
  m.decal('runecircle', KH_ARENA.cx - 56, KH_ARENA.cy - 38);
  m.enemy('skorpion', 9, 27); m.enemy('skorpion', 23, 29); m.enemy('staubgeist', 16, 26);
  m.biomeAt = (tx, ty) => (ty <= 16 ? 'Sonnenhalle' : ty <= 23 ? 'Schlund des Vergessens' : ty <= 31 ? 'Vorhalle' : 'Sonnentempel');
  return m.finalize();
}

export const WUESTE_MAPS = { wueste, oase_gasthaus, oase_laden, ruinen };
