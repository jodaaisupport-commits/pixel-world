// Dialogbox mit Namensschild, Schreibmaschinen-Effekt, mehreren Seiten und optionaler Auswahl (Ja/Nein).
export class Dialog {
  constructor(root) {
    this.root = root;
    this.nameEl = root.querySelector('.dlg-name');
    this.textEl = root.querySelector('.dlg-text');
    this.moreEl = root.querySelector('.dlg-more');
    this.choiceEl = root.querySelector('.dlg-choices');
    this.open = false;
    this.pages = []; this.page = 0; this.shown = 0; this.onClose = null; this.choice = null; this.sel = 0;
    this.cps = 45; // Zeichen pro Sekunde
  }
  /** choice: { options: [..], onSelect(index) } – erscheint auf der letzten Seite. */
  show(name, pages, onClose = null, choice = null) {
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.page = 0; this.shown = 0; this.onClose = onClose; this.choice = choice; this.sel = 0;
    this.nameEl.textContent = name || '';
    this.nameEl.classList.toggle('hidden', !name);
    this.root.classList.remove('hidden');
    this.open = true;
    this.render();
  }
  get current() { return this.pages[this.page] || ''; }
  get typing() { return this.shown < this.current.length; }
  get choosing() { return !!this.choice && this.page >= this.pages.length - 1 && !this.typing; }
  update(dt) {
    if (!this.open || !this.typing) return;
    this.shown = Math.min(this.current.length, this.shown + dt * this.cps);
    this.render();
  }
  move(d) { if (this.choosing) { this.sel = (this.sel + d + this.choice.options.length) % this.choice.options.length; this.render(); } }
  /** E/Leertaste: Text sofort fertig schreiben, sonst nächste Seite, Auswahl bestätigen bzw. schließen. */
  advance() {
    if (!this.open) return;
    if (this.typing) { this.shown = this.current.length; this.render(); return; }
    if (this.page < this.pages.length - 1) { this.page++; this.shown = 0; this.render(); return; }
    const choice = this.choice, sel = this.sel;
    this.close();
    if (choice) choice.onSelect(sel);
  }
  close() {
    this.root.classList.add('hidden');
    this.open = false;
    this.choice = null;
    const cb = this.onClose; this.onClose = null;
    if (cb) cb();
  }
  render() {
    this.textEl.textContent = this.current.slice(0, Math.floor(this.shown));
    const last = this.page >= this.pages.length - 1;
    this.moreEl.textContent = this.typing || this.choosing ? '' : last ? '■' : '▼';
    this.moreEl.dataset.page = `${this.page + 1}/${this.pages.length}`;
    if (this.choosing) {
      this.choiceEl.classList.remove('hidden');
      this.choiceEl.innerHTML = this.choice.options.map((o, i) => `<div class="${i === this.sel ? 'sel' : ''}">${i === this.sel ? '▶' : '&nbsp;'} ${o}</div>`).join('');
    } else this.choiceEl.classList.add('hidden');
  }
}
