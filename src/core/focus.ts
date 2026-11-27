/**
 * Where the lighthouse shines (from the dock, lighthouse 3): the shipping route (shorter voyages),
 * the fishing grounds (the net catches more; the default) or the open sea (more finds and ships,
 * for players who keep the game open). Free to change at any time; one setting for every sea.
 */
import type { GameState } from './state';

export type Focus = 'route' | 'net' | 'sea';
export const FOCUSES: readonly Focus[] = ['route', 'net', 'sea'];
const FOCUS_LIGHT = 3;

export function canFocus(s: GameState): boolean {
  return s.levels.light >= FOCUS_LIGHT;
}

/** The focus in effect (none before the dock). */
export function focusOn(s: GameState): Focus | null {
  return canFocus(s) ? s.focus : null;
}

export function setFocus(s: GameState, f: Focus): boolean {
  if (!canFocus(s) || !FOCUSES.includes(f)) return false;
  s.focus = f;
  return true;
}

export function readFocus(v: unknown): Focus {
  return FOCUSES.includes(v as Focus) ? (v as Focus) : 'net';
}
