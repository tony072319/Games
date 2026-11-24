/**
 * What the world should contain for a game state: a flat list of placed models.
 * Pure, so it can be tested; the renderer diffs it by `key`.
 */
import { DESTS } from '../core/boat';
import { FLOAT_LIFETIME_MS, type BuildingId, type DestId } from '../core/data';
import type { FloatingItem } from '../core/flotsam';
import { ISLAND_BUILDINGS, buildingLevel } from '../core/islands';
import type { GameState } from '../core/state';
import { MODELS, type ModelId } from './assets';
import { DEST_HEX, HOME_TILES, PIER_DIR, PIER_TILE, hexToWorld, litRadius, hexDist, type Hex } from './hex';
import { CHEST_LOOKS, ISLAND_DECOR, LIGHT_LOOKS, boatModel, buildingParts, netParts, type Part } from './looks';

export type Tag = 'light' | 'net' | 'chest' | 'boat' | 'dock' | `island:${DestId}` | `bld:${BuildingId}`;

export interface WorldItem {
  /** Stable for the same thing with the same look, so the renderer can keep it. */
  key: string;
  model: ModelId;
  x: number;
  /** Height of the model's base above sea level. */
  y: number;
  z: number;
  rotY: number;
  /** World size (see MODELS fit); the model's default when missing. */
  size?: number;
  tint?: number;
  tag?: Tag;
  glow?: 'lamp' | 'window' | 'lantern' | 'fire';
  anim?: string;
  /** Land: the renderer adds a sandy rim and foam around it (radius in world units). */
  shore?: number;
  /** Bobs on the water. */
  bob?: boolean;
}

/** Colour for an island the light shows but the boat has not reached yet. */
export const SILHOUETTE = 0x556070;
const TILE_SHORE = 1.35;

const norm = (x: number, z: number): [number, number] => {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
};
const [PDX, PDZ] = norm(...PIER_DIR);

/** The pier starts on the island edge of PIER_TILE and runs out to sea. */
function pierStart(): [number, number] {
  const [x, z] = hexToWorld(...PIER_TILE);
  return [x + PDX * 0.9, z + PDZ * 0.9];
}
const PIER_PLANKS = 3;
const PLANK = 1.6;

function pierEnd(): [number, number] {
  const [x, z] = pierStart();
  const len = PIER_PLANKS * PLANK;
  return [x + PDX * len, z + PDZ * len];
}

/** Where the boat ties up: beside the end of the pier. */
function mooring(): [number, number] {
  const [x, z] = pierEnd();
  return [x + PDZ * 1.4 - PDX * 0.8, z - PDX * 1.4 - PDZ * 0.8];
}

function place(items: WorldItem[], prefix: string, parts: Part[], ax: number, az: number, ay: number, tag?: Tag) {
  parts.forEach((p, i) => {
    items.push({
      key: `${prefix}:${p.part}:${p.model}:${p.size ?? ''}:${p.tint ?? ''}`,
      model: p.model,
      x: ax + p.dx,
      y: ay + (p.dy ?? 0),
      z: az + p.dz,
      rotY: p.rotY ?? 0,
      size: p.size,
      tint: p.tint,
      glow: p.glow,
      tag: i === 0 ? tag : undefined,
    });
  });
}

function tile(items: WorldItem[], key: string, [q, r]: Hex, slope = false) {
  const [x, z] = hexToWorld(q, r);
  items.push({ key, model: slope ? 'kk/hex_grass_sloped_high' : 'kk/hex_grass', x, y: 0, z, rotY: 0, shore: TILE_SHORE });
}

export function worldLayout(s: GameState, nowMs: number): WorldItem[] {
  void nowMs;
  const items: WorldItem[] = [];
  const light = s.levels.light;

  // Home island.
  HOME_TILES.forEach(([q, r]) => tile(items, `home:${q},${r}`, [q, r]));
  const at = (q: number, r: number, dx = 0, dz = 0): [number, number] => {
    const [x, z] = hexToWorld(q, r);
    return [x + dx, z + dz];
  };

  place(items, `light:${light}`, LIGHT_LOOKS[light] ?? LIGHT_LOOKS[10], 0, 0, 0, 'light');
  place(items, 'house', [{ part: 'house', model: 'lh/keeper_house', dx: 0, dz: 0, rotY: -0.7, glow: 'window' }], ...at(1, -1, 0.1, 0.1), 0);
  place(items, `chest:${s.levels.storage}`, CHEST_LOOKS[s.levels.storage] ?? CHEST_LOOKS[11], ...at(1, 0, 0.2, 0.2), 0, 'chest');
  const [nx, nz] = at(0, 1, 0.7, -0.1);
  place(items, `net:${Math.min(50, s.levels.net)}`, netParts(s.levels.net), nx, nz, 0, 'net');

  // Greenery that comes with a brighter light.
  const deco: Part[] = [
    { part: 'tree1', model: 'nature/round_tree', dx: 0, dz: 0 },
    { part: 'tree2', model: 'nature/pine_tree', ...offset(at(0, -1, -0.3, -0.2)) },
  ];
  if (light >= 2) deco.push({ part: 'fire', model: 'viking/firepit', ...offset(at(-1, 1, 0.4, 0.3)), glow: 'fire' });
  if (light >= 3) deco.push({ part: 'flowers', model: 'nature/flower_yellow', ...offset(at(-1, 1, -0.4, -0.2)) });
  if (light >= 4) deco.push({ part: 'bush', model: 'nature/bush_berries', ...offset(at(1, -1, 0.7, -0.6)) });
  if (light >= 6) deco.push({ part: 'mill', model: 'kk/building_windmill_blue', ...offset(at(-1, 0, -0.2, 0)), tint: 0xfff0e0 });
  if (light >= 8) deco.push({ part: 'hammock', model: 'huts/hammock', ...offset(at(0, -1, 0.6, 0.5)), rotY: 0.9 });
  const [tx, tz] = at(-1, 0, 0.2, -0.5);
  place(items, 'deco', deco.map((p) => (p.part === 'tree1' ? p : { ...p, dx: p.dx - tx, dz: p.dz - tz })), tx, tz, 0);

  // Dock and boat.
  const hasDock = light >= 3 || s.boat.built;
  if (hasDock) {
    const [sx, sz] = pierStart();
    const rot = Math.atan2(PDX, PDZ);
    for (let i = 0; i < PIER_PLANKS; i++)
      items.push({ key: `dock:plank:${i}`, model: 'harbor/dock_plank_section', x: sx + PDX * PLANK * (i + 0.5), y: -0.12, z: sz + PDZ * PLANK * (i + 0.5), rotY: rot, tag: i === 0 ? 'dock' : undefined, shore: 0.15 });
    const [ex, ez] = pierEnd();
    items.push({ key: 'dock:lantern', model: 'harbor/dock_post_lantern', x: ex - PDZ * 0.6, y: -0.1, z: ez + PDX * 0.6, rotY: 0, glow: 'lantern' });
    items.push({ key: 'dock:bollard', model: 'harbor/mooring_bollard', x: ex + PDZ * 0.5, y: -0.05, z: ez - PDX * 0.5, rotY: 0 });
  }
  const awayHere = s.boat.voyage !== null;
  if (s.boat.built && !awayHere) {
    const b = boatPosition(s, nowMs);
    const model = boatModel(s.levels.speed, s.levels.cargo);
    items.push({ key: `boat:${model}`, model, x: b.x, y: -0.22, z: b.z, rotY: b.rotY, tag: 'boat', bob: true, shore: 0.9 });
    if (s.boat.cargo)
      for (let i = 0; i < 3; i++)
        items.push({ key: `boat:cargo:${i}`, model: 'kk/crate_A_small', x: b.x + (i - 1) * 0.35, y: 0.15 + (i === 1 ? 0.3 : 0), z: b.z, rotY: i, size: 0.3, bob: true });
  }

  // Life: a few who live here, more as the light grows.
  const [hx, hz] = at(1, -1, -0.6, 0.8);
  if (light >= 2) items.push({ key: 'life:keeper', model: 'kc/character-male-a', x: hx, y: 0, z: hz, rotY: 0.3, anim: 'idle' });
  const [cx, cz] = at(0, 1, -0.6, -0.3);
  items.push({ key: 'life:cat', model: 'kpet/animal-cat', x: cx, y: 0, z: cz, rotY: 1.2 });
  if (light >= 4) {
    const [kx, kz] = at(-1, 1, -0.5, 0.4);
    items.push({ key: 'life:chick', model: 'kpet/animal-chick', x: kx, y: 0, z: kz, rotY: -0.6 });
  }
  if (light >= 7) items.push({ key: 'life:parrot', model: 'kpet/animal-parrot', x: 0.9, y: 1.35, z: 0.7, rotY: 0 });
  if (hasDock) {
    const [ex, ez] = pierEnd();
    items.push({ key: 'life:girl', model: 'kc/character-female-b', x: ex - PDX * 0.3, y: 0.05, z: ez - PDZ * 0.3, rotY: Math.atan2(PDX, PDZ) + Math.PI, anim: 'sit' });
  }

  // Islands the light reaches.
  for (const d of Object.keys(DESTS) as DestId[]) {
    const [q, r] = DEST_HEX[d];
    if (litRadius(light) < hexDist(q, r)) continue;
    const [ix, iz] = hexToWorld(q, r);
    const found = s.discovered.includes(d);
    if (!found) {
      const main = ISLAND_DECOR[d][0];
      place(items, `isle:${d}:dark`, [{ ...main, dx: 0, dz: 0, tint: SILHOUETTE }], ix, iz, main.dy ?? 0, `island:${d}`);
      continue;
    }
    const slots: Hex[] = [
      [q, r],
      [q + 1, r],
      [q, r + 1],
    ];
    slots.forEach((h, i) => tile(items, `isle:${d}:tile:${i}`, h));
    place(items, `isle:${d}`, ISLAND_DECOR[d], ix, iz, 0, `island:${d}`);
    ISLAND_BUILDINGS[d].forEach((b, i) => {
      const lvl = buildingLevel(s, b);
      const [bx, bz] = hexToWorld(...slots[i]);
      place(items, `bld:${b}:${lvl}`, buildingParts(b, lvl), bx + (i === 0 ? 0.6 : 0), bz + (i === 0 ? 0.6 : 0), 0, `bld:${b}`);
    });
  }

  return items.filter((i) => MODELS[i.model] !== undefined);
}

function offset([x, z]: [number, number]): { dx: number; dz: number } {
  return { dx: x, dz: z };
}

/** Where the boat is: tied up at the pier, or on its way to an island and back. */
export function boatPosition(s: GameState, nowMs: number): { x: number; z: number; rotY: number; atDock: boolean } {
  const [mx, mz] = mooring();
  const v = s.boat.voyage;
  if (!v) return { x: mx, z: mz, rotY: Math.atan2(PDX, PDZ), atDock: true };
  const [ix, iz] = hexToWorld(...DEST_HEX[v.dest]);
  // Stop just short of the island, on the side facing home.
  const [ux, uz] = norm(mx - ix, mz - iz);
  const tx = ix + ux * 1.6;
  const tz = iz + uz * 1.6;
  const span = Math.max(1, v.returnAt - v.departAt);
  const p = Math.min(1, Math.max(0, (nowMs - v.departAt) / span));
  const out = p < 0.5;
  const k = out ? p * 2 : (p - 0.5) * 2;
  const [fx, fz, gx, gz] = out ? [mx, mz, tx, tz] : [tx, tz, mx, mz];
  return { x: fx + (gx - fx) * k, z: fz + (gz - fz) * k, rotY: Math.atan2(gx - fx, gz - fz), atDock: false };
}

/** Drifting finds cross the lit water in front of the island, far lane to near lane. */
export function flotsamPosition(item: FloatingItem, nowMs: number): { x: number; z: number } {
  const age = Math.min(1, Math.max(0, (nowMs - item.spawnedAt) / FLOAT_LIFETIME_MS));
  const lane = Math.min(1, Math.max(0, item.lane));
  return { x: -14 + 28 * age, z: 6 + lane * 5 };
}
