import { describe, expect, test } from 'vitest';
import { chestCapacity, chestTotal } from '../../src/core/economy';
import { applyOffline, claimDouble, collectChest, tick } from '../../src/core/sim';
import { newGame } from '../../src/core/state';

const H = 3600 * 1000;

describe('chest', () => {
  test('level-1 chest holds 2 hours of the level-1 net', () => {
    expect(chestCapacity(newGame(0, 'zh'))).toBeCloseTo(720);
  });
});

describe('applyOffline', () => {
  test('net fills the chest, not the inventory, up to capacity', () => {
    const s = newGame(0, 'zh');
    const r = applyOffline(s, 3 * H);
    expect(r.seconds).toBe(10800);
    expect(r.creditedSeconds).toBeCloseTo(7200);
    expect(s.chest.wood).toBeCloseTo(360);
    expect(s.chest.plastic).toBeCloseTo(216);
    expect(s.chest.rope).toBeCloseTo(108);
    expect(s.chest.metal).toBeCloseTo(36);
    expect(s.materials.wood).toBe(0);
    expect(s.lastActiveAt).toBe(3 * H);
  });

  test('a half-full chest only takes what fits', () => {
    const s = newGame(0, 'zh');
    s.chest.wood = 360;
    const r = applyOffline(s, 3 * H);
    expect(r.creditedSeconds).toBeCloseTo(3600);
    expect(chestTotal(s.chest)).toBeCloseTo(720);
  });

  test('a full chest takes nothing more', () => {
    const s = newGame(0, 'zh');
    applyOffline(s, 3 * H);
    const r = applyOffline(s, 6 * H);
    expect(r.creditedSeconds).toBe(0);
    expect(chestTotal(s.chest)).toBeCloseTo(720);
  });

  test('clock moved backwards gives nothing and resets lastActiveAt', () => {
    const s = newGame(10_000, 'zh');
    const r = applyOffline(s, 5_000);
    expect(r.seconds).toBe(0);
    expect(r.creditedSeconds).toBe(0);
    expect(chestTotal(s.chest)).toBe(0);
    expect(s.lastActiveAt).toBe(5_000);
  });
});

describe('collectChest', () => {
  test('moves everything into the inventory and empties the chest', () => {
    const s = newGame(0, 'zh');
    applyOffline(s, 3 * H);
    const got = collectChest(s);
    expect(got.wood).toBeCloseTo(360);
    expect(s.materials.wood).toBeCloseTo(360);
    expect(chestTotal(s.chest)).toBe(0);
  });

  test('claimDouble adds the collected amount once more', () => {
    const s = newGame(0, 'zh');
    applyOffline(s, 3 * H);
    claimDouble(s, collectChest(s));
    expect(s.materials.wood).toBeCloseTo(720);
  });
});

describe('tick', () => {
  test('small gaps fill the chest live', () => {
    const s = newGame(0, 'zh');
    expect(tick(s, 1000)).toBeNull();
    expect(s.chest.wood).toBeCloseTo(0.05);
    expect(s.materials.wood).toBe(0);
    expect(s.lastActiveAt).toBe(1000);
  });

  test('large gaps (tab hidden) become an offline report', () => {
    const s = newGame(0, 'zh');
    const r = tick(s, 60_000);
    expect(r!.creditedSeconds).toBeCloseTo(60);
  });

  test('a very long hidden gap stops at a full chest', () => {
    const s = newGame(0, 'zh');
    const r = tick(s, 24 * H);
    expect(r!.creditedSeconds).toBeCloseTo(7200);
  });
});
