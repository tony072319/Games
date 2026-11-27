import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { DEST_SHAPES, HARBOUR_RING, PEAK_RING, TOWN_RING, heightAt, homeShape, outline, radiusAt, ringPoint, terrainGeometry, type Shape } from '../../src/world/terrain';

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

describe('the home island is one hill', () => {
  const s = homeShape(0);
  const at = (frac: number, a = 0.4) => {
    const [x, z] = ringPoint(s, frac, a);
    return heightAt(s, x, z);
  };
  test('harbour below town below the top, all on land', () => {
    const harbour = at(HARBOUR_RING);
    const town = at(TOWN_RING);
    const peak = at(PEAK_RING * 0.5);
    expect(harbour).toBeGreaterThan(0.3);
    expect(town).toBeGreaterThan(harbour + 1);
    expect(peak).toBeGreaterThan(town + 1);
  });
  test('it climbs all the way: going inland never takes you down a step', () => {
    for (let a = 0; a < 6.28; a += 0.37) for (let f = 0.9; f > 0.02; f -= 0.01) expect(at(f - 0.01, a), `${a.toFixed(2)} ${f.toFixed(2)}`).toBeGreaterThan(at(f, a) - 0.08);
  });
  test('no ring of walls: most of the way round, the banks are slopes you could walk up', () => {
    // Steepest rise between the harbour and the top, at each angle round the island.
    const steepest = (a: number) => {
      let m = 0;
      for (let f = 0.15; f < 0.9; f += 0.005) m = Math.max(m, (at(f, a) - at(f + 0.005, a)) / (radiusAt(s, a) * 0.005));
      return m;
    };
    const all = Array.from({ length: 36 }, (_, i) => steepest((i / 36) * Math.PI * 2));
    // Walkable: under about 45 degrees. (A few places are steeper: rock shows there.)
    expect(all.filter((m) => m < 1).length).toBeGreaterThan(18);
    expect(Math.max(...all)).toBeLessThan(2.2);
  });
  test('the hill is not the same all the way round', () => {
    const heights = Array.from({ length: 12 }, (_, i) => at(TOWN_RING, (i / 12) * Math.PI * 2));
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.4);
  });
  test('a street runs through the town', () => {
    const g = terrainGeometry(s, { sand: 0xf0d9a0, grass: 0x8fbf5a, rock: 0x9a9088, path: 0xc9b48a });
    const col = g.getAttribute('color');
    const want = new THREE.Color(0xc9b48a);
    let street = 0;
    for (let i = 0; i < col.count; i++) if (Math.abs(col.getX(i) - want.r) < 0.05 && Math.abs(col.getZ(i) - want.b) < 0.05) street++;
    expect(street).toBeGreaterThan(100);
  });
});
