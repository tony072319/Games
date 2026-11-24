import { DESTS, DOCK_LIGHT, canSail } from './boat';
import { DEST_IDS, MATERIALS, MATERIAL_WEIGHTS, MAX_LEVEL, PANEL_UPGRADES, type Materials, type UpgradeId } from './data';
import { autoRate, canBuy, chestCapacity, chestTotal, isMaxLevel, netRate, upgradeCost } from './economy';
import { emptyMaterials, type GameState } from './state';

/** What the net brings in per second, by material (island production not counted). */
export function incomePerSecond(s: GameState): Materials {
  const r = emptyMaterials();
  const rate = netRate(s);
  for (const m of MATERIALS) r[m] = rate * MATERIAL_WEIGHTS[m];
  return r;
}

/** Seconds until the cost is affordable at the current income; 0 if it already is; null if it never will be by waiting. */
export function etaSeconds(s: GameState, cost: Materials): number | null {
  const inc = incomePerSecond(s);
  let worst = 0;
  for (const m of MATERIALS) {
    const need = cost[m] - s.materials[m];
    if (need <= 0) continue;
    if (inc[m] <= 0) return null;
    worst = Math.max(worst, need / inc[m]);
  }
  return worst;
}

/** Ten minutes of waiting still counts as "almost there". */
export const SOON_SECONDS = 600;

export function affordState(s: GameState, cost: Materials): 'can' | 'soon' | 'far' {
  const eta = etaSeconds(s, cost);
  if (eta === 0) return 'can';
  if (eta !== null && eta <= SOON_SECONDS) return 'soon';
  return 'far';
}

export interface Effect {
  kind: 'percent' | 'hours' | 'unlock';
  value?: number;
  key?: string;
}

/** What the next level of an upgrade does, in words a player can compare. */
export function nextEffect(s: GameState, id: UpgradeId): Effect | null {
  if (isMaxLevel(s, id)) return null;
  const L = s.levels[id];
  if (id === 'net') return { kind: 'percent', value: Math.round((autoRate(L + 1) / autoRate(L) - 1) * 100) };
  if (id === 'storage') return { kind: 'hours', value: 1 };
  if (id === 'light') {
    const key = L + 1 === DOCK_LIGHT ? 'dock' : L + 1 === MAX_LEVEL.light ? 'end' : 'reach';
    return { kind: 'unlock', key: `upg.light.next.${key}` };
  }
  if (id === 'speed') return { kind: 'percent', value: 8 };
  return { kind: 'percent', value: Math.round(25 / (1 + 0.25 * (L - 1))) };
}

export type GoalTarget = 'flotsam' | 'chest' | 'boat' | 'net' | 'storage' | 'light' | 'map';

export interface Goal {
  key: string;
  params?: Record<string, string | number>;
  target: GoalTarget;
}

const TUTORIAL: Goal[] = [
  { key: 'goal.tapDrift', target: 'flotsam' },
  { key: 'goal.collectChest', target: 'chest' },
  { key: 'goal.mendNet', target: 'net' },
];
export const TUTORIAL_STEPS = TUTORIAL.length;

/** The one thing worth doing next. `name`/`time` params are upgrade ids and seconds; the UI turns them into words. */
export function nextGoal(s: GameState): Goal {
  if (s.stats.tutorial < TUTORIAL_STEPS) return TUTORIAL[s.stats.tutorial];
  if (s.boat.cargo) return { key: 'goal.unload', target: 'boat' };
  if (chestTotal(s.chest) >= chestCapacity(s) * 0.5) return { key: 'goal.collectChest', target: 'chest' };
  if (s.levels.light < DOCK_LIGHT) return { key: 'goal.dock', target: 'light' };
  if (!s.boat.built) return { key: 'goal.buildBoat', target: 'map' };
  if (DEST_IDS.some((d) => canSail(s, d) && DESTS[d])) return { key: 'goal.sail', target: 'map' };
  if (canBuy(s, 'light')) return { key: 'goal.mend', params: { name: 'light' }, target: 'light' };
  // Otherwise: the panel upgrade that will be affordable soonest.
  let best: UpgradeId | null = null;
  let bestEta = Infinity;
  for (const id of PANEL_UPGRADES) {
    if (isMaxLevel(s, id)) continue;
    const eta = etaSeconds(s, upgradeCost(id, s.levels[id], s));
    if (eta !== null && eta < bestEta) {
      best = id;
      bestEta = eta;
    }
  }
  if (best === null) return { key: 'goal.rest', target: 'light' };
  if (bestEta === 0) return { key: 'goal.mend', params: { name: best }, target: best as GoalTarget };
  return { key: 'goal.saveFor', params: { name: best, time: bestEta }, target: best as GoalTarget };
}
