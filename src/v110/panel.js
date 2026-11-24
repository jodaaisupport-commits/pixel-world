// v110: Fenster für Spielstand-Export/Import (1), Bestenliste (9) und Cloud-Spielstand (9).
import { encodeSave, decodeSave, fileWrap, summary } from './savecode.js';
import * as net from './net.js';

const CLOUD_KEY = 'pixelworld.cloud.code';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function installPanel(ctx) {
  const { ui, saveNow, currentSlot, readSlotData, writeSlotData } = ctx;
  const win = document.getElementById('netwin');
  const title = win.querySelector('h2'), body = win.querySelector('.net-body');
  let view = 'save', boardKind = 'tiefe';
  const toast = (m) => ui.toast(m);

  function open(v) { view = v; ui.openNet(); render(); }
  function applyImport(data, source) {
    const slot = currentSlot();
    const cur = readSlotData(slot);
    const msg = `Spielstand aus ${source} in Slot ${slot + 1} übernehmen?\n\nNeu: ${summary(data)}` + (cur ? `\n\nACHTUNG – wird überschrieben:\n${summary(cur)}` : '');
    if (!window.confirm(msg)) { toast('Import abgebrochen'); return false; }
    if (!writeSlotData(data, slot)) { toast('Speichern fehlgeschlagen (Speicher voll?)'); return false; }
    toast('Spielstand importiert – lade neu …');
    window.__pwImported = true;
    setTimeout(() => { const u = new URL(location.href); u.searchParams.delete('reset'); u.searchParams.set('slot', String(slot)); location.replace(u.toString()); }, 700);
    return true;
  }
  function msg(el, text, ok) { const m = body.querySelector(el); if (m) { m.textContent = text; m.className = 'net-msg ' + (ok ? 'ok' : 'err'); } }

  function renderSave() {
    saveNow();
    const slot = currentSlot(), d = readSlotData(slot);
    const code = d ? encodeSave(d) : '';
    title.textContent = 'Spielstand exportieren / importieren';
    body.innerHTML = `
      <p class="muted">Slot ${slot + 1}: ${d ? esc(summary(d)) : 'leer'}</p>
      <h3>Exportieren</h3>
      <textarea id="net-code" readonly rows="3" aria-label="Spielstand-Code">${esc(code)}</textarea>
      <div class="net-row"><button id="net-copy" ${d ? '' : 'disabled'}>📋 Code kopieren</button><button id="net-dl" ${d ? '' : 'disabled'}>⬇ Als Datei (.json)</button></div>
      <h3>Importieren</h3>
      <textarea id="net-in" rows="3" placeholder="PW1-… Code oder JSON hier einfügen" aria-label="Code zum Importieren"></textarea>
      <div class="net-row"><button id="net-imp">✔ Prüfen &amp; importieren</button><label class="net-file">📂 Datei wählen<input id="net-file" type="file" accept=".json,application/json,text/plain" hidden></label></div>
      <p class="net-msg" id="net-m"></p>
      <p class="muted small">Tipp: So ziehst du deinen Spielstand auf ein anderes Gerät oder in einen anderen Browser um. Der Import fragt vor dem Überschreiben nach.</p>`;
    body.querySelector('#net-copy').onclick = async () => {
      const ta = body.querySelector('#net-code'); ta.select();
      try { await navigator.clipboard.writeText(code); msg('#net-m', 'Code kopiert ✔', true); } catch (e) { document.execCommand?.('copy'); msg('#net-m', 'Code markiert – mit Strg+C kopieren', true); }
    };
    body.querySelector('#net-dl').onclick = () => {
      const blob = new Blob([fileWrap(d)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `pixel-world-slot${slot + 1}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      msg('#net-m', 'Datei gespeichert ✔', true);
    };
    body.querySelector('#net-imp').onclick = () => {
      const r = decodeSave(body.querySelector('#net-in').value);
      if (r.error) { msg('#net-m', '✘ ' + r.error, false); return; }
      applyImport(r.data, 'dem Code');
    };
    body.querySelector('#net-file').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 500000) { msg('#net-m', '✘ Datei zu groß.', false); return; }
      const r = decodeSave(await f.text());
      if (r.error) { msg('#net-m', '✘ ' + r.error, false); return; }
      applyImport(r.data, 'der Datei');
    };
  }

  async function renderBoard() {
    title.textContent = 'Bestenliste · Boss-Bestzeiten';
    const b = net.bests(), mine = b[boardKind];
    body.innerHTML = `
      <div class="net-tabs">${Object.entries(net.BOSS_KINDS).map(([k, n]) => `<button data-k="${k}" class="${k === boardKind ? 'on' : ''}">${n}</button>`).join('')}</div>
      <p class="muted">Deine Bestzeit: <b>${mine ? net.fmtTime(mine.ms) : '— (Boss noch nicht besiegt)'}</b>${mine && mine.submitted ? ' · eingetragen ✔' : ''}</p>
      ${mine && !mine.submitted ? `<div class="net-row"><input id="net-name" maxlength="16" placeholder="Dein Name (max. 16)" value="${esc(net.playerName())}" aria-label="Name"><button id="net-sub">🏆 Eintragen</button></div>` : ''}
      <ol class="net-list" id="net-list"><li class="muted">Lade …</li></ol>
      <p class="net-msg" id="net-m"></p>
      <p class="muted small">Nur Name und Zeit werden gespeichert – keine Konten, keine persönlichen Daten.</p>`;
    body.querySelectorAll('.net-tabs button').forEach((bt) => { bt.onclick = () => { boardKind = bt.dataset.k; renderBoard(); }; });
    const sub = body.querySelector('#net-sub');
    if (sub) sub.onclick = async () => {
      const name = net.cleanName(body.querySelector('#net-name').value);
      if (name.length < 2) { msg('#net-m', '✘ Bitte einen Namen mit mind. 2 Zeichen.', false); return; }
      net.setPlayerName(name); sub.disabled = true;
      try { const r = await net.submitScore(boardKind, name, mine.ms); net.markSubmitted(boardKind); toast(`Eingetragen – Platz ${r.rank}`); renderBoard(); }
      catch (e) { sub.disabled = false; msg('#net-m', '✘ ' + e.message, false); }
    };
    const list = body.querySelector('#net-list');
    try {
      const r = await net.leaderboard(boardKind);
      if (view !== 'board' || !list.isConnected) return;
      list.innerHTML = r.top.length ? r.top.map((e, i) => `<li><span>${i + 1}. ${esc(e.name)}</span><b>${net.fmtTime(e.ms)}</b></li>`).join('') : '<li class="muted">Noch keine Einträge – sei die/der Erste!</li>';
    } catch (e) { list.innerHTML = `<li class="muted">Bestenliste gerade nicht erreichbar (${esc(e.message)}). Das Spiel läuft offline normal weiter.</li>`; }
  }

  function renderCloud() {
    title.textContent = 'Cloud-Spielstand (Sync-Code)';
    let code = ''; try { code = localStorage.getItem(CLOUD_KEY) || ''; } catch (e) { /* */ }
    body.innerHTML = `
      <p class="muted">Sichere deinen aktuellen Slot auf dem Pixel-World-Server und lade ihn auf einem anderen Gerät mit dem Sync-Code. Kein Konto, keine persönlichen Daten.</p>
      <p>Dein Sync-Code: <b id="net-cc">${code ? esc(code) : '— noch keiner'}</b></p>
      <div class="net-row"><button id="net-up">☁ ${code ? 'Cloud aktualisieren' : 'In Cloud sichern'}</button></div>
      <h3>Von einem anderen Gerät laden</h3>
      <div class="net-row"><input id="net-ci" maxlength="14" placeholder="Sync-Code, z. B. ABCD-EFGH-JK" aria-label="Sync-Code"><button id="net-load">⬇ Laden</button></div>
      <p class="net-msg" id="net-m"></p>
      <p class="muted small">Wer den Code kennt, kann den Spielstand laden – teile ihn nur mit dir selbst.</p>`;
    body.querySelector('#net-up').onclick = async (ev) => {
      saveNow(); const d = readSlotData(currentSlot());
      if (!d) { msg('#net-m', '✘ Dieser Slot ist leer.', false); return; }
      ev.target.disabled = true;
      try {
        let r;
        try { r = code ? await net.cloudUpdate(code, d) : await net.cloudCreate(d); }
        catch (e) { if (code && /nicht gefunden/i.test(e.message)) r = await net.cloudCreate(d); else throw e; }
        code = r.code; try { localStorage.setItem(CLOUD_KEY, code); } catch (e) { /* */ }
        body.querySelector('#net-cc').textContent = code; msg('#net-m', 'Gesichert ✔', true);
      } catch (e) { msg('#net-m', '✘ ' + e.message, false); }
      ev.target.disabled = false;
    };
    body.querySelector('#net-load').onclick = async () => {
      const c = body.querySelector('#net-ci').value.trim().toUpperCase();
      if (!/^[A-Z0-9-]{8,14}$/.test(c)) { msg('#net-m', '✘ Ungültiger Sync-Code.', false); return; }
      try {
        const r = await net.cloudLoad(c);
        const d = decodeSave(JSON.stringify(r.save));
        if (d.error) { msg('#net-m', '✘ ' + d.error, false); return; }
        try { localStorage.setItem(CLOUD_KEY, c); } catch (e) { /* */ }
        applyImport(d.data, 'der Cloud');
      } catch (e) { msg('#net-m', '✘ ' + e.message, false); }
    };
  }

  function render() {
    if (view === 'save') renderSave(); else if (view === 'board') renderBoard(); else renderCloud();
  }
  return { open, render, get view() { return view; } };
}
