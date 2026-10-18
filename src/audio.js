// Audio: alles live mit der Web-Audio-API erzeugt (keine Dateien).
// - Musik: Chiptune-Sequencer mit Lookahead-Scheduling, ein Track pro Gebietstyp, Überblendung.
// - Effekte: kleine Synth-Rezepte (Schritte, Schwert, Treffer, Münzen, Fanfare, Boss-Brüllen …).
// Der AudioContext entsteht erst bei der ersten Eingabe (Autoplay-Regeln der Browser).
import { TRACKS, compileTrack } from './music.js';

const SKEY = 'pixelworld.settings.v1';
const DEFAULTS = { music: true, sfx: true, musicVol: 0.6, sfxVol: 0.8 };
const compiled = {};
const getTrack = (id) => (compiled[id] ||= compileTrack(TRACKS[id]));

// ---------------------------------------------------------------- Bausteine (für Echtzeit + Offline)
const waveCache = new WeakMap();
function pulseWave(ctx, duty) {
  let m = waveCache.get(ctx); if (!m) waveCache.set(ctx, (m = {}));
  if (m[duty]) return m[duty];
  const N = 48, re = new Float32Array(N), im = new Float32Array(N);
  // Fourier-Reihe eines Rechtecks mit Tastgrad "duty"
  for (let k = 1; k < N; k++) { const a = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty); re[k] = a * Math.cos(k * Math.PI * duty); im[k] = a * Math.sin(k * Math.PI * duty); }
  return (m[duty] = ctx.createPeriodicWave(re, im));
}
const noiseCache = new WeakMap();
function noiseBuf(ctx) {
  if (noiseCache.has(ctx)) return noiseCache.get(ctx);
  const b = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate), d = b.getChannelData(0);
  let s = 12345; for (let i = 0; i < d.length; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff) - 1; }
  noiseCache.set(ctx, b); return b;
}
function osc(ctx, inst, freq, t) {
  const o = ctx.createOscillator();
  if (inst === 'pulse25') o.setPeriodicWave(pulseWave(ctx, 0.25));
  else if (inst === 'pulse12') o.setPeriodicWave(pulseWave(ctx, 0.125));
  else if (inst === 'pulse50') o.type = 'square';
  else if (inst === 'saw') o.type = 'sawtooth';
  else o.type = inst; // triangle, sine, square
  o.frequency.setValueAtTime(freq, t);
  return o;
}
/** Eine Note mit Hüllkurve. */
function tone(ctx, dest, { inst = 'square', freq = 440, t = ctx.currentTime, dur = 0.1, vol = 0.2, a = 0.005, r = 0.06, slide = 0, vib = 0, pad = false, lp = 0 }) {
  const o = osc(ctx, inst, freq, t), g = ctx.createGain();
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
  if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = freq * vib; l.connect(lg).connect(o.frequency); l.start(t + Math.min(0.12, dur * 0.4)); l.stop(t + dur + r + 0.05); }
  const att = pad ? Math.min(0.25, dur * 0.3) : a;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + att);
  if (!pad) g.gain.setValueAtTime(vol, t + Math.max(att, dur * 0.6));
  g.gain.linearRampToValueAtTime(pad ? vol * 0.8 : vol * 0.7, t + dur);
  g.gain.linearRampToValueAtTime(0.0001, t + dur + r);
  let node = o;
  if (lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
  node.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + r + 0.02);
  return o;
}
function noise(ctx, dest, { t = ctx.currentTime, dur = 0.1, vol = 0.2, type = 'bandpass', f = 1000, f2 = 0, q = 1, a = 0.002 }) {
  const s = ctx.createBufferSource(); s.buffer = noiseBuf(ctx);
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
function drum(ctx, dest, d, t, vol) {
  if (d === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(0.55 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.connect(g).connect(dest); o.start(t); o.stop(t + 0.18); }
  else if (d === 's') { noise(ctx, dest, { t, dur: 0.12, vol: 0.16 * vol, type: 'bandpass', f: 1900, q: 0.8 }); tone(ctx, dest, { inst: 'triangle', freq: 190, t, dur: 0.04, vol: 0.12 * vol, r: 0.04, slide: 0.6 }); }
  else if (d === 'h') noise(ctx, dest, { t, dur: 0.035, vol: 0.06 * vol, type: 'highpass', f: 7500 });
  else if (d === 't') { tone(ctx, dest, { inst: 'triangle', freq: 160, t, dur: 0.1, vol: 0.25 * vol, slide: 0.55 }); }
  else if (d === 'd') { tone(ctx, dest, { inst: 'sine', freq: 1500 + Math.random() * 500, t, dur: 0.05, vol: 0.06 * vol, slide: 0.45, r: 0.05 }); }
}
/** Einen Schritt eines Tracks einplanen. */
function scheduleStep(ctx, bus, tr, i, t) {
  for (const e of tr.steps[i % tr.n]) {
    if (e.drum) { drum(ctx, bus.drums, e.drum, t, e.vol); continue; }
    tone(ctx, e.lead && bus.echo ? bus.echo : bus.out, { inst: e.inst, freq: e.freq, t, dur: e.dur * tr.stepDur * 0.92, vol: e.vol, vib: e.vib, pad: e.pad, r: e.pad ? 0.2 : 0.05, lp: e.inst === 'saw' ? 1800 : 0 });
  }
}
/** Ausgangskette eines Tracks: Gain (für Überblendung) + optionales Echo. */
function makeBus(ctx, dest, tr) {
  const out = ctx.createGain(); out.connect(dest);
  const bus = { out, drums: out, echo: null };
  if (tr.echo) {
    const inG = ctx.createGain(), d = ctx.createDelay(2), fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
    d.delayTime.value = Math.min(1.9, tr.stepDur * 3); fb.gain.value = tr.echo; wet.gain.value = 0.55; lp.type = 'lowpass'; lp.frequency.value = 2600;
    inG.connect(out); inG.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(wet).connect(out);
    bus.echo = inG;
  }
  return bus;
}

// ---------------------------------------------------------------- Effekte
const SFX = {
  step(c, o, t, { surface = 'dirt' } = {}) {
    const p = { grass: [900, 0.05, 0.03], dirt: [700, 0.05, 0.035], sand: [1400, 0.07, 0.03], stone: [2400, 0.03, 0.04], snow: [3000, 0.08, 0.035], wood: [420, 0.05, 0.06] }[surface] || [800, 0.05, 0.03];
    noise(c, o, { t, dur: p[1], vol: p[2], type: 'bandpass', f: p[0] * (0.85 + Math.random() * 0.3), q: 1.2 });
    if (surface === 'wood') tone(c, o, { inst: 'triangle', freq: 120, t, dur: 0.03, vol: 0.05, slide: 0.7 });
  },
  swing(c, o, t, { long } = {}) { noise(c, o, { t, dur: long ? 0.2 : 0.15, vol: 0.12, type: 'bandpass', f: 900, f2: 4200, q: 2 }); if (long) tone(c, o, { inst: 'sine', freq: 1800, t, dur: 0.12, vol: 0.04, slide: 1.4 }); },
  hit(c, o, t) { tone(c, o, { inst: 'square', freq: 520, t, dur: 0.06, vol: 0.12, slide: 0.4 }); noise(c, o, { t, dur: 0.08, vol: 0.14, type: 'highpass', f: 2500 }); },
  clink(c, o, t) { tone(c, o, { inst: 'square', freq: 1600, t, dur: 0.05, vol: 0.06 }); tone(c, o, { inst: 'triangle', freq: 2400, t: t + 0.02, dur: 0.12, vol: 0.06 }); },
  enemyDie(c, o, t) { [660, 520, 390, 260].forEach((f, i) => tone(c, o, { inst: 'pulse25', freq: f, t: t + i * 0.045, dur: 0.05, vol: 0.1 })); noise(c, o, { t, dur: 0.25, vol: 0.1, type: 'lowpass', f: 1800, f2: 300 }); },
  hurt(c, o, t) { tone(c, o, { inst: 'square', freq: 260, t, dur: 0.18, vol: 0.14, slide: 0.45 }); noise(c, o, { t, dur: 0.12, vol: 0.08, type: 'lowpass', f: 900 }); },
  coin(c, o, t) { tone(c, o, { inst: 'pulse25', freq: 988, t, dur: 0.06, vol: 0.1 }); tone(c, o, { inst: 'pulse25', freq: 1319, t: t + 0.06, dur: 0.14, vol: 0.1, r: 0.12 }); },
  item(c, o, t) { [523, 659, 784, 1047].forEach((f, i) => tone(c, o, { inst: 'triangle', freq: f, t: t + i * 0.06, dur: 0.08, vol: 0.16 })); },
  heal(c, o, t) { [392, 523, 659, 784].forEach((f, i) => tone(c, o, { inst: 'sine', freq: f, t: t + i * 0.05, dur: 0.1, vol: 0.14 })); },
  chest(c, o, t) { tone(c, o, { inst: 'saw', freq: 110, t, dur: 0.3, vol: 0.06, slide: 1.6, vib: 0.05, lp: 900 }); [784, 988, 1175, 1568].forEach((f, i) => tone(c, o, { inst: 'pulse25', freq: f, t: t + 0.3 + i * 0.07, dur: 0.09, vol: 0.08 })); },
  door(c, o, t) { noise(c, o, { t, dur: 0.18, vol: 0.18, type: 'lowpass', f: 500 }); tone(c, o, { inst: 'triangle', freq: 90, t, dur: 0.12, vol: 0.2, slide: 0.6 }); tone(c, o, { inst: 'saw', freq: 300, t: t + 0.05, dur: 0.15, vol: 0.025, slide: 1.5, lp: 1200 }); },
  blip(c, o, t, { pitch = 1 } = {}) { tone(c, o, { inst: 'pulse25', freq: 620 * pitch * (0.96 + Math.random() * 0.08), t, dur: 0.025, vol: 0.045, r: 0.015 }); },
  select(c, o, t) { tone(c, o, { inst: 'pulse25', freq: 1200, t, dur: 0.03, vol: 0.07, r: 0.02 }); },
  menu(c, o, t, { close } = {}) { tone(c, o, { inst: 'pulse25', freq: close ? 880 : 660, t, dur: 0.04, vol: 0.08 }); tone(c, o, { inst: 'pulse25', freq: close ? 660 : 990, t: t + 0.05, dur: 0.05, vol: 0.08 }); },
  confirm(c, o, t) { tone(c, o, { inst: 'pulse25', freq: 784, t, dur: 0.05, vol: 0.08 }); tone(c, o, { inst: 'pulse25', freq: 1175, t: t + 0.05, dur: 0.08, vol: 0.08 }); },
  buy(c, o, t) { SFX.coin(c, o, t); tone(c, o, { inst: 'triangle', freq: 1568, t: t + 0.18, dur: 0.12, vol: 0.1 }); },
  questNew(c, o, t) { [523, 784, 659, 1047].forEach((f, i) => tone(c, o, { inst: 'pulse25', freq: f, t: t + i * 0.09, dur: 0.1, vol: 0.1 })); },
  fanfare(c, o, t) {
    const n = [[523, 0, 0.1], [523, 0.12, 0.1], [523, 0.24, 0.1], [659, 0.36, 0.3], [587, 0.7, 0.14], [659, 0.86, 0.14], [784, 1.02, 0.6]];
    for (const [f, d, l] of n) { tone(c, o, { inst: 'pulse25', freq: f, t: t + d, dur: l, vol: 0.12, vib: 0.004 }); tone(c, o, { inst: 'triangle', freq: f / 2, t: t + d, dur: l, vol: 0.18 }); }
    for (const f of [392, 523, 659]) tone(c, o, { inst: 'pulse12', freq: f, t: t + 1.02, dur: 0.6, vol: 0.05 });
  },
  chapter(c, o, t) { [392, 494, 587, 784].forEach((f, i) => tone(c, o, { inst: 'triangle', freq: f, t: t + i * 0.12, dur: 0.4 - i * 0.05, vol: 0.18, vib: 0.005 })); },
  death(c, o, t) { [494, 466, 440, 392, 330].forEach((f, i) => tone(c, o, { inst: 'pulse25', freq: f, t: t + i * 0.16, dur: 0.16, vol: 0.1, vib: 0.01 })); },
  explosion(c, o, t, { big } = {}) { noise(c, o, { t, dur: big ? 1.4 : 0.6, vol: big ? 0.5 : 0.3, type: 'lowpass', f: 2400, f2: 60, a: 0.004 }); tone(c, o, { inst: 'sine', freq: 90, t, dur: big ? 0.6 : 0.3, vol: 0.4, slide: 0.3 }); },
  fuse(c, o, t) { noise(c, o, { t, dur: 1.1, vol: 0.06, type: 'highpass', f: 5000 }); },
  roar(c, o, t) {
    const ro = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain(), f = c.createBiquadFilter();
    ro.type = 'sawtooth'; ro.frequency.setValueAtTime(110, t); ro.frequency.linearRampToValueAtTime(70, t + 0.4); ro.frequency.exponentialRampToValueAtTime(38, t + 1.5);
    lfo.frequency.value = 22; lg.gain.value = 18; lfo.connect(lg).connect(ro.frequency);
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(300, t + 1.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    ro.connect(f).connect(g).connect(o); ro.start(t); ro.stop(t + 1.7); lfo.start(t); lfo.stop(t + 1.7);
    noise(c, o, { t, dur: 1.4, vol: 0.18, type: 'lowpass', f: 600, f2: 120, a: 0.1 });
  },
  phase(c, o, t) { SFX.roar(c, o, t); for (let i = 0; i < 8; i++) tone(c, o, { inst: 'pulse25', freq: 220 * 2 ** (i / 4), t: t + 0.3 + i * 0.05, dur: 0.06, vol: 0.07 }); SFX.explosion(c, o, t + 0.2, { big: false }); },
  shoot(c, o, t) { tone(c, o, { inst: 'square', freq: 1400, t, dur: 0.09, vol: 0.05, slide: 0.35 }); },
  warn(c, o, t) { tone(c, o, { inst: 'pulse25', freq: 880, t, dur: 0.06, vol: 0.06 }); tone(c, o, { inst: 'pulse25', freq: 880, t: t + 0.12, dur: 0.06, vol: 0.06 }); },
  spike(c, o, t) { noise(c, o, { t, dur: 0.18, vol: 0.12, type: 'highpass', f: 3000 }); tone(c, o, { inst: 'triangle', freq: 1760, t, dur: 0.2, vol: 0.08, slide: 0.7 }); },
  charge(c, o, t) { noise(c, o, { t, dur: 0.5, vol: 0.18, type: 'bandpass', f: 300, f2: 1600, q: 1.5 }); },
  thud(c, o, t) { tone(c, o, { inst: 'sine', freq: 70, t, dur: 0.25, vol: 0.4, slide: 0.5 }); noise(c, o, { t, dur: 0.3, vol: 0.2, type: 'lowpass', f: 700 }); },
  summon(c, o, t) { for (let i = 0; i < 6; i++) tone(c, o, { inst: 'sine', freq: 300 + i * 90, t: t + i * 0.06, dur: 0.12, vol: 0.06, vib: 0.03 }); },
  gate(c, o, t) { tone(c, o, { inst: 'saw', freq: 55, t, dur: 1.2, vol: 0.1, lp: 500, slide: 1.3 }); noise(c, o, { t, dur: 1.2, vol: 0.15, type: 'lowpass', f: 400 }); [523, 784, 1047, 1568].forEach((f, i) => tone(c, o, { inst: 'sine', freq: f, t: t + 0.6 + i * 0.1, dur: 0.4, vol: 0.06 })); },
  pulse(c, o, t) { tone(c, o, { inst: 'sine', freq: 60, t, dur: 0.9, vol: 0.35, slide: 0.6 }); tone(c, o, { inst: 'triangle', freq: 233, t, dur: 0.9, vol: 0.08, vib: 0.06 }); noise(c, o, { t, dur: 0.9, vol: 0.08, type: 'lowpass', f: 300 }); },
  // ---- Zweite Geschichte
  sink(c, o, t) { tone(c, o, { inst: 'sine', freq: 180, t, dur: 0.5, vol: 0.18, slide: 0.4, vib: 0.08 }); noise(c, o, { t, dur: 0.5, vol: 0.08, type: 'lowpass', f: 500, f2: 150 }); },
  slide(c, o, t) { noise(c, o, { t, dur: 0.35, vol: 0.06, type: 'bandpass', f: 3200, f2: 1800, q: 3 }); },
  hook(c, o, t) { noise(c, o, { t, dur: 0.12, vol: 0.12, type: 'bandpass', f: 1200, f2: 4000, q: 2 }); for (let i = 0; i < 6; i++) tone(c, o, { inst: 'square', freq: 1800 + (i % 2) * 500, t: t + 0.08 + i * 0.045, dur: 0.025, vol: 0.04 }); tone(c, o, { inst: 'triangle', freq: 300, t: t + 0.36, dur: 0.1, vol: 0.12, slide: 0.6 }); },
  splash(c, o, t) { noise(c, o, { t, dur: 0.45, vol: 0.18, type: 'bandpass', f: 1800, f2: 500, q: 0.8 }); tone(c, o, { inst: 'sine', freq: 500, t, dur: 0.1, vol: 0.08, slide: 2 }); },
  wave(c, o, t) { noise(c, o, { t, dur: 1.4, vol: 0.22, type: 'lowpass', f: 300, f2: 2200, a: 0.5 }); noise(c, o, { t: t + 0.6, dur: 0.9, vol: 0.12, type: 'highpass', f: 2500 }); },
  wind(c, o, t) { noise(c, o, { t, dur: 1.6, vol: 0.08, type: 'bandpass', f: 600, f2: 1400, q: 4, a: 0.6 }); },
  burrow(c, o, t) { noise(c, o, { t, dur: 0.55, vol: 0.16, type: 'lowpass', f: 400, f2: 120 }); tone(c, o, { inst: 'sine', freq: 55, t, dur: 0.5, vol: 0.25, vib: 0.1 }); },
  burrowUp(c, o, t) { noise(c, o, { t, dur: 0.3, vol: 0.2, type: 'bandpass', f: 900, f2: 2400, q: 1 }); tone(c, o, { inst: 'triangle', freq: 120, t, dur: 0.2, vol: 0.18, slide: 2 }); },
  roll(c, o, t) { noise(c, o, { t, dur: 0.6, vol: 0.08, type: 'bandpass', f: 2600, q: 5 }); tone(c, o, { inst: 'triangle', freq: 400, t, dur: 0.15, vol: 0.06, slide: 1.6 }); },
  bonk(c, o, t) { tone(c, o, { inst: 'square', freq: 200, t, dur: 0.08, vol: 0.12, slide: 0.5 }); tone(c, o, { inst: 'triangle', freq: 1400, t: t + 0.05, dur: 0.2, vol: 0.05, vib: 0.05 }); },
  freeze(c, o, t) { for (let i = 0; i < 6; i++) tone(c, o, { inst: 'sine', freq: 2093 * 2 ** (-i / 6), t: t + i * 0.05, dur: 0.18, vol: 0.05 }); noise(c, o, { t, dur: 0.3, vol: 0.06, type: 'highpass', f: 6000 }); },
  bubble(c, o, t) { for (let i = 0; i < 3; i++) tone(c, o, { inst: 'sine', freq: 400 + Math.random() * 500, t: t + i * 0.07, dur: 0.06, vol: 0.06, slide: 1.8 }); },
  chime(c, o, t) { [988, 1319, 1568, 1976, 2637].forEach((f, i) => tone(c, o, { inst: 'sine', freq: f, t: t + i * 0.09, dur: 0.9 - i * 0.1, vol: 0.06, vib: 0.01 })); },
  tide(c, o, t) { SFX.wave(c, o, t); tone(c, o, { inst: 'saw', freq: 65, t, dur: 1.4, vol: 0.06, lp: 400, slide: 1.4 }); },
  boat(c, o, t) { noise(c, o, { t, dur: 0.6, vol: 0.08, type: 'bandpass', f: 700, f2: 1400, q: 1.5 }); tone(c, o, { inst: 'triangle', freq: 140, t, dur: 0.1, vol: 0.08 }); },
};

// ---------------------------------------------------------------- Engine
export class AudioEngine {
  constructor() {
    this.ctx = null; this.errors = []; this.voices = []; this.track = null; this.wanted = null;
    this.settings = { ...DEFAULTS };
    try { Object.assign(this.settings, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) { /* ignorieren */ }
    this.last = {}; this.played = {}; // Drosselung + Zähler (für Tests)
  }
  get ready() { return !!this.ctx; }
  /** Bei der ersten Nutzereingabe aufrufen. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = this.ctx = new AC();
        this.master = c.createDynamicsCompressor(); this.master.threshold.value = -14; this.master.ratio.value = 4; this.master.connect(c.destination);
        this.musicBus = c.createGain(); this.musicBus.connect(this.master);
        this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
        this.applySettings();
        this.timer = setInterval(() => this.tick(), 25);
        if (this.wanted) { const w = this.wanted; this.wanted = null; this.music(w); }
        // iOS Safari: ein stiller Puffer innerhalb der Geste schaltet die Ausgabe frei
        try { const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch (e) { /* egal */ }
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch((e) => this.errors.push(String(e)));
    } catch (e) { this.errors.push(String(e)); }
  }
  setSettings(patch) { Object.assign(this.settings, patch); this.applySettings(); this.persist(); }
  persist() { try { localStorage.setItem(SKEY, JSON.stringify(this.settings)); } catch (e) { /* ignorieren */ } }
  applySettings() {
    if (!this.ctx) return;
    const s = this.settings, t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(s.music ? s.musicVol * 0.55 : 0, t, 0.08);
    this.sfxBus.gain.setTargetAtTime(s.sfx ? s.sfxVol * 0.9 : 0, t, 0.03);
  }
  /** Musik wechseln (mit Überblendung). */
  music(id, fade = 1.2) {
    if (!TRACKS[id] && id !== null) return;
    if (!this.ctx) { this.wanted = id; this.track = id; return; }
    if (this.current === id) return;
    this.current = id; this.track = id;
    try {
      const c = this.ctx, t = c.currentTime;
      for (const v of this.voices) if (!v.stopping) { v.stopping = t + fade; v.bus.out.gain.setValueAtTime(v.bus.out.gain.value, t); v.bus.out.gain.linearRampToValueAtTime(0.0001, t + fade); }
      if (id) {
        const tr = getTrack(id), bus = makeBus(c, this.musicBus, tr);
        bus.out.gain.setValueAtTime(0.0001, t); bus.out.gain.linearRampToValueAtTime(1, t + fade * 0.8);
        this.voices.push({ id, tr, bus, step: 0, next: t + 0.08, stopping: 0 });
      }
    } catch (e) { this.errors.push(String(e)); }
  }
  tick() {
    const c = this.ctx; if (!c) return;
    try {
      const ahead = c.currentTime + 0.15;
      for (const v of this.voices) {
        while (v.next < ahead && (!v.stopping || v.next < v.stopping)) {
          const sw = v.step % 2 ? v.tr.swing * v.tr.stepDur : 0;
          scheduleStep(c, v.bus, v.tr, v.step, v.next + sw);
          v.step++; v.next += v.tr.stepDur;
        }
      }
      const done = this.voices.filter((v) => v.stopping && c.currentTime > v.stopping + 0.6);
      for (const v of done) v.bus.out.disconnect();
      if (done.length) this.voices = this.voices.filter((v) => !done.includes(v));
    } catch (e) { this.errors.push(String(e)); }
  }
  /** Soundeffekt abspielen. throttle = Mindestabstand in Sekunden. */
  sfx(name, opts = {}, throttle = 0) {
    this.played[name] = (this.played[name] || 0) + 1;
    if (!this.ctx || !this.settings.sfx || !SFX[name]) return;
    const now = this.ctx.currentTime;
    if (throttle && this.last[name] && now - this.last[name] < throttle) return;
    this.last[name] = now;
    try { SFX[name](this.ctx, this.sfxBus, now + 0.005, opts); } catch (e) { this.errors.push(String(e)); }
  }
  /** Track offline rendern (OfflineAudioContext) und als WAV (Base64) liefern. */
  async renderWav(id, seconds = 20, rate = 44100) {
    const tr = getTrack(id), OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const c = new OAC(2, Math.ceil(seconds * rate), rate);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(c.destination);
    const g = c.createGain(); g.gain.value = 0.6; g.connect(comp);
    const bus = makeBus(c, g, tr);
    bus.out.gain.setValueAtTime(1, 0); bus.out.gain.setValueAtTime(1, seconds - 1.5); bus.out.gain.linearRampToValueAtTime(0.0001, seconds - 0.05);
    for (let i = 0, t = 0.05; t < seconds - 0.3; i++, t += tr.stepDur) scheduleStep(c, bus, tr, i, t + (i % 2 ? tr.swing * tr.stepDur : 0));
    const buf = await c.startRendering();
    return encodeWav(buf);
  }
  get state() {
    return { ready: !!this.ctx, ctxState: this.ctx ? this.ctx.state : 'none', track: this.track, current: this.current || null, voices: this.voices.length, errors: [...this.errors], settings: { ...this.settings }, played: { ...this.played } };
  }
}
export const TRACK_NAMES = Object.fromEntries(Object.entries(TRACKS).map(([k, v]) => [k, v.name]));

function encodeWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, rate = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, rate, true);
  out.setUint32(28, rate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * ch * 2, true);
  const data = [...Array(ch)].map((_, i) => buf.getChannelData(i));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  const bytes = new Uint8Array(out.buffer); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
