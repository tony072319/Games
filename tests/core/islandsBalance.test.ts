import { describe, expect, test } from 'vitest';
import { islandRates } from '../../src/core/islands';
import { netRate } from '../../src/core/economy';
import { newGame } from '../../src/core/state';

const withNet = (net: number, lvl = 3) => {
  const s = newGame(0, 'zh');
  s.levels.net = net;
  s.discovered = ['wreck'];
  s.buildings = { dismantler: lvl };
  return s;
};

describe('island buildings grow with the net', () => {
  test('a producer makes as much more as the net catches more', () => {
    const a = withNet(10);
    const b = withNet(30);
    expect(islandRates(b, 'wreck').metal / islandRates(a, 'wreck').metal).toBeCloseTo(netRate(b) / netRate(a), 5);
  });
  test('level 5 makes more than four times level 1', () => {
    expect(islandRates(withNet(20, 5), 'wreck').metal).toBeGreaterThan(islandRates(withNet(20, 1), 'wreck').metal * 4);
  });
});
