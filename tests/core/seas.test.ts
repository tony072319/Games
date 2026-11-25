import { describe, expect, test } from 'vitest';
import { canPassLight, materialStars, passLight, starlightFor, switchSea, SEA_DEF } from '../../src/core/seas';
import { buildBoat, settleVoyage, startVoyage } from '../../src/core/boat';
import { autoRate, chestCapacity, chestTotal, netRate, upgradeCost } from '../../src/core/economy';
import { construct } from '../../src/core/islands';
import { applyOffline, tick } from '../../src/core/sim';
import { newGame, type GameState } from '../../src/core/state';
import { loadGame, saveGame, type KV } from '../../src/core/save';

const H = 3_600_000;

function lit(): GameState {
  const s = newGame(0, 'zh');
  for (const m of ['wood', 'plastic', 'rope', 'metal', 'glow'] as const) s.materials[m] = 1e12;
  s.levels.light = 10;
  s.levels.net = 5;
  s.discovered.push('wreck', 'gullrock');
  construct(s, 'dismantler', 0);
  construct(s, 'dismantler', 0);
  return s;
}

describe('passing the light on', () => {
  test('needs the lighthouse at 10', () => {
    const s = lit();
    s.levels.light = 9;
    expect(canPassLight(s)).toBe(false);
    expect(passLight(s, 0)).toBe(false);
  });

  test('starlight: 10 + 2 per island found + building levels', () => {
    expect(starlightFor(lit())).toBe(10 + 4 + 2);
  });

  test('moves to the fog sea with a fresh lighthouse, keeping the boat and the old sea; materials become starlight', () => {
    const s = lit();
    buildBoat(s);
    s.levels.speed = 3;
    const stars = 16 + materialStars(s);
    expect(passLight(s, 1000)).toBe(true);
    expect(s.sea).toBe('fog');
    expect(s.levels).toMatchObject({ net: 1, storage: 1, light: 1, speed: 3 });
    expect(s.discovered).toEqual([]);
    expect(s.buildings).toEqual({});
    expect(s.starlight).toBe(stars);
    expect(s.materials.wood).toBe(0);
    expect(s.boat.built).toBe(true);
    expect(s.seas.dusk?.levels.light).toBe(10);
    expect(s.seas.dusk?.discovered).toContain('wreck');
    expect(canPassLight(s)).toBe(false);
  });

  test('switching back shows the old sea as it was; starlight is not paid twice', () => {
    const s = lit();
    passLight(s, 0);
    const paid = s.starlight;
    switchSea(s, 'dusk', 0);
    expect(s.sea).toBe('dusk');
    expect(s.levels.light).toBe(10);
    expect(s.buildings.dismantler).toBe(2);
    expect(canPassLight(s)).toBe(false); // fog already reached
    switchSea(s, 'fog', 0);
    expect(s.levels.light).toBe(1);
    expect(s.starlight).toBe(paid);
  });

  test('the last sea cannot be passed on', () => {
    const s = lit();
    passLight(s, 0);
    s.levels.light = 10;
    expect(passLight(s, 0)).toBe(true);
    expect(s.sea).toBe('aurora');
    s.levels.light = 10;
    expect(canPassLight(s)).toBe(false);
  });
});

describe('sea economy', () => {
  test('farther seas yield more and cost more; starlight adds 3% each', () => {
    const s = newGame(0, 'zh');
    s.sea = 'fog';
    expect(netRate(s)).toBeCloseTo(autoRate(1) * SEA_DEF.fog.rate);
    expect(upgradeCost('net', 1, s).wood).toBe(15 * SEA_DEF.fog.cost);
    expect(upgradeCost('speed', 1, s).wood).toBe(150); // boat upgrades don't scale
    s.starlight = 10;
    expect(netRate(s)).toBeCloseTo(autoRate(1) * SEA_DEF.fog.rate * 1.3);
  });

  test('an old sea keeps filling its own chest at half speed while you are away from it', () => {
    const s = lit();
    passLight(s, 0);
    tick(s, 1000);
    applyOffline(s, 2 * H);
    const dusk = s.seas.dusk!;
    const rate = autoRate(5) * 1.25 * (1 + 0.03 * s.starlight); // gull rock found there
    expect(chestTotal(dusk.chest)).toBeCloseTo(rate * 2 * 3600 * 0.5, 0);
  });

  test('an old sea keeps its island production', () => {
    const s = lit();
    passLight(s, 0);
    applyOffline(s, 3 * H);
    expect(s.seas.dusk!.islandStore.wreck!.metal).toBeGreaterThan(100);
  });

  test('switching to the old sea shows its filled chest; chest capacity follows that sea', () => {
    const s = lit();
    passLight(s, 0);
    applyOffline(s, 100 * H);
    switchSea(s, 'dusk', 100 * H);
    expect(chestTotal(s.chest)).toBeCloseTo(chestCapacity(s), 0);
  });

  test('the boat can be away at one sea while you look at another', () => {
    const s = lit();
    buildBoat(s);
    s.levels.light = 10;
    startVoyage(s, 'wreck', 0);
    passLight(s, 0);
    const cargo = settleVoyage(s, H);
    expect(cargo?.sea).toBe('dusk');
    expect(cargo!.haul.metal).toBeGreaterThan(0);
  });
});

describe('save', () => {
  test('seas and starlight round-trip; old saves start in the dusk sea', () => {
    const map = new Map<string, string>();
    const kv: KV = { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
    const s = lit();
    passLight(s, 0);
    saveGame(kv, s);
    const r = loadGame(kv, 0, 'zh');
    expect(r.status).toBe('loaded');
    expect(r.state.sea).toBe('fog');
    expect(r.state.starlight).toBe(s.starlight);
    expect(r.state.seas.dusk?.levels.light).toBe(10);
    expect(loadGame({ getItem: () => '{"version":1,"materials":{},"levels":{}}', setItem() {} }, 0, 'zh').state.sea).toBe('dusk');
  });
});
