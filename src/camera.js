// Kamera: folgt der Spielfigur pixelgenau und bleibt innerhalb der Karte.
export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW; this.worldH = worldH;
    this.x = 0; this.y = 0; this.w = 320; this.h = 240;
  }
  resize(w, h) { this.w = w; this.h = h; }
  /** Zentriert auf (tx, ty) in Welt-Pixeln, geklemmt an die Kartenränder. */
  follow(tx, ty) {
    const clampAxis = (v, view, world) => (world <= view ? Math.floor((world - view) / 2) : Math.max(0, Math.min(world - view, v)));
    // w/h sind gerade -> round(x - w/2) == round(x) - w/2, dadurch kein Jitter
    this.x = clampAxis(Math.round(tx) - this.w / 2, this.w, this.worldW);
    this.y = clampAxis(Math.round(ty) - this.h / 2, this.h, this.worldH);
  }
  visible(x, y, w, h, pad = 0) {
    return x + w > this.x - pad && x < this.x + this.w + pad && y + h > this.y - pad && y < this.y + this.h + pad;
  }
}
