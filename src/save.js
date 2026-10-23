// Speichern/Laden im localStorage. Multi-Slot (Item 80). Reset über ?reset=1&slot=N.
const KEY_PREFIX = 'pixelworld.save.v1';
const SLOT_KEY = 'pixelworld.save.slot';
const META_KEY = 'pixelworld.save.meta';

export function currentSlot() {
  try { return Math.max(0, Math.min(2, +(localStorage.getItem(SLOT_KEY) || 0))); } catch (e) { return 0; }
}
export function setSlot(n) {
  try { localStorage.setItem(SLOT_KEY, String(Math.max(0, Math.min(2, n)))); } catch (e) { /* */ }
}
function key(slot = currentSlot()) { return `${KEY_PREFIX}.s${slot}`; }

export function newGameState() {
  return {
    hp: 6, maxHp: 6, coins: 10,
    inv: {},
    weapon: null, lamp: false,
    boots: false, hook: false, grip: false,
    quests: { schwert: 'active' },
    taken: {},
    opened: {},
    story: { ch: 0, ch2: 0, flags: {} },
    title: null,
    // v100 defaults
    shield: 0, combo: 0, status: {},
    hotbar: [null, null, null, null], hotbarSel: 0,
    collect: {}, warps: {}, journal: [], mail: [],
    rep: {}, friend: {}, lore: {}, farm: {},
    fish: { caught: [], best: 0 },
    equipSlots: { weapon: null, helm: null, armor: null, boots: null, amulet: null },
    durability: {}, keyring: [], recipesKnown: { heiltrank: true, saat: true },
    unlockedWeapons: {}, skin: null, checkpoint: null,
    companion: null, partner: null, choices: {},
    weather: 'klar', dayTime: 0, stamina: 100, mount: null, boat: false, ore: 0,
  };
}

export function saveGame(game, pos, slot = currentSlot()) {
  try {
    const s = game;
    const data = {
      v: 1, time: Date.now(), slot,
      map: pos.map, x: pos.x, y: pos.y, dir: pos.dir,
      hp: s.hp, maxHp: s.maxHp, coins: s.coins, inv: s.inv, weapon: s.weapon, lamp: s.lamp, boots: s.boots, hook: s.hook, grip: s.grip,
      quests: s.quests, taken: s.taken, opened: s.opened, visited: [...pos.visited], tint: pos.tint,
      story: s.story, title: s.title, settings: pos.settings || null,
      // v100
      shield: s.shield, combo: s.combo, status: s.status, hotbar: s.hotbar, hotbarSel: s.hotbarSel,
      collect: s.collect, warps: s.warps, journal: s.journal, mail: s.mail, rep: s.rep, friend: s.friend,
      lore: s.lore, farm: s.farm, fish: s.fish, equipSlots: s.equipSlots, durability: s.durability,
      keyring: s.keyring, recipesKnown: s.recipesKnown, unlockedWeapons: s.unlockedWeapons,
      skin: s.skin, checkpoint: s.checkpoint, companion: s.companion, partner: s.partner, choices: s.choices,
      weather: s.weather, dayTime: s.dayTime, stamina: s.stamina, mount: s.mount, boat: s.boat, ore: s.ore,
    };
    localStorage.setItem(key(slot), JSON.stringify(data));
    // legacy single-key mirror for old readers
    localStorage.setItem(KEY_PREFIX, JSON.stringify(data));
    // meta for slot UI
    const meta = listSlots();
    meta[slot] = { time: data.time, map: data.map, title: data.title, ch: data.story?.ch, ch2: data.story?.ch2, hp: data.hp };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(slot = currentSlot()) {
  try {
    let raw = localStorage.getItem(key(slot));
    if (!raw && slot === 0) raw = localStorage.getItem(KEY_PREFIX); // legacy
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === 1 ? d : null;
  } catch (e) {
    return null;
  }
}

export function clearSave(slot = currentSlot()) {
  try {
    localStorage.removeItem(key(slot));
    if (slot === 0) localStorage.removeItem(KEY_PREFIX);
    const meta = listSlots();
    meta[slot] = null;
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (e) { /* ignorieren */ }
}

export function listSlots() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '[null,null,null]'); }
  catch (e) { return [null, null, null]; }
}

/** Confirm-aware clear used by UI (Item 82). */
export function clearSaveConfirm(slot, confirmFn) {
  if (confirmFn && !confirmFn(`Spielstand Slot ${slot + 1} wirklich löschen?`)) return false;
  clearSave(slot);
  return true;
}
