import { DECOR_IDS, type DecorId } from '../core/decor';
/**
 * The world sits on a hex grid (pointy tops along z, like the KayKit tiles):
 * the home island in the middle, the sea around it, islands further out.
 */
import type { DestId } from '../core/data';

/** One KayKit tile: 2 wide (flat side to flat side), 2.3094 deep (point to point). */
export const TILE_W = 2;
export const TILE_D = 2.3094;

export type Hex = [q: number, r: number];

/** Axial hex coordinates to world x/z (the tile centre, at sea level). */
export function hexToWorld(q: number, r: number): [x: number, z: number] {
  return [TILE_W * (q + r / 2), TILE_D * 0.75 * r];
}

/** Steps from the centre tile. */
export function hexDist(q: number, r: number): number {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
}

const DIRS: Hex[] = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

/** All tiles exactly n steps from the centre. */
export function ring(n: number): Hex[] {
  if (n === 0) return [[0, 0]];
  const out: Hex[] = [];
  let q = DIRS[4][0] * n;
  let r = DIRS[4][1] * n;
  for (let side = 0; side < 6; side++)
    for (let i = 0; i < n; i++) {
      out.push([q, r]);
      q += DIRS[side][0];
      r += DIRS[side][1];
    }
  return out;
}

/** The home island when a sea is new: the lighthouse tile and its six neighbours. */
export const HOME_TILES: readonly Hex[] = [[0, 0], ...ring(1)];

/** How many tiles out the lighthouse lights the sea. */
export function litRadius(light: number): number {
  return light + 2;
}

export function litRadiusWorld(light: number): number {
  return litRadius(light) * TILE_W;
}

/**
 * Where each island lies: exactly at the edge the light first reaches
 * (DESTS needLight + 2 tiles), at four different bearings, none on the pier side.
 */
export const DEST_HEX: Record<DestId, Hex> = {
  wreck: [-5, 5],
  gullrock: [0, -6],
  oldlight: [7, -7],
  firefly: [-8, 4],
};

/** The pier leaves the island from this tile, heading out along PIER_DIR (x, z). */
export const PIER_TILE: Hex = [0, 1];
export const PIER_DIR: [number, number] = [0.55, 1];

/**
 * Where each decoration goes: a new small tile in the second ring around home, in ring order,
 * skipping the tiles in the pier's way.
 */
export const DECOR_SLOTS: Record<DecorId, Hex> = (() => {
  const [px, pz] = hexToWorld(...PIER_TILE);
  const len = Math.hypot(...PIER_DIR);
  const free = ring(2).filter(([q, r]) => {
    const [x, z] = hexToWorld(q, r);
    const along = ((x - px) * PIER_DIR[0] + (z - pz) * PIER_DIR[1]) / len;
    const off = Math.abs((x - px) * PIER_DIR[1] - (z - pz) * PIER_DIR[0]) / len;
    return along < 0 || off > 1.6;
  });
  return Object.fromEntries(DECOR_IDS.map((id, i) => [id, free[i]])) as Record<DecorId, Hex>;
})();
