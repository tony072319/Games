import { describe, expect, test } from 'vitest';
import { upgradeCost } from '../../src/core/economy';
import { canPolish, polish, isPolished } from '../../src/core/polish';
import { newField, updateField } from '../../src/core/flotsam';
import { newGame } from '../../src/core/state';
import { loadGame, saveGame, type KV } from '../../src/core/save';
import { T } from '../../src/core/tuning';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

describe('the net and lighthouse costs', () => {
  test('net 40 costs no more wood than the last lighthouse step', () => {
    expect(upgradeCost('net', 39).wood).toBeLessThanOrEqual(upgradeCost('light', 9).wood);
  });
  test('the late lighthouse (levels 7–10) costs extra', () => {
    const ratio = upgradeCost('light', 7).wood / upgradeCost('light', 5).wood;
    expect(ratio).toBeGreaterThan(Math.pow(2.2, 2) * 1.1);
  });
});

describe('polishing the lamp', () => {
  test('needs glow', () => {
    const s = newGame(0, 'zh');
    expect(canPolish(s, 0)).toBe(false);
    expect(polish(s, 0)).toBe(false);
  });
  test('costs glow and lasts a while', () => {
    const s = newGame(0, 'zh');
    s.materials.glow = T.POLISH_GLOW;
    expect(polish(s, 1000)).toBe(true);
    expect(s.materials.glow).toBe(0);
    expect(isPolished(s, 1000 + T.POLISH_MS - 1)).toBe(true);
    expect(isPolished(s, 1000 + T.POLISH_MS + 1)).toBe(false);
  });
  test('more finds drift by while the lamp is polished', () => {
    const count = (polished: boolean) => {
      const s = newGame(0, 'zh');
      if (polished) s.polishUntil = 10 * 60_000;
      const f = newField(0);
      let n = 0;
      for (let t = 0; t < 60_000; t += 100) {
        const before = f.nextId;
        updateField(f, t, () => 0.5, s);
        n += f.nextId - before;
        f.items = [];
      }
      return n;
    };
    expect(count(true)).toBeGreaterThan(count(false));
  });
  test('the polish survives a save and load', () => {
    const kv = mem();
    const s = newGame(0, 'zh');
    s.polishUntil = 123456;
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.polishUntil).toBe(123456);
  });
  test('an old save has no polish', () => {
    const kv = mem();
    const s = newGame(0, 'zh') as unknown as Record<string, unknown>;
    delete s.polishUntil;
    kv.setItem('lightkeeper.save', JSON.stringify(s));
    const r = loadGame(kv, 0, 'zh');
    expect(r.state.polishUntil).toBe(0);
    expect(r.status).toBe('loaded');
  });
});
