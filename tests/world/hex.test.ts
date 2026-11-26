import { describe, expect, test } from 'vitest';
import { DEST_HEX, hexDist, hexToWorld, litRadius, litRadiusWorld, ring } from '../../src/world/hex';
import { DESTS } from '../../src/core/boat';
import type { DestId } from '../../src/core/data';

const DESTS_IDS = Object.keys(DESTS) as DestId[];

describe('hex grid', () => {
  test('one step east is one tile width', () => {
    expect(hexToWorld(1, 0)).toEqual([2, 0]);
    expect(hexToWorld(0, 0)).toEqual([0, 0]);
  });

  test('rings have 6n tiles at distance n', () => {
    expect(ring(1)).toHaveLength(6);
    expect(ring(2)).toHaveLength(12);
    for (const [q, r] of ring(3)) expect(hexDist(q, r)).toBe(3);
  });

  test('each island sits exactly where the light first reaches it', () => {
    for (const d of DESTS_IDS) {
      const [q, r] = DEST_HEX[d];
      expect(hexDist(q, r), d).toBe(DESTS[d].needLight + 10);
      expect(litRadius(DESTS[d].needLight)).toBeGreaterThanOrEqual(hexDist(q, r));
      expect(litRadius(DESTS[d].needLight - 1)).toBeLessThan(hexDist(q, r));
    }
  });

  test('islands are spread out and keep clear of the pier side', () => {
    for (const a of DESTS_IDS)
      for (const b of DESTS_IDS) {
        if (a >= b) continue;
        const [q1, r1] = DEST_HEX[a];
        const [q2, r2] = DEST_HEX[b];
        expect(hexDist(q1 - q2, r1 - r2), `${a}-${b}`).toBeGreaterThan(3);
      }
    for (const d of DESTS_IDS) {
      const [x, z] = hexToWorld(...DEST_HEX[d]);
      expect(x > 0 && z > 0, d).toBe(false);
    }
  });

  test('lit radius in world units', () => {
    expect(litRadius(3)).toBe(13);
    expect(litRadiusWorld(3)).toBe(26);
  });
});
