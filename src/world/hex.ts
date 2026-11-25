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

/** The home island when a sea is new: two rings around the lighthouse, with room between things. */
export const HOME_TILES: readonly Hex[] = [[0, 0], ...ring(1), ...ring(2)];

/** How many tiles out the lighthouse lights the sea. */
export function litRadius(light: number): number {
  return light + 4;
}

export function litRadiusWorld(light: number): number {
  return litRadius(light) * TILE_W;
}

/**
 * Where each island lies: exactly at the edge the light first reaches
 * (DESTS needLight + 4 tiles), at four different bearings, none on the pier side.
 */
export const DEST_HEX: Record<DestId, Hex> = {
  wreck: [-7, 7],
  gullrock: [0, -8],
  oldlight: [9, -9],
  firefly: [-10, 5],
};

/** The pier leaves the island from this tile, heading out along PIER_DIR (x, z). */
export const PIER_TILE: Hex = [0, 2];
export const PIER_DIR: [number, number] = [0.55, 1];

/** Is this tile clear of the pier and the boat tied up at its end? `room` is the half-width kept free. */
function clearOfPier([q, r]: Hex, room: number): boolean {
  const [px, pz] = hexToWorld(...PIER_TILE);
  const len = Math.hypot(...PIER_DIR);
  const [x, z] = hexToWorld(q, r);
  const along = ((x - px) * PIER_DIR[0] + (z - pz) * PIER_DIR[1]) / len;
  const off = Math.abs((x - px) * PIER_DIR[1] - (z - pz) * PIER_DIR[0]) / len;
  return along < 0 || off > room;
}

/** Ring-3 tiles clear of the pier's way, in ring order. */
function freeRing3(): Hex[] {
  return ring(3).filter((h) => clearOfPier(h, 1.6));
}

/** Where each decoration goes: its own new tile in the third ring, spread evenly around the island. */
export const DECOR_SLOTS: Record<DecorId, Hex> = (() => {
  const free = freeRing3();
  return Object.fromEntries(DECOR_IDS.map((id, i) => [id, free[Math.floor((i * free.length) / DECOR_IDS.length)]])) as Record<DecorId, Hex>;
})();

/**
 * Where the island grows when you expand it, in order: the rest of ring 3, then ring 4, keeping the
 * pier and the moored boat clear.
 */
export const LAND_TILES: readonly Hex[] = (() => {
  const taken = new Set(Object.values(DECOR_SLOTS).map((h) => h.join()));
  return [...freeRing3().filter((h) => !taken.has(h.join())), ...ring(4).filter((h) => clearOfPier(h, 2.8))];
})();
