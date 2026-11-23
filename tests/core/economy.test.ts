import { describe, expect, test } from 'vitest';
import { autoRate, buyUpgrade, canBuy, offlineCapSeconds, tapYield, upgradeCost } from '../../src/core/economy';
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
    expect(tapYield(1)).toBe(1);
  });
  test('upgrade costs', () => {
    expect(upgradeCost('net', 1)).toEqual({ wood: 15, plastic: 0, rope: 0, metal: 0 });
    expect(upgradeCost('net', 3)).toEqual({ wood: 39, plastic: 0, rope: 5, metal: 0 });
    expect(upgradeCost('storage', 1)).toEqual({ wood: 30, plastic: 10, rope: 0, metal: 0 });
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
    s.materials = { wood: 1e12, plastic: 1e12, rope: 1e12, metal: 1e12 };
    expect(canBuy(s, 'storage')).toBe(false);
    expect(buyUpgrade(s, 'storage')).toBe(false);
    expect(s.levels.storage).toBe(11);
  });
});
