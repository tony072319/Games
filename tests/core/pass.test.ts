import { describe, expect, test } from 'vitest';
import { canPassLight, materialStars, passLight, starlightFor } from '../../src/core/seas';
import { learn, resetCost, resetTalents, talentPoints } from '../../src/core/talents';
import { collect, newField, updateField } from '../../src/core/flotsam';
import { SKY_CYCLE_MS } from '../../src/core/daycycle';
import { MATERIALS } from '../../src/core/data';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { mulberry } from '../../tools/sim/sim';

const ready = () => {
  const s = newGame(0, 'zh');
  s.levels.light = 10;
  for (const m of MATERIALS) s.materials[m] = 5e4;
  return s;
};

describe('passing the light starts the next sea fresh', () => {
  test('materials do not come along; they turn into starlight', () => {
    const s = ready();
    expect(canPassLight(s)).toBe(true);
    const base = starlightFor(s);
    const extra = materialStars(s);
    expect(extra).toBeGreaterThan(0);
    passLight(s, 1000);
    for (const m of MATERIALS) expect(s.materials[m]).toBe(0);
    expect(s.starlight).toBe(base + extra);
  });
  test('even a mountain of materials gives a capped, finite number of stars', () => {
    const s = ready();
    for (const m of MATERIALS) s.materials[m] = 1e12;
    expect(materialStars(s)).toBe(T.MAT_STAR_CAP);
    for (const m of MATERIALS) s.materials[m] = Number.MAX_VALUE;
    expect(Number.isFinite(materialStars(s))).toBe(true);
  });
});

describe('talents need choosing', () => {
  test('a reset gives the points back but costs a tenth of what was spent (at least one)', () => {
    const s = newGame(0, 'zh');
    s.starlight = 100;
    learn(s, 'net1');
    learn(s, 'autoBoat');
    const spent = 100 - talentPoints(s);
    expect(resetCost(s)).toBe(Math.max(1, Math.ceil(spent * 0.1)));
    const cost = resetCost(s);
    expect(resetTalents(s)).toBe(true);
    expect(s.talents).toEqual([]);
    expect(s.starlight).toBe(100 - cost);
  });
  // "The tree costs more than three seas give" is checked on real play in tests/sim/targets.test.ts (55–70%).
});

describe('aurora nights', () => {
  const spawns = (sea: 'aurora' | 'dusk', at: number, ms = 30 * 60_000) => {
    const s = newGame(0, 'zh');
    s.sea = sea;
    const f = newField(at);
    const rng = mulberry(3);
    let glow = 0;
    for (let t = at; t < at + ms; t += 500) {
      updateField(f, t, rng, s);
      glow += f.items.filter((i) => i.material === 'glow').length;
      f.items = [];
    }
    return glow;
  };
  test('glow drifts by under the aurora at night', () => expect(spawns('aurora', SKY_CYCLE_MS * 0.4)).toBeGreaterThan(0));
  test('never by day, and never in other seas', () => {
    expect(spawns('aurora', SKY_CYCLE_MS * 0.92, SKY_CYCLE_MS * 0.16)).toBe(0); // the daylight stretch around dusk
    expect(spawns('dusk', SKY_CYCLE_MS * 0.4)).toBe(0);
  });
  test('a glow find gives a little glow, not a pile', () => {
    const s = newGame(0, 'zh');
    s.levels.net = 40;
    const f = newField(0);
    f.items.push({ id: 99, material: 'glow', spawnedAt: 0, lane: 0.5 });
    expect(collect(f, s, 99)!.amount).toBe(T.AURORA_GLOW_AMOUNT);
  });
});
