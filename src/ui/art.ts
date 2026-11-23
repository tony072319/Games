import type { MaterialId } from '../core/data';

/**
 * All game art is drawn here in code so it can be swapped for painted art later.
 * The scene uses a 360x640 portrait canvas. The horizon sits at y=330 and the sea
 * recedes toward it in perspective: wave bands get thinner, flatter and paler with distance.
 */

export const HORIZON_Y = 330;
/** Where the lamp sits; the beam rotates around this point. */
export const LAMP = { x: 180, y: 259 };
/** Storage chest anchor on the platform (scene coordinates). */
export const CHEST_POS = { x: 236, y: 432 };
/** Band of sea in front of the island where flotsam drifts. */
export const SEA_BAND = { top: 478, bottom: 606 };

const STARS: readonly [number, number, number][] = [
  [30, 40, 1.2], [80, 90, 0.8], [130, 30, 1], [210, 70, 0.9], [260, 25, 1.3],
  [320, 60, 0.8], [300, 130, 1], [50, 150, 0.7], [110, 175, 0.9], [345, 20, 0.7],
  [175, 120, 0.6], [20, 210, 0.6],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], t)).toString(16).padStart(2, '0')).join('');
}

/** A filled wave band: crest line at y with the given amplitude and wavelength, filled down to the bottom. */
function waveBand(y: number, amp: number, wl: number): string {
  const x0 = -2 * wl;
  const n = Math.ceil((360 + 4 * wl) / wl);
  let d = `M${x0} ${y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * wl;
    d += ` Q${(x + wl / 4).toFixed(1)} ${(y - amp).toFixed(1)} ${(x + wl / 2).toFixed(1)} ${y.toFixed(1)}`;
    d += ` T${(x + wl).toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function sea(): string {
  const layers = 11;
  let out = '';
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 = far, 1 = near
    const y = HORIZON_Y + 4 + 300 * Math.pow(t, 1.7);
    const amp = 0.6 + 6 * Math.pow(t, 1.6);
    const wl = 10 + 70 * t;
    const crest = waveBand(y, amp, wl);
    const fill = mixColor('#3d3666', '#070a1a', Math.pow(t, 0.8));
    const dur = (9 - 4 * t).toFixed(1);
    const shift = (wl / 2).toFixed(1);
    out += `<g class="swell" style="--shift:${shift}px;animation-duration:${dur}s;animation-delay:${(-i * 0.7).toFixed(1)}s">`;
    out += `<path d="${crest} L${360 + 2 * wl} 640 L${-2 * wl} 640 Z" fill="${fill}"/>`;
    out += `<path d="${crest}" fill="none" stroke="#c9b8ff" stroke-opacity="${(0.08 + 0.12 * (1 - t)).toFixed(2)}" stroke-width="${(0.5 + 1.2 * t).toFixed(2)}"/>`;
    out += `</g>`;
  }
  return out;
}

/** Deterministic pseudo-random in [0,1) so the art is identical on every load. */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Broken glints of sunset on the water: dense and narrow near the horizon, sparse and wide up close. */
function sunReflection(): string {
  let out = '';
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.3);
    const y = HORIZON_Y + 2 + 170 * t + hash(i) * 4;
    const spread = 10 + 34 * t;
    const w = (4 + 18 * hash(i + 50)) * (0.5 + t);
    const x = 270 + (hash(i + 100) - 0.5) * spread * 2 - w / 2;
    const op = (0.6 - 0.45 * t) * (0.5 + 0.5 * hash(i + 200));
    out += `<rect class="glint" style="animation-delay:${(hash(i + 300) * 3).toFixed(2)}s" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(0.8 + 1.4 * t).toFixed(1)}" rx="1" fill="#f6b27a" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}

function nets(): string {
  // Four looks for the net as it is mended, shown one at a time via data-net on the stage.
  const mesh = (x: number, y: number, w: number, h: number) =>
    `<path d="M${x} ${y} L${x + w} ${y} L${x + w * 0.85} ${y + h} Q${x + w / 2} ${y + h * 1.25} ${x + w * 0.15} ${y + h} Z" fill="url(#mesh)" stroke="#c9a978" stroke-width="1"/>`;
  return `
<g class="net net-t0"><line x1="104" y1="438" x2="84" y2="452" stroke="#6b4a36" stroke-width="2.5"/>${mesh(72, 452, 22, 14)}</g>
<g class="net net-t1"><line x1="104" y1="438" x2="76" y2="452" stroke="#6b4a36" stroke-width="3"/>${mesh(58, 452, 34, 20)}</g>
<g class="net net-t2"><line x1="104" y1="438" x2="66" y2="450" stroke="#6b4a36" stroke-width="3.5"/><line x1="104" y1="444" x2="78" y2="456" stroke="#6b4a36" stroke-width="2"/>${mesh(42, 450, 50, 26)}<circle cx="44" cy="451" r="3" fill="#d96b4a"/><circle cx="90" cy="451" r="3" fill="#d96b4a"/></g>
<g class="net net-t3"><line x1="104" y1="436" x2="56" y2="446" stroke="#7a5640" stroke-width="4"/><line x1="104" y1="444" x2="64" y2="456" stroke="#7a5640" stroke-width="2.5"/>${mesh(24, 446, 70, 34)}<circle cx="26" cy="447" r="3.5" fill="#d96b4a"/><circle cx="58" cy="445" r="3.5" fill="#f3ecff"/><circle cx="92" cy="447" r="3.5" fill="#d96b4a"/></g>`;
}

export function sceneSvg(): string {
  const stars = STARS.map(
    ([x, y, r], i) => `<circle class="star" style="animation-delay:${(i % 5) * 1.3}s" cx="${x}" cy="${y}" r="${r}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--sky-top)"/>
    <stop offset="0.5" stop-color="var(--sky-mid)"/>
    <stop offset="0.85" stop-color="#9b5a78"/>
    <stop offset="1" stop-color="var(--sky-horizon)"/>
  </linearGradient>
  <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#ffc58a" stop-opacity="0.85"/>
    <stop offset="0.35" stop-color="#f08a68" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#f08a68" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="cloud" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4a3a6e" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#d88a7a" stop-opacity="0.75"/>
  </linearGradient>
  <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#e3a08a" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#e3a08a" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.5"/>
    <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow">
    <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.9"/>
    <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.22"/>
    <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#e6dbd0"/>
    <stop offset="0.55" stop-color="#c4b6b4"/>
    <stop offset="1" stop-color="#7d708a"/>
  </linearGradient>
  <linearGradient id="rock" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#3a3150"/>
    <stop offset="1" stop-color="#120f1e"/>
  </linearGradient>
  <pattern id="mesh" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="5" height="5" fill="#2a2440" fill-opacity="0.35"/>
    <path d="M0 0 L0 5 M0 0 L5 0" stroke="#c9a978" stroke-width="0.7"/>
  </pattern>
</defs>

<!-- sky -->
<rect width="360" height="${HORIZON_Y + 2}" fill="url(#sky)"/>
<g fill="#f3ecff">${stars}</g>
<circle cx="270" cy="${HORIZON_Y}" r="90" fill="url(#sunGlow)"/>
<g class="clouds">
  <g class="cloud c1"><ellipse cx="70" cy="215" rx="70" ry="9" fill="url(#cloud)"/><ellipse cx="100" cy="207" rx="38" ry="8" fill="url(#cloud)"/></g>
  <g class="cloud c2"><ellipse cx="300" cy="255" rx="80" ry="7" fill="url(#cloud)" opacity="0.8"/><ellipse cx="270" cy="249" rx="34" ry="6" fill="url(#cloud)" opacity="0.8"/></g>
  <g class="cloud c3"><ellipse cx="150" cy="292" rx="110" ry="4" fill="url(#cloud)" opacity="0.6"/></g>
</g>
<path d="M245 ${HORIZON_Y} A25 25 0 0 1 295 ${HORIZON_Y} Z" fill="#f7a86f"/>
<!-- far islands -->
<path d="M8 ${HORIZON_Y} Q22 ${HORIZON_Y - 9} 40 ${HORIZON_Y - 6} Q58 ${HORIZON_Y - 12} 78 ${HORIZON_Y} Z" fill="#2c2446" opacity="0.85"/>
<path d="M318 ${HORIZON_Y} Q328 ${HORIZON_Y - 4} 342 ${HORIZON_Y} Z" fill="#2c2446" opacity="0.7"/>

<!-- sea -->
<rect y="${HORIZON_Y}" width="360" height="${640 - HORIZON_Y}" fill="#070a1a"/>
${sea()}
<rect y="${HORIZON_Y}" width="360" height="40" fill="url(#haze)"/>
${sunReflection()}

<!-- island, light pool, platform -->
<ellipse cx="180" cy="458" rx="120" ry="22" fill="url(#pool)"/>
<path d="M108 452 Q120 424 150 418 L176 412 Q214 410 236 422 Q256 432 262 452 Z" fill="url(#rock)"/>
<path class="foam" d="M100 452 Q140 446 180 452 T262 452" fill="none" stroke="#e8e0ff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
${nets()}
<g>
  <rect x="98" y="432" width="166" height="8" rx="2" fill="#7a5640"/>
  <rect x="98" y="438" width="166" height="2" fill="#4a3226"/>
  <g stroke="#4a3226" stroke-width="1"><line x1="122" y1="432" x2="122" y2="440"/><line x1="148" y1="432" x2="148" y2="440"/><line x1="212" y1="432" x2="212" y2="440"/><line x1="240" y1="432" x2="240" y2="440"/></g>
  <rect x="106" y="440" width="5" height="18" fill="#3d291f"/>
  <rect x="252" y="440" width="5" height="18" fill="#3d291f"/>
</g>

<!-- tower -->
<path d="M162 432 L169 272 L191 272 L198 432 Z" fill="url(#tower)"/>
<path d="M165.6 366 L194.4 366 L195.2 384 L164.8 384 Z M167.7 312 L192.3 312 L192.9 328 L167.1 328 Z" fill="#a04848" opacity="0.9"/>
<rect x="176" y="404" width="8" height="28" rx="4" fill="#2b2433"/>
<rect x="177" y="340" width="6" height="9" rx="3" fill="var(--lamp)" opacity="0.6"/>
<rect x="160" y="268" width="40" height="5" rx="1.5" fill="#3a3044"/>
<g stroke="#3a3044" stroke-width="1"><line x1="162" y1="268" x2="162" y2="262"/><line x1="198" y1="268" x2="198" y2="262"/><line x1="160" y1="262" x2="200" y2="262"/></g>
<!-- lamp room -->
<circle class="lamp" cx="${LAMP.x}" cy="${LAMP.y}" r="36" fill="url(#glow)"/>
<rect x="169" y="248" width="22" height="20" rx="2" fill="var(--lamp)"/>
<g stroke="#3a3044" stroke-width="1.5"><line x1="176" y1="248" x2="176" y2="268"/><line x1="184" y1="248" x2="184" y2="268"/></g>
<path d="M165 249 L180 234 L195 249 Z" fill="#3a3044"/>
<circle cx="180" cy="232" r="2" fill="#3a3044"/>
<polygon class="beam" points="${LAMP.x},${LAMP.y} 440,212 440,306" fill="url(#beamGrad)"/>
</svg>`;
}

const ICONS: Record<MaterialId, string> = {
  wood: `<rect x="4" y="11" width="24" height="10" rx="3" fill="#9a6a45" transform="rotate(-12 16 16)"/><g transform="rotate(-12 16 16)" stroke="#6b4a36" stroke-width="1" fill="none"><path d="M8 14 Q14 15 20 14"/><path d="M11 18 Q17 19 24 17"/><circle cx="23" cy="14" r="1.5"/></g>`,
  plastic: `<path d="M13 4 h6 v4 l3 4 v14 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 v-14 l3 -4 Z" fill="#7fc4c0" fill-opacity="0.85" stroke="#cdeeea" stroke-width="1"/><rect x="13" y="3" width="6" height="3" rx="1" fill="#3f7f99"/><rect x="12" y="15" width="8" height="6" fill="#f3ecff" fill-opacity="0.6"/>`,
  rope: `<g fill="none" stroke="#d7b882" stroke-width="2.6"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/></g><path d="M26 16 q3 4 0 9" fill="none" stroke="#d7b882" stroke-width="2.6" stroke-linecap="round"/>`,
  metal: `<g fill="#a8b0bd" stroke="#6c7482" stroke-width="1"><path d="M14 3 h4 l1 4 3 1.5 3.5-2.2 2.8 2.8-2.2 3.5 1.5 3 4 1 v4 l-4 1-1.5 3 2.2 3.5-2.8 2.8-3.5-2.2-3 1.5-1 4 h-4 l-1-4-3-1.5-3.5 2.2-2.8-2.8 2.2-3.5-1.5-3-4-1 v-4 l4-1 1.5-3-2.2-3.5 2.8-2.8 3.5 2.2 3-1.5 Z"/></g><circle cx="16" cy="16" r="4.5" fill="#2b2433"/>`,
};

export function itemIcon(m: MaterialId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">${ICONS[m]}</svg>`;
}

/** Visual tier (0..3) for an upgrade level, so the net and chest visibly grow as they are mended. */
export function tierFor(level: number): number {
  return level >= 20 ? 3 : level >= 10 ? 2 : level >= 4 ? 1 : 0;
}

/**
 * The storage chest. fill is 0..1; contents peek out as it fills.
 * Tier adds iron bands and a brass lock as it is upgraded.
 */
export function chestSvg(fill: number, tier: number): string {
  const wood = ['#8a5a3a', '#94603c', '#7a4e34', '#6a4430'][tier] ?? '#8a5a3a';
  const band = tier >= 1 ? `<rect x="6" y="20" width="52" height="3" fill="#5d6270"/><rect x="6" y="34" width="52" height="3" fill="#5d6270"/>` : '';
  const lock = tier >= 2 ? `<rect x="28" y="22" width="8" height="9" rx="1.5" fill="#d9b25a" stroke="#8a6a2a" stroke-width="1"/>` : '';
  const corners = tier >= 3 ? `<path d="M6 16 h6 v6 M58 16 h-6 v6 M6 46 h6 v-6 M58 46 h-6 v-6" stroke="#d9b25a" stroke-width="2" fill="none"/>` : '';
  const peek =
    fill > 0.25
      ? `<g transform="translate(0 ${(1 - Math.min(1, fill)) * 8})"><rect x="14" y="8" width="16" height="6" rx="2" fill="#9a6a45" transform="rotate(-10 22 11)"/><rect x="34" y="6" width="7" height="10" rx="2" fill="#7fc4c0"/><circle cx="46" cy="12" r="4" fill="none" stroke="#d7b882" stroke-width="2"/></g>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 52" aria-hidden="true">
${peek}
<path d="M6 16 Q32 4 58 16 L58 20 L6 20 Z" fill="${wood}" stroke="#3d291f" stroke-width="1.2" transform="rotate(${fill >= 1 ? -8 : 0} 6 18)"/>
<rect x="6" y="18" width="52" height="30" rx="3" fill="${wood}" stroke="#3d291f" stroke-width="1.2"/>
<g stroke="#3d291f" stroke-opacity="0.4" stroke-width="1"><line x1="6" y1="28" x2="58" y2="28"/><line x1="6" y1="40" x2="58" y2="40"/></g>
${band}${lock}${corners}
</svg>`;
}
