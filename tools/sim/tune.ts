/**
 * Searches tuning.ts numbers that meet the design targets, using the simulator.
 * Build and run: npx rolldown tools/sim/tune.ts -o <dir>/tune.mjs -f esm && node <dir>/tune.mjs [iterations]
 * It prints the best set found; copy the numbers into src/core/tuning.ts by hand.
 */
import { T } from '../../src/core/tuning';
import { TALENTS } from '../../src/core/talents';
import { NORMAL, KEEN, simulate, type SimReport } from './sim';
import { formatReport } from './report';

type Knob = { key: keyof typeof T; lo: number; hi: number; log?: boolean };
const KNOBS: Knob[] = [
  { key: 'LIGHT_COST_MULT', lo: 1, hi: 200, log: true },
  { key: 'LIGHT_GROWTH', lo: 1.6, hi: 3.6 },
  { key: 'LATE_LIGHT_MULT', lo: 1, hi: 4 },
  { key: 'FOG_RATE', lo: 1.5, hi: 8 },
  { key: 'FOG_COST', lo: 4, hi: 200, log: true },
  { key: 'AURORA_RATE', lo: 3, hi: 40, log: true },
  { key: 'AURORA_COST', lo: 20, hi: 5000, log: true },
  { key: 'STAR_BONUS', lo: 0.003, hi: 0.03, log: true },
  { key: 'STAR_PASS_MULT', lo: 0.2, hi: 1.5 },
  { key: 'BOAT_BASE', lo: 0.08, hi: 0.8, log: true },
  { key: 'BUILDING_PCT', lo: 0.005, hi: 0.15, log: true },
  { key: 'NET_COST_GROWTH', lo: 1.12, hi: 1.8 },
  { key: 'TALENT_COST_SCALE', lo: 0.5, hi: 4, log: true },
  { key: 'RECYCLE_RATE', lo: 0.05, hi: 5, log: true },
];
const BASE_TALENT = [...T.TALENT_COSTS];

function apply(v: Record<string, number>) {
  for (const k of KNOBS) (T as Record<string, unknown>)[k.key] = v[k.key];
  for (const t of TALENTS) t.cost = Math.round(BASE_TALENT[t.tier - 1] * (v.TALENT_COST_SCALE ?? 1));
}

const range = (x: number | undefined, lo: number, hi: number) => {
  if (x === undefined || !Number.isFinite(x)) return 4;
  if (x < lo) return ((lo - x) / lo) ** 2;
  if (x > hi) return ((x - hi) / hi) ** 2;
  return 0;
};

export function loss(r: SimReport): number {
  let l = r.finished ? 0 : 20;
  const [a, b, c] = r.seas;
  l += 3 * range(a?.days, 4, 6) + 4 * range(b?.days, 14, 21) + 4 * range(c?.days, 28, 42);
  for (const [i, s] of r.seas.entries()) {
    l += 3 * range(s.buyRatio, i === 0 ? 0.9 : 0.6, 1);
    l += range(s.share.net, 0.35, 0.5) + range(s.share.boat, 0.3, 0.45) + range(s.share.islands, 0.1, 0.25);
    l += range(s.tapSeconds, 10, 15);
    for (const v of Object.values(s.leftover)) if ((v ?? 0) > 20) l += Math.log10((v ?? 0) / 20) ** 2;
    l += range(s.maxNet, 40, 50);
  }
  l += 3 * range(r.talentFill, 0.55, 0.7);
  if (r.broken) l += 50;
  return l;
}

function rnd(k: Knob, rng: () => number): number {
  return k.log ? Math.exp(Math.log(k.lo) + rng() * (Math.log(k.hi) - Math.log(k.lo))) : k.lo + rng() * (k.hi - k.lo);
}

function evaluate(v: Record<string, number>): { l: number; r: SimReport } {
  apply(v);
  const r = simulate(NORMAL, { seas: 3, maxDays: 90 });
  return { l: loss(r), r };
}

const iters = Number(process.argv[2] ?? 300);
let seed = 12345;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
let best: Record<string, number> = Object.fromEntries(KNOBS.map((k) => [k.key, T[k.key] as number]));
let bestScore = evaluate(best).l;
console.log('start loss', bestScore.toFixed(3));
for (let i = 0; i < iters; i++) {
  const v = { ...best };
  // Mostly nudge one or two knobs; sometimes jump.
  const n = rng() < 0.2 ? KNOBS.length : 1 + Math.floor(rng() * 2);
  for (let j = 0; j < n; j++) {
    const k = KNOBS[Math.floor(rng() * KNOBS.length)];
    if (rng() < 0.3) v[k.key] = rnd(k, rng);
    else {
      const f = 1 + (rng() - 0.5) * 0.4;
      v[k.key] = Math.min(k.hi, Math.max(k.lo, v[k.key] * f));
    }
  }
  const { l } = evaluate(v);
  if (l < bestScore) {
    bestScore = l;
    best = v;
    console.log(`#${i} loss ${l.toFixed(3)}`);
  }
}
const { r } = evaluate(best);
console.log(JSON.stringify(Object.fromEntries(Object.entries(best).map(([k, x]) => [k, Number(x.toPrecision(3))])), null, 1));
console.log(formatReport(r));
apply(best);
console.log(formatReport(simulate(KEEN, { seas: 3, maxDays: 90 })));
