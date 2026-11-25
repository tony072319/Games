import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { DECOR_IDS, DECOR_TIERS } from '../../src/core/decor';
import { LAND_MAX } from '../../src/core/land';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { priceOf } from '../../src/core/economy';
import { decorSignature, decorSpecs } from '../../src/ui/decorSpecs';
import { lightNote } from '../../src/ui/upgrades';
import { lightPartsProgress } from '../../src/ui/upgrades';
import zh from '../../src/i18n/zh.json';
import en from '../../src/i18n/en.json';

describe('decorations sheet', () => {
  test('one card per decoration, in order, with tier and cost', () => {
    const s = newGame(0, 'zh');
    const bought: string[] = [];
    const specs = decorSpecs('zh', s, (id) => bought.push(id));
    expect(specs.map((c) => c.data)).toEqual([['decor', 'land'], ...DECOR_IDS.map((id) => ['decor', id])]);
    expect(specs[0].title).toBe((zh as Record<string, string>)['land.title']);
    expect(specs[0].effect).toContain(`0/${LAND_MAX}`);
    expect(specs[1].level).toBe(0);
    expect(specs[1].effect).toBeUndefined(); // the title already names it
    expect(specs[1].cost).not.toBeNull();
    expect(specs[1].canBuy).toBe(false);
    specs[3].onBuy();
    specs[0].onBuy();
    expect(bought).toEqual(['bench', 'land']);
  });
  test('a decoration at the top tier shows no cost', () => {
    const s = newGame(0, 'zh');
    s.decor.lantern = DECOR_TIERS;
    for (const m of MATERIALS) s.materials[m] = 1e12;
    const lantern = decorSpecs('zh', s, () => {})[1];
    expect(lantern.cost).toBeNull();
    expect(lantern.canBuy).toBe(false);
  });
  test('every decoration name and the part names exist in both languages', () => {
    const keys = ['land.title', 'land.desc', 'land.count', 'land.full', 'land.toast', 'decor.open', 'decor.title', 'decor.desc', 'decor.done', 'card.parts', ...DECOR_IDS.flatMap((id) => [1, 2, 3].map((n) => `decor.${id}.${n}`)), ...[1, 2, 3, 4].map((n) => `part.${n}`)];
    for (const k of keys) {
      expect((zh as Record<string, string>)[k], `zh ${k}`).toBeTruthy();
      expect((en as Record<string, string>)[k], `en ${k}`).toBeTruthy();
    }
  });
});

describe('lighthouse parts on the card', () => {
  test('from level 5 the card shows parts n/4 and the next part', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 4;
    expect(lightPartsProgress(s, 'zh')).toBeUndefined();
    s.levels.light = 6;
    s.lightParts = 2;
    const p = lightPartsProgress(s, 'zh')!;
    expect(p.value).toBeCloseTo(2 / T.LIGHT_PARTS);
    expect(p.label).toContain('2/4');
    expect(p.label).toContain((zh as Record<string, string>)['part.3']);
  });
});

describe('freshness', () => {
  test('the sheet redraws as "about N minutes" counts down', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 3;
    s.levels.net = 10;
    const a = decorSignature(s);
    s.materials.wood += 50;
    s.materials.plastic += 30;
    expect(decorSignature(s)).not.toBe(a);
  });
  test('the glow hint follows the part price, not the whole level', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 7;
    const part = priceOf(s, 'light').glow;
    s.materials.glow = part;
    expect(lightNote(s, 'zh')).toBeUndefined();
    s.materials.glow = part - 1;
    expect(lightNote(s, 'zh')).toBeDefined();
  });
});
