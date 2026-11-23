import { MATERIALS, type DestId, type Materials } from './data';
import { addMaterials, netRate } from './economy';
import { emptyMaterials, type Cargo, type GameState } from './state';

/** Lighthouse light level that repairs the dock so a boat can be built. */
export const DOCK_LIGHT = 3;
export const BOAT_COST: Materials = { wood: 500, plastic: 0, rope: 150, metal: 60, glow: 0 };

export interface Destination {
  minutes: number;
  /** Lighthouse light needed before the boat can find its way there. */
  needLight: number;
  /** What a haul from here is made of (shares sum to 1). */
  mix: Partial<Materials>;
}

export const DESTS: Record<DestId, Destination> = {
  wreck: { minutes: 15, needLight: 3, mix: { metal: 0.5, wood: 0.3, rope: 0.2 } },
  gullrock: { minutes: 60, needLight: 4, mix: { rope: 0.4, plastic: 0.4, wood: 0.2 } },
  oldlight: { minutes: 240, needLight: 5, mix: { wood: 0.4, metal: 0.3, plastic: 0.3 } },
  firefly: { minutes: 480, needLight: 6, mix: { wood: 0.5, plastic: 0.5 } },
};

/** One-time finds the first time the boat reaches an island (perks are applied elsewhere). */
const DISCOVERY_FIND: Partial<Record<DestId, Partial<Materials>>> = {
  wreck: { metal: 200 },
  firefly: { glow: 5 },
};

export function canBuildBoat(s: GameState): boolean {
  return !s.boat.built && s.levels.light >= DOCK_LIGHT && MATERIALS.every((m) => s.materials[m] >= BOAT_COST[m]);
}

export function buildBoat(s: GameState): boolean {
  if (!canBuildBoat(s)) return false;
  for (const m of MATERIALS) s.materials[m] -= BOAT_COST[m];
  s.boat.built = true;
  return true;
}

export function reachable(s: GameState, d: DestId): boolean {
  return s.boat.built && s.levels.light >= DESTS[d].needLight;
}

export function voyageMs(s: GameState, d: DestId): number {
  return DESTS[d].minutes * 60_000 * Math.pow(0.92, s.levels.speed - 1);
}

export function cargoMultiplier(s: GameState): number {
  return 1 + 0.25 * (s.levels.cargo - 1);
}

/** What one trip to d brings back right now (scales with the net, so trips stay worthwhile). */
export function voyageHaul(s: GameState, d: DestId): Materials {
  const dest = DESTS[d];
  const total = netRate(s) * dest.minutes * 60 * 0.8 * cargoMultiplier(s);
  const h = emptyMaterials();
  for (const m of MATERIALS) h[m] = total * (dest.mix[m] ?? 0);
  if (d === 'firefly') h.glow = 2 + s.levels.cargo;
  return h;
}

export function canSail(s: GameState, d: DestId): boolean {
  return reachable(s, d) && !s.boat.voyage && !s.boat.cargo;
}

export function startVoyage(s: GameState, d: DestId, nowMs: number): boolean {
  if (!canSail(s, d)) return false;
  s.boat.voyage = { dest: d, departAt: nowMs, returnAt: nowMs + voyageMs(s, d) };
  return true;
}

/** If the boat is due back, put its haul on the dock. Returns the new cargo, if any. */
export function settleVoyage(s: GameState, nowMs: number): Cargo | null {
  const v = s.boat.voyage;
  if (!v || nowMs < v.returnAt) return null;
  const discovery = !s.discovered.includes(v.dest);
  const haul = voyageHaul(s, v.dest);
  if (discovery) for (const [m, n] of Object.entries(DISCOVERY_FIND[v.dest] ?? {})) haul[m as keyof Materials] += n ?? 0;
  s.boat.voyage = null;
  s.boat.cargo = { dest: v.dest, haul, discovery };
  return s.boat.cargo;
}

/** Take the boat's cargo into the inventory (and record the island as found). */
export function unloadBoat(s: GameState): Cargo | null {
  const c = s.boat.cargo;
  if (!c) return null;
  addMaterials(s, c.haul);
  if (!s.discovered.includes(c.dest)) s.discovered.push(c.dest);
  s.boat.cargo = null;
  return c;
}
