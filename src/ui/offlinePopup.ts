import type { ArrivalLine } from '../core/arrival';
import { MATERIALS, type DestId, type Materials, type UpgradeId } from '../core/data';
import type { Lang } from '../core/state';
import { formatDuration, formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { dismiss, el } from './dom';

export { formatDuration } from '../i18n';

function haul(m: Materials, lang: Lang): HTMLElement {
  const row = el('div', 'haul');
  for (const k of MATERIALS) {
    if (m[k] < 1) continue;
    const item = el('div', 'mat', itemIcon(k));
    item.append(`+${formatNumber(m[k], lang)}`);
    row.append(item);
  }
  return row;
}

export interface ArrivalActions {
  /** Take the chest and the boat's cargo (twice over for double). */
  collect(double: boolean): void;
  /** Close and show an upgrade card. */
  showUpgrade(id: UpgradeId): void;
  destName(d: DestId): string;
}

/**
 * "While you were away": one line per thing that happened, appearing one after
 * another, then the collect buttons. Built on the shared dialog frame.
 */
export function showArrival(container: HTMLElement, lang: Lang, lines: ArrivalLine[], act: ArrivalActions): HTMLElement {
  const overlay = el('div', 'overlay');
  const box = el('div', 'popup arrival');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const h = el('h2');
  h.textContent = t(lang, 'arrival.title');
  box.append(h);

  const list = el('ol', 'arrival-list');
  lines.forEach((l, i) => {
    const li = el('li', `arrival-line line-${l.kind}`);
    li.style.setProperty('--i', String(i));
    const p = el('p');
    if (l.kind === 'away') p.textContent = t(lang, 'arrival.away', { time: formatDuration(l.seconds ?? 0, lang) });
    if (l.kind === 'chest') p.textContent = t(lang, 'arrival.chest');
    if (l.kind === 'cap') p.textContent = t(lang, 'arrival.cap', { h: formatNumber(l.hours ?? 0, lang) });
    if (l.kind === 'boat') p.textContent = t(lang, 'arrival.boat', { name: act.destName(l.dest!) });
    if (l.kind === 'island') p.textContent = t(lang, 'arrival.island');
    if (l.kind === 'tip') p.textContent = t(lang, 'arrival.tip', { name: t(lang, `upg.${l.upgrade}.name`) });
    li.append(p);
    if (l.mats) li.append(haul(l.mats, lang));
    if (l.kind === 'tip') {
      const see = el('button', 'btn-ghost');
      see.type = 'button';
      see.textContent = t(lang, 'arrival.see');
      see.addEventListener('click', () => {
        close(false);
        act.showUpgrade(l.upgrade!);
      });
      li.append(see);
    }
    list.append(li);
  });
  box.append(list);

  const actions = el('div', 'actions');
  const take = el('button', 'btn-ghost');
  take.type = 'button';
  take.textContent = t(lang, 'offline.collect');
  const dbl = el('button', 'btn-primary');
  dbl.type = 'button';
  dbl.textContent = t(lang, 'offline.double');
  const close = (double: boolean) => {
    dismiss(overlay);
    act.collect(double);
  };
  take.addEventListener('click', () => close(false));
  dbl.addEventListener('click', () => close(true));
  actions.append(take, dbl);
  box.append(actions);
  overlay.append(box);
  container.append(overlay);
  return overlay;
}
