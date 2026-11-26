import { describe, expect, test } from 'vitest';
import { DESTS } from '../../src/core/boat';
import { type DestId } from '../../src/core/data';
import { LAND_MAX } from '../../src/core/land';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { shipPosition, worldLayout } from '../../src/world/layout';
import { heightAt } from '../../src/world/terrain';

const NOW = 1_000_000;

describe('a passing ship', () => {
  test('crosses far out behind the island, clear of every island, on open water, at every island size', () => {
    for (const land of [0, LAND_MAX]) {
      const s = newGame(NOW, 'zh');
      s.levels.light = 10;
      s.land = land;
      s.discovered.push(...(Object.keys(DESTS) as DestId[]));
      const ground = worldLayout(s, NOW).flatMap((i) => (i.ground ? [i.ground] : []));

      for (const lane of [0, 1])
        for (let t = 0; t <= 1; t += 0.02) {
          const p = shipPosition({ id: 1, spawnedAt: NOW, lane }, NOW + t * T.SHIP_LIFE_MS, land);
          expect(Math.max(...ground.map((g) => heightAt(g, p.x, p.z))), `${land} ${lane} ${t}`).toBeLessThan(-0.5);
          for (const g of ground) expect(Math.hypot(p.x - g.cx, p.z - g.cz), `${land} ${lane} ${t}`).toBeGreaterThan(g.radius * 1.4 + 4);
        }
    }
  });
  test('it moves across, from one side to the other', () => {
    const a = shipPosition({ id: 1, spawnedAt: NOW, lane: 0.5 }, NOW, 0);
    const b = shipPosition({ id: 1, spawnedAt: NOW, lane: 0.5 }, NOW + T.SHIP_LIFE_MS, 0);
    expect(Math.abs(a.x - b.x)).toBeGreaterThan(40);
  });
});
