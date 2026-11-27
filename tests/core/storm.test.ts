import { describe, expect, test } from 'vitest';
import { seaEventAt } from '../../src/core/seaEvents';
import { guideShip, newShipField, shipLife, stormSummary, updateShips } from '../../src/core/ships';
import { nightness } from '../../src/core/daycycle';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { MATERIALS } from '../../src/core/data';

const docked = () => {
  const s = newGame(0, 'zh');
  s.levels.light = 3;
  return s;
};
/** A stretch of a storm that is all night: [start, start + 60 s). */
const stormNight = () => {
  for (let t = 0; t < 400 * 24 * 3600e3; t += 30e3) {
    const e = seaEventAt(t);
    if (e?.id === 'storm' && seaEventAt(t + 70e3)?.id === 'storm' && nightness(t) > 0.6 && nightness(t + 70e3) > 0.6) return { t, e };
  }
  throw new Error('no storm night found');
};

describe('a storm night', () => {
  test('ships in distress come quickly, stay briefly, a few at a time', () => {
    const { t } = stormNight();
    const s = docked();
    const f = newShipField(t - 10e3);
    let spawned = 0;
    for (let now = t; now < t + 60e3; now += 250) {
      const before = f.nextId;
      updateShips(f, now, () => 0.5, s);
      spawned += f.nextId - before;
      expect(f.ships.length).toBeLessThanOrEqual(3);
      for (const sh of f.ships) {
        expect(sh.storm).toBe(true);
        expect(now - sh.spawnedAt).toBeLessThan(shipLife(sh));
      }
    }
    expect(spawned).toBeGreaterThanOrEqual(7);
    expect(shipLife(f.ships[0])).toBe(T.STORM_SHIP_LIFE_MS);
  });
  test('a ship guided home from the storm gives twice the thanks', () => {
    const { t } = stormNight();
    const s = docked();
    const f = newShipField(t - 10e3);
    updateShips(f, t, () => 0.5, s);
    const calm = docked();
    const g = newShipField(0);
    g.ships.push({ id: 9, spawnedAt: 0, lane: 0.5 });
    const usual = guideShip(calm, g, 9, 1000, () => 0.99)!;
    const gift = guideShip(s, f, f.ships[0].id, t + 1000, () => 0.99)!;
    for (const m of MATERIALS) expect(gift[m]).toBeCloseTo(usual[m] * T.STORM_THANKS);
  });
  test('when the storm is over: how many were guided home, told once', () => {
    const { t, e } = stormNight();
    const s = docked();
    const f = newShipField(t - 10e3);
    for (let now = t; now < t + 30e3; now += 250) {
      updateShips(f, now, () => 0.5, s);
      const open = f.ships.find((sh) => sh.guidedAt === undefined);
      if (open && open.id % 2 === 0) guideShip(s, f, open.id, now, () => 0.99);
    }
    expect(stormSummary(f, t + 30e3)).toBeNull(); // still going
    const sum = stormSummary(f, e.endAt + 1)!;
    expect(sum.total).toBeGreaterThan(0);
    expect(sum.rescued).toBeGreaterThan(0);
    expect(sum.rescued).toBeLessThanOrEqual(sum.total);
    expect(stormSummary(f, e.endAt + 2)).toBeNull();
  });
  test('no storm, no summary; by day no ships even in a storm', () => {
    const s = docked();
    const f = newShipField(0);
    expect(stormSummary(f, 1e9)).toBeNull();
    for (let t = 0; t < 400 * 24 * 3600e3; t += 60e3) {
      const e = seaEventAt(t);
      if (e?.id === 'storm' && nightness(t) === 0) {
        const g = newShipField(t - 10e3);
        updateShips(g, t, () => 0.5, s);
        expect(g.ships).toHaveLength(0);
        return;
      }
    }
  });
});
