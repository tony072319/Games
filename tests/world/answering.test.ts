import { describe, expect, test } from 'vitest';
import { DESTS } from '../../src/core/boat';
import { type DestId } from '../../src/core/data';
import { answeringLights } from '../../src/core/answering';
import { newGame } from '../../src/core/state';
import { T } from '../../src/core/tuning';
import { worldLayout } from '../../src/world/layout';

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
  test('the world does not draw them: they are far beyond sight, told of in words only', () => {
    for (const st of [at(9, 6), at(10)]) expect(worldLayout(st, NOW).filter((i) => i.key.startsWith('answer:'))).toHaveLength(0);
  });
});
