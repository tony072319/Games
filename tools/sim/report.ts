/** A readable table of a simulation run. */
import type { SimReport } from './sim';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function formatReport(r: SimReport): string {
  const lines = [`profile ${r.profile}  finished ${r.finished}  talents ${pct(r.talentFill)}  broken ${r.broken}`];
  for (const s of r.seas) {
    const left = Object.entries(s.leftover).map(([m, v]) => `${m} ${(v ?? 0).toFixed(1)}x`).join(' ');
    lines.push(
      `${s.sea.padEnd(7)} ${s.days.toFixed(1)}d  L7@${(s.lightAt[7] ?? NaN).toFixed(1)}d  buy ${pct(s.buyRatio)}  net ${pct(s.share.net)} boat ${pct(s.share.boat)} isl ${pct(s.share.islands)} taps ${pct(s.share.taps)}  maxNet ${s.maxNet}  tap ${s.tapSeconds.toFixed(1)}s  stars +${s.starlightAfter}  left: ${left}`,
    );
  }
  return lines.join('\n');
}
