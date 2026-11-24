// v110 (9/10) Online-Funktionen: Bestenliste, Cloud-Spielstand per Sync-Code, anonyme Besuchszählung.
// Alles optional: ohne Netz/API läuft das Spiel vollständig offline weiter (Fehler werden geschluckt).
export const DEFAULT_API = 'https://pixel-world-api.85.190.126.179.sslip.io';
export const BOSS_KINDS = { tiefe: 'Umbrakor', ruinen: 'Khepran', tempel: 'Thalassa' };
const BEST_KEY = 'pixelworld.best.v1';
const NAME_KEY = 'pixelworld.name';
const ONLINE_KEY = 'pixelworld.online';

export function apiBase() {
  try {
    const q = new URLSearchParams(location.search).get('api');
    if (q === 'off') return null;
    if (q && /^https?:\/\//.test(q)) return q.replace(/\/$/, '');
    if (window.PW_API !== undefined) return window.PW_API;
  } catch (e) { /* */ }
  return DEFAULT_API;
}
export const onlineEnabled = () => { try { return localStorage.getItem(ONLINE_KEY) !== 'off'; } catch (e) { return true; } };
export const setOnline = (on) => { try { localStorage.setItem(ONLINE_KEY, on ? 'on' : 'off'); } catch (e) { /* */ } };

async function call(path, { method = 'GET', body, timeout = 6000 } = {}) {
  const base = apiBase();
  if (!base || !onlineEnabled()) throw new Error('Online-Funktionen sind aus.');
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(base + path, {
      method, signal: ctl.signal, mode: 'cors', credentials: 'omit',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || `Server antwortet ${res.status}`);
    return j;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server antwortet nicht (offline?)');
    if (e instanceof TypeError) throw new Error('Keine Verbindung zum Server (offline?)');
    throw e;
  } finally { clearTimeout(t); }
}

/** Anonymer Zähler ohne Cookies/IDs: nur Seitentyp. Respektiert „Do Not Track“. */
export function hit(page) {
  try {
    const base = apiBase();
    // nur auf der echten Domain zählen (lokale Tests/CI/Vorschau zählen nicht mit)
    if (!window.PW_FORCE_HIT && (location.hostname !== 'pixel-world.jodabreit-ai.de' || /HeadlessChrome/.test(navigator.userAgent))) return false;
    if (!base || !onlineEnabled() || navigator.doNotTrack === '1') return false;
    fetch(base + '/api/hit', { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ page }) }).catch(() => {});
    return true;
  } catch (e) { return false; }
}

export const leaderboard = (kind) => call('/api/leaderboard?kind=' + encodeURIComponent(kind));
export const submitScore = (kind, name, ms) => call('/api/score', { method: 'POST', body: { kind, name, ms: Math.round(ms) } });
export const cloudCreate = (save) => call('/api/cloud', { method: 'POST', body: { save } });
export const cloudUpdate = (code, save) => call('/api/cloud/' + encodeURIComponent(code), { method: 'PUT', body: { save } });
export const cloudLoad = (code) => call('/api/cloud/' + encodeURIComponent(code));
export const health = () => call('/api/health', { timeout: 3000 });

// Lokale Bestzeiten (werden erst auf Wunsch eingetragen)
export function bests() { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch (e) { return {}; } }
export function recordBest(kind, ms) {
  if (!BOSS_KINDS[kind] || !(ms > 0)) return false;
  const b = bests(); const prev = b[kind];
  if (prev && prev.ms <= ms) return false;
  b[kind] = { ms: Math.round(ms), t: Date.now(), submitted: false };
  try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* */ }
  return true;
}
export function markSubmitted(kind) { const b = bests(); if (b[kind]) { b[kind].submitted = true; try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch (e) { /* */ } } }
export const playerName = () => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } };
export const setPlayerName = (n) => { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* */ } };
export const fmtTime = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
export const cleanName = (n) => String(n || '').replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 16);
