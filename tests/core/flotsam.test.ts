import { describe, expect, test } from 'vitest';
import { collect, newField, pickMaterial, updateField } from '../../src/core/flotsam';
import { newGame } from '../../src/core/state';

describe('pickMaterial', () => {
  test('maps random numbers onto weights', () => {
    expect(pickMaterial(0)).toBe('wood');
    expect(pickMaterial(0.55)).toBe('plastic');
    expect(pickMaterial(0.85)).toBe('rope');
    expect(pickMaterial(0.99)).toBe('metal');
  });
});

describe('updateField', () => {
  test('spawns one item per interval, never more than 6', () => {
    const f = newField(0);
    updateField(f, 1999, () => 0);
    expect(f.items.length).toBe(0);
    updateField(f, 2000, () => 0);
    expect(f.items.length).toBe(1);
    for (let t = 4000; t <= 30000; t += 2000) {
      updateField(f, t, () => 0);
      expect(f.items.length).toBeLessThanOrEqual(6);
    }
  });

  test('items drift away after their lifetime', () => {
    const f = newField(0);
    updateField(f, 3000, () => 0);
    const id = f.items[0].id;
    updateField(f, 3000 + 8001, () => 0);
    expect(f.items.find((i) => i.id === id)).toBeUndefined();
  });
});

describe('collect', () => {
  test('tapping gives material once; a second tap is ignored', () => {
    const s = newGame(0, 'en');
    const f = newField(0);
    updateField(f, 3000, () => 0);
    const id = f.items[0].id;
    expect(collect(f, s, id)).toEqual({ material: 'wood', amount: 1 });
    expect(s.materials.wood).toBe(1);
    expect(s.stats.tapped).toBe(1);
    expect(collect(f, s, id)).toBeNull();
    expect(s.materials.wood).toBe(1);
  });
});
