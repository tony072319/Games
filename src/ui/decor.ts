/** The decorations sheet: one card per decoration, like the upgrade panel. */
import type { DecorId } from '../core/decor';
import type { GameState, Lang } from '../core/state';
import { t } from '../i18n';
import { upgradeCard } from './card';
import { decorSignature, decorSpecs } from './decorSpecs';
import { el } from './dom';

export interface DecorSheet {
  el: HTMLElement;
  update(state: GameState): void;
}

export function createDecorSheet(lang: Lang, state: GameState, opts: { buy(id: DecorId | 'land'): void; close(): void }): DecorSheet {
  const overlay = el('div', 'overlay sheet-overlay');
  const box = el('div', 'seamap decor');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = t(lang, 'decor.title');
  const close = el('button', 'btn-ghost map-close');
  close.type = 'button';
  close.textContent = t(lang, 'map.close');
  close.addEventListener('click', opts.close);
  head.append(title, close);
  // Why every price goes up after a purchase (they share one ladder), and that they only change the look.
  const note = el('p', 'decor-note');
  note.textContent = t(lang, 'decor.note');
  const list = el('div', 'panel decor-list');
  box.append(head, note, list);
  overlay.append(box);
  let last = '';

  function update(s: GameState) {
    const sig = decorSignature(s);
    if (sig === last) return;
    last = sig;
    list.replaceChildren(...decorSpecs(lang, s, opts.buy).map((spec) => upgradeCard(lang, spec)));
  }
  update(state);
  return { el: overlay, update };
}
