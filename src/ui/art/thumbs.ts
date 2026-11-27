/**
 * Small pictures of the things in the world, for the cards: each is a photograph of the same
 * models the island shows, taken by tools/make-thumbs.mjs and kept in public/thumbs.
 * This file says which pictures there are and what each one shows (the tool reads the list;
 * a test checks every picture named here exists).
 */
import type { BuildingId } from '../../core/data';
import { DECOR_IDS, DECOR_TIERS, type DecorId } from '../../core/decor';
import { ISLAND_BUILDINGS } from '../../core/islands';
import { CHEST_LOOKS, DECOR_LOOKS, LIGHT_LOOKS, buildingParts, netParts, type Part } from '../../world/looks';

export interface Thumb {
  name: string;
  parts: Part[];
}

/** The net's picture changes at each milestone (every ten levels), like the harbour does. */
export const netTier = (level: number) => Math.min(5, Math.floor(level / 10));
/** A boat model's picture, e.g. 'kp/ship-small' → 'boat-ship-small'. */
export const boatThumbName = (model: string) => `boat-${model.split('/')[1]}`;
const BOATS = ['kp/boat-row-small', 'kp/boat-row-large', 'kp/ship-small'];

/** Only what stands close by: the net's far milestones (the crane, the moored boat) would make its picture tiny. */
const near = (parts: Part[]) => parts.filter((p) => Math.hypot(p.dx, p.dz) < 1.6);

export function allThumbs(): Thumb[] {
  const out: Thumb[] = [];
  for (let l = 1; l < LIGHT_LOOKS.length; l++) out.push({ name: `light-${l}`, parts: LIGHT_LOOKS[l] });
  for (let l = 1; l < CHEST_LOOKS.length; l++) out.push({ name: `chest-${l}`, parts: CHEST_LOOKS[l] });
  for (let tier = 0; tier <= 5; tier++) out.push({ name: `net-${tier}`, parts: near(netParts(Math.max(1, tier * 10))) });
  for (const model of BOATS) out.push({ name: boatThumbName(model), parts: [{ part: 'boat', model, dx: 0, dz: 0, rotY: 0.5 }] });
  for (const id of DECOR_IDS) for (let tier = 1; tier <= DECOR_TIERS; tier++) out.push({ name: `decor-${id}-${tier}`, parts: DECOR_LOOKS[id][tier - 1] });
  for (const b of Object.values(ISLAND_BUILDINGS).flat() as BuildingId[]) out.push({ name: `bld-${b}`, parts: buildingParts(b, 5) });
  out.push({ name: 'bld-site', parts: buildingParts('depot', 1) }, { name: 'bld-half', parts: buildingParts('depot', 2) });
  out.push({ name: 'land', parts: [{ part: 'tile', model: 'kk/hex_grass', dx: 0, dz: 0, tint: 0xa6e070 }, { part: 'tree', model: 'kk/tree_single_B', dx: 0.25, dz: -0.1, dy: 0.42, size: 0.9 }, { part: 'rock', model: 'kk/rock_single_D', dx: -0.45, dz: 0.3, dy: 0.42, size: 0.3 }] });
  return out;
}

/** The picture markup for a card (decorative: the card's title says what it is). `faint` for something not built yet. */
export function modelThumb(name: string, faint = false): string {
  return `<img class="thumb-img" src="thumbs/${name}.webp" alt="" draggable="false"${faint ? ' style="opacity:.6"' : ''}>`;
}

export const lightThumb = (level: number) => modelThumb(`light-${Math.min(LIGHT_LOOKS.length - 1, Math.max(1, level))}`);
export const chestThumb = (level: number) => modelThumb(`chest-${Math.min(CHEST_LOOKS.length - 1, Math.max(1, level))}`);
export const netThumb = (level: number) => modelThumb(`net-${netTier(level)}`);
export const boatThumb = (model: string) => modelThumb(boatThumbName(model));
/** A decoration at the tier owned; before it is placed, its first tier, faint. */
export const decorPicture = (id: DecorId, tier: number) => modelThumb(`decor-${id}-${Math.min(DECOR_TIERS, Math.max(1, tier))}`, tier === 0);
/** An island building: a building site at level 1, half built at 2, then the building itself (faint before it is begun). */
export const buildingThumb = (b: BuildingId, level: number) => modelThumb(level === 1 ? 'bld-site' : level === 2 ? 'bld-half' : `bld-${b}`, level === 0);
export const landThumb = () => modelThumb('land');
