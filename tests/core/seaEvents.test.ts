import { describe, expect, test } from 'vitest';
import { EVENT_DEFS, EVENT_SLOT_MS, eventFor, seaEventAt, type SeaEventId } from '../../src/core/seaEvents';
import { settleVoyage, startVoyage } from '../../src/core/boat';
import { collect, newField, updateField } from '../../src/core/flotsam';
import { newGame } from '../../src/core/state';
import { MATERIALS } from '../../src/core/data';
import { loadGame, saveGame, type KV } from '../../src/core/save';
import { T } from '../../src/core/tuning';

const H = 3600e3;
const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const docked = () => {
  const s = newGame(0, 'zh');
  s.levels.light = 3;
  s.boat.built = true;
  s.discovered.push('wreck');
  for (const m of MATERIALS) s.materials[m] = 1e6;
  return s;
};
/** The first moment in [from, from + days) when event `id` is on. */
const findEvent = (id: SeaEventId, from = 0, days = 60) => {
  for (let t = from; t < from + days * 24 * H; t += 5 * 60e3) {
    const e = seaEventAt(t);
    if (e?.id === id) return { t, e };
  }
  return null;
};

describe('small events at sea', () => {
  test('a fixed schedule: the same moment always gives the same event, about one a day, each kind turning up', () => {
    const seen = new Set<SeaEventId>();
    let slots = 0;
    let withEvent = 0;
    for (let slot = 0; slot < 200; slot++) {
      slots++;
      let found = false;
      for (let t = slot * EVENT_SLOT_MS; t < (slot + 1) * EVENT_SLOT_MS; t += 5 * 60e3) {
        const e = seaEventAt(t);
        expect(seaEventAt(t)).toEqual(e);
        if (!e) continue;
        found = true;
        seen.add(e.id);
        // Wholly inside its slot, and as long as its kind lasts.
        expect(e.endAt - e.startAt).toBe(EVENT_DEFS[e.id].ms);
        expect(Math.floor(e.startAt / EVENT_SLOT_MS)).toBe(slot);
        expect(Math.floor((e.endAt - 1) / EVENT_SLOT_MS)).toBe(slot);
        expect(t).toBeGreaterThanOrEqual(e.startAt);
        expect(t).toBeLessThan(e.endAt);
      }
      if (found) withEvent++;
    }
    expect(withEvent / slots).toBeGreaterThan(0.6);
    expect([...seen].sort()).toEqual(['driftwood', 'meteors', 'storm', 'whales']);
  });
  test('none before the dock (a new player learns the basics first)', () => {
    const w = findEvent('whales')!;
    const s = newGame(0, 'zh');
    expect(eventFor(s, w.t)).toBeNull();
    s.levels.light = 3;
    expect(eventFor(s, w.t)?.id).toBe('whales');
  });
  test('whales: a boat that sails while they pass brings home more', () => {
    const w = findEvent('whales')!;
    const quiet = () => 0.99;
    const a = docked();
    const b = docked();
    const before = w.e.startAt - 10 * 60e3;
    expect(eventFor(a, before)).toBeNull();
    startVoyage(a, 'wreck', before, quiet);
    startVoyage(b, 'wreck', w.t, quiet);
    expect(b.boat.voyage?.whales).toBe(true);
    const ca = settleVoyage(a, before + 30 * 24 * H, quiet)!;
    const cb = settleVoyage(b, w.t + 30 * 24 * H, quiet)!;
    expect(cb.haul.metal).toBeCloseTo(ca.haul.metal * (1 + T.WHALE_HAUL));
  });
  test('whales on a voyage survive a save', () => {
    const w = findEvent('whales')!;
    const s = docked();
    startVoyage(s, 'wreck', w.t, () => 0.99);
    const kv = mem();
    saveGame(kv, s);
    expect(loadGame(kv, w.t, 'zh').state.boat.voyage?.whales).toBe(true);
  });
  test('a meteor shower: a find sometimes brings a glow shard too', () => {
    const m = findEvent('meteors')!;
    const s = docked();
    const f = newField(m.t);
    f.items.push({ id: 1, material: 'wood', spawnedAt: m.t, lane: 0.5 });
    const got = collect(f, s, 1, () => 0, m.t);
    expect(got?.glow).toBe(1);
    expect(s.materials.glow).toBe(1e6 + 1);
    // Not outside the shower.
    const q = docked();
    const g = newField(0);
    g.items.push({ id: 1, material: 'wood', spawnedAt: m.e.endAt + 1, lane: 0.5 });
    expect(collect(g, q, 1, () => 0, m.e.endAt + 1)?.glow).toBeUndefined();
  });
  test('a driftwood tide: three times the finds', () => {
    const d = findEvent('driftwood')!;
    const count = (t0: number) => {
      const s = docked();
      const f = newField(t0);
      let n = 0;
      for (let t = t0; t < t0 + 20 * 60e3; t += 500) {
        const before = f.nextId;
        updateField(f, t, () => 0.5, s);
        n += f.nextId - before;
        f.items = [];
      }
      return n;
    };
    // Compare with the same stretch of the day-night cycle, a day without an event.
    const quiet = d.e.startAt - 20 * 60e3 * 3;
    expect(seaEventAt(quiet)).toBeNull();
    expect(count(d.e.startAt)).toBeGreaterThan(count(quiet) * 2.5);
  });
});
