import { describe, expect, test } from 'vitest';
import { chestSvg, itemIcon, sceneSvg, tierFor } from '../../src/ui/art';
import { MATERIALS } from '../../src/core/data';

describe('art', () => {
  test('scene is an svg with an animatable beam and four net looks', () => {
    const s = sceneSvg();
    expect(s.startsWith('<svg')).toBe(true);
    expect(s).toContain('class="beam"');
    expect(s).toContain('viewBox="0 0 360 640"');
    for (const t of [0, 1, 2, 3]) expect(s).toContain(`net-t${t}`);
  });
  test('each material has its own icon', () => {
    const icons = MATERIALS.map(itemIcon);
    for (const i of icons) expect(i.startsWith('<svg')).toBe(true);
    expect(new Set(icons).size).toBe(4);
  });
  test('upgrade levels map to visible tiers', () => {
    expect([1, 3, 4, 9, 10, 19, 20, 50].map(tierFor)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });
  test('chest looks different when empty, full, and upgraded', () => {
    expect(chestSvg(0, 0)).not.toBe(chestSvg(1, 0));
    expect(chestSvg(0, 0)).not.toBe(chestSvg(0, 2));
  });
});
