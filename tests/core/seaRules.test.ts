import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { buildBoat, reachable, settleVoyage, startVoyage, unloadBoat } from '../../src/core/boat';
import { newGame, type GameState } from '../../src/core/state';

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
    expect(reachable(at('dusk', 3), 'wreck')).toBe(true);
    expect(reachable(at('fog', 3), 'wreck')).toBe(false);
    expect(reachable(at('fog', 4), 'wreck')).toBe(true);
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
