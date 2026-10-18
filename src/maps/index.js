// Karten-Registry: id -> Generator. Neue Karten einfach hier eintragen
// (und per exit(...) von einer bestehenden Karte aus verlinken).
import { generateWorld } from '../world.js';
import { INTERIORS } from './interiors.js';
import { dunkelwald, berge, kueste, hoehle } from './areas.js';
import { tiefe } from './tiefe.js';

export const MAPS = {
  village: () => generateWorld(),
  dunkelwald, berge, kueste, hoehle, tiefe,
  ...INTERIORS,
};
