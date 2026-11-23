import { DEST_IDS, MATERIALS, MAX_LEVEL, UPGRADES, type DestId, type Materials } from './data';
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

  // Fields added in later versions may be missing: keep the default quietly.
  // A field that is present but invalid is dropped and reported as 'repaired'.
  const mats = isObj(data.materials) ? data.materials : {};
  if (!isObj(data.materials)) dropped = true;
  for (const m of MATERIALS) {
    if (isAmount(mats[m])) state.materials[m] = mats[m];
    else if (m in mats) dropped = true;
  }

  // The chest was added after the first release; a save without it simply has an empty chest.
  const chest = isObj(data.chest) ? data.chest : {};
  for (const m of MATERIALS) {
    if (isAmount(chest[m])) state.chest[m] = chest[m];
    else if (m in chest) dropped = true;
  }

  const levels = isObj(data.levels) ? data.levels : {};
  if (!isObj(data.levels)) dropped = true;
  for (const u of UPGRADES) {
    const v = levels[u];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_LEVEL[u]) state.levels[u] = v;
    else if (u in levels) dropped = true;
  }

  if (Array.isArray(data.discovered)) {
    for (const d of data.discovered) {
      if (DEST_IDS.includes(d as DestId) && !state.discovered.includes(d as DestId)) state.discovered.push(d as DestId);
      else dropped = true;
    }
  } else if ('discovered' in data) dropped = true;

  if (isObj(data.boat)) {
    const b = data.boat;
    if (typeof b.built === 'boolean') state.boat.built = b.built;
    else dropped = true;
    const v = b.voyage;
    if (isObj(v) && DEST_IDS.includes(v.dest as DestId) && Number.isFinite(v.departAt) && Number.isFinite(v.returnAt)) {
      state.boat.voyage = { dest: v.dest as DestId, departAt: v.departAt as number, returnAt: v.returnAt as number };
    } else if (v !== null && v !== undefined) dropped = true;
    const c = b.cargo;
    if (isObj(c) && DEST_IDS.includes(c.dest as DestId) && isObj(c.haul)) {
      const haul = {} as Materials;
      for (const m of MATERIALS) haul[m] = isAmount(c.haul[m]) ? (c.haul[m] as number) : 0;
      state.boat.cargo = { dest: c.dest as DestId, haul, discovery: c.discovery === true };
    } else if (c !== null && c !== undefined) dropped = true;
  } else if ('boat' in data) dropped = true;

  if (typeof data.lastActiveAt === 'number' && Number.isFinite(data.lastActiveAt)) {
    state.lastActiveAt = data.lastActiveAt;
  } else dropped = true;

  const settings = isObj(data.settings) ? data.settings : {};
  if (settings.lang === 'zh' || settings.lang === 'en') state.settings.lang = settings.lang;
  else dropped = true;
  // Added after the first release: a missing value keeps the default.
  if (typeof settings.sound === 'boolean') state.settings.sound = settings.sound;
  else if ('sound' in settings) dropped = true;

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
