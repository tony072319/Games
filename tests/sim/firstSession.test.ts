import { describe, expect, test } from 'vitest';
import { FIRST, simulate } from '../../tools/sim/sim';

describe('a new player\'s first session', () => {
  test('sends the boat out within ten minutes of starting, without guiding any ship', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7]) {
      const r = simulate(FIRST, { seas: 1, maxDays: 1, seed });
      expect(r.firstVoyageMin, `seed ${seed}`).toBeDefined();
      expect(r.firstVoyageMin!, `seed ${seed}`).toBeLessThanOrEqual(9);
    }
  });
});
