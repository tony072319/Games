/**
 * The town on the home island grows with everything you do in a sea: the lighthouse, island
 * buildings, decorations, expanding, friendships and boats. Only the picture changes.
 */
import { decorBought } from './decor';
import type { GameState } from './state';

/** Points at which every place in the town is built. */
export const TOWN_FULL = 75;

export function townPoints(s: GameState): number {
  const buildings = Object.values(s.buildings).reduce((a: number, n) => a + (n ?? 0), 0);
  const friends = Object.values(s.friend).reduce((a: number, n) => a + (n ?? 0), 0);
  return (
    6 + // a couple of fishing huts from the start
    2 * s.levels.light +
    buildings +
    decorBought(s) +
    s.land * 0.5 +
    2 * friends +
    Math.floor(s.levels.net / 5) +
    (s.boat.built ? 2 : 0) +
    (s.boat2.built ? 3 : 0)
  );
}

/** How many of the town's places are built now (in order), out of `slots`. */
export function townShown(s: GameState, slots: number): number {
  return Math.min(slots, Math.floor((slots * Math.min(1, townPoints(s) / TOWN_FULL)) + 0.0001));
}
