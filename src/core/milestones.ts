import type { DestId } from './data';
import { ISLAND_BUILDINGS } from './islands';
import type { GameState } from './state';

/** Net levels where the net jumps ahead: ×1.25 each. */
export const NET_MILESTONES = [10, 20, 30, 40, 50];
export const NET_MILESTONE_STEP = 1.25;

export function netMilestoneMult(level: number): number {
  return Math.pow(NET_MILESTONE_STEP, NET_MILESTONES.filter((m) => level >= m).length);
}

export function nextNetMilestone(level: number): number | null {
  return NET_MILESTONES.find((m) => level < m) ?? null;
}

/** 0: not yet; 1: all three buildings at 3+; 2: all three at 5. */
export function islandTier(s: GameState, d: DestId): 0 | 1 | 2 {
  const lv = ISLAND_BUILDINGS[d].map((b) => s.buildings[b] ?? 0);
  if (lv.every((l) => l >= 5)) return 2;
  if (lv.every((l) => l >= 3)) return 1;
  return 0;
}

export function islandMult(tier: number): number {
  return tier >= 2 ? 1.25 * 1.5 : tier === 1 ? 1.25 : 1;
}
