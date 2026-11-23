import { BUILDING_MAX, MATERIALS, type BuildingId, type DestId } from '../core/data';
import { BUILDINGS, ISLAND_BUILDINGS, buildCost, buildingLevel, canBuild } from '../core/islands';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { PLOTS, buildingSvg, islandSceneSvg, itemIcon } from './art';
import { el } from './dom';

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
  const overlay = el('div', 'overlay map-overlay');
  const box = el('div', 'seamap island');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = t(lang, `dest.${d}.name`);
  const back = el('button', 'map-close');
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
    scene.innerHTML = `<svg viewBox="0 0 360 240" aria-hidden="true">${islandSceneSvg(d)}${gs}</svg>`;
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
    const card = el('div', 'card');
    card.dataset.building = b;
    const h = el('h3');
    h.textContent = t(lang, `bld.${b}.name`);
    if (lvl > 0) {
      const sm = el('small', 'level');
      sm.textContent = t(lang, 'ui.level', { level: lvl });
      h.append(sm);
    }
    const p = el('p');
    p.textContent = t(lang, `bld.${b}.desc`);
    card.append(h, p);
    const perk = BUILDINGS[b].perk;
    if (perk && lvl > 0) {
      const [step, minus] = PERK_STEP[perk];
      const now = el('p', 'perk');
      now.textContent = t(lang, minus ? 'island.perkNowMinus' : 'island.perkNow', { n: step * lvl });
      card.append(now);
    }
    const btn = el('button', 'buy');
    if (lvl >= BUILDING_MAX) {
      btn.textContent = t(lang, 'ui.max');
      btn.disabled = true;
    } else {
      const cost = buildCost(b, lvl);
      const costEl = el('div', 'cost');
      for (const m of MATERIALS) {
        if (cost[m] <= 0) continue;
        const c = el('span', s.materials[m] >= cost[m] ? '' : 'short', itemIcon(m));
        c.append(formatNumber(cost[m], lang));
        costEl.append(c);
      }
      card.append(costEl);
      btn.textContent = t(lang, lvl === 0 ? 'island.build' : 'ui.buy');
      btn.disabled = !canBuild(s, b);
      btn.addEventListener('click', () => act.build(b));
    }
    card.append(btn);
    info.append(card);
  }

  function render(s: GameState) {
    const st = s.islandStore[d];
    const k = [
      ISLAND_BUILDINGS[d].map((b) => buildingLevel(s, b)).join(),
      selected,
      st ? MATERIALS.map((m) => Math.floor(st[m])).join() : '',
      selected ? MATERIALS.map((m) => (s.materials[m] >= buildCost(selected!, buildingLevel(s, selected!))[m] ? 1 : 0)).join('') : '',
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
