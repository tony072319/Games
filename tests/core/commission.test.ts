import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { FRIEND_MAX, canDeliver, commissionFor, deliver, friendHaul } from '../../src/core/commission';
import { voyageHaul } from '../../src/core/boat';
import { passLight, switchSea } from '../../src/core/seas';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';

const found = (): GameState => {
  const s = newGame(0, 'zh');
  s.levels.light = 6;
  s.discovered.push('wreck', 'gullrock');
  for (const m of MATERIALS) s.materials[m] = 1e9;
  return s;
};

describe('islanders ask for things', () => {
  test('only islands you have found ask; each asks for one material', () => {
    const s = found();
    expect(commissionFor(s, 'oldlight')).toBeNull();
    const c = commissionFor(s, 'wreck')!;
    expect(MATERIALS).toContain(c.material);
    expect(c.amount).toBeGreaterThan(0);
  });
  test('delivering pays the materials, makes friends, and the next ask is bigger', () => {
    const s = found();
    const c = commissionFor(s, 'wreck')!;
    const before = s.materials[c.material];
    expect(deliver(s, 'wreck')).toBe(true);
    expect(s.materials[c.material]).toBeLessThanOrEqual(before - c.amount + 1e-6 + (c.material === 'glow' ? 0 : 0));
    expect(s.friend.wreck).toBe(1);
    expect(commissionFor(s, 'wreck')!.amount).toBeGreaterThan(c.amount);
  });
  test('refused without enough; never negative; no asks once best friends', () => {
    const s = found();
    for (const m of MATERIALS) s.materials[m] = 0;
    expect(canDeliver(s, 'wreck')).toBe(false);
    expect(deliver(s, 'wreck')).toBe(false);
    for (const m of MATERIALS) expect(s.materials[m]).toBe(0);
    const r = found();
    for (let i = 0; i < FRIEND_MAX; i++) expect(deliver(r, 'gullrock')).toBe(true);
    expect(commissionFor(r, 'gullrock')).toBeNull();
    expect(deliver(r, 'gullrock')).toBe(false);
  });
  test('friends bring more home from their island', () => {
    const s = found();
    const plain = voyageHaul(s, 'wreck').metal;
    deliver(s, 'wreck');
    deliver(s, 'wreck');
    expect(friendHaul(s, 'wreck')).toBeGreaterThan(1);
    expect(voyageHaul(s, 'wreck').metal).toBeCloseTo(plain * friendHaul(s, 'wreck'));
  });
  test('each sea has its own friends; saved', () => {
    const s = found();
    deliver(s, 'wreck');
    s.levels.light = 10;
    passLight(s, 0);
    expect(s.friend).toEqual({});
    switchSea(s, 'dusk', 1000);
    expect(s.friend.wreck).toBe(1);
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    saveGame(kv, s);
    expect(loadGame(kv, 1000, 'zh').state.friend.wreck).toBe(1);
    const data = JSON.parse(map.get(SAVE_KEY)!);
    data.friend = { wreck: 9, nowhere: 1, gullrock: -1 };
    expect(loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh').state.friend).toEqual({ wreck: FRIEND_MAX });
  });
});
