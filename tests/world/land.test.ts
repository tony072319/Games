import { describe, expect, test } from 'vitest';
import { DECOR_IDS } from '../../src/core/decor';
import { DESTS } from '../../src/core/boat';
import { FLOAT_LIFETIME_MS, type DestId } from '../../src/core/data';
import { LAND_MAX } from '../../src/core/land';
import { newGame } from '../../src/core/state';
import { boatPosition, flotsamPosition, shoresOf, worldLayout } from '../../src/world/layout';
import { heightAt } from '../../src/world/terrain';
import { MAX_SHORES } from '../../src/world/water';

const NOW = 1_000_000;
const full = (land = LAND_MAX) => {
  const s = newGame(NOW, 'zh');
  s.levels.light = 10;
  s.boat.built = true;
  s.discovered.push(...(Object.keys(DESTS) as DestId[]));
  for (const id of DECOR_IDS) s.decor[id] = 3;
  s.land = land;
  return s;
};
const groundAt = (items: ReturnType<typeof worldLayout>, x: number, z: number) => Math.max(...items.flatMap((i) => (i.ground ? [heightAt(i.ground, x, z)] : [])));

describe('the island grows', () => {
  test('expanding makes the home ground bigger', () => {
    const r = (land: number) => worldLayout(full(land), NOW).find((i) => i.ground?.kind === 'home')!.ground!.radius;
    expect(r(LAND_MAX)).toBeGreaterThan(r(0) * 1.3);
    expect(r(5)).toBeGreaterThan(r(4));
  });
  test('fully grown: shores fit, finds float over open water', () => {
    const items = worldLayout(full(), NOW);
    expect(shoresOf(items).length).toBeLessThanOrEqual(MAX_SHORES);
    for (const lane of [0, 0.5, 1])
      for (let t = 0; t <= 1; t += 0.02) {
        const p = flotsamPosition({ id: 1, material: 'wood', spawnedAt: NOW, lane }, NOW + t * FLOAT_LIFETIME_MS, LAND_MAX);
        expect(groundAt(items, p.x, p.z), `${lane} ${t}`).toBeLessThan(-0.5);
      }
  });
});

describe('the boat sails around the island, not over it', () => {
  test('every trip stays on the water at every island size', () => {
    for (const land of [0, LAND_MAX]) {
      const s = full(land);
      const items = worldLayout(s, NOW);
      for (const d of Object.keys(DESTS) as DestId[]) {
        s.boat.voyage = { sea: 'dusk', dest: d, departAt: NOW, returnAt: NOW + 100_000 };
        for (let t = 0; t <= 1; t += 0.005) {
          const b = boatPosition(s, NOW + t * 100_000);
          expect(groundAt(items, b.x, b.z), `${land} ${d} ${t.toFixed(3)}`).toBeLessThan(-0.2);
        }
      }
    }
  });
  test('no trip sails through the pier, and finds pass clear of it', () => {
    const s = full();
    const items = worldLayout(s, NOW);
    const planks = items.filter((i) => i.key.startsWith('dock:plank'));
    const boat = boatPosition(s, NOW);
    for (const d of Object.keys(DESTS) as DestId[]) {
      s.boat.voyage = { sea: 'dusk', dest: d, departAt: NOW, returnAt: NOW + 100_000 };
      for (let t = 0.03; t < 0.97; t += 0.005) {
        const b = boatPosition(s, NOW + t * 100_000);
        for (const p of planks) expect(Math.hypot(b.x - p.x, b.z - p.z), `${d} ${t.toFixed(3)}`).toBeGreaterThan(0.9);
      }
    }
    for (const lane of [0, 0.5, 1])
      for (let t = 0; t <= 1; t += 0.01) {
        const f = flotsamPosition({ id: 1, material: 'wood', spawnedAt: NOW, lane }, NOW + t * FLOAT_LIFETIME_MS, LAND_MAX);
        for (const [x, z] of [...planks.map((p) => [p.x, p.z]), [boat.x, boat.z]]) expect(Math.hypot(f.x - x, f.z - z)).toBeGreaterThan(1);
      }
  });
});
