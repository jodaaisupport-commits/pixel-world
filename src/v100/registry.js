/** Checkliste aller 100 Verbesserungen – Status wird zur Laufzeit gesetzt. */
export const FEATURES = {};
for (let i = 1; i <= 100; i++) FEATURES[i] = { id: i, done: false, note: '' };

export function mark(id, note = '') {
  if (FEATURES[id]) { FEATURES[id].done = true; FEATURES[id].note = note; }
}

export function statusReport() {
  const done = Object.values(FEATURES).filter((f) => f.done).length;
  return { done, total: 100, features: FEATURES };
}
