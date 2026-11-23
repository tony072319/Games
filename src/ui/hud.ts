import { MATERIALS, type MaterialId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export interface Hud {
  el: HTMLElement;
  update(state: GameState): void;
}

export function createHud(lang: Lang, onToggleLang: () => void): Hud {
  const root = el('div', 'hud');
  const mats = el('div', 'mats');
  const values = {} as Record<MaterialId, HTMLElement>;
  for (const m of MATERIALS) {
    const item = el('div', 'mat', itemIcon(m));
    item.title = t(lang, `mat.${m}`);
    item.dataset.mat = m;
    const v = el('span');
    item.append(v);
    values[m] = v;
    mats.append(item);
  }
  const toggle = el('button', 'lang');
  toggle.textContent = t(lang, 'ui.langToggle');
  toggle.setAttribute('aria-label', t(lang, 'settings.lang'));
  toggle.addEventListener('click', onToggleLang);
  root.append(mats, toggle);

  return {
    el: root,
    update(state) {
      for (const m of MATERIALS) {
        const text = formatNumber(state.materials[m], lang);
        if (values[m].textContent !== text) values[m].textContent = text;
      }
    },
  };
}
