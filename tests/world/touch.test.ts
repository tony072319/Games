import { describe, expect, test } from 'vitest';
import { DECOR_IDS } from '../../src/core/decor';
import { newGame } from '../../src/core/state';
import { worldLayout } from '../../src/world/layout';

const NOW = 1_000_000;

describe('things on the island can be touched', () => {
  test("the keeper's house is one thing to tap; the town has one anchor place", () => {
    const items = worldLayout(newGame(NOW, 'zh'), NOW);
    expect(items.filter((i) => i.tag === 'house')).toHaveLength(1);
    expect(items.filter((i) => i.tag === 'town')).toHaveLength(1);
  });
  test('the ground, other town places and decorations open building too', () => {
    const s = newGame(NOW, 'zh');
    s.levels.light = 8;
    for (const id of DECOR_IDS) s.decor[id] = 1;
    const items = worldLayout(s, NOW);
    expect(items.find((i) => i.ground?.kind === 'home')?.tag).toBe('ground');
    const town = items.filter((i) => i.key.startsWith('town:'));
    expect(town.length).toBeGreaterThan(2);
    for (const i of town) expect(['town', 'ground']).toContain(i.tag);
    for (const i of items.filter((x) => x.key.startsWith('decor:'))) expect(i.tag).toBe('ground');
  });
});
