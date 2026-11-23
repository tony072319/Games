import { MATERIALS, MAX_LEVEL, type Materials, type UpgradeId } from './data';
import { emptyMaterials, type GameState } from './state';

/** Items per second the net collects automatically. */
export function autoRate(netLevel: number): number {
  return 0.1 * netLevel * Math.pow(1.1, netLevel - 1);
}

/** How many hours of netting the chest holds. Level 1 = 2h, +1h per level. */
export function offlineCapSeconds(storageLevel: number): number {
  return (1 + storageLevel) * 3600;
}

/** Amount gained from tapping one drifting item: worth about 10 seconds of the net. */
export function tapYield(netLevel: number): number {
  return Math.max(1, Math.round(autoRate(netLevel) * 10));
}

/** Items per second the net actually brings in, including perks from islands. */
export function netRate(state: GameState): number {
  return (
    autoRate(state.levels.net) *
    (state.discovered.includes('gullrock') ? 1.25 : 1) *
    (1 + 0.05 * (state.buildings.lookout ?? 0))
  );
}

/**
 * Cost to go from currentLevel to currentLevel + 1.
 * Pass the state to apply perks (the old lighthouse's blueprint makes light cheaper).
 */
export function upgradeCost(id: UpgradeId, currentLevel: number, state?: GameState): Materials {
  const L = currentLevel;
  const c = emptyMaterials();
  const g = (base: number, r: number, from = 1) => Math.ceil(base * Math.pow(r, L - from));
  if (id === 'net') {
    c.wood = g(15, 1.6);
    if (L >= 3) c.rope = g(5, 1.6, 3);
    if (L >= 6) c.metal = g(2, 1.6, 6);
  } else if (id === 'storage') {
    c.wood = g(30, 1.8);
    c.plastic = g(10, 1.8);
  } else if (id === 'light') {
    c.wood = g(200, 2.2);
    c.plastic = g(80, 2.2);
    if (L >= 2) c.rope = g(40, 2.2);
    if (L >= 2) c.metal = g(20, 2.2, 2);
    if (L >= 7) c.glow = g(5, 2, 7);
    if (state?.discovered.includes('oldlight')) for (const m of MATERIALS) c[m] = Math.ceil(c[m] * 0.8);
    const desk = state?.buildings.desk ?? 0;
    if (desk) for (const m of MATERIALS) c[m] = Math.ceil(c[m] * (1 - 0.03 * desk));
  } else if (id === 'speed') {
    c.wood = g(150, 1.9);
    c.metal = g(30, 1.9);
  } else {
    c.wood = g(120, 1.9);
    c.rope = g(40, 1.9);
  }
  return c;
}

export function isMaxLevel(state: GameState, id: UpgradeId): boolean {
  return state.levels[id] >= MAX_LEVEL[id];
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  if (isMaxLevel(state, id)) return false;
  const cost = upgradeCost(id, state.levels[id], state);
  return MATERIALS.every((m) => state.materials[m] >= cost[m]);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!canBuy(state, id)) return false;
  const cost = upgradeCost(id, state.levels[id], state);
  for (const m of MATERIALS) state.materials[m] -= cost[m];
  state.levels[id] += 1;
  return true;
}

export function addMaterials(state: GameState, gained: Materials, factor = 1): void {
  for (const m of MATERIALS) state.materials[m] += gained[m] * factor;
}

/** Items the chest can hold: enough for offlineCapSeconds of the current net. */
export function chestCapacity(state: GameState): number {
  return netRate(state) * offlineCapSeconds(state.levels.storage) * (1 + 0.1 * (state.buildings.path ?? 0));
}

export function chestTotal(chest: Materials): number {
  return MATERIALS.reduce((a, m) => a + chest[m], 0);
}
