/** What each decoration card shows (no DOM, so it can be tested on its own). */
import { DECOR_IDS, canDecorate, decorCost, type DecorId } from '../core/decor';
import type { GameState, Lang } from '../core/state';
import { affordState, etaSeconds } from '../core/advice';
import { MATERIALS } from '../core/data';
import { LAND_MAX, canExpand, landCost } from '../core/land';
import { t } from '../i18n';
import type { CardSpec } from './card';
import { decorPicture, landThumb } from './art/thumbs';
import { etaText } from './upgrades';

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

function landSpec(lang: Lang, state: GameState, buy: () => void): CardSpec {
  const cost = landCost(state);
  return {
    data: ['decor', 'land'],
    thumb: landThumb(),
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
      thumb: decorPicture(id, tier),
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
