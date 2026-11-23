import type { Lang } from '../core/state';
import { t } from '../i18n';
import { el } from './dom';

export function createDebug(lang: Lang, actions: { skip(hours: number): void; addAll(n: number): void }): HTMLElement {
  const root = el('div', 'debug');
  const add = (key: string, fn: () => void) => {
    const b = el('button');
    b.textContent = t(lang, key);
    b.addEventListener('click', fn);
    root.append(b);
  };
  add('debug.plus1h', () => actions.skip(1));
  add('debug.plus8h', () => actions.skip(8));
  add('debug.plusMats', () => actions.addAll(1000));
  return root;
}
