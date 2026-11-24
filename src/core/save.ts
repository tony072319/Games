import { BUILDING_MAX, DEST_IDS, MATERIALS, MAX_LEVEL, SEA_IDS, UPGRADES, type BuildingId, type DestId, type Materials, type SeaId } from './data';
import { BUILDINGS } from './islands';
import { emptyMaterials, newGame, type GameState, type Lang, type SeaState } from './state';

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
const isSea = (v: unknown): v is SeaId => SEA_IDS.includes(v as SeaId);
const isLevel = (v: unknown, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= max;

function readMaterials(v: unknown): Materials {
  const out = emptyMaterials();
  if (!isObj(v)) return out;
  for (const m of MATERIALS) if (isAmount(v[m])) out[m] = v[m] as number;
  return out;
}

/** A sea you're not at. Returns null if it can't be read. */
function readSea(v: unknown, nowMs: number): SeaState | null {
  if (!isObj(v) || !isObj(v.levels)) return null;
  const L = v.levels;
  if (!isLevel(L.net, MAX_LEVEL.net) || !isLevel(L.storage, MAX_LEVEL.storage) || !isLevel(L.light, MAX_LEVEL.light)) return null;
  const buildings: SeaState['buildings'] = {};
  if (isObj(v.buildings)) for (const [b, n] of Object.entries(v.buildings)) if (b in BUILDINGS && typeof n === 'number' && Number.isInteger(n) && n >= 0 && n <= BUILDING_MAX) buildings[b as BuildingId] = n;
  const islandStore: SeaState['islandStore'] = {};
  if (isObj(v.islandStore)) for (const [d, st] of Object.entries(v.islandStore)) if (DEST_IDS.includes(d as DestId)) islandStore[d as DestId] = readMaterials(st);
  return {
    levels: { net: L.net as number, storage: L.storage as number, light: L.light as number },
    chest: readMaterials(v.chest),
    discovered: Array.isArray(v.discovered) ? (v.discovered.filter((d) => DEST_IDS.includes(d as DestId)) as DestId[]) : [],
    buildings,
    islandStore,
    islandAt: typeof v.islandAt === 'number' && Number.isFinite(v.islandAt) ? v.islandAt : nowMs,
    chestAt: typeof v.chestAt === 'number' && Number.isFinite(v.chestAt) ? v.chestAt : nowMs,
  };
}
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
      state.boat.voyage = { sea: isSea(v.sea) ? v.sea : 'dusk', dest: v.dest as DestId, departAt: v.departAt as number, returnAt: v.returnAt as number };
    } else if (v !== null && v !== undefined) dropped = true;
    const c = b.cargo;
    if (isObj(c) && DEST_IDS.includes(c.dest as DestId) && isObj(c.haul)) {
      const haul = {} as Materials;
      for (const m of MATERIALS) haul[m] = isAmount(c.haul[m]) ? (c.haul[m] as number) : 0;
      const fromIsland = {} as Materials;
      const fi = isObj(c.fromIsland) ? c.fromIsland : {};
      for (const m of MATERIALS) fromIsland[m] = isAmount(fi[m]) ? (fi[m] as number) : 0;
      state.boat.cargo = { sea: isSea(c.sea) ? c.sea : 'dusk', dest: c.dest as DestId, haul, discovery: c.discovery === true, fromIsland };
    } else if (c !== null && c !== undefined) dropped = true;
  } else if ('boat' in data) dropped = true;

  if (isObj(data.buildings)) {
    for (const [b, v] of Object.entries(data.buildings)) {
      if (b in BUILDINGS && typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= BUILDING_MAX) state.buildings[b as BuildingId] = v;
      else dropped = true;
    }
  } else if ('buildings' in data) dropped = true;
  if (isObj(data.islandStore)) {
    for (const [d, st] of Object.entries(data.islandStore)) {
      if (!DEST_IDS.includes(d as DestId) || !isObj(st)) {
        dropped = true;
        continue;
      }
      const m2 = {} as Materials;
      for (const m of MATERIALS) m2[m] = isAmount(st[m]) ? (st[m] as number) : 0;
      state.islandStore[d as DestId] = m2;
    }
  } else if ('islandStore' in data) dropped = true;

  if (typeof data.lastActiveAt === 'number' && Number.isFinite(data.lastActiveAt)) {
    state.lastActiveAt = data.lastActiveAt;
  } else dropped = true;
  if (typeof data.islandAt === 'number' && Number.isFinite(data.islandAt)) state.islandAt = data.islandAt;
  else if ('islandAt' in data) dropped = true;
  else state.islandAt = state.lastActiveAt;

  // Seas (added with the second sea): missing means an old save at the first sea.
  if (isSea(data.sea)) state.sea = data.sea;
  else if ('sea' in data) dropped = true;
  if (Array.isArray(data.reached)) {
    const r = data.reached.filter(isSea);
    if (r.length !== data.reached.length) dropped = true;
    state.reached = Array.from(new Set<SeaId>(['dusk', ...r, state.sea]));
  } else state.reached = Array.from(new Set<SeaId>(['dusk', state.sea]));
  if (typeof data.starlight === 'number' && Number.isInteger(data.starlight) && data.starlight >= 0) state.starlight = data.starlight;
  else if ('starlight' in data) dropped = true;
  if (isObj(data.seas)) {
    for (const [id, v] of Object.entries(data.seas)) {
      const sea = isSea(id) && id !== state.sea ? readSea(v, nowMs) : null;
      if (sea) state.seas[id as SeaId] = sea;
      else dropped = true;
    }
  } else if ('seas' in data) dropped = true;

  const settings = isObj(data.settings) ? data.settings : {};
  if (settings.lang === 'zh' || settings.lang === 'en') state.settings.lang = settings.lang;
  else dropped = true;
  // Added after the first release: a missing value keeps the default.
  if (typeof settings.sound === 'boolean') state.settings.sound = settings.sound;
  else if ('sound' in settings) dropped = true;
  for (const k of ['calm', 'mini'] as const) {
    if (typeof settings[k] === 'boolean') state.settings[k] = settings[k] as boolean;
    else if (k in settings) dropped = true;
  }

  const stats = isObj(data.stats) ? data.stats : {};
  if (isAmount(stats.tapped)) state.stats.tapped = stats.tapped;
  else dropped = true;
  // First-time steps came later: a save that has already played skips them.
  if (typeof stats.tutorial === 'number' && Number.isInteger(stats.tutorial) && stats.tutorial >= 0) state.stats.tutorial = Math.min(3, stats.tutorial);
  else if ('tutorial' in stats) dropped = true;
  else state.stats.tutorial = state.stats.tapped > 0 ? 3 : 0;

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
