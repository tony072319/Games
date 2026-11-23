import { MATERIALS, MAX_LEVEL, PANEL_UPGRADES, type UpgradeId } from '../core/data';
import { DOCK_LIGHT } from '../core/boat';
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

/** What mending the lighthouse once more will do. */
function lightNext(state: GameState, lang: Lang): string {
  const L = state.levels.light;
  if (L >= MAX_LEVEL.light) return '';
  const next = L + 1 === DOCK_LIGHT ? 'dock' : L + 1 === MAX_LEVEL.light ? 'end' : 'reach';
  let s = ' ' + t(lang, `upg.light.next.${next}`);
  if (upgradeCost('light', L, state).glow > 0 && state.materials.glow < upgradeCost('light', L, state).glow) s += ' ' + t(lang, 'upg.light.next.glow');
  return s;
}

/** Cheap fingerprint: the panel is rebuilt only when this changes. */
function signature(state: GameState, ids: readonly UpgradeId[]): string {
  return ids.map((id) => {
    const cost = upgradeCost(id, state.levels[id], state);
    return `${id}${state.levels[id]}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('');
  }).join('|');
}

export function createPanel(lang: Lang, onBuy: (id: UpgradeId) => void, ids: readonly UpgradeId[] = PANEL_UPGRADES): Panel {
  const root = el('div', 'panel');
  let last = '';
  let flashing: UpgradeId | null = null;

  function render(state: GameState) {
    root.replaceChildren();
    for (const id of ids) {
      const card = el('div', id === flashing ? 'card flash' : 'card');
      card.dataset.upgrade = id;
      const title = el('h3');
      title.textContent = t(lang, `upg.${id}.name`);
      const lvl = el('small', 'level');
      lvl.textContent = t(lang, 'ui.level', { level: state.levels[id] });
      title.append(lvl);
      const desc = el('p');
      desc.textContent = t(lang, `upg.${id}.desc`) + (id === 'light' ? lightNext(state, lang) : '');
      const btn = el('button', 'buy');
      card.append(title, desc);
      if (isMaxLevel(state, id)) {
        btn.textContent = t(lang, 'ui.max');
        btn.disabled = true;
      } else {
        const cost = upgradeCost(id, state.levels[id], state);
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
      const sig = signature(state, ids);
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
