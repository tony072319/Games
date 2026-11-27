import { describe, expect, test } from 'vitest';
import { canBuy, buyUpgrade, priceOf } from '../../src/core/economy';
import { recycle } from '../../src/core/recycle';
import { newGame, type GameState } from '../../src/core/state';
import { MATERIALS } from '../../src/core/data';
import { loadGame, saveGame, type KV } from '../../src/core/save';
import { T } from '../../src/core/tuning';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const rich = () => {
  const s = newGame(0, 'zh');
  for (const m of MATERIALS) s.materials[m] = 1e7;
  return s;
};
/** How many next lighthouse steps a material covers. */
const cover = (s: GameState, m: 'wood' | 'plastic' | 'rope' | 'metal') => s.materials[m] / priceOf(s, 'light')[m];
/** A late lighthouse with rope short and the rest piled up (as in the playtest). */
const late = (recycleLevel: number) => {
  const s = newGame(0, 'zh');
  s.levels.light = 8;
  s.levels.recycle = recycleLevel;
  const p = priceOf(s, 'light');
  Object.assign(s.materials, { wood: p.wood * 20, plastic: p.plastic * 20, rope: p.rope * 0.1, metal: p.metal * 20 });
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
    const s = late(0);
    const before = { ...s.materials };
    recycle(s, 3600);
    expect(s.materials).toEqual(before);
  });
  test('turns what piles up into what the lighthouse is shortest of, however big the numbers', () => {
    const s = late(5);
    const rope = cover(s, 'rope');
    recycle(s, 3600);
    // An hour at level 5 makes a real dent: rope covers clearly more of the next step.
    expect(cover(s, 'rope')).toBeGreaterThan(rope + 0.5);
    for (const m of ['wood', 'plastic', 'metal'] as const) expect(cover(s, m)).toBeLessThan(20);
  });
  test('more levels convert faster', () => {
    const a = late(2);
    const b = late(8);
    recycle(a, 1800);
    recycle(b, 1800);
    expect(b.materials.rope).toBeGreaterThan(a.materials.rope);
  });
  test('never eats what you are short of, never takes a source below a few times the shortest, never negative', () => {
    const s = late(10);
    recycle(s, 30 * 24 * 3600);
    const r = cover(s, 'rope');
    for (const m of ['wood', 'plastic', 'metal'] as const) expect(cover(s, m)).toBeGreaterThanOrEqual(r * T.RECYCLE_SURPLUS * 0.98);
    for (const m of MATERIALS) expect(s.materials[m]).toBeGreaterThanOrEqual(0);
  });
  test('leaves balanced materials alone', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 6;
    s.levels.recycle = 10;
    const p = priceOf(s, 'light');
    Object.assign(s.materials, { wood: p.wood * 2, plastic: p.plastic * 2, rope: p.rope * 2, metal: p.metal * 2 });
    const before = { ...s.materials };
    recycle(s, 3600);
    expect(s.materials).toEqual(before);
  });
  test('nothing to work towards once the lighthouse is mended', () => {
    const s = late(10);
    s.levels.light = 10;
    const before = { ...s.materials };
    recycle(s, 3600);
    expect(s.materials).toEqual(before);
  });
  test('eight hours at once converts the same as eight hours a minute at a time', () => {
    const a = late(4);
    const b = structuredClone(a);
    recycle(a, 8 * 3600);
    for (let i = 0; i < 8 * 60; i++) recycle(b, 60);
    expect(Math.abs(a.materials.rope / b.materials.rope - 1)).toBeLessThan(0.02);
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

describe('the recycler over a very long absence', () => {
  test('a year away (or a clock gone back to 1970) takes a moment, not seconds', () => {
    const s = late(10);
    const t0 = performance.now();
    recycle(s, 55 * 365 * 24 * 3600);
    expect(performance.now() - t0).toBeLessThan(300);
    for (const m of MATERIALS) expect(Number.isFinite(s.materials[m]) && s.materials[m] >= 0).toBe(true);
  });
});

import { haloCost } from '../../src/core/halo';
describe('the recycler after the ending', () => {
  test('works toward the next ring of halo', () => {
    const s = newGame(0, 'zh');
    s.sea = 'aurora';
    s.reached = ['dusk', 'fog', 'aurora'];
    s.levels.light = 10;
    s.levels.recycle = 5;
    const p = haloCost(s);
    Object.assign(s.materials, { wood: p.wood * 20, plastic: p.plastic * 20, rope: p.rope * 0.1, metal: p.metal * 20 });
    const rope = s.materials.rope;
    recycle(s, 3600);
    expect(s.materials.rope).toBeGreaterThan(rope);
  });
});

describe('the recycler and the starlight for what you leave behind', () => {
  test('never makes more pieces than it takes (the pile never grows in number)', () => {
    // Plenty of everything in pieces; rope (dear per piece) is what the lighthouse lacks.
    const s = newGame(0, 'zh');
    s.levels.light = 8;
    s.levels.recycle = 10;
    Object.assign(s.materials, { wood: 1e9, plastic: 1e9, rope: 1e3, metal: 1e9 });
    const count = () => MATERIALS.reduce((a, m) => a + s.materials[m], 0);
    const before = count();
    recycle(s, 30 * 24 * 3600);
    expect(count()).toBeLessThanOrEqual(before * (1 + 1e-9));
  });
});
