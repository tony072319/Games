import { existsSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { BUILDING_MAX, MAX_LEVEL } from '../../src/core/data';
import { DECOR_IDS, DECOR_TIERS } from '../../src/core/decor';
import { BUILDINGS } from '../../src/core/islands';
import { allThumbs, boatThumb, buildingThumb, chestThumb, decorPicture, landThumb, lightThumb, modelThumb, netThumb } from '../../src/ui/art';
import { MODELS } from '../../src/world/assets';
import { boatModel } from '../../src/world/looks';

/** The picture file a card's markup points at. */
const fileOf = (html: string) => `public/${/src="([^"]+)"/.exec(html)![1]}`;

describe("the cards' pictures of the world's models", () => {
  test('every picture on the list has its file (run tools/make-thumbs.mjs if a look changed)', () => {
    const names = allThumbs().map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(existsSync(`public/thumbs/${n}.webp`), n).toBe(true);
  });
  test('each picture is made of models the game has', () => {
    for (const t of allThumbs()) {
      expect(t.parts.length, t.name).toBeGreaterThan(0);
      for (const p of t.parts) expect(MODELS[p.model], `${t.name}: ${p.model}`).toBeDefined();
    }
  });
  test('a picture is decorative markup, like the material icons', () => {
    expect(modelThumb('land')).toBe('<img class="thumb-img" src="thumbs/land.webp" alt="" draggable="false">');
    expect(modelThumb('land', true)).toContain('opacity:.6');
  });
  test('every level of every upgrade has a picture', () => {
    for (let l = 0; l <= MAX_LEVEL.light; l++) expect(existsSync(fileOf(lightThumb(l))), `light ${l}`).toBe(true);
    for (let l = 0; l <= MAX_LEVEL.storage; l++) expect(existsSync(fileOf(chestThumb(l))), `chest ${l}`).toBe(true);
    for (let l = 0; l <= MAX_LEVEL.net; l++) expect(existsSync(fileOf(netThumb(l))), `net ${l}`).toBe(true);
    for (let s = 0; s <= MAX_LEVEL.speed; s++) for (let c = 0; c <= MAX_LEVEL.cargo; c++) expect(existsSync(fileOf(boatThumb(boatModel(s, c)))), `boat ${s} ${c}`).toBe(true);
  });
  test('the lighthouse, chest and net pictures change as they grow', () => {
    expect(lightThumb(1)).not.toBe(lightThumb(5));
    expect(chestThumb(1)).not.toBe(chestThumb(8));
    expect(netThumb(1)).not.toBe(netThumb(10));
    expect(netThumb(10)).toBe(netThumb(19));
  });
  test('decorations and island buildings: every tier and level, faint before they exist', () => {
    for (const id of DECOR_IDS)
      for (let tier = 0; tier <= DECOR_TIERS; tier++) {
        const html = decorPicture(id, tier);
        expect(existsSync(fileOf(html)), `${id} ${tier}`).toBe(true);
        expect(html.includes('opacity'), `${id} ${tier}`).toBe(tier === 0);
      }
    for (const b of Object.keys(BUILDINGS) as (keyof typeof BUILDINGS)[])
      for (let l = 0; l <= BUILDING_MAX; l++) {
        const html = buildingThumb(b, l);
        expect(existsSync(fileOf(html)), `${b} ${l}`).toBe(true);
        expect(html.includes('opacity'), `${b} ${l}`).toBe(l === 0);
      }
    expect(existsSync(fileOf(landThumb()))).toBe(true);
  });
});
