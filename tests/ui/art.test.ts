import { describe, expect, test } from 'vitest';
import { itemIcon, sceneSvg } from '../../src/ui/art';
import { MATERIALS } from '../../src/core/data';

describe('art', () => {
  test('scene is an svg with an animatable beam', () => {
    const s = sceneSvg();
    expect(s.startsWith('<svg')).toBe(true);
    expect(s).toContain('class="beam"');
    expect(s).toContain('viewBox="0 0 360 640"');
  });
  test('each material has its own icon', () => {
    const icons = MATERIALS.map(itemIcon);
    for (const i of icons) expect(i.startsWith('<svg')).toBe(true);
    expect(new Set(icons).size).toBe(4);
  });
});
