/**
 * The world's colours for a moment of the sky cycle, tinted for each sea. Three moods blend into
 * each other: the golden hour while the sun is up (sample G by day), the pink and purple evening
 * once it has set (sample G in the evening), and the deep blue night when the moon is high.
 */
import type { SeaId } from '../core/data';
import type { Sky } from '../ui/sky';

export interface Palette {
  top: number;
  mid: number;
  low: number;
  sun: number;
  /** Clouds: the side the light falls on, and the side in shade. */
  cloud: number;
  cloudShade: number;
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
  /** 0 = sun up, 1 = the sun has set. */
  night: number;
  /** 0..1 how deep into the night: the moon is high and the stars are out. */
  deep: number;
  /** 0..1 how much of the sun shows. */
  sunUp: number;
}

type Colours = Omit<Palette, 'night' | 'deep' | 'sunUp'>;

const DAY: Colours = {
  top: 0x6fa6ea, mid: 0xf2a3bf, low: 0xffc58c, sun: 0xfff0cc, cloud: 0xfff4e4, cloudShade: 0xdf98b4,
  water: 0x3aa6c9, shallow: 0x8ff0dc, foam: 0xffffff, fog: 0xf4c6c0,
  hemiSky: 0xcfe0ff, hemiGround: 0xf0c0a0, hemiIntensity: 1.6, key: 0xffd2a0, keyIntensity: 2.0, bloom: 0.32, exposure: 0.98,
};
const EVENING: Colours = {
  top: 0x2b3a78, mid: 0x6a5a9e, low: 0xd8899a, sun: 0xfff1d0, cloud: 0xf2a6a4, cloudShade: 0x55488c,
  water: 0x2c5f8f, shallow: 0x4fb3b8, foam: 0xdff6ff, fog: 0x7a6a9e,
  hemiSky: 0x8a9cff, hemiGround: 0x403060, hemiIntensity: 1.2, key: 0xffb98a, keyIntensity: 1.0, bloom: 0.5, exposure: 0.95,
};
const DEEP: Colours = {
  top: 0x0c1440, mid: 0x22306e, low: 0x52559a, sun: 0xe6ecff, cloud: 0x8894cc, cloudShade: 0x2a3676,
  water: 0x153a62, shallow: 0x2f8c98, foam: 0xcfe6ff, fog: 0x2c3668,
  hemiSky: 0x7088e8, hemiGround: 0x2a2452, hemiIntensity: 1.05, key: 0xa8bcff, keyIntensity: 0.85, bloom: 0.6, exposure: 0.95,
};
/** Each sea's air: the fog sea greys, the aurora sea cools. */
const SEA_AIR: Record<SeaId, { to: number; k: number } | null> = {
  dusk: null,
  fog: { to: 0x7a8296, k: 0.5 },
  aurora: { to: 0x3a7a86, k: 0.35 },
};
const COLOURS: (keyof Colours)[] = ['top', 'mid', 'low', 'sun', 'cloud', 'cloudShade', 'water', 'shallow', 'foam', 'fog', 'hemiSky', 'hemiGround', 'key'];

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

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function paletteFor(sky: Sky, sea: SeaId): Palette {
  const night = Math.min(1, Math.max(0, 1 - sky.sun));
  // The evening holds until the moon is well up, then the sky deepens.
  const deep = night >= 1 ? smooth(0.45, 1, sky.moon) : 0;
  const p = { night, deep, sunUp: 1 - night } as Palette;
  for (const k of Object.keys(DAY) as (keyof Colours)[]) {
    if (COLOURS.includes(k)) p[k] = mixColour(mixColour(DAY[k], EVENING[k], night), DEEP[k], deep);
    else {
      const v = DAY[k] + (EVENING[k] - DAY[k]) * night;
      p[k] = v + (DEEP[k] - v) * deep;
    }
  }
  const air = SEA_AIR[sea];
  if (air) for (const k of COLOURS) if (k !== 'foam' && k !== 'sun') p[k] = mixColour(p[k], air.to, air.k);
  return p;
}
