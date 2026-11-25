import { describe, expect, test } from 'vitest';
import { canBuy, buyUpgrade } from '../../src/core/economy';
import { recycle } from '../../src/core/recycle';
import { newGame } from '../../src/core/state';
import { MATERIALS } from '../../src/core/data';
import { loadGame, saveGame, type KV } from '../../src/core/save';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const rich = () => {
  const s = newGame(0, 'zh');
  for (const m of MATERIALS) s.materials[m] = 1e7;
  return s;
};

describe('the recycler', () => {
  test('cannot be built before the lighthouse reaches 4', () => {
    const s = rich();
    s.levels.light = 3;
    expect(canBuy(s, 'recycle')).toBe(false);
    s.levels.light = 4;
    expect(buyUpgrade(s, 'recycle')).toBe(true);
    expect(s.levels.recycle).toBe(1);
  });
  test('does nothing while not built', () => {
    const s = rich();
    s.materials.rope = 0;
    recycle(s, 3600);
    expect(s.materials.rope).toBe(0);
  });
  test('turns surplus bottles into rope and wood into metal', () => {
    const s = newGame(0, 'zh');
    s.levels.recycle = 3;
    Object.assign(s.materials, { plastic: 1e6, rope: 10, wood: 1e6, metal: 10 });
    recycle(s, 600);
    expect(s.materials.rope).toBeGreaterThan(10);
    expect(s.materials.metal).toBeGreaterThan(10);
    expect(s.materials.plastic).toBeLessThan(1e6);
  });
  test('leaves a material alone when it is not in surplus, and never goes negative', () => {
    const s = newGame(0, 'zh');
    s.levels.recycle = 10;
    Object.assign(s.materials, { plastic: 50, rope: 40, wood: 0, metal: 0 });
    recycle(s, 1e6);
    expect(s.materials.plastic).toBe(50);
    expect(s.materials.rope).toBe(40);
    for (const m of MATERIALS) expect(s.materials[m]).toBeGreaterThanOrEqual(0);
  });
  test('eight hours at once converts the same as eight hours second by second', () => {
    const a = newGame(0, 'zh');
    a.levels.recycle = 2;
    Object.assign(a.materials, { plastic: 1e8, rope: 0, wood: 1e8, metal: 0 });
    const b = structuredClone(a);
    recycle(a, 8 * 3600);
    for (let i = 0; i < 8 * 3600; i++) recycle(b, 1);
    expect(Math.abs(a.materials.rope / b.materials.rope - 1)).toBeLessThan(0.01);
  });
  test('a save without the recycler, or with it unbuilt, loads cleanly', () => {
    const kv = mem();
    const s = newGame(0, 'zh');
    saveGame(kv, s);
    const r = loadGame(kv, 0, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.levels.recycle).toBe(0);
  });
});
