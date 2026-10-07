// HTML-Oberfläche: Herzen/Taler im HUD, Hinweise (Toasts), Quest-Banner, Inventar, Questlog, Laden.
import { ITEMS } from './items.js';
import { QUESTS, QUEST_ORDER } from './quests.js';

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
    this.inv = $('inv'); this.ql = $('questlog'); this.shop = $('shop');
  }
  get open() { return this.mode !== null; }

  // ------------------------------------------------------------ HUD
  updateHud() {
    const s = this.G.state, key = `${s.hp}/${s.maxHp}/${s.coins}`;
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
  banner(kicker, title, lines = [], hint = '') {
    const b = this.bannerEl;
    b.innerHTML = `<small>${kicker}</small><div class="b-title">${title}</div>` + (lines.length ? `<div class="b-lines">${lines.map((l) => `<span>${l}</span>`).join('')}</div>` : '') + (hint ? `<div class="b-hint">${hint}</div>` : '');
    document.getElementById('area').classList.remove('show');
    b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), 3600);
  }

  // ------------------------------------------------------------ Fenster
  toggle(mode) {
    if (this.mode === mode) return this.close();
    this.close();
    this.mode = mode;
    const el = { inv: this.inv, quests: this.ql, shop: this.shop }[mode];
    el.classList.remove('hidden');
    if (mode === 'shop') this.shopSel = 0;
    this.render();
  }
  close() {
    this.mode = null;
    for (const el of [this.inv, this.ql, this.shop]) el.classList.add('hidden');
  }
  items() { return Object.keys(this.G.state.inv).filter((k) => this.G.state.inv[k] > 0); }
  render() {
    if (this.mode === 'inv') this.renderInv();
    else if (this.mode === 'quests') this.renderQuests();
    else if (this.mode === 'shop') this.renderShop();
  }
  renderInv() {
    const s = this.G.state, list = this.items();
    this.sel = Math.max(0, Math.min(this.sel, SLOTS - 1));
    let grid = '';
    for (let i = 0; i < SLOTS; i++) {
      const id = list[i];
      grid += `<div class="slot${i === this.sel ? ' sel' : ''}">${id ? `<img src="${this.icon[id]}"><b>${s.inv[id] > 1 ? s.inv[id] : ''}</b>` : ''}</div>`;
    }
    const eq = (id, label) => `<div class="eq"><div class="slot">${id ? `<img src="${this.icon[id]}">` : ''}</div><span>${label}<br><i>${id ? ITEMS[id].name : '—'}</i></span></div>`;
    const cur = list[this.sel];
    const def = cur && ITEMS[cur];
    const action = def && def.type === 'use' ? '<em>E – benutzen</em>' : '';
    this.inv.querySelector('.inv-body').innerHTML =
      `<div class="inv-top">${eq(s.weapon, 'Waffe')}${eq(s.lamp ? 'grubenlampe' : null, 'Lampe')}
        <div class="purse"><img src="${this.icon.taler}"> ${s.coins} Taler<br><span class="hp">${s.hp / 2} / ${s.maxHp / 2} Herzen</span></div></div>
       <div class="grid">${grid}</div>
       <div class="desc">${def ? `<b>${def.name}${s.inv[cur] > 1 ? ' ×' + s.inv[cur] : ''}</b><p>${def.desc}</p>${action}` : '<p class="muted">Leerer Platz.</p>'}</div>`;
  }
  renderQuests() {
    const s = this.G.state;
    const ids = QUEST_ORDER.filter((id) => s.quests[id]);
    const active = ids.filter((id) => s.quests[id] === 'active'), done = ids.filter((id) => s.quests[id] === 'done');
    let html = '';
    if (!ids.length) html = '<p class="muted">Noch keine Quests. Sprich mit den Leuten im Dorf!</p>';
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
  renderShop() {
    const s = this.G.state;
    this.shop.querySelector('.shop-body').innerHTML = SHOP_ITEMS.map((id, i) => {
      const d = ITEMS[id], afford = s.coins >= d.price;
      return `<div class="shop-row${i === this.shopSel ? ' sel' : ''}${afford ? '' : ' poor'}"><img src="${this.icon[id]}"><div><b>${d.name}</b><p>${d.desc}</p></div><span class="price"><img src="${this.icon.taler}">${d.price}</span><span class="own">im Besitz: ${s.inv[id] || 0}</span></div>`;
    }).join('') + `<div class="purse"><img src="${this.icon.taler}"> ${s.coins} Taler</div>`;
  }

  /** Tastatur, während ein Fenster offen ist. true = verbraucht. */
  key(code) {
    if (!this.mode) return false;
    const m = this.mode;
    if (code === 'Escape' || (m === 'inv' && (code === 'KeyI' || code === 'Tab')) || (m === 'quests' && code === 'KeyQ')) { this.close(); return true; }
    if (m === 'inv') {
      const d = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1, ArrowUp: -COLS, KeyW: -COLS, ArrowDown: COLS, KeyS: COLS }[code];
      if (d) { this.sel = (this.sel + d + SLOTS) % SLOTS; this.render(); return true; }
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') { const id = this.items()[this.sel]; if (id) this.G.useItem(id); this.render(); return true; }
    } else if (m === 'shop') {
      const d = { ArrowUp: -1, KeyW: -1, ArrowDown: 1, KeyS: 1 }[code];
      if (d) { this.shopSel = (this.shopSel + d + SHOP_ITEMS.length) % SHOP_ITEMS.length; this.render(); return true; }
      if (code === 'KeyE' || code === 'Enter' || code === 'Space') { this.G.buy(SHOP_ITEMS[this.shopSel]); this.render(); return true; }
    }
    return true; // alle anderen Tasten schlucken (Spiel pausiert)
  }
}
