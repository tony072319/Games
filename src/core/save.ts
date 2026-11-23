import { MATERIALS, MAX_LEVEL, UPGRADES } from './data';
import { newGame, type GameState, type Lang } from './state';

export const SAVE_KEY = 'lightkeeper.save';
export const CORRUPT_KEY = 'lightkeeper.save.corrupt';

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export type LoadStatus = 'new' | 'loaded' | 'repaired' | 'corrupt';

/** Writes the save. Returns false (never throws) if storage refuses, e.g. quota full. */
export function saveGame(kv: KV, state: GameState): boolean {
  return safeSet(kv, SAVE_KEY, JSON.stringify(state));
}

function safeSet(kv: KV, key: string, value: string): boolean {
  try {
    kv.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isAmount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

export function loadGame(kv: KV, nowMs: number, lang: Lang): { state: GameState; status: LoadStatus } {
  const raw = kv.getItem(SAVE_KEY);
  if (raw === null) return { state: newGame(nowMs, lang), status: 'new' };

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = undefined;
  }
  if (!isObj(data) || data.version !== 1) {
    safeSet(kv, CORRUPT_KEY, raw);
    return { state: newGame(nowMs, lang), status: 'corrupt' };
  }

  const state = newGame(nowMs, lang);
  let dropped = false;

  const mats = isObj(data.materials) ? data.materials : {};
  for (const m of MATERIALS) {
    if (isAmount(mats[m])) state.materials[m] = mats[m];
    else dropped = true;
  }

  // The chest was added after the first release; a save without it simply has an empty chest.
  const chest = isObj(data.chest) ? data.chest : {};
  for (const m of MATERIALS) {
    if (isAmount(chest[m])) state.chest[m] = chest[m];
    else if (m in chest) dropped = true;
  }

  const levels = isObj(data.levels) ? data.levels : {};
  for (const u of UPGRADES) {
    const v = levels[u];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_LEVEL[u]) state.levels[u] = v;
    else dropped = true;
  }

  if (typeof data.lastActiveAt === 'number' && Number.isFinite(data.lastActiveAt)) {
    state.lastActiveAt = data.lastActiveAt;
  } else dropped = true;

  const settings = isObj(data.settings) ? data.settings : {};
  if (settings.lang === 'zh' || settings.lang === 'en') state.settings.lang = settings.lang;
  else dropped = true;

  const stats = isObj(data.stats) ? data.stats : {};
  if (isAmount(stats.tapped)) state.stats.tapped = stats.tapped;
  else dropped = true;

  if (dropped) safeSet(kv, CORRUPT_KEY, raw);
  return { state, status: dropped ? 'repaired' : 'loaded' };
}

/** Storage whose keys are all prefixed, so a test build can't touch the real save. */
export function prefixedKV(kv: KV, prefix: string): KV {
  return {
    getItem: (k) => kv.getItem(prefix + k),
    setItem: (k, v) => kv.setItem(prefix + k, v),
  };
}
