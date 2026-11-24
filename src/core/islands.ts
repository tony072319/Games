import { BUILDING_MAX, MATERIALS, SEA_DEF, type BuildingId, type DestId, type MaterialId, type Materials } from './data';
import { seaBoost } from './economy';
import { islandMult, islandTier } from './milestones';
import { has } from './talents';
import { emptyMaterials, type GameState } from './state';

export interface Building {
  island: DestId;
  /** What it makes, and how many per hour at level 1. */
  makes?: MaterialId;
  perHour?: number;
  /** Permanent bonus instead of production. */
  perk?: 'speed' | 'net' | 'light' | 'chest';
  /** Cost to build (level 0 → 1); doubles every level. */
  cost: Partial<Materials>;
}

export const BUILDINGS: Record<BuildingId, Building> = {
  dismantler: { island: 'wreck', makes: 'metal', perHour: 40, cost: { wood: 300, rope: 80 } },
  rack: { island: 'wreck', makes: 'rope', perHour: 30, cost: { wood: 250, plastic: 100 } },
  boatshed: { island: 'wreck', perk: 'speed', cost: { wood: 400, metal: 120 } },
  nest: { island: 'gullrock', makes: 'plastic', perHour: 40, cost: { wood: 300, rope: 120 } },
  kelp: { island: 'gullrock', makes: 'rope', perHour: 35, cost: { wood: 350, plastic: 150 } },
  lookout: { island: 'gullrock', perk: 'net', cost: { wood: 500, metal: 150, rope: 100 } },
  depot: { island: 'oldlight', makes: 'wood', perHour: 120, cost: { plastic: 400, metal: 150 } },
  workshop: { island: 'oldlight', makes: 'metal', perHour: 50, cost: { wood: 800, rope: 200 } },
  desk: { island: 'oldlight', perk: 'light', cost: { wood: 900, plastic: 300, metal: 200 } },
  jars: { island: 'firefly', makes: 'glow', perHour: 0.5, cost: { wood: 1500, metal: 400, plastic: 400 } },
  orchard: { island: 'firefly', makes: 'wood', perHour: 150, cost: { plastic: 600, rope: 300 } },
  path: { island: 'firefly', perk: 'chest', cost: { wood: 1200, glow: 10 } },
};

export const ISLAND_BUILDINGS: Record<DestId, BuildingId[]> = {
  wreck: ['dismantler', 'rack', 'boatshed'],
  gullrock: ['nest', 'kelp', 'lookout'],
  oldlight: ['depot', 'workshop', 'desk'],
  firefly: ['jars', 'orchard', 'path'],
};

/** Hours of production an island can hold before the boat must fetch it. */
export const ISLAND_STORE_HOURS = 12;

export const buildingLevel = (s: GameState, b: BuildingId) => s.buildings[b] ?? 0;

/** Cost to go from `level` to `level + 1` (farther seas cost more). */
export function buildCost(b: BuildingId, level: number, s?: GameState): Materials {
  const c = emptyMaterials();
  const k = s ? SEA_DEF[s.sea].cost : 1;
  for (const m of MATERIALS) c[m] = Math.ceil((BUILDINGS[b].cost[m] ?? 0) * Math.pow(2, level) * k);
  return c;
}

/** Items per hour a producer makes at a level. */
export function productionPerHour(b: BuildingId, level: number): number {
  const def = BUILDINGS[b];
  if (!def.perHour || level <= 0) return 0;
  return def.perHour * level * Math.pow(1.25, level - 1);
}

export function islandRates(s: GameState, d: DestId): Materials {
  const r = emptyMaterials();
  for (const b of ISLAND_BUILDINGS[d]) {
    const def = BUILDINGS[b];
    if (def.makes) r[def.makes] += productionPerHour(b, buildingLevel(s, b));
  }
  const boost = seaBoost(s) * islandMult(islandTier(s, d)) * (has(s, 'isl3') ? 1.3 : 1);
  for (const m of MATERIALS) r[m] *= boost;
  return r;
}

export function islandStoreCap(s: GameState, d: DestId): Materials {
  const r = islandRates(s, d);
  for (const m of MATERIALS) r[m] *= ISLAND_STORE_HOURS;
  return r;
}

/** Credit island production up to now (capped per island). */
export function accrueIslands(s: GameState, nowMs: number): void {
  const hours = (nowMs - s.islandAt) / 3_600_000;
  s.islandAt = nowMs;
  if (!(hours > 0)) return;
  for (const d of Object.keys(ISLAND_BUILDINGS) as DestId[]) {
    const rate = islandRates(s, d);
    if (MATERIALS.every((m) => rate[m] === 0)) continue;
    const store = (s.islandStore[d] ??= emptyMaterials());
    for (const m of MATERIALS) store[m] = Math.min(rate[m] * ISLAND_STORE_HOURS, store[m] + rate[m] * hours);
  }
}

export function canBuild(s: GameState, b: BuildingId): boolean {
  const lvl = buildingLevel(s, b);
  if (lvl >= BUILDING_MAX || !s.discovered.includes(BUILDINGS[b].island)) return false;
  const cost = buildCost(b, lvl, s);
  return MATERIALS.every((m) => s.materials[m] >= cost[m]);
}

/** Build or upgrade. Production up to now is credited first, so new levels only count from now. */
export function construct(s: GameState, b: BuildingId, nowMs: number): boolean {
  if (!canBuild(s, b)) return false;
  accrueIslands(s, nowMs);
  const lvl = buildingLevel(s, b);
  const cost = buildCost(b, lvl, s);
  for (const m of MATERIALS) s.materials[m] -= cost[m];
  s.buildings[b] = lvl + 1;
  return true;
}

/** Take everything an island has made (the boat does this when it arrives). */
export function takeIslandStore(s: GameState, d: DestId): Materials {
  const store = s.islandStore[d] ?? emptyMaterials();
  s.islandStore[d] = emptyMaterials();
  return { ...store };
}
