import { describe, expect, test } from 'vitest';
import { CORRUPT_KEY, SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame } from '../../src/core/state';

function memKV(init: Record<string, string> = {}): KV & { map: Map<string, string> } {
  const map = new Map(Object.entries(init));
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

describe('save/load', () => {
  test('round trip keeps everything', () => {
    const kv = memKV();
    const s = newGame(5000, 'en');
    s.materials.wood = 12.5;
    s.levels.net = 4;
    s.stats.tapped = 7;
    saveGame(kv, s);
    const r = loadGame(kv, 9999, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state).toEqual(s);
  });

  test('no save starts a new game', () => {
    const r = loadGame(memKV(), 100, 'zh');
    expect(r.status).toBe('new');
    expect(r.state.lastActiveAt).toBe(100);
    expect(r.state.settings.lang).toBe('zh');
  });

  test('garbage is backed up and a new game starts', () => {
    const kv = memKV({ [SAVE_KEY]: '{oops' });
    const r = loadGame(kv, 100, 'en');
    expect(r.status).toBe('corrupt');
    expect(kv.map.get(CORRUPT_KEY)).toBe('{oops');
    expect(r.state.levels.net).toBe(1);
  });

  test('invalid fields are dropped and the rest kept', () => {
    const raw = '{"version":1,"materials":{"wood":-5,"rope":3},"levels":{"net":999}}';
    const r = loadGame(memKV({ [SAVE_KEY]: raw }), 100, 'en');
    expect(r.status).toBe('repaired');
    expect(r.state.materials.wood).toBe(0);
    expect(r.state.materials.rope).toBe(3);
    expect(r.state.levels.net).toBe(1);
  });

  test('unknown future version is treated as corrupt', () => {
    const kv = memKV({ [SAVE_KEY]: '{"version":2}' });
    expect(loadGame(kv, 100, 'en').status).toBe('corrupt');
  });
});
