// Touch-Steuerung: virtueller Analog-Joystick (links unten), Pixel-Art-Knöpfe A/B (rechts unten) und kleine
// Knöpfe für Inventar, Questlog, Karte, Optionen, Rennen und Vollbild. Multi-Touch über Pointer-Events
// (jeder Finger hat seine eigene pointerId). Die Knöpfe lösen dieselben Aktionen aus wie die Tastatur.
const MODE_KEY = 'pixelworld.touch';
const STICK_KEY = 'pixelworld.stick';
const BTN_KEY = 'pixelworld.btns';
const DEAD = 0.22, RUN = 0.82, RADIUS = 46; // Totzone, Rennschwelle (Anteil des Radius), Radius in CSS-Pixeln

/** Kleine Pixel-Grafik als Canvas: Kreis-/Rundknopf mit Glyphe. */
function pixButton(size, fill, dark, glyph, glyphColor = '#fff6d8') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), r = size / 2 - 0.5, cx = size / 2 - 0.5;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const d = Math.hypot(px - cx, py - cx);
    if (d > r) continue;
    x.fillStyle = d > r - 1.2 ? '#20161a' : py < cx - r * 0.35 && d < r - 2 ? lighten(fill) : py > cx + r * 0.45 ? dark : fill;
    x.fillRect(px, py, 1, 1);
  }
  if (glyph) {
    const rows = glyph, gh = rows.length, gw = rows[0].length, ox = Math.round((size - gw) / 2), oy = Math.round((size - gh) / 2);
    rows.forEach((row, y) => [...row].forEach((ch, i) => {
      if (ch === '#') { x.fillStyle = '#20161a'; x.fillRect(ox + i + 1, oy + y + 1, 1, 1); }
    }));
    rows.forEach((row, y) => [...row].forEach((ch, i) => { if (ch === '#') { x.fillStyle = glyphColor; x.fillRect(ox + i, oy + y, 1, 1); } }));
  }
  return c.toDataURL();
}
function lighten(hex) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.min(255, v + 46);
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
const GLYPH = {
  A: ['..#..', '.#.#.', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  inv: ['.###.', '#...#', '#####', '#.#.#', '#...#', '#####'],
  quest: ['#####', '#...#', '#.#.#', '#...#', '#.#.#', '#####'],
  map: ['#.#.#', '##.##', '#.#.#', '##.##', '#.#.#'],
  pause: ['##.##', '##.##', '##.##', '##.##', '##.##'],
  run: ['..##.', '.##..', '#####', '..##.', '.##..'],
  full: ['##.##', '#...#', '.....', '#...#', '##.##'],
};

export function createTouch({ onKey, isMenu }) {
  const mql = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null;
  const detected = (mql && mql.matches) || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  let mode = 'auto';
  try { mode = localStorage.getItem(MODE_KEY) || 'auto'; } catch (e) { /* egal */ }
  let stickMode = 'analog';
  try { stickMode = localStorage.getItem(STICK_KEY) || 'analog'; } catch (e) {}
  let btnMap = { A: 'interact', B: 'attack' };
  try { btnMap = { ...btnMap, ...JSON.parse(localStorage.getItem(BTN_KEY) || '{}') }; } catch (e) {}
  const T = { dirs: { up: false, down: false, left: false, right: false, run: false }, moving: false, runLatch: false, vec: { x: 0, y: 0 } };
  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = `
    <div class="t-zone"></div>
    <div class="t-stick"><div class="t-base"></div><div class="t-knob"></div></div>
    <div class="t-btns">
      <button class="t-btn t-b" data-k="B" aria-label="Schwert"></button>
      <button class="t-btn t-a" data-k="A" aria-label="Aktion"></button>
    </div>
    <div class="t-small">
      <button class="t-sm" data-k="inv" aria-label="Inventar"></button>
      <button class="t-sm" data-k="quest" aria-label="Questlog"></button>
      <button class="t-sm" data-k="map" aria-label="Karte"></button>
      <button class="t-sm" data-k="run" aria-label="Rennen"></button>
    </div>
    <div class="t-top">
      <button class="t-sm" data-k="full" aria-label="Vollbild"></button>
      <button class="t-sm" data-k="pause" aria-label="Optionen"></button>
    </div>`;
  document.body.appendChild(root);
  const base = root.querySelector('.t-base'), knob = root.querySelector('.t-knob'), stick = root.querySelector('.t-stick');
  const art = {
    A: pixButton(26, '#3aa24a', '#1f6a2c', GLYPH.A), B: pixButton(26, '#c8423a', '#7a2020', GLYPH.B),
    inv: pixButton(15, '#8a6a3a', '#5a4020', GLYPH.inv), quest: pixButton(15, '#8a6a3a', '#5a4020', GLYPH.quest),
    map: pixButton(15, '#8a6a3a', '#5a4020', GLYPH.map), run: pixButton(15, '#8a6a3a', '#5a4020', GLYPH.run),
    runOn: pixButton(15, '#d8a020', '#8a6010', GLYPH.run), full: pixButton(15, '#5a5a78', '#34344a', GLYPH.full), pause: pixButton(15, '#5a5a78', '#34344a', GLYPH.pause),
  };
  for (const b of root.querySelectorAll('[data-k]')) b.style.backgroundImage = `url(${art[b.dataset.k]})`;
  base.style.backgroundImage = `url(${(() => {
    const s = 40, c = document.createElement('canvas'); c.width = c.height = s; const x = c.getContext('2d');
    for (let py = 0; py < s; py++) for (let px = 0; px < s; px++) { const d = Math.hypot(px - 19.5, py - 19.5);
      if (d < 19.5 && d > 18) { x.fillStyle = 'rgba(32,22,26,0.9)'; x.fillRect(px, py, 1, 1); }
      else if (d <= 18 && d > 16.5) { x.fillStyle = 'rgba(255,240,200,0.55)'; x.fillRect(px, py, 1, 1); }
      else if (d <= 16.5) { x.fillStyle = 'rgba(20,16,15,0.32)'; x.fillRect(px, py, 1, 1); } }
    for (const [dx, dy] of [[0, -13], [0, 13], [-13, 0], [13, 0]]) { x.fillStyle = 'rgba(255,240,200,0.6)'; x.fillRect(19 + dx, 19 + dy, 2, 2); }
    return c.toDataURL(); })()})`;
  knob.style.backgroundImage = `url(${pixButton(18, '#e8dcc2', '#9a8a70', null)})`;

  // ---------------------------------------------------------- Joystick
  let stickId = null, cx = 0, cy = 0, lastNav = '', navT = 0;
  const zone = root.querySelector('.t-zone');
  function restPos() { const r = stick.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function setKnob(dx, dy) { knob.style.transform = `translate(${dx}px, ${dy}px)`; }
  function moveStick(px, py) {
    let dx = px - cx, dy = py - cy; const l = Math.hypot(dx, dy);
    if (l > RADIUS) { dx *= RADIUS / l; dy *= RADIUS / l; }
    setKnob(dx, dy);
    const m = Math.min(1, l / RADIUS), d = T.dirs;
    T.vec.x = dx / RADIUS; T.vec.y = dy / RADIUS;
    if (m < DEAD) { d.up = d.down = d.left = d.right = false; d.run = T.runLatch; T.moving = false; return; }
    let vx, vy;
    if (stickMode === 'dpad') {
      // 4-Wege D-Pad
      vx = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : 0;
      vy = Math.abs(dy) > Math.abs(dx) ? Math.sign(dy) : 0;
    } else {
      const a = Math.atan2(dy, dx), oct = Math.round(a / (Math.PI / 4));
      vx = Math.round(Math.cos(oct * Math.PI / 4)); vy = Math.round(Math.sin(oct * Math.PI / 4));
    }
    d.left = vx < 0; d.right = vx > 0; d.up = vy < 0; d.down = vy > 0;
    d.run = T.runLatch || m > RUN;
    T.moving = true;
  }
  function releaseStick() {
    stickId = null; T.moving = false; const d = T.dirs; d.up = d.down = d.left = d.right = false; d.run = T.runLatch;
    setKnob(0, 0); stick.style.transform = ''; root.classList.remove('stick-on'); lastNav = '';
  }
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault(); onKey('__unlock');
    if (stickId !== null) return;
    stickId = e.pointerId; zone.setPointerCapture?.(e.pointerId);
    const r = restPos();
    // Joystick springt unter den Daumen (innerhalb der linken Zone)
    stick.style.transform = `translate(${e.clientX - r.x}px, ${e.clientY - r.y}px)`;
    cx = e.clientX; cy = e.clientY; root.classList.add('stick-on');
    moveStick(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) { e.preventDefault(); moveStick(e.clientX, e.clientY); } });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { if (e.pointerId === stickId) releaseStick(); });

  // ---------------------------------------------------------- Knöpfe
  const KEY = { A: 'KeyE', inv: 'KeyI', quest: 'KeyQ', map: 'KeyM', pause: 'KeyP' };
  for (const b of root.querySelectorAll('[data-k]')) {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation(); onKey('__unlock');
      b.classList.add('down'); b.setPointerCapture?.(e.pointerId);
      const k = b.dataset.k;
      if (k === 'B' || k === 'A') {
        if (isMenu() && k === 'B') onKey('Escape');
        else {
          const act = btnMap[k] || (k === 'A' ? 'interact' : 'attack');
          const code = { interact: 'KeyE', attack: 'KeyJ', dodge: 'KeyK', use: 'Digit1', pause: 'KeyP' }[act] || 'KeyE';
          onKey(code);
        }
      }
      else if (k === 'run') { T.runLatch = !T.runLatch; T.dirs.run = T.runLatch; b.style.backgroundImage = `url(${T.runLatch ? art.runOn : art.run})`; }
      else if (k === 'full') toggleFullscreen();
      else onKey(KEY[k]);
    });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => b.classList.remove('down'));
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  function toggleFullscreen() {
    const d = document, el = d.documentElement;
    try {
      if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: 'hide' })?.catch?.(() => {});
    } catch (e) { /* nicht unterstützt (iPhone) */ }
  }
  if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) root.querySelector('[data-k="full"]').remove();

  /** Pro Frame: im Menü Joystick als Pfeiltasten (mit Wiederholung), sonst Richtungen fürs Laufen. */
  T.update = (dt) => {
    if (!T.active) return;
    if (isMenu() && T.moving) {
      const d = T.dirs, k = d.up ? 'ArrowUp' : d.down ? 'ArrowDown' : d.left ? 'ArrowLeft' : d.right ? 'ArrowRight' : '';
      navT -= dt;
      if (k && (k !== lastNav || navT <= 0)) { onKey(k); navT = k === lastNav ? 0.18 : 0.42; }
      lastNav = k;
    } else lastNav = '';
  };
  T.apply = () => {
    T.active = mode === 'on' || (mode === 'auto' && detected);
    document.body.classList.toggle('touch', T.active);
    root.classList.toggle('hidden', !T.active);
    if (!T.active) releaseStick();
  };
  T.cycleMode = () => { mode = { auto: 'on', on: 'off', off: 'auto' }[mode]; try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* egal */ } T.apply(); };
  T.modeLabel = () => ({ auto: detected ? 'Auto (an)' : 'Auto (aus)', on: 'An', off: 'Aus' }[mode]);
  T.cycleStick = () => { stickMode = stickMode === 'analog' ? 'dpad' : 'analog'; try { localStorage.setItem(STICK_KEY, stickMode); } catch (e) {} document.body.classList.toggle('dpad', stickMode === 'dpad'); return stickMode; };
  T.stickLabel = () => stickMode === 'dpad' ? 'D-Pad' : 'Analog';
  T.setButtons = (a, b) => { btnMap = { A: a || btnMap.A, B: b || btnMap.B }; try { localStorage.setItem(BTN_KEY, JSON.stringify(btnMap)); } catch (e) {} };
  T.btnLabel = () => `A=${btnMap.A} B=${btnMap.B}`;
  T.cycleButtons = () => { const opts = ['interact', 'attack', 'dodge', 'use']; const i = opts.indexOf(btnMap.A); btnMap.A = opts[(i + 1) % opts.length]; btnMap.B = btnMap.A === 'attack' ? 'interact' : 'attack'; try { localStorage.setItem(BTN_KEY, JSON.stringify(btnMap)); } catch (e) {} return T.btnLabel(); };
  T.release = releaseStick;
  T.apply();
  document.body.classList.toggle('dpad', stickMode === 'dpad');
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) root.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  return T;
}
