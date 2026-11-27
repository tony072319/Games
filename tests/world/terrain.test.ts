import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { ROADS } from '../../src/world/homeplan';
import { DEST_SHAPES, heightAt, homeShape, outline, radiusAt, ringPoint, terrainGeometry, type Shape } from '../../src/world/terrain';

const shapes: Shape[] = [homeShape(0), homeShape(28), ...Object.values(DEST_SHAPES)];

describe('sculpted islands', () => {
  test('heights are finite everywhere and the sea is below zero', () => {
    for (const s of shapes)
      for (let x = -30; x <= 30; x += 0.7)
        for (let z = -30; z <= 30; z += 0.7) expect(Number.isFinite(heightAt(s, x, z))).toBe(true);
    for (const s of shapes) expect(heightAt(s, s.cx + s.radius * 2, s.cz)).toBeLessThan(0);
  });
  test('land rises from a low beach to higher ground inland', () => {
    const s = homeShape(0);
    const [bx, bz] = ringPoint(s, 0.97, 0.3);
    const beach = heightAt(s, bx, bz);
    expect(beach).toBeGreaterThan(0);
    expect(beach).toBeLessThan(0.4);
    expect(heightAt(s, 0, 0)).toBeGreaterThan(beach);
  });
  test('the outline sits where land meets water', () => {
    for (const s of shapes)
      for (const [x, z] of outline(s, 24)) expect(Math.abs(heightAt(s, x, z))).toBeLessThan(0.15);
  });
  test('expanding the island makes it bigger all round', () => {
    const small = homeShape(0);
    const big = homeShape(28);
    expect(big.radius).toBeGreaterThan(small.radius * 1.2);
    for (const [x, z] of outline(small, 16)) expect(heightAt(big, x, z)).toBeGreaterThan(0.1);
  });
  test('each destination island has its own build', () => {
    const peaks = Object.values(DEST_SHAPES).map((s) => heightAt(s, s.cx, s.cz).toFixed(1));
    expect(new Set(peaks).size).toBeGreaterThan(2);
    expect(heightAt(DEST_SHAPES.gullrock, DEST_SHAPES.gullrock.cx, DEST_SHAPES.gullrock.cz)).toBeGreaterThan(2.5);
  });
  test('the mesh has coloured, finite vertices', () => {
    const g = terrainGeometry(homeShape(5), { sand: 0xf0d9a0, grass: 0x8fbf5a, rock: 0x9a9088, wash: undefined });
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    expect(pos.count).toBeGreaterThan(500);
    expect(col.count).toBe(pos.count);
    for (let i = 0; i < pos.count; i++) expect(Number.isFinite(pos.getY(i))).toBe(true);
    // Faces point up (seen from above), or the ground would vanish.
    const nrm = g.getAttribute('normal');
    let up = 0;
    for (let i = 0; i < nrm.count; i++) if (nrm.getY(i) > 0) up++;
    expect(up / nrm.count).toBeGreaterThan(0.95);
  });
});

describe('the home island is real ground, not rings', () => {
  const s = homeShape(0);
  const at = (frac: number, a: number) => {
    const [x, z] = ringPoint(s, frac, a);
    return heightAt(s, x, z);
  };
  const angles = Array.from({ length: 36 }, (_, i) => (i / 36) * Math.PI * 2);
  test('the lighthouse stands on the highest ground', () => {
    const top = heightAt(s, 0, 0);
    expect(top).toBeGreaterThan(3);
    for (let x = -16; x <= 16; x += 0.5) for (let z = -16; z <= 16; z += 0.5) expect(heightAt(s, x, z), `${x},${z}`).toBeLessThanOrEqual(top + 0.05);
  });
  test('the same distance from the middle is high in one direction and low in another', () => {
    for (const frac of [0.35, 0.5, 0.65]) {
      const hs = angles.map((a) => at(frac, a));
      expect(Math.max(...hs) - Math.min(...hs), `at ${frac}`).toBeGreaterThan(1);
    }
  });
  test('no terraces: the way up from the shore is one slope, not a bank, a flat and another bank', () => {
    // The hill itself, before any house plot is cut into it.
    const bare = homeShape(0, 0);
    const up = (f: number, a: number) => {
      const [x, z] = ringPoint(bare, f, a);
      return heightAt(bare, x, z);
    };
    // Walking in from the shore: how many separate steep climbs, with level ground between them?
    const climbs = (a: number) => {
      let n = 0;
      let rise = 0;
      let level = 1;
      for (let f = 0.86; f > 0.1; f -= 0.01) {
        const step = (up(f - 0.01, a) - up(f, a)) / (radiusAt(bare, a) * 0.01);
        if (step > 0.4) {
          // A new climb only counts after a good stretch of level ground.
          if (level > 0.08 && rise > 0.5) n++;
          if (level > 0.08) rise = 0;
          rise += step * radiusAt(bare, a) * 0.01;
          level = 0;
        } else level += 0.01;
      }
      return n + (rise > 0.5 ? 1 : 0);
    };
    const stepped = angles.filter((a) => climbs(a) >= 2).length;
    expect(stepped).toBeLessThan(angles.length / 4);
  });
  test('most of the coast is a low shore; where the ridge meets the sea there is a cliff', () => {
    const shore = angles.map((a) => at(0.9, a));
    expect(shore.filter((h) => h < 1).length).toBeGreaterThan(24);
    expect(Math.max(...shore)).toBeGreaterThan(1.4);
  });
  test('the road from the pier climbs to the lighthouse without a wall in its way', () => {
    const line = ROADS[0];
    let last = -1;
    let climbed = 0;
    for (let k = 0; k + 1 < line.length; k++)
      for (let f = 0; f < 1; f += 0.1) {
        const x = (line[k][0] + (line[k + 1][0] - line[k][0]) * f) * s.radius;
        const z = (line[k][1] + (line[k + 1][1] - line[k][1]) * f) * s.radius;
        const h = heightAt(s, x, z);
        expect(h, `on the road at ${x.toFixed(1)},${z.toFixed(1)}`).toBeGreaterThan(0.2);
        if (last >= 0) {
          // No step up or down that a cart could not manage.
          expect(Math.abs(h - last), `step at ${x.toFixed(1)},${z.toFixed(1)}`).toBeLessThan(0.75);
          climbed += Math.max(0, h - last);
        }
        last = h;
      }
    expect(climbed).toBeGreaterThan(2.5);
  });
  test('roads run through it', () => {
    const g = terrainGeometry(s, { sand: 0xf0d9a0, grass: 0x8fbf5a, rock: 0x9a9088, path: 0xc9b48a });
    const col = g.getAttribute('color');
    const want = new THREE.Color(0xc9b48a);
    let street = 0;
    for (let i = 0; i < col.count; i++) if (Math.abs(col.getX(i) - want.r) < 0.05 && Math.abs(col.getZ(i) - want.b) < 0.05) street++;
    expect(street).toBeGreaterThan(100);
  });
});
