import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { voyageHaul, boatOf, buildBoat, canBuildBoat2, buildBoat2, canSail, freeBoat, settleVoyage, startVoyage, unloadBoat } from '../../src/core/boat';
import { applyOffline, tick } from '../../src/core/sim';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const quiet = () => 0.99;
const H = 3_600_000;
const fleet = (): GameState => {
  const s = newGame(0, 'zh');
  s.levels.light = 6;
  s.discovered.push('wreck', 'gullrock');
  s.reached.push('fog');
  for (const m of MATERIALS) s.materials[m] = 1e12;
  buildBoat(s);
  return s;
};

describe('a second boat', () => {
  test('built once you have reached the fog sea, after the first', () => {
    const s = newGame(0, 'zh');
    for (const m of MATERIALS) s.materials[m] = 1e12;
    s.levels.light = 6;
    expect(canBuildBoat2(s)).toBe(false); // no first boat, no fog
    buildBoat(s);
    expect(canBuildBoat2(s)).toBe(false); // not reached the fog yet
    s.reached.push('fog');
    expect(canBuildBoat2(s)).toBe(true);
    expect(buildBoat2(s)).toBe(true);
    expect(s.boat2.built).toBe(true);
    expect(canBuildBoat2(s)).toBe(false);
  });
  test('two boats sail at once, each with its own trip and cargo', () => {
    const s = fleet();
    buildBoat2(s);
    expect(startVoyage(s, 'wreck', 0, quiet, 0)).toBe(true);
    expect(freeBoat(s)).toBe(1);
    expect(startVoyage(s, 'gullrock', 0, quiet, 1)).toBe(true);
    expect(freeBoat(s)).toBeNull();
    expect(canSail(s, 'wreck', 0)).toBe(false);
    settleVoyage(s, 1e9, quiet, 0);
    expect(boatOf(s, 1).cargo).toBeNull(); // only boat 1 settled
    settleVoyage(s, 1e9, quiet, 1);
    const a = unloadBoat(s, 0)!;
    expect(a.dest).toBe('wreck');
    expect(boatOf(s, 1).cargo?.dest).toBe('gullrock');
    expect(unloadBoat(s, 1)!.dest).toBe('gullrock');
  });
  test('with two boats each carries a share, so the fleet brings a little more, not double', () => {
    const s = fleet();
    const one = voyageHaul(s, 'wreck').metal;
    buildBoat2(s);
    expect(voyageHaul(s, 'wreck').metal).toBeCloseTo(one * T.TWO_BOATS_HAUL);
    expect(T.TWO_BOATS_HAUL * 2).toBeGreaterThan(1);
    expect(T.TWO_BOATS_HAUL * 2).toBeLessThan(1.5);
  });
  test('time passing brings both boats home', () => {
    const s = fleet();
    buildBoat2(s);
    startVoyage(s, 'wreck', 0, quiet, 0);
    startVoyage(s, 'gullrock', 0, quiet, 1);
    tick(s, 1000);
    applyOffline(s, 10 * H);
    expect(s.boat.cargo).not.toBeNull();
    expect(s.boat2.cargo).not.toBeNull();
  });
  test('old saves have no second boat; saves keep it', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const s = fleet();
    buildBoat2(s);
    startVoyage(s, 'gullrock', 5, quiet, 1);
    saveGame(kv, s);
    const r = loadGame(kv, 10, 'zh').state;
    expect(r.boat2.built).toBe(true);
    expect(r.boat2.voyage?.dest).toBe('gullrock');
    const data = JSON.parse(map.get(SAVE_KEY)!);
    delete data.boat2;
    const old = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh');
    expect(old.state.boat2).toEqual({ built: false, voyage: null, cargo: null });
    expect(old.status).toBe('loaded');
  });
});

describe('two boats and a new island', () => {
  test('only one boat goes to an island nobody has reached yet', () => {
    const s = fleet();
    buildBoat2(s);
    expect(startVoyage(s, 'oldlight', 0, quiet, 0)).toBe(true);
    expect(canSail(s, 'oldlight', 1)).toBe(false);
    expect(startVoyage(s, 'oldlight', 0, quiet, 1)).toBe(false);
    expect(canSail(s, 'wreck', 1)).toBe(true); // already found: both may go
  });
});
