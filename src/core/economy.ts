import { MATERIALS, MAX_LEVEL, type Materials, type UpgradeId } from './data';
import { emptyMaterials, type GameState } from './state';

/** Items per second the net collects automatically. */
export function autoRate(netLevel: number): number {
  return 0.1 * netLevel * Math.pow(1.1, netLevel - 1);
}

/** Longest stretch of offline time that still pays out. Level 1 = 2h, +1h per level. */
export function offlineCapSeconds(storageLevel: number): number {
  return (1 + storageLevel) * 3600;
}

/** Amount gained from tapping one drifting item: worth about 10 seconds of the net. */
export function tapYield(netLevel: number): number {
  return Math.max(1, Math.round(autoRate(netLevel) * 10));
}

/** Cost to go from currentLevel to currentLevel + 1. */
export function upgradeCost(id: UpgradeId, currentLevel: number): Materials {
  const L = currentLevel;
  const c = emptyMaterials();
  if (id === 'net') {
    c.wood = Math.ceil(15 * Math.pow(1.6, L - 1));
    if (L >= 3) c.rope = Math.ceil(5 * Math.pow(1.6, L - 3));
    if (L >= 6) c.metal = Math.ceil(2 * Math.pow(1.6, L - 6));
  } else {
    c.wood = Math.ceil(30 * Math.pow(1.8, L - 1));
    c.plastic = Math.ceil(10 * Math.pow(1.8, L - 1));
  }
  return c;
}

export function isMaxLevel(state: GameState, id: UpgradeId): boolean {
  return state.levels[id] >= MAX_LEVEL[id];
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  if (isMaxLevel(state, id)) return false;
  const cost = upgradeCost(id, state.levels[id]);
  return MATERIALS.every((m) => state.materials[m] >= cost[m]);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!canBuy(state, id)) return false;
  const cost = upgradeCost(id, state.levels[id]);
  for (const m of MATERIALS) state.materials[m] -= cost[m];
  state.levels[id] += 1;
  return true;
}

export function addMaterials(state: GameState, gained: Materials, factor = 1): void {
  for (const m of MATERIALS) state.materials[m] += gained[m] * factor;
}
