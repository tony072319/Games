import type { Lang } from '../core/state';
import zh from './zh.json';
import en from './en.json';

const TABLES: Record<Lang, Record<string, string>> = { zh, en };

export function detectLang(navLangs: readonly string[]): Lang {
  return navLangs[0]?.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

export function t(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const s = TABLES[lang][key];
  if (s === undefined) return key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (all, name: string) => (name in params ? String(params[name]) : all));
}

const UNITS: Record<Lang, readonly [number, string][]> = {
  zh: [[1e12, '万亿'], [1e8, '亿'], [1e4, '万']],
  en: [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']],
};
const E_FROM: Record<Lang, number> = { zh: 1e16, en: 1e15 };

/** Display a material amount: floored, compact, never raw floating point. */
export function formatNumber(n: number, lang: Lang): string {
  const v = Math.floor(Math.max(0, n));
  if (v < 1e4) return String(v);
  if (v >= E_FROM[lang]) {
    const exp = Math.floor(Math.log10(v));
    const mant = Math.floor((v / Math.pow(10, exp)) * 100) / 100;
    return `${mant}e${exp}`;
  }
  for (const [size, unit] of UNITS[lang]) {
    if (v >= size) return `${Math.floor((v / size) * 10) / 10}${unit}`;
  }
  return String(v);
}
