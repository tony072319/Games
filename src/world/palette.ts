/**
 * The world's colours for a moment of the sky cycle (sample G: the cozy day look with the sun up,
 * its evening look at night), tinted for each sea.
 */
import type { SeaId } from '../core/data';
import type { Sky } from '../ui/sky';

export interface Palette {
  top: number;
  mid: number;
  low: number;
  sun: number;
  water: number;
  shallow: number;
  foam: number;
  fog: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  key: number;
  keyIntensity: number;
  bloom: number;
  exposure: number;
  /** 0 = sun up, 1 = deep night. */
  night: number;
}

type Colours = Omit<Palette, 'night'>;

const DAY: Colours = {
  top: 0x7fb2ee, mid: 0xf3b6cf, low: 0xffd9a8, sun: 0xfff3d6, water: 0x3aa6c9, shallow: 0x8ff0dc, foam: 0xffffff, fog: 0xf4c6c0,
  hemiSky: 0xcfe0ff, hemiGround: 0xf0c0a0, hemiIntensity: 1.6, key: 0xffd2a0, keyIntensity: 2.0, bloom: 0.32, exposure: 0.98,
};
const NIGHT: Colours = {
  top: 0x2b3a78, mid: 0x6a5a9e, low: 0xd8899a, sun: 0xfff1d0, water: 0x2c5f8f, shallow: 0x4fb3b8, foam: 0xdff6ff, fog: 0x7a6a9e,
  hemiSky: 0x8a9cff, hemiGround: 0x403060, hemiIntensity: 1.2, key: 0xffb98a, keyIntensity: 1.0, bloom: 0.5, exposure: 0.95,
};
/** Each sea's air: the fog sea greys, the aurora sea cools. */
const SEA_AIR: Record<SeaId, { to: number; k: number } | null> = {
  dusk: null,
  fog: { to: 0x6a6a80, k: 0.4 },
  aurora: { to: 0x3a7a86, k: 0.35 },
};
const COLOURS: (keyof Colours)[] = ['top', 'mid', 'low', 'sun', 'water', 'shallow', 'foam', 'fog', 'hemiSky', 'hemiGround', 'key'];

export function mixColour(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  let out = 0;
  for (const shift of [16, 8, 0]) {
    const ca = (a >> shift) & 255;
    const cb = (b >> shift) & 255;
    out |= Math.round(ca + (cb - ca) * t) << shift;
  }
  return out;
}

export function paletteFor(sky: Sky, sea: SeaId): Palette {
  const night = Math.min(1, Math.max(0, 1 - sky.sun));
  const p = { night } as Palette;
  for (const k of Object.keys(DAY) as (keyof Colours)[]) {
    p[k] = COLOURS.includes(k) ? mixColour(DAY[k], NIGHT[k], night) : DAY[k] + (NIGHT[k] - DAY[k]) * night;
  }
  const air = SEA_AIR[sea];
  if (air) for (const k of COLOURS) if (k !== 'foam' && k !== 'sun') p[k] = mixColour(p[k], air.to, air.k);
  return p;
}
