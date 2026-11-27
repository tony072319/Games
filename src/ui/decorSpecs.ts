/** What each decoration card shows (no DOM, so it can be tested on its own). */
import { DECOR_IDS, DECOR_TIERS, canDecorate, decorCost, type DecorId } from '../core/decor';
import type { GameState, Lang } from '../core/state';
import { affordState, etaSeconds } from '../core/advice';
import { MATERIALS } from '../core/data';
import { LAND_MAX, canExpand, landCost } from '../core/land';
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
  const land = landCost(state);
  const landSig = `land${state.land}:` + (land ? MATERIALS.map((m) => (state.materials[m] >= land[m] ? 1 : 0)).join('') + `:${Math.ceil((etaSeconds(state, land) ?? -60) / 60)}` : 'x');
  return landSig + '|' + DECOR_IDS.map((id) => {
    const c = decorCost(state, id);
    if (!c) return `${id}x`;
    const eta = etaSeconds(state, c);
    return `${state.decor[id] ?? 0}:` + MATERIALS.map((m) => (state.materials[m] >= c[m] ? 1 : 0)).join('') + `:${eta === null ? 'x' : Math.ceil(eta / 60)}`;
  }).join('|');
}

/** A small hex of new ground. */
const LAND_THUMB = `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4l10 6v12l-10 6-10-6V10z" fill="#8fbf5a" stroke="#5f8a3a" stroke-width="1.2"/><path d="M6 22l10 6 10-6v3l-10 6-10-6z" fill="#c9a66b"/><circle cx="13" cy="14" r="1.6" fill="#f6dd7a"/><circle cx="19" cy="17" r="1.3" fill="#e98aa8"/></svg>`;

function landSpec(lang: Lang, state: GameState, buy: () => void): CardSpec {
  const cost = landCost(state);
  return {
    data: ['decor', 'land'],
    thumb: LAND_THUMB,
    title: t(lang, 'land.title'),
    desc: t(lang, 'land.desc'),
    effect: cost ? t(lang, 'land.count', { n: state.land, max: LAND_MAX }) : t(lang, 'land.full'),
    cost,
    have: state.materials,
    buyLabel: t(lang, 'land.buy'),
    canBuy: canExpand(state),
    state: cost ? affordState(state, cost) : 'far',
    eta: cost ? etaText(state, cost, lang) : undefined,
    onBuy: buy,
    open: false,
  };
}

/** Expanding the island first, then one card per decoration. */
export function decorSpecs(lang: Lang, state: GameState, buy: (id: DecorId | 'land') => void): CardSpec[] {
  return [landSpec(lang, state, () => buy('land')), ...decorCards(lang, state, buy)];
}

function decorCards(lang: Lang, state: GameState, buy: (id: DecorId) => void): CardSpec[] {
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
      buyLabel: t(lang, tier === 0 ? 'decor.buy' : 'decor.upgrade'),
      canBuy: canDecorate(state, id),
      state: cost ? affordState(state, cost) : 'far',
      eta: cost ? etaText(state, cost, lang) : undefined,
      onBuy: () => buy(id),
      open: false,
    } satisfies CardSpec;
  });
}
