/**
 * The last climb: while the lighthouse is mended from level 9 to 10, each part lights one more far
 * lighthouse on the horizon, answering yours. When it is done they all shine.
 */
import type { GameState } from './state';
import { T } from './tuning';

export function answeringLights(s: GameState): number {
  if (s.levels.light >= 10) return T.LIGHT_PARTS;
  if (s.levels.light === 9) return Math.min(T.LIGHT_PARTS, s.lightParts);
  return 0;
}
