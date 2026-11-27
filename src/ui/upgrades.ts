import { canFocus, focusOn, FOCUSES, type Focus } from '../core/focus';
import { canBuyHalo, haloCost, haloOpen } from '../core/halo';
import { MATERIALS, MAX_LEVEL, PANEL_UPGRADES, type UpgradeId } from '../core/data';
import { canBuy, inParts, isMaxLevel, priceOf, upgradeLocked } from '../core/economy';
import { T } from '../core/tuning';
import type { GameState, Lang } from '../core/state';
import { formatEta, t } from '../i18n';
import { affordState, etaSeconds, nextEffect } from '../core/advice';
import { NET_MILESTONES, nextNetMilestone } from '../core/milestones';
import { UI_ICONS, boatThumb, chestThumb, lightThumb, netThumb } from './art';
import { boatModel } from '../world/looks';
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
export function lightNote(state: GameState, lang: Lang): string | undefined {
  if (state.levels.light >= MAX_LEVEL.light) return undefined;
  const cost = priceOf(state, 'light');
  return cost.glow > 0 && state.materials.glow < cost.glow ? t(lang, 'upg.light.next.glow') : undefined;
}

/** "下一级：捞得快 12%" — what one more level does. */
export function effectText(state: GameState, id: UpgradeId, lang: Lang): string | undefined {
  const e = nextEffect(state, id);
  if (!e) return undefined;
  if (e.kind === 'unlock') return t(lang, e.key!);
  return t(lang, 'card.next', { effect: t(lang, `effect.${id}`, { n: e.value! }) });
}

/** From level 5 the lighthouse is mended in parts: "零件 2/4 · 下一个：刷漆". */
export function lightPartsProgress(state: GameState, lang: Lang): { label: string; value: number } | undefined {
  if (!inParts(state, 'light') || isMaxLevel(state, 'light')) return undefined;
  const n = state.lightParts;
  return { label: t(lang, 'card.parts', { n, total: T.LIGHT_PARTS, name: t(lang, `part.${(n % T.LIGHT_PARTS) + 1}`) }), value: n / T.LIGHT_PARTS };
}

/** Toward the next net milestone (10/20/30/40/50). */
function netProgress(level: number, lang: Lang): { label: string; value: number } | undefined {
  const next = nextNetMilestone(level);
  if (next === null) return undefined;
  const prev = [...NET_MILESTONES].reverse().find((m) => m <= level) ?? 1;
  return { label: t(lang, 'ms.net', { n: next - level }), value: (level - prev) / (next - prev) };
}

/** Time until affordable, as words; undefined when it will not come by waiting. */
export function etaText(state: GameState, cost: Parameters<typeof etaSeconds>[1], lang: Lang): string | undefined {
  const eta = etaSeconds(state, cost);
  return eta && eta > 0 ? t(lang, 'card.eta', { time: formatEta(eta, lang) }) : undefined;
}

/** A picture of what each upgrade looks like right now: the same models the island shows. */
export function upgradeThumb(id: UpgradeId, state: GameState): string {
  const L = state.levels[id];
  if (id === 'net') return netThumb(L);
  if (id === 'storage') return chestThumb(L);
  if (id === 'light') return lightThumb(L);
  if (id === 'recycle') return UI_ICONS.recycle.replace('<svg ', '<svg style="color:#8fd0b0;padding:22%;box-sizing:border-box" ');
  return boatThumb(boatModel(state.levels.speed, state.levels.cargo));
}

/** The halo card redraws when a material crosses its price or the "about N minutes" label would change. */
function haloSignature(state: GameState): string {
  const cost = haloCost(state);
  const eta = etaSeconds(state, cost);
  return `${state.halo}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('') + `:${eta === null ? 'x' : Math.ceil(eta / 60)}`;
}

/** After the ending: the next ring of halo, a card like the upgrades. */
function haloCard(lang: Lang, state: GameState, onHalo: () => void): HTMLElement {
  const cost = haloCost(state);
  return upgradeCard(lang, {
    data: ['halo', 'halo'],
    thumb: upgradeThumb('light', state),
    title: t(lang, 'halo.name'),
    level: state.halo,
    desc: t(lang, 'halo.desc'),
    effect: t(lang, 'halo.next', { n: Math.round(T.HALO_BONUS * 100 * state.halo) }),
    cost,
    have: state.materials,
    buyLabel: t(lang, 'ui.buy'),
    canBuy: canBuyHalo(state),
    state: affordState(state, cost),
    eta: etaText(state, cost, lang),
    onBuy: onHalo,
    open: true,
    alwaysOpen: true,
  });
}

/** Under the lighthouse card: where the light shines (three choices, free to change). */
function focusRow(lang: Lang, state: GameState, onFocus: (f: Focus) => void): HTMLElement {
  const row = el('div', 'focus-row');
  const label = el('span', 'focus-label');
  label.textContent = t(lang, 'focus.title');
  const chips = el('div', 'focus-chips');
  chips.setAttribute('role', 'radiogroup');
  chips.setAttribute('aria-label', t(lang, 'focus.title'));
  for (const f of FOCUSES) {
    const b = el('button', state.focus === f ? 'chip on' : 'chip');
    b.type = 'button';
    b.dataset.focus = f;
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(state.focus === f));
    b.textContent = t(lang, `focus.${f}`);
    b.addEventListener('click', () => onFocus(f));
    chips.append(b);
  }
  const hint = el('span', 'focus-hint');
  hint.textContent = t(lang, `focus.${state.focus}.hint`);
  row.append(label, chips, hint);
  return row;
}

/** Cheap fingerprint: the panel is rebuilt only when this changes. */
function signature(state: GameState, ids: readonly UpgradeId[]): string {
  return ids
    .map((id) => {
      const cost = priceOf(state, id);
      const eta = etaSeconds(state, cost);
      // Redraw when affordability changes, or when the "about N minutes" label would.
      return `${id}${state.levels[id]}${id === 'light' ? `.${state.lightParts}` : ''}${upgradeLocked(state, id) ? 'L' : ''}:` + MATERIALS.map((m) => (state.materials[m] >= cost[m] ? 1 : 0)).join('') + `:${eta === null ? 'x' : Math.ceil(eta / 60)}`;
    })
    .join('|');
}

/** Extras under the lighthouse card: where the light shines, and (after the ending) the halo. */
export interface PanelExtras {
  onFocus?: (f: Focus) => void;
  onHalo?: () => void;
}

export function createPanel(lang: Lang, onBuy: (id: UpgradeId) => void, ids: readonly UpgradeId[] = PANEL_UPGRADES, extras: PanelExtras = {}): Panel {
  // Keyboard focus goes back to the chip or button just used after the panel redraws.
  let refocusSel: string | null = null;
  const onFocus = extras.onFocus && ((f: Focus) => {
    refocusSel = `.focus-row [data-focus="${f}"]`;
    extras.onFocus!(f);
  });
  const onHalo = extras.onHalo && (() => {
    refocusSel = '[data-halo] .buy';
    extras.onHalo!();
  });
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
      if (upgradeLocked(state, id)) continue;
      const cost = isMaxLevel(state, id) ? null : priceOf(state, id);
      root.append(
        upgradeCard(lang, {
          data: ['upgrade', id],
          thumb: upgradeThumb(id, state),
          title: t(lang, `upg.${id}.name`),
          level: state.levels[id],
          desc: t(lang, `upg.${id}.desc`),
          note: id === 'light' ? lightNote(state, lang) : undefined,
          effect: effectText(state, id, lang),
          progress: id === 'net' ? netProgress(state.levels.net, lang) : id === 'light' ? lightPartsProgress(state, lang) : undefined,
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
      if (id === 'light' && onHalo && haloOpen(state)) root.append(haloCard(lang, state, onHalo));
      if (id === 'light' && onFocus && canFocus(state)) root.append(focusRow(lang, state, onFocus));
    }
  }

  function update(state: GameState) {
    current = state;
    const sig = signature(state, ids) + '|' + [...open].join() + '|' + focusOn(state) + '|' + (haloOpen(state) ? haloSignature(state) : '');
    if (sig !== last) {
      last = sig;
      render(state);
      if (refocusSel) {
        root.querySelector<HTMLElement>(refocusSel)?.focus();
        refocusSel = null;
      }
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
