/**
 * Island decorations: things to buy in every sea that only change the picture. Each sea has its
 * own set (stored with the sea, like buildings); every purchase makes the next one a bit dearer.
 */
import { MATERIALS, SEA_DEF, type Materials } from './data';
import { emptyMaterials, type GameState } from './state';
import { T } from './tuning';

export type DecorId = 'lantern' | 'flowers' | 'bench' | 'flags' | 'well' | 'garden' | 'hut' | 'torches' | 'lights' | 'tower';
export const DECOR_IDS: readonly DecorId[] = ['lantern', 'flowers', 'bench', 'flags', 'well', 'garden', 'hut', 'torches', 'lights', 'tower'];
export const DECOR_TIERS = 3;

/** How the price of each tier is made up (shares of the total, before rounding up). */
// Mostly wood and plastic, the materials that pile up while the lighthouse waits on rope and metal.
const MIX: Partial<Materials>[] = [
  { wood: 0.6, plastic: 0.4 },
  { wood: 0.5, plastic: 0.5 },
  { wood: 0.45, plastic: 0.45, metal: 0.1 },
];

/** Decorations bought in this sea so far (every tier counts). */
export function decorBought(s: GameState): number {
  return DECOR_IDS.reduce((a, id) => a + (s.decor[id] ?? 0), 0);
}

/** The next tier's price, or null when it is already at the top tier. */
export function decorCost(s: GameState, id: DecorId): Materials | null {
  const tier = s.decor[id] ?? 0;
  if (tier >= DECOR_TIERS) return null;
  const n = decorBought(s);
  const total = T.DECOR_BASE * Math.pow(T.DECOR_GROWTH, n) * SEA_DEF[s.sea].cost;
  const c = emptyMaterials();
  for (const m of MATERIALS) c[m] = Math.ceil(total * (MIX[tier][m] ?? 0));
  // The top tier glows: a few glowshards too.
  if (tier === DECOR_TIERS - 1) c.glow = Math.ceil((n + 1) / 6);
  return c;
}

export function canDecorate(s: GameState, id: DecorId): boolean {
  const c = decorCost(s, id);
  return !!c && MATERIALS.every((m) => s.materials[m] >= c[m]);
}

export function decorate(s: GameState, id: DecorId): boolean {
  if (!canDecorate(s, id)) return false;
  const c = decorCost(s, id)!;
  for (const m of MATERIALS) s.materials[m] -= c[m];
  s.decor[id] = (s.decor[id] ?? 0) + 1;
  return true;
}

/** Decorations from a save: known ids with a whole tier 1..3; anything else is left out. */
export function readDecor(v: unknown): Partial<Record<DecorId, number>> {
  const out: Partial<Record<DecorId, number>> = {};
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return out;
  for (const [id, n] of Object.entries(v)) {
    if (DECOR_IDS.includes(id as DecorId) && typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= DECOR_TIERS) out[id as DecorId] = n;
  }
  return out;
}
