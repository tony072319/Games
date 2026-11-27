import { T } from './tuning';
export type MaterialId = 'wood' | 'plastic' | 'rope' | 'metal' | 'glow';
export const MATERIALS: readonly MaterialId[] = ['wood', 'plastic', 'rope', 'metal', 'glow'];
export type Materials = Record<MaterialId, number>;

/** Share of drifting items that are each material. Must sum to 1. Glow never drifts: only the boat finds it. */
export const MATERIAL_WEIGHTS: Materials = { wood: 0.5, plastic: 0.3, rope: 0.15, metal: 0.05, glow: 0 };

export type UpgradeId = 'net' | 'storage' | 'light' | 'recycle' | 'speed' | 'cargo';
export const UPGRADES: readonly UpgradeId[] = ['net', 'storage', 'light', 'recycle', 'speed', 'cargo'];
/** Upgrades shown in the main panel; the boat's live on the sea map. */
export const PANEL_UPGRADES: readonly UpgradeId[] = ['net', 'storage', 'light', 'recycle'];
export const BOAT_UPGRADES: readonly UpgradeId[] = ['speed', 'cargo'];
export const MAX_LEVEL: Record<UpgradeId, number> = { net: 50, storage: 11, light: 10, recycle: 10, speed: 10, cargo: 10 };

export type DestId = 'wreck' | 'gullrock' | 'oldlight' | 'firefly';
export const DEST_IDS: readonly DestId[] = ['wreck', 'gullrock', 'oldlight', 'firefly'];

export const SPAWN_INTERVAL_MS = 2000;
export const MAX_FLOATING = 6;
/** How long a find drifts across (slow enough to tap on a narrow phone, where the bigger island's lane is long). */
export const FLOAT_LIFETIME_MS = 12000;

/** A short break (under five minutes) gets no arrival report: the chest simply has a little more. */
export const OFFLINE_MIN_REPORT_SECONDS = 300;
export const LIVE_DT_MAX_SECONDS = 5;
export const AUTOSAVE_MS = 10000;

export type BuildingId =
  | 'dismantler' | 'rack' | 'boatshed'
  | 'nest' | 'kelp' | 'lookout'
  | 'depot' | 'workshop' | 'desk'
  | 'jars' | 'orchard' | 'path';
export const BUILDING_MAX = 5;

export type SeaId = 'dusk' | 'fog' | 'aurora';
export const SEA_IDS: readonly SeaId[] = ['dusk', 'fog', 'aurora'];
/** How much richer (rate) and costlier (cost) each sea is than the first. */
/** How rich each sea is and how dear its mending; the numbers live in tuning.ts. */
export const SEA_DEF: Record<SeaId, { readonly rate: number; readonly cost: number }> = {
  dusk: { rate: 1, cost: 1 },
  fog: {
    get rate() {
      return T.FOG_RATE;
    },
    get cost() {
      return T.FOG_COST;
    },
  },
  aurora: {
    get rate() {
      return T.AURORA_RATE;
    },
    get cost() {
      return T.AURORA_COST;
    },
  },
};
/** Each star of starlight adds this much to all production. */
export const STARLIGHT_BONUS = 0.03;
