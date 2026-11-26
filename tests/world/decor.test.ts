import { describe, expect, test } from 'vitest';
import { DECOR_IDS, DECOR_TIERS } from '../../src/core/decor';
import { LAND_MAX } from '../../src/core/land';
import { newGame } from '../../src/core/state';
import { MODELS } from '../../src/world/assets';
import { decorSpot, worldLayout } from '../../src/world/layout';
import { DECOR_LOOKS } from '../../src/world/looks';
import { heightAt, homeShape } from '../../src/world/terrain';

const NOW = 1_000_000;

describe('decorations in the world', () => {
  test('nothing bought, nothing shown', () => {
    expect(worldLayout(newGame(NOW, 'zh'), NOW).some((i) => i.key.startsWith('decor:'))).toBe(false);
  });
  test('a lantern at tier 2 stands at its spot, on the ground', () => {
    const s = newGame(NOW, 'zh');
    s.decor.lantern = 2;
    const parts = worldLayout(s, NOW).filter((i) => i.key.startsWith('decor:lantern:2:'));
    expect(parts.length).toBeGreaterThan(0);
    const [x, z] = decorSpot(0, 0);
    for (const p of parts) {
      expect(Math.hypot(p.x - x, p.z - z)).toBeLessThan(1.2);
      expect(p.y).toBeGreaterThan(0);
    }
  });
  test('every spot is on land at every island size, and spots are apart', () => {
    for (const land of [0, 10, LAND_MAX]) {
      const spots = DECOR_IDS.map((_, i) => decorSpot(i, land));
      for (const [x, z] of spots) expect(heightAt(homeShape(land), x, z)).toBeGreaterThan(0.05);
      for (let i = 1; i < spots.length; i++) expect(Math.hypot(spots[i][0] - spots[i - 1][0], spots[i][1] - spots[i - 1][1])).toBeGreaterThan(1.8);
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
