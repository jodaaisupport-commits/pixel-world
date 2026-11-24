// Pixel World API: Bestenliste, Cloud-Spielstand (Sync-Code) und cookielose Besuchszählung.
// Node ≥ 22.5 (eingebautes node:sqlite), keine weiteren Abhängigkeiten.
// Datenschutz: keine Konten, keine Cookies, keine IP-Speicherung (IPs nur flüchtig im RAM fürs Rate-Limit).
import http from 'node:http';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PORT = +process.env.PORT || 8080;
const DB_PATH = process.env.DB || './pw.db';
const ORIGINS = (process.env.ALLOW_ORIGINS || 'https://pixel-world.jodabreit-ai.de').split(',').map((s) => s.trim()).filter(Boolean);
const STATS_USER = process.env.STATS_USER || 'crypto';
const STATS_PASS = process.env.STATS_PASS || '';
const KINDS = { tiefe: 'Umbrakor', ruinen: 'Khepran', tempel: 'Thalassa' };
const PAGES = ['landing', 'game'];
const MAX_SAVE = 200_000;

const db = new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS scores (kind TEXT NOT NULL, name TEXT NOT NULL, ms INTEGER NOT NULL, created INTEGER NOT NULL, PRIMARY KEY (kind, name));
CREATE INDEX IF NOT EXISTS scores_rank ON scores(kind, ms);
CREATE TABLE IF NOT EXISTS cloud (code TEXT PRIMARY KEY, data TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, page TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, page));`);
const q = {
  top: db.prepare('SELECT name, ms, created FROM scores WHERE kind = ? ORDER BY ms ASC, created ASC LIMIT 20'),
  getScore: db.prepare('SELECT ms FROM scores WHERE kind = ? AND name = ?'),
  upsertScore: db.prepare('INSERT INTO scores (kind, name, ms, created) VALUES (?, ?, ?, ?) ON CONFLICT(kind, name) DO UPDATE SET ms = excluded.ms, created = excluded.created WHERE excluded.ms < scores.ms'),
  rank: db.prepare('SELECT COUNT(*) AS r FROM scores WHERE kind = ? AND ms < ?'),
  countKind: db.prepare('SELECT kind, COUNT(*) AS n FROM scores GROUP BY kind'),
  cloudGet: db.prepare('SELECT data, updated FROM cloud WHERE code = ?'),
  cloudIns: db.prepare('INSERT INTO cloud (code, data, created, updated) VALUES (?, ?, ?, ?)'),
  cloudUpd: db.prepare('UPDATE cloud SET data = ?, updated = ? WHERE code = ?'),
  cloudCount: db.prepare('SELECT COUNT(*) AS n FROM cloud'),
  cloudPurge: db.prepare('DELETE FROM cloud WHERE updated < ?'),
  hit: db.prepare('INSERT INTO hits (day, page, n) VALUES (?, ?, 1) ON CONFLICT(day, page) DO UPDATE SET n = n + 1'),
  hitsDays: db.prepare('SELECT day, page, n FROM hits WHERE day >= ? ORDER BY day DESC'),
  hitsTotal: db.prepare('SELECT page, SUM(n) AS n FROM hits GROUP BY page'),
};
const purge = () => q.cloudPurge.run(Date.now() - 180 * 864e5);
purge(); setInterval(purge, 864e5).unref();

// ---------------------------------------------------------------- Rate-Limit (nur RAM)
const buckets = new Map();
function limited(ip, key, max, perMs) {
  const k = key + '|' + ip, now = Date.now();
  let b = buckets.get(k);
  if (!b || now - b.t > perMs) { b = { t: now, n: 0 }; buckets.set(k, b); }
  return ++b.n > max;
}
setInterval(() => { const now = Date.now(); for (const [k, b] of buckets) if (now - b.t > 3600e3) buckets.delete(k); }, 600e3).unref();

// ---------------------------------------------------------------- Helfer
const cleanName = (n) => String(n || '').normalize('NFC').replace(/[^\p{L}\p{N} _.\-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const BAD = /(nazi|hitler|fick|fuck|hure|nigg|schlampe|wichs)/i;
const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => { const b = crypto.randomBytes(10); let s = ''; for (let i = 0; i < 10; i++) s += ALPH[b[i] % ALPH.length]; return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`; };
const validCode = (c) => /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{2}$/.test(c);
const validSave = (s) => s && typeof s === 'object' && s.v === 1 && typeof s.map === 'string' && typeof s.hp === 'number' && typeof s.inv === 'object';
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }

function send(res, status, obj, headers = {}) {
  const body = typeof obj === 'string' ? obj : JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': typeof obj === 'string' ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...headers });
  res.end(body);
}
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(Object.assign(new Error('Zu groß'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(Object.assign(new Error('Ungültiges JSON'), { status: 400 })); } });
    req.on('error', reject);
  });
}
function authOk(req) {
  if (!STATS_PASS) return false;
  const m = /^Basic (.+)$/.exec(req.headers.authorization || ''); if (!m) return false;
  const [u, ...rest] = Buffer.from(m[1], 'base64').toString().split(':'); const p = rest.join(':');
  const a = crypto.createHash('sha256').update(`${u}:${p}`).digest(), b = crypto.createHash('sha256').update(`${STATS_USER}:${STATS_PASS}`).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------- Dashboard
function dashboard() {
  const since = new Date(Date.now() - 29 * 864e5).toISOString().slice(0, 10);
  const rows = q.hitsDays.all(since), byDay = {};
  for (const r of rows) (byDay[r.day] ||= { landing: 0, game: 0 })[r.page] = r.n;
  const tot = Object.fromEntries(q.hitsTotal.all().map((r) => [r.page, r.n]));
  const days = []; for (let i = 0; i < 30; i++) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, byDay[d] || { landing: 0, game: 0 }]); }
  const max = Math.max(1, ...days.map(([, v]) => Math.max(v.landing, v.game)));
  const bar = (n, c) => `<span class="bar" style="width:${Math.round((n / max) * 160)}px;background:${c}"></span> ${n}`;
  const boards = Object.entries(KINDS).map(([k, nm]) => `<div class="card"><h3>${nm}</h3><ol>${q.top.all(k).slice(0, 10).map((e) => `<li>${esc(e.name)} – ${(e.ms / 1000).toFixed(1)} s</li>`).join('') || '<li><i>noch leer</i></li>'}</ol></div>`).join('');
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Pixel World · Statistik</title>
<style>body{background:#1b1a2e;color:#f4ecd8;font:14px/1.5 ui-monospace,monospace;margin:0;padding:20px}h1{color:#f6c453}h3{color:#f6c453;margin:0 0 6px}.grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}.card{background:#2e2b4a;border:3px solid #0d0c18;padding:14px}.big{font-size:28px;color:#f6c453}table{border-collapse:collapse;width:100%}td,th{padding:3px 8px;border-bottom:1px solid #0d0c18;text-align:left}.bar{display:inline-block;height:10px;vertical-align:middle}small{color:#b9b0cf}</style></head><body>
<h1>Pixel World · Statistik</h1><p><small>Cookielos und anonym: gezählt werden nur Aufrufe pro Tag (Startseite / Spielstart). Keine IPs, keine Profile. Stand: ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</small></p>
<div class="grid"><div class="card"><h3>Startseite</h3><div class="big">${tot.landing || 0}</div><small>Aufrufe gesamt · heute ${(byDay[today()] || {}).landing || 0}</small></div>
<div class="card"><h3>Spielstarts</h3><div class="big">${tot.game || 0}</div><small>gesamt · heute ${(byDay[today()] || {}).game || 0}</small></div>
<div class="card"><h3>Cloud-Spielstände</h3><div class="big">${q.cloudCount.get().n}</div><small>Bestenliste: ${q.countKind.all().map((r) => `${KINDS[r.kind] || r.kind} ${r.n}`).join(' · ') || '—'}</small></div></div>
<h2>Letzte 30 Tage</h2><div class="card"><table><tr><th>Tag</th><th>Startseite</th><th>Spielstarts</th></tr>${days.map(([d, v]) => `<tr><td>${d}</td><td>${bar(v.landing, '#5fb04a')}</td><td>${bar(v.game, '#f6c453')}</td></tr>`).join('')}</table></div>
<h2>Bestenliste</h2><div class="grid">${boards}</div></body></html>`;
}

// ---------------------------------------------------------------- Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname, ip = clientIp(req);
  const origin = req.headers.origin;
  const cors = origin && ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } : { Vary: 'Origin' };
  const J = (s, o) => send(res, s, o, cors);
  try {
    if (req.method === 'OPTIONS') { res.writeHead(origin && ORIGINS.includes(origin) ? 204 : 403, cors); return res.end(); }
    if (path.startsWith('/api/') && origin && !ORIGINS.includes(origin)) return J(403, { error: 'Herkunft nicht erlaubt' });
    if (limited(ip, 'all', 120, 60e3)) return J(429, { error: 'Zu viele Anfragen – kurz warten.' });

    if (path === '/' ) return send(res, 200, '<!doctype html><meta charset="utf-8"><title>Pixel World API</title><body style="font-family:monospace;background:#1b1a2e;color:#f4ecd8;padding:2em">Pixel World API · <a style="color:#f6c453" href="https://pixel-world.jodabreit-ai.de/">zum Spiel</a></body>');
    if (path === '/api/health') return J(200, { ok: true, time: Date.now() });

    if (path === '/api/hit' && req.method === 'POST') {
      const b = await readBody(req, 200).catch(() => ({}));
      if (!PAGES.includes(b.page) || limited(ip, 'hit', 20, 60e3)) return J(204, {});
      q.hit.run(today(), b.page); res.writeHead(204, cors); return res.end();
    }
    if (path === '/api/leaderboard' && req.method === 'GET') {
      const kind = url.searchParams.get('kind');
      if (!KINDS[kind]) return J(400, { error: 'Unbekannte Liste' });
      return J(200, { kind, name: KINDS[kind], top: q.top.all(kind).map((r) => ({ name: r.name, ms: r.ms, t: r.created })) });
    }
    if (path === '/api/score' && req.method === 'POST') {
      if (limited(ip, 'score', 6, 60e3)) return J(429, { error: 'Zu viele Einträge – kurz warten.' });
      const b = await readBody(req, 500);
      const kind = b.kind, name = cleanName(b.name), ms = Math.round(+b.ms);
      if (!KINDS[kind]) return J(400, { error: 'Unbekannte Liste' });
      if (name.length < 2) return J(400, { error: 'Name zu kurz' });
      if (BAD.test(name)) return J(400, { error: 'Bitte einen anderen Namen wählen' });
      if (!(ms >= 15000 && ms <= 2 * 3600e3)) return J(400, { error: 'Zeit nicht plausibel' });
      q.upsertScore.run(kind, name, ms, Date.now());
      const best = q.getScore.get(kind, name).ms;
      return J(200, { ok: true, best, rank: q.rank.get(kind, best).r + 1 });
    }
    if (path === '/api/cloud' && req.method === 'POST') {
      if (limited(ip, 'cloudw', 10, 60e3)) return J(429, { error: 'Zu viele Speichervorgänge – kurz warten.' });
      const b = await readBody(req, MAX_SAVE);
      if (!validSave(b.save)) return J(400, { error: 'Ungültiger Spielstand' });
      let code; do { code = newCode(); } while (q.cloudGet.get(code));
      const now = Date.now(); q.cloudIns.run(code, JSON.stringify(b.save), now, now);
      return J(201, { ok: true, code });
    }
    const m = /^\/api\/cloud\/([A-Z0-9-]{8,14})$/.exec(path);
    if (m) {
      const code = m[1];
      if (!validCode(code)) return J(400, { error: 'Ungültiger Sync-Code' });
      if (limited(ip, 'cloudr', 20, 60e3)) return J(429, { error: 'Zu viele Versuche – kurz warten.' });
      const row = q.cloudGet.get(code);
      if (req.method === 'GET') { if (!row) return J(404, { error: 'Sync-Code nicht gefunden' }); return J(200, { code, updated: row.updated, save: JSON.parse(row.data) }); }
      if (req.method === 'PUT') {
        if (limited(ip, 'cloudw', 10, 60e3)) return J(429, { error: 'Zu viele Speichervorgänge – kurz warten.' });
        if (!row) return J(404, { error: 'Sync-Code nicht gefunden' });
        const b = await readBody(req, MAX_SAVE);
        if (!validSave(b.save)) return J(400, { error: 'Ungültiger Spielstand' });
        q.cloudUpd.run(JSON.stringify(b.save), Date.now(), code);
        return J(200, { ok: true, code });
      }
    }
    if (path === '/stats') {
      if (!authOk(req)) { res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="Pixel World Statistik", charset="UTF-8"', 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Anmeldung erforderlich'); }
      return send(res, 200, dashboard(), { 'X-Robots-Tag': 'noindex' });
    }
    return J(404, { error: 'Nicht gefunden' });
  } catch (e) {
    return J(e.status || 500, { error: e.status ? e.message : 'Serverfehler' });
  }
});
server.listen(PORT, () => console.log(`pixel-world-api on :${PORT}, origins ${ORIGINS.join(' ')}`));
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => { server.close(); db.close(); process.exit(0); });
