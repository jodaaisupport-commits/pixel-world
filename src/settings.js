// Erweiterte Einstellungen (Audio-Kanäle, Touch, Barrierefreiheit, Performance).
const KEY = 'pixelworld.settings.v2';
export const SETTINGS_DEFAULTS = {
  music: true, sfx: true, ui: true,
  musicVol: 0.6, sfxVol: 0.8, uiVol: 0.7,
  mute: false,
  touchMode: 'auto',        // auto|on|off
  stickMode: 'analog',      // analog|dpad
  btnA: 'interact',         // interact|attack|dodge|use
  btnB: 'attack',
  vibrate: true,
  showEnemyHp: false,
  bigText: false,
  colorblind: false,
  performance: false,
  stereoPan: true,
  landscapeHintSeen: false,
  homescreenTipShown: false,
  tutorialDone: false,
  rotateDismissed: false,
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // Migration aus Audio-Settings v1
      const v1 = JSON.parse(localStorage.getItem('pixelworld.settings.v1') || '{}');
      return { ...SETTINGS_DEFAULTS, ...v1 };
    }
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(raw) };
  } catch (e) {
    return { ...SETTINGS_DEFAULTS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
}

export function applyBodyClasses(s) {
  document.body.classList.toggle('big-text', !!s.bigText);
  document.body.classList.toggle('colorblind', !!s.colorblind);
  document.body.classList.toggle('perf', !!s.performance);
  document.body.classList.toggle('dpad', s.stickMode === 'dpad');
}
