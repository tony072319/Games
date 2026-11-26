import { describe, expect, test } from 'vitest';
import { arrivalLines } from '../../src/core/arrival';
import { newGame } from '../../src/core/state';

const cargo = (sea: 'dusk' | 'fog', iceBreak = false) => ({ sea, dest: 'wreck' as const, haul: { wood: 5, plastic: 0, rope: 0, metal: 0, glow: 0 }, discovery: false, fromIsland: { wood: 0, plastic: 0, rope: 0, metal: 0, glow: 0 }, ...(iceBreak ? { iceBreak } : {}) });

describe('arrival report with two boats', () => {
  test('each boat line carries its own sea and whether it broke ice', () => {
    const s = newGame(0, 'zh');
    s.boat.cargo = cargo('dusk');
    s.boat2.cargo = cargo('fog', true);
    const lines = arrivalLines(s, { seconds: 3600, creditedSeconds: 3600 } as never).filter((l) => l.kind === 'boat');
    expect(lines.map((l) => [l.sea, !!l.iceBreak])).toEqual([
      ['dusk', false],
      ['fog', true],
    ]);
  });
});
