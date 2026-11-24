import { CURIOS, pageComplete, type Curio } from '../core/curios';
import { SEA_IDS, type SeaId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { curioIcon } from './art';
import { el } from './dom';
import { destName } from './names';

export interface Book {
  el: HTMLElement;
}

/** How to find a curio you haven't found yet. */
function hint(c: Curio, sea: SeaId, lang: Lang): string {
  if (c.rarity === 'legend') return t(lang, 'hint.legend', { n: c.needLight ?? 0, name: destName(lang, sea, c.dest!) });
  if (c.source === 'boat') return t(lang, 'hint.boat', { name: destName(lang, sea, c.dest!) });
  if (c.needLight) return t(lang, 'hint.light', { n: c.needLight });
  return t(lang, 'hint.common');
}

/** The book: a page per sea reached, a 4×3 grid of finds, the bonus they give. */
export function createBook(lang: Lang, state: GameState, onClose: () => void): Book {
  const overlay = el('div', 'overlay sheet-overlay');
  const box = el('div', 'seamap book');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = t(lang, 'book.title');
  const close = el('button', 'btn-ghost map-close');
  close.type = 'button';
  close.textContent = t(lang, 'map.close');
  close.addEventListener('click', onClose);
  head.append(title, close);

  const tabs = el('div', 'book-tabs');
  const pageEl = el('div', 'book-page');
  const detail = el('div', 'book-detail');
  const foot = el('p', 'book-foot');
  const bonus = el('p', 'book-bonus');
  box.append(head, tabs, pageEl, detail, foot, bonus);
  overlay.append(box);

  let sea: SeaId = state.sea;
  let picked: string | null = null;

  function render() {
    tabs.replaceChildren();
    for (const id of SEA_IDS) {
      if (!state.reached.includes(id)) continue;
      const b = el('button', `book-tab${id === sea ? ' on' : ''}`);
      b.type = 'button';
      const n = CURIOS.filter((c) => c.sea === id && state.curios.includes(c.id)).length;
      b.textContent = t(lang, 'book.tab', { sea: t(lang, `sea.${id}`), n });
      b.setAttribute('aria-pressed', String(id === sea));
      b.addEventListener('click', () => {
        sea = id;
        picked = null;
        render();
      });
      tabs.append(b);
    }

    pageEl.replaceChildren();
    for (const c of CURIOS.filter((x) => x.sea === sea)) {
      const found = state.curios.includes(c.id);
      const cell = el('button', `book-cell ${c.rarity}${found ? ' found' : ''}${picked === c.id ? ' sel' : ''}`);
      cell.type = 'button';
      cell.dataset.curio = c.id;
      cell.innerHTML = curioIcon(c.id, !found);
      const name = el('span');
      name.textContent = found ? t(lang, `curio.${c.id}.name`) : t(lang, 'book.unknown');
      cell.append(name);
      cell.setAttribute('aria-label', found ? t(lang, `curio.${c.id}.name`) : t(lang, 'book.missing', { hint: hint(c, sea, lang) }));
      cell.addEventListener('click', () => {
        picked = c.id;
        render();
      });
      pageEl.append(cell);
    }

    detail.replaceChildren();
    if (picked) {
      const c = CURIOS.find((x) => x.id === picked)!;
      const found = state.curios.includes(c.id);
      const h = el('h3');
      h.textContent = found ? t(lang, `curio.${c.id}.name`) : t(lang, 'book.unknown');
      const p = el('p');
      p.textContent = found ? t(lang, `curio.${c.id}.line`) : hint(c, sea, lang);
      detail.append(h, p);
    }

    foot.textContent = t(lang, pageComplete(state, sea) ? 'book.pageDone' : 'book.pageGoal');
    bonus.textContent = t(lang, 'book.bonus', { n: formatNumber(state.curios.length, lang) });
  }

  render();
  return { el: overlay };
}
