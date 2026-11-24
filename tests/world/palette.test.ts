import { describe, expect, test } from 'vitest';
import { paletteFor } from '../../src/world/palette';
import { skyAt, type Sky } from '../../src/ui/sky';

const dusk: Sky = { ...skyAt(0), sun: 1, moon: 0 };
const night: Sky = { ...skyAt(0), sun: 0, moon: 1 };

describe('paletteFor', () => {
  test('the sun up gives the cozy day colours of sample G', () => {
    const p = paletteFor(dusk, 'dusk');
    expect(p.water).toBe(0x3aa6c9);
    expect(p.shallow).toBe(0x8ff0dc);
    expect(p.night).toBe(0);
  });
  test('deep night gives the sample G evening colours', () => {
    const p = paletteFor(night, 'dusk');
    expect(p.water).toBe(0x2c5f8f);
    expect(p.night).toBe(1);
    expect(p.bloom).toBeGreaterThan(paletteFor(dusk, 'dusk').bloom);
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
