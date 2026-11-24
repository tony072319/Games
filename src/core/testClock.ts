import type { KV } from './save';

/**
 * The test build's clock: game time can run faster than real time (×1 … ×1000),
 * and stays ahead across reloads so the test save never sees time go backwards.
 */
export interface TestClock {
  now(): number;
  speed(): number;
  setSpeed(n: number): void;
  /** Remember where game time is (call on save). */
  save(): void;
}

const KEY = 'clock';

export function createTestClock(realNow: () => number, kv: KV): TestClock {
  let speed = 1;
  let gameAt = realNow();
  let realAt = gameAt;
  try {
    const saved = JSON.parse(kv.getItem(KEY) ?? 'null');
    if (saved && Number.isFinite(saved.game) && Number.isFinite(saved.speed) && saved.game > realAt) {
      gameAt = saved.game;
      speed = saved.speed;
    } else if (saved && Number.isFinite(saved.speed)) speed = saved.speed;
  } catch {
    // no saved clock: start at real time
  }
  const now = () => gameAt + (realNow() - realAt) * speed;
  return {
    now,
    speed: () => speed,
    setSpeed(n) {
      gameAt = now();
      realAt = realNow();
      speed = n;
      this.save();
    },
    save() {
      try {
        kv.setItem(KEY, JSON.stringify({ game: now(), speed }));
      } catch {
        // storage full: the clock just won't survive a reload
      }
    },
  };
}
