import { describe, expect, test } from 'vitest';
import { CHEST_TIERS, NET_TIERS, chestSvg, chestTier, itemIcon, netTier, sceneSvg } from '../../src/ui/art';
import { MATERIALS } from '../../src/core/data';

describe('art', () => {
  test('scene is an svg with an animatable beam and four net looks', () => {
    const s = sceneSvg();
    expect(s.startsWith('<svg')).toBe(true);
    expect(s).toContain('class="beam"');
    expect(s).toContain('viewBox="0 0 360 640"');
    for (let t = 0; t < NET_TIERS; t++) expect(s).toContain(`net-t${t}`);
  });
  test('each material has its own icon', () => {
    const icons = MATERIALS.map(itemIcon);
    for (const i of icons) expect(i.startsWith('<svg')).toBe(true);
    expect(new Set(icons).size).toBe(4);
  });
  test('net changes look at levels 3, 6, 10, 18, 30', () => {
    expect(NET_TIERS).toBe(6);
    expect([1, 2, 3, 5, 6, 9, 10, 17, 18, 29, 30, 50].map(netTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
  test('chest changes look at levels 2, 4, 6, 8, 10', () => {
    expect(CHEST_TIERS).toBe(6);
    expect([1, 2, 3, 4, 6, 8, 10, 11].map(chestTier)).toEqual([0, 1, 1, 2, 3, 4, 5, 5]);
  });
  test('every chest tier has its own look, and fill shows', () => {
    const looks = Array.from({ length: CHEST_TIERS }, (_, t) => chestSvg(0, t));
    expect(new Set(looks).size).toBe(CHEST_TIERS);
    expect(chestSvg(0, 0)).not.toBe(chestSvg(1, 0));
  });
});
