/**
 * The recycler on the home island: turns whatever piles up into what the lighthouse's next step is
 * shortest of. It works on a share of the pile each hour, so it keeps up however big the numbers get,
 * at a loss (EFFICIENCY), and only takes from a material while it covers several times more of the
 * step than the shortest one (it never eats what you are short of). Glow is never made or used.
 */
import { MAX_LEVEL } from './data';
import { priceOf } from './economy';
import { haloCost, haloOpen } from './halo';
import type { GameState } from './state';
import { T } from './tuning';

const MATS = ['wood', 'plastic', 'rope', 'metal'] as const;
const MAX_STEPS = 2000;

/** One step; false once nothing is worth moving (the piles are in balance). */
function step(s: GameState, seconds: number): boolean {
  // What it works toward: the lighthouse's next step, or after the ending the next ring of halo.
  const p = haloOpen(s) ? haloCost(s) : priceOf(s, 'light');
  const cover = (m: (typeof MATS)[number]) => s.materials[m] / p[m];
  const used = MATS.filter((m) => p[m] > 0);
  if (used.length < 2) return false;
  const short = used.reduce((a, b) => (cover(b) < cover(a) ? b : a));
  const share = Math.min(1, T.RECYCLE_RATE * s.levels.recycle * (seconds / 3600));
  let moved = false;
  for (const m of used) {
    if (m === short) continue;
    // Room to take while the source still covers SURPLUS times the shortest after this step (which grows by what comes out).
    // Share of a step that comes out per share put in: EFFICIENCY, but never more pieces than went in.
    const eff = Math.min(T.RECYCLE_EFFICIENCY, p[m] / p[short]);
    const room = ((cover(m) - T.RECYCLE_SURPLUS * cover(short)) / (1 + T.RECYCLE_SURPLUS * eff)) * p[m];
    const take = Math.min(room, s.materials[m] * share);
    if (!(take > s.materials[m] * 1e-9)) continue;
    moved = true;
    s.materials[m] -= take;
    // Never more pieces out than in (what you leave behind turns into starlight by its count).
    s.materials[short] += (take / p[m]) * p[short] * eff;
  }
  return moved;
}

export function recycle(s: GameState, seconds: number): void {
  if (!(s.levels.recycle > 0) || !(seconds > 0) || (s.levels.light >= MAX_LEVEL.light && !haloOpen(s))) return;
  // A minute at a time, so a long absence converts like the same time spent watching; at most
  // MAX_STEPS steps (a very long absence takes longer steps), and none once nothing moves any more.
  const dt = Math.max(60, seconds / MAX_STEPS);
  for (let left = seconds; left > 0; left -= dt) if (!step(s, Math.min(dt, left))) break;
}
