/**
 * Headless player simulator on the game's real rules (src/core). It opens the game at the times a
 * profile says, does what a sensible player would (collect, unload, buy, sail, pass the light), and
 * reports pacing and where income came from. Used to tune src/core numbers against the design targets.
 */
import { DESTS, buildBoat, buildBoat2, canBuildBoat, canBuildBoat2, freeBoat, reachable, startVoyage, unloadBoat, voyageMs } from '../../src/core/boat';
import { BOAT_UPGRADES, MATERIALS, PANEL_UPGRADES, type DestId, type Materials, type SeaId, type UpgradeId } from '../../src/core/data';
import { buyUpgrade, canBuy, priceOf, upgradeCost } from '../../src/core/economy';
import { pickMaterial } from '../../src/core/flotsam';
import { ISLAND_BUILDINGS, buildCost, canBuild, construct } from '../../src/core/islands';
import { canPassLight, nextSea, passLight } from '../../src/core/seas';
import { collectChest, tick } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';
import { TALENTS, canLearn, learn } from '../../src/core/talents';
import { incomePerSecond } from '../../src/core/advice';
import { tapValue } from './taps';
import { DECOR_IDS, canDecorate, decorCost, decorate } from '../../src/core/decor';
import { canExpand, expand, landCost } from '../../src/core/land';
import { canDeliver, deliver } from '../../src/core/commission';
import { SKY_CYCLE_MS } from '../../src/core/daycycle';

const DAY = 24 * 3600 * 1000;
const MIN = 60 * 1000;

export interface Profile {
  name: string;
  /** Minutes after midnight when the player opens the game, each day. */
  checks: number[];
  /** Minutes each visit lasts. */
  visit: number;
  tapsPerCheck: number;
}

export const IDEAL: Profile = { name: 'ideal', checks: Array.from({ length: 144 }, (_, i) => i * 10), visit: 2, tapsPerCheck: 3 };
export const NORMAL: Profile = { name: 'normal', checks: [8 * 60, 13 * 60, 21 * 60], visit: 3, tapsPerCheck: 5 };
export const KEEN: Profile = { name: 'keen', checks: Array.from({ length: 16 }, (_, i) => (8 + i) * 60), visit: 3, tapsPerCheck: 10 };

export type Source = 'net' | 'boat' | 'islands' | 'taps';

export interface SeaReport {
  sea: SeaId;
  /** Days spent in this sea. */
  days: number;
  /** Day (since this sea began) each light level was reached; index = level. */
  lightAt: number[];
  /** Share of visits where at least one upgrade was bought. */
  buyRatio: number;
  share: Record<Source, number>;
  /** Materials left when the light was passed, as a multiple of the last lighthouse step's cost. */
  leftover: Partial<Materials>;
  maxNet: number;
  /** A tap's value in seconds of total income, at the end of the sea. */
  tapSeconds: number;
  /** The tap talent (doubles taps) was learned when this was measured. */
  tapDoubled: boolean;
  starlightAfter: number;
}

export interface SimReport {
  profile: string;
  seas: SeaReport[];
  /** Share of the whole talent tree's price that was learned by the end. */
  talentFill: number;
  finished: boolean;
  /** Any material ever went negative or non-finite. */
  broken: boolean;
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const total = (m: Materials) => MATERIALS.reduce((a, k) => a + m[k], 0);

/** Buy everything sensible that can be paid for right now; returns how many things were bought. */
function shop(s: GameState): number {
  let bought = 0;
  for (let guard = 0; guard < 500; guard++) {
    if (canBuy(s, 'light') && buyUpgrade(s, 'light')) {
      bought++;
      continue;
    }
    if ((canBuildBoat(s) && buildBoat(s)) || (canBuildBoat2(s) && buildBoat2(s))) {
      bought++;
      continue;
    }
    // Island buildings, cheapest first.
    const blds = s.discovered.flatMap((d) => ISLAND_BUILDINGS[d]).filter((b) => canBuild(s, b));
    blds.sort((a, b) => total(buildCost(a, s.buildings[a] ?? 0, s)) - total(buildCost(b, s.buildings[b] ?? 0, s)));
    if (blds[0] && construct(s, blds[0], s.lastActiveAt)) {
      bought++;
      continue;
    }
    // Then the cheapest upgrade among the net, chest, recycler and boat.
    const ups: UpgradeId[] = [...PANEL_UPGRADES.filter((u) => u !== 'light'), ...(s.boat.built ? BOAT_UPGRADES : [])];
    const ok = ups.filter((u) => canBuy(s, u));
    ok.sort((a, b) => total(priceOf(s, a)) - total(priceOf(s, b)));
    if (ok[0] && buyUpgrade(s, ok[0])) {
      bought++;
      continue;
    }
    // Islanders' requests (friends load more onto the boat).
    const ask = s.discovered.find((d) => canDeliver(s, d));
    if (ask && deliver(s, ask)) {
      bought++;
      continue;
    }
    // Last, decorations and new ground with what is left, cheapest first (they only change the picture).
    const looks: { cost: number; buy: () => boolean }[] = DECOR_IDS.filter((d) => canDecorate(s, d)).map((d) => ({ cost: total(decorCost(s, d)!), buy: () => decorate(s, d) }));
    if (canExpand(s)) looks.push({ cost: total(landCost(s)!), buy: () => expand(s) });
    looks.sort((a, b) => a.cost - b.cost);
    if (looks[0]?.buy()) {
      bought++;
      continue;
    }
    break;
  }
  return bought;
}

function learnTalents(s: GameState) {
  for (let more = true; more; ) {
    more = false;
    const can = TALENTS.filter((x) => canLearn(s, x.id)).sort((a, b) => a.cost - b.cost);
    if (can[0] && learn(s, can[0].id)) more = true;
  }
}

/** Where to send the boat: somewhere new first, glow when the lighthouse needs it, else the longest trip that is back in time. */
function chooseDest(s: GameState, untilNext: number): DestId | null {
  const ok = (Object.keys(DESTS) as DestId[]).filter((d) => reachable(s, d));
  if (!ok.length) return null;
  const fresh = ok.find((d) => !s.discovered.includes(d));
  if (fresh) return fresh;
  const needGlow = upgradeCost('light', s.levels.light, s).glow > s.materials.glow;
  if (needGlow && ok.includes('firefly')) return 'firefly';
  const fit = ok.filter((d) => voyageMs(s, d) <= untilNext).sort((a, b) => voyageMs(s, b) - voyageMs(s, a));
  return fit[0] ?? ok.sort((a, b) => voyageMs(s, a) - voyageMs(s, b))[0];
}

export function simulate(profile: Profile, opts: { seas?: number; maxDays?: number; seed?: number } = {}): SimReport {
  // Core calls that default to Math.random (voyage rewards) must repeat too: seed it for the run.
  const realRandom = Math.random;
  Math.random = mulberry((opts.seed ?? 7) + 1);
  try {
    return run(profile, opts);
  } finally {
    Math.random = realRandom;
  }
}

function run(profile: Profile, opts: { seas?: number; maxDays?: number; seed?: number }): SimReport {
  const seasWanted = opts.seas ?? 3;
  const maxDays = opts.maxDays ?? 200;
  const rng = mulberry(opts.seed ?? 7);
  const t0 = Date.UTC(2026, 0, 1, 0, 0, 0);
  const s = newGame(t0, 'zh');
  s.stats.tutorial = 3;
  const seas: SeaReport[] = [];
  let seaStart = t0;
  let lightAt = [0, 0];
  let visits = 0;
  let buyVisits = 0;
  let src: Record<Source, number> = { net: 0, boat: 0, islands: 0, taps: 0 };
  let maxNet = 1;
  let broken = false;
  const times: number[] = [];
  for (let d = 0; d < maxDays; d++) for (const c of profile.checks) times.push(t0 + d * DAY + c * MIN);

  const closeSea = (now: number) => {
    const sum = Object.values(src).reduce((a, b) => a + b, 0) || 1;
    const last = upgradeCost('light', 9, s);
    const leftover: Partial<Materials> = {};
    for (const m of MATERIALS) if (last[m] > 0) leftover[m] = s.materials[m] / last[m];
    const inc = total(incomePerSecond(s));
    seas.push({
      sea: s.sea,
      days: (now - seaStart) / DAY,
      lightAt: [...lightAt],
      buyRatio: visits ? buyVisits / visits : 0,
      share: { net: src.net / sum, boat: src.boat / sum, islands: src.islands / sum, taps: src.taps / sum },
      leftover,
      maxNet,
      // Measured in daylight (cycle start), so night's bonus does not skew it.
      tapSeconds: inc > 0 ? tapValue(s, now - (now % SKY_CYCLE_MS)) / inc : 0,
      tapDoubled: s.talents.includes('drift3'),
      starlightAfter: 0,
    });
  };

  for (let i = 0; i < times.length && seas.length < seasWanted; i++) {
    const now = times[i];
    const untilNext = (times[i + 1] ?? now + DAY) - now;
    tick(s, now);
    visits++;
    let bought = 0;
    // A visit: a few rounds of collecting, unloading, tapping and buying, minute by minute.
    for (let m = 0; m <= profile.visit; m++) {
      const at = now + m * MIN;
      if (m > 0) tick(s, at);
      src.net += total(collectChest(s));
      for (const n of [0, 1] as const) {
        const cargo = unloadBoat(s, n);
        if (cargo) {
          const isl = total(cargo.fromIsland);
          src.islands += isl;
          src.boat += total(cargo.haul) - isl;
        }
      }
      if (m === 0)
        for (let k = 0; k < profile.tapsPerCheck; k++) {
          const v = tapValue(s, at);
          s.materials[pickMaterial(rng())] += v;
          src.taps += v;
        }
      learnTalents(s);
      // The last sea has nowhere to pass the light to: it is done when its lighthouse is mended.
      if (s.levels.light >= 10 && nextSea(s) === null && seas.length === seasWanted - 1) {
        closeSea(at);
        break;
      }
      if (canPassLight(s)) {
        closeSea(at);
        const before = s.starlight;
        passLight(s, at);
        seas[seas.length - 1].starlightAfter = s.starlight - before;
        if (seas.length >= seasWanted) break;
        seaStart = at;
        lightAt = [0, s.levels.light > 1 ? 0 : 0];
        visits = buyVisits = 0;
        src = { net: 0, boat: 0, islands: 0, taps: 0 };
        maxNet = 1;
      }
      const lightBefore = s.levels.light;
      bought += shop(s);
      for (let L = lightBefore + 1; L <= s.levels.light; L++) lightAt[L] = (at - seaStart) / DAY;
      maxNet = Math.max(maxNet, s.levels.net);
      for (let n = freeBoat(s); n !== null; n = freeBoat(s)) {
        const dest = chooseDest(s, untilNext);
        if (!dest || !startVoyage(s, dest, at, Math.random, n)) break;
      }
      if (MATERIALS.some((k) => !Number.isFinite(s.materials[k]) || s.materials[k] < -1e-6)) broken = true;
    }
    if (bought > 0) buyVisits++;
  }
  const finished = seas.length >= seasWanted;
  const tree = TALENTS.reduce((a, x) => a + x.cost, 0);
  const spent = s.talents.reduce((a, id) => a + (TALENTS.find((x) => x.id === id)?.cost ?? 0), 0);
  return { profile: profile.name, seas, talentFill: spent / tree, finished, broken };
}
