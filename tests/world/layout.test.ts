import { describe, expect, test } from 'vitest';
import { boatPosition, flotsamPosition, shoresOf, worldLayout, type WorldItem } from '../../src/world/layout';
import { MODELS } from '../../src/world/assets';
import { DEST_HEX, hexToWorld } from '../../src/world/hex';
import { DEST_SHAPES, heightAt, homeShape } from '../../src/world/terrain';
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
    // A dark ground and a dark landmark: everything there is in shadow.
    expect(lit.every((i) => i.tint === 0x556070 || i.wash?.[0] === 0x556070)).toBe(true);
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
      for (const i of items) expect(i.ground ?? MODELS[i.model], i.model).toBeDefined();
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
    // Moored just off its beach.
    expect(Math.hypot(mid.x - ix, mid.z - iz)).toBeLessThan(DEST_SHAPES.wreck.radius * 1.4 + 1);
    const back = boatPosition(s, NOW + 100_000);
    expect(back.x).toBeCloseTo(pierEnd.x, 1);
  });

  test('docked boat sits off the island, out to the right by the pier', () => {
    expect(pierEnd.atDock).toBe(true);
    expect(pierEnd.x).toBeGreaterThan(5);
    expect(heightAt(homeShape(0), pierEnd.x, pierEnd.z)).toBeLessThan(0);
  });
});

describe('a real island', () => {
  const full = game((g) => {
    g.levels.light = 10;
    for (const id of DECOR_IDS) g.decor[id] = 3;
  });
  test('no grid: one piece of sculpted ground for home', () => {
    const items = worldLayout(full, NOW);
    expect(items.some((i) => i.model === 'kk/hex_grass')).toBe(false);
    expect(items.filter((i) => i.ground?.kind === 'home')).toHaveLength(1);
  });
  test('things stand on the ground under them', () => {
    const items = worldLayout(full, NOW);
    const home = homeShape(full.land);
    for (const i of items.filter((x) => x.key.startsWith('house') || x.key.startsWith('decor:') || x.key.startsWith('chest:'))) {
      const h = heightAt(home, i.x, i.z);
      expect(h, i.key).toBeGreaterThan(0);
      // On the ground, or (a building on a slope) dug in a little: never deep.
      expect(i.y, i.key).toBeGreaterThanOrEqual(h - 0.3);
    }
  });
  test('the water foams along the outlines, within the shader limit', () => {
    expect(shoresOf(worldLayout(full, NOW)).length).toBeLessThanOrEqual(MAX_SHORES);
  });
});

describe('a lucky boat', () => {
  test('a boat home with something special shows a lantern', () => {
    const plain = game((g) => ((g.levels.light = 3), (g.boat.built = true)));
    expect(worldLayout(plain, NOW).find((i) => i.tag === 'boat')?.glow).toBeUndefined();
    const rare = game((g) => {
      g.levels.light = 3;
      g.boat.built = true;
      g.boat.cargo = { sea: 'dusk', dest: 'wreck', haul: { wood: 1, plastic: 0, rope: 0, metal: 0, glow: 0 }, discovery: false, fromIsland: { wood: 0, plastic: 0, rope: 0, metal: 0, glow: 0 }, rare: true };
    });
    expect(worldLayout(rare, NOW).find((i) => i.tag === 'boat')?.glow).toBe('lantern');
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

describe('friends live there', () => {
  test('friendship lights an island up, step by step', () => {
    const at = (f: number) =>
      worldLayout(
        game((g) => {
          g.levels.light = 10;
          g.discovered.push('wreck');
          g.friend.wreck = f;
        }),
        NOW,
      ).filter((i) => i.key.startsWith('friend:wreck:'));
    expect(at(0)).toHaveLength(0);
    expect(at(1).length).toBeGreaterThan(0);
    expect(at(3).length).toBeGreaterThan(at(1).length);
    expect(at(1).some((i) => i.glow)).toBe(true);
  });
});
