import { describe, expect, test } from 'vitest';
import { diffItems } from '../../src/world/diff';
import type { WorldItem } from '../../src/world/layout';

const a: WorldItem = { key: 'a', model: 'kk/barrel', x: 0, y: 0, z: 0, rotY: 0 };
const b: WorldItem = { key: 'b', model: 'kk/sack', x: 1, y: 0, z: 1, rotY: 0 };

describe('diffItems', () => {
  test('new items are added', () => expect(diffItems([], [a])).toEqual({ add: [a], remove: [], move: [] }));
  test('the same items change nothing', () => expect(diffItems([a, b], [a, b])).toEqual({ add: [], remove: [], move: [] }));
  test('a moved item is moved, not rebuilt', () => {
    const moved = { ...a, x: 2 };
    expect(diffItems([a], [moved])).toEqual({ add: [], remove: [], move: [moved] });
  });
  test('a turned or resized item counts as moved', () => {
    expect(diffItems([a], [{ ...a, rotY: 1 }]).move).toHaveLength(1);
    expect(diffItems([a], [{ ...a, size: 3 }]).move).toHaveLength(1);
  });
  test('missing keys are removed', () => expect(diffItems([a, b], [b])).toEqual({ add: [], remove: ['a'], move: [] }));
});
