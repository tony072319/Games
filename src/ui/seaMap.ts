import { T } from '../core/tuning';
import { FRIEND_MAX, canDeliver, commissionFor, friendOf } from '../core/commission';
import { boatCost, canBuildBoat, canSail, reachable, voyageHaul, voyageMs, needLightHere, seeLight, BOAT2_COST, canBuildBoat2, freeBoat } from '../core/boat';
import { BOAT_UPGRADES, DEST_IDS, MATERIALS, SEA_IDS, type DestId, type SeaId, type UpgradeId } from '../core/data';
import type { GameState, Lang } from '../core/state';
import { formatNumber, t } from '../i18n';
import { boatSvg, islandIcon, itemIcon } from './art';
import { upgradeCard } from './card';
import { affordState } from '../core/advice';
import { etaText } from './upgrades';
import { el } from './dom';
import { formatDuration } from './offlinePopup';
import { createPanel } from './upgrades';
import { islandTier } from '../core/milestones';
import { destDesc, destName } from './names';

/** Map layout: 360x360 chart, lighthouse at the centre. */
const C = 180;
const NODE: Record<DestId, { angle: number; r: number }> = {
  wreck: { angle: -35, r: 70 },
  gullrock: { angle: 205, r: 104 },
  oldlight: { angle: 115, r: 138 },
  firefly: { angle: 315, r: 164 },
};
const pos = (d: DestId) => {
  const a = (NODE[d].angle * Math.PI) / 180;
  return { x: C + Math.cos(a) * NODE[d].r, y: C + Math.sin(a) * NODE[d].r };
};
/** How far the light reaches on the chart at a light level. */
const reach = (light: number) => 30 + light * 24;

export interface SeaMapActions {
  now(): number;
  sail(d: DestId): void;
  land(d: DestId): void;
  build(): void;
  /** Go to another sea you've reached. */
  goToSea(id: SeaId): void;
  /** Build the second boat (from the fog sea on). */
  build2(): void;
  /** Bring an island its people's request. */
  deliver(d: DestId): void;
  buy(id: UpgradeId): void;
  close(): void;
}

export interface SeaMap {
  el: HTMLElement;
  update(state: GameState): void;
}

export function createSeaMap(lang: Lang, state: GameState, act: SeaMapActions): SeaMap {
  const overlay = el('div', 'overlay sheet-overlay');
  const box = el('div', 'seamap');
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  const head = el('div', 'map-head');
  const title = el('h2');
  title.textContent = `${t(lang, 'map.title')} · ${t(lang, `sea.${state.sea}`)}`;
  const close = el('button', 'btn-ghost map-close');
  close.textContent = t(lang, 'map.close');
  close.addEventListener('click', act.close);
  // Once you've reached a second sea: switch between them here.
  if (state.reached.length > 1) {
    const seas = el('div', 'sea-chips');
    seas.setAttribute('role', 'group');
    seas.setAttribute('aria-label', t(lang, 'seas.short'));
    for (const id of SEA_IDS.filter((x) => state.reached.includes(x))) {
      const chip = el('button', id === state.sea ? 'chip on' : 'chip');
      chip.type = 'button';
      chip.dataset.sea = id;
      chip.textContent = t(lang, `sea.${id}`);
      chip.setAttribute('aria-pressed', String(id === state.sea));
      chip.addEventListener('click', () => act.goToSea(id));
      seas.append(chip);
    }
    head.append(seas);
  }
  head.append(title, close);

  const chart = el('div', 'chart');
  const info = el('div', 'map-info');
  const bottom = el('div', 'map-bottom');
  box.append(head, chart, info, bottom);
  overlay.append(box);

  let selected: DestId | null = null;
  const boatPanel = createPanel(lang, act.buy, BOAT_UPGRADES);
  let lastKey = '';

  function chartSvg(s: GameState): string {
    const r = reach(s.levels.light);
    let path = '';
    for (const b of [s.boat, s.boat2]) {
      const v = b.voyage;
      if (!v || v.sea !== s.sea) continue;
      const p = pos(v.dest);
      const f = Math.max(0, Math.min(1, (act.now() - v.departAt) / (v.returnAt - v.departAt)));
      // Out and back: the boat reaches the island halfway through the trip.
      const k = f < 0.5 ? f * 2 : 2 - f * 2;
      const bx = C + (p.x - C) * k;
      const by = C + (p.y - C) * k;
      path += `<line x1="${C}" y1="${C}" x2="${p.x}" y2="${p.y}" stroke="#ffd98a" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="4 5"/>
<g transform="translate(${bx.toFixed(1)} ${by.toFixed(1)})"><circle r="10" fill="url(#mglow)"/><path d="M-6 2 L6 2 L4 5 L-4 5 Z" fill="#8a5a3a"/><line x1="0" y1="2" x2="0" y2="-7" stroke="#5a3a26" stroke-width="1.2"/><path d="M0 -7 L6 0 L0 0 Z" fill="#efe6d6"/></g>`;
    }
    return `<svg viewBox="0 0 360 360" aria-hidden="true">
<defs>
  <radialGradient id="mlight"><stop offset="0" stop-color="#3a4a7a" stop-opacity="0.9"/><stop offset="0.85" stop-color="#26305e" stop-opacity="0.7"/><stop offset="1" stop-color="#26305e" stop-opacity="0"/></radialGradient>
  <radialGradient id="mglow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.7"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
</defs>
<rect width="360" height="360" rx="14" fill="#070a1a"/>
<g stroke="#1b2244" stroke-width="0.6">${[60, 120, 180, 240, 300].map((x) => `<line x1="${x}" y1="0" x2="${x}" y2="360"/><line x1="0" y1="${x}" x2="360" y2="${x}"/>`).join('')}</g>
<circle cx="${C}" cy="${C}" r="${r}" fill="url(#mlight)" class="map-light"/>
<circle cx="${C}" cy="${C}" r="${r}" fill="none" stroke="#ffd98a" stroke-opacity="0.25" stroke-dasharray="2 6"/>
${path}
<g transform="translate(${C} ${C})"><circle r="14" fill="url(#mglow)"/><path d="M-3 8 L-2 -6 L2 -6 L3 8 Z" fill="#e6dbd0"/><rect x="-3" y="-10" width="6" height="4" fill="#ffd98a"/></g>
</svg>`;
  }

  function nodes(s: GameState) {
    for (const d of DEST_IDS) {
      const p = pos(d);
      const lit = s.levels.light >= seeLight(s, d);
      const found = s.discovered.includes(d);
      const b = el('button', `node ${lit ? (found ? 'found' : 'unknown') : 'dark'}${selected === d ? ' sel' : ''}${found && islandTier(s, d) > 0 ? ' flourish' : ''}`);
      b.style.left = `${(p.x / 360) * 100}%`;
      b.style.top = `${(p.y / 360) * 100}%`;
      b.dataset.dest = d;
      if (found) {
        b.innerHTML = islandIcon(d);
        const label = el('span');
        label.textContent = destName(lang, s.sea, d);
        b.append(label);
      } else if (lit) {
        b.textContent = '?';
        b.setAttribute('aria-label', t(lang, 'map.unknown'));
      } else {
        // Out of the light: a hint on the chart, nothing to press.
        b.tabIndex = -1;
        b.setAttribute('aria-hidden', 'true');
      }
      b.addEventListener('click', () => {
        selected = d;
        lastKey = '';
        render(s);
      });
      chart.append(b);
    }
  }

  function renderInfo(s: GameState) {
    info.replaceChildren();
    if (!s.boat.built) {
      const p = el('p');
      p.textContent = t(lang, s.levels.light >= 3 ? 'map.buildDesc' : 'map.locked');
      info.append(p);
      return;
    }
    // Each boat's whereabouts (named when there are two).
    const two = s.boat2.built;
    for (const [n, b] of [s.boat, s.boat2].entries()) {
      if (!b.built) continue;
      const who = two ? t(lang, n === 0 ? 'map.boat1' : 'map.boat2') : '';
      const v = b.voyage;
      if (v) {
        const p = el('p', 'status');
        p.textContent = who + t(lang, 'map.away', { name: v.sea !== s.sea || s.discovered.includes(v.dest) ? destName(lang, v.sea, v.dest) : t(lang, 'map.unknown'), time: formatDuration(Math.max(60, (v.returnAt - act.now()) / 1000), lang) });
        info.append(p);
      } else if (b.cargo) {
        const p = el('p', 'status');
        p.textContent = who + t(lang, 'map.waiting');
        info.append(p);
      }
    }
    if (!selected) {
      if (freeBoat(s) !== null) {
        const p = el('p');
        p.textContent = t(lang, 'map.pick');
        info.append(p);
      }
      return;
    }
    const d = selected;
    const lit = s.levels.light >= seeLight(s, d);
    const found = s.discovered.includes(d);
    const h = el('h3');
    h.textContent = lit ? (found ? destName(lang, s.sea, d) : t(lang, 'map.unknown')) : '…';
    const p = el('p');
    p.textContent = lit ? (found ? destDesc(lang, s.sea, d) : t(lang, 'map.unknownDesc')) : t(lang, 'map.dark');
    info.append(h, p);
    if (found) info.append(askRow(s, d));
    if (lit && s.boat.built && !reachable(s, d)) {
      // The fog sea: the island shows, but the boat needs more light to find the way.
      const fog = el('p', 'status');
      fog.textContent = t(lang, 'map.fogged', { n: needLightHere(s, d) });
      info.append(fog);
    }
    if (!reachable(s, d)) return;
    const row = el('div', 'sail-row');
    if (found) {
      const land = el('button', 'btn-ghost land');
      land.textContent = t(lang, 'island.land');
      land.addEventListener('click', () => act.land(d));
      row.append(land);
    }
    // While no boat can go (both out, or cargo waiting) the status above says why: no trip time or sail button here.
    const canGo = canSail(s, d, 0) || canSail(s, d, 1);
    if (!canGo) {
      if (row.childElementCount) info.append(row);
      return;
    }
    const time = el('span');
    time.textContent = t(lang, 'map.time', { time: formatDuration(voyageMs(s, d) / 1000, lang) });
    row.append(time);
    if (found) {
      const haul = voyageHaul(s, d);
      const hs = el('span', 'haul');
      hs.append(t(lang, 'map.haul'));
      for (const m of MATERIALS) {
        if (haul[m] < 1) continue;
        const it = el('span', 'mat', itemIcon(m));
        it.append(formatNumber(haul[m], lang));
        hs.append(it);
      }
      row.append(hs);
    }
    const go = el('button', 'buy sail');
    go.textContent = t(lang, 'map.sail');
    go.addEventListener('click', () => act.sail(d));
    row.append(go);
    info.append(row);
  }

  /** The island's people: friendship hearts, and what they ask for with a button to bring it. */
  function askRow(s: GameState, d: DestId): HTMLElement {
    const row = el('div', 'ask-row');
    const hearts = el('span', 'hearts');
    const f = friendOf(s, d);
    hearts.textContent = '♥'.repeat(f) + '♡'.repeat(FRIEND_MAX - f);
    hearts.title = t(lang, 'ask.friend', { n: f, max: FRIEND_MAX });
    const c = commissionFor(s, d);
    const text = el('span', 'ask-text');
    text.textContent = c ? t(lang, `ask.${d}`, { n: formatNumber(c.amount, lang), mat: t(lang, `mat.${c.material}`) }) : t(lang, 'ask.done');
    row.append(hearts, text);
    if (c) {
      const give = el('button', 'buy deliver');
      give.type = 'button';
      give.textContent = t(lang, 'ask.deliver');
      give.disabled = !canDeliver(s, d);
      give.addEventListener('click', () => act.deliver(d));
      row.append(give);
    }
    return row;
  }

  let bottomKey = '';
  function renderBottom(s: GameState) {
    if (s.boat.built) {
      // From the fog sea on, a second boat can be built (its card sits above the boat upgrades).
      const want2 = !s.boat2.built && s.reached.includes('fog');
      const key2 = want2 ? `2:${canBuildBoat2(s)}:${MATERIALS.map((m) => (s.materials[m] >= T.BOAT2_COST_MULT * BOAT2_COST[m] ? 1 : 0)).join('')}` : 'none';
      if (key2 !== bottomKey || bottom.lastChild !== boatPanel.el) {
        bottomKey = key2;
        const cost = { ...BOAT2_COST };
        for (const m of MATERIALS) cost[m] *= T.BOAT2_COST_MULT;
        const card2 = want2
          ? upgradeCard(lang, {
              data: ['card', 'build-boat2'],
              thumb: boatSvg(true, 3),
              title: t(lang, 'map.build2'),
              desc: t(lang, 'map.build2Desc'),
              cost,
              have: s.materials,
              buyLabel: t(lang, 'ui.buy'),
              canBuy: canBuildBoat2(s),
              state: affordState(s, cost),
              eta: etaText(s, cost, lang),
              onBuy: act.build2,
              open: true,
              alwaysOpen: true,
            })
          : null;
        bottom.replaceChildren(...(card2 ? [card2] : []), boatPanel.el);
      }
      boatPanel.update(s);
      return;
    }
    // Rebuild the build-boat card only when it would look different, so its button stays tappable.
    const key = `${s.levels.light}:${MATERIALS.map((m) => (s.materials[m] >= boatCost()[m] ? 1 : 0)).join('')}`;
    if (key === bottomKey) return;
    bottomKey = key;
    bottom.replaceChildren();
    if (s.levels.light < 3) return;
    bottom.append(
      upgradeCard(lang, {
        data: ['card', 'build-boat'],
        thumb: boatSvg(false, 1),
        title: t(lang, 'map.build'),
        desc: t(lang, 'map.buildDesc'),
        cost: boatCost(),
        have: s.materials,
        buyLabel: t(lang, 'ui.buy'),
        canBuy: canBuildBoat(s),
        state: affordState(s, boatCost()),
        eta: etaText(s, boatCost(), lang),
        onBuy: act.build,
        open: true,
        alwaysOpen: true,
      }),
    );
  }

  function render(s: GameState) {
    // Rebuild only when something visible changed (the boat's position updates every few seconds).
    const v = s.boat.voyage;
    const v2 = s.boat2.voyage;
    const key = [s.levels.light, s.boat.built, s.boat.cargo?.dest, v?.dest, v || v2 ? Math.floor(act.now() / 3000) : 0, s.boat2.built, s.boat2.cargo?.dest, v2?.dest, s.discovered.join(), selected, s.levels.speed, s.levels.cargo, canBuildBoat(s), JSON.stringify(s.friend), selected ? canDeliver(s, selected) : ''].join('|');
    if (key !== lastKey) {
      lastKey = key;
      chart.innerHTML = chartSvg(s);
      nodes(s);
      renderInfo(s);
    }
    renderBottom(s);
  }

  render(state);
  return { el: overlay, update: render };
}
