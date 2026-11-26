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

import * as THREE from 'three';
import { shipPosition } from '../../src/world/layout';
import { DEFAULT_CAM, DEFAULT_TARGET, seaView } from '../../src/world/view';

describe('the answering lighthouses can be seen', () => {
  const towers = () => worldLayout(at(10), NOW).filter((i) => i.key.startsWith('answer:'));
  const onScreen = (pos: THREE.Vector3, target: THREE.Vector3, aspect: number) => {
    const cam = new THREE.PerspectiveCamera(36, aspect, 0.1, 600);
    cam.position.copy(pos);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    return towers().filter((f) => {
      const p = new THREE.Vector3(f.x, 3, f.z).project(cam);
      return Math.abs(p.x) <= 0.95 && Math.abs(p.y) <= 0.95 && p.z < 1;
    }).length;
  };
  test('the lit-sea view at the last level shows every one, on a phone and on a wide screen', () => {
    const v = seaView(10);
    const pos = v.target.clone().add(v.dir.clone().multiplyScalar(v.dist));
    expect(onScreen(pos, v.target, 0.5)).toBe(T.LIGHT_PARTS);
    expect(onScreen(pos, v.target, 16 / 9)).toBe(T.LIGHT_PARTS);
  });
  test('the everyday view shows most of them', () => {
    expect(onScreen(DEFAULT_CAM, DEFAULT_TARGET, 0.5)).toBeGreaterThanOrEqual(T.LIGHT_PARTS / 2);
    expect(onScreen(DEFAULT_CAM, DEFAULT_TARGET, 16 / 9)).toBe(T.LIGHT_PARTS);
  });
  test('no night ship sails through one', () => {
    for (const f of towers())
      for (let lane = 0; lane <= 1; lane += 0.1)
        for (let t = 0; t <= 1; t += 0.02) {
          const p = shipPosition({ id: 1, lane, spawnedAt: 0 } as never, t * T.SHIP_LIFE_MS);
          expect(Math.hypot(p.x - f.x, p.z - f.z)).toBeGreaterThan(6);
        }
  });
  test('they stand still (stone, not floats)', () => {
    for (const f of towers()) expect(f.bob).toBeFalsy();
  });
});
