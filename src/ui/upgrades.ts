import { MATERIALS, PANEL_UPGRADES as UPGRADES, type UpgradeId } from '../core/data';
import { canBuy, isMaxLevel, upgradeCost } from '../core/economy';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export interface Panel {
  el: HTMLElement;
  update(state: GameState): void;
  /** Briefly highlight a card after it was upgraded. */
  flash(id: UpgradeId): void;
}

/** Cheap fingerprint: the panel is rebuilt only when this changes. */
function signature(state: GameState): string {
  return UPGRADES.map((id) => {
    const cost = upgradeCost(id, state.levels[id]);
    return `${id}${state.levels[id]}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('');
  }).join('|');
}

export function createPanel(lang: Lang, onBuy: (id: UpgradeId) => void): Panel {
  const root = el('div', 'panel');
  let last = '';
  let flashing: UpgradeId | null = null;

  function render(state: GameState) {
    root.replaceChildren();
    for (const id of UPGRADES) {
      const card = el('div', id === flashing ? 'card flash' : 'card');
      card.dataset.upgrade = id;
      const title = el('h3');
      title.textContent = t(lang, `upg.${id}.name`);
      const lvl = el('small', 'level');
      lvl.textContent = t(lang, 'ui.level', { level: state.levels[id] });
      title.append(lvl);
      const desc = el('p');
      desc.textContent = t(lang, `upg.${id}.desc`);
      const btn = el('button', 'buy');
      card.append(title, desc);
      if (isMaxLevel(state, id)) {
        btn.textContent = t(lang, 'ui.max');
        btn.disabled = true;
      } else {
        const cost = upgradeCost(id, state.levels[id]);
        const costEl = el('div', 'cost');
        for (const m of MATERIALS) {
          if (cost[m] <= 0) continue;
          const c = el('span', state.materials[m] >= cost[m] ? '' : 'short', itemIcon(m));
          c.append(formatNumber(cost[m], lang));
          costEl.append(c);
        }
        card.append(costEl);
        btn.textContent = t(lang, 'ui.buy');
        btn.disabled = !canBuy(state, id);
        btn.addEventListener('click', () => onBuy(id));
      }
      card.append(btn);
      root.append(card);
    }
  }

  return {
    el: root,
    update(state) {
      const sig = signature(state);
      if (sig !== last) {
        last = sig;
        render(state);
      }
    },
    flash(id) {
      flashing = id;
      root.querySelector(`[data-upgrade="${id}"]`)?.classList.add('flash');
      setTimeout(() => {
        if (flashing === id) flashing = null;
      }, 900);
    },
  };
}
