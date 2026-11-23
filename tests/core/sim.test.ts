import { describe, expect, test } from 'vitest';
import { applyOffline, claimDouble, tick } from '../../src/core/sim';
import { newGame } from '../../src/core/state';

const H = 3600 * 1000;

describe('applyOffline', () => {
  test('credits up to the storage cap', () => {
    const s = newGame(0, 'zh');
    const r = applyOffline(s, 3 * H);
    expect(r.seconds).toBe(10800);
    expect(r.creditedSeconds).toBe(7200);
    expect(r.gained.wood).toBeCloseTo(360);
    expect(r.gained.plastic).toBeCloseTo(216);
    expect(r.gained.rope).toBeCloseTo(108);
    expect(r.gained.metal).toBeCloseTo(36);
    expect(s.materials.wood).toBeCloseTo(360);
    expect(s.materials.metal).toBeCloseTo(36);
    expect(s.lastActiveAt).toBe(3 * H);
  });

  test('claimDouble adds the haul once more', () => {
    const s = newGame(0, 'zh');
    const r = applyOffline(s, 3 * H);
    claimDouble(s, r);
    expect(s.materials.wood).toBeCloseTo(720);
  });

  test('clock moved backwards gives nothing and resets lastActiveAt', () => {
    const s = newGame(10_000, 'zh');
    const r = applyOffline(s, 5_000);
    expect(r.seconds).toBe(0);
    expect(r.creditedSeconds).toBe(0);
    expect(r.gained.wood).toBe(0);
    expect(s.materials.wood).toBe(0);
    expect(s.lastActiveAt).toBe(5_000);
  });
});

describe('tick', () => {
  test('small gaps are credited live', () => {
    const s = newGame(0, 'zh');
    expect(tick(s, 1000)).toBeNull();
    expect(s.materials.wood).toBeCloseTo(0.05);
    expect(s.lastActiveAt).toBe(1000);
  });

  test('large gaps (tab hidden) become an offline report', () => {
    const s = newGame(0, 'zh');
    const r = tick(s, 60_000);
    expect(r).not.toBeNull();
    expect(r!.creditedSeconds).toBe(60);
  });

  test('a very long hidden gap is capped', () => {
    const s = newGame(0, 'zh');
    const r = tick(s, 24 * H);
    expect(r!.creditedSeconds).toBe(7200);
  });
});
