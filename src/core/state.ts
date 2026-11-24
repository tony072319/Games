import { MATERIALS, type BuildingId, type DestId, type Materials, type SeaId, type UpgradeId } from './data';

export type Lang = 'zh' | 'en';

export interface Voyage {
  sea: SeaId;
  dest: DestId;
  departAt: number;
  returnAt: number;
}

/** What the boat brought back, waiting on the dock to be unloaded. */
export interface Cargo {
  sea: SeaId;
  dest: DestId;
  haul: Materials;
  /** First time reaching this island. */
  discovery: boolean;
  /** Part of the haul that the island's own buildings made. */
  fromIsland: Materials;
}

/** Everything that belongs to one sea. The sea you're at lives in the top-level fields; the others are kept here. */
export interface SeaState {
  levels: { net: number; storage: number; light: number };
  chest: Materials;
  discovered: DestId[];
  buildings: Partial<Record<BuildingId, number>>;
  islandStore: Partial<Record<DestId, Materials>>;
  islandAt: number;
  /** Last time this sea's chest was filled while you were elsewhere. */
  chestAt: number;
}

export interface GameState {
  version: 1;
  materials: Materials;
  /** What the net has gathered into the storage chest, waiting to be collected. */
  chest: Materials;
  levels: Record<UpgradeId, number>;
  /** Epoch ms of the last moment progress was credited. */
  lastActiveAt: number;
  /** calm: fewer animations. mini: corner mode. */
  settings: { lang: Lang; sound: boolean; calm: boolean; mini: boolean };
  /** tutorial: first-time steps done (0..3). */
  stats: { tapped: number; tutorial: number };
  boat: { built: boolean; voyage: Voyage | null; cargo: Cargo | null };
  discovered: DestId[];
  /** Island building levels (absent = not built). */
  buildings: Partial<Record<BuildingId, number>>;
  /** What each island's buildings have made, waiting for the boat. */
  islandStore: Partial<Record<DestId, Materials>>;
  /** Last time island production was credited. */
  islandAt: number;
  /** The sea you're at now; its data is in the fields above. */
  sea: SeaId;
  /** Seas you've reached (starlight is paid the first time you leave one for the next). */
  reached: SeaId[];
  /** Seas you're not at right now, still lit and still producing. */
  seas: Partial<Record<SeaId, SeaState>>;
  starlight: number;
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
    settings: { lang, sound: true, calm: false, mini: false },
    stats: { tapped: 0, tutorial: 0 },
    boat: { built: false, voyage: null, cargo: null },
    discovered: [],
    buildings: {},
    islandStore: {},
    islandAt: nowMs,
    sea: 'dusk',
    reached: ['dusk'],
    seas: {},
    starlight: 0,
  };
}
