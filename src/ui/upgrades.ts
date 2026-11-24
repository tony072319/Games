import { DOCK_LIGHT } from '../core/boat';
import { MATERIALS, MAX_LEVEL, PANEL_UPGRADES, type UpgradeId } from '../core/data';
import { canBuy, isMaxLevel, upgradeCost } from '../core/economy';
import type { GameState, Lang } from '../core/state';
import { t } from '../i18n';
import { boatSvg, chestSvg, netSvg, towerSvg } from './art';
import { upgradeCard } from './card';
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
  let s = t(lang, `upg.light.next.${next}`);
  const cost = upgradeCost('light', L, state);
  if (cost.glow > 0 && state.materials.glow < cost.glow) s += ' ' + t(lang, 'upg.light.next.glow');
  return s;
}

/** A crop of what each upgrade looks like right now. */
export function upgradeThumb(id: UpgradeId, state: GameState): string {
  const L = state.levels[id];
  if (id === 'net') return `<svg viewBox="14 336 134 160" aria-hidden="true">${netSvg(L)}</svg>`;
  if (id === 'storage') return chestSvg(0, L);
  if (id === 'light') return `<svg viewBox="128 218 104 104" aria-hidden="true">${towerSvg(L)}</svg>`;
  return boatSvg(id === 'cargo', state.levels.cargo);
}

/** Cheap fingerprint: the panel is rebuilt only when this changes. */
function signature(state: GameState, ids: readonly UpgradeId[]): string {
  return ids
    .map((id) => {
      const cost = upgradeCost(id, state.levels[id], state);
      return `${id}${state.levels[id]}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('');
    })
    .join('|');
}

export function createPanel(lang: Lang, onBuy: (id: UpgradeId) => void, ids: readonly UpgradeId[] = PANEL_UPGRADES): Panel {
  const root = el('div', 'panel');
  let last = '';
  let flashing: UpgradeId | null = null;
  const open = new Set<UpgradeId>();
  let current: GameState | null = null;
  /** The card just opened or closed: focus goes back to it after redrawing. */
  let refocus: UpgradeId | null = null;

  function render(state: GameState) {
    root.replaceChildren();
    for (const id of ids) {
      root.append(
        upgradeCard(lang, {
          data: ['upgrade', id],
          thumb: upgradeThumb(id, state),
          title: t(lang, `upg.${id}.name`),
          level: state.levels[id],
          desc: t(lang, `upg.${id}.desc`),
          note: id === 'light' ? lightNext(state, lang) : undefined,
          cost: isMaxLevel(state, id) ? null : upgradeCost(id, state.levels[id], state),
          have: state.materials,
          buyLabel: t(lang, 'ui.buy'),
          canBuy: canBuy(state, id),
          onBuy: () => onBuy(id),
          open: open.has(id),
          onToggle: () => {
            if (open.has(id)) open.delete(id);
            else open.add(id);
            last = '';
            refocus = id;
            if (current) update(current);
          },
          flash: id === flashing,
        }),
      );
    }
  }

  function update(state: GameState) {
    current = state;
    const sig = signature(state, ids) + '|' + [...open].join();
    if (sig !== last) {
      last = sig;
      render(state);
      if (refocus) {
        root.querySelector<HTMLElement>(`[data-upgrade="${refocus}"] .card-main`)?.focus();
        refocus = null;
      }
    }
  }

  return {
    el: root,
    update,
    flash(id) {
      flashing = id;
      root.querySelector(`[data-upgrade="${id}"]`)?.classList.add('flash');
      setTimeout(() => {
        if (flashing === id) flashing = null;
      }, 900);
    },
  };
}
