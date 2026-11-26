import { MATERIALS, type DestId, type Materials } from './data';
import { addMaterials, netRate } from './economy';
import { takeIslandStore } from './islands';
import { curioChance, foundCurio, pickCurio } from './curios';
import { seaView } from './seas';
import { has } from './talents';
import { T } from './tuning';
import { rollStory } from './voyageLog';
import { friendHaul } from './commission';
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

/** Light the boat needs to find an island here: in the fog, one level more than elsewhere. */
export function needLightHere(s: GameState, d: DestId): number {
  return DESTS[d].needLight + (s.sea === 'fog' ? T.FOG_EXTRA_LIGHT : 0);
}

export function reachable(s: GameState, d: DestId): boolean {
  return s.boat.built && s.levels.light >= needLightHere(s, d);
}

/** Which boat: 0 is the first, 1 the second (from the fog sea on). */
export type BoatNo = 0 | 1;
export const boatOf = (s: GameState, n: BoatNo = 0): GameState['boat'] => (n === 1 ? s.boat2 : s.boat);

/** A second boat, once the first is built and you have reached the fog sea. */
export const BOAT2_COST: Materials = { wood: 20000, plastic: 0, rope: 6000, metal: 2400, glow: 0 };

export function canBuildBoat2(s: GameState): boolean {
  return s.boat.built && !s.boat2.built && s.reached.includes('fog') && MATERIALS.every((m) => s.materials[m] >= T.BOAT2_COST_MULT * BOAT2_COST[m]);
}

export function buildBoat2(s: GameState): boolean {
  if (!canBuildBoat2(s)) return false;
  for (const m of MATERIALS) s.materials[m] -= T.BOAT2_COST_MULT * BOAT2_COST[m];
  s.boat2.built = true;
  return true;
}

/** A boat that is built, in port and empty, or null. */
export function freeBoat(s: GameState): BoatNo | null {
  for (const n of [0, 1] as const) {
    const b = boatOf(s, n);
    if (b.built && !b.voyage && !b.cargo) return n;
  }
  return null;
}

export function voyageMs(s: GameState, d: DestId): number {
  return (
    DESTS[d].minutes *
    60_000 *
    Math.pow(1 - T.SPEED_STEP, s.levels.speed - 1) *
    (1 - 0.04 * (s.buildings.boatshed ?? 0)) *
    (has(s, 'voy1') ? 0.85 : 1) *
    // The brighter the lighthouse, the easier the way home.
    (1 - T.LIGHT_RETURN * (s.levels.light - 1))
  );
}

export function cargoMultiplier(s: GameState): number {
  return 1 + T.CARGO_STEP * (s.levels.cargo - 1);
}

/** What one trip to d brings back right now (scales with the net, so trips stay worthwhile). */
export function voyageHaul(s: GameState, d: DestId): Materials {
  const dest = DESTS[d];
  // In the fog the boat only finds what the lighthouse lights: full haul at light 10.
  const fog = s.sea === 'fog' ? s.levels.light / 10 : 1;
  const total = netRate(s) * dest.minutes * 60 * T.BOAT_BASE * cargoMultiplier(s) * (has(s, 'haul2') ? 1.3 : 1) * fog * friendHaul(s, d) * (s.boat2.built ? T.TWO_BOATS_HAUL : 1);
  const h = emptyMaterials();
  for (const m of MATERIALS) h[m] = total * (dest.mix[m] ?? 0);
  if (d === 'firefly') h.glow = 2 + s.levels.cargo;
  return h;
}

export function canSail(s: GameState, d: DestId, n: BoatNo = 0): boolean {
  const b = boatOf(s, n);
  return b.built && s.levels.light >= needLightHere(s, d) && !b.voyage && !b.cargo;
}

export function startVoyage(s: GameState, d: DestId, nowMs: number, rng: () => number = Math.random, n: BoatNo = 0): boolean {
  if (!canSail(s, d, n)) return false;
  const b = boatOf(s, n);
  b.voyage = planVoyage(s, d, nowMs, rng);
  b.lastDest = d;
  return true;
}

/** A trip leaving now: its story is rolled as it sails (luck can bring it home early). */
function planVoyage(s: GameState, d: DestId, nowMs: number, rng: () => number): NonNullable<GameState['boat']['voyage']> {
  const story = rollStory(d, rng);
  const ms = voyageMs(s, d) * (story.bonus === 'early' ? 1 - T.STORY_EARLY : 1);
  return { sea: s.sea, dest: d, departAt: nowMs, returnAt: nowMs + ms, story };
}

/** If the boat is due back, put its haul on the dock. Returns the new cargo, if any. */
export function settleVoyage(s: GameState, nowMs: number, rng: () => number = Math.random, n: BoatNo = 0): Cargo | null {
  const boat = boatOf(s, n);
  const v = boat.voyage;
  if (!v || nowMs < v.returnAt) return null;
  // The boat may have sailed at a sea you've since left.
  const at = seaView(s, v.sea) ?? s;
  const discovery = !at.discovered.includes(v.dest);
  const haul = voyageHaul(at, v.dest);
  if (discovery) for (const [m, n] of Object.entries(DISCOVERY_FIND[v.dest] ?? {})) haul[m as keyof Materials] += n ?? 0;
  // Under the aurora the islands are iced in: the first trip only breaks the ice.
  const iceBreak = v.sea === 'aurora' && discovery;
  if (iceBreak) for (const m of MATERIALS) haul[m] = 0;
  if (v.story?.bonus === 'haul') for (const m of MATERIALS) haul[m] *= 1 + T.STORY_HAUL;
  if (v.story?.bonus === 'find') haul.glow += T.STORY_FIND_GLOW;
  // Whatever the island's buildings made comes home too.
  const fromIsland = takeIslandStore(at, v.dest);
  for (const m of MATERIALS) haul[m] += fromIsland[m];
  boat.voyage = null;
  boat.cargo = { sea: v.sea, dest: v.dest, haul, discovery, fromIsland, story: v.story, ...(iceBreak ? { iceBreak } : {}) };
  if (rng() < curioChance(at, 'boat')) {
    const c = pickCurio(at, 'boat', rng, v.dest);
    if (c) boat.cargo.curio = c;
  }
  boat.cargo.rare = !!boat.cargo.curio || discovery || !!v.story?.bonus;
  return boat.cargo;
}

/** Take the boat's cargo into the inventory (and record the island as found). */
export function unloadBoat(s: GameState, n: BoatNo = 0): Cargo | null {
  const boat = boatOf(s, n);
  const c = boat.cargo;
  if (!c) return null;
  // Each sea keeps its own materials: a haul from an old sea goes to that sea.
  const at = seaView(s, c.sea) ?? s;
  addMaterials(at, c.haul);
  if (!at.discovered.includes(c.dest)) at.discovered.push(c.dest);
  if (c.curio) foundCurio(s, c.curio);
  boat.cargo = null;
  return c;
}

/** Most trips the auto-boat makes in one catch-up, so a long absence can't freeze the game. */
export const AUTO_TRIPS_MAX = 200;

/**
 * With the auto-boat talent: a returned boat unloads itself and sails again to the
 * same place, trip after trip, each leaving when the last one got back.
 */
export function autoSail(s: GameState, nowMs: number, rng: () => number = Math.random): void {
  if (!has(s, 'autoBoat')) return;
  for (const n of [0, 1] as const) {
    const boat = boatOf(s, n);
    if (!boat.built) continue;
    if (boat.cargo && !boat.voyage) {
      const dest = boat.cargo.dest;
      unloadBoat(s, n);
      startVoyage(s, boat.lastDest ?? dest, nowMs, rng, n);
    }
    for (let i = 0; i < AUTO_TRIPS_MAX; i++) {
      const v = boat.voyage;
      if (!v || nowMs < v.returnAt) break;
      const back = v.returnAt;
      settleVoyage(s, back, rng, n);
      unloadBoat(s, n);
      // Sail again from the sea it was at; reachability is judged there.
      const at = seaView(s, v.sea) ?? s;
      if (!canSail(at, v.dest, n)) break;
      boat.voyage = { ...planVoyage(at, v.dest, back, rng), sea: v.sea };
    }
  }
}
