import { describe, expect, test } from 'vitest';
import { MATERIALS, SEA_DEF } from '../../src/core/data';
import { LAND_MAX, canExpand, expand, landCost } from '../../src/core/land';
import { passLight, switchSea } from '../../src/core/seas';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const rich = (): GameState => {
  const s = newGame(0, 'zh');
  s.levels.light = 3;
  for (const m of MATERIALS) s.materials[m] = 1e15;
  return s;
};

describe('expanding the island', () => {
  test('the first tile costs the base price, half wood and half plastic', () => {
    const s = rich();
    const c = landCost(s)!;
    const total = T.LAND_BASE * SEA_DEF.dusk.cost;
    expect(c.wood).toBe(Math.ceil(total / 2));
    expect(c.plastic).toBe(Math.ceil(total / 2));
    expect(c.rope + c.metal + c.glow).toBe(0);
  });
  test('each tile is a little dearer; it stops when the island is full', () => {
    const s = rich();
    const first = landCost(s)!.wood;
    expect(expand(s)).toBe(true);
    expect(s.land).toBe(1);
    expect(landCost(s)!.wood).toBeGreaterThan(first);
    s.land = LAND_MAX;
    expect(landCost(s)).toBeNull();
    expect(expand(s)).toBe(false);
  });
  test('opens with the dock; refused without materials', () => {
    const s = rich();
    s.levels.light = 2;
    expect(canExpand(s)).toBe(false);
    const poor = newGame(0, 'zh');
    poor.levels.light = 3;
    expect(expand(poor)).toBe(false);
    for (const m of MATERIALS) expect(poor.materials[m]).toBe(0);
  });
  test('each sea has its own island; a new sea starts small', () => {
    const s = rich();
    s.levels.light = 10;
    expand(s);
    expand(s);
    passLight(s, 0);
    expect(s.land).toBe(0);
    s.levels.light = 3;
    for (const m of MATERIALS) s.materials[m] = 1e15;
    expand(s);
    switchSea(s, 'dusk', 1000);
    expect(s.land).toBe(2);
    switchSea(s, 'fog', 2000);
    expect(s.land).toBe(1);
  });
  test('saved; out-of-range values load safely', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const s = rich();
    expand(s);
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.land).toBe(1);
    for (const [bad, want] of [[999, LAND_MAX], [-3, 0], [2.5, 0], ['x', 0]] as const) {
      const data = JSON.parse(map.get(SAVE_KEY)!);
      data.land = bad;
      expect(loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh').state.land, String(bad)).toBe(want);
    }
  });
});
