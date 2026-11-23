import { MATERIALS, type BuildingId, type DestId, type Materials, type UpgradeId } from './data';

export type Lang = 'zh' | 'en';

export interface Voyage {
  dest: DestId;
  departAt: number;
  returnAt: number;
}

/** What the boat brought back, waiting on the dock to be unloaded. */
export interface Cargo {
  dest: DestId;
  haul: Materials;
  /** First time reaching this island. */
  discovery: boolean;
  /** Part of the haul that the island's own buildings made. */
  fromIsland: Materials;
}

export interface GameState {
  version: 1;
  materials: Materials;
  /** What the net has gathered into the storage chest, waiting to be collected. */
  chest: Materials;
  levels: Record<UpgradeId, number>;
  /** Epoch ms of the last moment progress was credited. */
  lastActiveAt: number;
  settings: { lang: Lang; sound: boolean };
  stats: { tapped: number };
  boat: { built: boolean; voyage: Voyage | null; cargo: Cargo | null };
  discovered: DestId[];
  /** Island building levels (absent = not built). */
  buildings: Partial<Record<BuildingId, number>>;
  /** What each island's buildings have made, waiting for the boat. */
  islandStore: Partial<Record<DestId, Materials>>;
  /** Last time island production was credited. */
  islandAt: number;
}

export function emptyMaterials(): Materials {
  const m = {} as Materials;
  for (const id of MATERIALS) m[id] = 0;
  return m;
}

export function newGame(nowMs: number, lang: Lang): GameState {
  return {
    version: 1,
    materials: emptyMaterials(),
    chest: emptyMaterials(),
    levels: { net: 1, storage: 1, light: 1, speed: 1, cargo: 1 },
    lastActiveAt: nowMs,
    settings: { lang, sound: true },
    stats: { tapped: 0 },
    boat: { built: false, voyage: null, cargo: null },
    discovered: [],
    buildings: {},
    islandStore: {},
    islandAt: nowMs,
  };
}
