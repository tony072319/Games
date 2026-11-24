import type { Sky } from './sky';

/**
 * The sea, painted every frame in scene coordinates (360x640, horizon at y=330).
 * - The water's colour reflects the sky, so it changes with the time of day.
 * - Rows of wave glints in perspective: dense, fine and pale near the horizon;
 *   wide, slow and sparse up close, with darker troughs between.
 * - Shimmering columns of light under the sun, the moon and the lighthouse.
 */
export const SEA_TOP = 330;
const SEA_BOTTOM = 640;

/** The subset of CanvasRenderingContext2D the sea uses (keeps it testable). */
export interface SeaCtx {
  fillStyle: string | CanvasGradient | CanvasPattern;
  globalAlpha: number;
  fillRect(x: number, y: number, w: number, h: number): void;
  createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i] - v) * t) as RGB;
const css = (c: RGB) => `rgb(${c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(',')})`;

/** Cheap deterministic noise in [0,1). */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const ROWS = 64;

/** `light` is the lighthouse's light, 0..1: its reflection spreads farther and denser as it grows. */
export function drawSea(ctx: SeaCtx, tMs: number, sky: Sky, light = 0.5, calm = false): void {
  const t = tMs / 1000;
  const horizon = hex(sky.horizon);
  const low = hex(sky.skyLow);
  const mid = hex(sky.skyMid);
  const deep: RGB = mix(hex(sky.skyTop), [2, 3, 12], 0.6);

  // Water body: the sky mirrored and darkened, deepening toward the viewer.
  const g = ctx.createLinearGradient(0, SEA_TOP, 0, SEA_BOTTOM);
  g.addColorStop(0, css(mix(horizon, low, 0.35).map((v) => v * 0.62) as RGB));
  g.addColorStop(0.12, css(mix(low, mid, 0.5).map((v) => v * 0.45) as RGB));
  g.addColorStop(0.45, css(mix(mid, deep, 0.6).map((v) => v * 0.5) as RGB));
  g.addColorStop(1, css(deep));
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(-60, SEA_TOP, 480, SEA_BOTTOM - SEA_TOP);

  const crest = mix(mix(horizon, [235, 225, 255], 0.45), low, 0.2);
  const crestCss = css(crest);
  const trough = 'rgb(3,4,14)';

  // Wave texture, far to near.
  for (let r = 0; r < ROWS; r++) {
    const d = r / (ROWS - 1); // 0 = horizon, 1 = bottom
    const y = SEA_TOP + 1 + (SEA_BOTTOM - SEA_TOP) * Math.pow(d, 1.75);
    const step = 2.2 + 26 * d;
    const thick = 0.35 + 2.1 * d;
    const k = 0.9 / (0.12 + 1.6 * d); // spatial frequency: far waves are finer
    const ph = hash(r) * 6.283;
    const speed = 0.5 + 0.9 * d;
    const fade = 1 - 0.35 * d;
    for (let x = -10 - hash(r + 7) * step; x < 370; x += step) {
      const v =
        Math.sin(x * k * 0.11 + t * speed + ph) +
        0.6 * Math.sin(x * k * 0.27 - t * speed * 1.3 + ph * 2.1) +
        0.35 * Math.sin(x * k * 0.53 + t * speed * 0.7 + r * 0.9);
      if (v > 0.95) {
        ctx.fillStyle = crestCss;
        ctx.globalAlpha = Math.min(0.75, (v - 0.95) * 0.75) * fade;
        ctx.fillRect(x, y - thick * 0.5, step * (0.55 + 0.3 * hash(x + r)), thick);
      } else if (v < -1.05) {
        ctx.fillStyle = trough;
        ctx.globalAlpha = Math.min(0.45, (-1.05 - v) * 0.5);
        ctx.fillRect(x, y, step * 0.8, thick * 1.4);
      }
    }
  }

  // Light on the water.
  glitter(ctx, t, 270, sky.sun, '#f8b67c', 0, 0.62);
  glitter(ctx, t, 78, sky.moon, '#e6ecff', 0, 0.62);
  glitter(ctx, t, 180, 0.3 + 0.55 * light, '#ffd98a', 0.4, 0.55 + 0.35 * light, Math.round(light * 4));
  if (sky.moon > 0.3 && !calm) plankton(ctx, t, sky.moon);
  ctx.globalAlpha = 1;
}

/** Tiny glowing specks in the dark water on moonlit nights. */
function plankton(ctx: SeaCtx, t: number, moon: number): void {
  ctx.fillStyle = '#8ff0e0';
  for (let i = 0; i < 48; i++) {
    const d = 0.45 + 0.55 * hash(i + 900);
    const y = SEA_TOP + (SEA_BOTTOM - SEA_TOP) * Math.pow(d, 1.75);
    const x = ((hash(i + 950) * 400 + t * (2 + 6 * hash(i))) % 400) - 20;
    const flick = 0.5 + 0.5 * Math.sin(t * (0.8 + hash(i + 7)) + i);
    if (flick < 0.4) continue;
    ctx.globalAlpha = moon * flick * 0.7;
    const r = 0.6 + 1.2 * d;
    ctx.fillRect(x, y, r, r);
  }
}

/** A shimmering column of light below a source at x = cx, between depths d0..d1. */
function glitter(ctx: SeaCtx, t: number, cx: number, strength: number, color: string, d0: number, d1: number, extra = 0): void {
  if (strength <= 0.02) return;
  ctx.fillStyle = color;
  const rows = 30;
  for (let i = 0; i < rows; i++) {
    const d = d0 + (d1 - d0) * (i / (rows - 1));
    const y = SEA_TOP + 1.5 + (SEA_BOTTOM - SEA_TOP) * Math.pow(d, 1.75);
    const spread = 3 + 46 * d;
    const per = 2 + Math.floor(d * 3) + extra;
    for (let j = 0; j < per; j++) {
      const seed = i * 13 + j * 7;
      // Each glint drifts and blinks on its own rhythm.
      const flick = 0.5 + 0.5 * Math.sin(t * (2.2 + hash(seed) * 2.5) + seed);
      if (flick < 0.35) continue;
      const x = cx + (hash(seed + Math.floor(t * 1.3 + hash(seed) * 5)) - 0.5) * 2 * spread;
      const w = (2 + 10 * hash(seed + 3)) * (0.5 + 1.6 * d);
      ctx.globalAlpha = strength * flick * (0.85 - 0.5 * ((d - d0) / Math.max(0.01, d1 - d0)));
      ctx.fillRect(x - w / 2, y, w, 0.6 + 1.5 * d);
    }
  }
}
