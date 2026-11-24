/** Who made the art: every model pack in public/models, with its author and licence. */
import { t } from '../i18n';
import type { Lang } from '../core/state';
import { dismiss, el } from './dom';

export interface Credit {
  /** Folder under public/models. */
  folder: string;
  pack: string;
  author: string;
  /** CC0 = public domain; free = free for commercial use, no attribution required. */
  licence: 'CC0' | 'free';
  where: string;
}

export const CREDITS: Credit[] = [
  { folder: 'lh', pack: 'Low Poly Lighthouse & Coast Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'harbor', pack: 'Low Poly Harbor Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'viking', pack: 'Low Poly Viking Village Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'nature', pack: 'Low Poly Nature Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'huts', pack: 'Low Poly Island Huts Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'tiki', pack: 'Low Poly Tiki Beach Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'under', pack: 'Low Poly Underwater Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'volcano', pack: 'Low Poly Volcano Island Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'winter', pack: 'Low Poly Winter Pack', author: 'reodesuxz', licence: 'free', where: 'reodesuxz.itch.io' },
  { folder: 'kk', pack: 'KayKit Medieval Hexagon Pack', author: 'Kay Lousberg', licence: 'CC0', where: 'kaylousberg.itch.io' },
  { folder: 'kp', pack: 'Pirate Kit', author: 'Kenney', licence: 'CC0', where: 'kenney.nl' },
  { folder: 'kc', pack: 'Mini Characters', author: 'Kenney', licence: 'CC0', where: 'kenney.nl' },
  { folder: 'kpet', pack: 'Cube Pets', author: 'Kenney', licence: 'CC0', where: 'kenney.nl' },
  { folder: 'qf', pack: 'LowPoly Animated Fish', author: 'Quaternius', licence: 'CC0', where: 'quaternius.com' },
];

/** The credits dialog, opened from the settings menu. */
export function openCredits(host: HTMLElement, lang: Lang): void {
  const overlay = el('div', 'overlay');
  const box = el('div', 'popup credits');
  box.setAttribute('role', 'dialog');
  const h = el('h2');
  h.textContent = t(lang, 'credits.title');
  const intro = el('p');
  intro.textContent = t(lang, 'credits.intro');
  const list = el('ul', 'credits-list');
  for (const c of CREDITS) {
    const li = el('li');
    const name = el('strong');
    name.textContent = c.pack;
    const by = el('span');
    by.textContent = t(lang, 'credits.by', { author: c.author, licence: t(lang, `credits.${c.licence}`), where: c.where });
    li.append(name, by);
    list.append(li);
  }
  const actions = el('div', 'actions');
  const ok = el('button', 'btn-primary');
  ok.type = 'button';
  ok.textContent = t(lang, 'credits.close');
  ok.addEventListener('click', () => dismiss(overlay));
  actions.append(ok);
  box.append(h, intro, list, actions);
  overlay.append(box);
  host.append(overlay);
}
