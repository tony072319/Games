/**
 * Sculpted islands: one piece of ground per island instead of hex tiles. A shape is a wobbly circle
 * (a few sine lobes on the radius) with a height profile by kind: a low beach ring that meets the
 * water at the outline, rising to grass and hills inland, with cliffs on some sides. Heights are a
 * pure function so objects can stand on the ground; the mesh is built from the same function.
 */
import * as THREE from 'three';
import type { DestId } from '../core/data';
import { DEST_HEX, hexToWorld } from './hex';

export type ShapeKind = 'home' | 'reef' | 'rock' | 'cape' | 'grove';

export interface Shape {
  kind: ShapeKind;
  cx: number;
  cz: number;
  radius: number;
  /** Radius wobble: [amplitude (share of radius), frequency, phase]. */
  lobes: [number, number, number][];
  /** Height of the inland ground above the beach. */
  plateau: number;
  /** Where cliffs face (angle) and how wide (0..1 of a half turn). */
  cliff: [number, number];
  seed: number;
}

const BEACH = 0.84;
const BEACH_TOP = 0.28;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** The home island's rings, as shares of its radius: harbour flats, the town terrace (and its street), the peak's edge. */
export const HARBOUR_RING = 0.8;
export const TOWN_RING = 0.5;
export const PEAK_RING = 0.27;

/** A point a share `frac` of the way out from the centre, at angle `a`. */
export function ringPoint(s: Shape, frac: number, a: number): [number, number] {
  const r = radiusAt(s, a) * frac;
  return [s.cx + Math.cos(a) * r, s.cz + Math.sin(a) * r];
}

export function radiusAt(s: Shape, a: number): number {
  let k = 1;
  for (const [amp, f, ph] of s.lobes) k += amp * Math.sin(f * a + ph);
  return s.radius * k;
}

/** Gentle rolling ground, 0..1. */
function hills(s: Shape, x: number, z: number): number {
  const p = s.seed;
  const v = Math.sin(x * 0.55 + p) * 0.5 + Math.sin(z * 0.62 - p * 1.7) * 0.5 + Math.sin((x + z) * 0.31 + p * 0.3) * 0.6 + Math.sin((x - z) * 0.9 + p * 2.1) * 0.25;
  return (v + 1.85) / 3.7;
}

/** Ground height at a point (world units); at or below 0 is water. */
export function heightAt(s: Shape, x: number, z: number): number {
  const dx = x - s.cx;
  const dz = z - s.cz;
  const a = Math.atan2(dz, dx);
  const t = Math.hypot(dx, dz) / radiusAt(s, a);
  if (t >= 1) return -0.2 - (t - 1) * 2;
  if (s.kind === 'home') return withCliff(s, a, t, homeHeight(s, x, z, a, t));
  // The beach: from the waterline up to BEACH_TOP.
  const beach = BEACH_TOP * Math.min(1, (1 - t) / (1 - BEACH));
  const inland = smooth(BEACH, BEACH - 0.32, t);
  let h: number;
  switch (s.kind) {
    case 'rock':
      // A tall pillar of rock on a skirt of shingle.
      h = beach + s.plateau * Math.pow(smooth(0.85, 0.2, t), 1.4);
      break;
    case 'grove':
      h = beach + s.plateau * Math.pow(smooth(0.95, 0, t), 0.8) + 0.25 * hills(s, x, z) * inland;
      break;
    default:
      h = beach + inland * (s.plateau + 0.45 * hills(s, x, z));
  }
  return withCliff(s, a, t, h);
}

/**
 * The home island in tiers, like a hill town: a narrow beach, the harbour flats, a rock wall up to
 * the town terrace, another up to the peak where the lighthouse stands. The walls wander a little.
 */
function homeHeight(s: Shape, x: number, z: number, a: number, t: number): number {
  const beach = BEACH_TOP * Math.min(1, (1 - t) / 0.07);
  if (t > 0.93) return beach;
  const w1 = 0.68 + 0.025 * Math.sin(3 * a + 0.7);
  const w2 = PEAK_RING + 0.02 * Math.sin(4 * a + 2);
  const harbour = BEACH_TOP + 0.27 * smooth(0.93, 0.88, t);
  const town = 1.6 * smooth(w1 + 0.015, w1 - 0.015, t);
  const peak = 1.9 * smooth(w2 + 0.02, w2 - 0.02, t) + 0.5 * smooth(w2, 0, t);
  return harbour + town + peak + 0.12 * hills(s, x, z) * smooth(0.93, 0.85, t);
}

/** Cliffs: on one side the high ground runs right to the edge and drops into the sea. */
function withCliff(s: Shape, a: number, t: number, h: number): number {
  const [ca, cw] = s.cliff;
  if (cw > 0) {
    let da = Math.abs(a - ca) % (2 * Math.PI);
    if (da > Math.PI) da = 2 * Math.PI - da;
    const c = smooth(cw * Math.PI, cw * Math.PI * 0.4, da);
    const high = (s.plateau + BEACH_TOP + 0.2) * smooth(1, 0.94, t);
    h = Math.max(h, high * c);
  }
  return h;
}

/** Points along the waterline, with a radius for the water's foam: [x, z, r]. */
export function outline(s: Shape, n: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radiusAt(s, a) * 0.999;
    // Spacing between points, so the foam circles join up.
    const gap = (2 * Math.PI * r) / n;
    out.push([s.cx + Math.cos(a) * r, s.cz + Math.sin(a) * r, Math.max(0.4, gap * 0.55)]);
  }
  return out;
}

/** The home island: grows smoothly as you expand it (land 0..28). */
export function homeShape(land: number): Shape {
  return {
    kind: 'home',
    cx: 0,
    cz: 0,
    radius: 13 + Math.max(0, land) * 0.1,
    lobes: [
      [0.08, 3, 0.4],
      [0.05, 5, 2.1],
      [0.03, 7, 4.0],
    ],
    // The town terrace's height: the back cliff rises to it.
    plateau: 2.1,
    cliff: [-2.2, 0.22],
    seed: 1.3,
  };
}

function destShape(d: DestId, kind: ShapeKind, radius: number, plateau: number, lobes: Shape['lobes'], cliff: Shape['cliff'], seed: number): Shape {
  const [cx, cz] = hexToWorld(...DEST_HEX[d]);
  return { kind, cx, cz, radius, lobes, plateau, cliff, seed };
}

/** The four islands the boat sails to, each with its own build. */
export const DEST_SHAPES: Record<DestId, Shape> = {
  wreck: destShape('wreck', 'reef', 2.6, 0.12, [[0.18, 2, 0.5], [0.1, 5, 1.2]], [0, 0], 2.2),
  gullrock: destShape('gullrock', 'rock', 2.4, 3.4, [[0.12, 3, 1.0], [0.08, 6, 0.2]], [1.2, 0.3], 3.7),
  oldlight: destShape('oldlight', 'cape', 3.0, 0.7, [[0.35, 2, 0.9], [0.06, 5, 2.5]], [-0.6, 0.25], 4.4),
  firefly: destShape('firefly', 'grove', 2.8, 1.2, [[0.1, 3, 2.0], [0.06, 4, 0.7]], [0, 0], 5.9),
};

export interface GroundColours {
  sand: number;
  grass: number;
  rock: number;
  /** Sea tint for the ground: [colour, amount]. */
  wash?: [number, number];
  /** The town's street (home island only). */
  path?: number;
}

/**
 * The island's ground as a low-poly mesh with one colour per face: sand near the water, grass
 * inland, rock where it is steep. Polar grid out a little past the waterline (that part is under water).
 */
export function terrainGeometry(s: Shape, c: GroundColours, rings = s.kind === 'home' ? 64 : 22, spokes = s.kind === 'home' ? 108 : 72): THREE.BufferGeometry {
  const tMax = 1.08;
  const pt = (i: number, j: number): [number, number, number] => {
    const t = (i / rings) * tMax;
    const a = (j / spokes) * Math.PI * 2;
    const r = radiusAt(s, a) * t;
    const x = s.cx + Math.cos(a) * r;
    const z = s.cz + Math.sin(a) * r;
    return [x, heightAt(s, x, z), z];
  };
  const wash = c.wash ? new THREE.Color(c.wash[0]) : null;
  const tone = (hex: number) => {
    const col = new THREE.Color(hex);
    if (wash && c.wash) col.lerp(wash, c.wash[1]);
    return col;
  };
  const sand = tone(c.sand);
  const grass = tone(c.grass);
  const rock = tone(c.rock);
  const path = tone(c.path ?? c.sand);
  const pos: number[] = [];
  const col: number[] = [];
  const tri = (p: [number, number, number][]) => {
    const ys = p.map((q) => q[1]);
    const top = Math.max(...ys);
    const span = top - Math.min(...ys);
    const run = Math.max(0.05, Math.hypot(p[0][0] - p[1][0], p[0][2] - p[1][2]), Math.hypot(p[1][0] - p[2][0], p[1][2] - p[2][2]));
    const steep = span / run;
    let base = steep > 0.75 || (s.kind === 'rock' && top > 1) ? rock : top < BEACH_TOP + 0.06 ? sand : grass;
    // The town's street: a ring of packed earth round the terrace.
    if (s.kind === 'home' && c.path !== undefined && base === grass) {
      const mx = (p[0][0] + p[1][0] + p[2][0]) / 3 - s.cx;
      const mz = (p[0][2] + p[1][2] + p[2][2]) / 3 - s.cz;
      const tt = Math.hypot(mx, mz) / radiusAt(s, Math.atan2(mz, mx));
      if (Math.abs(tt - TOWN_RING) < 0.035) base = path;
    }
    // A little per-face variation so the ground does not look flat-printed.
    const k = 0.94 + 0.06 * Math.sin(p[0][0] * 3.1 + p[0][2] * 1.7);
    for (const q of p) {
      pos.push(q[0], q[1], q[2]);
      col.push(base.r * k, base.g * k, base.b * k);
    }
  };
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < spokes; j++) {
      const a = pt(i, j);
      const b = pt(i + 1, j);
      const d = pt(i + 1, j + 1);
      const e = pt(i, j + 1);
      // Counter-clockwise seen from above, so the faces point up.
      if (i > 0) tri([a, e, d]);
      tri([a, d, b]);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
