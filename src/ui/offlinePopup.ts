import { MATERIALS, type Materials } from '../core/data';
import type { OfflineReport } from '../core/sim';
import type { Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export function formatDuration(seconds: number, lang: Lang): string {
  const totalMin = Math.floor(seconds / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? t(lang, 'time.hm', { h, m }) : t(lang, 'time.m', { m });
}

/**
 * "While you were away": shows how long, and what is waiting in the chest.
 * Both buttons empty the chest; double adds the haul once more.
 */
export function showOfflinePopup(
  container: HTMLElement,
  lang: Lang,
  report: OfflineReport,
  chest: Materials,
  onCollect: (double: boolean) => void,
): HTMLElement {
  const overlay = el('div', 'overlay');
  const box = el('div', 'popup');
  box.setAttribute('role', 'dialog');
  const h = el('h2');
  h.textContent = t(lang, 'offline.title');
  const away = el('p');
  away.textContent = t(lang, 'offline.away', { time: formatDuration(report.seconds, lang) });
  box.append(h, away);
  if (report.seconds > report.creditedSeconds + 1) {
    const full = el('p');
    full.textContent = t(lang, 'offline.chestFull');
    box.append(full);
  }
  const label = el('p');
  label.textContent = t(lang, 'offline.inChest');
  const haul = el('div', 'haul');
  for (const m of MATERIALS) {
    if (chest[m] < 1) continue;
    const item = el('div', 'mat', itemIcon(m));
    item.append(`+${formatNumber(chest[m], lang)}`);
    haul.append(item);
  }
  const actions = el('div', 'actions');
  const take = el('button');
  take.textContent = t(lang, 'offline.collect');
  const dbl = el('button', 'primary');
  dbl.textContent = t(lang, 'offline.double');
  const close = (double: boolean) => {
    overlay.remove();
    onCollect(double);
  };
  take.addEventListener('click', () => close(false));
  dbl.addEventListener('click', () => close(true));
  actions.append(take, dbl);
  box.append(label, haul, actions);
  overlay.append(box);
  container.append(overlay);
  return overlay;
}
