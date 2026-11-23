import { MATERIALS, type Materials, type UpgradeId } from './data';

export type Lang = 'zh' | 'en';

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
    levels: { net: 1, storage: 1 },
    lastActiveAt: nowMs,
    settings: { lang, sound: true },
    stats: { tapped: 0 },
  };
}
