import { LIVE_DT_MAX_SECONDS, MATERIALS, MATERIAL_WEIGHTS, type Materials } from './data';
import { addMaterials, autoRate, offlineCapSeconds } from './economy';
import { emptyMaterials, type GameState } from './state';

export interface OfflineReport {
  /** Real time away, in seconds. */
  seconds: number;
  /** Time that actually paid out (capped by storage). */
  creditedSeconds: number;
  gained: Materials;
}

/** Fractional amounts the net collects in the given time. */
export function expectedGain(netLevel: number, seconds: number): Materials {
  const total = autoRate(netLevel) * seconds;
  const g = emptyMaterials();
  for (const m of MATERIALS) g[m] = total * MATERIAL_WEIGHTS[m];
  return g;
}

export function applyOffline(state: GameState, nowMs: number): OfflineReport {
  const seconds = Math.max(0, (nowMs - state.lastActiveAt) / 1000);
  const creditedSeconds = Math.min(seconds, offlineCapSeconds(state.levels.storage));
  const gained = expectedGain(state.levels.net, creditedSeconds);
  addMaterials(state, gained);
  state.lastActiveAt = nowMs;
  return { seconds, creditedSeconds, gained };
}

export function claimDouble(state: GameState, report: OfflineReport): void {
  addMaterials(state, report.gained);
}

/**
 * Credit time since the last tick. Short gaps are paid live; a long gap
 * (tab hidden, device asleep) is treated as offline time and reported.
 */
export function tick(state: GameState, nowMs: number): OfflineReport | null {
  const dt = (nowMs - state.lastActiveAt) / 1000;
  if (dt >= 0 && dt <= LIVE_DT_MAX_SECONDS) {
    addMaterials(state, expectedGain(state.levels.net, dt));
    state.lastActiveAt = nowMs;
    return null;
  }
  return applyOffline(state, nowMs);
}
