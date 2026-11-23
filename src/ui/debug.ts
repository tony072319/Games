import type { Lang } from '../core/state';
import { t } from '../i18n';
import { el } from './dom';

export interface DebugActions {
  skip(hours: number): void;
  addAll(n: number): void;
  setInfinite(on: boolean): void;
  reset(): void;
}

/** Test-build panel. Infinite materials start switched on. */
export function createDebug(lang: Lang, infinite: boolean, actions: DebugActions): HTMLElement {
  const root = el('div', 'debug');
  const badge = el('div', 'debug-badge');
  badge.textContent = t(lang, 'debug.badge');
  root.append(badge);
  const add = (text: string, fn: (b: HTMLButtonElement) => void) => {
    const b = el('button');
    b.textContent = text;
    b.addEventListener('click', () => fn(b));
    root.append(b);
    return b;
  };
  const infText = (on: boolean) => t(lang, on ? 'debug.infiniteOn' : 'debug.infiniteOff');
  const inf = add(infText(infinite), (b) => {
    infinite = !infinite;
    b.textContent = infText(infinite);
    b.classList.toggle('on', infinite);
    actions.setInfinite(infinite);
  });
  inf.classList.toggle('on', infinite);
  add(t(lang, 'debug.plusMillion'), () => actions.addAll(1_000_000));
  add(t(lang, 'debug.plus1h'), () => actions.skip(1));
  add(t(lang, 'debug.plus8h'), () => actions.skip(8));
  add(t(lang, 'debug.reset'), () => {
    if (confirm(t(lang, 'debug.resetConfirm'))) actions.reset();
  });
  return root;
}
