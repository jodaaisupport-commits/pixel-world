// HTML-Oberfläche: Herzen/Taler im HUD, Hinweise (Toasts), Quest-Banner, Inventar, Questlog, Laden.
import { ITEMS } from './items.js';
import { QUESTS, QUEST_ORDER } from './quests.js';
import { CHAPTERS, MAIN_TITLE } from './story.js';
import { CHAPTERS2, TITLE2 } from './story2.js';

const $ = (id) => document.getElementById(id);
const COLS = 8, SLOTS = 24;
export const SHOP_ITEMS = ['apfel', 'heiltrank', 'grosstrank'];

export class UI {
  constructor(itemArt, G) {
    this.art = itemArt; this.G = G;
    this.mode = null; this.sel = 0; this.shopSel = 0;
    this.icon = {};
    for (const k in itemArt.icons) this.icon[k] = itemArt.icons[k].toDataURL();
    this.hearts = $('hearts'); this.hctx = this.hearts.getContext('2d');
    this.coinEl = $('coins'); this.lastHud = '';
    $('coin-icon').src = this.icon.taler;
    this.toasts = $('toasts'); this.bannerEl = $('banner'); this.bannerTimer = null;
    this.inv = $('inv'); this.ql = $('questlog'); this.shop = $('shop'); this.opt = $('options');
    this.bindTaps();
    this.optSel = 0; this.bannerQ = []; this.bannerBusy = 0;
    this.bossEl = $('bossbar'); this.cineEl = $('cine'); this.creditsEl = $('credits');
  }
  get open() { return this.mode !== null; }

  // ------------------------------------------------------------ HUD
  updateHud() {
    const s = this.G.state, key = `${s.hp}/${s.maxHp}/${s.coins}/${s.title || ''}`;
    if (key === this.lastHud) return;
    this.lastHud = key;
    const n = s.maxHp / 2, W = 13 * 2 + 2;
    this.hearts.width = n * W; this.hearts.height = 24;
    this.hearts.style.width = n * W + 'px'; this.hearts.style.height = '24px';
    const c = this.hctx; c.imageSmoothingEnabled = false;
    for (let i = 0; i < n; i++) {
      const v = s.hp - i * 2;
      const img = v >= 2 ? this.art.hearts.full : v === 1 ? this.art.hearts.half : this.art.hearts.empty;
      c.drawImage(img, 2, 3, 13, 12, i * W, 0, 26, 24);
    }
    this.coinEl.textContent = s.coins;
    const t = $('hud-title'); t.textContent = s.title ? '★ ' + s.title : ''; t.classList.toggle('hidden', !s.title);
  }
  /** Kurz die Herzen aufblinken lassen (Schaden). */
  pulse() { this.hearts.classList.remove('hit'); void this.hearts.offsetWidth; this.hearts.classList.add('hit'); }

  toast(text, item) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (item && this.icon[item] ? `<img src="${this.icon[item]}">` : '') + `<span>${text}</span>`;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 5) this.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }
  banner(kicker, title, lines = [], hint = '', cls = '') {
    const now = performance.now();
    if (now < this.bannerBusy) { this.bannerQ.push([kicker, title, lines, hint, cls]); if (!this.bannerQT) this.bannerQT = setTimeout(() => this.nextBanner(), this.bannerBusy - now + 50); return; }
    this.bannerBusy = now + 3300;
    const b = this.bannerEl;
    b.className = 'panel ' + cls;
    b.innerHTML = `<small>${kicker}</small><div class="b-title">${title}</div>` + (lines.length ? `<div class="b-lines">${lines.map((l) => `<span>${l}</span>`).join('')}</div>` : '') + (hint ? `<div class="b-hint">${hint}</div>` : '');
    document.getElementById('area').classList.remove('show');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 3600);
  }
  nextBanner() { this.bannerQT = null; const n = this.bannerQ.shift(); if (n) { this.bannerBusy = 0; this.banner(...n); } }

  // ------------------------------------------------------------ Boss-Leiste
  bossBar(boss, name, title) {
    if (!boss) { this.bossEl.classList.add('hidden'); this.bossKey = ''; return; }
    this.bossEl.classList.remove('hidden');
    const key = `${boss.hp}/${Math.round(boss.ghost)}/${boss.phase}/${boss.state === 'transition'}`;
    if (key === this.bossKey) return;
    const n = boss.phases || 3;
    if (!this.bossKey) this.bossEl.innerHTML = `<div class="bb-name">${name}<small>${title}</small></div><div class="bb-bar"><div class="bb-ghost"></div><div class="bb-fill"></div>${Array.from({ length: n - 1 }, (_, i) => `<i style="left:${(100 * (i + 1) / n).toFixed(1)}%"></i>`).join('')}</div><div class="bb-phase"></div>`;
    this.bossKey = key;
    this.bossEl.querySelector('.bb-fill').style.width = (100 * boss.hp / boss.maxHp) + '%';
    this.bossEl.querySelector('.bb-ghost').style.width = (100 * boss.ghost / boss.maxHp) + '%';
    this.bossEl.querySelector('.bb-phase').textContent = boss.state === 'transition' ? (boss.transitionText || 'Umbrakor zerbricht seinen Panzer!') : `Phase ${boss.phase} / ${n}`;
    this.bossEl.classList.toggle('p3', boss.phase === n && n > 1);
  }

  // ------------------------------------------------------------ Zwischensequenzen
  cine(panel, idx, total) {
    const el = this.cineEl;
    if (!panel) { el.classList.add('hidden'); document.body.classList.remove('cinema'); return; }
    el.classList.remove('hidden'); document.body.classList.add('cinema');
    el.querySelector('.cine-title').innerHTML = panel.title ? `${panel.title}<small>${panel.sub || ''}</small>` : '';
    el.querySelector('.cine-title').classList.toggle('hidden', !panel.title);
    const box = el.querySelector('.cine-text');
    box.classList.toggle('hidden', !panel.text);
    box.textContent = '';
    this.cineFull = panel.text || ''; this.cineShown = 0;
    el.querySelector('.cine-hint').textContent = `${idx + 1}/${total} · ${this.G.isTouch && this.G.isTouch() ? 'Antippen – weiter' : 'E – weiter · Esc – überspringen'}`;
  }
  cineTick(dt) {
    if (!this.cineFull || this.cineShown >= this.cineFull.length) return false;
    const before = Math.floor(this.cineShown);
    this.cineShown = Math.min(this.cineFull.length, this.cineShown + dt * 40);
    this.cineEl.querySelector('.cine-text').textContent = this.cineFull.slice(0, Math.floor(this.cineShown));
    return Math.floor(this.cineShown) !== before;
  }
  cineDone() { if (this.cineShown < this.cineFull.length) { this.cineShown = this.cineFull.length; this.cineEl.querySelector('.cine-text').textContent = this.cineFull; return false; } return true; }
  letterbox(on) { document.body.classList.toggle('letterbox', !!on); }
  credits(lines) {
    const el = this.creditsEl;
    if (!lines) { el.classList.add('hidden'); return; }
    el.querySelector('.cr-roll').innerHTML = lines.map(([k, t]) => k === 'g' ? '<div class="cr-gap"></div>' : `<div class="cr-${k}">${t}</div>`).join('');
    el.classList.remove('hidden');
    const roll = el.querySelector('.cr-roll'); roll.classList.remove('run'); void roll.offsetWidth; roll.classList.add('run');
  }

  // ------------------------------------------------------------ Fenster
  toggle(mode) {
    if (this.mode === mode) return this.close();
    this.close();
    this.mode = mode;
    const el = { inv: this.inv, quests: this.ql, shop: this.shop, options: this.opt }[mode];
    el.classList.remove('hidden');
    if (mode === 'shop') this.shopSel = 0;
    this.G.sfx('menu');
    this.render();
  }
  close() {
    if (this.mode) this.G.sfx('menu', { close: true });
    this.mode = null;
    for (const el of [this.inv, this.ql, this.shop, this.opt]) el.classList.add('hidden');
  }
  /** Antippen/Klicken: Schließen-Knopf, Inventarplätze, Ladenzeilen, Optionszeilen. */
  bindTaps() {
    for (const el of [this.inv, this.ql, this.shop, this.opt]) {
      const x = document.createElement('button'); x.className = 'win-close'; x.setAttribute('aria-label', 'Schließen'); x.textContent = '✕';
      x.addEventListener('click', (e) => { e.stopPropagation(); this.close(); });
      el.appendChild(x);
    }
    const pick = (el, sel, fn) => el.addEventListener('click', (e) => { const t = e.target.closest(sel); if (t) fn(+t.dataset.i, t, e); });
    pick(this.inv, '.slot[data-i]', (i) => { if (this.sel === i) this.key('KeyE'); else { this.sel = i; this.G.sfx('select'); this.render(); } });
    pick(this.shop, '.shop-row[data-i]', (i) => { if (this.shopSel === i) this.key('KeyE'); else { this.shopSel = i; this.G.sfx('select'); this.render(); } });
    pick(this.opt, '.opt-row[data-i]', (i, t, e) => {
      this.optSel = i; const k = this.optionRows()[i][2], r = t.getBoundingClientRect();
      if (k === 'musicVol' || k === 'sfxVol') this.key(e.clientX < r.left + r.width / 2 ? 'ArrowLeft' : 'ArrowRight');
      else this.key('KeyE');
    });
  }
  items() { return Object.keys(this.G.state.inv).filter((k) => this.G.state.inv[k] > 0); }
  render() {
    if (this.mode === 'inv') this.renderInv();
    else if (this.mode === 'quests') this.renderQuests();
    else if (this.mode === 'shop') this.renderShop();
    else if (this.mode === 'options') this.renderOptions();
  }
  optionRows() {
    const a = this.G.audio.settings, bar = (v) => '■'.repeat(Math.round(v * 10)) + '□'.repeat(10 - Math.round(v * 10));
    return [
      ['Musik', a.music ? 'An' : 'Aus', 'music'],
      ['Musik-Lautstärke', `${bar(a.musicVol)} ${Math.round(a.musicVol * 100)}%`, 'musicVol'],
      ['Soundeffekte', a.sfx ? 'An' : 'Aus', 'sfx'],
      ['Effekt-Lautstärke', `${bar(a.sfxVol)} ${Math.round(a.sfxVol * 100)}%`, 'sfxVol'],
      ['Touch-Steuerung', this.G.touchLabel ? this.G.touchLabel() : 'Aus', 'touch'],
      ['Zurück zum Spiel', '', 'close'],
    ];
  }
  renderOptions() {
    const rows = this.optionRows(), tr = this.G.trackName();
    this.opt.querySelector('.opt-body').innerHTML = rows.map(([l, v, k], i) => `<div data-i="${i}" class="opt-row${i === this.optSel ? ' sel' : ''}"><span>${i === this.optSel ? '▶' : '&nbsp;'} ${l}</span><b class="${v === 'Aus' ? 'off' : ''}">${v}</b></div>`).join('') +
      `<div class="opt-now">♪ Jetzt läuft: <b>${tr}</b>${this.G.audio.ready ? '' : ' <i>(Ton startet nach dem ersten Tastendruck)</i>'}</div>
       <div class="opt-keys"><b>N</b> Musik an/aus · <b>B</b> Effekte an/aus · <b>P</b>/<b>Esc</b> Optionen</div>`;
  }
  renderInv() {
    const s = this.G.state, list = this.items();
    this.sel = Math.max(0, Math.min(this.sel, SLOTS - 1));
    let grid = '';
    for (let i = 0; i < SLOTS; i++) {
      const id = list[i];
      grid += `<div data-i="${i}" class="slot${i === this.sel ? ' sel' : ''}">${id ? `<img src="${this.icon[id]}"><b>${s.inv[id] > 1 ? s.inv[id] : ''}</b>` : ''}</div>`;
    }
    const eq = (id, label) => `<div class="eq"><div class="slot">${id ? `<img src="${this.icon[id]}">` : ''}</div><span>${label}<br><i>${id ? ITEMS[id].name : '—'}</i></span></div>`;
    const cur = list[this.sel];
    const def = cur && ITEMS[cur];
    const action = def && def.type === 'use' ? `<em>${this.G.isTouch && this.G.isTouch() ? 'Nochmal antippen' : 'E'} – benutzen</em>` : '';
    this.inv.querySelector('.inv-body').innerHTML =
      `<div class="inv-top">${eq(s.weapon, 'Waffe')}${eq(s.lamp ? 'grubenlampe' : null, 'Lampe')}
        <div class="purse"><img src="${this.icon.taler}"> ${s.coins} Taler<br><span class="hp">${s.hp / 2} / ${s.maxHp / 2} Herzen</span></div></div>
       ${s.boots || s.hook || s.grip || (s.story && s.story.ch2) ? `<div class="inv-top tools">${eq(s.boots ? 'sandlaeufer' : null, 'Stiefel')}${eq(s.hook ? 'enterhaken' : null, 'Haken')}${eq(s.grip ? 'steigeisen' : null, 'Eisen')}</div>` : ''}
       <div class="grid">${grid}</div>
       <div class="desc">${def ? `<b>${def.name}${s.inv[cur] > 1 ? ' ×' + s.inv[cur] : ''}</b><p>${def.desc}</p>${action}` : '<p class="muted">Leerer Platz.</p>'}</div>`;
  }
  renderQuests() {
    const s = this.G.state;
    const ids = QUEST_ORDER.filter((id) => s.quests[id]);
    const active = ids.filter((id) => s.quests[id] === 'active'), done = ids.filter((id) => s.quests[id] === 'done');
    let html = '';
    const st = s.story || { ch: 0, flags: {} };
    if (st.ch >= 1 && st.ch <= 5) {
      const C = CHAPTERS[st.ch], steps = C.steps(this.G, st.flags, s.quests), cur = steps.findIndex((x) => !x.done);
      html += `<div class="quest main"><div class="q-kicker">Hauptquest · ${MAIN_TITLE} · Kapitel ${st.ch}/5</div><div class="q-title">${C.title}</div><p>${C.desc}</p><ul>` +
        steps.map((x, i) => (i <= cur || x.done ? `<li class="${x.done ? 'done' : 'cur'}">${x.done ? '✔' : '▸'} ${x.text}</li>` : '')).join('') + '</ul></div>';
    } else if (st.ch >= 6) html += `<div class="quest main"><div class="q-kicker">Hauptquest abgeschlossen</div><div class="q-title">${MAIN_TITLE}</div><p>Umbrakor ist besiegt, der Nebel ist fort. Die Welt gehört dir – erkunde sie in Ruhe weiter!</p></div>`;
    const ch2 = st.ch2 || 0;
    if (ch2 >= 1 && ch2 <= 5) {
      const C = CHAPTERS2[ch2], steps = C.steps(this.G, st.flags), cur = steps.findIndex((x) => !x.done);
      const card = `<div class="quest main arc2"><div class="q-kicker">Hauptquest · ${TITLE2} · Kapitel ${ch2}/5</div><div class="q-title">${C.title}</div><p>${C.desc}</p><ul>` +
        steps.map((x, i) => (i <= cur || x.done ? `<li class="${x.done ? 'done' : 'cur'}">${x.done ? '✔' : '▸'} ${x.text}</li>` : '')).join('') + '</ul></div>';
      html = card + (st.ch >= 6 ? `<div class="q-done">✔ Hauptquest „${MAIN_TITLE}“</div>` : html);
    } else if (ch2 >= 6) html = `<div class="quest main arc2"><div class="q-kicker">Hauptquest abgeschlossen</div><div class="q-title">${TITLE2}</div><p>Die drei Sternensplitter sind vereint. Sonne, Frost und Gezeiten sind wieder im Gleichgewicht, Sternenhüter!</p></div><div class="q-done">✔ Hauptquest „${MAIN_TITLE}“</div>`;
    if (!ids.length && !html) html = '<p class="muted">Noch keine Quests. Sprich mit den Leuten im Dorf!</p>';
    for (const id of active) {
      const q = QUESTS[id], steps = q.steps(this.G);
      let cur = steps.findIndex((st) => !st.done);
      html += `<div class="quest"><div class="q-title">${q.title}</div><div class="q-giver">von ${q.giver}</div><p>${q.desc}</p><ul>` +
        steps.map((st, i) => (i <= cur || st.done ? `<li class="${st.done ? 'done' : 'cur'}">${st.done ? '✔' : '▸'} ${st.text}</li>` : '')).join('') +
        `</ul><div class="q-reward">Belohnung: ${q.reward}</div></div>`;
    }
    if (done.length) html += '<div class="q-done-head">Abgeschlossen</div>' + done.map((id) => `<div class="q-done">✔ ${QUESTS[id].title}</div>`).join('');
    this.ql.querySelector('.ql-body').innerHTML = html;
  }
  shopItems() { return this.G.shopList ? this.G.shopList() : SHOP_ITEMS; }
  renderShop() {
    const s = this.G.state;
    const list = this.shopItems();
    this.shop.querySelector('h2').textContent = this.G.shopTitle ? this.G.shopTitle() : 'Antons Krämerladen';
    if (this.shopSel >= list.length) this.shopSel = 0;
    this.shop.querySelector('.shop-body').innerHTML = list.map((id, i) => {
      const d = ITEMS[id], afford = s.coins >= d.price;
      return `<div data-i="${i}" class="shop-row${i === this.shopSel ? ' sel' : ''}${afford ? '' : ' poor'}"><img src="${this.icon[id]}"><div><b>${d.name}</b><p>${d.desc}</p></div><span class="price"><img src="${this.icon.taler}">${d.price}</span><span class="own">${d.type === 'equip' ? 'Ausrüstung' : 'im Besitz: ' + (s.inv[id] || 0)}</span></div>`;
    }).join('') + `<div class="purse"><img src="${this.icon.taler}"> ${s.coins} Taler</div>`;
  }

  /** Tastatur, während ein Fenster offen ist. true = verbraucht. */
  key(code) {
    if (!this.mode) return false;
    const m = this.mode;
    if (code === 'Escape' || (m === 'inv' && (code === 'KeyI' || code === 'Tab')) || (m === 'quests' && code === 'KeyQ') || (m === 'options' && code === 'KeyP')) { this.close(); return true; }
    if (m === 'options') {
      const rows = this.optionRows(), A = this.G.audio;
      const d = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[code];
      if (d) { this.optSel = (this.optSel + d + rows.length) % rows.length; this.G.sfx('select'); this.render(); return true; }
      const k = rows[this.optSel][2], lr = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 }[code];
      const act = code === 'KeyE' || code === 'Enter' || code === 'Space';
      if (k === 'close' && act) { this.close(); return true; }
      if (k === 'touch' && (act || lr)) { this.G.touchCycle && this.G.touchCycle(); this.G.sfx('select'); this.render(); return true; }
      if ((k === 'music' || k === 'sfx') && (act || lr)) A.setSettings({ [k]: !A.settings[k] });
      if ((k === 'musicVol' || k === 'sfxVol') && (lr || act)) A.setSettings({ [k]: Math.max(0, Math.min(1, Math.round((A.settings[k] + (lr || 1) * 0.1) * 10) / 10)) });
      if (act || lr) { this.G.sfx('select'); this.G.markDirty(); }
      this.render(); return true;
    }
    if (m === 'inv') {
      const d = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -COLS, KeyW: -COLS, ArrowDown: COLS, KeyS: COLS }[code];
      if (d) { this.sel = (this.sel + d + SLOTS) % SLOTS; this.G.sfx('select'); this.render(); return true; }
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') { const id = this.items()[this.sel]; if (id) this.G.useItem(id); this.render(); return true; }
    } else if (m === 'shop') {
      const d = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[code];
      const L = this.shopItems();
      if (d) { this.shopSel = (this.shopSel + d + L.length) % L.length; this.G.sfx('select'); this.render(); return true; }
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') { this.G.buy(L[this.shopSel]); this.render(); return true; }
    }
    return true; // alle anderen Tasten schlucken (Spiel pausiert)
  }
}
