/**
 * The plan of the home island, as a map-maker would draw it: where the coast runs, where the hills
 * stand, where the roads go and where houses may be built. Everything here is in island units
 * (1 = the island's radius; x to the right, z toward the everyday camera), so the same plan fits
 * the island as it grows. Pure numbers: the ground (terrain.ts) and the town (town.ts) both read it.
 *
 * The island is not built in rings. There is one summit with the lighthouse on it, a ridge running
 * back from it to the sea (where it ends in a cliff), a knoll on the left, a low shoulder on the
 * right, and low land round the rest of the coast with a sandy cove at the front. A road winds
 * from the pier up to the lighthouse; a street follows the harbour; two lanes lead off round the
 * hill. Houses stand along those, each on its own levelled plot.
 */

export type Pt = [number, number];

/** The coast's wobble: [amplitude (share of radius), lobes round the island, phase]. */
export const HOME_LOBES: [number, number, number][] = [
  [0.06, 2, 1.0],
  [0.08, 3, 0.4],
  [0.05, 5, 2.1],
  [0.03, 7, 4.0],
  [0.018, 11, 1.7],
];

/** How far out the coast is at an angle, in island units. */
export function coastAt(a: number): number {
  let k = 1;
  for (const [amp, f, ph] of HOME_LOBES) k += amp * Math.sin(f * a + ph);
  return k;
}

/** A point a share `frac` of the way from the middle to the coast, at angle `a`. */
export function ringSpot(frac: number, a: number): Pt {
  const r = coastAt(a) * frac;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

/** How far a point is toward the coast: 0 in the middle, 1 at the waterline. */
export const coastShare = (u: number, v: number) => Math.hypot(u, v) / coastAt(Math.atan2(v, u));

// ---------- hills ----------

/** A hill (or, with a negative height, a hollow): centre, half-lengths along and across, turn (radians), height in world units. */
export interface Hill {
  at: Pt;
  long: number;
  wide: number;
  turn: number;
  high: number;
  /** Share of the way out that the top stays level (a flat crown to stand things on). */
  crown?: number;
}

export const HILLS: Hill[] = [
  // The summit, a little behind the middle: the lighthouse stands on its crown.
  { at: [-0.02, -0.05], long: 0.6, wide: 0.47, turn: 0.45, high: 3.0, crown: 0.24 },
  // The ridge running back and to the left, out to the sea: it ends in the cliff.
  { at: [-0.5, -0.55], long: 0.46, wide: 0.28, turn: 0.85, high: 2.0 },
  // A knoll on the left, above the harbour street's far end.
  { at: [-0.56, 0.16], long: 0.27, wide: 0.23, turn: -0.4, high: 1.15 },
  // A low shoulder on the right, where the back lane runs.
  { at: [0.5, -0.24], long: 0.34, wide: 0.27, turn: 0.3, high: 0.85 },
  // The sandy cove at the front: the land dips to the beach.
  { at: [-0.22, 0.9], long: 0.3, wide: 0.22, turn: 0.1, high: -0.42 },
  // A gully between the summit and the left knoll.
  { at: [-0.3, 0.28], long: 0.22, wide: 0.12, turn: 1.0, high: -0.3 },
];

/** A hill's height at a point: full across its crown, easing to nothing at its foot. */
export function hillAt(h: Hill, u: number, v: number): number {
  const du = u - h.at[0];
  const dv = v - h.at[1];
  const c = Math.cos(h.turn);
  const s = Math.sin(h.turn);
  const d = Math.hypot((du * c + dv * s) / h.long, (-du * s + dv * c) / h.wide);
  if (d >= 1) return 0;
  const crown = h.crown ?? 0;
  const k = d <= crown ? 0 : (d - crown) / (1 - crown);
  // A bell: level on top, steepest half way down, level again at the foot.
  return h.high * (1 - k * k) * (1 - k * k);
}

// ---------- roads ----------

/** The pier meets the land here (the pier runs out along this direction). */
export const PIER_ANGLE = Math.atan2(0.35, 1);

export const ROADS: Pt[][] = [
  // From the pier, winding up the front of the hill to the lighthouse door.
  [[0.88, 0.31], [0.74, 0.27], [0.6, 0.26], [0.47, 0.3], [0.36, 0.38], [0.24, 0.4], [0.14, 0.33], [0.13, 0.2], [0.17, 0.1], [0.12, 0.03], [0.07, 0.03]],
  // The harbour street: behind the front shore, and on round the west side.
  [[0.6, 0.26], [0.56, 0.42], [0.46, 0.56], [0.3, 0.66], [0.1, 0.7], [-0.1, 0.67], [-0.3, 0.6], [-0.48, 0.48], [-0.62, 0.32], [-0.68, 0.12], [-0.66, -0.06]],
  // The back lane: round the east side of the hill to the far shore.
  [[0.74, 0.27], [0.77, 0.1], [0.75, -0.08], [0.68, -0.26], [0.56, -0.42], [0.4, -0.56], [0.2, -0.64], [0.0, -0.66]],
  // The hill lane: off the main road, along the flank of the hill above the harbour, toward the ridge.
  [[0.24, 0.4], [0.08, 0.44], [-0.1, 0.4], [-0.26, 0.3], [-0.38, 0.16], [-0.42, 0.0], [-0.36, -0.14]],
];

/** The nearest point on a line of points: how far, where, and which way the line runs there. */
function nearestOn(line: Pt[], u: number, v: number): { d: number; at: Pt; dir: Pt } {
  let best = { d: Infinity, at: line[0], dir: [1, 0] as Pt };
  for (let i = 0; i + 1 < line.length; i++) {
    const [ax, az] = line[i];
    const [bx, bz] = line[i + 1];
    const ex = bx - ax;
    const ez = bz - az;
    const len2 = ex * ex + ez * ez;
    const k = Math.min(1, Math.max(0, ((u - ax) * ex + (v - az) * ez) / len2));
    const px = ax + ex * k;
    const pz = az + ez * k;
    const d = Math.hypot(u - px, v - pz);
    if (d < best.d) {
      const len = Math.sqrt(len2);
      best = { d, at: [px, pz], dir: [ex / len, ez / len] };
    }
  }
  return best;
}

/** How far a point is from the nearest road (island units), and the nearest point on it. */
export function nearestRoad(u: number, v: number): { d: number; at: Pt; dir: Pt } {
  let best = nearestOn(ROADS[0], u, v);
  for (let i = 1; i < ROADS.length; i++) {
    const n = nearestOn(ROADS[i], u, v);
    if (n.d < best.d) best = n;
  }
  return best;
}

const lengths = ROADS.map((line) => line.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - line[i][0], p[1] - line[i][1]), 0));
export const roadLength = (i: number) => lengths[i];

/** The point a distance `along` down road i, and which way the road runs there. */
export function roadPoint(i: number, along: number): { at: Pt; dir: Pt } {
  const line = ROADS[i];
  let left = Math.min(lengths[i], Math.max(0, along));
  for (let k = 0; k + 1 < line.length; k++) {
    const ex = line[k + 1][0] - line[k][0];
    const ez = line[k + 1][1] - line[k][1];
    const len = Math.hypot(ex, ez);
    if (left <= len || k + 2 === line.length) return { at: [line[k][0] + (ex * left) / len, line[k][1] + (ez * left) / len], dir: [ex / len, ez / len] };
    left -= len;
  }
  return { at: line[0], dir: [1, 0] };
}

// ---------- what stands where ----------

/**
 * The lighthouse's own things, by share of the way to the coast and angle (layout.ts places them;
 * houses keep clear of them). Decorations stand round the shore, evenly spaced from 78 degrees on.
 */
export const SPOTS = {
  house: [0.17, 0.7],
  chest: [0.84, 0.72],
  net: [0.85, 1.0],
  cat: [0.83, 0.6],
  keeper: [0.1, 1.35],
  chick: [0.58, 1.6],
  tree1: [0.2, 2.6],
  tree2: [0.21, -0.9],
  fire: [0.6, 1.25],
  flowers: [0.18, -2.0],
  bush: [0.4, -0.5],
  mill: [0.55, -2.75],
  hammock: [0.62, 2.2],
} as const satisfies Record<string, Pt>;
export const DECOR_RING = 0.84;
export const decorAngle = (i: number) => ((78 + i * 28) * Math.PI) / 180;
const DECOR_COUNT = 10;

export interface Plot {
  at: Pt;
  /** Which way its door faces (toward the road), as a direction. */
  face: Pt;
  /** By the water: fishermen's houses, stalls, the crane. */
  harbour: boolean;
}

/** Two more by the lighthouse, built last of all. */
const SUMMIT_PLOTS: Pt[] = [ringSpot(0.17, 2.05), ringSpot(0.17, -2.95)];

/**
 * Where houses may be built: along both sides of every road, a house's width back from it, a
 * house's length apart, clear of the lighthouse's own things and of each other, and never down
 * on the beach. Listed in the order they are built: outward from the pier.
 */
export const PLOTS: Plot[] = (() => {
  const keep: Pt[] = [...Object.values(SPOTS).map(([f, a]) => ringSpot(f, a)), ...Array.from({ length: DECOR_COUNT }, (_, i) => ringSpot(DECOR_RING, decorAngle(i)))];
  const out: Plot[] = [];
  const SPACING = 0.14;
  /** A house's width back from the road; a second row stands behind the first where there is room. */
  const ROWS = [0.09, 0.225];
  const ok = (p: Pt, back: number) =>
    Math.hypot(p[0], p[1]) > 0.27 &&
    coastShare(p[0], p[1]) < 0.83 &&
    // Not on a road (a bend can bring another stretch close), nor in the next house's garden.
    nearestRoad(p[0], p[1]).d > Math.min(back, 0.09) * 0.85 &&
    out.every((q) => Math.hypot(q.at[0] - p[0], q.at[1] - p[1]) > 0.126) &&
    keep.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.116);
  for (const back of ROWS)
    ROADS.forEach((_, i) => {
      // The second row is thinner, and only along the two roads the village grows on.
      if (back > 0.1 && i > 1) return;
      for (let along = SPACING * (back > 0.1 ? 1.1 : 0.6); along < lengths[i] - 0.03; along += SPACING * (back > 0.1 ? 1.5 : 1)) {
        const { at, dir } = roadPoint(i, along);
        for (const side of [1, -1]) {
          const p: Pt = [at[0] - dir[1] * back * side, at[1] + dir[0] * back * side];
          if (ok(p, back)) out.push({ at: p, face: [dir[1] * side, -dir[0] * side], harbour: coastShare(p[0], p[1]) > 0.62 });
        }
      }
    });
  const pier = ringSpot(0.9, PIER_ANGLE);
  out.sort((p, q) => Math.hypot(p.at[0] - pier[0], p.at[1] - pier[1]) - Math.hypot(q.at[0] - pier[0], q.at[1] - pier[1]));
  for (const p of SUMMIT_PLOTS) out.push({ at: p, face: [-p[0] / Math.hypot(p[0], p[1]), -p[1] / Math.hypot(p[0], p[1])], harbour: false });
  return out;
})();

/**
 * Ground levelled for something to stand on: [u, v, radius (world units)]. Always: the lighthouse
 * on the crown, the keeper's house, the windmill's place and the storehouse's. Then one for each
 * house plot, in building order (the ground is only cut when the house is built).
 */
export const FIXED_PADS: [number, number, number][] = [
  [0, 0, 1.7],
  [...ringSpot(...SPOTS.house), 1.0],
  [...ringSpot(...SPOTS.mill), 0.9],
  [...ringSpot(...SPOTS.chest), 0.9],
];
export const PLOT_PADS: [number, number, number][] = PLOTS.map((p) => [p.at[0], p.at[1], 0.72]);

/** 0..1 how wooded the ground is: thick on the ridge and the knoll, thin round the village and the harbour. */
export function woodsAt(u: number, v: number): number {
  const ridge = hillAt(HILLS[1], u, v) / HILLS[1].high;
  const knoll = hillAt(HILLS[2], u, v) / HILLS[2].high;
  const village = Math.max(0, 1 - nearestRoad(u, v).d / 0.16);
  return Math.min(1, Math.max(0.12, Math.max(ridge, knoll * 0.8) + 0.25 - village * 0.5));
}
