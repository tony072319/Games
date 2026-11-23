import { MATERIALS, UPGRADES, type UpgradeId } from '../core/data';
import { autoRate, canBuy, isMaxLevel, offlineCapSeconds, upgradeCost } from '../core/economy';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { itemIcon } from './art';
import { el } from './dom';

export interface Panel {
  el: HTMLElement;
  update(state: GameState): void;
}

function describe(id: UpgradeId, state: GameState, lang: Lang): string {
  if (id === 'net') return t(lang, 'upg.net.desc', { rate: formatNumber(autoRate(state.levels.net) * 3600, lang) });
  return t(lang, 'upg.storage.desc', { hours: offlineCapSeconds(state.levels.storage) / 3600 });
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

  function render(state: GameState) {
    root.replaceChildren();
    for (const id of UPGRADES) {
      const card = el('div', 'card');
      card.dataset.upgrade = id;
      const title = el('h3');
      title.textContent = t(lang, `upg.${id}.name`);
      const lvl = el('small', 'level');
      lvl.textContent = t(lang, 'ui.level', { level: state.levels[id] });
      title.append(lvl);
      const desc = el('p');
      desc.textContent = describe(id, state, lang);
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
  };
}
