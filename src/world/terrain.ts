/**
 * Sculpted islands: one piece of ground per island instead of hex tiles. A shape is a wobbly
 * outline (a few sine lobes on the radius) with ground inside it. The small islands the boat sails
 * to have a simple build each (a reef, a stack, a cape, a grove). The home island is real terrain,
 * drawn from its plan (homeplan.ts): hills, a ridge, a cove, levelled plots for houses.
 * Heights are a pure function so objects can stand on the ground; the mesh is built from the same function.
 */
import * as THREE from 'three';
import type { DestId } from '../core/data';
import { DEST_HEX, hexToWorld } from './hex';
import { FIXED_PADS, HILLS, HOME_LOBES, PLOT_PADS, hillAt, nearestRoad } from './homeplan';

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
  /** Ground levelled for things to stand on (the home island): [x, z, radius, height], in world units. */
  pads?: [number, number, number, number][];
}

const BEACH = 0.84;
const BEACH_TOP = 0.28;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

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
  if (s.kind === 'home') return homeHeight(s, x, z, t);
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
      h = beach + s.plateau * Math.pow(smooth(0.95, 0, t), 0.8) * (0.75 + 0.5 * hills(s, x * 1.9, z * 1.9)) + 0.25 * hills(s, x, z) * inland;
      break;
    default: {
      // Low ground that rolls, with a rise to one side rather than a dome in the middle.
      const rise = Math.exp(-((dx - s.radius * 0.3) ** 2 + (dz + s.radius * 0.25) ** 2) / (s.radius * s.radius * 0.18));
      h = beach + inland * (s.plateau + 0.55 * hills(s, x * 2.3, z * 2.3) + 0.5 * rise);
    }
  }
  return withCliff(s, a, t, h);
}

/**
 * The home island's ground before anything is levelled on it. Not built in rings: the height at a
 * point comes from the hills of the plan (a summit, a ridge, a knoll, a shoulder, a cove), on low
 * land that rolls a little and tilts up toward the back. Only the last stretch before the water
 * follows the coast: a beach where the land is low, a cliff where a hill runs out to sea.
 */
function rawHome(s: Shape, x: number, z: number, t: number): number {
  const u = (x - s.cx) / s.radius;
  const v = (z - s.cz) / s.radius;
  let land = 0.38 + 0.22 * (hills(s, x, z) - 0.5) + 0.2 * smooth(0.35, -0.7, v);
  for (const h of HILLS) land += hillAt(h, u, v);
  // The shore: the land comes down to the beach over the last stretch (steeply, where it is high).
  // The shore is not the same all round: wide sand in the coves, a short step up from the water on the headlands.
  const a = Math.atan2(z - s.cz, x - s.cx);
  const cove = 0.5 + 0.5 * Math.sin(3 * a + 2.0) * Math.cos(a - 0.6);
  const beach = BEACH_TOP * Math.min(1, (1 - t) / (0.045 + 0.05 * cove));
  return beach + Math.max(0, land) * smooth(0.985, 0.9 - 0.13 * cove, t);
}

/** The home island's ground: its terrain, levelled where something stands (each house on its own plot, cut into the slope). */
function homeHeight(s: Shape, x: number, z: number, t: number): number {
  let h = rawHome(s, x, z, t);
  if (!s.pads) return h;
  // Each plot is level across its own width and eases into the hill round it. Where two plots'
  // banks meet, the nearer plot wins, so neither is tilted by its neighbour.
  let target = 0;
  let weight = 0;
  let most = 0;
  for (const [px, pz, r, ph] of s.pads) {
    const d2 = (x - px) ** 2 + (z - pz) ** 2;
    // The cut eases back into the hill over more than a plot's width, so it is a bank, not a wall.
    const reach = r * 2.5;
    if (d2 >= reach * reach) continue;
    const w = smooth(reach, r, Math.sqrt(d2));
    const w4 = w * w * w * w;
    target += w4 * ph;
    weight += w4;
    if (w > most) most = w;
  }
  if (weight > 0) h += (target / weight - h) * most;
  return h;
}

/** How much of a road lies at a point of the home island (0..1): the roads of the plan, a cart's width across. */
export function roadAt(s: Shape, x: number, z: number): number {
  if (s.kind !== 'home') return 0;
  const d = nearestRoad((x - s.cx) / s.radius, (z - s.cz) / s.radius).d * s.radius;
  return smooth(0.62, 0.3, d);
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

const homes = new Map<string, Shape>();

/**
 * The home island: grows smoothly as you expand it (land 0..28). `built` is how many of the
 * town's plots have a house on them: the ground is levelled under those (all of them, if not
 * said). The same island is handed back each time it is asked for.
 */
export function homeShape(land: number, built = PLOT_PADS.length): Shape {
  const n = Math.min(PLOT_PADS.length, Math.max(0, built));
  const id = `${land}:${n}`;
  const known = homes.get(id);
  if (known) return known;
  const s: Shape = { kind: 'home', cx: 0, cz: 0, radius: 17 + Math.max(0, land) * 0.13, lobes: HOME_LOBES, plateau: 0, cliff: [0, 0], seed: 1.3 };
  // Each plot is levelled at the height the hill has there.
  s.pads = [...FIXED_PADS, ...PLOT_PADS.slice(0, n)].map(([u, v, r]) => {
    const x = u * s.radius;
    const z = v * s.radius;
    return [x, z, r, rawHome(s, x, z, Math.hypot(x, z) / radiusAt(s, Math.atan2(z, x)))];
  });
  homes.set(id, s);
  return s;
}

function destShape(d: DestId, kind: ShapeKind, radius: number, plateau: number, lobes: Shape['lobes'], cliff: Shape['cliff'], seed: number): Shape {
  const [cx, cz] = hexToWorld(...DEST_HEX[d]);
  return { kind, cx, cz, radius, lobes, plateau, cliff, seed };
}

/** The four islands the boat sails to, each with its own build. */
export const DEST_SHAPES: Record<DestId, Shape> = {
  wreck: destShape('wreck', 'reef', 3.6, 0.12, [[0.18, 2, 0.5], [0.1, 5, 1.2]], [0, 0], 2.2),
  gullrock: destShape('gullrock', 'rock', 3.2, 3.4, [[0.12, 3, 1.0], [0.08, 6, 0.2]], [1.2, 0.3], 3.7),
  oldlight: destShape('oldlight', 'cape', 4.2, 0.7, [[0.35, 2, 0.9], [0.06, 5, 2.5]], [-0.6, 0.25], 4.4),
  firefly: destShape('firefly', 'grove', 3.9, 1.2, [[0.1, 3, 2.0], [0.06, 4, 0.7]], [0, 0], 5.9),
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
 * The island's ground as one smooth mesh: a polar grid out a little past the waterline (that part
 * is under water). Each point carries its plain colour (sand near the water, grass inland, rock
 * where it is steep, packed earth on the roads) and how much road lies there; the ground's
 * material paints the detail from those (see ground.ts).
 */
export function terrainGeometry(s: Shape, c: GroundColours, rings = s.kind === 'home' ? 84 : 26, spokes = s.kind === 'home' ? 144 : 72): THREE.BufferGeometry {
  const tMax = 1.08;
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
  const road: number[] = [];
  const index: number[] = [];
  // The middle point, then ring after ring.
  const add = (x: number, z: number, t: number) => {
    const y = heightAt(s, x, z);
    pos.push(x, y, z);
    // How steep the ground is here, from the heights a small step away.
    const e = 0.12;
    const steep = Math.hypot(heightAt(s, x + e, z) - heightAt(s, x - e, z), heightAt(s, x, z + e) - heightAt(s, x, z - e)) / (2 * e);
    const k = c.path !== undefined ? roadAt(s, x, z) : 0;
    let base = steep > 0.75 || (s.kind === 'rock' && y > 1) ? rock : y < BEACH_TOP + 0.06 ? sand : grass;
    if (k > 0.5 && base === grass) base = path;
    col.push(base.r, base.g, base.b);
    road.push(t < 1 ? k : 0);
  };
  add(s.cx, s.cz, 0);
  for (let i = 1; i <= rings; i++) {
    const t = (i / rings) * tMax;
    for (let j = 0; j < spokes; j++) {
      const a = (j / spokes) * Math.PI * 2;
      const r = radiusAt(s, a) * t;
      add(s.cx + Math.cos(a) * r, s.cz + Math.sin(a) * r, t);
    }
  }
  const at = (i: number, j: number) => (i === 0 ? 0 : 1 + (i - 1) * spokes + (j % spokes));
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < spokes; j++) {
      // Counter-clockwise seen from above, so the faces point up.
      if (i === 0) index.push(0, at(1, j + 1), at(1, j));
      else index.push(at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i + 1, j));
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aRoad', new THREE.Float32BufferAttribute(road, 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}
