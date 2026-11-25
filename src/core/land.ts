/**
 * Expanding the island: new ground tiles bought with wood and plastic, one ring after another.
 * Like decorations it only changes the picture; each sea keeps its own island.
 */
import { MATERIALS, SEA_DEF, type Materials } from './data';
import { emptyMaterials, type GameState } from './state';
import { T } from './tuning';

/** How many tiles the island can grow by (the world's LAND_TILES; a test keeps them equal). */
export const LAND_MAX = 28;

/** The next tile's price, or null when the island is full. */
export function landCost(s: GameState): Materials | null {
  if (s.land >= LAND_MAX) return null;
  const total = T.LAND_BASE * Math.pow(T.LAND_GROWTH, s.land) * SEA_DEF[s.sea].cost;
  const c = emptyMaterials();
  c.wood = Math.ceil(total / 2);
  c.plastic = Math.ceil(total / 2);
  return c;
}

export function canExpand(s: GameState): boolean {
  if (s.levels.light < T.DECOR_FROM_LIGHT) return false;
  const c = landCost(s);
  return !!c && MATERIALS.every((m) => s.materials[m] >= c[m]);
}

export function expand(s: GameState): boolean {
  if (!canExpand(s)) return false;
  const c = landCost(s)!;
  for (const m of MATERIALS) s.materials[m] -= c[m];
  s.land += 1;
  return true;
}

/** Tiles from a save: a whole number, at most LAND_MAX; anything else starts small. */
export function readLand(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) return 0;
  return Math.min(v, LAND_MAX);
}
