/**
 * Ships passing at night. Tap one and the lighthouse turns its beam to guide it past the rocks;
 * the ship sounds its horn and leaves a thank-you (about half a minute of income, sometimes a
 * glowshard). Kept on screen only, like drifting finds: not saved; only the count of guided ships is.
 */
import { focusOn } from './focus';
import { eventFor } from './seaEvents';
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
  /** In distress in a storm: comes quickly, stays briefly, thanks twice over. */
  storm?: boolean;
}

export interface ShipField {
  ships: Ship[];
  nextAt: number;
  nextId: number;
  /** The storm under way: when it started, ships in distress so far, and those guided home. */
  storm?: { startAt: number; endAt: number; total: number; rescued: number };
}

/** How long a guided ship stays to flash its thanks. */
export const THANKS_MS = 2500;

export function newShipField(nowMs: number): ShipField {
  return { ships: [], nextAt: nowMs + 5000, nextId: 1 };
}

const isNight = (ms: number) => nightness(ms) > 0.5;

/** How long a ship stays to be guided. */
export function shipLife(ship: Ship): number {
  return ship.storm ? T.STORM_SHIP_LIFE_MS : T.SHIP_LIFE_MS;
}

export function updateShips(f: ShipField, nowMs: number, rng: () => number, s?: GameState): void {
  f.ships = f.ships.filter((sh) => nowMs - sh.spawnedAt < shipLife(sh) && (sh.guidedAt === undefined || nowMs - sh.guidedAt < THANKS_MS));
  const storm = s ? eventFor(s, nowMs) : null;
  if (storm?.id === 'storm' && isNight(nowMs)) {
    // A storm night: ships in distress, one every few seconds, a few at a time.
    if (!f.storm || f.storm.startAt !== storm.startAt) {
      f.storm = { startAt: storm.startAt, endAt: storm.endAt, total: 0, rescued: 0 };
      // The storm does not wait for the calm schedule's next ship.
      f.nextAt = Math.min(f.nextAt, nowMs);
    }
    if (nowMs < f.nextAt || f.ships.filter((sh) => sh.storm && sh.guidedAt === undefined).length >= 3) return;
    f.ships.push({ id: f.nextId++, spawnedAt: nowMs, lane: rng(), storm: true });
    f.storm.total++;
    f.nextAt = nowMs + T.STORM_SHIP_EVERY_MS * (0.8 + 0.4 * rng());
    return;
  }
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
  if (!ship || ship.guidedAt !== undefined || nowMs - ship.spawnedAt >= shipLife(ship)) return null;
  ship.guidedAt = nowMs;
  if (ship.storm && f.storm) f.storm.rescued++;
  const gift = emptyMaterials();
  const total = netRate(s) * T.GUIDE_SECONDS * (ship.storm ? T.STORM_THANKS : 1);
  for (const m of MATERIALS) gift[m] = total * MATERIAL_WEIGHTS[m];
  if (rng() < T.GUIDE_GLOW_CHANCE) gift.glow += 1;
  addMaterials(s, gift);
  s.stats.guided = (s.stats.guided ?? 0) + 1;
  return gift;
}

/** Once a storm is over: how many ships in distress came, and how many you guided home (told once). */
export function stormSummary(f: ShipField, nowMs: number): { total: number; rescued: number } | null {
  const st = f.storm;
  if (!st || nowMs < st.endAt) return null;
  f.storm = undefined;
  return st.total > 0 ? { total: st.total, rescued: st.rescued } : null;
}
