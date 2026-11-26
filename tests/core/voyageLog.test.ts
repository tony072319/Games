import { describe, expect, test } from 'vitest';
import { MATERIALS } from '../../src/core/data';
import { buildBoat, settleVoyage, startVoyage, unloadBoat, voyageHaul, voyageMs } from '../../src/core/boat';
import { STORY_COUNT, rollStory } from '../../src/core/voyageLog';
import { SAVE_KEY, loadGame, saveGame, type KV } from '../../src/core/save';
import { newGame, type GameState } from '../../src/core/state';
import { T } from '../../src/core/tuning';

const sailor = (): GameState => {
  const s = newGame(0, 'zh');
  s.levels.light = 6;
  for (const m of MATERIALS) s.materials[m] = 1e9;
  buildBoat(s);
  return s;
};
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe('the voyage log', () => {
  test('every trip comes home with a story line for its island', () => {
    const s = sailor();
    expect(startVoyage(s, 'wreck', 0, seq(0.99, 0.2))).toBe(true);
    const st = s.boat.voyage!.story!;
    expect(st.n).toBeGreaterThanOrEqual(1);
    expect(st.n).toBeLessThanOrEqual(STORY_COUNT);
    const c = settleVoyage(s, s.boat.voyage!.returnAt, () => 0.99)!;
    expect(c.story).toEqual(st);
  });
  test('the same dice give the same story', () => {
    expect(rollStory('gullrock', seq(0.3, 0.6))).toEqual(rollStory('gullrock', seq(0.3, 0.6)));
  });
  test('a lucky trip: more haul, once', () => {
    const s = sailor();
    const plain = voyageHaul(s, 'wreck').metal;
    startVoyage(s, 'wreck', 0, seq(0.0, 0.0)); // bonus roll 0 → bonus; pick 0 → haul
    expect(s.boat.voyage!.story!.bonus).toBe('haul');
    const c = settleVoyage(s, s.boat.voyage!.returnAt, () => 0.99)!;
    expect(c.haul.metal).toBeCloseTo((plain + 200) * (1 + T.STORY_HAUL), 0); // +200 first-find metal
    expect(c.rare).toBe(true);
  });
  test('a lucky trip: home early', () => {
    const s = sailor();
    startVoyage(s, 'oldlight', 0, seq(0.0, 0.5));
    expect(s.boat.voyage!.story!.bonus).toBe('early');
    expect(s.boat.voyage!.returnAt).toBeCloseTo(voyageMs(s, 'oldlight') * (1 - T.STORY_EARLY), -2);
  });
  test('most trips are quiet', () => {
    const s = sailor();
    startVoyage(s, 'wreck', 0, seq(0.99, 0.1));
    expect(s.boat.voyage!.story!.bonus).toBeUndefined();
  });
  test('an old save with a voyage and no story still settles, and saves keep the story', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const s = sailor();
    startVoyage(s, 'wreck', 0, seq(0.0, 0.0));
    saveGame(kv, s);
    expect(loadGame(kv, 0, 'zh').state.boat.voyage?.story).toEqual(s.boat.voyage!.story);
    const data = JSON.parse(map.get(SAVE_KEY)!);
    delete data.boat.voyage.story;
    const r = loadGame({ getItem: () => JSON.stringify(data), setItem() {} }, 0, 'zh').state;
    const c = settleVoyage(r, r.boat.voyage!.returnAt, () => 0.99)!;
    expect(c).not.toBeNull();
    expect(unloadBoat(r)).not.toBeNull();
    for (const m of MATERIALS) expect(Number.isFinite(r.materials[m])).toBe(true);
  });
});
