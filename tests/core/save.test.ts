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
    s.chest.rope = 4.5;
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

  test('a repaired save keeps a backup of the original', () => {
    const raw = '{"version":1,"materials":{"wood":-5},"levels":{"net":60}}';
    const kv = memKV({ [SAVE_KEY]: raw });
    expect(loadGame(kv, 100, 'en').status).toBe('repaired');
    expect(kv.map.get(CORRUPT_KEY)).toBe(raw);
  });

  test('storage that refuses writes never throws', () => {
    const full: KV = {
      getItem: () => '{oops',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(saveGame(full, newGame(0, 'en'))).toBe(false);
    expect(loadGame(full, 100, 'en').status).toBe('corrupt');
  });

  test('a save from before the chest existed loads cleanly with an empty chest', () => {
    const s = newGame(5000, 'en');
    const old = JSON.parse(JSON.stringify(s));
    delete old.chest;
    const r = loadGame(memKV({ [SAVE_KEY]: JSON.stringify(old) }), 9999, 'en');
    expect(r.status).toBe('loaded');
    expect(r.state.chest.wood).toBe(0);
  });
});

describe('test-mode storage', () => {
  test('prefixed storage keeps test saves apart from the real save', async () => {
    const { prefixedKV } = await import('../../src/core/save');
    const kv = memKV({ [SAVE_KEY]: 'real' });
    const testKV = prefixedKV(kv, 'test:');
    expect(testKV.getItem(SAVE_KEY)).toBeNull();
    testKV.setItem(SAVE_KEY, 'pretend');
    expect(kv.map.get(SAVE_KEY)).toBe('real');
    expect(kv.map.get('test:' + SAVE_KEY)).toBe('pretend');
  });
});

describe('sound setting', () => {
  test('defaults on, persists off, and old saves without it load cleanly', () => {
    const s = newGame(0, 'zh');
    expect(s.settings.sound).toBe(true);
    s.settings.sound = false;
    const kv = memKV();
    saveGame(kv, s);
    expect(loadGame(kv, 1, 'zh').state.settings.sound).toBe(false);
    const old = JSON.parse(JSON.stringify(newGame(0, 'zh')));
    delete old.settings.sound;
    const r = loadGame(memKV({ [SAVE_KEY]: JSON.stringify(old) }), 1, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.settings.sound).toBe(true);
  });
});

describe('saves from before the boat', () => {
  test('load unchanged, with the lighthouse at 1 and no boat', () => {
    const old = {
      version: 1,
      materials: { wood: 50, plastic: 2, rope: 3, metal: 4 },
      chest: { wood: 1, plastic: 0, rope: 0, metal: 0 },
      levels: { net: 7, storage: 3 },
      lastActiveAt: 100,
      settings: { lang: 'zh', sound: true },
      stats: { tapped: 9 },
    };
    const r = loadGame(memKV({ [SAVE_KEY]: JSON.stringify(old) }), 200, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.materials.wood).toBe(50);
    expect(r.state.materials.glow).toBe(0);
    expect(r.state.levels).toEqual({ net: 7, storage: 3, light: 1, speed: 1, cargo: 1 });
    expect(r.state.boat).toEqual({ built: false, voyage: null, cargo: null });
    expect(r.state.discovered).toEqual([]);
  });

  test('boat and discoveries round-trip', () => {
    const s = newGame(0, 'zh');
    s.boat.built = true;
    s.boat.voyage = { sea: 'dusk', dest: 'wreck', departAt: 10, returnAt: 20 };
    s.discovered.push('gullrock');
    const kv = memKV();
    saveGame(kv, s);
    const r = loadGame(kv, 30, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.boat).toEqual(s.boat);
    expect(r.state.discovered).toEqual(['gullrock']);
  });
});

describe('settings and first-time steps', () => {
  test('new game defaults; round-trip', () => {
    const s = newGame(0, 'zh');
    expect(s.settings).toMatchObject({ calm: false, mini: false });
    expect(s.stats.tutorial).toBe(0);
    s.settings.calm = true;
    s.settings.mini = true;
    s.stats.tutorial = 2;
    const kv = memKV();
    saveGame(kv, s);
    const r = loadGame(kv, 1, 'zh');
    expect(r.state.settings).toMatchObject({ calm: true, mini: true });
    expect(r.state.stats.tutorial).toBe(2);
  });
  test('an old save that has already played skips the first-time steps', () => {
    const old = { version: 1, materials: {}, levels: {}, lastActiveAt: 0, settings: { lang: 'zh', sound: true }, stats: { tapped: 5 } };
    const r = loadGame(memKV({ [SAVE_KEY]: JSON.stringify(old) }), 1, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.stats.tutorial).toBe(3);
  });
});
