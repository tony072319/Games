import { MATERIALS, type MaterialId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export interface Hud {
  el: HTMLElement;
  update(state: GameState): void;
}

const SOUND_ON = `<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 5.5q2 2.5 0 5M12.5 3.5q3.5 4.5 0 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const SOUND_OFF = `<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

export function createHud(lang: Lang, onToggleLang: () => void, sound: boolean, onToggleSound: (on: boolean) => void): Hud {
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
  const snd = el('button', 'icon-btn sound', sound ? SOUND_ON : SOUND_OFF);
  snd.setAttribute('aria-label', t(lang, 'settings.sound'));
  snd.setAttribute('aria-pressed', String(sound));
  snd.addEventListener('click', () => {
    sound = !sound;
    snd.innerHTML = sound ? SOUND_ON : SOUND_OFF;
    snd.setAttribute('aria-pressed', String(sound));
    onToggleSound(sound);
  });
  root.append(mats, snd, toggle);

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
