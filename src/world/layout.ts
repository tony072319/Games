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
import { DEST_HEX, hexToWorld, litRadius, hexDist } from './hex';
import { DEST_SHAPES, heightAt, homeShape, outline, type Shape } from './terrain';
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
  /** Sculpted ground (model 'ground'): the renderer builds the mesh from this shape. */
  ground?: Shape;
}

/** Colour for an island the light shows but the boat has not reached yet. */
export const SILHOUETTE = 0x556070;

const norm = (x: number, z: number): [number, number] => {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
};
/** The pier heads out to the right of the lighthouse, away from the islands and the drifting finds. */
const [PDX, PDZ] = norm(1, 0.35);

/** The pier starts on the beach, just inside where the island meets the water, and runs out to sea. */
function pierStart(land: number): [number, number] {
  const home = homeShape(land);
  let r = 0;
  while (r < 20 && heightAt(home, PDX * r, PDZ * r) > 0) r += 0.05;
  return [PDX * (r - 0.6), PDZ * (r - 0.6)];
}
const PIER_PLANKS = 3;
const PLANK = 1.6;

function pierEnd(land: number): [number, number] {
  const [x, z] = pierStart(land);
  const len = PIER_PLANKS * PLANK;
  return [x + PDX * len, z + PDZ * len];
}

/** Where the boat ties up: beside the end of the pier. */
function mooring(land: number): [number, number] {
  const [x, z] = pierEnd(land);
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
export const GROUND: Record<GameState['sea'], [number, number] | undefined> = { dusk: undefined, fog: [0x9aa49a, 0.45], aurora: [0xf4f8ff, 0.8] };

/** One sculpted island. Its key changes with its shape and colour, so the renderer rebuilds it then. */
function ground(items: WorldItem[], key: string, shape: Shape, wash?: [number, number], tag?: Tag) {
  items.push({ key: `ground:${key}:${shape.radius.toFixed(2)}:${wash ?? ''}`, model: 'ground', x: shape.cx, y: 0, z: shape.cz, rotY: 0, wash, ground: shape, tag });
}

/** Decorations stand round the island's shore, evenly spaced, leaving the pier side free. */
export function decorSpot(i: number, land: number): [number, number] {
  const a = ((50 + i * 30) * Math.PI) / 180;
  const r = 4.4 + land * 0.08;
  return [Math.cos(a) * r, Math.sin(a) * r];
}

export function worldLayout(s: GameState, nowMs: number): WorldItem[] {
  void nowMs;
  const items: WorldItem[] = [];
  const light = s.levels.light;

  // Home island: one piece of sculpted ground that grows as you expand it.
  const home = homeShape(s.land);
  ground(items, 'home', home, GROUND[s.sea]);
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

  // The ground won by expanding: now and then a tuft of grass or flowers on it.
  const TUFTS: ModelId[] = ['nature/grass_tuft', 'nature/flower_yellow', 'lh/beach_grass', 'nature/flower_purple', 'nature/bush_round'];
  for (let i = 1; i <= s.land; i++) {
    const a = i * 2.39996;
    const r = 5.6 + (i % 5) * 0.45;
    const [lx, lz] = [Math.cos(a) * r, Math.sin(a) * r];
    if (heightAt(home, lx, lz) > 0.2 && Math.abs(Math.atan2(lz, lx) - Math.atan2(PDZ, PDX)) > 0.35) items.push({ key: `land:${i}:tuft`, model: TUFTS[i % TUFTS.length], x: lx, y: 0, z: lz, rotY: i });
  }

  // Decorations round the shore.
  for (const id of DECOR_IDS) {
    const tier = s.decor[id];
    if (!tier) continue;
    const [dx, dz] = decorSpot(DECOR_IDS.indexOf(id), s.land);
    place(items, `decor:${id}:${tier}`, DECOR_LOOKS[id][tier - 1], dx, dz, 0);
  }

  // Dock and boat.
  const hasDock = light >= 3 || s.boat.built;
  if (hasDock) {
    const [sx, sz] = pierStart(s.land);
    // The plank model is long along its x axis: turn that along the pier so the pieces join up.
    const rot = Math.atan2(PDX, PDZ) - Math.PI / 2;
    for (let i = 0; i < PIER_PLANKS; i++)
      items.push({ key: `dock:plank:${i}`, model: 'harbor/dock_plank_section', x: sx + PDX * PLANK * (i + 0.5), y: -0.12, z: sz + PDZ * PLANK * (i + 0.5), rotY: rot, tag: i === 0 ? 'dock' : undefined, shore: 0.15 });
    const [ex, ez] = pierEnd(s.land);
    items.push({ key: 'dock:lantern', model: 'harbor/dock_post_lantern', x: ex - PDZ * 0.6, y: -0.1, z: ez + PDX * 0.6, rotY: 0, glow: 'lantern' });
    items.push({ key: 'dock:bollard', model: 'harbor/mooring_bollard', x: ex + PDZ * 0.5, y: -0.05, z: ez - PDX * 0.5, rotY: 0 });
  }
  const awayHere = s.boat.voyage !== null;
  if (s.boat.built && !awayHere) {
    const b = boatPosition(s, nowMs);
    const model = boatModel(s.levels.speed, s.levels.cargo);
    // Something special aboard: a lantern lit on the boat.
    const glow = s.boat.cargo?.rare ? ('lantern' as const) : undefined;
    items.push({ key: `boat:${model}:${glow ?? ''}`, model, x: b.x, y: -0.22, z: b.z, rotY: b.rotY, tag: 'boat', bob: true, shore: 0.9, glow });
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
    const [ex, ez] = pierEnd(s.land);
    items.push({ key: 'life:girl', model: 'kc/character-female-b', x: ex - PDX * 0.3, y: 0.05, z: ez - PDZ * 0.3, rotY: Math.atan2(PDX, PDZ) + Math.PI, anim: 'sit' });
  }

  // Islands the light reaches.
  for (const d of Object.keys(DESTS) as DestId[]) {
    const [q, r] = DEST_HEX[d];
    if (litRadius(light) < hexDist(q, r)) continue;
    const [ix, iz] = hexToWorld(q, r);
    const found = s.discovered.includes(d);
    const shape = DEST_SHAPES[d];
    if (!found) {
      ground(items, `isle:${d}:dark`, shape, [SILHOUETTE, 0.85], `island:${d}`);
      const main = ISLAND_DECOR[d][0];
      place(items, `isle:${d}:dark`, [{ ...main, dx: 0, dz: 0, tint: SILHOUETTE }], ix, iz, main.dy ?? 0);
      continue;
    }
    ground(items, `isle:${d}`, shape, GROUND[s.sea]);
    place(items, `isle:${d}`, ISLAND_DECOR[d], ix, iz, 0, `island:${d}`);
    // Friends live here: a lantern by the shore, then a flag, then strung lights.
    const f = s.friend[d] ?? 0;
    const friendParts: Part[] = [
      { part: 'lamp', model: 'harbor/dock_post_lantern', dx: shape.radius * 0.55, dz: shape.radius * 0.45, glow: 'lantern' },
      { part: 'flag', model: 'kk/flag_yellow', dx: -shape.radius * 0.5, dz: -shape.radius * 0.35 },
      { part: 'lights', model: 'tiki/string_lights', dx: shape.radius * 0.1, dz: shape.radius * 0.6, glow: 'lantern' },
    ];
    if (f > 0) place(items, `friend:${d}:${f}`, friendParts.slice(0, f), ix, iz, 0);
    // Buildings round the island's middle.
    const spots: [number, number][] = [
      [0.9, 0.7],
      [-1.0, 0.5],
      [0.1, -1.1],
    ];
    ISLAND_BUILDINGS[d].forEach((b, i) => {
      const lvl = buildingLevel(s, b);
      place(items, `bld:${b}:${lvl}`, buildingParts(b, lvl), ix + spots[i][0] * shape.radius * 0.5, iz + spots[i][1] * shape.radius * 0.5, 0, `bld:${b}`);
    });
  }

  standOnGround(items);
  return items.filter((i) => i.ground || MODELS[i.model] !== undefined);
}

/** Islands drawn this time, for the water's foam and for standing things on the ground. */
function shapesOf(items: WorldItem[]): Shape[] {
  return items.flatMap((i) => (i.ground ? [i.ground] : []));
}

/** Everything stands on the ground beneath it (things on the water keep their height). */
function standOnGround(items: WorldItem[]) {
  const shapes = shapesOf(items);
  for (const i of items) {
    if (i.ground || i.bob) continue;
    let h = 0;
    for (const sh of shapes) h = Math.max(h, heightAt(sh, i.x, i.z));
    i.y += h;
  }
}

/** Foam circles along every island's waterline: [x, z, r]. */
export function shoresOf(items: WorldItem[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const sh of shapesOf(items)) out.push(...outline(sh, sh.kind === 'home' ? 28 : 7));
  for (const i of items) if (i.shore) out.push([i.x, i.z, i.shore]);
  return out;
}


function offset([x, z]: [number, number]): { dx: number; dz: number } {
  return { dx: x, dz: z };
}

/** Where the boat is: tied up at the pier, or on its way to an island and back. */
export function boatPosition(s: GameState, nowMs: number): { x: number; z: number; rotY: number; atDock: boolean } {
  const [mx, mz] = mooring(s.land);
  const v = s.boat.voyage;
  if (!v) return { x: mx, z: mz, rotY: Math.atan2(PDX, PDZ), atDock: true };
  const route = boatRoute(v.dest, s.land);
  const span = Math.max(1, v.returnAt - v.departAt);
  const p = Math.min(1, Math.max(0, (nowMs - v.departAt) / span));
  const out = p < 0.5;
  const k = out ? p * 2 : (p - 0.5) * 2;
  const { x, z, dx, dz } = along(out ? route : [...route].reverse(), k);
  return { x, z, rotY: Math.atan2(dx, dz), atDock: false };
}

/** Sailing room around home: just outside the fully grown island. */
const SEA_RING = 11;

/** From the mooring out to open water, around the island at SEA_RING, then in to stop short of the island. */
function boatRoute(dest: DestId, land: number): [number, number][] {
  const [mx, mz] = mooring(land);
  const [ix, iz] = hexToWorld(...DEST_HEX[dest]);
  const a0 = Math.atan2(mz, mx);
  const a1 = Math.atan2(iz, ix);
  // Always round the island clockwise (decreasing angle): the pier lies just the other way.
  let da = a1 - a0;
  while (da >= 0) da -= 2 * Math.PI;
  while (da < -2 * Math.PI) da += 2 * Math.PI;
  const steps = Math.max(1, Math.ceil(Math.abs(da) / 0.25));
  const pts: [number, number][] = [[mx, mz]];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (da * i) / steps;
    pts.push([Math.cos(a) * SEA_RING, Math.sin(a) * SEA_RING]);
  }
  const [ux, uz] = norm(Math.cos(a1) * SEA_RING - ix, Math.sin(a1) * SEA_RING - iz);
  // Stop off the island's beach (its widest lobe plus a boat length).
  const stop = DEST_SHAPES[dest].radius * 1.4 + 0.8;
  pts.push([ix + ux * stop, iz + uz * stop]);
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
export function flotsamPosition(item: FloatingItem, nowMs: number, land = 0): { x: number; z: number } {
  const age = Math.min(1, Math.max(0, (nowMs - item.spawnedAt) / FLOAT_LIFETIME_MS));
  const lane = Math.min(1, Math.max(0, item.lane));
  // Just off the island's front beach: further out as the island grows (the camera pulls back with it).
  const near = Math.max(8.5, homeShape(land).radius * 1.17 + 2);
  return { x: -16 + 32 * age, z: near + lane * 3 };
}
