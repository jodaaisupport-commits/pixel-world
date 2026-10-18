// Chiptune-Musik: Track-Definitionen (Melodie von Hand, Bass/Arpeggio aus Akkorden generiert).
// Format: ein Token pro Schritt (Achtel), '.' = Pause, '-' = vorherige Note halten, '|' wird ignoriert.

export const TRACKS = {
  village: {
    name: 'Pixeldorf', bpm: 112, steps: 8,
    chords: 'C G Am F C G F G',
    lead: { inst: 'pulse25', vol: 0.15, vib: 0.004, notes: `
      E5 - G5 - C6 - B5 A5 | G5 - - - D5 - - . | A5 - C6 - E6 - D6 C6 | C6 - A5 - F5 - - . |
      E5 F5 G5 - E5 - C5 - | D5 E5 F5 - D5 - B4 - | C5 - A5 - G5 - F5 - | E5 - D5 - G4 - - .` },
    bass: { inst: 'triangle', vol: 0.32, style: 'bounce', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.045, style: 'up', oct: 4 },
    drums: 'k . h . s . h h',
  },
  night: {
    name: 'Pixeldorf bei Nacht', bpm: 80, steps: 8,
    chords: 'C G Am F C G F G',
    lead: { inst: 'triangle', vol: 0.2, vib: 0.006, notes: `
      E5 - G5 - C6 - B5 A5 | G5 - - - D5 - - . | A5 - C6 - E6 - D6 C6 | C6 - A5 - F5 - - . |
      E5 F5 G5 - E5 - C5 - | D5 E5 F5 - D5 - B4 - | C5 - A5 - G5 - F5 - | E5 - D5 - G4 - - .` },
    bass: { inst: 'triangle', vol: 0.26, style: 'half', oct: 2 },
    arp: { inst: 'sine', vol: 0.05, style: 'pad', oct: 4 },
    drums: '. . h . . . h .', drumVol: 0.4, echo: 0.32,
  },
  forest: {
    name: 'Dunkelwald', bpm: 88, steps: 8,
    chords: 'Dm C Bb A Dm C Gm A',
    lead: { inst: 'triangle', vol: 0.22, vib: 0.007, notes: `
      D5 - - F5 A5 - - - | G5 - E5 - C5 - - - | F5 - D5 - Bb4 - - C5 | C#5 - - - A4 - - . |
      A5 - G5 F5 E5 - D5 - | E5 - G5 - A5 - G5 - | Bb5 - A5 G5 F5 - D5 - | E5 - C#5 - A4 - - .` },
    bass: { inst: 'triangle', vol: 0.3, style: 'drone', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.04, style: 'updown', oct: 4 },
    drums: 'k . . . . . h .', drumVol: 0.5, echo: 0.38,
  },
  mountain: {
    name: 'Graufels-Berge', bpm: 100, steps: 8,
    chords: 'Am F C G Am F G E',
    lead: { inst: 'pulse25', vol: 0.14, vib: 0.005, notes: `
      A4 - E5 - A5 - - G5 | F5 - E5 - C5 - - . | E5 - G5 - C6 - B5 G5 | D6 - - - B5 - G5 - |
      A5 - B5 - C6 - B5 A5 | F5 - A5 - C6 - A5 F5 | G5 - B5 - D6 - C6 B5 | G#5 - - - E5 - - .` },
    bass: { inst: 'pulse50', vol: 0.12, style: 'pump', oct: 2 },
    arp: { inst: 'saw', vol: 0.035, style: 'pad', oct: 3 },
    drums: 'k . h k s . h t',
  },
  cave: {
    name: 'Kristallhöhle', bpm: 70, steps: 8,
    chords: 'Em Em C C Am Am B B',
    lead: { inst: 'sine', vol: 0.2, vib: 0.008, notes: `
      E5 - - - - - B4 - | G5 - - - F#5 - - - | E5 - - - - - G5 - | C5 - - - - - - . |
      A4 - - - C5 - E5 - | D5 - - - - - C5 - | B4 - - - D#5 - - - | F#5 - - - - - - .` },
    bass: { inst: 'triangle', vol: 0.3, style: 'drone', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.03, style: 'sparse', oct: 4 },
    drums: '. . . . . . d .', drumVol: 0.6, echo: 0.48,
  },
  beach: {
    name: 'Möwenbucht', bpm: 104, steps: 8, swing: 0.12,
    chords: 'F Bb C F Dm Bb C F',
    lead: { inst: 'pulse25', vol: 0.14, vib: 0.003, notes: `
      A5 . C6 A5 . F5 G5 . | Bb5 - . D6 - . C6 Bb5 | G5 . E5 G5 . C6 - . | A5 - - - F5 - - . |
      D6 . C6 A5 . F5 A5 . | Bb5 . A5 G5 . F5 D5 . | E5 . G5 C6 . Bb5 G5 . | F5 - - - . . . .` },
    bass: { inst: 'triangle', vol: 0.32, style: 'calypso', oct: 2 },
    arp: { inst: 'triangle', vol: 0.07, style: 'stab', oct: 4 },
    drums: 'k . h k s . h h', drumVol: 0.7,
  },
  tavern: {
    name: 'Zum Goldenen Krug', bpm: 138, steps: 6,
    chords: 'G C D G Em C D G',
    lead: { inst: 'pulse25', vol: 0.14, vib: 0.004, notes: `
      D5 G5 B5 - A5 G5 | E5 - G5 - E5 C5 | D5 F#5 A5 - G5 F#5 | G5 - - - D5 - |
      E5 G5 B5 - A5 G5 | C6 - B5 A5 G5 E5 | F#5 - A5 - D6 C6 | B5 - G5 - - .` },
    bass: { inst: 'triangle', vol: 0.32, style: 'waltz', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.05, style: 'waltz', oct: 4 },
    drums: 'k . h . h .', drumVol: 0.6,
  },
  boss: {
    name: 'Umbrakor', bpm: 152, steps: 8,
    chords: 'Em Em C D Em Em C B',
    lead: { inst: 'pulse25', vol: 0.13, vib: 0.003, notes: `
      E5 - E5 G5 - E5 B5 - | A5 G5 F#5 - E5 - D5 - | E5 - E5 G5 - C6 B5 - | A5 - F#5 - D5 - F#5 A5 |
      B5 - B5 D6 - B5 E6 - | D6 C6 B5 - A5 - G5 - | C6 - B5 - A5 - G5 - | F#5 - D#5 - B4 - D#5 F#5` },
    bass: { inst: 'saw', vol: 0.09, style: 'drive', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.04, style: 'up', oct: 4 },
    drums: 'k h s h k k s h', drumVol: 0.9,
  },
  ending: {
    name: 'Abspann', bpm: 92, steps: 8,
    chords: 'G D Em C G D C G',
    lead: { inst: 'pulse25', vol: 0.13, vib: 0.006, notes: `
      B4 - D5 - G5 - - A5 | F#5 - - - D5 - - - | E5 - G5 - B5 - A5 G5 | E5 - - - C5 - - - |
      D5 - G5 - B5 - D6 - | C6 - B5 - A5 - F#5 - | G5 - E5 - C6 - B5 A5 | G5 - - - - - . .` },
    bass: { inst: 'triangle', vol: 0.3, style: 'half', oct: 2 },
    arp: { inst: 'triangle', vol: 0.06, style: 'updown', oct: 4 },
    drums: 'k . h . s . h .', drumVol: 0.6, echo: 0.25,
  },

  // ---- Zweite Geschichte
  desert: {
    name: 'Sonnenwüste', bpm: 96, steps: 8,
    chords: 'A Bb A Gm A Bb Gm A',
    lead: { inst: 'pulse25', vol: 0.13, vib: 0.008, notes: `
      A4 - C#5 - D5 - E5 - | F5 - E5 D5 - - C#5 - | D5 - C#5 Bb4 A4 - - . | G4 - Bb4 - D5 - - . |
      E5 - F5 E5 D5 - E5 - | F5 - G5 F5 E5 - D5 - | D5 - Bb4 - G4 - Bb4 D5 | C#5 - - - A4 - - .` },
    bass: { inst: 'triangle', vol: 0.3, style: 'bounce', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.04, style: 'sparse', oct: 4 },
    drums: 'k . t . k k s .', drumVol: 0.6, echo: 0.2,
  },
  oasis: {
    name: 'Oase Sandrast', bpm: 84, steps: 8, swing: 0.1,
    chords: 'Dm Gm C F Bb Gm A A',
    lead: { inst: 'triangle', vol: 0.2, vib: 0.006, notes: `
      A4 - D5 - F5 - E5 D5 | D5 - Bb4 - G4 - - . | E5 - G5 - C6 - Bb5 A5 | A5 - - - F5 - - . |
      F5 - D5 - Bb4 - D5 F5 | G5 - F5 - D5 - Bb4 - | C#5 - E5 - A5 - G5 - | E5 - C#5 - A4 - - .` },
    bass: { inst: 'triangle', vol: 0.3, style: 'calypso', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.045, style: 'waltz', oct: 4 },
    drums: 'k . h . . k h .', drumVol: 0.45,
  },
  frost: {
    name: 'Frosthöhen', bpm: 76, steps: 8,
    chords: 'Bm G D A Bm G Em F#',
    lead: { inst: 'sine', vol: 0.2, vib: 0.007, notes: `
      F#5 - - - B5 - - - | D6 - - - B5 - G5 - | A5 - - - F#5 - - D5 | E5 - - - - - . . |
      B4 - D5 - F#5 - B5 - | A5 - G5 - D5 - - . | G5 - - - E5 - B4 - | A#4 - - - C#5 - F#5 -` },
    bass: { inst: 'triangle', vol: 0.28, style: 'drone', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.04, style: 'updown', oct: 4 },
    drums: '. . h . . . h .', drumVol: 0.4, echo: 0.4,
  },
  icecave: {
    name: 'Eisgrotte', bpm: 64, steps: 8,
    chords: 'F#m D A E F#m D Bm C#',
    lead: { inst: 'sine', vol: 0.19, vib: 0.01, notes: `
      C#6 - - - - - A5 - | F#5 - - - D5 - - - | E5 - - - C#5 - - - | B4 - - - - - - . |
      A5 - - - C#6 - - - | D6 - - - A5 - F#5 - | B5 - - - D5 - - - | F5 - - - G#5 - - .` },
    bass: { inst: 'triangle', vol: 0.28, style: 'drone', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.03, style: 'sparse', oct: 5 },
    drums: '. . . . . . d .', drumVol: 0.5, echo: 0.52,
  },
  temple: {
    name: 'Gezeitentempel', bpm: 72, steps: 8,
    chords: 'Cm Ab Eb Bb Cm Ab Fm G',
    lead: { inst: 'triangle', vol: 0.2, vib: 0.009, notes: `
      G4 - C5 - Eb5 - D5 C5 | Ab4 - - - C5 - - . | Bb4 - Eb5 - G5 - F5 Eb5 | D5 - - - Bb4 - - . |
      C5 - Eb5 - G5 - Bb5 - | Ab5 - G5 - Eb5 - C5 - | F5 - Ab5 - C6 - Bb5 Ab5 | G5 - - - B4 - D5 -` },
    bass: { inst: 'triangle', vol: 0.3, style: 'drone', oct: 2 },
    arp: { inst: 'saw', vol: 0.03, style: 'pad', oct: 3 },
    drums: 'k . . . . . d .', drumVol: 0.5, echo: 0.45,
  },
  miniboss: {
    name: 'Khepran', bpm: 144, steps: 8,
    chords: 'Am Bb Am Bb Gm Gm A A',
    lead: { inst: 'pulse25', vol: 0.13, vib: 0.003, notes: `
      A4 A4 E5 - A4 A4 F5 E5 | D5 - F5 - Bb5 - A5 F5 | A4 A4 E5 - A4 A4 G5 F5 | E5 - D5 - F5 - Bb4 - |
      G4 - Bb4 - D5 - G5 - | F5 E5 D5 - Bb4 - D5 - | C#5 - E5 - A5 - G5 - | E5 - C#5 - A4 - E4 -` },
    bass: { inst: 'saw', vol: 0.09, style: 'drive', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.035, style: 'up', oct: 4 },
    drums: 'k h s h k h s s', drumVol: 0.85,
  },
  boss2: {
    name: 'Thalassa', bpm: 158, steps: 8,
    chords: 'Cm Cm Ab Bb Cm Cm Ab G',
    lead: { inst: 'pulse25', vol: 0.13, vib: 0.003, notes: `
      C5 - Eb5 G5 - C6 - Bb5 | G5 - Eb5 - F5 G5 - . | Ab5 - G5 Eb5 - C5 - Eb5 | D5 - F5 - Bb5 - Ab5 G5 |
      C6 - Bb5 G5 - Eb5 - G5 | F5 - Eb5 D5 - C5 - D5 | Eb5 - Ab5 - C6 - Eb6 - | D6 - B5 - G5 - D5 B4` },
    bass: { inst: 'saw', vol: 0.09, style: 'drive', oct: 2 },
    arp: { inst: 'pulse12', vol: 0.04, style: 'updown', oct: 4 },
    drums: 'k h s h k k s h', drumVol: 0.9, echo: 0.15,
  },
};

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
const midiFreq = (midi) => 440 * 2 ** ((midi - 69) / 12);
function parseChord(c) {
  const m = /^([A-G])([#b]?)(m|dim|sus)?(7)?$/.exec(c);
  const root = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const iv = m[3] === 'm' ? [0, 3, 7] : m[3] === 'dim' ? [0, 3, 6] : m[3] === 'sus' ? [0, 5, 7] : [0, 4, 7];
  if (m[4]) iv.push(10);
  return { root, iv };
}

/** Track in eine Ereignisliste pro Schritt übersetzen. */
export function compileTrack(def) {
  const S = def.steps, chords = def.chords.split(/\s+/).map(parseChord), bars = chords.length, n = S * bars;
  const steps = Array.from({ length: n }, () => []);
  // Melodie
  const toks = def.lead.notes.replace(/\|/g, ' ').trim().split(/\s+/);
  let last = null;
  toks.forEach((t, i) => {
    if (i >= n) return;
    if (t === '-') { if (last) last.dur++; return; }
    if (t === '.') { last = null; return; }
    last = { inst: def.lead.inst, freq: noteFreq(t), dur: 1, vol: def.lead.vol, vib: def.lead.vib || 0, lead: true };
    steps[i].push(last);
  });
  const at = (bar, step, midi, dur, voice, extra = {}) => steps[bar * S + step].push({ inst: voice.inst, freq: midiFreq(midi), dur, vol: voice.vol, ...extra });
  chords.forEach((ch, b) => {
    const B = def.bass, base = 12 * (B.oct + 1) + ch.root, fifth = base + 7;
    switch (B.style) {
      case 'bounce': for (let s = 0; s < S; s += 2) at(b, s, s % 4 === 0 ? base : fifth, 1, B); break;
      case 'half': at(b, 0, base, S / 2, B); at(b, S / 2, fifth, S / 2, B); break;
      case 'drone': at(b, 0, base, S, B); break;
      case 'pump': for (let s = 0; s < S; s++) at(b, s, s % 2 ? base + 12 : base, 1, B); break;
      case 'drive': for (let s = 0; s < S; s++) at(b, s, s % 2 ? base + 12 : base, 1, B); break;
      case 'calypso': at(b, 0, base, 2, B); at(b, 3, fifth, 1, B); at(b, 4, base, 2, B); at(b, 6, base + 12, 1, B); break;
      case 'waltz': at(b, 0, base, 2, B); at(b, 3, fifth - 12 + 12, 1, B); break;
    }
    const A = def.arp; if (!A) return;
    const tones = ch.iv.map((v) => 12 * (A.oct + 1) + ch.root + v);
    const seq = [tones[0], tones[1], tones[2], tones[0] + 12];
    switch (A.style) {
      case 'up': for (let s = 0; s < S; s++) at(b, s, seq[s % 4], 1, A); break;
      case 'updown': { const ud = [seq[0], seq[1], seq[2], seq[3], seq[2], seq[1]]; for (let s = 0; s < S; s++) at(b, s, ud[s % 6], 1, A); break; }
      case 'sparse': for (let s = 0; s < S; s += 2) at(b, s, seq[(s / 2 + b) % 4], 2, A); break;
      case 'pad': for (const t of tones.slice(0, 3)) at(b, 0, t, S, A, { pad: true }); break;
      case 'stab': for (const s of [1, 3, 5, 7]) for (const t of tones.slice(0, 3)) at(b, s, t, 1, A, { vol: A.vol * 0.6 }); break;
      case 'waltz': for (const s of [2, 4]) for (const t of tones.slice(0, 3)) at(b, s, t, 1, A, { vol: A.vol * 0.7 }); break;
    }
  });
  const dr = def.drums.split(/\s+/);
  for (let i = 0; i < n; i++) { const d = dr[i % dr.length]; if (d && d !== '.') steps[i].push({ drum: d, vol: def.drumVol ?? 0.8 }); }
  return { id: def.name, def, steps, n, stepDur: 60 / def.bpm / 2, swing: def.swing || 0, echo: def.echo || 0 };
}
