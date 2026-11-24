import { MATERIALS, type MaterialId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el, openMenu } from './dom';

export interface Hud {
  el: HTMLElement;
  update(state: GameState): void;
  /** Where a material's counter is, for things flying into it. */
  target(m: MaterialId): HTMLElement;
  bump(m: MaterialId): void;
}

const GEAR = `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 6.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7z M8.6 1.5h2.8l.5 2.3 1.6.7 2-1.3 2 2-1.3 2 .7 1.6 2.3.5v2.8l-2.3.5-.7 1.6 1.3 2-2 2-2-1.3-1.6.7-.5 2.3H8.6l-.5-2.3-1.6-.7-2 1.3-2-2 1.3-2-.7-1.6-2.3-.5V8.6l2.3-.5.7-1.6-1.3-2 2-2 2 1.3 1.6-.7z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

export interface MenuItem {
  label: string;
  value?: string;
  pick(): void;
}

/**
 * The bar over the sky: materials (and starlight) in one row, and a settings
 * button whose menu lists `menu()` (sound, language, animation, corner mode).
 * `host` is where the menu opens.
 */
export function createHud(lang: Lang, host: HTMLElement, menu: () => MenuItem[], onStar: () => void): Hud {
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
  // Starlight count; tapping it opens the starlight tree.
  const star = el('button', 'starlight');
  star.type = 'button';
  star.setAttribute('aria-label', t(lang, 'hud.starOpen'));
  star.addEventListener('click', onStar);
  star.style.display = 'none';
  const gear = el('button', 'btn-quiet settings-btn', GEAR);
  gear.type = 'button';
  gear.setAttribute('aria-label', t(lang, 'settings.title'));
  gear.setAttribute('aria-haspopup', 'menu');
  gear.addEventListener('click', () => openMenu(host, gear, menu()));
  // Starlight leads the materials row, so it is never the one pushed off a narrow screen.
  mats.prepend(star);
  root.append(mats, gear);

  return {
    el: root,
    update(state) {
      if (state.starlight > 0) {
        const text = `✦ ${formatNumber(state.starlight, lang)}`;
        if (star.textContent !== text) {
          star.textContent = text;
          star.title = t(lang, 'hud.starlight', { n: state.starlight, p: Math.round(state.starlight * 3) });
          star.setAttribute('aria-label', t(lang, 'hud.starCount', { n: formatNumber(state.starlight, lang) }));
        }
        star.style.display = '';
      }
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
