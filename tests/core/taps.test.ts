import { describe, expect, test } from 'vitest';
import { netRate, tapYield } from '../../src/core/economy';
import { SKY_CYCLE_MS, nightness } from '../../src/core/daycycle';
import { newField, updateField } from '../../src/core/flotsam';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const DAY_AT = 0; // the cycle starts at dusk with the sun up
const NIGHT_AT = SKY_CYCLE_MS / 2;

describe('taps pay by what you really earn', () => {
  test('a tap in the fog sea, net 20, is worth at least 10 seconds of income', () => {
    const s = newGame(0, 'zh');
    s.sea = 'fog';
    s.levels.net = 20;
    s.starlight = 70;
    expect(tapYield(s, DAY_AT)).toBeGreaterThanOrEqual(netRate(s) * 10);
  });
  test('a tap at night is worth half as much again', () => {
    const s = newGame(0, 'zh');
    s.levels.net = 25;
    const day = tapYield(s, DAY_AT);
    expect(Math.abs(tapYield(s, NIGHT_AT) - day * (1 + T.NIGHT_TAP_BONUS))).toBeLessThanOrEqual(1);
  });
  test('never less than one', () => expect(tapYield(newGame(0, 'zh'), DAY_AT)).toBeGreaterThanOrEqual(1));
});

describe('night', () => {
  test('dusk is day, the middle of the cycle is deep night', () => {
    expect(nightness(DAY_AT)).toBe(0);
    expect(nightness(NIGHT_AT)).toBe(1);
  });
  test('continuous across the cycle wrap', () => {
    expect(Math.abs(nightness(SKY_CYCLE_MS - 1) - nightness(SKY_CYCLE_MS + 1))).toBeLessThan(0.01);
    for (let t = 0; t < SKY_CYCLE_MS; t += SKY_CYCLE_MS / 200) expect(Math.abs(nightness(t) - nightness(t + SKY_CYCLE_MS / 200))).toBeLessThan(0.06);
  });
  test('more finds drift by at night', () => {
    const count = (start: number) => {
      const f = newField(start);
      let n = 0;
      for (let t = start; t < start + 60_000; t += 100) {
        const before = f.nextId;
        updateField(f, t, () => 0.5);
        n += f.nextId - before;
        f.items = [];
      }
      return n;
    };
    expect(count(NIGHT_AT - 30_000)).toBeGreaterThan(count(DAY_AT + 30_000));
  });
});
