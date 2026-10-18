// Speichern/Laden im localStorage. Reset über ?reset=1.
const KEY = 'pixelworld.save.v1';

export function newGameState() {
  return {
    hp: 6, maxHp: 6, coins: 10,
    inv: {},                 // itemId -> Anzahl (Reihenfolge = Einsammel-Reihenfolge)
    weapon: null, lamp: false,
    quests: { schwert: 'active' },
    taken: {},               // dauerhaft eingesammelte Welt-Gegenstände
    opened: {},              // geöffnete Truhen
    story: { ch: 0, flags: {} }, // Hauptgeschichte: Kapitel (0 = Intro) + Story-Flags
    title: null,             // Ehrentitel nach dem Sieg
  };
}

export function saveGame(game, pos) {
  try {
    const s = game;
    const data = {
      v: 1, time: Date.now(),
      map: pos.map, x: pos.x, y: pos.y, dir: pos.dir,
      hp: s.hp, maxHp: s.maxHp, coins: s.coins, inv: s.inv, weapon: s.weapon, lamp: s.lamp,
      quests: s.quests, taken: s.taken, opened: s.opened, visited: [...pos.visited], tint: pos.tint,
      story: s.story, title: s.title, settings: pos.settings || null,
    };
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.v === 1 ? d : null;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
}
