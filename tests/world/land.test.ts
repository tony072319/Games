import { describe, expect, test } from 'vitest';
import { DECOR_IDS } from '../../src/core/decor';
import { DESTS } from '../../src/core/boat';
import { FLOAT_LIFETIME_MS, type DestId } from '../../src/core/data';
import { LAND_MAX } from '../../src/core/land';
import { newGame } from '../../src/core/state';
import { DECOR_SLOTS, DEST_HEX, HOME_TILES, LAND_TILES, hexDist } from '../../src/world/hex';
import { boatPosition, flotsamPosition, worldLayout } from '../../src/world/layout';
import { MAX_SHORES } from '../../src/world/water';

const NOW = 1_000_000;
const full = () => {
  const s = newGame(NOW, 'zh');
  s.levels.light = 10;
  s.boat.built = true;
  s.discovered.push(...(Object.keys(DESTS) as DestId[]));
  for (const id of DECOR_IDS) s.decor[id] = 3;
  s.land = LAND_MAX;
  return s;
};

describe('the boat sails around the island, not over it', () => {
  test('every trip keeps off the fully grown island', () => {
    const s = full();
    const home = worldLayout(s, NOW).filter((i) => i.model === 'kk/hex_grass' && !i.key.startsWith('isle:'));
    for (const d of Object.keys(DESTS) as DestId[]) {
      s.boat.voyage = { sea: 'dusk', dest: d, departAt: NOW, returnAt: NOW + 100_000 };
      for (let t = 0.03; t < 0.97; t += 0.01) {
        const b = boatPosition(s, NOW + t * 100_000);
        for (const g of home) expect(Math.hypot(b.x - g.x, b.z - g.z), `${d} ${t.toFixed(2)} ${g.key}`).toBeGreaterThan(1.2);
      }
    }
  });
});

describe('the island grows', () => {
  test('as many tiles as the rules allow, all different, none on home, decorations or near an island', () => {
    expect(LAND_TILES).toHaveLength(LAND_MAX);
    const keys = LAND_TILES.map((h) => h.join());
    expect(new Set(keys).size).toBe(LAND_MAX);
    const taken = new Set([...HOME_TILES, ...Object.values(DECOR_SLOTS)].map((h) => h.join()));
    for (const k of keys) expect(taken.has(k), k).toBe(false);
    for (const h of LAND_TILES)
      for (const d of Object.values(DEST_HEX)) expect(hexDist(h[0] - d[0], h[1] - d[1])).toBeGreaterThan(2);
  });
  test('each bought tile appears, in order', () => {
    const s = newGame(NOW, 'zh');
    s.land = 3;
    const land = worldLayout(s, NOW).filter((i) => i.key.startsWith('land:'));
    expect(land.filter((i) => i.model === 'kk/hex_grass')).toHaveLength(3);
  });
  test('fully grown and decorated: shores fit, finds float clear of land', () => {
    const items = worldLayout(full(), NOW);
    expect(items.filter((i) => i.shore).length).toBeLessThanOrEqual(MAX_SHORES);
    const ground = items.filter((i) => i.model === 'kk/hex_grass');
    for (const lane of [0, 0.5, 1])
      for (let t = 0; t <= 1; t += 0.05) {
        const p = flotsamPosition({ id: 1, material: 'wood', spawnedAt: NOW, lane }, NOW + t * FLOAT_LIFETIME_MS);
        for (const g of ground) expect(Math.hypot(p.x - g.x, p.z - g.z)).toBeGreaterThan(1.5);
      }
  });
});
