import { LIVE_DT_MAX_SECONDS, MATERIALS, MATERIAL_WEIGHTS, type Materials } from './data';
import { addMaterials, chestCapacity, chestTotal, netRate } from './economy';
import { settleVoyage } from './boat';
import { emptyMaterials, type GameState } from './state';

export interface OfflineReport {
  /** Real time away, in seconds. */
  seconds: number;
  /** Time that actually filled the chest (stops when the chest is full). */
  creditedSeconds: number;
  gained: Materials;
}

/** Fractional amounts the net collects in the given time at a given rate (items/second). */
export function expectedGain(rate: number, seconds: number): Materials {
  const total = rate * seconds;
  const g = emptyMaterials();
  for (const m of MATERIALS) g[m] = total * MATERIAL_WEIGHTS[m];
  return g;
}

/** Let the net work for `seconds`, putting its catch into the chest until it is full. */
function fillChest(state: GameState, seconds: number): { creditedSeconds: number; gained: Materials } {
  const room = Math.max(0, chestCapacity(state) - chestTotal(state.chest));
  const rate = netRate(state);
  const creditedSeconds = Math.min(seconds, room / rate);
  const gained = expectedGain(rate, creditedSeconds);
  for (const m of MATERIALS) state.chest[m] += gained[m];
  return { creditedSeconds, gained };
}

export function applyOffline(state: GameState, nowMs: number): OfflineReport {
  settleVoyage(state, nowMs);
  const seconds = Math.max(0, (nowMs - state.lastActiveAt) / 1000);
  const { creditedSeconds, gained } = fillChest(state, seconds);
  state.lastActiveAt = nowMs;
  return { seconds, creditedSeconds, gained };
}

/** Empty the chest into the inventory. Returns what was moved. */
export function collectChest(state: GameState): Materials {
  const moved = { ...state.chest };
  addMaterials(state, moved);
  state.chest = emptyMaterials();
  return moved;
}

/** "Take double": add a collected haul once more. */
export function claimDouble(state: GameState, collected: Materials): void {
  addMaterials(state, collected);
}

/**
 * Credit time since the last tick. Short gaps are paid live; a long gap
 * (tab hidden, device asleep) is treated as offline time and reported.
 */
export function tick(state: GameState, nowMs: number): OfflineReport | null {
  settleVoyage(state, nowMs);
  const dt = (nowMs - state.lastActiveAt) / 1000;
  if (dt >= 0 && dt <= LIVE_DT_MAX_SECONDS) {
    fillChest(state, dt);
    state.lastActiveAt = nowMs;
    return null;
  }
  return applyOffline(state, nowMs);
}
