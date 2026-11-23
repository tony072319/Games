import { MATERIALS, type MaterialId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export interface Hud {
  el: HTMLElement;
  update(state: GameState): void;
  /** Where a material's counter is, for things flying into it. */
  target(m: MaterialId): HTMLElement;
  bump(m: MaterialId): void;
}

const SOUND_ON = `<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 5.5q2 2.5 0 5M12.5 3.5q3.5 4.5 0 9" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
const SOUND_OFF = `<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10l-4-3H2z" fill="currentColor"/><path d="M11 6l4 4M15 6l-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

export function createHud(lang: Lang, onToggleLang: () => void, sound: boolean, onToggleSound: (on: boolean) => void): Hud {
  const root = el('div', 'hud');
  const mats = el('div', 'mats');
  const values = {} as Record<MaterialId, HTMLElement>;
  const items = {} as Record<MaterialId, HTMLElement>;
  /** Shown values roll toward the real ones so gains count up visibly. */
  const shown = {} as Record<MaterialId, number>;
  for (const m of MATERIALS) {
    const item = el('div', 'mat', itemIcon(m));
    item.title = t(lang, `mat.${m}`);
    item.dataset.mat = m;
    const v = el('span');
    item.append(v);
    values[m] = v;
    items[m] = item;
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
      // Glowshards only matter once the boat has found some.
      items.glow.style.display = state.materials.glow >= 1 || state.discovered.includes('firefly') ? '' : 'none';
      for (const m of MATERIALS) {
        const real = state.materials[m];
        const cur = shown[m];
        // Count up over ~half a second; spending or tiny changes show at once.
        shown[m] = cur === undefined || real < cur || real - cur < Math.max(1, real * 0.002) ? real : cur + Math.max(1, (real - cur) * 0.12);
        const text = formatNumber(shown[m], lang);
        if (values[m].textContent !== text) values[m].textContent = text;
      }
    },
    target: (m) => items[m],
    bump(m) {
      items[m].classList.remove('bump');
      void items[m].offsetWidth;
      items[m].classList.add('bump');
    },
  };
}
