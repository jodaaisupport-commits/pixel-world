// Dialogbox mit Namensschild, Schreibmaschinen-Effekt und mehreren Seiten.
export class Dialog {
  constructor(root) {
    this.root = root;
    this.nameEl = root.querySelector('.dlg-name');
    this.textEl = root.querySelector('.dlg-text');
    this.moreEl = root.querySelector('.dlg-more');
    this.open = false;
    this.pages = []; this.page = 0; this.shown = 0; this.onClose = null;
    this.cps = 45; // Zeichen pro Sekunde
  }
  show(name, pages, onClose = null) {
    this.pages = Array.isArray(pages) ? pages : [pages];
    this.page = 0; this.shown = 0; this.onClose = onClose;
    this.nameEl.textContent = name || '';
    this.nameEl.classList.toggle('hidden', !name);
    this.root.classList.remove('hidden');
    this.open = true;
    this.render();
  }
  get current() { return this.pages[this.page] || ''; }
  get typing() { return this.shown < this.current.length; }
  update(dt) {
    if (!this.open || !this.typing) return;
    this.shown = Math.min(this.current.length, this.shown + dt * this.cps);
    this.render();
  }
  /** E/Leertaste: Text sofort fertig schreiben, sonst nächste Seite bzw. schließen. */
  advance() {
    if (!this.open) return;
    if (this.typing) { this.shown = this.current.length; this.render(); return; }
    if (this.page < this.pages.length - 1) { this.page++; this.shown = 0; this.render(); return; }
    this.close();
  }
  close() {
    this.root.classList.add('hidden');
    this.open = false;
    const cb = this.onClose; this.onClose = null;
    if (cb) cb();
  }
  render() {
    this.textEl.textContent = this.current.slice(0, Math.floor(this.shown));
    const last = this.page >= this.pages.length - 1;
    this.moreEl.textContent = this.typing ? '' : last ? '■' : '▼';
    this.moreEl.dataset.page = `${this.page + 1}/${this.pages.length}`;
  }
}
