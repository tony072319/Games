import { describe, expect, test } from 'vitest';
import { DEST_SHAPES, heightAt, homeShape, outline, terrainGeometry, type Shape } from '../../src/world/terrain';

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
    const beach = heightAt(s, s.radius * 0.95, 0);
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
    expect(big.radius).toBeGreaterThan(small.radius * 1.3);
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
