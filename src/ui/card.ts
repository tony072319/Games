import { MATERIALS, type Materials } from '../core/data';
import type { Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

/** Everything one upgrade card shows. Used by the main panel, boat upgrades, island buildings and the boat builder. */
export interface CardSpec {
  /** data-* attribute that identifies the card, e.g. ['upgrade', 'net']. */
  data: [string, string];
  /** A small picture of what is being mended, as SVG markup. */
  thumb: string;
  title: string;
  level?: number;
  desc: string;
  /** Extra highlighted line under the description (a perk, what the next level unlocks). */
  note?: string;
  /** Cost of the next step; null when at the last level. */
  cost: Materials | null;
  have: Materials;
  buyLabel: string;
  canBuy: boolean;
  onBuy(): void;
  /** Description shown. A card whose description is always useful passes `alwaysOpen`. */
  open: boolean;
  alwaysOpen?: boolean;
  onToggle?(): void;
  flash?: boolean;
}

export function costRow(cost: Materials, have: Materials, lang: Lang): HTMLElement {
  const row = el('div', 'cost');
  for (const m of MATERIALS) {
    if (cost[m] <= 0) continue;
    const c = el('span', have[m] >= cost[m] ? '' : 'short', itemIcon(m));
    c.append(formatNumber(cost[m], lang));
    row.append(c);
  }
  return row;
}

export function upgradeCard(lang: Lang, c: CardSpec): HTMLElement {
  const open = c.open || !!c.alwaysOpen;
  const card = el('div', `card${open ? ' open' : ''}${c.flash ? ' flash' : ''}`);
  card.dataset[c.data[0]] = c.data[1];

  // The picture, name and cost form one button that shows or hides the description.
  const main = el('button', 'card-main');
  main.type = 'button';
  if (!c.alwaysOpen) {
    main.setAttribute('aria-expanded', String(open));
    main.addEventListener('click', () => c.onToggle?.());
  } else main.tabIndex = -1;
  const thumb = el('span', 'thumb', c.thumb);
  const text = el('span', 'card-text');
  const h = el('h3');
  h.textContent = c.title;
  if (c.level !== undefined && c.level > 0) {
    const lvl = el('small', 'level');
    lvl.textContent = t(lang, 'ui.level', { level: c.level });
    h.append(lvl);
  }
  text.append(h);
  if (c.cost) text.append(costRow(c.cost, c.have, lang));
  main.append(thumb, text);

  const btn = el('button', 'buy');
  btn.type = 'button';
  if (!c.cost) {
    btn.textContent = t(lang, 'ui.max');
    btn.disabled = true;
  } else {
    btn.textContent = c.buyLabel;
    btn.disabled = !c.canBuy;
    btn.addEventListener('click', c.onBuy);
  }
  card.append(main, btn);

  if (open) {
    const d = el('p', 'card-desc');
    d.textContent = c.desc;
    if (c.note) {
      const n = el('span', 'perk');
      n.textContent = ` ${c.note}`;
      d.append(n);
    }
    card.append(d);
  }
  return card;
}
