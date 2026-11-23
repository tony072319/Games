export type MaterialId = 'wood' | 'plastic' | 'rope' | 'metal';
export const MATERIALS: readonly MaterialId[] = ['wood', 'plastic', 'rope', 'metal'];
export type Materials = Record<MaterialId, number>;

/** Share of drifting items that are each material. Must sum to 1. */
export const MATERIAL_WEIGHTS: Materials = { wood: 0.5, plastic: 0.3, rope: 0.15, metal: 0.05 };

export type UpgradeId = 'net' | 'storage';
export const UPGRADES: readonly UpgradeId[] = ['net', 'storage'];
export const MAX_LEVEL: Record<UpgradeId, number> = { net: 50, storage: 11 };

export const SPAWN_INTERVAL_MS = 2000;
export const MAX_FLOATING = 6;
export const FLOAT_LIFETIME_MS = 8000;

export const OFFLINE_MIN_REPORT_SECONDS = 60;
export const LIVE_DT_MAX_SECONDS = 5;
export const AUTOSAVE_MS = 10000;
