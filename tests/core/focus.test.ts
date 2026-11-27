import { describe, expect, test } from 'vitest';
import { canFocus, focusOn, setFocus } from '../../src/core/focus';
import { catchRate, chestCapacity, chestSeconds, netRate } from '../../src/core/economy';
import { voyageMs } from '../../src/core/boat';
import { newField, updateField } from '../../src/core/flotsam';
import { newShipField, updateShips } from '../../src/core/ships';
import { newGame } from '../../src/core/state';
import { loadGame, saveGame, type KV } from '../../src/core/save';
import { T } from '../../src/core/tuning';

const mem = (): KV => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};
const docked = () => {
  const s = newGame(0, 'zh');
  s.levels.light = 3;
  s.discovered.push('wreck');
  return s;
};

describe('where the light shines', () => {
  test('opens with the dock (lighthouse 3); the fishing grounds by default', () => {
    const s = newGame(0, 'zh');
    expect(s.focus).toBe('net');
    expect(canFocus(s)).toBe(false);
    expect(focusOn(s)).toBeNull();
    expect(setFocus(s, 'route')).toBe(false);
    expect(catchRate(s)).toBe(netRate(s));
    s.levels.light = 3;
    expect(canFocus(s)).toBe(true);
    expect(setFocus(s, 'route')).toBe(true);
    expect(focusOn(s)).toBe('route');
  });
  test('fishing grounds: the net catches more, and the chest holds the same hours', () => {
    const s = docked();
    setFocus(s, 'net');
    expect(catchRate(s)).toBeCloseTo(netRate(s) * (1 + T.FOCUS_NET));
    expect(chestCapacity(s) / catchRate(s)).toBeCloseTo(chestSeconds(s));
    setFocus(s, 'route');
    expect(catchRate(s)).toBe(netRate(s));
  });
  test('the route: voyages are shorter', () => {
    const s = docked();
    setFocus(s, 'net');
    const before = voyageMs(s, 'wreck');
    setFocus(s, 'route');
    expect(voyageMs(s, 'wreck')).toBeCloseTo(before * (1 - T.FOCUS_ROUTE));
  });
  test('the open sea: more finds drift by and more ships pass at night', () => {
    const count = (focus: 'net' | 'sea') => {
      const s = docked();
      setFocus(s, focus);
      const f = newField(0);
      let n = 0;
      for (let t = 0; t < 600_000; t += 500) {
        const before = f.nextId;
        updateField(f, t, () => 0.5, s);
        n += f.nextId - before;
        f.items = [];
      }
      return n;
    };
    expect(count('sea')).toBeGreaterThan(count('net') * 1.6);
    const ships = (focus: 'net' | 'sea') => {
      const s = docked();
      setFocus(s, focus);
      const night = 0.5 * 20 * 60 * 1000;
      const f = newShipField(night);
      let n = 0;
      for (let k = 0; k < 40; k++) for (let t = night; t < night + 4 * 60_000; t += 1000) {
        const before = f.nextId;
        updateShips(f, t + k * 20 * 60 * 1000, () => 0.5, s);
        n += f.nextId - before;
        f.ships = [];
      }
      return n;
    };
    expect(ships('sea')).toBeGreaterThan(ships('net') * 1.6);
  });
  test('kept in the save; a bad value falls back to the fishing grounds', () => {
    const kv = mem();
    const s = docked();
    setFocus(s, 'sea');
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.focus).toBe('sea');
    const raw = JSON.parse(kv.getItem('lightkeeper.save')!);
    raw.focus = 'moon';
    kv.setItem('lightkeeper.save', JSON.stringify(raw));
    expect(loadGame(kv, 0, 'zh').state.focus).toBe('net');
    delete raw.focus;
    kv.setItem('lightkeeper.save', JSON.stringify(raw));
    const r = loadGame(kv, 0, 'zh');
    expect(r.state.focus).toBe('net');
    expect(r.status).toBe('loaded');
  });
});
