/**
 * After the ending (the last sea's lighthouse lit), the light can keep growing: rings of halo,
 * without end. Each ring adds HALO_BONUS to the income of every sea; each costs more than the last
 * (HALO_BASE of the last lighthouse step at first, then HALO_GROWTH times the one before),
 * plus HALO_GLOW glow shards per ring.
 */
import { MATERIALS, MAX_LEVEL, type Materials } from './data';
import { upgradeCost } from './economy';
import { emptyMaterials, type GameState } from './state';
import { T } from './tuning';

export function haloOpen(s: GameState): boolean {
  return s.sea === 'aurora' && s.levels.light >= MAX_LEVEL.light;
}

export function haloCost(s: GameState): Materials {
  const last = upgradeCost('light', MAX_LEVEL.light - 1, s);
  const k = T.HALO_BASE * Math.pow(T.HALO_GROWTH, s.halo);
  const c = emptyMaterials();
  for (const m of MATERIALS) c[m] = Math.ceil(last[m] * k);
  // Glow is scarce: a few shards a ring, not a share of the lighthouse's.
  c.glow = T.HALO_GLOW * (s.halo + 1);
  return c;
}

export function canBuyHalo(s: GameState): boolean {
  if (!haloOpen(s)) return false;
  const c = haloCost(s);
  return MATERIALS.every((m) => s.materials[m] >= c[m]);
}

export function buyHalo(s: GameState): boolean {
  if (!canBuyHalo(s)) return false;
  const c = haloCost(s);
  for (const m of MATERIALS) s.materials[m] -= c[m];
  s.halo += 1;
  return true;
}

export function readHalo(v: unknown): number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10_000 ? v : 0;
}
