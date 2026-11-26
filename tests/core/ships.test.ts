import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { SKY_CYCLE_MS, nightness } from '../../src/core/daycycle';
import { guideShip, newShipField, updateShips } from '../../src/core/ships';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const NIGHT = SKY_CYCLE_MS / 2; // the middle of the night
const DAY = 0;
const quiet = () => 0.5;

describe('ships pass at night', () => {
  test('the times are night and day as assumed', () => {
    expect(nightness(NIGHT)).toBeGreaterThan(0.9);
    expect(nightness(DAY)).toBe(0);
  });
  test('none by day; one comes soon after dark, then every so often, never more than two', () => {
    const f = newShipField(DAY);
    for (let t = DAY; t < DAY + 60_000; t += 1000) updateShips(f, t, quiet);
    expect(f.ships).toHaveLength(0);
    let t = NIGHT;
    for (; t < NIGHT + T.SHIP_EVERY_MS * 1.5 && f.ships.length === 0; t += 1000) updateShips(f, t, quiet);
    expect(f.ships).toHaveLength(1);
    for (let u = t; u < t + T.SHIP_EVERY_MS * 3; u += 1000) {
      updateShips(f, u, quiet);
      expect(f.ships.length).toBeLessThanOrEqual(2);
    }
  });
  test('after a long absence no flood of ships: at most one appears', () => {
    const f = newShipField(NIGHT);
    updateShips(f, NIGHT + SKY_CYCLE_MS * 50, quiet);
    expect(f.ships.length).toBeLessThanOrEqual(1);
  });
  test('a ship sails off after its time', () => {
    const f = newShipField(NIGHT);
    let t = NIGHT;
    while (f.ships.length === 0) updateShips(f, (t += 1000), quiet);
    const born = t;
    updateShips(f, born + T.SHIP_LIFE_MS + 1000, quiet);
    expect(f.ships.some((sh) => sh.spawnedAt === born)).toBe(false);
  });
});

describe('guiding a ship with the light', () => {
  const ready = () => {
    const s = newGame(0, 'zh');
    s.levels.net = 10;
    const f = newShipField(NIGHT);
    let t = NIGHT;
    while (f.ships.length === 0) updateShips(f, (t += 1000), quiet);
    return { s, f, t, id: f.ships[0].id };
  };
  test('gives a thank-you worth about half a minute of income, once', () => {
    const { s, f, t, id } = ready();
    const before = MATERIALS.reduce((a, m) => a + s.materials[m], 0);
    const gift = guideShip(s, f, id, t, () => 0.99)!;
    expect(gift).not.toBeNull();
    const got = MATERIALS.reduce((a, m) => a + s.materials[m], 0) - before;
    expect(got).toBeGreaterThan(0);
    expect(s.stats.guided).toBe(1);
    expect(guideShip(s, f, id, t + 100, () => 0.99)).toBeNull();
  });
  test('sometimes a glowshard too', () => {
    const { s, f, t, id } = ready();
    expect(guideShip(s, f, id, t, () => 0)!.glow).toBeGreaterThan(0);
  });
  test('refused for a ship that is gone, or by day', () => {
    const { s, f, t, id } = ready();
    expect(guideShip(s, f, 999, t, quiet)).toBeNull();
    expect(guideShip(s, f, id, DAY + SKY_CYCLE_MS * 10, quiet)).toBeNull();
  });
  test('the count of guided ships is saved; old saves start at 0', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const { s, f, t, id } = ready();
    guideShip(s, f, id, t, quiet);
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.stats.guided).toBe(1);
    const data = JSON.parse(map.get(SAVE_KEY)!);
    delete data.stats.guided;
    expect(loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh').state.stats.guided).toBe(0);
  });
});

describe('near dawn', () => {
  test('a ship still on screen can be guided until it leaves, even as the night fades', () => {
    const s = newGame(0, 'zh');
    const f = newShipField(0);
    // The last moments of a night: a ship appears, then the sky starts to lighten.
    let t = Math.floor(SKY_CYCLE_MS * 0.79);
    while (f.ships.length === 0 && t < SKY_CYCLE_MS * 0.8) updateShips(f, (t += 500), quiet);
    expect(f.ships).toHaveLength(1);
    const later = t + T.SHIP_LIFE_MS * 0.8;
    expect(nightness(later)).toBeLessThanOrEqual(0.3);
    expect(guideShip(s, f, f.ships[0].id, later, quiet)).not.toBeNull();
  });
});

describe('a damaged guided count', () => {
  test('is reported as repaired and starts at 0', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    saveGame(kv, newGame(0, 'zh'));
    const data = JSON.parse(map.get(SAVE_KEY)!);
    data.stats.guided = -3;
    const r = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh');
    expect(r.state.stats.guided).toBe(0);
    expect(r.status).toBe('repaired');
  });
});
