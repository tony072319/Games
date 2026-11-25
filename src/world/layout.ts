import { DECOR_IDS } from '../core/decor';
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
import { DECOR_SLOTS, DEST_HEX, LAND_TILES, TILE_W, HOME_TILES, PIER_DIR, PIER_TILE, hexToWorld, litRadius, hexDist, type Hex } from './hex';
import { CHEST_LOOKS, DECOR_LOOKS, ISLAND_DECOR, LIGHT_LOOKS, boatModel, buildingParts, netParts, type Part } from './looks';

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
  /** Blend the colours toward this colour by this much (snow, fog), for when a tint is not enough. */
  wash?: [number, number];
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
const PIER_PLANKS = 5;
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

/** Ground colour per sea: fresh grass at dusk, muted in the fog, snowy under the aurora. */
const GROUND: Record<GameState['sea'], [number, number] | undefined> = { dusk: undefined, fog: [0x9aa49a, 0.45], aurora: [0xf4f8ff, 0.8] };

function tile(items: WorldItem[], key: string, [q, r]: Hex, wash?: [number, number]) {
  const [x, z] = hexToWorld(q, r);
  items.push({ key: `${key}:${wash ?? ''}`, model: 'kk/hex_grass', x, y: 0, z, rotY: 0, shore: TILE_SHORE, wash });
}

export function worldLayout(s: GameState, nowMs: number): WorldItem[] {
  void nowMs;
  const items: WorldItem[] = [];
  const light = s.levels.light;

  // Home island.
  HOME_TILES.forEach(([q, r]) => tile(items, `home:${q},${r}`, [q, r], GROUND[s.sea]));
  const at = (q: number, r: number, dx = 0, dz = 0): [number, number] => {
    const [x, z] = hexToWorld(q, r);
    return [x + dx, z + dz];
  };

  place(items, `light:${light}`, LIGHT_LOOKS[light] ?? LIGHT_LOOKS[10], 0, 0, 0, 'light');
  place(items, 'house', [{ part: 'house', model: 'lh/keeper_house', dx: 0, dz: 0, rotY: -0.7, glow: 'window' }], ...at(1, -2, 0.1, 0.1), 0);
  place(items, `chest:${s.levels.storage}`, CHEST_LOOKS[s.levels.storage] ?? CHEST_LOOKS[11], ...at(2, -1, 0, 0.2), 0, 'chest');
  const [nx, nz] = at(-1, 2, 0.3, -0.1);
  place(items, `net:${Math.min(50, s.levels.net)}`, netParts(s.levels.net), nx, nz, 0, 'net');

  // Greenery that comes with a brighter light.
  const deco: Part[] = [
    { part: 'tree1', model: 'nature/round_tree', dx: 0, dz: 0 },
    { part: 'tree2', model: 'nature/pine_tree', ...offset(at(-1, -1, -0.3, -0.2)) },
  ];
  if (light >= 2) deco.push({ part: 'fire', model: 'viking/firepit', ...offset(at(-1, 1, 0.4, 0.3)), glow: 'fire' });
  if (light >= 3) deco.push({ part: 'flowers', model: 'nature/flower_yellow', ...offset(at(-2, 1, -0.2, 0)) });
  if (light >= 4) deco.push({ part: 'bush', model: 'nature/bush_berries', ...offset(at(2, -2, 0, 0)) });
  if (light >= 6) deco.push({ part: 'mill', model: 'kk/building_windmill_blue', ...offset(at(-2, 0, -0.2, 0)), tint: 0xfff0e0 });
  if (light >= 8) deco.push({ part: 'hammock', model: 'huts/hammock', ...offset(at(1, -1, 0.2, 0.3)), rotY: 0.9 });
  const [tx, tz] = at(-1, 0, 0.2, -0.5);
  place(items, 'deco', deco.map((p) => (p.part === 'tree1' ? p : { ...p, dx: p.dx - tx, dz: p.dz - tz })), tx, tz, 0);

  // The island grown by expanding: new ground in order, now and then a tuft of grass or flowers.
  const TUFTS: ModelId[] = ['nature/grass_tuft', 'nature/flower_yellow', 'lh/beach_grass', 'nature/flower_purple'];
  for (let i = 0; i < Math.min(s.land, LAND_TILES.length); i++) {
    tile(items, `land:${i}`, LAND_TILES[i], GROUND[s.sea]);
    if (i % 3 === 1) {
      const [lx, lz] = hexToWorld(...LAND_TILES[i]);
      items.push({ key: `land:${i}:tuft`, model: TUFTS[i % TUFTS.length], x: lx + 0.3, y: 0, z: lz - 0.2, rotY: i });
    }
  }

  // Decorations: each on its own new tile around the island (the island grows as you decorate).
  for (const id of DECOR_IDS) {
    const tier = s.decor[id];
    if (!tier) continue;
    const slot = DECOR_SLOTS[id];
    tile(items, `decor:${id}:tile`, slot, GROUND[s.sea]);
    const [dx, dz] = hexToWorld(...slot);
    place(items, `decor:${id}:${tier}`, DECOR_LOOKS[id][tier - 1], dx, dz, 0);
  }

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
  const [hx, hz] = at(1, -2, -0.6, 0.9);
  if (light >= 2) items.push({ key: 'life:keeper', model: 'kc/character-male-a', x: hx, y: 0, z: hz, rotY: 0.3, anim: 'idle' });
  const [cx, cz] = at(1, 1, -0.2, 0);
  items.push({ key: 'life:cat', model: 'kpet/animal-cat', x: cx, y: 0, z: cz, rotY: 1.2 });
  if (light >= 4) {
    const [kx, kz] = at(-2, 2, 0, 0);
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
    slots.forEach((h, i) => tile(items, `isle:${d}:tile:${i}`, h, GROUND[s.sea]));
    place(items, `isle:${d}`, ISLAND_DECOR[d], ix, iz, 0, `island:${d}`);
    ISLAND_BUILDINGS[d].forEach((b, i) => {
      const lvl = buildingLevel(s, b);
      const [bx, bz] = hexToWorld(...slots[i]);
      place(items, `bld:${b}:${lvl}`, buildingParts(b, lvl), bx + (i === 0 ? 0.6 : 0), bz + (i === 0 ? 0.6 : 0), 0, `bld:${b}`);
    });
  }

  inlandNoShore(items);
  return items.filter((i) => MODELS[i.model] !== undefined);
}

/** Ground tiles with ground on all six sides are inland: only the outline meets the water. */
function inlandNoShore(items: WorldItem[]) {
  const grid = (x: number, z: number) => `${Math.round(x * 4)},${Math.round(z * 4)}`;
  const ground = items.filter((i) => i.model === 'kk/hex_grass');
  const at = new Set(ground.map((g) => grid(g.x, g.z)));
  const around = [0, 1, 2, 3, 4, 5].map((k) => [Math.cos((k * Math.PI) / 3) * TILE_W, Math.sin((k * Math.PI) / 3) * TILE_W]);
  for (const g of ground) if (around.every(([dx, dz]) => at.has(grid(g.x + dx, g.z + dz)))) delete g.shore;
}

function offset([x, z]: [number, number]): { dx: number; dz: number } {
  return { dx: x, dz: z };
}

/** Where the boat is: tied up at the pier, or on its way to an island and back. */
export function boatPosition(s: GameState, nowMs: number): { x: number; z: number; rotY: number; atDock: boolean } {
  const [mx, mz] = mooring();
  const v = s.boat.voyage;
  if (!v) return { x: mx, z: mz, rotY: Math.atan2(PDX, PDZ), atDock: true };
  const route = boatRoute(v.dest);
  const span = Math.max(1, v.returnAt - v.departAt);
  const p = Math.min(1, Math.max(0, (nowMs - v.departAt) / span));
  const out = p < 0.5;
  const k = out ? p * 2 : (p - 0.5) * 2;
  const { x, z, dx, dz } = along(out ? route : [...route].reverse(), k);
  return { x, z, rotY: Math.atan2(dx, dz), atDock: false };
}

/** Sailing room around home: just outside the fully grown island. */
const SEA_RING = 10.5;

/** From the mooring out to open water, around the island at SEA_RING, then in to stop short of the island. */
function boatRoute(dest: DestId): [number, number][] {
  const [mx, mz] = mooring();
  const [ix, iz] = hexToWorld(...DEST_HEX[dest]);
  const a0 = Math.atan2(mz, mx);
  const a1 = Math.atan2(iz, ix);
  let da = a1 - a0;
  while (da > Math.PI) da -= 2 * Math.PI;
  while (da < -Math.PI) da += 2 * Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(da) / 0.25));
  const pts: [number, number][] = [[mx, mz]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (da * i) / steps;
    pts.push([Math.cos(a) * SEA_RING, Math.sin(a) * SEA_RING]);
  }
  const [ux, uz] = norm(Math.cos(a1) * SEA_RING - ix, Math.sin(a1) * SEA_RING - iz);
  pts.push([ix + ux * 1.6, iz + uz * 1.6]);
  return pts;
}

/** The point a share k (0..1) of the way along a path, and the heading there. */
function along(pts: [number, number][], k: number): { x: number; z: number; dx: number; dz: number } {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  let left = k * lens.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lens.length; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    if (left <= lens[i] || i === lens.length - 1) {
      const f = lens[i] > 0 ? Math.min(1, left / lens[i]) : 1;
      return { x: ax + (bx - ax) * f, z: az + (bz - az) * f, dx: bx - ax, dz: bz - az };
    }
    left -= lens[i];
  }
  return { x: pts[0][0], z: pts[0][1], dx: 0, dz: 1 };
}

/** Drifting finds cross the lit water in front of the island, far lane to near lane. */
export function flotsamPosition(item: FloatingItem, nowMs: number): { x: number; z: number } {
  const age = Math.min(1, Math.max(0, (nowMs - item.spawnedAt) / FLOAT_LIFETIME_MS));
  const lane = Math.min(1, Math.max(0, item.lane));
  return { x: -16 + 32 * age, z: 11 + lane * 5 };
}
