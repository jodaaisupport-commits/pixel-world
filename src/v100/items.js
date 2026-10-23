// Items: Crafting, Brauen, Equipment, Sort/Filter, Hotbar, Outline, Haltbarkeit, Rezepte, Schlüsselbund, Skins.
import { mark } from './registry.js';

export const RECIPES = {
  heiltrank: { station: 'mira', need: { moorkraut: 2, apfel: 1 }, out: ['heiltrank', 1] },
  speer: { station: 'bruno', need: { eisenerz: 2, taler: 10 }, out: ['speer', 1] },
  bogen: { station: 'bruno', need: { eisenerz: 1, moorkraut: 1 }, out: ['bogen', 1] },
  schild: { station: 'bruno', need: { eisenerz: 3 }, out: ['schild', 1] },
  saat: { station: 'hilde', need: { apfel: 1 }, out: ['saat', 3] },
  obsidianschwert: { station: 'bruno', need: { obsidian: 2, eisenerz: 2 }, out: ['obsidianschwert', 1] },
};

export const EXTRA_ITEMS = {
  speer: { name: 'Speer', type: 'equip', slot: 'weapon', dmg: 1, reach: 8, desc: 'Lange Reichweite. Gut gegen scheue Gegner.' },
  bogen: { name: 'Bogen', type: 'equip', slot: 'weapon', dmg: 1, reach: 0, ranged: true, desc: 'Fernkampf. Mit J schießen.' },
  schild: { name: 'Holzschild', type: 'equip', slot: 'shield', desc: 'Blockt frontale Treffer. Hält 3 Schläge.' },
  saat: { name: 'Saatgut', type: 'use', desc: 'Für Oma Hildes Beet. Mit E pflanzen.' },
  karotte: { name: 'Karotte', type: 'use', heal: 2, desc: 'Frisch vom Beet. Stellt 1 Herz wieder her.' },
  muschel: { name: 'Muschel', type: 'material', desc: 'Vom Strand. Zählt für die Sammel-Checkliste.' },
  gluehpilz: { name: 'Glühpilz', type: 'material', desc: 'Leuchtet im Dunkeln. Mira mag sie.' },
  obsidian: { name: 'Obsidian', type: 'material', desc: 'Vulkanglas. Bruno kann damit schmieden.' },
  perle: { name: 'Perle', type: 'material', desc: 'Aus der Unterwasser-Grotte.' },
  obsidianschwert: { name: 'Obsidianschwert', type: 'equip', slot: 'weapon', dmg: 3, reach: 2, desc: 'Geschmiedet aus Vulkanglas. Schaden 3.' },
  helm_leder: { name: 'Lederhelm', type: 'equip', slot: 'helm', desc: '+1 max HP solange getragen.' },
  ruestung_leder: { name: 'Lederrüstung', type: 'equip', slot: 'armor', desc: 'Reduziert Schaden um 1 (min. 1).' },
  amulett_glueck: { name: 'Glücksamulett', type: 'equip', slot: 'amulet', desc: 'Leicht höhere Krit-Chance.' },
  skin_rot: { name: 'Roter Umhang', type: 'cosmetic', desc: 'Nur Aussehen.' },
  skin_blau: { name: 'Blauer Umhang', type: 'cosmetic', desc: 'Nur Aussehen.' },
};

export function installItems(api) {
  const { game, G, ui, audio } = api;
  // merge extra items into ITEMS if available
  if (api.ITEMS) Object.assign(api.ITEMS, EXTRA_ITEMS);

  game.hotbar = game.hotbar || [null, null, null, null];
  game.hotbarSel = game.hotbarSel || 0;
  game.durability = game.durability || {};
  game.keyring = game.keyring || [];
  game.skin = game.skin || null;
  game.invFilter = game.invFilter || 'all';
  game.invSort = game.invSort || 'got';
  game.recipesKnown = game.recipesKnown || { heiltrank: true, saat: true };

  mark(61, 'crafting bank'); mark(62, 'brew at mira'); mark(63, 'equip slots');
  mark(64, 'inv sort/filter'); mark(65, 'hotbar'); mark(66, 'rare glow');
  mark(67, 'tool durability'); mark(68, 'recipe book'); mark(69, 'keyring'); mark(70, 'skins');

  api.knowRecipe = (id) => { game.recipesKnown[id] = true; ui.toast(`Rezept: ${id}`); };
  api.listRecipes = (station) => Object.entries(RECIPES).filter(([id, r]) => r.station === station && game.recipesKnown[id]);

  api.craft = (recipeId) => {
    const r = RECIPES[recipeId];
    if (!r) return false;
    for (const [id, n] of Object.entries(r.need)) {
      if (id === 'taler') { if (game.coins < n) { ui.toast('Nicht genug Taler'); return false; } }
      else if ((game.inv[id] || 0) < n) { ui.toast(`Braucht ${n}× ${id}`); return false; }
    }
    for (const [id, n] of Object.entries(r.need)) {
      if (id === 'taler') game.coins -= n;
      else G.take?.(id, n);
    }
    const [out, n] = r.out;
    G.give?.(out, n);
    if (out === 'schild') { game.shield = 3; game.shieldMax = 3; }
    audio.sfx('buy');
    ui.toast(`Hergestellt: ${out}`);
    G.markDirty();
    return true;
  };

  api.addToKeyring = (keyId) => {
    if (!game.keyring.includes(keyId)) game.keyring.push(keyId);
    // keys stay usable but listed separately
    G.markDirty();
  };

  api.wearSkin = (id) => {
    game.skin = id;
    ui.toast(id ? `Skin: ${EXTRA_ITEMS[id]?.name || id}` : 'Skin aus');
    G.markDirty();
  };

  api.setHotbar = (slot, itemId) => {
    game.hotbar[slot] = itemId;
    G.markDirty();
  };

  api.useHotbar = (slot = game.hotbarSel) => {
    const id = game.hotbar[slot];
    if (!id) { ui.toast('Leerer Hotbar-Platz'); return; }
    G.useItem?.(id);
  };

  api.wearOnDurability = (toolId, amount = 1) => {
    game.durability[toolId] = (game.durability[toolId] ?? 100) - amount;
    if (game.durability[toolId] <= 0) {
      ui.toast(`${toolId} ist kaputt!`);
      delete game.durability[toolId];
      if (toolId === 'sandlaeufer') game.boots = false;
      if (toolId === 'enterhaken') game.hook = false;
      if (toolId === 'steigeisen') game.grip = false;
    }
  };

  api.repairTool = (toolId) => {
    if (game.coins < 15) { ui.toast('Reparatur kostet 15 Taler'); return; }
    game.coins -= 15;
    game.durability[toolId] = 100;
    ui.toast(`Repariert: ${toolId}`);
    audio.sfx('buy');
  };

  api.filteredInv = () => {
    let ids = Object.keys(game.inv || {}).filter((k) => game.inv[k] > 0);
    const f = game.invFilter;
    if (f !== 'all') ids = ids.filter((id) => {
      const t = api.ITEMS?.[id]?.type;
      if (f === 'use') return t === 'use';
      if (f === 'quest') return t === 'quest' || t === 'key';
      if (f === 'mat') return t === 'material';
      if (f === 'equip') return t === 'equip' || t === 'cosmetic';
      return true;
    });
    if (game.invSort === 'name') ids.sort((a, b) => (api.ITEMS?.[a]?.name || a).localeCompare(api.ITEMS?.[b]?.name || b));
    else if (game.invSort === 'type') ids.sort((a, b) => (api.ITEMS?.[a]?.type || '').localeCompare(api.ITEMS?.[b]?.type || ''));
    return ids;
  };

  api.equipGear = (slot, itemId) => {
    game.equipSlots = game.equipSlots || {};
    game.equipSlots[slot] = itemId;
    if (slot === 'weapon') game.weapon = itemId;
    if (slot === 'helm' && itemId) { game.maxHp = Math.min(20, game.maxHp + 2); }
    if (slot === 'shield' || itemId === 'schild') { game.shield = 3; }
    ui.toast(`Angelegt: ${itemId}`);
    G.markDirty();
  };

  return api;
}
