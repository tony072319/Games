import { describe, expect, test } from 'vitest';
import { buyHalo, canBuyHalo, haloCost, haloOpen } from '../../src/core/halo';
import { netRate, seaBoost, upgradeCost } from '../../src/core/economy';
import { MATERIALS } from '../../src/core/data';
import { newGame } from '../../src/core/state';
import { loadGame, saveGame, type KV } from '../../src/core/save';
import { T } from '../../src/core/tuning';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const ended = () => {
  const s = newGame(0, 'zh');
  s.sea = 'aurora';
  s.reached = ['dusk', 'fog', 'aurora'];
  s.levels.light = 10;
  return s;
};

describe('after the ending: the halo', () => {
  test('opens only once the last sea is lit', () => {
    const s = ended();
    expect(haloOpen(s)).toBe(true);
    s.levels.light = 9;
    expect(haloOpen(s)).toBe(false);
    const f = ended();
    f.sea = 'fog';
    expect(haloOpen(f)).toBe(false);
  });
  test('costs a share of the last lighthouse step at first, more each ring, and a few glow shards', () => {
    const s = ended();
    const last = upgradeCost('light', 9, s);
    const first = haloCost(s);
    for (const m of MATERIALS) if (m !== 'glow') expect(first[m]).toBe(Math.ceil(last[m] * T.HALO_BASE));
    expect(first.glow).toBe(T.HALO_GLOW);
    s.halo = 3;
    const fourth = haloCost(s);
    for (const m of MATERIALS) if (m !== 'glow' && last[m] > 0) expect(fourth[m]).toBe(Math.ceil(last[m] * T.HALO_BASE * T.HALO_GROWTH ** 3));
    expect(fourth.glow).toBe(T.HALO_GLOW * 4);
  });
  test('each ring adds to the income of every sea', () => {
    const s = ended();
    const before = netRate(s);
    for (const m of MATERIALS) s.materials[m] = haloCost(s)[m];
    expect(canBuyHalo(s)).toBe(true);
    expect(buyHalo(s)).toBe(true);
    expect(s.halo).toBe(1);
    for (const m of MATERIALS) expect(s.materials[m]).toBe(0);
    expect(netRate(s)).toBeCloseTo(before * (1 + T.HALO_BONUS));
    // In another sea too.
    s.sea = 'dusk';
    const dusk = newGame(0, 'zh');
    expect(seaBoost(s) / seaBoost(dusk)).toBeCloseTo(1 + T.HALO_BONUS);
  });
  test('refused without the materials or before the ending; never negative', () => {
    const s = ended();
    expect(buyHalo(s)).toBe(false);
    const e = ended();
    e.levels.light = 9;
    for (const m of MATERIALS) e.materials[m] = 1e30;
    expect(buyHalo(e)).toBe(false);
  });
  test('kept in the save; bad values become 0', () => {
    const kv = mem();
    const s = ended();
    s.halo = 4;
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.halo).toBe(4);
    for (const bad of [-1, 2.5, 'x', null]) {
      const raw = JSON.parse(kv.getItem('lightkeeper.save')!);
      raw.halo = bad;
      kv.setItem('lightkeeper.save', JSON.stringify(raw));
      expect(loadGame(kv, 0, 'zh').state.halo).toBe(0);
    }
  });
});

import { nextGoal } from '../../src/core/advice';
describe('the next step after the ending', () => {
  test('points at the halo when a ring can be bought', () => {
    const s = ended();
    s.stats.tutorial = 3;
    // The boat is out (sending it comes first when it is home).
    s.boat.built = true;
    s.boat.voyage = { sea: 'aurora', dest: 'wreck', departAt: 0, returnAt: 1e12 };
    for (const m of MATERIALS) s.materials[m] = haloCost(s)[m];
    expect(nextGoal(s).key).toBe('goal.halo');
  });
});
