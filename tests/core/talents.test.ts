import { describe, expect, test } from 'vitest';
import { TALENTS, canLearn, has, learn, resetTalents, talentPoints } from '../../src/core/talents';
import { buildBoat, startVoyage, voyageHaul, voyageMs } from '../../src/core/boat';
import { chestCapacity, netRate, tapYield } from '../../src/core/economy';
import { islandRates } from '../../src/core/islands';
import { passLight } from '../../src/core/seas';
import { applyOffline, tick } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';

const H = 3_600_000;
const withStars = (n: number): GameState => {
  const s = newGame(0, 'zh');
  s.starlight = n;
  return s;
};

describe('learning', () => {
  test('12 talents in 3 branches of 4, costs 2/4/8/14', () => {
    expect(TALENTS).toHaveLength(12);
    expect(TALENTS.filter((x) => x.branch === 'fire').map((x) => x.cost)).toEqual([2, 4, 8, 14]);
  });
  test('in order, with points, and deeper ones need farther seas', () => {
    const s = withStars(100);
    expect(canLearn(s, 'chest2')).toBe(false); // net1 first
    expect(learn(s, 'net1')).toBe(true);
    expect(talentPoints(s)).toBe(98);
    expect(learn(s, 'chest2')).toBe(true);
    expect(canLearn(s, 'prod3')).toBe(false); // needs the fog sea
    s.reached.push('fog');
    expect(learn(s, 'prod3')).toBe(true);
    expect(canLearn(s, 'autoChest')).toBe(false); // needs the aurora sea
    s.reached.push('aurora');
    expect(learn(s, 'autoChest')).toBe(true);
    expect(talentPoints(s)).toBe(100 - 28);
  });
  test('not enough points', () => {
    const s = withStars(1);
    expect(learn(s, 'net1')).toBe(false);
  });
  test('reset gives every point back', () => {
    const s = withStars(10);
    learn(s, 'net1');
    learn(s, 'voy1');
    resetTalents(s);
    expect(s.talents).toEqual([]);
    expect(talentPoints(s)).toBe(10);
  });
});

describe('effects', () => {
  test('net, chest, production, voyage, haul, islands, tap', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
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

  test('auto boat: keeps sailing while you are away, bounded, never backwards', () => {
    const s = withStars(100);
    s.reached.push('fog', 'aurora');
    for (const id of ['voy1', 'haul2', 'isl3', 'autoBoat'] as const) learn(s, id);
    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e9;
    s.levels.light = 3;
    buildBoat(s);
    startVoyage(s, 'wreck', 0);
    const metal = s.materials.metal;
    applyOffline(s, 10 * H);
    // 15 min × 0.85 per trip: many trips home, boat out again.
    expect(s.materials.metal).toBeGreaterThan(metal);
    expect(s.boat.voyage).not.toBeNull();
    expect(s.boat.cargo).toBeNull();
    const v = s.boat.voyage!;
    tick(s, v.departAt - 5 * H); // clock moved back: nothing happens
    expect(s.boat.voyage).toEqual(v);
    const before = s.materials.metal;
    applyOffline(s, 1000 * H); // at most 200 trips, then the boat waits at the dock
    expect(s.materials.metal).toBeGreaterThan(before);
    expect(s.boat.voyage !== null || s.boat.cargo !== null).toBe(true);
  });
});
