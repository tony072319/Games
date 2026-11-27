import { eventIs } from './seaEvents';
import { focusOn } from './focus';
import {
  FLOAT_LIFETIME_MS,
  MATERIALS,
  MATERIAL_WEIGHTS,
  MAX_FLOATING,
  SPAWN_INTERVAL_MS,
  type MaterialId,
} from './data';
import { tapYield } from './economy';
import { T } from './tuning';
import { nightness } from './daycycle';
import { isPolished } from './polish';
import type { GameState } from './state';
import { curioChance, foundCurio, pickCurio } from './curios';

export interface FloatingItem {
  id: number;
  material: MaterialId;
  spawnedAt: number;
  /** 0..1, which band of the sea it drifts along. */
  lane: number;
  /** A glowing curio for the book instead of a material. */
  curio?: boolean;
}

export interface FlotsamField {
  items: FloatingItem[];
  nextId: number;
  lastSpawnAt: number;
}

export function newField(nowMs: number): FlotsamField {
  return { items: [], nextId: 1, lastSpawnAt: nowMs };
}

export function pickMaterial(r: number): MaterialId {
  let acc = 0;
  for (const m of MATERIALS) {
    acc += MATERIAL_WEIGHTS[m];
    if (r < acc) return m;
  }
  return MATERIALS[MATERIALS.length - 1];
}

/** With a state, a drifting item is now and then a curio (and only if the sea still has one to give). */
export function updateField(field: FlotsamField, nowMs: number, rng: () => number, state?: GameState): void {
  field.items = field.items.filter((i) => nowMs - i.spawnedAt <= FLOAT_LIFETIME_MS);
  // Finds drift by more often at night.
  const polished = state && isPolished(state, nowMs) ? T.POLISH_SPAWN_BONUS : 0;
  const open = state && focusOn(state) === 'sea' ? T.FOCUS_SEA : 0;
  const tide = eventIs(state, nowMs, 'driftwood') ? T.DRIFT_TIDE : 0;
  const interval = SPAWN_INTERVAL_MS / (1 + T.NIGHT_SPAWN_BONUS * nightness(nowMs)) / (1 + polished) / (1 + open) / (1 + tide);
  if (nowMs - field.lastSpawnAt >= interval && field.items.length < MAX_FLOATING) {
    const item: FloatingItem = { id: field.nextId++, material: pickMaterial(rng()), spawnedAt: nowMs, lane: rng() };
    // Under the aurora at night, some of what drifts by is glow.
    if (state?.sea === 'aurora' && rng() < T.AURORA_GLOW_CHANCE * nightness(nowMs)) item.material = 'glow';
    if (state && rng() < curioChance(state, 'drift') && pickCurio(state, 'drift', () => 0) !== null) item.curio = true;
    field.items.push(item);
    field.lastSpawnAt = nowMs;
  }
}

export function collect(
  field: FlotsamField,
  state: GameState,
  id: number,
  rng: () => number = Math.random,
  nowMs: number = state.lastActiveAt,
): { material: MaterialId; amount: number; curio?: string | null; glow?: number } | null {
  const idx = field.items.findIndex((i) => i.id === id);
  if (idx < 0) return null;
  const [item] = field.items.splice(idx, 1);
  if (item.curio) {
    const found = pickCurio(state, 'drift', rng);
    if (found) {
      foundCurio(state, found);
      state.stats.tapped += 1;
      return { material: item.material, amount: 0, curio: found };
    }
  }
  const amount = item.material === 'glow' ? T.AURORA_GLOW_AMOUNT : tapYield(state, nowMs);
  state.materials[item.material] += amount;
  state.stats.tapped += 1;
  // In a meteor shower a find sometimes carries a glow shard too.
  if (eventIs(state, nowMs, 'meteors') && rng() < T.METEOR_GLOW) {
    state.materials.glow += 1;
    return { material: item.material, amount, glow: 1 };
  }
  return { material: item.material, amount };
}
