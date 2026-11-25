import { describe, expect, test } from 'vitest';
import { DESTS, settleVoyage, voyageHaul, voyageMs } from '../../src/core/boat';
import { MATERIALS, type DestId } from '../../src/core/data';
import { netRate } from '../../src/core/economy';
import { newGame, type GameState } from '../../src/core/state';

const DS = Object.keys(DESTS) as DestId[];
const sum = (m: Record<string, number>) => Object.values(m).reduce((a, b) => a + b, 0);
const perMinute = (s: GameState, d: DestId) => (sum(voyageHaul(s, d)) - (d === 'firefly' ? voyageHaul(s, d).glow : 0)) / (voyageMs(s, d) / 60000);
const maxed = () => {
  const s = newGame(0, 'zh');
  Object.assign(s.levels, { light: 10, net: 20, speed: 10, cargo: 10 });
  s.boat.built = true;
  s.buildings.boatshed = 5;
  return s;
};

describe('the boat in proportion to the net', () => {
  test('every destination pays the same per minute away', () => {
    const s = maxed();
    const rates = DS.map((d) => perMinute(s, d));
    for (const r of rates) expect(Math.abs(r / rates[0] - 1)).toBeLessThan(0.01);
  });
  // Ruling (ledger, Task 3/9): the income-share targets win over "2.5×"; tuned, it lands near 1.6×.
  test('fully upgraded, the boat brings more than the net, but not many times more', () => {
    const s = maxed();
    const ratio = perMinute(s, 'wreck') / (netRate(s) * 60);
    expect(ratio).toBeGreaterThan(1.3);
    expect(ratio).toBeLessThan(2.8);
  });
  test('a brighter lighthouse brings the boat home sooner: light 10 is 27% shorter than light 1', () => {
    const s = maxed();
    s.levels.light = 1;
    const dim = voyageMs(s, 'wreck');
    s.levels.light = 10;
    expect(voyageMs(s, 'wreck') / dim).toBeCloseTo(0.73, 2);
  });
  test('in the fog the boat brings more the brighter the lighthouse', () => {
    const s = maxed();
    s.sea = 'fog';
    s.levels.light = 5;
    const dim = sum(voyageHaul(s, 'wreck'));
    s.levels.light = 10;
    expect(sum(voyageHaul(s, 'wreck'))).toBeGreaterThan(dim * 1.5);
  });
  test('a voyage already under way from an old save settles with sensible numbers', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 4;
    s.boat.built = true;
    s.boat.voyage = { sea: 'dusk', dest: 'gullrock', departAt: 0, returnAt: 3_600_000 };
    const c = settleVoyage(s, 3_600_000, () => 0.99);
    for (const m of MATERIALS) expect(Number.isFinite(c!.haul[m]) && c!.haul[m] >= 0).toBe(true);
  });
});
