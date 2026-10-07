// Kleine, deterministische Zufalls- und Noise-Helfer (seeded).

/** Mulberry32 – schneller seeded PRNG, liefert Zahlen in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer-Hash für (x, y, seed) -> [0, 1). Stabil über alle Läufe. */
export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/** 2D Value-Noise mit Smoothstep-Interpolation. */
export function makeValueNoise(seed) {
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
    const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
}

/** Fractal Brownian Motion über eine Noise-Funktion. */
export function fbm(noise, x, y, octaves = 4) {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq + i * 31.7, y * freq - i * 17.3) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export { lerp };
