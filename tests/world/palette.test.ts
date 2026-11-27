import { describe, expect, test } from 'vitest';
import { paletteFor } from '../../src/world/palette';
import { skyAt, type Sky } from '../../src/ui/sky';

const dusk: Sky = { ...skyAt(0), sun: 1, moon: 0 };
const evening: Sky = { ...skyAt(0), sun: 0, moon: 0.4 };
const night: Sky = { ...skyAt(0), sun: 0, moon: 1 };

describe('paletteFor', () => {
  test('the sun up gives the cozy day colours of sample G', () => {
    const p = paletteFor(dusk, 'dusk');
    expect(p.water).toBe(0x3aa6c9);
    expect(p.shallow).toBe(0x8ff0dc);
    expect(p.night).toBe(0);
  });
  test('once the sun has set, the sample G evening colours', () => {
    const p = paletteFor(evening, 'dusk');
    expect(p.water).toBe(0x2c5f8f);
    expect(p.night).toBe(1);
    expect(p.deep).toBe(0);
    expect(p.bloom).toBeGreaterThan(paletteFor(dusk, 'dusk').bloom);
  });
  test('with the moon high the night deepens: darker water, a darker sky', () => {
    const e = paletteFor(evening, 'dusk');
    const p = paletteFor(night, 'dusk');
    expect(p.deep).toBe(1);
    expect(p.night).toBe(1);
    const lum = (c: number) => ((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255);
    expect(lum(p.water)).toBeLessThan(lum(e.water));
    expect(lum(p.top)).toBeLessThan(lum(e.top));
  });
  test('the sun does not deepen the night while it is still up', () => {
    expect(paletteFor({ ...dusk, sun: 0.5, moon: 1 }, 'dusk').deep).toBe(0);
  });
  test('the fog and aurora seas have their own air', () => {
    const d = paletteFor(dusk, 'dusk');
    expect(paletteFor(dusk, 'fog').fog).not.toBe(d.fog);
    expect(paletteFor(dusk, 'aurora').water).not.toBe(d.water);
  });
  test('half way is in between', () => {
    const p = paletteFor({ ...dusk, sun: 0.5 }, 'dusk');
    expect(p.night).toBeCloseTo(0.5);
    expect(p.water).not.toBe(0x3aa6c9);
    expect(p.water).not.toBe(0x2c5f8f);
  });
});
