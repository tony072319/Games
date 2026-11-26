import { describe, expect, test } from 'vitest';
import { DEST_IDS } from '../../src/core/data';
import { STORY_COUNT } from '../../src/core/voyageLog';
import { storyText } from '../../src/ui/story';
import zh from '../../src/i18n/zh.json';
import en from '../../src/i18n/en.json';

describe('voyage log text', () => {
  test('every island has every line, and every luck has its words, in both languages', () => {
    const keys = [...DEST_IDS.flatMap((d) => Array.from({ length: STORY_COUNT }, (_, i) => `story.${d}.${i + 1}`)), 'story.bonus.haul', 'story.bonus.early', 'story.bonus.find'];
    for (const k of keys) {
      expect((zh as Record<string, string>)[k], `zh ${k}`).toBeTruthy();
      expect((en as Record<string, string>)[k], `en ${k}`).toBeTruthy();
    }
  });
  test('a lucky line says the luck too, and names the island', () => {
    const plain = storyText('zh', 'wreck', { n: 2 }, '沉船湾');
    const lucky = storyText('zh', 'wreck', { n: 2, bonus: 'early' }, '沉船湾');
    expect(lucky.startsWith(plain)).toBe(true);
    expect(lucky).toContain((zh as Record<string, string>)['story.bonus.early']);
    expect(storyText('zh', 'wreck', undefined, '沉船湾')).toBe('');
  });
});
