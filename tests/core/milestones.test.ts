import { describe, expect, test } from 'vitest';
import { islandMult, islandTier, netMilestoneMult, nextNetMilestone } from '../../src/core/milestones';
import { autoRate, netRate } from '../../src/core/economy';
import { islandRates } from '../../src/core/islands';
import { newGame } from '../../src/core/state';

describe('net milestones', () => {
  test('×1.25 at each of 10, 20, 30, 40, 50', () => {
    expect(netMilestoneMult(9)).toBe(1);
    expect(netMilestoneMult(10)).toBeCloseTo(1.25);
    expect(netMilestoneMult(50)).toBeCloseTo(Math.pow(1.25, 5));
    expect(nextNetMilestone(1)).toBe(10);
    expect(nextNetMilestone(10)).toBe(20);
    expect(nextNetMilestone(50)).toBeNull();
  });
  test('the net catches faster past a milestone', () => {
    const s = newGame(0, 'zh');
    s.levels.net = 10;
    expect(netRate(s)).toBeCloseTo(autoRate(10) * 1.25);
  });
});

describe('island milestones', () => {
  test('all three buildings at 3, then at 5', () => {
    const s = newGame(0, 'zh');
    s.discovered.push('wreck');
    s.buildings = { dismantler: 3, rack: 3, boatshed: 2 };
    expect(islandTier(s, 'wreck')).toBe(0);
    const base = islandRates(s, 'wreck').metal;
    s.buildings.boatshed = 3;
    expect(islandTier(s, 'wreck')).toBe(1);
    expect(islandRates(s, 'wreck').metal).toBeCloseTo(base * 1.25);
    s.buildings = { dismantler: 5, rack: 5, boatshed: 5 };
    expect(islandTier(s, 'wreck')).toBe(2);
    expect(islandMult(2)).toBeCloseTo(1.875);
  });
});
