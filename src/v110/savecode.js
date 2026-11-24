// v110 (1) Spielstand-Export/Import: Code (PW1-…) oder JSON-Datei. Ohne Abhängigkeiten.
export const CODE_PREFIX = 'PW1-';
const REQUIRED = { v: 'number', map: 'string', x: 'number', y: 'number', hp: 'number', maxHp: 'number', coins: 'number', inv: 'object', quests: 'object', story: 'object' };
const MAX_BYTES = 300000;

const b64enc = (str) => { const bytes = new TextEncoder().encode(str); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64dec = (b) => { b = b.replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '='; const s = atob(b); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new TextDecoder().decode(u); };

/** Kleine Prüfsumme (FNV-1a, 32 Bit) gegen Tippfehler beim Kopieren. */
export function checksum(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36).padStart(7, '0').slice(-7); }

export function encodeSave(data) {
  const json = JSON.stringify(data);
  return CODE_PREFIX + b64enc(json) + '.' + checksum(json);
}

/** Prüft Struktur und Wertebereiche; gibt eine Fehlermeldung (deutsch) oder null zurück. */
export function validateSave(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'Kein Spielstand-Objekt.';
  for (const [k, t] of Object.entries(REQUIRED)) if (typeof d[k] !== t || d[k] === null) return `Feld „${k}“ fehlt oder ist ungültig.`;
  if (d.v !== 1) return `Unbekannte Spielstand-Version ${d.v}.`;
  if (d.maxHp < 1 || d.maxHp > 40 || d.hp < 0 || d.hp > d.maxHp) return 'Herzen außerhalb des gültigen Bereichs.';
  if (d.coins < 0 || d.coins > 1e7) return 'Taler außerhalb des gültigen Bereichs.';
  if (!/^[a-z0-9_]{2,32}$/i.test(d.map)) return 'Ungültige Karte.';
  for (const [k, n] of Object.entries(d.inv)) if (typeof n !== 'number' || n < 0 || n > 9999 || !/^[a-z0-9_]{1,40}$/i.test(k)) return `Ungültiges Item „${String(k).slice(0, 20)}“.`;
  return null;
}

/** Text (Code oder JSON, ggf. mit Hülle {pixelWorldSave:…}) → { data } oder { error }. */
export function decodeSave(text) {
  text = String(text || '').trim();
  if (!text) return { error: 'Kein Text eingefügt.' };
  if (text.length > MAX_BYTES * 1.5) return { error: 'Zu groß für einen Spielstand.' };
  let data;
  try {
    if (text.startsWith(CODE_PREFIX)) {
      const body = text.slice(CODE_PREFIX.length).replace(/\s+/g, '');
      const [b, sum] = body.split('.');
      const json = b64dec(b);
      if (sum && checksum(json) !== sum) return { error: 'Prüfsumme stimmt nicht – Code unvollständig kopiert?' };
      data = JSON.parse(json);
    } else if (text.startsWith('{')) {
      data = JSON.parse(text);
      if (data && data.pixelWorldSave) data = data.pixelWorldSave;
    } else return { error: 'Unbekanntes Format (erwartet PW1-… oder JSON).' };
  } catch (e) { return { error: 'Code/Datei beschädigt: ' + e.message }; }
  const err = validateSave(data);
  return err ? { error: err } : { data };
}

/** Datei-Hülle für den Download. */
export function fileWrap(data) { return JSON.stringify({ pixelWorldSave: data, exported: new Date().toISOString(), app: 'Pixel World' }, null, 1); }

export function summary(d) {
  const ch = d.story?.ch2 ? `Teil 2 · Kapitel ${d.story.ch2}` : `Kapitel ${d.story?.ch ?? 0}`;
  return `${d.map} · ${d.hp}/${d.maxHp} ♥ · ${d.coins} Taler · ${ch}${d.time ? ' · ' + new Date(d.time).toLocaleString('de-DE') : ''}`;
}
