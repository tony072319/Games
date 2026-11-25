import { describe, expect, test } from 'vitest';
import { IDEAL, simulate } from '../../tools/sim/sim';
import { formatReport } from '../../tools/sim/report';

// The simulator must reproduce what the playtest feedback measured on the current numbers.
describe('simulator reproduces the feedback (current numbers)', () => {
  const r = simulate(IDEAL, { seas: 2, maxDays: 60 });
  test('report', () => console.log(formatReport(r)));
  test('the boat brings most of the income in the first sea', () => expect(r.seas[0].share.boat).toBeGreaterThan(0.6));
  // Fixed in Task 2: taps now pay by real income.
  test('a tap in the fog sea is worth at least 10 s of income', () => expect(r.seas[1]?.tapSeconds ?? 0).toBeGreaterThanOrEqual(10));
  test('the first pass gives a pile of starlight', () => expect(r.seas[0].starlightAfter).toBeGreaterThanOrEqual(40));
});
