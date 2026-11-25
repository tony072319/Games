import type { DecorId } from '../core/decor';
/**
 * What each upgrade level looks like in the world (spec §10): every level adds or swaps something.
 * Offsets are in world units from the thing's anchor point; y is height above the ground.
 */
import type { BuildingId, DestId } from '../core/data';
import type { ModelId } from './assets';

export interface Part {
  part: string;
  model: ModelId;
  dx: number;
  dz: number;
  dy?: number;
  rotY?: number;
  size?: number;
  tint?: number;
  glow?: 'lamp' | 'window' | 'lantern' | 'fire';
}

const LH_SMALL = 'lh/lighthouse_small';
const LH_TALL = 'lh/lighthouse_tall';

/** Lighthouse levels 1..10 (index 0 unused). */
export const LIGHT_LOOKS: Part[][] = [
  [],
  [
    { part: 'body', model: LH_SMALL, dx: 0, dz: 0, size: 4.2, tint: 0xb4a8b0, glow: 'lamp' },
    { part: 'scaffold', model: 'kk/building_scaffolding', dx: 0.9, dz: 0.4, size: 2.4 },
  ],
  [
    { part: 'body', model: LH_SMALL, dx: 0, dz: 0, size: 4.4, tint: 0xd8d0d6, glow: 'lamp' },
    { part: 'scaffold', model: 'kk/building_scaffolding', dx: 0.9, dz: 0.4, size: 1.6 },
    { part: 'crates', model: 'kk/crate_A_small', dx: -0.8, dz: 0.6, size: 0.45 },
  ],
  [{ part: 'body', model: LH_SMALL, dx: 0, dz: 0, size: 4.6, glow: 'lamp' }],
  [
    { part: 'body', model: LH_SMALL, dx: 0, dz: 0, size: 4.8, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.0, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.2, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
    { part: 'horn', model: 'lh/fog_horn', dx: 0.8, dz: -0.6, size: 0.8, rotY: 0.6 },
    { part: 'scope', model: 'lh/telescope_stand', dx: -0.6, dz: -0.8, size: 0.9, rotY: 2 },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.3, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
    { part: 'horn', model: 'lh/fog_horn', dx: 0.8, dz: -0.6, size: 0.8, rotY: 0.6 },
    { part: 'scope', model: 'lh/telescope_stand', dx: -0.6, dz: -0.8, size: 0.9, rotY: 2 },
    { part: 'flag', model: 'kk/flag_red', dx: 0.9, dz: 0.7, size: 1.5 },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.4, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
    { part: 'horn', model: 'lh/fog_horn', dx: 0.8, dz: -0.6, size: 0.8, rotY: 0.6 },
    { part: 'scope', model: 'lh/telescope_stand', dx: -0.6, dz: -0.8, size: 0.9, rotY: 2 },
    { part: 'flag', model: 'kk/flag_red', dx: 0.9, dz: 0.7, size: 1.5 },
    { part: 'lights', model: 'tiki/string_lights', dx: 1.2, dz: 0.2, rotY: 0.4, glow: 'lantern' },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.5, tint: 0xfff0d6, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
    { part: 'horn', model: 'lh/fog_horn', dx: 0.8, dz: -0.6, size: 0.8, rotY: 0.6 },
    { part: 'scope', model: 'lh/telescope_stand', dx: -0.6, dz: -0.8, size: 0.9, rotY: 2 },
    { part: 'flag', model: 'kk/flag_red', dx: 0.9, dz: 0.7, size: 1.5 },
    { part: 'lights', model: 'tiki/string_lights', dx: 1.2, dz: 0.2, rotY: 0.4, glow: 'lantern' },
    { part: 'pennant', model: 'kp/flag-high-pennant', dx: -1.0, dz: -0.3, size: 2.2 },
  ],
  [
    { part: 'body', model: LH_TALL, dx: 0, dz: 0, size: 6.8, tint: 0xfff0d6, glow: 'lamp' },
    { part: 'lamppost', model: 'lh/signal_lamp_post', dx: -0.9, dz: 0.5, size: 1.4, glow: 'lantern' },
    { part: 'horn', model: 'lh/fog_horn', dx: 0.8, dz: -0.6, size: 0.8, rotY: 0.6 },
    { part: 'scope', model: 'lh/telescope_stand', dx: -0.6, dz: -0.8, size: 0.9, rotY: 2 },
    { part: 'flag', model: 'kk/flag_red', dx: 0.9, dz: 0.7, size: 1.5 },
    { part: 'lights', model: 'tiki/string_lights', dx: 1.2, dz: 0.2, rotY: 0.4, glow: 'lantern' },
    { part: 'pennant', model: 'kp/flag-high-pennant', dx: -1.0, dz: -0.3, size: 2.2 },
    { part: 'beacon', model: 'harbor/beacon_light', dx: 0.5, dz: 0.9, size: 1.2, glow: 'lantern' },
  ],
];

/** The net pile grows a little every level; each milestone adds something to the harbour. */
export function netParts(level: number): Part[] {
  const parts: Part[] = [{ part: 'pile', model: 'lh/fishing_net_pile', dx: 0, dz: 0, size: 0.35 + 0.01 * level }];
  if (level >= 10) parts.push({ part: 'm10', model: 'harbor/fishing_rod_rack', dx: -0.7, dz: -0.2 });
  if (level >= 20) parts.push({ part: 'm20', model: 'viking/fish_drying_rack', dx: 0.2, dz: -0.8, rotY: 0.3 });
  if (level >= 30) parts.push({ part: 'm30', model: 'harbor/harbor_crane', dx: 2.6, dz: 3.0, rotY: -0.6 });
  if (level >= 40) parts.push({ part: 'm40', model: 'harbor/fish_market_stall', dx: -1.1, dz: 0.7, rotY: -1.2 });
  if (level >= 50) parts.push({ part: 'm50', model: 'lh/fishing_boat', dx: 4.2, dz: 2.0, dy: -0.25, rotY: 0.9 });
  return parts;
}

/** Storage chest levels 1..11. The first part is the one you tap. */
export const CHEST_LOOKS: Part[][] = [
  [],
  [{ part: 'a', model: 'kk/crate_A_small', dx: 0, dz: 0 }],
  [
    { part: 'a', model: 'kk/crate_A_small', dx: 0, dz: 0 },
    { part: 'b', model: 'kk/crate_A_small', dx: 0.05, dz: 0.02, dy: 0.48, rotY: 0.4, size: 0.42 },
  ],
  [
    { part: 'a', model: 'kk/crate_A_small', dx: 0, dz: 0 },
    { part: 'b', model: 'kk/crate_A_small', dx: 0.05, dz: 0.02, dy: 0.48, rotY: 0.4, size: 0.42 },
    { part: 'barrel', model: 'kk/barrel', dx: 0.55, dz: 0.1 },
  ],
  [
    { part: 'a', model: 'kk/crate_A_big', dx: 0, dz: 0 },
    { part: 'barrel', model: 'kk/barrel', dx: 0.65, dz: 0.1 },
  ],
  [
    { part: 'a', model: 'kk/crate_A_big', dx: 0, dz: 0 },
    { part: 'barrels', model: 'harbor/fish_barrel_stack', dx: 0.75, dz: 0.1 },
  ],
  [
    { part: 'a', model: 'lh/treasure_chest', dx: 0, dz: 0, size: 0.5 },
    { part: 'barrels', model: 'harbor/fish_barrel_stack', dx: 0.75, dz: 0.1 },
    { part: 'sack', model: 'kk/sack', dx: -0.5, dz: 0.2 },
  ],
  [
    { part: 'a', model: 'kp/chest', dx: 0, dz: 0, size: 0.55 },
    { part: 'barrels', model: 'harbor/fish_barrel_stack', dx: 0.75, dz: 0.1 },
    { part: 'crate', model: 'kk/crate_B_big', dx: -0.6, dz: -0.1, size: 0.7 },
  ],
  [{ part: 'a', model: 'viking/storehouse', dx: 0, dz: -0.2, size: 1.3 }],
  [
    { part: 'a', model: 'viking/storehouse', dx: 0, dz: -0.2, size: 1.4 },
    { part: 'cargo', model: 'harbor/cargo_crate', dx: 0.9, dz: 0.4, size: 0.6 },
  ],
  [
    { part: 'a', model: 'viking/storehouse', dx: 0, dz: -0.2, size: 1.5 },
    { part: 'cargo', model: 'harbor/cargo_crate', dx: 0.9, dz: 0.4, size: 0.6 },
    { part: 'lumber', model: 'kk/resource_lumber', dx: -0.9, dz: 0.4 },
  ],
  [
    { part: 'a', model: 'viking/storehouse', dx: 0, dz: -0.2, size: 1.6 },
    { part: 'cargo', model: 'harbor/cargo_crate', dx: 0.9, dz: 0.4, size: 0.6 },
    { part: 'cargo2', model: 'harbor/cargo_crate', dx: 0.95, dz: 0.4, dy: 0.6, rotY: 0.3, size: 0.55 },
    { part: 'cart', model: 'kk/wheelbarrow', dx: -0.9, dz: 0.4 },
  ],
];

/** The boat grows with its upgrades: rowing boat, then a sail, then a small ship. */
export function boatModel(speed: number, cargo: number): ModelId {
  if (speed + cargo >= 12) return 'kp/ship-small';
  if (speed >= 4) return 'harbor/sailboat';
  return 'kp/boat-row-small';
}

/** Each island's own look once found; the same main model, darkened, before. */
export const ISLAND_DECOR: Record<DestId, Part[]> = {
  wreck: [
    { part: 'hull', model: 'under/shipwreck_hull', dx: -1.2, dz: -0.9, dy: -0.25, rotY: 0.7 },
    { part: 'rock', model: 'under/sea_rock_big', dx: 1.4, dz: -1.4, dy: -0.2 },
  ],
  gullrock: [
    { part: 'stack', model: 'lh/sea_stack', dx: -0.4, dz: -1.6, dy: -0.2, size: 4 },
    { part: 'rock', model: 'lh/sea_rock_large', dx: 1.6, dz: -1.2, dy: -0.2 },
  ],
  oldlight: [
    { part: 'tower', model: 'lh/lighthouse_small', dx: -0.6, dz: -1.2, size: 3.6, tint: 0x9a96a8 },
    { part: 'rock', model: 'nature/rock_cluster', dx: 1.4, dz: -1.0 },
  ],
  firefly: [
    { part: 'palm', model: 'volcano/palm_tree', dx: -0.8, dz: -1.3 },
    { part: 'banana', model: 'huts/banana_plant', dx: 1.3, dz: -1.0 },
  ],
};

/** The building each island building becomes from level 3 on. */
export const BUILDING_MODEL: Record<BuildingId, ModelId> = {
  dismantler: 'viking/forge',
  rack: 'viking/fish_drying_rack',
  boatshed: 'huts/fish_shack',
  nest: 'huts/stilt_hut',
  kelp: 'harbor/fishing_rod_rack',
  lookout: 'viking/watchtower',
  depot: 'viking/storehouse',
  workshop: 'kk/building_lumbermill_blue',
  desk: 'lh/keeper_house',
  jars: 'winter/lantern_xmas',
  orchard: 'nature/round_tree',
  path: 'tiki/tiki_torch',
};

/** Level 1 a building site, 2 half built, 3–5 the building with more around it. */
export function buildingParts(b: BuildingId, level: number): Part[] {
  if (level <= 0) return [];
  if (level === 1) return [{ part: 'site', model: 'kk/building_stage_A', dx: 0, dz: 0 }];
  if (level === 2) return [{ part: 'site', model: 'kk/building_stage_C', dx: 0, dz: 0 }];
  const glow = b === 'jars' ? 'lantern' : b === 'path' ? 'fire' : undefined;
  const parts: Part[] = [{ part: 'main', model: BUILDING_MODEL[b], dx: 0, dz: 0, glow }];
  if (level >= 4) parts.push({ part: 'goods', model: 'kk/crate_A_small', dx: 0.6, dz: 0.4, size: 0.35 });
  if (level >= 5) parts.push({ part: 'flag', model: 'kk/flag_yellow', dx: -0.6, dz: 0.4, size: 1.0 });
  return parts;
}

/** Decorations, tier 1..3 (index = tier - 1); parts are placed around the centre of the decoration's tile. */
const p = (part: string, model: ModelId, dx = 0, dz = 0, extra: Partial<Part> = {}): Part => ({ part, model, dx, dz, ...extra });
export const DECOR_LOOKS: Record<DecorId, Part[][]> = {
  lantern: [
    [p('a', 'lh/signal_lamp_post')],
    [p('a', 'harbor/dock_post_lantern', 0, 0, { glow: 'lantern' })],
    [p('a', 'winter/lantern_xmas', 0, 0, { glow: 'lantern' }), p('b', 'nature/grass_tuft', 0.5, 0.3)],
  ],
  flowers: [
    [p('a', 'nature/flower_yellow')],
    [p('a', 'nature/flower_yellow', -0.3), p('b', 'nature/flower_red', 0.3, 0.2)],
    [p('a', 'nature/flower_yellow', -0.4), p('b', 'nature/flower_red', 0.3, 0.3), p('c', 'nature/flower_purple', 0.1, -0.4), p('d', 'nature/bush_round', -0.5, 0.5)],
  ],
  bench: [
    [p('a', 'kk/pallet')],
    [p('a', 'kk/crate_long_A'), p('b', 'kk/sack', 0.5, 0.3)],
    [p('a', 'huts/hammock', 0, 0, { rotY: 0.6 })],
  ],
  flags: [
    [p('a', 'kk/flag_blue')],
    [p('a', 'kk/flag_blue', -0.4), p('b', 'kk/flag_yellow', 0.4, 0.2)],
    [p('a', 'kp/flag-high-pennant'), p('b', 'kk/flag_yellow', 0.6, 0.3)],
  ],
  well: [
    [p('a', 'kk/building_well_blue')],
    [p('a', 'viking/well')],
    [p('a', 'viking/well'), p('b', 'kpet/animal-bunny', 0.6, 0.4, { rotY: -0.8 })],
  ],
  garden: [
    [p('a', 'nature/fern'), p('b', 'nature/fern', 0.4, 0.3)],
    [p('a', 'huts/banana_plant'), p('b', 'nature/fern', 0.5, 0.3)],
    [p('a', 'nature/palm_tree', -0.2), p('b', 'volcano/coconut_cluster', 0.5, 0.4)],
  ],
  hut: [
    [p('a', 'kk/tent')],
    [p('a', 'viking/small_hut')],
    [p('a', 'volcano/thatch_hut', 0, 0, { glow: 'window' })],
  ],
  torches: [
    [p('a', 'tiki/tiki_torch', 0, 0, { glow: 'fire' })],
    [p('a', 'tiki/tiki_torch', -0.4, 0, { glow: 'fire' }), p('b', 'tiki/tiki_torch', 0.4, 0.2, { glow: 'fire' })],
    [p('a', 'tiki/tiki_torch', -0.5, 0, { glow: 'fire' }), p('b', 'tiki/tiki_torch', 0.5, 0.1, { glow: 'fire' }), p('c', 'tiki/tiki_torch', 0, 0.5, { glow: 'fire' })],
  ],
  lights: [
    [p('a', 'huts/rope_fence')],
    [p('a', 'tiki/string_lights', 0, 0, { glow: 'lantern' })],
    [p('a', 'tiki/string_lights', 0, 0, { glow: 'lantern' }), p('b', 'lh/telescope_stand', 0.6, 0.4)],
  ],
  tower: [
    [p('a', 'kk/building_stage_A')],
    [p('a', 'kk/building_tower_A_blue')],
    [p('a', 'viking/watchtower')],
  ],
};
