import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { buyUpgrade, priceOf, upgradeCost } from '../../src/core/economy';
import { canPassLight, passLight, switchSea } from '../../src/core/seas';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const rich = (light: number): GameState => {
  const s = newGame(0, 'zh');
  s.levels.light = light;
  for (const m of MATERIALS) s.materials[m] = 1e15;
  return s;
};
const memKV = (): KV => {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('the lighthouse is mended part by part from level 5', () => {
  test('below level 5 one buy is one level', () => {
    const s = rich(4);
    expect(priceOf(s, 'light')).toEqual(upgradeCost('light', 4, s));
    expect(buyUpgrade(s, 'light')).toBe(true);
    expect(s.levels.light).toBe(5);
    expect(s.lightParts).toBe(0);
  });
  test('at level 5, four parts of a quarter each make level 6', () => {
    const s = rich(5);
    const level = upgradeCost('light', 5, s);
    const part = priceOf(s, 'light');
    for (const m of MATERIALS) expect(part[m]).toBe(Math.ceil(level[m] / T.LIGHT_PARTS));
    const seen: number[] = [];
    for (let i = 0; i < T.LIGHT_PARTS; i++) {
      expect(buyUpgrade(s, 'light')).toBe(true);
      seen.push(s.lightParts);
    }
    expect(seen).toEqual([...Array.from({ length: T.LIGHT_PARTS - 1 }, (_, i) => i + 1), 0]);
    expect(s.levels.light).toBe(6);
  });
  test('four parts cost exactly the level: the last part pays what is left', () => {
    const s = rich(7);
    const level = upgradeCost('light', 7, s);
    const before = { ...s.materials };
    for (let i = 0; i < T.LIGHT_PARTS; i++) buyUpgrade(s, 'light');
    for (const m of MATERIALS) expect(before[m] - s.materials[m], m).toBe(level[m]);
  });
  test('four parts cost at least the level and less than level + 4', () => {
    const s = rich(7);
    const level = upgradeCost('light', 7, s);
    const part = priceOf(s, 'light');
    for (const m of MATERIALS) {
      expect(part[m] * T.LIGHT_PARTS).toBeGreaterThanOrEqual(level[m]);
      expect(part[m] * T.LIGHT_PARTS).toBeLessThan(level[m] + T.LIGHT_PARTS);
    }
  });
  test('the fourth part at level 9 makes 10, and the light can be passed on', () => {
    const s = rich(9);
    s.lightParts = T.LIGHT_PARTS - 1;
    expect(buyUpgrade(s, 'light')).toBe(true);
    expect(s.levels.light).toBe(10);
    expect(canPassLight(s)).toBe(true);
  });
  test('parts belong to their sea, and a new sea starts at 0', () => {
    const s = rich(10);
    passLight(s, 0);
    expect(s.lightParts).toBe(0);
    s.levels.light = 6;
    s.lightParts = 2;
    switchSea(s, 'dusk', 1000);
    expect(s.lightParts).toBe(0);
    switchSea(s, 'fog', 2000);
    expect(s.lightParts).toBe(2);
  });
  test('parts survive a save; bad values load as 0 without dropping anything', () => {
    const kv = memKV();
    const s = rich(6);
    s.lightParts = 3;
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.lightParts).toBe(3);
    for (const bad of [T.LIGHT_PARTS, -1, 2.5]) {
      const data = JSON.parse(kv.getItem(SAVE_KEY)!);
      data.lightParts = bad;
      const r = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh');
      expect(r.state.lightParts, String(bad)).toBe(0);
    }
    const data = JSON.parse(kv.getItem(SAVE_KEY)!);
    delete data.lightParts;
    const r = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh');
    expect(r.state.lightParts).toBe(0);
    expect(r.status).toBe('loaded');
  });
});
