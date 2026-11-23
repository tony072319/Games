import { describe, expect, test } from 'vitest';
import { MAX_LEVEL, MATERIALS } from '../../src/core/data';
import { chestSvg, itemIcon, netSvg, sceneBackSvg, sceneFrontSvg } from '../../src/ui/art';

describe('scene', () => {
  test('back has the sky; front has the lighthouse beam and a slot for the net', () => {
    expect(sceneBackSvg()).toContain('class="moon"');
    const front = sceneFrontSvg();
    expect(front.startsWith('<svg')).toBe(true);
    expect(front).toContain('class="beam"');
    expect(front).toContain('class="net-slot"');
    expect(front).toContain('viewBox="0 0 360 640"');
  });
  test('each material has its own icon', () => {
    const icons = MATERIALS.map(itemIcon);
    expect(new Set(icons).size).toBe(4);
  });
});

describe('every upgrade level looks different', () => {
  test('net: all levels distinct', () => {
    const looks = Array.from({ length: MAX_LEVEL.net }, (_, i) => netSvg(i + 1));
    expect(new Set(looks).size).toBe(MAX_LEVEL.net);
  });
  test('chest: all levels distinct, and fullness shows', () => {
    const looks = Array.from({ length: MAX_LEVEL.storage }, (_, i) => chestSvg(0, i + 1));
    expect(new Set(looks).size).toBe(MAX_LEVEL.storage);
    expect(chestSvg(0, 1)).not.toBe(chestSvg(1, 1));
  });
});
