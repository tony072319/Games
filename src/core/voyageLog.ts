/**
 * The voyage log: every trip comes home with a line about what happened at sea, and now and then a
 * little luck (a bigger haul, an early return, a glowshard). Rolled when the boat sails, so the
 * world can show a lucky boat coming home before it docks.
 */
import type { DestId } from './data';
import { T } from './tuning';

export type StoryBonus = 'haul' | 'early' | 'find';
const BONUSES: StoryBonus[] = ['haul', 'early', 'find'];

export interface Story {
  /** Which line of the island's log (1..STORY_COUNT). */
  n: number;
  bonus?: StoryBonus;
}

/** Lines per island in the log (text keys story.<dest>.<n>). */
export const STORY_COUNT = 5;

export function rollStory(_d: DestId, rng: () => number): Story {
  const lucky = rng() < T.STORY_LUCK;
  const r = Math.min(0.999999, Math.max(0, rng()));
  const n = 1 + Math.floor(r * STORY_COUNT);
  return lucky ? { n, bonus: BONUSES[Math.floor(r * BONUSES.length)] } : { n };
}

/** A story from a save; anything unreadable is left out. */
export function readStory(v: unknown): Story | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const o = v as Record<string, unknown>;
  if (typeof o.n !== 'number' || !Number.isInteger(o.n) || o.n < 1 || o.n > STORY_COUNT) return undefined;
  return BONUSES.includes(o.bonus as StoryBonus) ? { n: o.n, bonus: o.bonus as StoryBonus } : { n: o.n };
}
