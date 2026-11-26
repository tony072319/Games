import { describe, expect, test } from 'vitest';
import { guideHint, TUTORIAL_STEPS } from '../../src/core/advice';
import { newGame } from '../../src/core/state';

const ready = () => {
  const s = newGame(0, 'zh');
  s.stats.tutorial = TUTORIAL_STEPS;
  s.boat.built = true;
  return s;
};
const ship = (id: number, guidedAt?: number) => ({ id, spawnedAt: 0, lane: 0.5, guidedAt });

describe('the "guide the ship" hint', () => {
  test('waits until the first boat is built (the first voyage comes first)', () => {
    const s = ready();
    s.boat.built = false;
    expect(guideHint(s, [ship(1)], undefined)).toBeUndefined();
  });
  test('shows for the first ship seen', () => {
    expect(guideHint(ready(), [ship(3), ship(4)], undefined)).toBe(3);
  });
  test('only for that ship: once it has gone, later ships do not bring the hint back', () => {
    expect(guideHint(ready(), [ship(1)], 1)).toBe(1);
    expect(guideHint(ready(), [ship(2)], 1)).toBeUndefined();
  });
  test('never once a ship has been guided, nor before the first steps are done', () => {
    const s = ready();
    s.stats.guided = 1;
    expect(guideHint(s, [ship(1)], undefined)).toBeUndefined();
    const t = ready();
    t.stats.tutorial = 0;
    expect(guideHint(t, [ship(1)], undefined)).toBeUndefined();
  });
  test('not for a ship already guided', () => {
    expect(guideHint(ready(), [ship(1, 5)], 1)).toBeUndefined();
  });
});
