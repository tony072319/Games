/**
 * Islanders' requests: each island you have found asks for one material. Bring it and you become
 * friends (up to FRIEND_MAX): friends load more onto your boat, give a little glow, and their island
 * looks livelier. Each sea keeps its own friendships.
 */
import { MATERIAL_WEIGHTS, type DestId, type MaterialId } from './data';
import { netRate } from './economy';
import type { GameState } from './state';
import { T } from './tuning';

export const FRIEND_MAX = 3;

/** What each island needs: something it does not have itself. */
const NEEDS: Record<DestId, MaterialId> = { wreck: 'plastic', gullrock: 'wood', oldlight: 'rope', firefly: 'metal' };

export interface Commission {
  material: MaterialId;
  amount: number;
}

export const friendOf = (s: GameState, d: DestId): number => s.friend[d] ?? 0;

/** The island's current request, or null when not found yet or already best friends. */
export function commissionFor(s: GameState, d: DestId): Commission | null {
  if (!s.discovered.includes(d)) return null;
  const f = friendOf(s, d);
  if (f >= FRIEND_MAX) return null;
  const m = NEEDS[d];
  // About an hour of what the net brings of this material, more with each friendship.
  const amount = Math.ceil(netRate(s) * MATERIAL_WEIGHTS[m] * T.ASK_SECONDS * (1 + f));
  return { material: m, amount: Math.max(10, amount) };
}

export function canDeliver(s: GameState, d: DestId): boolean {
  const c = commissionFor(s, d);
  return !!c && s.materials[c.material] >= c.amount;
}

export function deliver(s: GameState, d: DestId): boolean {
  if (!canDeliver(s, d)) return false;
  const c = commissionFor(s, d)!;
  s.materials[c.material] -= c.amount;
  s.friend[d] = friendOf(s, d) + 1;
  // A thank-you: a little glow.
  s.materials.glow += T.FRIEND_GLOW * s.friend[d]!;
  return true;
}

/** Friends load more onto the boat: haul multiplier for trips to this island. */
export function friendHaul(s: GameState, d: DestId): number {
  return 1 + T.FRIEND_HAUL * friendOf(s, d);
}

/** Friendships from a save: known islands, whole numbers, at most FRIEND_MAX. */
export function readFriend(v: unknown): Partial<Record<DestId, number>> {
  const out: Partial<Record<DestId, number>> = {};
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return out;
  for (const [d, n] of Object.entries(v))
    if ((['wreck', 'gullrock', 'oldlight', 'firefly'] as string[]).includes(d) && typeof n === 'number' && Number.isInteger(n) && n > 0) out[d as DestId] = Math.min(FRIEND_MAX, n);
  return out;
}
