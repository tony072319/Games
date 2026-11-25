/** Polishing the lamp with glow: for a while the light reaches further and more finds drift by. */
import type { GameState } from './state';
import { T } from './tuning';

export const isPolished = (s: GameState, nowMs: number) => (s.polishUntil ?? 0) > nowMs;

export const canPolish = (s: GameState, nowMs: number) => s.materials.glow >= T.POLISH_GLOW && !isPolished(s, nowMs);

export function polish(s: GameState, nowMs: number): boolean {
  if (!canPolish(s, nowMs)) return false;
  s.materials.glow -= T.POLISH_GLOW;
  s.polishUntil = nowMs + T.POLISH_MS;
  return true;
}
