import { T } from './tuning';
import { curioTuning } from './curios';
import type { GameState } from './state';

/** The starlight tree: three branches of four. Each star is one point; a reset costs a little starlight. */
export type TalentId =
  | 'net1' | 'chest2' | 'prod3' | 'autoChest'
  | 'voy1' | 'haul2' | 'isl3' | 'autoBoat'
  | 'cur1' | 'rare2' | 'drift3' | 'start3';

export interface Talent {
  id: TalentId;
  branch: 'fire' | 'sail' | 'star';
  tier: 1 | 2 | 3 | 4;
  cost: number;
}

const COST = T.TALENT_COSTS;
const branch = (b: Talent['branch'], ids: TalentId[]): Talent[] =>
  ids.map((id, i) => ({ id, branch: b, tier: (i + 1) as Talent['tier'], cost: COST[i] }));

export const TALENTS: Talent[] = [
  ...branch('fire', ['net1', 'chest2', 'prod3', 'autoChest']),
  ...branch('sail', ['voy1', 'haul2', 'isl3', 'autoBoat']),
  ...branch('star', ['cur1', 'rare2', 'drift3', 'start3']),
];
export const TALENT_BY_ID = Object.fromEntries(TALENTS.map((x) => [x.id, x])) as Record<TalentId, Talent>;

export const has = (s: GameState, id: TalentId) => s.talents.includes(id);

export function talentPoints(s: GameState): number {
  return s.starlight - s.talents.reduce((a, id) => a + TALENT_BY_ID[id].cost, 0);
}

/** Why a talent can't be learned yet, or null if it can. */
export function lockReason(s: GameState, id: TalentId): 'learned' | 'order' | 'fog' | 'aurora' | 'points' | null {
  const x = TALENT_BY_ID[id];
  if (has(s, id)) return 'learned';
  const prev = TALENTS.find((y) => y.branch === x.branch && y.tier === x.tier - 1);
  if (prev && !has(s, prev.id)) return 'order';
  if (x.tier === 3 && !s.reached.includes('fog')) return 'fog';
  if (x.tier === 4 && !s.reached.includes('aurora')) return 'aurora';
  if (talentPoints(s) < x.cost) return 'points';
  return null;
}

export const canLearn = (s: GameState, id: TalentId) => lockReason(s, id) === null;

export function learn(s: GameState, id: TalentId): boolean {
  if (!canLearn(s, id)) return false;
  s.talents.push(id);
  return true;
}

/** Starlight a reset costs: a tenth of what is spent on talents, at least one. */
export function resetCost(s: GameState): number {
  const spent = s.talents.reduce((a, id) => a + TALENT_BY_ID[id].cost, 0);
  return spent === 0 ? 0 : Math.max(1, Math.ceil(spent * T.RESET_SHARE));
}

/** Take every talent back; the points return, less the reset's small price. */
export function resetTalents(s: GameState): boolean {
  const cost = resetCost(s);
  if (cost === 0 || s.starlight < cost) return false;
  s.talents = [];
  s.starlight -= cost;
  return true;
}

// The star branch tunes how curios turn up.
curioTuning.chanceMult = (s) => (has(s, 'cur1') ? 1.5 : 1) * (has(s, 'rare2') ? 1.5 : 1);
curioTuning.lightRelief = (s) => (has(s, 'rare2') ? 2 : 0);
