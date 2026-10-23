// Kleine Mod-API: lädt JSON-Quests/Dialoge aus /mods/*.json (Item 100).
import { mark } from './v100/registry.js';

export async function loadMods(api) {
  mark(100, 'mod JSON loader');
  const loaded = [];
  try {
    const res = await fetch('mods/index.json', { cache: 'no-store' });
    if (!res.ok) return loaded;
    const index = await res.json();
    for (const file of index.files || []) {
      try {
        const r = await fetch('mods/' + file);
        if (!r.ok) continue;
        const mod = await r.json();
        applyMod(api, mod);
        loaded.push(mod.id || file);
      } catch (e) { console.warn('Mod fehlgeschlagen', file, e); }
    }
  } catch (e) { /* kein Mods-Index – OK */ }
  return loaded;
}

function applyMod(api, mod) {
  if (mod.quests && api.QUESTS) {
    for (const [id, q] of Object.entries(mod.quests)) {
      api.QUESTS[id] = {
        title: q.title, giver: q.giver || 'Mod',
        desc: q.desc || '',
        steps: () => (q.steps || []).map((t) => ({ text: t, done: false })),
        reward: q.reward || '',
      };
      if (api.QUEST_ORDER && !api.QUEST_ORDER.includes(id)) api.QUEST_ORDER.push(id);
    }
  }
  if (mod.dialogs && api.NPC_DEFS) {
    for (const [id, pages] of Object.entries(mod.dialogs)) {
      if (api.NPC_DEFS[id]) api.NPC_DEFS[id].pages = pages;
    }
  }
  if (mod.items && api.ITEMS) Object.assign(api.ITEMS, mod.items);
  console.log('[pixel-world] Mod geladen:', mod.id || mod.name);
}
