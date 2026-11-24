import { describe, expect, test } from 'vitest';
import { drawSea, type SeaCtx } from '../../src/ui/sea';
import { skyAt, SKY_CYCLE_MS } from '../../src/ui/sky';

/** Records fillRect calls with the fill style in effect. */
function fakeCtx() {
  const rects: { x: number; y: number; w: number; h: number; style: string }[] = [];
  const ctx: SeaCtx & { rects: typeof rects } = {
    rects,
    fillStyle: '',
    globalAlpha: 1,
    fillRect(x, y, w, h) {
      rects.push({ x, y, w, h, style: String(this.fillStyle) });
    },
    createLinearGradient: () => ({ addColorStop() {} }) as unknown as CanvasGradient,
  };
  return ctx;
}

describe('sea', () => {
  test('draws wave highlights that stay below the horizon', () => {
    const c = fakeCtx();
    drawSea(c, 1234, skyAt(0));
    const dashes = c.rects.filter((r) => r.h < 10);
    expect(dashes.length).toBeGreaterThan(200);
    for (const r of dashes) expect(r.y).toBeGreaterThanOrEqual(330);
  });

  test('waves move over time', () => {
    const a = fakeCtx();
    const b = fakeCtx();
    drawSea(a, 0, skyAt(0));
    drawSea(b, 2000, skyAt(0));
    expect(JSON.stringify(a.rects.slice(0, 200))).not.toBe(JSON.stringify(b.rects.slice(0, 200)));
  });

  test('the sun glitters on the water at dusk, the moon at night', () => {
    const dusk = fakeCtx();
    drawSea(dusk, 0, skyAt(0));
    const night = fakeCtx();
    drawSea(night, 0, skyAt(SKY_CYCLE_MS / 2));
    const near = (rs: { x: number; y: number; h: number }[], cx: number) =>
      rs.filter((r) => r.h < 10 && r.y < 480 && Math.abs(r.x - cx) < 40).length;
    expect(near(dusk.rects, 270)).toBeGreaterThan(near(night.rects, 270));
    expect(near(night.rects, 78)).toBeGreaterThan(near(dusk.rects, 78));
  });
});

describe('light on the water grows with the lighthouse', () => {
  test('more lamp glints, and a larger warm pool, at light 10 than at light 1', () => {
    const dim = fakeCtx();
    drawSea(dim, 0, skyAt(SKY_CYCLE_MS / 2), 0.1);
    const bright = fakeCtx();
    drawSea(bright, 0, skyAt(SKY_CYCLE_MS / 2), 1);
    const nearLamp = (rs: { x: number; y: number; h: number; style: string }[]) =>
      rs.filter((r) => r.h < 10 && r.y > 440 && Math.abs(r.x - 180) < 80 && r.style === '#ffd98a').length;
    expect(nearLamp(bright.rects)).toBeGreaterThan(nearLamp(dim.rects));
  });
  test('night plankton sparkles only at night', () => {
    const day = fakeCtx();
    drawSea(day, 0, skyAt(0), 0.5);
    const night = fakeCtx();
    drawSea(night, 0, skyAt(SKY_CYCLE_MS / 2), 0.5);
    const plankton = (rs: { style: string }[]) => rs.filter((r) => r.style === '#8ff0e0').length;
    expect(plankton(night.rects)).toBeGreaterThan(10);
    expect(plankton(day.rects)).toBe(0);
  });
});
