import { describe, expect, test } from 'vitest';
import { boatPosition, flotsamPosition, worldLayout, type WorldItem } from '../../src/world/layout';
import { MODELS } from '../../src/world/assets';
import { DEST_HEX, hexDist, hexToWorld, PIER_DIR, PIER_TILE } from '../../src/world/hex';
import { DECOR_IDS } from '../../src/core/decor';
import { MAX_SHORES } from '../../src/world/water';
import { emptyMaterials, newGame, type GameState } from '../../src/core/state';
import { FLOAT_LIFETIME_MS } from '../../src/core/data';

const NOW = 1_000_000;
const game = (f?: (s: GameState) => void) => {
  const s = newGame(NOW, 'zh');
  f?.(s);
  return s;
};
const tags = (items: WorldItem[]) => new Set(items.map((i) => i.tag).filter(Boolean));

describe('world layout', () => {
  test('a new game shows the lighthouse, net and chest, but no dock or boat', () => {
    const t = tags(worldLayout(game(), NOW));
    expect(t.has('light')).toBe(true);
    expect(t.has('net')).toBe(true);
    expect(t.has('chest')).toBe(true);
    expect(t.has('dock')).toBe(false);
    expect(t.has('boat')).toBe(false);
  });

  test('every lighthouse level looks different', () => {
    const looks = new Set<string>();
    for (let l = 1; l <= 10; l++) {
      const items = worldLayout(game((s) => (s.levels.light = l)), NOW).filter((i) => i.key.startsWith('light:'));
      looks.add(items.map((i) => `${i.model}@${i.size ?? ''}:${i.tint ?? ''}`).sort().join('|'));
    }
    expect(looks.size).toBe(10);
  });

  test('the dock appears at light 3', () => {
    expect(tags(worldLayout(game((s) => (s.levels.light = 2)), NOW)).has('dock')).toBe(false);
    expect(tags(worldLayout(game((s) => (s.levels.light = 3)), NOW)).has('dock')).toBe(true);
  });

  test('the boat is at the dock unless it is away; cargo shows crates', () => {
    const docked = worldLayout(game((s) => ((s.levels.light = 3), (s.boat.built = true))), NOW);
    expect(tags(docked).has('boat')).toBe(true);
    const away = worldLayout(
      game((s) => {
        s.levels.light = 3;
        s.boat.built = true;
        s.boat.voyage = { sea: 'dusk', dest: 'wreck', departAt: NOW - 1000, returnAt: NOW + 60_000 };
      }),
      NOW,
    );
    expect(tags(away).has('boat')).toBe(false);
    const laden = worldLayout(
      game((s) => {
        s.levels.light = 3;
        s.boat.built = true;
        s.boat.cargo = { sea: 'dusk', dest: 'wreck', haul: emptyMaterials(), discovery: false, fromIsland: emptyMaterials() };
      }),
      NOW,
    );
    expect(laden.some((i) => i.key.startsWith('boat:cargo'))).toBe(true);
  });

  test('island buildings go from a building site to the real building', () => {
    const at = (lvl: number) =>
      worldLayout(
        game((s) => {
          s.levels.light = 3;
          s.discovered = ['wreck'];
          s.buildings = { dismantler: lvl };
        }),
        NOW,
      ).find((i) => i.tag === 'bld:dismantler');
    expect(at(1)?.model).toBe('kk/building_stage_A');
    expect(at(3)?.model).not.toMatch(/building_stage/);
    expect(at(0)).toBeUndefined();
  });

  test('an island the light reaches but the boat has not found is a dark shape', () => {
    const lit = worldLayout(game((s) => (s.levels.light = 4)), NOW).filter((i) => i.tag === 'island:gullrock');
    expect(lit.length).toBeGreaterThan(0);
    expect(lit.every((i) => i.tint === 0x556070)).toBe(true);
    expect(worldLayout(game((s) => (s.levels.light = 3)), NOW).some((i) => i.tag === 'island:gullrock')).toBe(false);
  });

  test('every item uses a known model and has its own key', () => {
    for (let l = 1; l <= 10; l++) {
      const items = worldLayout(
        game((s) => {
          s.levels.light = l;
          s.levels.net = l * 5;
          s.levels.storage = Math.min(11, l + 1);
          s.boat.built = l >= 3;
          s.discovered = ['wreck', 'gullrock', 'oldlight', 'firefly'];
          s.buildings = { dismantler: 5, rack: 3, boatshed: 1, nest: 2, kelp: 4, lookout: 5, depot: 1, workshop: 2, desk: 3, jars: 4, orchard: 5, path: 1 };
        }),
        NOW,
      );
      for (const i of items) expect(MODELS[i.model], i.model).toBeDefined();
      expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
    }
  });
});

describe('boat on a voyage', () => {
  const s = game((s) => {
    s.levels.light = 3;
    s.boat.built = true;
    s.boat.voyage = { sea: 'dusk', dest: 'wreck', departAt: NOW, returnAt: NOW + 100_000 };
  });
  const pierEnd = boatPosition(game((g) => ((g.levels.light = 3), (g.boat.built = true))), NOW);

  test('before it leaves (clock moved back) it waits at the pier end', () => {
    const p = boatPosition(s, NOW - 50_000);
    expect(p.atDock).toBe(false);
    expect(p.x).toBeCloseTo(pierEnd.x, 1);
    expect(p.z).toBeCloseTo(pierEnd.z, 1);
  });

  test('half way it is at the island, and it is back at the pier when it returns', () => {
    const mid = boatPosition(s, NOW + 50_000);
    const [ix, iz] = hexToWorld(...DEST_HEX.wreck);
    expect(Math.hypot(mid.x - ix, mid.z - iz)).toBeLessThan(2.5);
    const back = boatPosition(s, NOW + 100_000);
    expect(back.x).toBeCloseTo(pierEnd.x, 1);
  });

  test('docked boat sits at the pier end', () => {
    const [px, pz] = hexToWorld(...PIER_TILE);
    expect(pierEnd.atDock).toBe(true);
    expect(Math.sign(pierEnd.x - px)).toBe(Math.sign(PIER_DIR[0]));
    expect(pierEnd.z).toBeGreaterThan(pz);
  });
});

describe('room on the island', () => {
  test('the pier starts from the edge of the two-ring island', () => {
    expect(hexDist(...PIER_TILE)).toBe(2);
  });
  test('drifting finds float clear of the island and everything decorated on it', () => {
    const s = game((g) => {
      g.levels.light = 10;
      for (const id of DECOR_IDS) g.decor[id] = 3;
    });
    const land = worldLayout(s, NOW).filter((i) => i.model === 'kk/hex_grass');
    for (const lane of [0, 0.5, 1])
      for (let t = 0; t <= 1; t += 0.05) {
        const p = flotsamPosition({ id: 1, material: 'wood', spawnedAt: NOW, lane }, NOW + t * FLOAT_LIFETIME_MS);
        for (const g of land) expect(Math.hypot(p.x - g.x, p.z - g.z)).toBeGreaterThan(2);
      }
  });
  test('the water gets the island\'s outline, not every tile', () => {
    const s = game((g) => {
      g.levels.light = 10;
      for (const id of DECOR_IDS) g.decor[id] = 3;
    });
    const shores = worldLayout(s, NOW).filter((i) => i.shore);
    expect(shores.length).toBeLessThanOrEqual(MAX_SHORES);
    // The centre tile is inland: no shore of its own.
    expect(worldLayout(s, NOW).find((i) => i.key.startsWith('home:0,0'))?.shore).toBeUndefined();
  });
});

describe('flotsam drift', () => {
  const item = { id: 1, material: 'wood' as const, spawnedAt: NOW, lane: 0 };
  test('crosses the sea from left to right over its life', () => {
    expect(flotsamPosition(item, NOW).x).toBeCloseTo(-16);
    expect(flotsamPosition(item, NOW + FLOAT_LIFETIME_MS).x).toBeCloseTo(16);
  });
  test('near lane is closer to the camera, and nothing is NaN', () => {
    const far = flotsamPosition({ ...item, lane: 0 }, NOW + 1000);
    const near = flotsamPosition({ ...item, lane: 1 }, NOW + 1000);
    expect(near.z).toBeGreaterThan(far.z);
    expect(Number.isFinite(far.x + far.z + near.x + near.z)).toBe(true);
  });
});
