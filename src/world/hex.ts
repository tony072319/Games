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


/** How many tiles out the lighthouse lights the sea. */
export function litRadius(light: number): number {
  return light + 4;
}

export function litRadiusWorld(light: number): number {
  return litRadius(light) * TILE_W;
}

/**
 * Where each island lies: exactly at the edge the light first reaches
 * (DESTS needLight + 4 tiles), at four different bearings behind and beside home, so the water in front stays open for the pier and drifting finds.
 */
export const DEST_HEX: Record<DestId, Hex> = {
  wreck: [-7, 0],
  gullrock: [0, -8],
  oldlight: [9, -9],
  firefly: [-5, -5],
};
