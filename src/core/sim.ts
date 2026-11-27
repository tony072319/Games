import { LIVE_DT_MAX_SECONDS, type Materials } from './data';
import { addMaterials, fillChest } from './economy';
export { expectedGain } from './economy';
import { accrueOtherSeas } from './seas';
import { autoSail, settleVoyage } from './boat';
import { has } from './talents';
import { chestCapacity, chestTotal } from './economy';
import { accrueIslands } from './islands';
import { recycle } from './recycle';
import { emptyMaterials, type GameState } from './state';

export interface OfflineReport {
  /** Real time away, in seconds. */
  seconds: number;
  /** Time that actually filled the chest (stops when the chest is full). */
  creditedSeconds: number;
  gained: Materials;
  /** Trips the auto boat made and unloaded while you were away. */
  autoCargo?: import('./state').Cargo[];
}

export function applyOffline(state: GameState, nowMs: number): OfflineReport {
  accrueIslands(state, nowMs);
  accrueOtherSeas(state, nowMs);
  const autoCargo = autoSail(state, nowMs);
  settleVoyage(state, nowMs);
  settleVoyage(state, nowMs, Math.random, 1);
  const seconds = Math.max(0, (nowMs - state.lastActiveAt) / 1000);
  const { creditedSeconds, gained } = fillChest(state, seconds);
  recycle(state, seconds);
  state.lastActiveAt = nowMs;
  return { seconds, creditedSeconds, gained, autoCargo };
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
  accrueIslands(state, nowMs);
  accrueOtherSeas(state, nowMs);
  // (The auto boat only sails again on its own while you are away: see applyOffline.)
  settleVoyage(state, nowMs);
  settleVoyage(state, nowMs, Math.random, 1);
  const dt = (nowMs - state.lastActiveAt) / 1000;
  if (dt >= 0 && dt <= LIVE_DT_MAX_SECONDS) {
    fillChest(state, dt);
    recycle(state, dt);
    // With the auto-chest talent, a full chest empties itself while the game is open.
    if (has(state, 'autoChest') && chestTotal(state.chest) >= chestCapacity(state) * 0.999) collectChest(state);
    state.lastActiveAt = nowMs;
    return null;
  }
  return applyOffline(state, nowMs);
}
