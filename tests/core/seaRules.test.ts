import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { buildBoat, reachable, settleVoyage, startVoyage, unloadBoat } from '../../src/core/boat';
import { newGame, type GameState } from '../../src/core/state';
import { nextGoal } from '../../src/core/advice';
import { worldLayout } from '../../src/world/layout';

const quiet = () => 0.99;
const at = (sea: GameState['sea'], light: number): GameState => {
  const s = newGame(0, 'zh');
  s.sea = sea;
  s.reached = ['dusk', 'fog', 'aurora'];
  s.levels.light = light;
  for (const m of MATERIALS) s.materials[m] = 1e9;
  buildBoat(s);
  return s;
};

describe('each sea has its own islands', () => {
  test('in the fog an island needs one more level of light before the boat finds it', () => {
    expect(reachable(at('dusk', 4), 'gullrock')).toBe(true);
    expect(reachable(at('fog', 4), 'gullrock')).toBe(false);
    expect(reachable(at('fog', 5), 'gullrock')).toBe(true);
  });
  test('the boats follow the light to a new sea: its nearest island is there from the first level', () => {
    for (const sea of ['fog', 'aurora'] as const) {
      const s = at(sea, 1);
      s.boat.built = true;
      expect(reachable(s, 'wreck')).toBe(true);
      expect(reachable(s, 'gullrock')).toBe(false);
      expect(nextGoal(s).key).not.toBe('goal.dock');
      expect(worldLayout(s, 0).some((i) => i.key.startsWith('isle:wreck'))).toBe(true);
    }
    // The first sea is unchanged: the first boat and the dock come at lighthouse 3.
    const d = at('dusk', 2);
    d.boat.built = true;
    expect(reachable(d, 'wreck')).toBe(false);
  });
  test('under the aurora the first trip breaks the ice and brings nothing', () => {
    const s = at('aurora', 6);
    startVoyage(s, 'wreck', 0, quiet);
    const first = settleVoyage(s, s.boat.voyage!.returnAt, quiet)!;
    expect(first.iceBreak).toBe(true);
    expect(first.discovery).toBe(true);
    for (const m of MATERIALS) expect(first.haul[m]).toBe(0);
    unloadBoat(s);
    expect(s.discovered).toContain('wreck');
    startVoyage(s, 'wreck', 1e7, quiet);
    const second = settleVoyage(s, s.boat.voyage!.returnAt, quiet)!;
    expect(second.iceBreak).toBeFalsy();
    expect(second.haul.metal).toBeGreaterThan(0);
  });
  test('the other seas keep their first-find gifts', () => {
    const s = at('dusk', 6);
    startVoyage(s, 'wreck', 0, quiet);
    const c = settleVoyage(s, s.boat.voyage!.returnAt, quiet)!;
    expect(c.iceBreak).toBeFalsy();
    expect(c.haul.metal).toBeGreaterThan(200);
  });
});

describe('an ice-breaking trip brings nothing at all', () => {
  test('no luck, no curio, no glow, and it takes the full time', () => {
    for (const r of [0, 0.3, 0.6]) {
      const s = at('aurora', 6);
      startVoyage(s, 'firefly', 0, () => r);
      const v = s.boat.voyage!;
      expect(v.story?.bonus).toBeUndefined();
      const c = settleVoyage(s, v.returnAt, () => 0)!;
      expect(c.iceBreak).toBe(true);
      for (const m of MATERIALS) expect(c.haul[m]).toBe(0);
      expect(c.curio).toBeUndefined();
      expect(c.rare).toBe(false);
    }
  });
});

import { nextEffect } from '../../src/core/advice';
describe('the lighthouse card in a new sea', () => {
  test('does not promise the dock and a boat when the boats are already here', () => {
    const s = at('fog', 2);
    s.boat.built = true;
    expect(nextEffect(s, 'light')).toEqual({ kind: 'unlock', key: 'upg.light.next.reach' });
    const d = newGame(0, 'zh');
    d.levels.light = 2;
    expect(nextEffect(d, 'light')).toEqual({ kind: 'unlock', key: 'upg.light.next.dock' });
  });
});

import { lightReach } from '../../src/core/boat';
describe('the lit water reaches every island in sight', () => {
  test('in a new sea the wreck (in sight from the first level) stands in lit water', () => {
    const f = at('fog', 1);
    f.boat.built = true;
    expect(lightReach(f)).toBe(3);
    expect(lightReach(at('dusk', 1))).toBe(1);
    expect(lightReach(at('fog', 5))).toBe(5);
  });
});
