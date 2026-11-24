import { describe, expect, test } from 'vitest';
import { CURIOS, curioBonus, eligibleCurios, foundCurio, pickCurio } from '../../src/core/curios';
import { buildBoat, settleVoyage, startVoyage, unloadBoat } from '../../src/core/boat';
import { newField, updateField, collect } from '../../src/core/flotsam';
import { netRate } from '../../src/core/economy';
import { newGame } from '../../src/core/state';

describe('the book', () => {
  test('12 per sea: 8 common, 3 rare, 1 legend', () => {
    for (const sea of ['dusk', 'fog', 'aurora']) {
      const page = CURIOS.filter((c) => c.sea === sea);
      expect(page).toHaveLength(12);
      expect(page.filter((c) => c.rarity === 'common')).toHaveLength(8);
      expect(page.filter((c) => c.rarity === 'rare')).toHaveLength(3);
      expect(page.filter((c) => c.rarity === 'legend')).toHaveLength(1);
    }
  });

  test('drifting finds: commons always; rare ones only with enough light; boat-only ones never', () => {
    const s = newGame(0, 'zh');
    const ids = eligibleCurios(s, 'drift').map((c) => c.index);
    expect(ids).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    s.levels.light = 7;
    expect(eligibleCurios(s, 'drift').map((c) => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 10]);
  });

  test('boat finds: island-specific ones from that island', () => {
    const s = newGame(0, 'zh');
    s.levels.light = 9;
    expect(eligibleCurios(s, 'boat', 'oldlight').some((c) => c.index === 9)).toBe(true);
    expect(eligibleCurios(s, 'boat', 'wreck').some((c) => c.index === 9)).toBe(false);
    expect(eligibleCurios(s, 'boat', 'firefly').some((c) => c.index === 11)).toBe(true);
  });

  test('never a duplicate; nothing once all are found', () => {
    const s = newGame(0, 'zh');
    for (let i = 0; i < 8; i++) {
      const id = pickCurio(s, 'drift', () => 0.5);
      expect(id).not.toBeNull();
      expect(s.curios).not.toContain(id);
      foundCurio(s, id!);
    }
    expect(pickCurio(s, 'drift', () => 0.5)).toBeNull();
  });

  test('+1% per find, +10% for a full page of the current sea', () => {
    const s = newGame(0, 'zh');
    const base = netRate(s);
    foundCurio(s, 'dusk:0');
    expect(curioBonus(s)).toBeCloseTo(1.01);
    expect(netRate(s)).toBeCloseTo(base * 1.01);
    for (let i = 1; i < 12; i++) foundCurio(s, `dusk:${i}`);
    expect(curioBonus(s)).toBeCloseTo(1.12 * 1.1);
  });
});

describe('where finds come from', () => {
  test('a drifting curio is flagged at spawn and gives a find when tapped', () => {
    const s = newGame(0, 'zh');
    const f = newField(0);
    updateField(f, 2000, () => 0, s); // rng 0 < chance → curio
    expect(f.items[0].curio).toBe(true);
    const got = collect(f, s, f.items[0].id, () => 0);
    expect(got?.curio).toMatch(/^dusk:/);
    expect(s.curios).toHaveLength(1);
  });

  test('the boat can bring one home', () => {
    const s = newGame(0, 'zh');
    for (const m of ['wood', 'plastic', 'rope', 'metal'] as const) s.materials[m] = 1e6;
    s.levels.light = 3;
    buildBoat(s);
    startVoyage(s, 'wreck', 0);
    const cargo = settleVoyage(s, 60 * 60_000, () => 0);
    expect(cargo?.curio).toMatch(/^dusk:/);
    unloadBoat(s);
    expect(s.curios).toContain(cargo!.curio);
  });
});

describe('chest finds', () => {
  test('only from a chest half full or more', async () => {
    const { chestFind } = await import('../../src/core/curios');
    const s = newGame(0, 'zh');
    expect(chestFind(s, 0.4, () => 0)).toBeNull();
    const id = chestFind(s, 0.6, () => 0);
    expect(id).toMatch(/^dusk:/);
    expect(s.curios).toContain(id);
  });
});
