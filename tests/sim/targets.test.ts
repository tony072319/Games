import { describe, expect, test } from 'vitest';
import { IDEAL, KEEN, NORMAL, simulate } from '../../tools/sim/sim';
import { formatReport } from '../../tools/sim/report';

// Design targets (docs/superpowers/specs/2026-11-25-balance-design.md §2), checked on the real rules.
const normal = simulate(NORMAL, { seas: 3, maxDays: 120 });
const keen = simulate(KEEN, { seas: 3, maxDays: 120 });

describe('pacing for a normal player (3 visits a day)', () => {
  test('report', () => {
    console.log(formatReport(normal));
    console.log(formatReport(keen));
  });
  test('all three seas are finished', () => expect(normal.finished).toBe(true));
  test('the dusk sea takes 4–6 days', () => {
    expect(normal.seas[0].days).toBeGreaterThanOrEqual(4);
    expect(normal.seas[0].days).toBeLessThanOrEqual(6);
  });
  test('the fog sea takes 2–3 weeks', () => {
    expect(normal.seas[1]?.days).toBeGreaterThanOrEqual(14);
    expect(normal.seas[1]?.days).toBeLessThanOrEqual(21);
  });
  test('the aurora sea takes 4–6 weeks', () => {
    expect(normal.seas[2]?.days).toBeGreaterThanOrEqual(28);
    expect(normal.seas[2]?.days).toBeLessThanOrEqual(42);
  });
  // Lighthouse parts, decorations and growing the island give the long later seas something to buy.
  test('most visits have something to buy', () => {
    const floor = [0.85, 0.85, 0.75];
    normal.seas.forEach((s, i) => expect(s.buyRatio, s.sea).toBeGreaterThanOrEqual(floor[i]));
  });
});

describe('where income comes from', () => {
  for (const [i, sea] of ['dusk', 'fog', 'aurora'].entries())
    test(`${sea}: net 35–50%, boat 30–45%, islands 10–25%`, () => {
      const s = normal.seas[i]!.share;
      expect(s.net, 'net').toBeGreaterThanOrEqual(0.35);
      expect(s.net, 'net').toBeLessThanOrEqual(0.5);
      expect(s.boat, 'boat').toBeGreaterThanOrEqual(0.3);
      expect(s.boat, 'boat').toBeLessThanOrEqual(0.45);
      expect(s.islands, 'islands').toBeGreaterThanOrEqual(0.1);
      expect(s.islands, 'islands').toBeLessThanOrEqual(0.25);
    });
});

describe('choices that matter', () => {
  // The drift talent doubles taps on purpose, so the target is checked on the base value.
  test('a tap is worth 10–15 s of income in every sea (before the tap talent)', () => {
    for (const s of normal.seas) {
      const base = s.tapSeconds / (s.tapDoubled ? 2 : 1);
      expect(base, s.sea).toBeGreaterThanOrEqual(10);
      expect(base, s.sea).toBeLessThanOrEqual(15);
    }
  });
  test('no material piles up beyond 20× the last lighthouse step', () => {
    for (const s of normal.seas) for (const [m, v] of Object.entries(s.leftover)) expect(v ?? 0, `${s.sea} ${m}`).toBeLessThanOrEqual(20);
  });
  test('the net reaches 40 in every sea', () => {
    for (const s of normal.seas) expect(s.maxNet, s.sea).toBeGreaterThanOrEqual(40);
  });
  test('three seas buy 55–70% of the talent tree', () => {
    expect(normal.talentFill).toBeGreaterThanOrEqual(0.55);
    expect(normal.talentFill).toBeLessThanOrEqual(0.7);
  });
});

describe('robust', () => {
  test('an ideal player for a week never breaks the numbers', () => expect(simulate(IDEAL, { seas: 3, maxDays: 7 }).broken).toBe(false));
  test('a keen player is faster than a normal one', () => expect(keen.seas[0].days).toBeLessThan(normal.seas[0].days));
});

describe('a new sea starts quickly (passing the light is a fresh start, not a wall)', () => {
  // When each milestone is first seen after arriving in a sea, in hours (normal player).
  const reach: Record<string, Record<string, number>> = {};
  let sea = '';
  let at = 0;
  simulate(NORMAL, {
    seas: 3,
    maxDays: 120,
    onVisit: (s, now) => {
      if (s.sea !== sea) {
        sea = s.sea;
        at = now;
      }
      const r = (reach[s.sea] ??= {});
      if (s.levels.net >= 5) r.net5 ??= (now - at) / 3600e3;
      if (s.levels.light >= 3) r.light3 ??= (now - at) / 3600e3;
    },
  });
  for (const id of ['fog', 'aurora'])
    test(`${id}: net 5 and lighthouse 3 by the next visit (within 12 hours)`, () => {
      expect(reach[id]?.net5, 'net 5').toBeLessThanOrEqual(12);
      expect(reach[id]?.light3, 'lighthouse 3').toBeLessThanOrEqual(12);
    });
});

describe('where the light shines is a real choice', () => {
  // A player who keeps the light on the shipping route finishes about as fast as one on the fishing grounds.
  const route = simulate({ ...NORMAL, name: 'route', focus: 'route' }, { seas: 3, maxDays: 120 });
  test('route and fishing grounds finish within 15% of each other', () => {
    const days = (r: typeof normal) => r.seas.reduce((a, x) => a + x.days, 0);
    expect(route.finished).toBe(true);
    expect(Math.abs(days(route) / days(normal) - 1)).toBeLessThanOrEqual(0.15);
  });
});
