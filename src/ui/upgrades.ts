import { MATERIALS, MAX_LEVEL, PANEL_UPGRADES, type UpgradeId } from '../core/data';
import { canBuy, isMaxLevel, upgradeCost } from '../core/economy';
import type { GameState, Lang } from '../core/state';
import { formatEta, t } from '../i18n';
import { affordState, etaSeconds, nextEffect } from '../core/advice';
import { boatSvg, chestSvg, netSvg, towerSvg } from './art';
import { upgradeCard } from './card';
import { el } from './dom';

export interface Panel {
  el: HTMLElement;
  update(state: GameState): void;
  /** Briefly highlight a card after it was upgraded. */
  flash(id: UpgradeId): void;
  /** Open a card, bring it into view and highlight it (from tapping the scene). */
  show(id: UpgradeId): void;
}

/** The lighthouse needs glowshards from level 7: say where they come from. */
function lightNote(state: GameState, lang: Lang): string | undefined {
  if (state.levels.light >= MAX_LEVEL.light) return undefined;
  const cost = upgradeCost('light', state.levels.light, state);
  return cost.glow > 0 && state.materials.glow < cost.glow ? t(lang, 'upg.light.next.glow') : undefined;
}

/** "下一级：捞得快 12%" — what one more level does. */
export function effectText(state: GameState, id: UpgradeId, lang: Lang): string | undefined {
  const e = nextEffect(state, id);
  if (!e) return undefined;
  if (e.kind === 'unlock') return t(lang, e.key!);
  return t(lang, 'card.next', { effect: t(lang, `effect.${id}`, { n: e.value! }) });
}

/** Time until affordable, as words; undefined when it will not come by waiting. */
export function etaText(state: GameState, cost: Parameters<typeof etaSeconds>[1], lang: Lang): string | undefined {
  const eta = etaSeconds(state, cost);
  return eta && eta > 0 ? t(lang, 'card.eta', { time: formatEta(eta, lang) }) : undefined;
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
      const eta = etaSeconds(state, cost);
      // Redraw when affordability changes, or when the "about N minutes" label would.
      return `${id}${state.levels[id]}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('') + `:${eta === null ? 'x' : Math.ceil(eta / 60)}`;
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
      const cost = isMaxLevel(state, id) ? null : upgradeCost(id, state.levels[id], state);
      root.append(
        upgradeCard(lang, {
          data: ['upgrade', id],
          thumb: upgradeThumb(id, state),
          title: t(lang, `upg.${id}.name`),
          level: state.levels[id],
          desc: t(lang, `upg.${id}.desc`),
          note: id === 'light' ? lightNote(state, lang) : undefined,
          effect: effectText(state, id, lang),
          cost: cost,
          have: state.materials,
          buyLabel: t(lang, 'ui.buy'),
          canBuy: canBuy(state, id),
          state: cost ? affordState(state, cost) : 'far',
          eta: cost ? etaText(state, cost, lang) : undefined,
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
    show(id) {
      if (!ids.includes(id)) return;
      open.add(id);
      last = '';
      flashing = id;
      if (current) update(current);
      root.querySelector(`[data-upgrade="${id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      setTimeout(() => {
        if (flashing === id) flashing = null;
      }, 900);
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
