/** What one tap on a drifting find is worth right now (single call site for the simulator). */
import { tapYield } from '../../src/core/economy';
import type { GameState } from '../../src/core/state';

export function tapValue(s: GameState, nowMs: number): number {
  void nowMs;
  return tapYield(s.levels.net, s);
}
