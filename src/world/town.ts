/**
 * Where the town stands and what each place looks like in each sea: the harbour flats by the
 * shore first, then the town terrace on both sides of its street. Places are built in order as
 * the town grows (core/town.ts); walkers stroll the street.
 */
import type { SeaId } from '../core/data';
import type { GameState } from '../core/state';
import type { ModelId } from './assets';
import { HARBOUR_RING, TOWN_RING, homeShape, ringPoint } from './terrain';

export interface TownSlot {
  /** Where it stands for an island grown by `land`. */
  at(land: number): [number, number];
  /** Facing (radians). */
  rotY: number;
  models: Record<SeaId, ModelId>;
  /** Lit windows at night (glow only). */
  glow?: 'pane';
  harbour: boolean;
}

const deg = (d: number) => (d * Math.PI) / 180;

/** Angles kept free on the terrace for the lighthouse's own things (fire, flowers, bush, mill, hammock, chick). */
const TERRACE_TAKEN = [1.25, -0.5, -2.75, 2.2, 1.6];
const clearOf = (a: number, taken: number[], gap: number) =>
  taken.every((t) => {
    let d = Math.abs(a - t) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d > gap;
  });

/** Each sea's town wears its own roofs: blue at dusk, mossy green in the fog, red under the snow. */
const ROOF: Record<SeaId, string> = { dusk: 'blue', fog: 'green', aurora: 'red' };
const kk = (kind: string, sea: SeaId): ModelId => `kk/building_${kind}_${ROOF[sea]}`;
const SEAS: SeaId[] = ['dusk', 'fog', 'aurora'];
/** The same kinds of place in every sea, in that sea's colours (a name with a slash is one model for all seas). */
const inEachSea = (kinds: string[]): Record<SeaId, ModelId[]> =>
  Object.fromEntries(SEAS.map((sea) => [sea, kinds.map((k) => (k.includes('/') ? k : kk(k, sea)))])) as Record<SeaId, ModelId[]>;

const HARBOUR = inEachSea(['home_B', 'harbor/fish_market_stall', 'tavern', 'harbor/harbor_crane', 'viking/fish_drying_rack', 'watermill']);
const TOWN = inEachSea(['home_A', 'home_B', 'blacksmith', 'home_A', 'tavern', 'lumbermill', 'home_B', 'tower_A', 'church', 'market']);
/** Buildings people live in: their windows light up at night. */
export const TOWN_HOMES: ModelId[] = SEAS.flatMap((sea) => [kk('home_A', sea), kk('home_B', sea), kk('tavern', sea), kk('church', sea)]);

function slot(frac: number, a: number, i: number, harbour: boolean): TownSlot {
  const set = harbour ? HARBOUR : TOWN;
  const models = { dusk: set.dusk[i % set.dusk.length], fog: set.fog[i % set.fog.length], aurora: set.aurora[i % set.aurora.length] };
  // Face the street (terrace) or the sea (harbour).
  const out = harbour || frac > TOWN_RING;
  const rotY = Math.atan2(Math.cos(a), Math.sin(a)) + (out ? Math.PI : 0);
  // Panes only: a lit window would add a light, and every new light makes the GPU rebuild its shaders.
  return { at: (land) => ringPoint(homeShape(land), frac, a), rotY, models, harbour, glow: 'pane' };
}

/** Every place in the town, in the order they are built. */
export const TOWN_SLOTS: TownSlot[] = (() => {
  const harbour: [number, number][] = [];
  // Between the decorations on the harbour ring (they stand at 78° + 28° k), the pier side left free.
  // (Not where the back cliff is half risen: the ground there slopes.)
  const cliff = homeShape(0).cliff;
  const onCliffSlope = (a: number) => !clearOf(a, [cliff[0]], cliff[1] * Math.PI * 0.4) === false && !clearOf(a, [cliff[0]], cliff[1] * Math.PI);
  for (let k = 0; k < 9; k++) {
    const a = deg(92 + 28 * k);
    if (!onCliffSlope(a)) harbour.push([HARBOUR_RING + 0.03, a]);
  }
  // And one on the far side of the pier.
  harbour.push([HARBOUR_RING + 0.03, deg(-6)]);
  const terrace: [number, number][] = [];
  // Two rows along the street, staggered.
  for (let k = 0; k < 18; k++) {
    const a = deg(10 + k * 20);
    if (clearOf(a, TERRACE_TAKEN, 0.32)) terrace.push([TOWN_RING + 0.1, a]);
    const b = deg(20 + k * 20);
    if (clearOf(b, TERRACE_TAKEN, 0.32)) terrace.push([TOWN_RING - 0.1, b]);
  }
  // Built from the front (facing the camera, about 60°) outwards, alternating harbour and terrace.
  const front = (a: number) => Math.abs(((a - deg(60) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
  harbour.sort((p, q) => front(p[1]) - front(q[1]));
  terrace.sort((p, q) => front(p[1]) - front(q[1]));
  const out: TownSlot[] = [];
  for (let i = 0; i < Math.max(harbour.length, terrace.length); i++) {
    if (harbour[i]) out.push(slot(harbour[i][0], harbour[i][1], i, true));
    if (terrace[i]) out.push(slot(terrace[i][0], terrace[i][1], i, false));
  }
  // Last of all, two buildings up on the peak beside the lighthouse.
  out.push(slot(0.17, 2.05, 7, false), slot(0.17, -2.95, 8, false));
  return out;
})();

/** People strolling the street; more as the town grows. */
export function townWalkers(s: GameState, nowMs: number, shown = TOWN_SLOTS.length): { key: string; x: number; z: number; rotY: number; model: ModelId }[] {
  const n = Math.min(8, Math.floor(shown / 5));
  const home = homeShape(s.land);
  const out: { key: string; x: number; z: number; rotY: number; model: ModelId }[] = [];
  for (let i = 0; i < n; i++) {
    const dir = i % 2 === 0 ? 1 : -1;
    const a = (i * 2.4 + dir * (nowMs / 1000) * 0.025 * (1 + (i % 3) * 0.2)) % (2 * Math.PI);
    const [x, z] = ringPoint(home, TOWN_RING, a);
    // Walking along the ring: facing its tangent.
    const rotY = Math.atan2(-Math.sin(a) * dir, Math.cos(a) * dir);
    out.push({ key: `walker:${i}`, x, z, rotY, model: i % 2 === 0 ? 'kc/character-male-a' : 'kc/character-male-c' });
  }
  return out;
}
