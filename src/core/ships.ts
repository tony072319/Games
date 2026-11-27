/**
 * Ships passing at night. Tap one and the lighthouse turns its beam to guide it past the rocks;
 * the ship sounds its horn and leaves a thank-you (about half a minute of income, sometimes a
 * glowshard). Kept on screen only, like drifting finds: not saved; only the count of guided ships is.
 */
import { focusOn } from './focus';
import { MATERIALS, MATERIAL_WEIGHTS, type Materials } from './data';
import { nightness } from './daycycle';
import { addMaterials, netRate } from './economy';
import { emptyMaterials, type GameState } from './state';
import { T } from './tuning';

export interface Ship {
  id: number;
  spawnedAt: number;
  /** 0 = far lane, 1 = near lane. */
  lane: number;
  /** When it was guided (it sails off soon after). */
  guidedAt?: number;
}

export interface ShipField {
  ships: Ship[];
  nextAt: number;
  nextId: number;
}

/** How long a guided ship stays to flash its thanks. */
export const THANKS_MS = 2500;

export function newShipField(nowMs: number): ShipField {
  return { ships: [], nextAt: nowMs + 5000, nextId: 1 };
}

const isNight = (ms: number) => nightness(ms) > 0.5;

export function updateShips(f: ShipField, nowMs: number, rng: () => number, s?: GameState): void {
  f.ships = f.ships.filter((s) => nowMs - s.spawnedAt < T.SHIP_LIFE_MS && (s.guidedAt === undefined || nowMs - s.guidedAt < THANKS_MS));
  if (!isNight(nowMs)) {
    // No ships by day, and no backlog building up for the night.
    f.nextAt = Math.max(f.nextAt, nowMs + 5000);
    return;
  }
  if (nowMs < f.nextAt || f.ships.length >= 2) return;
  f.ships.push({ id: f.nextId++, spawnedAt: nowMs, lane: rng() });
  // One at a time: after a long absence this is the only one, the next comes later.
  f.nextAt = nowMs + (T.SHIP_EVERY_MS * (0.7 + 0.6 * rng())) / (s && focusOn(s) === 'sea' ? 1 + T.FOCUS_SEA : 1);
}

/** Guide a passing ship: its thank-you is added to your materials and returned (null if it can't be guided). */
export function guideShip(s: GameState, f: ShipField, id: number, nowMs: number, rng: () => number = Math.random): Materials | null {
  const ship = f.ships.find((x) => x.id === id);
  // Ships only come at night; one still crossing as dawn breaks can be guided until it leaves.
  if (!ship || ship.guidedAt !== undefined || nowMs - ship.spawnedAt >= T.SHIP_LIFE_MS) return null;
  ship.guidedAt = nowMs;
  const gift = emptyMaterials();
  const total = netRate(s) * T.GUIDE_SECONDS;
  for (const m of MATERIALS) gift[m] = total * MATERIAL_WEIGHTS[m];
  if (rng() < T.GUIDE_GLOW_CHANCE) gift.glow += 1;
  addMaterials(s, gift);
  s.stats.guided = (s.stats.guided ?? 0) + 1;
  return gift;
}
