import { describe, expect, test } from 'vitest';
import { DESTS } from '../../src/core/boat';
import { type DestId } from '../../src/core/data';
import { answeringLights } from '../../src/core/answering';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { worldLayout } from '../../src/world/layout';
import { heightAt } from '../../src/world/terrain';

const NOW = 1_000_000;
const at = (light: number, parts = 0) => {
  const s = newGame(NOW, 'zh');
  s.levels.light = light;
  s.lightParts = parts;
  s.discovered.push(...(Object.keys(DESTS) as DestId[]));
  return s;
};

describe('far lighthouses answer the last climb', () => {
  test('none before the last level; one per part mended on it; all once it is done', () => {
    expect(answeringLights(at(8, 5))).toBe(0);
    expect(answeringLights(at(9, 0))).toBe(0);
    expect(answeringLights(at(9, 4))).toBe(4);
    expect(answeringLights(at(10))).toBe(T.LIGHT_PARTS);
  });
  test('they stand far out on the horizon, on water, each lit', () => {
    const items = worldLayout(at(9, 6), NOW);
    const far = items.filter((i) => i.key.startsWith('answer:'));
    expect(far).toHaveLength(6);
    const ground = items.flatMap((i) => (i.ground ? [i.ground] : []));
    for (const f of far) {
      expect(Math.hypot(f.x, f.z)).toBeGreaterThan(45);
      expect(Math.max(...ground.map((g) => heightAt(g, f.x, f.z)))).toBeLessThan(0);
      expect(f.glow).toBe('beacon');
    }
    expect(worldLayout(at(10), NOW).filter((i) => i.key.startsWith('answer:'))).toHaveLength(T.LIGHT_PARTS);
  });
});
