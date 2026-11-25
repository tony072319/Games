/** The day–night loop, shared by the rules (night pays more) and the picture (sky colours). */
export const SKY_CYCLE_MS = 20 * 60 * 1000;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 0 with the sun up (the cycle starts at dusk), 1 at deep night; continuous all the way round. */
export function nightness(ms: number): number {
  const p = (((ms % SKY_CYCLE_MS) + SKY_CYCLE_MS) % SKY_CYCLE_MS) / SKY_CYCLE_MS;
  return smooth(0.1, 0.3, p) * (1 - smooth(0.7, 0.9, p));
}
