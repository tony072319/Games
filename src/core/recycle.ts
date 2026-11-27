/**
 * The recycler on the home island: turns whatever piles up into what the lighthouse's next step is
 * shortest of. It works on a share of the pile each hour, so it keeps up however big the numbers get,
 * at a loss (EFFICIENCY), and only takes from a material while it covers several times more of the
 * step than the shortest one (it never eats what you are short of). Glow is never made or used.
 */
import { MAX_LEVEL } from './data';
import { priceOf } from './economy';
import type { GameState } from './state';
import { T } from './tuning';

const MATS = ['wood', 'plastic', 'rope', 'metal'] as const;

function step(s: GameState, seconds: number) {
  const p = priceOf(s, 'light');
  const cover = (m: (typeof MATS)[number]) => s.materials[m] / p[m];
  const used = MATS.filter((m) => p[m] > 0);
  if (used.length < 2) return;
  const short = used.reduce((a, b) => (cover(b) < cover(a) ? b : a));
  const share = Math.min(1, T.RECYCLE_RATE * s.levels.recycle * (seconds / 3600));
  for (const m of used) {
    if (m === short) continue;
    // Room to take while the source still covers SURPLUS times the shortest after this step (which grows by what comes out).
    const room = ((cover(m) - T.RECYCLE_SURPLUS * cover(short)) / (1 + T.RECYCLE_SURPLUS * T.RECYCLE_EFFICIENCY)) * p[m];
    const take = Math.min(room, s.materials[m] * share);
    if (!(take > 0)) continue;
    s.materials[m] -= take;
    s.materials[short] += (take / p[m]) * p[short] * T.RECYCLE_EFFICIENCY;
  }
}

export function recycle(s: GameState, seconds: number): void {
  if (!(s.levels.recycle > 0) || !(seconds > 0) || s.levels.light >= MAX_LEVEL.light) return;
  // A minute at a time, so a long absence converts like the same time spent watching.
  for (let left = seconds; left > 0; left -= 60) step(s, Math.min(60, left));
}
