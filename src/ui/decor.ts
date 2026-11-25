/** The decorations sheet: one card per decoration, like the upgrade panel. */
import { MATERIALS } from '../core/data';
import { DECOR_IDS, decorCost, type DecorId } from '../core/decor';
import type { GameState, Lang } from '../core/state';
import { t } from '../i18n';
import { upgradeCard } from './card';
import { decorSpecs } from './decorSpecs';
import { el } from './dom';

export interface DecorSheet {
  el: HTMLElement;
  update(state: GameState): void;
}

export function createDecorSheet(lang: Lang, state: GameState, opts: { buy(id: DecorId): void; close(): void }): DecorSheet {
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
  const list = el('div', 'panel decor-list');
  box.append(head, list);
  overlay.append(box);
  let last = '';

  function update(s: GameState) {
    const sig = DECOR_IDS.map((id) => {
      const c = decorCost(s, id);
      return `${s.decor[id] ?? 0}:` + (c ? MATERIALS.map((m) => (s.materials[m] >= c[m] ? 1 : 0)).join('') : 'x');
    }).join('|');
    if (sig === last) return;
    last = sig;
    list.replaceChildren(...decorSpecs(lang, s, opts.buy).map((spec) => upgradeCard(lang, spec)));
  }
  update(state);
  return { el: overlay, update };
}
