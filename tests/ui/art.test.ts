import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { MAX_LEVEL, MATERIALS } from '../../src/core/data';
import { BUILDING_MAX, DEST_IDS, SEA_IDS } from '../../src/core/data';
import { BUILDINGS } from '../../src/core/islands';
import { buildingSvg, islandSceneSvg, boatSvg, chestSvg, dockSvg, islandIcon, itemIcon, netSvg, sceneBackSvg, sceneFrontSvg, towerSvg } from '../../src/ui/art';

describe('scene', () => {
  test('back has the sky; front has slots for the lighthouse, dock and net', () => {
    expect(sceneBackSvg()).toContain('class="moon"');
    const front = sceneFrontSvg();
    expect(front.startsWith('<svg')).toBe(true);
    expect(front).toContain('class="net-slot"');
    expect(front).toContain('class="tower-slot"');
    expect(front).toContain('class="dock-slot"');
    expect(front).toContain('viewBox="0 0 360 640"');
  });
  test('each material has its own icon', () => {
    const icons = MATERIALS.map(itemIcon);
    expect(new Set(icons).size).toBe(MATERIALS.length);
  });
  test("material icons are the author's pictures, and each file exists", () => {
    for (const m of MATERIALS) {
      const html = itemIcon(m);
      expect(html).toMatch(new RegExp(`^<img class="item-icon" src="icons/${m}\\.png" alt="" draggable="false">$`));
      expect(existsSync(`public/icons/${m}.png`), m).toBe(true);
    }
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

describe('lighthouse, dock, boat, islands', () => {
  test('every lighthouse level looks different and has a beam', () => {
    const looks = Array.from({ length: MAX_LEVEL.light }, (_, i) => towerSvg(i + 1));
    expect(new Set(looks).size).toBe(MAX_LEVEL.light);
    for (const l of looks) expect(l).toContain('class="beam"');
  });
  test('dock, boat (empty vs laden) and island icons', () => {
    expect(dockSvg()).toContain('<');
    expect(boatSvg(true, 1)).not.toBe(boatSvg(false, 1));
    expect(new Set(DEST_IDS.map(islandIcon)).size).toBe(DEST_IDS.length);
  });
});

describe('island buildings', () => {
  test('every building looks different at every level, and islands differ', () => {
    for (const b of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[]) {
      const looks = Array.from({ length: BUILDING_MAX + 1 }, (_, i) => buildingSvg(b, i));
      expect(new Set(looks).size).toBe(BUILDING_MAX + 1);
    }
    expect(new Set(DEST_IDS.map((d) => islandSceneSvg(d))).size).toBe(DEST_IDS.length);
  });
});

describe('each sea has its own look', () => {
  test('sky, horizon and islands differ per sea', () => {
    expect(new Set(SEA_IDS.map((s) => sceneBackSvg(s))).size).toBe(3);
    expect(new Set(SEA_IDS.map((s) => sceneFrontSvg(s))).size).toBe(3);
    expect(new Set(SEA_IDS.map((s) => islandSceneSvg('wreck', s))).size).toBe(3);
  });
});

describe('life and light in the scene', () => {
  test('low fog and the cat are in the front layer; the keeper shows from lighthouse 2', () => {
    const front = sceneFrontSvg();
    expect(front).toContain('class="lowfog"');
    expect(front).toContain('class="cat"');
    expect(towerSvg(1)).not.toContain('class="keeper"');
    expect(towerSvg(2)).toContain('class="keeper"');
    expect(towerSvg(3)).toContain('class="rim"');
    expect(towerSvg(1)).toContain('beam-glow');
  });
});
