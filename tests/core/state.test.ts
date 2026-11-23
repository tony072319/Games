import { describe, expect, test } from 'vitest';
import { MATERIALS, MATERIAL_WEIGHTS } from '../../src/core/data';
import { newGame } from '../../src/core/state';

describe('newGame', () => {
  test('starts with empty materials and level-1 upgrades', () => {
    const s = newGame(1000, 'zh');
    for (const m of MATERIALS) expect(s.materials[m]).toBe(0);
    expect(s.levels).toEqual({ net: 1, storage: 1 });
    expect(s.lastActiveAt).toBe(1000);
    expect(s.settings.lang).toBe('zh');
    expect(s.version).toBe(1);
  });

  test('material weights sum to 1', () => {
    const sum = MATERIALS.reduce((a, m) => a + MATERIAL_WEIGHTS[m], 0);
    expect(sum).toBeCloseTo(1);
  });
});
