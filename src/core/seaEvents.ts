/**
 * Small events at sea, on a fixed schedule worked out from the time alone (the same for everyone,
 * and known while you are away): about one a day, each wholly inside its slot of the schedule.
 * They reward being there (sailing, tapping, guiding), not time away, so they leave the pace alone.
 */
import type { GameState } from './state';

export type SeaEventId = 'whales' | 'meteors' | 'driftwood' | 'storm';

/** How long each kind lasts, and how often it is picked (weights). */
export const EVENT_DEFS: Record<SeaEventId, { ms: number; weight: number }> = {
  whales: { ms: 3 * 3600e3, weight: 0.35 },
  driftwood: { ms: 3600e3, weight: 0.25 },
  meteors: { ms: 40 * 60e3, weight: 0.2 },
  storm: { ms: 15 * 60e3, weight: 0.2 },
};
/** 20 hours, so the events come round at a different time of day each day. */
export const EVENT_SLOT_MS = 20 * 3600e3;
const EVENT_CHANCE = 0.8;
/** No events before the dock: a new player learns the basics first. */
const EVENT_LIGHT = 3;

export interface SeaEvent {
  id: SeaEventId;
  startAt: number;
  endAt: number;
}

/** Three numbers in [0, 1) from a slot number (the same slot always gives the same ones). */
function dice(slot: number): [number, number, number] {
  let x = (slot * 2654435761 + 0x9e3779b9) >>> 0;
  const next = () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
  next();
  return [next(), next(), next()];
}

export function eventInSlot(slot: number): SeaEvent | null {
  const [chance, kind, when] = dice(slot);
  if (chance >= EVENT_CHANCE) return null;
  const ids = Object.keys(EVENT_DEFS) as SeaEventId[];
  const total = ids.reduce((a, id) => a + EVENT_DEFS[id].weight, 0);
  let acc = 0;
  let id = ids[ids.length - 1];
  for (const k of ids) {
    acc += EVENT_DEFS[k].weight / total;
    if (kind < acc) {
      id = k;
      break;
    }
  }
  const ms = EVENT_DEFS[id].ms;
  const startAt = slot * EVENT_SLOT_MS + Math.floor(when * (EVENT_SLOT_MS - ms));
  return { id, startAt, endAt: startAt + ms };
}

/** The event on at this moment, if any. */
export function seaEventAt(nowMs: number): SeaEvent | null {
  const e = eventInSlot(Math.floor(nowMs / EVENT_SLOT_MS));
  return e && nowMs >= e.startAt && nowMs < e.endAt ? e : null;
}

/** The next event to start at or after nowMs (test build: jump to it). */
export function nextSeaEvent(nowMs: number): SeaEvent | null {
  for (let slot = Math.floor(nowMs / EVENT_SLOT_MS); slot < Math.floor(nowMs / EVENT_SLOT_MS) + 50; slot++) {
    const e = eventInSlot(slot);
    if (e && e.startAt >= nowMs) return e;
  }
  return null;
}

/** The event on for this player (none before the dock). */
export function eventFor(s: GameState, nowMs: number): SeaEvent | null {
  return s.levels.light >= EVENT_LIGHT ? seaEventAt(nowMs) : null;
}

export function eventIs(s: GameState | undefined, nowMs: number, id: SeaEventId): boolean {
  return !!s && eventFor(s, nowMs)?.id === id;
}
