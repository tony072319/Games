import { MATERIALS, MATERIAL_WEIGHTS, MAX_LEVEL, SEA_DEF, type Materials, type UpgradeId } from './data';
import { emptyMaterials, type GameState } from './state';
import { netMilestoneMult } from './milestones';
import { curioBonus } from './curios';
import { has } from './talents';

/** Items per second the net collects automatically. */
import { T } from './tuning';
import { nightness } from './daycycle';
import { focusOn } from './focus';

export function autoRate(netLevel: number): number {
  return 0.1 * netLevel * Math.pow(1.1, netLevel - 1);
}

/** How many hours of netting the chest holds. Level 1 = 2h, +1h per level. */
export function offlineCapSeconds(storageLevel: number): number {
  return (1 + storageLevel) * 3600;
}

/** Amount gained from tapping one drifting item: worth about 10 seconds of the net (twice that with the drift talent). */
/** What one tap on a drifting find pays: seconds of what you really earn now, more at night. */
export function tapYield(state: GameState, nowMs: number): number {
  const base = catchRate(state) * T.TAP_SECONDS * (1 + T.NIGHT_TAP_BONUS * nightness(nowMs));
  return Math.max(1, Math.round(base)) * (has(state, 'drift3') ? 2 : 1);
}

/** Hours of netting the chest holds, with the talent's extra two hours. */
export function chestSeconds(state: GameState): number {
  return offlineCapSeconds(state.levels.storage) + (has(state, 'chest2') ? 7200 : 0);
}

/** Items per second the net actually brings in, including perks from islands. */
export function netRate(state: GameState): number {
  return (
    autoRate(state.levels.net) *
    netMilestoneMult(state.levels.net) *
    (state.discovered.includes('gullrock') ? 1.25 : 1) *
    (1 + 0.05 * (state.buildings.lookout ?? 0)) *
    (has(state, 'net1') ? 1.15 : 1) *
    seaBoost(state)
  );
}

/** The current sea's richness times the starlight bonus. */
export function seaBoost(state: GameState): number {
  return SEA_DEF[state.sea].rate * (1 + T.STAR_BONUS * state.starlight) * curioBonus(state) * (has(state, 'prod3') ? 1.2 : 1) * (1 + T.HALO_BONUS * (state.halo ?? 0));
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
    // From level 2 part of the price is plastic (same total): the net alone would drain wood while plastic piles up.
    const w = 15 * Math.pow(T.NET_COST_GROWTH, L - 1);
    const p = L >= 2 ? T.NET_PLASTIC : 0;
    c.wood = Math.ceil(w * (1 - p));
    if (p) c.plastic = Math.ceil(w * p);
    if (L >= 3) c.rope = g(5, T.NET_COST_GROWTH, 3);
    if (L >= 6) c.metal = g(2, T.NET_COST_GROWTH, 6);
  } else if (id === 'storage') {
    c.wood = g(30, 1.8);
    c.plastic = g(10, 1.8);
  } else if (id === 'light') {
    // The first two steps (to the dock) are cheaper, so a new player gets the boat in the first session.
    const k = T.LIGHT_COST_MULT * (L <= 2 ? T.EARLY_LIGHT_MULT : 1);
    c.wood = g(200 * k, T.LIGHT_GROWTH);
    c.plastic = g(80 * k, T.LIGHT_GROWTH);
    if (L >= 2) c.rope = g(40 * k, T.LIGHT_GROWTH);
    if (L >= 2) c.metal = g(20 * k, T.LIGHT_GROWTH, 2);
    if (L >= 7) c.glow = g(5, 2, 7);
    // The last stretch of the lighthouse is the long climb.
    if (L >= 6) for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) c[m] = Math.ceil(c[m] * Math.pow(T.LATE_LIGHT_MULT, L - 5));
    if (state?.discovered.includes('oldlight')) for (const m of MATERIALS) c[m] = Math.ceil(c[m] * 0.8);
    const desk = state?.buildings.desk ?? 0;
    if (desk) for (const m of MATERIALS) c[m] = Math.ceil(c[m] * (1 - 0.03 * desk));
  }
  if (state && (id === 'net' || id === 'storage' || id === 'light')) {
    const k = SEA_DEF[state.sea].cost;
    if (k !== 1) for (const m of MATERIALS) c[m] = Math.ceil(c[m] * k);
    // A fresh start after passing the light: a new sea's first net and lighthouse levels come back quickly.
    if (state.sea !== 'dusk' && ((id === 'net' && L < T.NEW_SEA_NET) || (id === 'light' && L < T.NEW_SEA_LIGHT)))
      for (const m of MATERIALS) c[m] = Math.ceil(c[m] * T.NEW_SEA_EARLY);
  }
  if (id === 'speed') {
    c.wood = g(150, 1.9);
    c.metal = g(30, 1.9);
  } else if (id === 'recycle') {
    c.wood = g(400, 1.8, 0);
    c.metal = g(60, 1.8, 0);
    if (L >= 5) c.glow = 2 * (L - 4);
  } else if (id === 'cargo') {
    c.wood = g(120, 1.9);
    c.rope = g(40, 1.9);
  }
  return c;
}

export function isMaxLevel(state: GameState, id: UpgradeId): boolean {
  return state.levels[id] >= MAX_LEVEL[id];
}

/** Upgrades that are not offered yet (the recycler waits for lighthouse 4). */
export function upgradeLocked(state: GameState, id: UpgradeId): boolean {
  return id === 'recycle' && state.levels.light < T.RECYCLE_LIGHT;
}

/** The lighthouse is mended in parts from LIGHT_PARTS_FROM on. */
export function inParts(state: GameState, id: UpgradeId): boolean {
  return id === 'light' && state.levels.light >= T.LIGHT_PARTS_FROM;
}

/**
 * What the button buys now: one lighthouse part or one level. Parts are a share of the level rounded
 * up in steps, so the four together cost exactly the level.
 */
export function priceOf(state: GameState, id: UpgradeId): Materials {
  const level = upgradeCost(id, state.levels[id], state);
  if (!inParts(state, id)) return level;
  // Part i pays the step from i/n to (i+1)/n of the level, rounded up: the parts add up exactly.
  const i = Math.min(state.lightParts, T.LIGHT_PARTS - 1);
  const n = T.LIGHT_PARTS;
  const c = emptyMaterials();
  for (const m of MATERIALS) c[m] = Math.ceil(((i + 1) * level[m]) / n) - Math.ceil((i * level[m]) / n);
  return c;
}

export function canBuy(state: GameState, id: UpgradeId): boolean {
  if (isMaxLevel(state, id) || upgradeLocked(state, id)) return false;
  const cost = priceOf(state, id);
  return MATERIALS.every((m) => state.materials[m] >= cost[m]);
}

export function buyUpgrade(state: GameState, id: UpgradeId): boolean {
  if (!canBuy(state, id)) return false;
  const cost = priceOf(state, id);
  for (const m of MATERIALS) state.materials[m] -= cost[m];
  if (inParts(state, id) && ++state.lightParts < T.LIGHT_PARTS) return true;
  if (id === 'light') state.lightParts = 0;
  state.levels[id] += 1;
  return true;
}

export function addMaterials(state: GameState, gained: Materials, factor = 1): void {
  for (const m of MATERIALS) state.materials[m] += gained[m] * factor;
}

/** Items the chest can hold: enough for offlineCapSeconds of the current net. */
/** What the net brings into the chest: its rate, more with the light on the fishing grounds. */
export function catchRate(state: GameState): number {
  return netRate(state) * (focusOn(state) === 'net' ? 1 + T.FOCUS_NET : 1);
}

export function chestCapacity(state: GameState): number {
  return catchRate(state) * chestSeconds(state) * (1 + 0.1 * (state.buildings.path ?? 0));
}

export function chestTotal(chest: Materials): number {
  return MATERIALS.reduce((a, m) => a + chest[m], 0);
}

/** Fractional amounts the net collects in the given time at a given rate (items/second). */
export function expectedGain(rate: number, seconds: number): Materials {
  const total = rate * seconds;
  const g = emptyMaterials();
  for (const m of MATERIALS) g[m] = total * MATERIAL_WEIGHTS[m];
  return g;
}

/**
 * Let the net work for `seconds`, putting its catch into the chest until it is full.
 * `factor` slows it down (a sea you're not at works at half speed).
 */
export function fillChest(state: GameState, seconds: number, factor = 1): { creditedSeconds: number; gained: Materials } {
  const room = Math.max(0, chestCapacity(state) - chestTotal(state.chest));
  const rate = catchRate(state) * factor;
  const creditedSeconds = Math.max(0, Math.min(seconds, room / rate));
  const gained = expectedGain(rate, creditedSeconds);
  for (const m of MATERIALS) state.chest[m] += gained[m];
  return { creditedSeconds, gained };
}
