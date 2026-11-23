import { describe, expect, test } from 'vitest';
import { SKY_CYCLE_MS, skyAt } from '../../src/ui/sky';

describe('sky cycle', () => {
  test('starts at dusk with the sun up and no moon', () => {
    const s = skyAt(0);
    expect(s.sun).toBeCloseTo(1);
    expect(s.moon).toBeCloseTo(0);
  });
  test('mid-cycle is night: moon up, sun gone, stars bright', () => {
    const s = skyAt(SKY_CYCLE_MS / 2);
    expect(s.sun).toBeCloseTo(0);
    expect(s.moon).toBeGreaterThan(0.9);
    expect(s.stars).toBeGreaterThan(0.9);
  });
  test('loops back to dusk after a full cycle', () => {
    expect(skyAt(SKY_CYCLE_MS)).toEqual(skyAt(0));
  });
  test('colors are always valid hex', () => {
    for (let t = 0; t < SKY_CYCLE_MS; t += SKY_CYCLE_MS / 37) {
      const s = skyAt(t);
      for (const c of [s.skyTop, s.skyMid, s.skyLow, s.horizon, s.seaTint]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
