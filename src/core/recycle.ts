/**
 * The recycler on the home island: turns surplus bottles into rope and surplus wood into metal,
 * only while there is far more of the one than the other (it never eats what you are short of).
 */
import type { GameState } from './state';
import { T } from './tuning';

function convert(s: GameState, from: 'plastic' | 'wood', to: 'rope' | 'metal', ratio: number, seconds: number) {
  const have = s.materials[from];
  const keepFor = T.RECYCLE_SURPLUS * s.materials[to];
  // Largest amount that still leaves the source at least SURPLUS times the product.
  const room = Math.max(0, (have - keepFor) / (1 + T.RECYCLE_SURPLUS / ratio));
  const x = Math.min(T.RECYCLE_RATE * s.levels.recycle * seconds, room);
  if (!(x > 0)) return;
  s.materials[from] -= x;
  s.materials[to] += x / ratio;
}

export function recycle(s: GameState, seconds: number): void {
  if (!(s.levels.recycle > 0) || !(seconds > 0)) return;
  convert(s, 'plastic', 'rope', T.PLASTIC_PER_ROPE, seconds);
  convert(s, 'wood', 'metal', T.WOOD_PER_METAL, seconds);
}
