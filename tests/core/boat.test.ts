import { describe, expect, test } from 'vitest';
import {
  BOAT_COST,
  buildBoat,
  canBuildBoat,
  reachable,
  settleVoyage,
  startVoyage,
  unloadBoat,
  voyageHaul,
  voyageMs,
} from '../../src/core/boat';
import { applyOffline, tick } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';

const MIN = 60_000;
const H = 60 * MIN;

function rich(light = 3): GameState {
  const s = newGame(0, 'zh');
  s.levels.light = light;
  for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 10_000;
  return s;
}

describe('building the boat', () => {
  test('needs the dock (lighthouse light 3)', () => {
    const s = rich(2);
    expect(canBuildBoat(s)).toBe(false);
    expect(buildBoat(s)).toBe(false);
  });
  test('costs materials once', () => {
    const s = rich();
    expect(buildBoat(s)).toBe(true);
    expect(s.boat.built).toBe(true);
    expect(s.materials.wood).toBe(10_000 - BOAT_COST.wood);
    expect(buildBoat(s)).toBe(false);
    expect(s.materials.wood).toBe(10_000 - BOAT_COST.wood);
  });
});

describe('voyages', () => {
  test('islands open up as the light reaches farther', () => {
    const s = rich(3);
    buildBoat(s);
    expect(reachable(s, 'wreck')).toBe(true);
    expect(reachable(s, 'gullrock')).toBe(false);
    s.levels.light = 6;
    expect(reachable(s, 'firefly')).toBe(true);
  });

  test('wreck takes 15 minutes, faster with a faster boat', () => {
    const s = rich();
    expect(voyageMs(s, 'wreck')).toBe(15 * MIN);
    s.levels.speed = 2;
    expect(voyageMs(s, 'wreck')).toBeCloseTo(15 * MIN * 0.92);
  });

  test('a full voyage: sail, arrive, unload once, discover', () => {
    const s = rich();
    buildBoat(s);
    expect(startVoyage(s, 'wreck', 1000)).toBe(true);
    expect(startVoyage(s, 'wreck', 1000)).toBe(false); // already at sea
    expect(settleVoyage(s, 1000 + 14 * MIN)).toBeNull();
    const cargo = settleVoyage(s, 1000 + 15 * MIN);
    expect(cargo).not.toBeNull();
    expect(cargo!.discovery).toBe(true);
    expect(cargo!.haul.metal).toBeGreaterThan(cargo!.haul.wood);
    expect(s.boat.voyage).toBeNull();
    expect(startVoyage(s, 'wreck', 2000 + 15 * MIN)).toBe(false); // unload first
    const metalBefore = s.materials.metal;
    const got = unloadBoat(s);
    expect(got).not.toBeNull();
    expect(s.materials.metal).toBeCloseTo(metalBefore + got!.haul.metal);
    expect(got!.haul.metal).toBeGreaterThan(200); // includes the +200 discovery find
    expect(s.discovered).toContain('wreck');
    expect(unloadBoat(s)).toBeNull();
  });

  test('second visit is not a discovery', () => {
    const s = rich();
    buildBoat(s);
    s.discovered.push('wreck');
    startVoyage(s, 'wreck', 0);
    expect(settleVoyage(s, 15 * MIN)!.discovery).toBe(false);
  });

  test('Firefly Isle is where glow comes from', () => {
    const s = rich(6);
    buildBoat(s);
    s.levels.cargo = 3;
    expect(voyageHaul(s, 'firefly').glow).toBe(5);
    expect(voyageHaul(s, 'wreck').glow).toBe(0);
    startVoyage(s, 'firefly', 0);
    expect(settleVoyage(s, 8 * H)!.haul.glow).toBe(10); // 2 + cargo, +5 the first time
  });

  test('bigger cargo hold brings back more', () => {
    const s = rich();
    const small = voyageHaul(s, 'wreck').metal;
    s.levels.cargo = 5;
    expect(voyageHaul(s, 'wreck').metal).toBeCloseTo(small * 2);
  });

  test('clock set before departure does not finish the voyage', () => {
    const s = rich();
    buildBoat(s);
    startVoyage(s, 'wreck', 10 * MIN);
    expect(settleVoyage(s, 0)).toBeNull();
    expect(s.boat.voyage).not.toBeNull();
  });

  test('a voyage finishes while the game is closed', () => {
    const s = rich(6);
    buildBoat(s);
    startVoyage(s, 'firefly', 0);
    applyOffline(s, 10 * H);
    expect(s.boat.voyage).toBeNull();
    expect(s.boat.cargo?.dest).toBe('firefly');
  });

  test('a voyage finishes during live play', () => {
    const s = rich();
    buildBoat(s);
    s.lastActiveAt = 15 * MIN - 1000;
    startVoyage(s, 'wreck', 0);
    tick(s, 15 * MIN);
    expect(s.boat.cargo).not.toBeNull();
  });
});
