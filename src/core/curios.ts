import { SEA_IDS, type DestId, type SeaId } from './data';
import type { GameState } from './state';

/**
 * The collection book: 12 curios per sea. Ids are `${sea}:${index}`.
 * 0–7 common (drift, chest or boat); 8 rare (light 5); 9 rare (boat from the old lighthouse);
 * 10 rare (light 7); 11 legend (boat from Firefly Isle, light 9).
 */
export type CurioId = string;
export type How = 'drift' | 'chest' | 'boat';

export interface Curio {
  id: CurioId;
  sea: SeaId;
  index: number;
  rarity: 'common' | 'rare' | 'legend';
  /** 'boat' = only found by sailing to `dest`. */
  source: 'any' | 'boat';
  needLight?: number;
  dest?: DestId;
}

function page(sea: SeaId): Curio[] {
  const c = (index: number, extra: Partial<Curio> = {}): Curio => ({
    id: `${sea}:${index}`,
    sea,
    index,
    rarity: 'common',
    source: 'any',
    ...extra,
  });
  return [
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => c(i)),
    c(8, { rarity: 'rare', needLight: 5 }),
    c(9, { rarity: 'rare', source: 'boat', dest: 'oldlight' }),
    c(10, { rarity: 'rare', needLight: 7 }),
    c(11, { rarity: 'legend', source: 'boat', dest: 'firefly', needLight: 9 }),
  ];
}

export const CURIOS: Curio[] = SEA_IDS.flatMap(page);
export const CURIO_BY_ID: Record<CurioId, Curio> = Object.fromEntries(CURIOS.map((c) => [c.id, c]));

/** Base chance per drifting item, per chest of half or more, per voyage. */
export const CURIO_CHANCE: Record<How, number> = { drift: 0.006, chest: 0.15, boat: 0.25 };

/** Talents can raise chances and lower light requirements (filled in by talents.ts). */
export const curioTuning = { chanceMult: (_s: GameState) => 1, lightRelief: (_s: GameState) => 0 };

export function curioChance(s: GameState, how: How): number {
  return CURIO_CHANCE[how] * curioTuning.chanceMult(s);
}

/** Curios of the current sea that can turn up this way and aren't in the book yet. */
export function eligibleCurios(s: GameState, how: How, dest?: DestId): Curio[] {
  const relief = curioTuning.lightRelief(s);
  return CURIOS.filter(
    (c) =>
      c.sea === s.sea &&
      !s.curios.includes(c.id) &&
      (c.needLight === undefined || s.levels.light >= c.needLight - relief) &&
      (c.source === 'any' || (how === 'boat' && c.dest === dest)),
  );
}

export function pickCurio(s: GameState, how: How, rng: () => number, dest?: DestId): CurioId | null {
  const list = eligibleCurios(s, how, dest);
  if (list.length === 0) return null;
  return list[Math.min(list.length - 1, Math.floor(rng() * list.length))].id;
}

export function foundCurio(s: GameState, id: CurioId): void {
  if (CURIO_BY_ID[id] && !s.curios.includes(id)) s.curios.push(id);
}

export function pageComplete(s: GameState, sea: SeaId): boolean {
  return CURIOS.filter((c) => c.sea === sea).every((c) => s.curios.includes(c.id));
}

/** +1% everything per curio found, and +10% at a sea whose page is complete. */
export function curioBonus(s: GameState): number {
  return (1 + 0.01 * s.curios.length) * (pageComplete(s, s.sea) ? 1.1 : 1);
}

/** Emptying a chest that was at least half full can turn up a curio. Returns it, already in the book. */
export function chestFind(s: GameState, fillBefore: number, rng: () => number): CurioId | null {
  if (fillBefore < 0.5 || rng() >= curioChance(s, 'chest')) return null;
  const id = pickCurio(s, 'chest', rng);
  if (id) foundCurio(s, id);
  return id;
}
