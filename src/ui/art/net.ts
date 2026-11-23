/**
 * The net, drawn for a given level. Big changes of gear happen at levels
 * 3, 6, 10, 18 and 30; every level in between adds something you can see
 * (more catch, floats, lights, a gull...). Everything stays within x ≥ 40 so
 * it never leaves the screen on tall phones.
 */

const mesh = 'url(#mesh)';

function bag(cx: number, top: number, w: number, h: number, stroke = '#c9a978'): string {
  return `<path d="M${cx - w / 2} ${top} Q${cx - w / 2 + 2} ${top + h * 0.8} ${cx} ${top + h} Q${cx + w / 2 - 2} ${top + h * 0.8} ${cx + w / 2} ${top} Z" fill="${mesh}" stroke="${stroke}" stroke-width="1.1"/>`;
}

function float(x: number, y: number, i: number, glow = false): string {
  return (glow ? `<circle cx="${x}" cy="${y}" r="6" fill="url(#glow)" opacity="0.7"/>` : '') +
    `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.5" fill="${i % 2 ? '#f3ecff' : '#d96b4a'}" stroke="#2b2433" stroke-width="0.6"/>`;
}

function bulb(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="5" fill="url(#glow)" opacity="0.75"/><circle cx="${x}" cy="${y}" r="1.6" fill="var(--lamp)"/>`;
}

function lantern(x: number, y: number, s = 1): string {
  return `<g transform="translate(${x} ${y}) scale(${s})"><circle cy="5" r="10" fill="url(#glow)" class="lamp"/><line y1="-3" y2="0" stroke="#3a3044" stroke-width="0.8"/><path d="M-3 0 h6 l1 2 v6 l-1 2 h-6 l-1 -2 v-6 Z" fill="var(--lamp)" stroke="#3a3044" stroke-width="0.8"/></g>`;
}

/** Fish caught in a net: n little silhouettes packed into a box. */
function catchIn(cx: number, cy: number, w: number, h: number, n: number): string {
  let out = '';
  for (let i = 0; i < n; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const x = cx - w / 2 + 5 + col * ((w - 10) / 3) + (row % 2) * 3;
    const y = cy - h / 2 + 4 + row * 6;
    if (y > cy + h / 2) break;
    const c = ['#9fb2d8', '#c8d4ee', '#e0a46a', '#8fd0c4'][i % 4];
    const flip = i % 2 ? -1 : 1;
    out += `<path transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${flip} 1)" d="M-4 0 Q0 -2.6 4 0 Q0 2.6 -4 0 Z M4 0 L6.5 -2 L6.5 2 Z" fill="${c}"/>`;
  }
  return out;
}

function gull(x: number, y: number): string {
  return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="-3" rx="5" ry="3" fill="#f3ecff"/><circle cx="4" cy="-6" r="2.2" fill="#f3ecff"/><path d="M6 -6 l2.5 0.6 l-2.5 0.6 Z" fill="#e8a23a"/><path d="M-5 -4 L-1 -5 L-3 -1 Z" fill="#8a8aa0"/><line x1="-1" y1="0" x2="-1" y2="2" stroke="#e8a23a" stroke-width="0.8"/><line x1="1" y1="0" x2="1" y2="2" stroke="#e8a23a" stroke-width="0.8"/></g>`;
}

function flag(x: number, y: number, color: string): string {
  return `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 14}" stroke="#3a3044" stroke-width="1"/><path class="flag" d="M${x} ${y - 14} L${x + 10} ${y - 11} L${x} ${y - 8} Z" fill="${color}"/>`;
}

const bucket = (x: number, y: number) =>
  `<path d="M${x - 6} ${y - 10} L${x + 6} ${y - 10} L${x + 5} ${y} L${x - 5} ${y} Z" fill="#7a5640" stroke="#3d291f" stroke-width="0.8"/><path d="M${x - 6} ${y - 10} Q${x} ${y - 18} ${x + 6} ${y - 10}" fill="none" stroke="#5d6270" stroke-width="0.8"/><path d="M${x + 1} ${y - 10} l3 -5 l2 2 Z" fill="#9fb2d8"/>`;
const coil = (x: number, y: number) =>
  `<g fill="none" stroke="#d7b882" stroke-width="1.4"><ellipse cx="${x}" cy="${y - 2}" rx="6" ry="2.4"/><ellipse cx="${x}" cy="${y - 4}" rx="4.5" ry="1.8"/></g>`;
const crates = (x: number, y: number) =>
  `<g stroke="#3d291f" stroke-width="0.8"><rect x="${x}" y="${y - 9}" width="10" height="9" fill="#8a6a4a"/><rect x="${x + 10}" y="${y - 7}" width="8" height="7" fill="#7a5a3e"/><rect x="${x + 3}" y="${y - 16}" width="8" height="7" fill="#94603c"/></g>`;

function handNet(level: number): string {
  let s = `<line x1="116" y1="431" x2="70" y2="452" stroke="#8a6a4a" stroke-width="2.4" stroke-linecap="round"/>
<ellipse cx="62" cy="455" rx="11" ry="4.5" fill="none" stroke="#8a6a4a" stroke-width="1.8"/>${bag(62, 455, 20, 18)}`;
  if (level >= 2) s += bucket(128, 432) + catchIn(62, 463, 14, 6, 1);
  return s;
}

function poleNet(level: number): string {
  let s = `<line x1="50" y1="476" x2="50" y2="412" stroke="#b49a5a" stroke-width="3"/><line x1="94" y1="472" x2="94" y2="408" stroke="#b49a5a" stroke-width="3"/>
<g stroke="#8a7a3a" stroke-width="0.9"><line x1="48" y1="426" x2="52" y2="426"/><line x1="48" y1="444" x2="52" y2="444"/><line x1="92" y1="422" x2="96" y2="422"/><line x1="92" y1="440" x2="96" y2="440"/></g>
<path d="M50 418 Q72 428 94 414 L94 456 Q72 472 50 462 Z" fill="${mesh}" stroke="#d7b882" stroke-width="1.2"/>
<path d="M50 418 Q72 428 94 414" fill="none" stroke="#d7b882" stroke-width="2.2"/>`;
  s += catchIn(72, 448, 34, 12, level - 1);
  if (level >= 4) s += [56, 72, 88].map((x, i) => float(x, x === 72 ? 468 : 463, i)).join('');
  if (level >= 5) s += flag(50, 412, '#d96b4a') + `<circle cx="94" cy="414" r="2" fill="#d9b25a"/>`;
  return s;
}

function driftNet(level: number): string {
  const k = level - 6; // 0..3
  const arc: [number, number][] = [[96, 462], [88, 467], [79, 471], [70, 474], [61, 475], [52, 474], [44, 471], [40, 466]];
  const n = Math.min(arc.length, 5 + k);
  let s = `<path d="M104 438 Q102 452 96 462" fill="none" stroke="#d7b882" stroke-width="1.4"/>
<path d="M96 462 Q68 482 40 466 L44 494 Q68 508 92 488 Z" fill="${mesh}" opacity="0.55"/>
<path d="M96 462 Q68 482 40 466" fill="none" stroke="#d7b882" stroke-width="1.4"/>`;
  s += catchIn(68, 488, 40, 10, 2 + k * 2);
  s += arc.slice(0, n).map(([x, y], i) => float(x, y, i)).join('');
  if (level >= 8) s += `<ellipse cx="44" cy="456" rx="4" ry="5" fill="#d96b4a" stroke="#2b2433" stroke-width="0.6"/>` + flag(44, 452, '#f3ecff');
  if (level >= 9) s += [[90, 452], [76, 455], [62, 456]].map(([x, y], i) => float(x, y, i + 1)).join('') + lantern(108, 420, 0.8);
  return s;
}

function woodCrane(level: number): string {
  const k = level - 10; // 0..7
  const big = k >= 7 ? 1.15 : 1;
  let s = `<rect x="110" y="378" width="5" height="54" fill="#7a5640"/><line x1="112" y1="382" x2="54" y2="394" stroke="#7a5640" stroke-width="4.2" stroke-linecap="round"/>
<line x1="112" y1="408" x2="82" y2="389" stroke="#5d4030" stroke-width="2"/><circle cx="56" cy="395" r="3.6" fill="#3d291f" stroke="#c9a978" stroke-width="1"/>
<line x1="56" y1="398" x2="56" y2="424" stroke="${k >= 7 ? '#d9b25a' : '#d7b882'}" stroke-width="1.3"/>`;
  if (k >= 4) s += [0, 1, 2, 3].map((i) => `<line x1="${108 - i * 14}" y1="${383 + i * 2.9}" x2="${102 - i * 14}" y2="${384.2 + i * 2.9}" stroke="#d96b4a" stroke-width="4.4"/>`).join('');
  s += `<g transform="translate(56 424) scale(${big}) translate(-56 -424)">${bag(56, 424, 32, 36, k >= 7 ? '#d9b25a' : '#c9a978')}${catchIn(56, 438, 26, 16, 3 + k * 2)}</g>`;
  s += `<path d="M42 458 Q56 454 70 458" fill="none" stroke="#e8e0ff" stroke-opacity="0.35" stroke-width="1.5"/>`;
  if (k >= 1) s += coil(124, 432);
  if (k >= 3) s += lantern(84, 390, 0.8);
  if (k >= 5) s += crates(130, 432);
  if (k >= 6) s += gull(58, 389);
  return s;
}

function ironCrane(level: number): string {
  const k = level - 18; // 0..11
  let s = `<rect x="107" y="366" width="7" height="66" fill="#5d6270" stroke="#3a3f4a" stroke-width="0.8"/>
<line x1="110" y1="370" x2="50" y2="382" stroke="#6c7482" stroke-width="5" stroke-linecap="round"/>
<g stroke="#3a3f4a" stroke-width="1"><line x1="110" y1="400" x2="72" y2="376"/><line x1="94" y1="374" x2="100" y2="388"/><line x1="78" y1="377" x2="84" y2="390"/></g>
<g fill="#a8b0bd"><circle cx="110" cy="386" r="1.2"/><circle cx="110" cy="406" r="1.2"/><circle cx="110" cy="420" r="1.2"/></g>
<circle cx="52" cy="383" r="3.6" fill="#2b2433" stroke="#a8b0bd" stroke-width="1"/>
<line x1="52" y1="386" x2="52" y2="412" stroke="#a8b0bd" stroke-width="1.3"/>
<rect x="35" y="412" width="34" height="36" rx="2" fill="${mesh}" stroke="#8a929f" stroke-width="2"/>
<g stroke="#8a929f" stroke-width="1"><line x1="35" y1="430" x2="69" y2="430"/><line x1="52" y1="412" x2="52" y2="448"/></g>`;
  s += catchIn(52, 432, 30, 26, 4 + k);
  const bulbs: [number, number][] = [[100, 372], [90, 374], [80, 376], [70, 378], [60, 380], [104, 392]];
  s += bulbs.slice(0, Math.min(6, k)).map(([x, y]) => bulb(x, y + 2)).join('');
  if (k >= 2) s += `<g transform="translate(126 424)"><circle r="7" fill="none" stroke="#6c7482" stroke-width="2"/><circle r="1.6" fill="#a8b0bd"/><line x1="-6" y1="0" x2="6" y2="0" stroke="#6c7482"/><line x1="0" y1="-6" x2="0" y2="6" stroke="#6c7482"/></g>`;
  if (k >= 4) s += `<line x1="84" y1="378" x2="84" y2="398" stroke="#a8b0bd" stroke-width="1"/><rect x="76" y="398" width="16" height="16" rx="1.5" fill="${mesh}" stroke="#8a929f" stroke-width="1.4"/>${catchIn(84, 406, 12, 10, Math.min(4, k - 3))}`;
  if (k >= 6) s += flag(110, 366, '#4a90c8');
  if (k >= 8) s += gull(66, 377);
  if (k >= 10) s += `<g transform="translate(114 360)"><rect x="-3" y="-3" width="8" height="6" rx="1" fill="#a8b0bd"/><path d="M5 0 L40 -14 L40 14 Z" fill="url(#beamGrad)" opacity="0.6"/></g>`;
  return s;
}

function lanternRig(level: number): string {
  const k = level - 30; // 0..20
  let s = `<ellipse cx="72" cy="470" rx="${Math.min(30 + k * 1.5, 60)}" ry="${13 + k * 0.3}" fill="url(#pool)"/>
<rect x="105" y="356" width="8" height="76" fill="#5d6270" stroke="#d9b25a" stroke-width="0.9"/>
<line x1="109" y1="360" x2="42" y2="372" stroke="#6c7482" stroke-width="5.2" stroke-linecap="round"/>
<line x1="109" y1="394" x2="48" y2="404" stroke="#6c7482" stroke-width="3.2" stroke-linecap="round"/>
<line x1="109" y1="360" x2="42" y2="372" stroke="#d9b25a" stroke-width="1"/>
<line x1="44" y1="374" x2="44" y2="406" stroke="#a8b0bd" stroke-width="1.2"/><line x1="82" y1="366" x2="82" y2="406" stroke="#a8b0bd" stroke-width="1.2"/>
<path d="M36 406 L90 406 Q86 448 63 458 Q40 448 36 406 Z" fill="${mesh}" stroke="#d9b25a" stroke-width="1.6"/>`;
  s += catchIn(63, 424, 46, 26, 8 + Math.min(8, k));
  // Lights strung along both booms: one more for every level.
  const n = 5 + k;
  for (let i = 0; i < n; i++) {
    const upper = i % 2 === 0;
    const j = Math.floor(i / 2);
    const tt = Math.min(1, (j + 0.5) / Math.ceil(n / 2));
    const x = upper ? 109 - 67 * tt : 109 - 61 * tt;
    const y = upper ? 363 + 12 * tt : 397 + 10 * tt;
    s += bulb(x, y);
  }
  s += [[94, 466], [80, 474], [64, 478], [50, 476], [42, 470]].map(([x, y], i) => float(x, y, i, true)).join('');
  if (k >= 5) s += `<g transform="translate(109 344)"><circle r="12" fill="url(#glow)"/><path d="M0 -6 L1.8 -1.8 L6 0 L1.8 1.8 L0 6 L-1.8 1.8 L-6 0 L-1.8 -1.8 Z" fill="#ffe7a8" stroke="#d9b25a" stroke-width="0.6"/></g>`;
  if (k >= 10) s += `<line x1="58" y1="406" x2="58" y2="440" stroke="#a8b0bd" stroke-width="1"/>${bag(48, 440, 18, 22, '#d9b25a')}${catchIn(48, 448, 14, 10, 3)}`;
  if (k >= 15) s += `<ellipse cx="72" cy="468" rx="62" ry="22" fill="url(#pool)" opacity="0.8"/>`;
  if (k >= 20) s += `<g transform="translate(109 340)"><circle r="20" fill="url(#glow)"/><path d="M-6 4 L-6 -4 L-3 0 L0 -6 L3 0 L6 -4 L6 4 Z" fill="#ffd25a" stroke="#a87a20" stroke-width="0.8"/></g>`;
  return s;
}

export function netSvg(level: number): string {
  if (level >= 30) return lanternRig(level);
  if (level >= 18) return ironCrane(level);
  if (level >= 10) return woodCrane(level);
  if (level >= 6) return driftNet(level);
  if (level >= 3) return poleNet(level);
  return handNet(level);
}
