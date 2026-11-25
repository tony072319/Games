/**
 * The sky drifts through dusk → twilight → night → pre-dawn and back, on a loop
 * tied to real time so it keeps moving while the game is open (and across visits).
 */
import type { SeaId } from '../core/data';

import { SKY_CYCLE_MS } from '../core/daycycle';
export { SKY_CYCLE_MS };

export interface Sky {
  skyTop: string;
  skyMid: string;
  skyLow: string;
  horizon: string;
  /** Colour washed over the sea, with its strength. */
  seaTint: string;
  seaTintOpacity: number;
  /** 0..1 how far up the sun is (1 = half set at the horizon, 0 = gone). */
  sun: number;
  /** 0..1 how visible the moon is. */
  moon: number;
  stars: number;
  /** How warm the clouds are lit (0 = cool night grey). */
  cloudWarm: number;
}

interface Key extends Omit<Sky, never> {
  at: number;
}

const KEYS: Key[] = [
  { at: 0.0, skyTop: '#12112b', skyMid: '#3a2c5a', skyLow: '#9b5a78', horizon: '#b8677a', seaTint: '#000000', seaTintOpacity: 0, sun: 1, moon: 0, stars: 0.5, cloudWarm: 1 },
  { at: 0.12, skyTop: '#11102a', skyMid: '#33285a', skyLow: '#7a4a78', horizon: '#9a5472', seaTint: '#0a0820', seaTintOpacity: 0.1, sun: 0.35, moon: 0, stars: 0.6, cloudWarm: 0.75 },
  { at: 0.25, skyTop: '#0c0d26', skyMid: '#232552', skyLow: '#3e3a72', horizon: '#5a4a80', seaTint: '#050818', seaTintOpacity: 0.25, sun: 0, moon: 0.4, stars: 0.8, cloudWarm: 0.3 },
  { at: 0.5, skyTop: '#05061a', skyMid: '#0d1236', skyLow: '#1b2350', horizon: '#26305e', seaTint: '#02040f', seaTintOpacity: 0.4, sun: 0, moon: 1, stars: 1, cloudWarm: 0 },
  { at: 0.75, skyTop: '#0a0f2a', skyMid: '#1a2a55', skyLow: '#2e4a72', horizon: '#4a6a88', seaTint: '#04101c', seaTintOpacity: 0.25, sun: 0, moon: 0.45, stars: 0.6, cloudWarm: 0.2 },
  { at: 0.9, skyTop: '#121130', skyMid: '#35305e', skyLow: '#7a5278', horizon: '#a8667a', seaTint: '#080616', seaTintOpacity: 0.08, sun: 0.5, moon: 0, stars: 0.5, cloudWarm: 0.8 },
  { at: 1.0, skyTop: '#12112b', skyMid: '#3a2c5a', skyLow: '#9b5a78', horizon: '#b8677a', seaTint: '#000000', seaTintOpacity: 0, sun: 1, moon: 0, stars: 0.5, cloudWarm: 1 },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('');
}

/** Sky state at a moment (epoch ms or any ms offset). */
export function skyAt(ms: number): Sky {
  const phase = (((ms % SKY_CYCLE_MS) + SKY_CYCLE_MS) % SKY_CYCLE_MS) / SKY_CYCLE_MS;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].at <= phase) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const raw = (phase - a.at) / (b.at - a.at);
  const t = raw * raw * (3 - 2 * raw); // smoothstep
  return {
    skyTop: mix(a.skyTop, b.skyTop, t),
    skyMid: mix(a.skyMid, b.skyMid, t),
    skyLow: mix(a.skyLow, b.skyLow, t),
    horizon: mix(a.horizon, b.horizon, t),
    seaTint: mix(a.seaTint, b.seaTint, t),
    seaTintOpacity: lerp(a.seaTintOpacity, b.seaTintOpacity, t),
    sun: lerp(a.sun, b.sun, t),
    moon: lerp(a.moon, b.moon, t),
    stars: lerp(a.stars, b.stars, t),
    cloudWarm: lerp(a.cloudWarm, b.cloudWarm, t),
  };
}

/** Push the sky into CSS variables on an element. */
export function applySky(target: HTMLElement, s: Sky): void {
  const st = target.style;
  st.setProperty('--sky-top', s.skyTop);
  st.setProperty('--sky-mid', s.skyMid);
  st.setProperty('--sky-low', s.skyLow);
  st.setProperty('--sky-horizon', s.horizon);
  st.setProperty('--sea-tint', s.seaTint);
  st.setProperty('--sea-tint-op', s.seaTintOpacity.toFixed(3));
  st.setProperty('--sun', s.sun.toFixed(3));
  st.setProperty('--moon', s.moon.toFixed(3));
  st.setProperty('--stars', s.stars.toFixed(3));
  st.setProperty('--cloud-warm', s.cloudWarm.toFixed(3));
}

/** Each sea has its own air: fog greys and softens; the aurora sea is colder and greener. */
export function tintSky(s: Sky, sea: SeaId): Sky {
  if (sea === 'dusk') return s;
  if (sea === 'fog') {
    const g = '#545468';
    return {
      ...s,
      skyTop: mix(s.skyTop, '#1c1c2a', 0.4),
      skyMid: mix(s.skyMid, g, 0.4),
      skyLow: mix(s.skyLow, '#6a6a80', 0.5),
      horizon: mix(s.horizon, '#7a7a90', 0.55),
      stars: s.stars * 0.35,
      sun: s.sun * 0.55,
      moon: s.moon * 0.6,
      cloudWarm: s.cloudWarm * 0.4,
    };
  }
  return {
    ...s,
    skyTop: mix(s.skyTop, '#04141e', 0.45),
    skyMid: mix(s.skyMid, '#123a4a', 0.4),
    skyLow: mix(s.skyLow, '#3a7a86', 0.35),
    horizon: mix(s.horizon, '#8ac4c8', 0.4),
    stars: Math.min(1, s.stars * 1.3 + 0.2),
    cloudWarm: s.cloudWarm * 0.3,
  };
}
