import { MATERIALS, type Materials } from '../core/data';
import type { OfflineReport } from '../core/sim';
import type { Lang } from '../core/state';
import { formatDuration, formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { dismiss, el } from './dom';

export { formatDuration } from '../i18n';

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
  boatBack = false,
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
  if (boatBack) {
    const b = el('p', 'boat-note');
    b.textContent = t(lang, 'offline.boat');
    box.append(b);
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
  const take = el('button', 'btn-ghost');
  take.textContent = t(lang, 'offline.collect');
  const dbl = el('button', 'btn-primary');
  dbl.textContent = t(lang, 'offline.double');
  const close = (double: boolean) => {
    dismiss(overlay);
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
