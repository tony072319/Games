import { describe, expect, test } from 'vitest';
import { DECOR_IDS, DECOR_TIERS } from '../../src/core/decor';
import { newGame } from '../../src/core/state';
import { MODELS } from '../../src/world/assets';
import { DECOR_SLOTS, PIER_DIR, PIER_TILE, hexDist, hexToWorld } from '../../src/world/hex';
import { worldLayout } from '../../src/world/layout';
import { DECOR_LOOKS } from '../../src/world/looks';

const NOW = 1_000_000;

describe('decorations in the world', () => {
  test('nothing bought, nothing shown', () => {
    expect(worldLayout(newGame(NOW, 'zh'), NOW).some((i) => i.key.startsWith('decor:'))).toBe(false);
  });
  test('a lantern at tier 2 stands on its own new tile at its slot', () => {
    const s = newGame(NOW, 'zh');
    s.decor.lantern = 2;
    const items = worldLayout(s, NOW).filter((i) => i.key.startsWith('decor:lantern:'));
    const [x, z] = hexToWorld(...DECOR_SLOTS.lantern);
    const tile = items.find((i) => i.key.startsWith('decor:lantern:tile'));
    expect(tile).toBeDefined();
    expect([tile!.x, tile!.z]).toEqual([x, z]);
    const parts = items.filter((i) => i.key.startsWith('decor:lantern:2:'));
    expect(parts.length).toBeGreaterThan(0);
    for (const p of parts) expect(Math.hypot(p.x - x, p.z - z)).toBeLessThan(1.2);
  });
  test('ten different slots in the second ring, none on the pier', () => {
    const slots = DECOR_IDS.map((id) => DECOR_SLOTS[id]);
    expect(new Set(slots.map((h) => h.join())).size).toBe(10);
    for (const h of slots) expect(hexDist(...h)).toBe(2);
    // Away from the line the pier takes from its tile.
    const [px, pz] = hexToWorld(...PIER_TILE);
    const len = Math.hypot(...PIER_DIR);
    for (const h of slots) {
      const [x, z] = hexToWorld(...h);
      const along = ((x - px) * PIER_DIR[0] + (z - pz) * PIER_DIR[1]) / len;
      const off = Math.abs((x - px) * PIER_DIR[1] - (z - pz) * PIER_DIR[0]) / len;
      expect(along < 0 || off > 1.6, h.join()).toBe(true);
    }
  });
  test('every tier has a look made of known models', () => {
    for (const id of DECOR_IDS) {
      expect(DECOR_LOOKS[id]).toHaveLength(DECOR_TIERS);
      for (const tier of DECOR_LOOKS[id]) {
        expect(tier.length).toBeGreaterThan(0);
        for (const p of tier) expect(MODELS[p.model], `${id} ${p.model}`).toBeDefined();
      }
    }
  });
});
