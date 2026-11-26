import { describe, expect, test } from 'vitest';
import { buildCost, canBuild, construct, islandStoreCap, accrueIslands, islandRates, BUILDINGS, ISLAND_BUILDINGS } from '../../src/core/islands';
import { buildBoat, settleVoyage, startVoyage, voyageMs } from '../../src/core/boat';
import { chestCapacity, netRate, upgradeCost } from '../../src/core/economy';
import { DEST_IDS } from '../../src/core/data';
import { applyOffline } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';

/** Dice for a trip with no luck, so timings are exact. */
const quiet = () => 0.99;

const H = 3_600_000;

function rich(): GameState {
  const s = newGame(0, 'zh');
  for (const m of ['wood', 'plastic', 'rope', 'metal', 'glow'] as const) s.materials[m] = 1e9;
  s.levels.light = 6;
  s.discovered.push(...DEST_IDS);
  return s;
}

describe('island buildings', () => {
  test('each island has three, one of them a perk', () => {
    for (const d of DEST_IDS) {
      expect(ISLAND_BUILDINGS[d]).toHaveLength(3);
      expect(ISLAND_BUILDINGS[d].filter((b) => BUILDINGS[b].perk)).toHaveLength(1);
    }
  });

  test('can only build on discovered islands, up to level 5', () => {
    const s = rich();
    s.discovered = [];
    expect(canBuild(s, 'dismantler')).toBe(false);
    s.discovered.push('wreck');
    for (let i = 0; i < 5; i++) expect(construct(s, 'dismantler', 0)).toBe(true);
    expect(s.buildings.dismantler).toBe(5);
    expect(construct(s, 'dismantler', 0)).toBe(false);
  });

  test('costs double each level and are paid', () => {
    const s = rich();
    expect(buildCost('dismantler', 0)).toMatchObject({ wood: 300, rope: 80 });
    expect(buildCost('dismantler', 1)).toMatchObject({ wood: 600, rope: 160 });
    const before = s.materials.wood;
    construct(s, 'dismantler', 0);
    expect(s.materials.wood).toBe(before - 300);
  });
});

describe('island production', () => {
  test('producers fill the island store over time, capped at 12 hours', () => {
    const s = rich();
    construct(s, 'dismantler', 0);
    accrueIslands(s, 2 * H);
    const perHour = islandRates(s, 'wreck').metal;
    expect(perHour).toBeGreaterThan(0);
    expect(s.islandStore.wreck!.metal).toBeCloseTo(2 * perHour);
    accrueIslands(s, 100 * H);
    expect(s.islandStore.wreck!.metal).toBeCloseTo(islandStoreCap(s, 'wreck').metal);
    expect(islandStoreCap(s, 'wreck').metal).toBeCloseTo(12 * perHour);
  });

  test('clock moved backwards gives nothing', () => {
    const s = rich();
    construct(s, 'dismantler', 10 * H);
    accrueIslands(s, 5 * H);
    expect(s.islandStore.wreck?.metal ?? 0).toBe(0);
  });

  test('the boat brings the island store home', () => {
    const s = rich();
    buildBoat(s);
    construct(s, 'dismantler', 0);
    startVoyage(s, 'wreck', 3 * H, quiet);
    accrueIslands(s, 3 * H);
    const cargo = settleVoyage(s, 3 * H + 15 * 60_000)!;
    const perHour = islandRates(s, 'wreck').metal;
    expect(cargo.fromIsland.metal).toBeGreaterThan(2.9 * perHour);
    expect(s.islandStore.wreck!.metal).toBeLessThan(0.3 * perHour);
  });

  test('production continues while offline', () => {
    const s = rich();
    construct(s, 'jars', 0);
    applyOffline(s, 4 * H);
    expect(s.islandStore.firefly!.glow).toBeCloseTo(2); // 0.5/h
  });
});

describe('perk buildings', () => {
  test('boatshed speeds up voyages', () => {
    const s = rich();
    buildBoat(s);
    const base = voyageMs(s, 'wreck');
    construct(s, 'boatshed', 0);
    expect(voyageMs(s, 'wreck')).toBeCloseTo(base * 0.96);
  });
  test('lookout speeds up the net', () => {
    const s = rich();
    const base = netRate(s);
    construct(s, 'lookout', 0);
    construct(s, 'lookout', 0);
    expect(netRate(s)).toBeCloseTo(base * 1.1);
  });
  test('desk makes the lighthouse cheaper', () => {
    const s = rich();
    const base = upgradeCost('light', 1, s).wood;
    construct(s, 'desk', 0);
    expect(upgradeCost('light', 1, s).wood).toBe(Math.ceil(base * 0.97));
  });
  test('path makes the chest bigger', () => {
    const s = rich();
    const base = chestCapacity(s);
    construct(s, 'path', 0);
    expect(chestCapacity(s)).toBeCloseTo(base * 1.1);
  });
});
