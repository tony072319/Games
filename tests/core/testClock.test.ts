import { describe, expect, test } from 'vitest';
import { createTestClock } from '../../src/core/testClock';
import type { KV } from '../../src/core/save';

const memKV = (): KV & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
};

describe('test clock', () => {
  test('runs at the chosen speed, without jumping when the speed changes', () => {
    let real = 1000;
    const c = createTestClock(() => real, memKV());
    expect(c.now()).toBe(1000);
    c.setSpeed(100);
    real += 10; // 10 ms real
    expect(c.now()).toBe(2000); // 1000 ms game
    c.setSpeed(1);
    expect(c.now()).toBe(2000);
    real += 10;
    expect(c.now()).toBe(2010);
  });
  test('keeps game time ahead of real time across a reload', () => {
    let real = 0;
    const kv = memKV();
    const a = createTestClock(() => real, kv);
    a.setSpeed(1000);
    real = 3600; // 3.6 s real = 1 h game
    const game = a.now();
    a.save();
    const b = createTestClock(() => real, kv);
    expect(b.now()).toBe(game);
    expect(b.speed()).toBe(1000);
  });
});

import { nextSeaEvent, seaEventAt } from '../../src/core/seaEvents';
describe('jumping to the next event at sea (test build)', () => {
  test('the clock jumps ahead by a given time', () => {
    let real = 1000;
    const m = new Map<string, string>();
    const c = createTestClock(() => real, { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) });
    c.jump(5000);
    expect(c.now()).toBe(6000);
    real += 10;
    expect(c.now()).toBe(6010);
  });
  test('the next event starts at or after now, and is on at its start', () => {
    const e = nextSeaEvent(0)!;
    expect(e.startAt).toBeGreaterThanOrEqual(0);
    expect(seaEventAt(e.startAt)?.startAt).toBe(e.startAt);
    expect(nextSeaEvent(e.startAt + 1)!.startAt).toBeGreaterThan(e.startAt);
  });
});
