/** What each decoration card shows (no DOM, so it can be tested on its own). */
import { DECOR_IDS, DECOR_TIERS, canDecorate, decorCost, type DecorId } from '../core/decor';
import type { GameState, Lang } from '../core/state';
import { affordState, etaSeconds } from '../core/advice';
import { MATERIALS } from '../core/data';
import { t } from '../i18n';
import type { CardSpec } from './card';
import { etaText } from './upgrades';

const HUE: Record<DecorId, string> = {
  lantern: '#f2c46b', flowers: '#e98aa8', bench: '#b98a5e', flags: '#6aa8e8', well: '#8fb3c9',
  garden: '#7cc07a', hut: '#d2a26a', torches: '#f08a4b', lights: '#f6dd7a', tower: '#a7b4c8',
};

/** A small round badge in the decoration's colour, with one dot per tier owned. */
export function decorThumb(id: DecorId, tier: number): string {
  const dots = Array.from({ length: DECOR_TIERS }, (_, i) => `<circle cx="${10 + i * 6}" cy="25" r="2" fill="${i < tier ? '#fff6d8' : '#ffffff33'}"/>`).join('');
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="14" r="9" fill="${HUE[id]}"/><path d="M16 8l2 4 4 .5-3 3 .8 4-3.8-2-3.8 2 .8-4-3-3 4-.5z" fill="#fff8e8" opacity="0.85"/>${dots}</svg>`;
}

/** Redraw when a tier, what is affordable, or the "about N minutes" label would change. */
export function decorSignature(state: GameState): string {
  return DECOR_IDS.map((id) => {
    const c = decorCost(state, id);
    if (!c) return `${id}x`;
    const eta = etaSeconds(state, c);
    return `${state.decor[id] ?? 0}:` + MATERIALS.map((m) => (state.materials[m] >= c[m] ? 1 : 0)).join('') + `:${eta === null ? 'x' : Math.ceil(eta / 60)}`;
  }).join('|');
}

export function decorSpecs(lang: Lang, state: GameState, buy: (id: DecorId) => void): CardSpec[] {
  return DECOR_IDS.map((id) => {
    const tier = state.decor[id] ?? 0;
    const cost = decorCost(state, id);
    const next = cost ? t(lang, `decor.${id}.${tier + 1}`) : undefined;
    return {
      data: ['decor', id],
      thumb: decorThumb(id, tier),
      title: t(lang, `decor.${id}.${Math.max(1, tier)}`),
      level: tier,
      desc: t(lang, 'decor.desc'),
      // Not placed yet: the title already names it.
      effect: tier === 0 ? undefined : next ? t(lang, 'decor.next', { name: next }) : t(lang, 'decor.done'),
      cost,
      have: state.materials,
      buyLabel: t(lang, 'decor.buy'),
      canBuy: canDecorate(state, id),
      state: cost ? affordState(state, cost) : 'far',
      eta: cost ? etaText(state, cost, lang) : undefined,
      onBuy: () => buy(id),
      open: false,
    } satisfies CardSpec;
  });
}
