import { describe, expect, test } from 'vitest';
import { detectLang, formatNumber, t } from '../src/i18n';
import zh from '../src/i18n/zh.json';
import en from '../src/i18n/en.json';

describe('detectLang', () => {
  test('uses the first preferred language', () => {
    expect(detectLang(['zh-CN'])).toBe('zh');
    expect(detectLang(['en-US', 'zh'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });
});

describe('t', () => {
  test('fills parameters', () => {
    expect(t('en', 'ui.level', { level: 3 })).toContain('3');
  });
  test('missing key falls back to the key', () => {
    expect(t('zh', 'nope')).toBe('nope');
  });
  test('zh and en have the same keys', () => {
    expect(Object.keys(zh).sort()).toEqual(Object.keys(en).sort());
  });
});

describe('formatNumber', () => {
  test('small numbers are floored integers', () => {
    expect(formatNumber(9999.9, 'zh')).toBe('9999');
    expect(formatNumber(0.7, 'en')).toBe('0');
  });
  test('compact forms', () => {
    expect(formatNumber(12345, 'zh')).toBe('1.2万');
    expect(formatNumber(12345, 'en')).toBe('12.3K');
    expect(formatNumber(2e8, 'zh')).toBe('2亿');
    expect(formatNumber(3.45e9, 'en')).toBe('3.4B');
  });
  test('huge numbers use e notation', () => {
    expect(formatNumber(1e21, 'en')).toMatch(/e21$/);
    expect(formatNumber(1e21, 'zh')).toMatch(/e21$/);
  });
});
