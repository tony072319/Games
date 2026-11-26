import { describe, expect, test } from 'vitest';
import { FIRST, simulate } from '../../tools/sim/sim';

describe('a new player\'s first session', () => {
  test('sends the boat out within ten minutes of starting', () => {
    const r = simulate(FIRST, { seas: 1, maxDays: 1 });
    expect(r.firstVoyageMin, 'minutes to the first voyage').toBeDefined();
    expect(r.firstVoyageMin!).toBeLessThanOrEqual(10);
  });
});
