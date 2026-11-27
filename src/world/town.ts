/**
 * The town: houses on the plots of the island's plan (homeplan.ts), built outward from the pier
 * as the town grows (core/town.ts), in each sea's own colours. People walk the roads.
 */
import type { SeaId } from '../core/data';
import type { GameState } from '../core/state';
import type { ModelId } from './assets';
import { PLOTS, ROADS, roadLength, roadPoint } from './homeplan';
import { homeShape } from './terrain';

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

/** Each sea's town wears its own roofs: blue at dusk, mossy green in the fog, red under the snow. */
const ROOF: Record<SeaId, string> = { dusk: 'blue', fog: 'green', aurora: 'red' };
const kk = (kind: string, sea: SeaId): ModelId => `kk/building_${kind}_${ROOF[sea]}`;
const SEAS: SeaId[] = ['dusk', 'fog', 'aurora'];
/** The same kinds of place in every sea, in that sea's colours (a name with a slash is one model for all seas). */
const inEachSea = (kinds: string[]): Record<SeaId, ModelId[]> =>
  Object.fromEntries(SEAS.map((sea) => [sea, kinds.map((k) => (k.includes('/') ? k : kk(k, sea)))])) as Record<SeaId, ModelId[]>;

// By the water: mostly fishermen's houses, with one crane and one water wheel among them (the list is as long as the harbour has plots).
const HARBOUR = inEachSea(['home_B', 'harbor/fish_market_stall', 'tavern', 'home_A', 'viking/fish_drying_rack', 'home_B', 'harbor/harbor_crane', 'home_A', 'watermill', 'home_B', 'market', 'home_A', 'viking/fish_drying_rack', 'home_B', 'tavern', 'home_A', 'harbor/fish_market_stall', 'home_B']);
const TOWN = inEachSea(['home_A', 'home_B', 'blacksmith', 'home_A', 'tavern', 'lumbermill', 'home_B', 'tower_A', 'church', 'market']);
/** Buildings people live in: their windows light up at night. */
export const TOWN_HOMES: ModelId[] = SEAS.flatMap((sea) => [kk('home_A', sea), kk('home_B', sea), kk('tavern', sea), kk('church', sea)]);

/** Every place in the town, in the order they are built: each plot of the plan, with a house for each sea. */
export const TOWN_SLOTS: TownSlot[] = (() => {
  let byWater = 0;
  let inland = 0;
  return PLOTS.map((p): TownSlot => {
    const set = p.harbour ? HARBOUR : TOWN;
    // Each kind of place in turn, so neighbours differ.
    const i = p.harbour ? byWater++ : inland++;
    const models = { dusk: set.dusk[i % set.dusk.length], fog: set.fog[i % set.fog.length], aurora: set.aurora[i % set.aurora.length] };
    return {
      at: (land) => {
        const r = homeShape(land).radius;
        return [p.at[0] * r, p.at[1] * r];
      },
      // Its door to the road.
      rotY: Math.atan2(p.face[0], p.face[1]),
      models,
      harbour: p.harbour,
      // Panes only: a lit window would add a light, and every new light makes the GPU rebuild its shaders.
      glow: 'pane',
    };
  });
})();

/** People walking the roads, to the end and back; more as the town grows. */
export function townWalkers(s: GameState, nowMs: number, shown = TOWN_SLOTS.length): { key: string; x: number; z: number; rotY: number; model: ModelId }[] {
  const n = Math.min(8, Math.floor(shown / 5));
  const r = homeShape(s.land).radius;
  const out: { key: string; x: number; z: number; rotY: number; model: ModelId }[] = [];
  for (let i = 0; i < n; i++) {
    const road = i % ROADS.length;
    const len = roadLength(road);
    // A stroll: each at their own pace, starting from a different place.
    const pace = 0.013 * (1 + (i % 3) * 0.25);
    const walked = (i * 0.37 * len + (nowMs / 1000) * pace) % (2 * len);
    const back = walked > len;
    const { at, dir } = roadPoint(road, back ? 2 * len - walked : walked);
    const f = back ? -1 : 1;
    out.push({ key: `walker:${i}`, x: at[0] * r, z: at[1] * r, rotY: Math.atan2(dir[0] * f, dir[1] * f), model: i % 2 === 0 ? 'kc/character-male-a' : 'kc/character-male-c' });
  }
  return out;
}
