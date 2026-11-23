import { SEA_IDS, type SeaId } from './data';
import { fillChest } from './economy';
import { accrueIslands } from './islands';
import { emptyMaterials, type GameState, type SeaState } from './state';

export { SEA_DEF } from './data';

export function nextSea(s: GameState): SeaId | null {
  return SEA_IDS[SEA_IDS.indexOf(s.sea) + 1] ?? null;
}

/** Lighthouse fully mended, and the next sea not reached yet. */
export function canPassLight(s: GameState): boolean {
  const next = nextSea(s);
  return s.levels.light >= 10 && next !== null && !s.reached.includes(next);
}

/** Starlight earned for leaving this sea lit: 10, +2 per island found, + every island building level. */
export function starlightFor(s: GameState): number {
  const blds = Object.values(s.buildings).reduce((a: number, n) => a + (n ?? 0), 0);
  return 10 + 2 * s.discovered.length + blds;
}

/** Take the current sea's fields out of the top level. */
function snapshot(s: GameState, nowMs: number): SeaState {
  return {
    levels: { net: s.levels.net, storage: s.levels.storage, light: s.levels.light },
    chest: s.chest,
    discovered: s.discovered,
    buildings: s.buildings,
    islandStore: s.islandStore,
    islandAt: s.islandAt,
    chestAt: nowMs,
  };
}

function restore(s: GameState, id: SeaId, st: SeaState): void {
  s.levels.net = st.levels.net;
  s.levels.storage = st.levels.storage;
  s.levels.light = st.levels.light;
  s.chest = st.chest;
  s.discovered = st.discovered;
  s.buildings = st.buildings;
  s.islandStore = st.islandStore;
  s.islandAt = st.islandAt;
  s.sea = id;
}

function freshSea(nowMs: number): SeaState {
  return {
    levels: { net: 1, storage: 1, light: 1 },
    chest: emptyMaterials(),
    discovered: [],
    buildings: {},
    islandStore: {},
    islandAt: nowMs,
    chestAt: nowMs,
  };
}

/**
 * A GameState-shaped view of a sea you're not at, so the usual rules
 * (rates, capacities, island production) can run on it. Its objects are shared
 * with the stored sea, so changes to chest and island stores land there.
 */
export function seaView(s: GameState, id: SeaId): GameState | null {
  if (id === s.sea) return s;
  const st = s.seas[id];
  if (!st) return null;
  return {
    ...s,
    sea: id,
    levels: { ...s.levels, ...st.levels },
    chest: st.chest,
    discovered: st.discovered,
    buildings: st.buildings,
    islandStore: st.islandStore,
    islandAt: st.islandAt,
  };
}

/** The seas you're not at keep working: their nets fill their chests at half speed, their islands produce. */
export function accrueOtherSeas(s: GameState, nowMs: number, only?: SeaId): void {
  for (const id of SEA_IDS) {
    if (id === s.sea || (only && id !== only)) continue;
    const st = s.seas[id];
    const view = seaView(s, id);
    if (!st || !view) continue;
    accrueIslands(view, nowMs);
    st.islandAt = view.islandAt;
    const seconds = (nowMs - st.chestAt) / 1000;
    if (seconds > 0) fillChest(view, seconds, 0.5);
    st.chestAt = nowMs;
  }
}

/** Leave this sea lit and sail on to the next one. */
export function passLight(s: GameState, nowMs: number): boolean {
  if (!canPassLight(s)) return false;
  const next = nextSea(s)!;
  accrueIslands(s, nowMs);
  s.starlight += starlightFor(s);
  s.seas[s.sea] = snapshot(s, nowMs);
  restore(s, next, freshSea(nowMs));
  s.reached.push(next);
  return true;
}

/** Go and look after another sea you've already reached. */
export function switchSea(s: GameState, id: SeaId, nowMs: number): boolean {
  const target = s.seas[id];
  if (id === s.sea || !target) return false;
  accrueIslands(s, nowMs);
  accrueOtherSeas(s, nowMs, id);
  s.seas[s.sea] = snapshot(s, nowMs);
  delete s.seas[id];
  restore(s, id, target);
  return true;
}
