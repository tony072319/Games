import { describe, expect, test } from 'vitest';
import { DECOR_IDS } from '../../src/core/decor';
import { LAND_MAX } from '../../src/core/land';
import { newGame, type GameState } from '../../src/core/state';
import { TOWN_FULL, townPoints, townShown } from '../../src/core/town';
import { MODELS } from '../../src/world/assets';
import { TOWN_SLOTS, townWalkers } from '../../src/world/town';
import { decorSpot, worldLayout } from '../../src/world/layout';
import { TOWN_RING, heightAt, homeShape, radiusAt } from '../../src/world/terrain';

const NOW = 1_000_000;
const grown = (f: (s: GameState) => void = () => {}) => {
  const s = newGame(NOW, 'zh');
  f(s);
  return s;
};

describe('the town grows with you', () => {
  test('a new sea starts with a couple of huts', () => {
    const n = townShown(grown(), TOWN_SLOTS.length);
    expect(n).toBeGreaterThanOrEqual(2);
    expect(n).toBeLessThan(6);
  });
  test('more light, buildings, decorations and friends mean a bigger town, up to every slot', () => {
    const a = townPoints(grown());
    const b = townPoints(grown((s) => (s.levels.light = 5)));
    const c = townPoints(grown((s) => ((s.levels.light = 5), (s.decor.lantern = 2), (s.friend.wreck = 1))));
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    const full = grown((s) => {
      s.levels.light = 10;
      s.levels.net = 50;
      for (const id of DECOR_IDS) s.decor[id] = 3;
      s.land = LAND_MAX;
    });
    expect(townPoints(full)).toBeGreaterThanOrEqual(TOWN_FULL);
    expect(townShown(full, TOWN_SLOTS.length)).toBe(TOWN_SLOTS.length);
  });
  test('the town shows in the world as it grows', () => {
    const count = (s: GameState) => worldLayout(s, NOW).filter((i) => i.key.startsWith('town:')).length;
    expect(count(grown((s) => (s.levels.light = 8)))).toBeGreaterThan(count(grown()));
  });
});

describe('where the town stands', () => {
  test('enough places for a real town, each with a known model in every sea', () => {
    expect(TOWN_SLOTS.length).toBeGreaterThanOrEqual(30);
    for (const sl of TOWN_SLOTS) for (const sea of ['dusk', 'fog', 'aurora'] as const) expect(MODELS[sl.models[sea]], `${sea} ${sl.models[sea]}`).toBeDefined();
  });
  test('every place is on land, apart from the others and from decorations, at every island size', () => {
    for (const land of [0, 14, LAND_MAX]) {
      const home = homeShape(land);
      const spots = TOWN_SLOTS.map((sl) => sl.at(land));
      for (const [x, z] of spots) expect(heightAt(home, x, z), `${land} ${x},${z}`).toBeGreaterThan(0.3);
      for (let i = 0; i < spots.length; i++)
        for (let j = i + 1; j < spots.length; j++) expect(Math.hypot(spots[i][0] - spots[j][0], spots[i][1] - spots[j][1]), `${i}-${j}`).toBeGreaterThan(1.5);
      for (const [x, z] of spots)
        for (let d = 0; d < DECOR_IDS.length; d++) {
          const [dx, dz] = decorSpot(d, land);
          expect(Math.hypot(x - dx, z - dz)).toBeGreaterThan(1.3);
        }
    }
  });
  test('every place stands on flat-enough ground (not half on a cliff)', () => {
    for (const land of [0, 14, LAND_MAX]) {
      const home = homeShape(land);
      for (const [i, sl] of TOWN_SLOTS.entries()) {
        const [x, z] = sl.at(land);
        const hs = [[0, 0], [0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].map(([dx, dz]) => heightAt(home, x + dx, z + dz));
        expect(Math.max(...hs) - Math.min(...hs), `${land} slot ${i}`).toBeLessThan(0.5);
      }
    }
  });
  test('walkers keep to the street, on land', () => {
    const s = grown((g) => (g.levels.light = 10));
    const home = homeShape(s.land);
    for (const w of townWalkers(s, NOW)) {
      const a = Math.atan2(w.z, w.x);
      expect(Math.abs(Math.hypot(w.x, w.z) / radiusAt(home, a) - TOWN_RING)).toBeLessThan(0.03);
      expect(heightAt(home, w.x, w.z)).toBeGreaterThan(1);
    }
  });
});
