import { describe, expect, test } from 'vitest';
import { MATERIALS, SEA_DEF } from '../../src/core/data';
import { DECOR_IDS, DECOR_TIERS, canDecorate, decorBought, decorCost, decorate } from '../../src/core/decor';
import { chestCapacity, netRate } from '../../src/core/economy';
import { voyageHaul } from '../../src/core/boat';
import { passLight, switchSea } from '../../src/core/seas';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const rich = (): GameState => {
  const s = newGame(0, 'zh');
  for (const m of MATERIALS) s.materials[m] = 1e15;
  return s;
};

describe('decorations', () => {
  test('ten of them, three tiers each', () => {
    expect(DECOR_IDS).toHaveLength(10);
    expect(DECOR_TIERS).toBe(3);
  });
  test('the first lantern costs the base price, wood and plastic', () => {
    const s = newGame(0, 'zh');
    const c = decorCost(s, 'lantern')!;
    const k = SEA_DEF.dusk.cost;
    expect(c.wood).toBe(Math.ceil(T.DECOR_BASE * 0.6 * k));
    expect(c.plastic).toBe(Math.ceil(T.DECOR_BASE * 0.4 * k));
    expect(c.rope + c.metal + c.glow).toBe(0);
  });
  test('every purchase makes the next one dearer, whichever it is', () => {
    const s = rich();
    const before = decorCost(s, 'flags')!.wood;
    expect(decorate(s, 'lantern')).toBe(true);
    expect(decorBought(s)).toBe(1);
    expect(decorCost(s, 'flags')!.wood).toBeGreaterThan(before);
  });
  test('tier 3 is the last; tier 3 needs metal and glow', () => {
    const s = rich();
    decorate(s, 'bench');
    decorate(s, 'bench');
    const c = decorCost(s, 'bench')!;
    expect(c.metal).toBeGreaterThan(0);
    expect(c.glow).toBeGreaterThan(0);
    expect(decorate(s, 'bench')).toBe(true);
    expect(s.decor.bench).toBe(3);
    expect(decorCost(s, 'bench')).toBeNull();
    expect(decorate(s, 'bench')).toBe(false);
  });
  test('refused without materials; never negative', () => {
    const s = newGame(0, 'zh');
    expect(canDecorate(s, 'well')).toBe(false);
    expect(decorate(s, 'well')).toBe(false);
    for (const m of MATERIALS) expect(s.materials[m]).toBe(0);
  });
  test('each sea has its own; a new sea starts with none', () => {
    const s = rich();
    s.levels.light = 10;
    decorate(s, 'hut');
    passLight(s, 0);
    expect(s.decor).toEqual({});
    for (const m of MATERIALS) s.materials[m] = 1e15;
    decorate(s, 'tower');
    switchSea(s, 'dusk', 1000);
    expect(s.decor).toEqual({ hut: 1 });
    switchSea(s, 'fog', 2000);
    expect(s.decor).toEqual({ tower: 1 });
  });
  test('saved; unknown ids and bad tiers are ignored', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const s = rich();
    decorate(s, 'torches');
    decorate(s, 'torches');
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.decor).toEqual({ torches: 2 });
    const data = JSON.parse(map.get(SAVE_KEY)!);
    data.decor = { torches: 9, castle: 1, lights: 2, flags: 1.5 };
    const r = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh');
    expect(r.state.decor).toEqual({ lights: 2 });
    delete data.decor;
    expect(loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh').state.decor).toEqual({});
  });
  test('decorations change no numbers', () => {
    const s = rich();
    s.discovered.push('wreck');
    const before = [netRate(s), chestCapacity(s), voyageHaul(s, 'wreck').wood];
    for (const id of DECOR_IDS) decorate(s, id);
    expect([netRate(s), chestCapacity(s), voyageHaul(s, 'wreck').wood]).toEqual(before);
  });
});
