import { T } from '../../src/core/tuning';
import { describe, expect, test } from 'vitest';
import { TALENTS, TALENT_BY_ID, canLearn, has, learn, resetCost, resetTalents, talentPoints } from '../../src/core/talents';
import { buildBoat, startVoyage, voyageHaul, voyageMs } from '../../src/core/boat';
import { passLight } from '../../src/core/seas';
import { chestCapacity, netRate, tapYield } from '../../src/core/economy';
import { islandRates } from '../../src/core/islands';
import { applyOffline, tick } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';

/** Dice for a trip with no luck, so timings are exact. */
const quiet = () => 0.99;

const H = 3_600_000;
const withStars = (n: number): GameState => {
  const s = newGame(0, 'zh');
  s.starlight = n;
  return s;
};

describe('learning', () => {
  test('12 talents in 3 branches of 4, priced by tier', () => {
    expect(TALENTS).toHaveLength(12);
    expect(TALENTS.filter((x) => x.branch === 'fire').map((x) => x.cost)).toEqual([...T.TALENT_COSTS]);
  });
  test('in order, with points, and deeper ones need farther seas', () => {
    const s = withStars(100);
    expect(canLearn(s, 'chest2')).toBe(false); // net1 first
    expect(learn(s, 'net1')).toBe(true);
    expect(talentPoints(s)).toBe(100 - T.TALENT_COSTS[0]);
    expect(learn(s, 'chest2')).toBe(true);
    expect(canLearn(s, 'prod3')).toBe(false); // needs the fog sea
    s.reached.push('fog');
    expect(learn(s, 'prod3')).toBe(true);
    expect(canLearn(s, 'autoChest')).toBe(false); // needs the aurora sea
    s.reached.push('aurora');
    expect(learn(s, 'autoChest')).toBe(true);
    expect(talentPoints(s)).toBe(100 - T.TALENT_COSTS.reduce((a, b) => a + b, 0));
  });
  test('not enough points', () => {
    const s = withStars(1);
    expect(learn(s, 'net1')).toBe(false);
  });
  test('reset gives the points back, less its small price', () => {
    const s = withStars(10);
    learn(s, 'net1');
    learn(s, 'autoBoat');
    const cost = resetCost(s);
    resetTalents(s);
    expect(s.talents).toEqual([]);
    expect(talentPoints(s)).toBe(10 - cost);
  });
});

describe('effects', () => {
  test('net, chest, production, voyage, haul, islands, tap', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
    s.discovered.push('firefly'); // not a new game: no trial trip
    const net = netRate(s);
    learn(s, 'net1');
    expect(netRate(s)).toBeCloseTo(net * 1.15);
    const cap = chestCapacity(s);
    learn(s, 'chest2');
    expect(chestCapacity(s) / netRate(s)).toBeCloseTo(cap / netRate(s) + 2 * 3600, 0);
    const net2 = netRate(s);
    learn(s, 'prod3');
    expect(netRate(s)).toBeCloseTo(net2 * 1.2);

    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e9;
    s.levels.light = 3;
    buildBoat(s);
    const ms = voyageMs(s, 'wreck');
    learn(s, 'autoBoat');
    learn(s, 'voy1');
    expect(voyageMs(s, 'wreck')).toBeCloseTo(ms * 0.85);
    const haul = voyageHaul(s, 'wreck').metal;
    learn(s, 'haul2');
    expect(voyageHaul(s, 'wreck').metal).toBeCloseTo(haul * 1.3);
    s.discovered.push('wreck');
    s.buildings.dismantler = 1;
    const isl = islandRates(s, 'wreck').metal;
    learn(s, 'isl3');
    expect(islandRates(s, 'wreck').metal).toBeCloseTo(isl * 1.3);

    learn(s, 'cur1');
    learn(s, 'rare2');
    const tap = tapYield(s, 0);
    learn(s, 'drift3');
    expect(has(s, 'drift3')).toBe(true);
    expect(tapYield(s, 0)).toBe(tap * 2);
  });

  test('a new sea starts with the lighthouse at 3', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
    for (const id of ['cur1', 'rare2', 'drift3', 'start3'] as const) learn(s, id);
    s.reached = ['dusk'];
    s.levels.light = 10;
    passLight(s, 0);
    expect(s.levels.light).toBe(3);
  });

  test('auto chest: a full chest empties itself while the game is open', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
    for (const id of ['net1', 'chest2', 'prod3', 'autoChest'] as const) learn(s, id);
    s.chest.wood = chestCapacity(s);
    s.lastActiveAt = 0;
    tick(s, 1000);
    expect(s.materials.wood).toBeGreaterThan(0);
    expect(s.chest.wood).toBeLessThan(1);
  });

  test('auto boat: keeps sailing while you are away, home when you are back, bounded, never backwards', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
    for (const id of ['autoBoat', 'voy1', 'haul2', 'isl3'] as const) learn(s, id);
    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e9;
    s.levels.light = 3;
    buildBoat(s);
    startVoyage(s, 'wreck', 0, quiet);
    const metal = s.materials.metal;
    applyOffline(s, 10 * H);
    // 15 min × 0.85 per trip: many trips home, and the boat is home when you are.
    expect(s.materials.metal).toBeGreaterThan(metal);
    expect(s.boat.voyage).toBeNull();
    expect(s.boat.cargo).toBeNull();
    // Clock moved back: nothing happens.
    const snap = structuredClone(s.boat);
    tick(s, 5 * H);
    expect(s.boat).toEqual(snap);
    // A very long absence is bounded (at most AUTO_TRIPS_MAX trips per boat).
    startVoyage(s, 'wreck', 10 * H, quiet);
    const before = s.materials.metal;
    applyOffline(s, 1000 * H);
    expect(s.materials.metal).toBeGreaterThan(before);
    expect(Number.isFinite(s.materials.metal)).toBe(true);
  });
});

describe('the convenient talents', () => {
  test('the boat unloading itself is the first step of the sail branch (learnable after the first sea)', () => {
    expect(TALENT_BY_ID.autoBoat.tier).toBe(1);
    expect(TALENT_BY_ID.autoBoat.branch).toBe('sail');
    expect(TALENT_BY_ID.autoChest.tier).toBe(4);
  });
});

import { autoSail } from '../../src/core/boat';
describe('the auto boat after passing the light', () => {
  test('a boat that sailed in the old sea comes home and does not keep sailing there', () => {
    const s = withStars(100);
    learn(s, 'autoBoat');
    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e9;
    s.levels.light = 10;
    buildBoat(s);
    s.discovered.push('wreck');
    startVoyage(s, 'wreck', 0, () => 0.99);
    expect(passLight(s, 1000)).toBe(true);
    autoSail(s, 30 * 24 * 3600e3, () => 0.99);
    // Home in the new sea, free to be sent there.
    expect(s.boat.voyage).toBeNull();
  });
});

describe('the auto boat leaves the choice to you', () => {
  test('after time away the boat is home (unloaded), free to be sent somewhere new', () => {
    const s = withStars(100);
    learn(s, 'autoBoat');
    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e9;
    s.levels.light = 4;
    buildBoat(s);
    s.discovered.push('wreck');
    startVoyage(s, 'wreck', 0, () => 0.99);
    const got = autoSail(s, 5 * 3600e3, () => 0.99);
    expect(got.length).toBeGreaterThan(3);
    expect(s.boat.voyage).toBeNull();
    expect(s.boat.cargo).toBeNull();
  });
});
