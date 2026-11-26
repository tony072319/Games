import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { buildBoat, startVoyage, voyageMs } from '../../src/core/boat';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const quiet = () => 0.99;

describe('the trial trip', () => {
  test("a game's very first voyage is a short trial; the next ones are normal", () => {
    const s = newGame(0, 'zh');
    s.levels.light = 3;
    for (const m of MATERIALS) s.materials[m] = 1e9;
    buildBoat(s);
    expect(voyageMs(s, 'wreck')).toBe(T.TRIAL_MINUTES * 60_000);
    startVoyage(s, 'wreck', 0, quiet);
    expect(s.boat.voyage!.returnAt).toBe(T.TRIAL_MINUTES * 60_000);
    s.discovered.push('wreck');
    s.boat.voyage = null;
    expect(voyageMs(s, 'wreck')).toBeGreaterThan(T.TRIAL_MINUTES * 60_000 * 3);
  });
  test('a player who already found islands in an earlier sea gets no trial', () => {
    const s = newGame(0, 'zh');
    s.sea = 'fog';
    s.reached = ['dusk', 'fog'];
    s.seas.dusk = { levels: { net: 1, storage: 1, light: 10 }, materials: { wood: 0, plastic: 0, rope: 0, metal: 0, glow: 0 }, lightParts: 0, decor: {}, land: 0, friend: {}, chest: { wood: 0, plastic: 0, rope: 0, metal: 0, glow: 0 }, discovered: ['wreck'], buildings: {}, islandStore: {}, islandAt: 0, chestAt: 0 };
    s.levels.light = 4;
    s.boat.built = true;
    expect(voyageMs(s, 'wreck')).toBeGreaterThan(T.TRIAL_MINUTES * 60_000 * 3);
  });
});
