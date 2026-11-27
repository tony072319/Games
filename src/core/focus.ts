/**
 * Where the lighthouse shines (from the dock, lighthouse 3): the shipping route (shorter voyages),
 * the fishing grounds (the net catches more; the default) or the open sea (more finds and ships,
 * for players who keep the game open). Free to change at any time; one setting for every sea.
 */
import type { GameState } from './state';
import { T } from './tuning';

export type Focus = 'route' | 'net' | 'sea';
export const FOCUSES: readonly Focus[] = ['route', 'net', 'sea'];
const FOCUS_LIGHT = 3;

/** From the dock on; in a later sea the boats (and the keeper's know-how) are already there. */
export function canFocus(s: GameState): boolean {
  return s.levels.light >= FOCUS_LIGHT || s.boat.built;
}

/** The focus in effect (none before the dock). */
export function focusOn(s: GameState): Focus | null {
  return canFocus(s) ? s.focus : null;
}

/**
 * Change where the light shines. The route only counts while the light is on it: a voyage under way
 * has the rest of its trip stretched or shortened to match, so switching just to send a boat gains nothing.
 */
export function setFocus(s: GameState, f: Focus, nowMs: number): boolean {
  if (!canFocus(s) || !FOCUSES.includes(f)) return false;
  const factor = (x: Focus) => (x === 'route' ? 1 - T.FOCUS_ROUTE : 1);
  const k = factor(f) / factor(s.focus);
  if (k !== 1)
    for (const b of [s.boat, s.boat2]) {
      const v = b.voyage;
      if (v && v.returnAt > nowMs) v.returnAt = nowMs + (v.returnAt - nowMs) * k;
    }
  s.focus = f;
  return true;
}

export function readFocus(v: unknown): Focus {
  return FOCUSES.includes(v as Focus) ? (v as Focus) : 'net';
}
