import { describe, expect, test } from 'vitest';
import { affordState, etaSeconds, nextEffect, nextGoal } from '../../src/core/advice';
import { emptyMaterials, newGame, type GameState } from '../../src/core/state';
import { chestCapacity } from '../../src/core/economy';

const cost = (m: Partial<Record<'wood' | 'plastic' | 'rope' | 'metal' | 'glow', number>>) => ({ ...emptyMaterials(), ...m });
const played = (): GameState => {
  const s = newGame(0, 'zh');
  s.stats.tutorial = 3;
  return s;
};

describe('affordability', () => {
  test('affordable now is 0 seconds and "can"', () => {
    const s = newGame(0, 'zh');
    s.materials.wood = 30;
    expect(etaSeconds(s, cost({ wood: 30 }))).toBe(0);
    expect(affordState(s, cost({ wood: 30 }))).toBe('can');
  });
  test('time to afford from the net (0.05 wood/s at net 1)', () => {
    const s = newGame(0, 'zh');
    expect(etaSeconds(s, cost({ wood: 30 }))).toBeCloseTo(600);
    expect(affordState(s, cost({ wood: 30 }))).toBe('soon');
    expect(affordState(s, cost({ wood: 30.05 }))).toBe('far');
  });
  test('a material with no income never shows a time', () => {
    const s = newGame(0, 'zh');
    expect(etaSeconds(s, cost({ glow: 5 }))).toBeNull();
    expect(affordState(s, cost({ glow: 5 }))).toBe('far');
  });
});

describe('next level effect', () => {
  test('net, storage, light, max', () => {
    const s = newGame(0, 'zh');
    expect(nextEffect(s, 'net')).toEqual({ kind: 'percent', value: 120 });
    expect(nextEffect(s, 'storage')).toEqual({ kind: 'hours', value: 1 });
    s.levels.light = 2;
    expect(nextEffect(s, 'light')).toEqual({ kind: 'unlock', key: 'upg.light.next.dock' });
    s.levels.storage = 11;
    expect(nextEffect(s, 'storage')).toBeNull();
  });
});

describe('next goal', () => {
  test('first-time steps come first', () => {
    const s = newGame(0, 'zh');
    expect(nextGoal(s).target).toBe('flotsam');
    s.stats.tutorial = 1;
    expect(nextGoal(s).target).toBe('chest');
    s.stats.tutorial = 2;
    expect(nextGoal(s).target).toBe('net');
  });
  test('a boat waiting to be unloaded beats everything else', () => {
    const s = played();
    s.boat.cargo = { sea: 'dusk', dest: 'wreck', haul: emptyMaterials(), discovery: false, fromIsland: emptyMaterials() };
    expect(nextGoal(s).target).toBe('boat');
  });
  test('a half-full chest asks to be collected', () => {
    const s = played();
    s.chest.wood = chestCapacity(s) * 0.6;
    expect(nextGoal(s).target).toBe('chest');
  });
  test('early on, the lighthouse is the goal (to reach the dock)', () => {
    const s = played();
    expect(nextGoal(s)).toMatchObject({ key: 'goal.dock', target: 'light' });
  });
  test('with the dock but no boat, build one', () => {
    const s = played();
    s.levels.light = 3;
    expect(nextGoal(s)).toMatchObject({ key: 'goal.buildBoat', target: 'map' });
  });
});
