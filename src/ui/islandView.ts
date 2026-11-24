import { BUILDING_MAX, MATERIALS, type BuildingId, type DestId } from '../core/data';
import { BUILDINGS, ISLAND_BUILDINGS, buildCost, buildingLevel, canBuild } from '../core/islands';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { PLOTS, buildingSvg, islandSceneSvg, itemIcon } from './art';
import { el } from './dom';
import { upgradeCard } from './card';
import { affordState } from '../core/advice';
import { etaText } from './upgrades';
import { destName } from './names';

export interface IslandActions {
  build(b: BuildingId): void;
  back(): void;
}

export interface IslandView {
  el: HTMLElement;
  update(state: GameState): void;
  /** Celebrate a building that just went up a level. */
  flash(b: BuildingId): Element | null;
}

const PERK_STEP: Record<string, [number, boolean]> = { speed: [4, false], net: [5, false], light: [3, true], chest: [10, false] };

export function createIslandView(lang: Lang, state: GameState, d: DestId, act: IslandActions): IslandView {
  const overlay = el('div', 'overlay sheet-overlay');
  const box = el('div', 'seamap island');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = destName(lang, state.sea, d);
  const back = el('button', 'btn-ghost map-close');
  back.textContent = t(lang, 'island.back');
  back.addEventListener('click', act.back);
  head.append(title, back);
  const scene = el('div', 'island-scene');
  const store = el('div', 'island-store');
  const info = el('div', 'map-info');
  box.append(head, scene, store, info);
  overlay.append(box);

  let selected: BuildingId | null = null;
  let key = '';

  function drawScene(s: GameState) {
    const plots = PLOTS[d];
    const blds = ISLAND_BUILDINGS[d];
    const gs = blds
      // The outer group places the building; the inner one can be animated without losing that position.
      .map((b, i) => `<g transform="translate(${plots[i][0]} ${plots[i][1]})"><g class="bld" data-b="${b}">${buildingSvg(b, buildingLevel(s, b))}</g></g>`)
      .join('');
    scene.innerHTML = `<svg viewBox="0 0 360 240" aria-hidden="true">${islandSceneSvg(d, s.sea)}${gs}</svg>`;
    blds.forEach((b, i) => {
      const btn = el('button', `plot-btn${selected === b ? ' sel' : ''}`);
      btn.dataset.b = b;
      btn.style.left = `${(plots[i][0] / 360) * 100}%`;
      btn.style.top = `${((plots[i][1] - 30) / 240) * 100}%`;
      btn.setAttribute('aria-label', t(lang, `bld.${b}.name`));
      btn.addEventListener('click', () => {
        selected = b;
        key = '';
        render(s);
      });
      scene.append(btn);
    });
  }

  function drawStore(s: GameState) {
    store.replaceChildren();
    const st = s.islandStore[d];
    const has = st && MATERIALS.some((m) => st[m] >= 1);
    const p = el('p');
    p.textContent = t(lang, has ? 'island.store' : 'island.storeEmpty');
    store.append(p);
    if (!has) return;
    const row = el('div', 'haul');
    for (const m of MATERIALS) {
      if (st![m] < 1) continue;
      const it = el('span', 'mat', itemIcon(m));
      it.append(formatNumber(st![m], lang));
      row.append(it);
    }
    store.append(row);
  }

  function drawInfo(s: GameState) {
    info.replaceChildren();
    if (!selected) {
      const p = el('p');
      p.textContent = t(lang, 'island.pick');
      info.append(p);
      return;
    }
    const b = selected;
    const lvl = buildingLevel(s, b);
    const perk = BUILDINGS[b].perk;
    let note: string | undefined;
    if (perk && lvl > 0) {
      const [step, minus] = PERK_STEP[perk];
      note = t(lang, minus ? 'island.perkNowMinus' : 'island.perkNow', { n: step * lvl });
    }
    info.append(
      upgradeCard(lang, {
        data: ['building', b],
        // Not built yet: a faint preview of the first level.
        thumb: `<svg viewBox="-48 -88 96 96" aria-hidden="true" style="${lvl === 0 ? 'opacity:.5' : ''}">${buildingSvg(b, Math.max(1, lvl))}</svg>`,
        title: t(lang, `bld.${b}.name`),
        level: lvl,
        desc: t(lang, `bld.${b}.desc`),
        note,
        cost: lvl >= BUILDING_MAX ? null : buildCost(b, lvl, s),
        have: s.materials,
        buyLabel: t(lang, lvl === 0 ? 'island.build' : 'ui.buy'),
        canBuy: canBuild(s, b),
        state: lvl >= BUILDING_MAX ? 'far' : affordState(s, buildCost(b, lvl, s)),
        eta: lvl >= BUILDING_MAX ? undefined : etaText(s, buildCost(b, lvl, s), lang),
        onBuy: () => act.build(b),
        open: true,
        alwaysOpen: true,
      }),
    );
  }

  function render(s: GameState) {
    const st = s.islandStore[d];
    const k = [
      ISLAND_BUILDINGS[d].map((b) => buildingLevel(s, b)).join(),
      selected,
      st ? MATERIALS.map((m) => Math.floor(st[m])).join() : '',
      selected ? MATERIALS.map((m) => (s.materials[m] >= buildCost(selected!, buildingLevel(s, selected!), s)[m] ? 1 : 0)).join('') : '',
    ].join('|');
    if (k === key) return;
    const levelsChanged = key.split('|')[0] !== k.split('|')[0] || key.split('|')[1] !== k.split('|')[1];
    key = k;
    if (levelsChanged || !scene.firstChild) drawScene(s);
    drawStore(s);
    drawInfo(s);
  }

  render(state);
  return {
    el: overlay,
    update: render,
    flash(b) {
      const g = scene.querySelector(`.bld[data-b="${b}"]`);
      g?.classList.add('pulse');
      return g;
    },
  };
}
