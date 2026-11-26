import { T } from '../../src/core/tuning';
import { describe, expect, test } from 'vitest';
import { autoRate, buyUpgrade, canBuy, netRate, offlineCapSeconds, tapYield, upgradeCost } from '../../src/core/economy';
import { newGame } from '../../src/core/state';

describe('formulas', () => {
  test('autoRate grows with net level', () => {
    expect(autoRate(1)).toBeCloseTo(0.1);
    expect(autoRate(2)).toBeCloseTo(0.22);
  });
  test('offline cap is 2h at level 1 and 12h at level 11', () => {
    expect(offlineCapSeconds(1)).toBe(7200);
    expect(offlineCapSeconds(11)).toBe(43200);
  });
  test('tap yield is at least 1', () => {
    expect(tapYield(newGame(0, 'zh'), 0)).toBeGreaterThanOrEqual(1);
  });
  test('upgrade costs', () => {
    expect(upgradeCost('net', 1)).toEqual({ wood: 15, plastic: 0, rope: 0, metal: 0, glow: 0 });
    expect(upgradeCost('net', 3)).toEqual({ wood: Math.ceil(15 * T.NET_COST_GROWTH ** 2), plastic: 0, rope: 5, metal: 0, glow: 0 });
    expect(upgradeCost('storage', 1)).toEqual({ wood: 30, plastic: 10, rope: 0, metal: 0, glow: 0 });
  });
});

describe('buying', () => {
  test('buys when affordable, refuses otherwise without changes', () => {
    const s = newGame(0, 'en');
    s.materials.wood = 15;
    expect(buyUpgrade(s, 'net')).toBe(true);
    expect(s.levels.net).toBe(2);
    expect(s.materials.wood).toBe(0);
    expect(buyUpgrade(s, 'net')).toBe(false);
    expect(s.levels.net).toBe(2);
    expect(s.materials.wood).toBe(0);
  });
  test('cannot buy past max level', () => {
    const s = newGame(0, 'en');
    s.levels.storage = 11;
    s.materials = { wood: 1e12, plastic: 1e12, rope: 1e12, metal: 1e12, glow: 1e12 };
    expect(canBuy(s, 'storage')).toBe(false);
    expect(buyUpgrade(s, 'storage')).toBe(false);
    expect(s.levels.storage).toBe(11);
  });
});

describe('lighthouse light and boat upgrades', () => {
  test('light costs, with glow from level 7', () => {
    // The way to the dock is cheaper (EARLY_LIGHT_MULT).
    const first = upgradeCost('light', 1);
    expect(first.wood).toBeCloseTo(200 * T.LIGHT_COST_MULT * T.EARLY_LIGHT_MULT, -0.5);
    expect(first.plastic).toBeCloseTo(80 * T.LIGHT_COST_MULT * T.EARLY_LIGHT_MULT, -0.5);
    expect(first.rope + first.metal + first.glow).toBe(0);
    expect(upgradeCost('light', 3).wood).toBeCloseTo(200 * T.LIGHT_COST_MULT * T.LIGHT_GROWTH ** 2, -0.5);
    expect(upgradeCost('light', 7).glow).toBe(5);
    expect(upgradeCost('light', 6).glow).toBe(0);
  });
  test('the old lighthouse blueprint makes light 20% cheaper', () => {
    const s = newGame(0, 'zh');
    s.discovered.push('oldlight');
    expect(upgradeCost('light', 1, s).wood / upgradeCost('light', 1).wood).toBeCloseTo(0.8, 2);
    expect(upgradeCost('net', 1, s).wood).toBe(15);
  });
  test('boat upgrade costs', () => {
    expect(upgradeCost('speed', 1)).toEqual({ wood: 150, plastic: 0, rope: 0, metal: 30, glow: 0 });
    expect(upgradeCost('cargo', 1)).toEqual({ wood: 120, plastic: 0, rope: 40, metal: 0, glow: 0 });
  });
  test('the gull from Gull Rock makes the net 25% faster', () => {
    const s = newGame(0, 'zh');
    expect(netRate(s)).toBeCloseTo(0.1);
    s.discovered.push('gullrock');
    expect(netRate(s)).toBeCloseTo(0.125);
  });
});
