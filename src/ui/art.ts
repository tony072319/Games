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
function sunReflection(cx: number, color: string): string {
  let out = '';
  const n = 34;
  for (let i = 0; i < n; i++) {
    const t = Math.pow(i / (n - 1), 1.3);
    const y = HORIZON_Y + 2 + 170 * t + hash(i) * 4;
    const spread = 10 + 34 * t;
    const w = (4 + 18 * hash(i + 50)) * (0.5 + t);
    const x = cx + (hash(i + 100) - 0.5) * spread * 2 - w / 2;
    const op = (0.6 - 0.45 * t) * (0.5 + 0.5 * hash(i + 200));
    out += `<rect class="glint" style="animation-delay:${(hash(i + 300) * 3).toFixed(2)}s" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(0.8 + 1.4 * t).toFixed(1)}" rx="1" fill="${color}" opacity="${op.toFixed(2)}"/>`;
  }
  return out;
}

/** Net looks: each tier is a different kind of gear, not just a bigger net. */
export const NET_TIERS = 6;
const NET_AT = [1, 3, 6, 10, 18, 30];
export function netTier(level: number): number {
  let t = 0;
  for (let i = 0; i < NET_AT.length; i++) if (level >= NET_AT[i]) t = i;
  return t;
}

function nets(): string {
  const bag = (cx: number, top: number, w: number, h: number, fill = 'url(#mesh)', stroke = '#c9a978') =>
    `<path d="M${cx - w / 2} ${top} Q${cx - w / 2 + 2} ${top + h * 0.8} ${cx} ${top + h} Q${cx + w / 2 - 2} ${top + h * 0.8} ${cx + w / 2} ${top} Z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  const float = (x: number, y: number, c: string) => `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${c}" stroke="#2b2433" stroke-width="0.6"/>`;
  const floats = (pts: [number, number][], glow = false) =>
    pts.map(([x, y], i) => (glow ? `<circle cx="${x}" cy="${y}" r="5" fill="url(#glow)" opacity="0.6"/>` : '') + float(x, y, i % 2 ? '#f3ecff' : '#d96b4a')).join('');
  const lantern = (x: number, y: number) =>
    `<circle cx="${x}" cy="${y + 4}" r="9" fill="url(#glow)" class="lamp"/><rect x="${x - 2.5}" y="${y}" width="5" height="7" rx="1.2" fill="var(--lamp)" stroke="#3a3044" stroke-width="0.8"/><line x1="${x}" y1="${y - 3}" x2="${x}" y2="${y}" stroke="#3a3044" stroke-width="0.8"/>`;

  // t0 hand net leaning on the platform
  const t0 = `<line x1="112" y1="432" x2="76" y2="450" stroke="#8a6a4a" stroke-width="2.2" stroke-linecap="round"/>
<ellipse cx="68" cy="452" rx="10" ry="4" fill="none" stroke="#8a6a4a" stroke-width="1.6"/>${bag(68, 452, 18, 14)}`;

  // t1 rope net strung between two bamboo poles
  const t1 = `<line x1="58" y1="474" x2="58" y2="418" stroke="#b49a5a" stroke-width="2.6"/><line x1="96" y1="470" x2="96" y2="414" stroke="#b49a5a" stroke-width="2.6"/>
<g stroke="#8a7a3a" stroke-width="0.8"><line x1="56" y1="430" x2="60" y2="430"/><line x1="56" y1="446" x2="60" y2="446"/><line x1="94" y1="428" x2="98" y2="428"/><line x1="94" y1="444" x2="98" y2="444"/></g>
<path d="M58 422 Q77 430 96 418 L96 458 Q77 472 58 462 Z" fill="url(#mesh)" stroke="#d7b882" stroke-width="1.2"/>
<path d="M58 422 Q77 430 96 418" fill="none" stroke="#d7b882" stroke-width="2"/>`;

  // t2 drift net: an arc of floats on the water with the net hanging beneath
  const arc: [number, number][] = [[96, 458], [82, 466], [66, 471], [50, 473], [34, 470], [20, 464]];
  const t2 = `<path d="M100 438 Q100 452 96 458" fill="none" stroke="#d7b882" stroke-width="1.4"/>
<path d="M96 458 Q58 480 20 464 L24 490 Q58 504 92 484 Z" fill="url(#mesh)" opacity="0.55"/>
<path d="M96 458 Q58 480 20 464" fill="none" stroke="#d7b882" stroke-width="1.4"/>${floats(arc)}`;

  // t3 wooden crane with a net bag on a pulley
  const t3 = `<rect x="110" y="380" width="5" height="52" fill="#7a5640"/><line x1="112" y1="384" x2="48" y2="396" stroke="#7a5640" stroke-width="4" stroke-linecap="round"/>
<line x1="112" y1="408" x2="80" y2="390" stroke="#5d4030" stroke-width="2"/><circle cx="50" cy="397" r="3.5" fill="#3d291f" stroke="#c9a978" stroke-width="1"/>
<line x1="50" y1="400" x2="50" y2="428" stroke="#d7b882" stroke-width="1.2"/>${bag(50, 428, 30, 34)}
<path d="M36 456 Q50 452 64 456" fill="none" stroke="#e8e0ff" stroke-opacity="0.35" stroke-width="1.5"/>`;

  // t4 iron crane, iron-framed cage net, lantern on the boom
  const t4 = `<rect x="108" y="372" width="6" height="60" fill="#5d6270" stroke="#3a3f4a" stroke-width="0.8"/>
<line x1="111" y1="376" x2="40" y2="388" stroke="#6c7482" stroke-width="4.5" stroke-linecap="round"/>
<g stroke="#3a3f4a" stroke-width="1"><line x1="111" y1="404" x2="70" y2="381"/><line x1="90" y1="380" x2="96" y2="392"/><line x1="70" y1="383" x2="76" y2="394"/></g>
<g fill="#a8b0bd"><circle cx="111" cy="390" r="1.2"/><circle cx="111" cy="410" r="1.2"/><circle cx="80" cy="381" r="1"/></g>
<circle cx="42" cy="389" r="3.5" fill="#2b2433" stroke="#a8b0bd" stroke-width="1"/>
<line x1="42" y1="392" x2="42" y2="418" stroke="#a8b0bd" stroke-width="1.2"/>
<rect x="24" y="418" width="36" height="36" rx="2" fill="url(#mesh)" stroke="#8a929f" stroke-width="2"/>
<g stroke="#8a929f" stroke-width="1"><line x1="24" y1="436" x2="60" y2="436"/><line x1="42" y1="418" x2="42" y2="454"/></g>
${lantern(74, 384)}`;

  // t5 lantern-lit fishing rig: twin booms, lights along the line, glowing floats
  const lights = [[100, 376], [84, 378], [68, 380], [52, 382], [36, 384]].map(([x, y]) => `<circle cx="${x}" cy="${y + 3}" r="2" fill="var(--lamp)"/><circle cx="${x}" cy="${y + 3}" r="6" fill="url(#glow)" opacity="0.7"/>`).join('');
  const t5 = `<ellipse cx="50" cy="470" rx="62" ry="14" fill="url(#pool)"/>
<rect x="106" y="362" width="7" height="70" fill="#5d6270" stroke="#d9b25a" stroke-width="0.8"/>
<line x1="110" y1="366" x2="22" y2="380" stroke="#6c7482" stroke-width="5" stroke-linecap="round"/>
<line x1="110" y1="398" x2="34" y2="410" stroke="#6c7482" stroke-width="3" stroke-linecap="round"/>
<g stroke="#d9b25a" stroke-width="1"><line x1="110" y1="366" x2="22" y2="380"/></g>
<path d="M110 368 Q66 384 24 380" fill="none" stroke="#3a3044" stroke-width="0.6"/>${lights}
<line x1="24" y1="382" x2="24" y2="412" stroke="#a8b0bd" stroke-width="1.2"/><line x1="64" y1="388" x2="64" y2="414" stroke="#a8b0bd" stroke-width="1.2"/>
<path d="M14 412 L74 412 Q70 452 44 462 Q18 452 14 412 Z" fill="url(#mesh)" stroke="#d9b25a" stroke-width="1.6"/>
${floats([[96, 462], [78, 470], [58, 474], [38, 472], [18, 466]], true)}
${lantern(110, 352)}`;

  return [t0, t1, t2, t3, t4, t5].map((g, i) => `<g class="net net-t${i}">${g}</g>`).join('\n');
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
    <stop offset="0.85" stop-color="var(--sky-low)"/>
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
  <linearGradient id="cloudCool" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1c1f3e" stop-opacity="0.9"/>
    <stop offset="1" stop-color="#4a5078" stop-opacity="0.7"/>
  </linearGradient>
  <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#e8f0ff" stop-opacity="0.5"/>
    <stop offset="1" stop-color="#e8f0ff" stop-opacity="0"/>
  </radialGradient>
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
<g class="stars" fill="#f3ecff">${stars}</g>
<g class="moon"><circle cx="78" cy="178" r="44" fill="url(#moonGlow)"/><circle cx="78" cy="178" r="14" fill="#efe9da"/><circle cx="73" cy="174" r="2.6" fill="#d9d1bf"/><circle cx="83" cy="182" r="3.4" fill="#d9d1bf"/><circle cx="81" cy="170" r="1.6" fill="#d9d1bf"/></g>
<g class="sun"><circle cx="270" cy="${HORIZON_Y}" r="90" fill="url(#sunGlow)"/><path d="M245 ${HORIZON_Y} A25 25 0 0 1 295 ${HORIZON_Y} Z" fill="#f7a86f"/></g>
<g class="clouds">
  ${['', '-warm'].map((k) => `<g class="cloudset${k}">
  <g class="cloud c1"><ellipse cx="70" cy="215" rx="70" ry="9" fill="url(#${k ? 'cloud' : 'cloudCool'})"/><ellipse cx="100" cy="207" rx="38" ry="8" fill="url(#${k ? 'cloud' : 'cloudCool'})"/></g>
  <g class="cloud c2"><ellipse cx="300" cy="255" rx="80" ry="7" fill="url(#${k ? 'cloud' : 'cloudCool'})" opacity="0.8"/><ellipse cx="270" cy="249" rx="34" ry="6" fill="url(#${k ? 'cloud' : 'cloudCool'})" opacity="0.8"/></g>
  <g class="cloud c3"><ellipse cx="150" cy="292" rx="110" ry="4" fill="url(#${k ? 'cloud' : 'cloudCool'})" opacity="0.6"/></g>
  </g>`).join('')}
</g>
<!-- far islands -->
<path d="M8 ${HORIZON_Y} Q22 ${HORIZON_Y - 9} 40 ${HORIZON_Y - 6} Q58 ${HORIZON_Y - 12} 78 ${HORIZON_Y} Z" fill="#2c2446" opacity="0.85"/>
<path d="M318 ${HORIZON_Y} Q328 ${HORIZON_Y - 4} 342 ${HORIZON_Y} Z" fill="#2c2446" opacity="0.7"/>

<!-- sea -->
<rect y="${HORIZON_Y}" width="360" height="${640 - HORIZON_Y}" fill="#070a1a"/>
${sea()}
<rect y="${HORIZON_Y}" width="360" height="${640 - HORIZON_Y}" fill="var(--sea-tint)" style="opacity:var(--sea-tint-op)"/>
<rect class="haze" y="${HORIZON_Y}" width="360" height="40" fill="url(#haze)"/>
<g class="sun-glints">${sunReflection(270, '#f6b27a')}</g>
<g class="moon-glints">${sunReflection(78, '#dfe6ff')}</g>

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

/** Chest looks: a different container at each tier. */
export const CHEST_TIERS = 6;
const CHEST_AT = [1, 2, 4, 6, 8, 10];
export function chestTier(level: number): number {
  let t = 0;
  for (let i = 0; i < CHEST_AT.length; i++) if (level >= CHEST_AT[i]) t = i;
  return t;
}

/** Bits of catch poking out of the top; rises as the chest fills. */
function peek(fill: number, top: number): string {
  if (fill <= 0.2) return '';
  const dy = top - 10 + (1 - Math.min(1, fill)) * 10;
  return `<g transform="translate(0 ${dy.toFixed(1)})"><rect x="14" y="4" width="16" height="6" rx="2" fill="#9a6a45" transform="rotate(-12 22 7)"/><rect x="33" y="1" width="7" height="11" rx="2" fill="#7fc4c0"/><circle cx="46" cy="7" r="4" fill="none" stroke="#d7b882" stroke-width="2"/>${fill > 0.6 ? '<circle cx="26" cy="2" r="3" fill="#a8b0bd" stroke="#6c7482" stroke-width="0.8"/>' : ''}</g>`;
}

const CHESTS: ((fill: number) => string)[] = [
  // 0: battered open crate, one slat broken
  (f) => `${peek(f, 22)}<g stroke="#3d291f" stroke-width="1.1">
<rect x="8" y="22" width="48" height="8" fill="#8a6a4a"/><rect x="8" y="31" width="48" height="8" fill="#7a5a3e"/>
<path d="M8 40 H30 L36 48 H8 Z" fill="#8a6a4a"/><path d="M40 40 H56 V48 H44 Z" fill="#7a5a3e"/>
<rect x="8" y="20" width="4" height="30" fill="#6a4a32"/><rect x="52" y="20" width="4" height="30" fill="#6a4a32"/></g>`,
  // 1: barrel
  (f) => `${peek(f, 14)}<path d="M14 14 Q10 32 14 50 H50 Q54 32 50 14 Z" fill="#94603c" stroke="#3d291f" stroke-width="1.2"/>
<ellipse cx="32" cy="14" rx="18" ry="3.5" fill="#5a3a26" stroke="#3d291f" stroke-width="1"/>
<g stroke="#3d291f" stroke-opacity="0.45" stroke-width="1"><path d="M22 15 Q20 32 22 50"/><path d="M32 17 V50"/><path d="M42 15 Q44 32 42 50"/></g>
<g fill="none" stroke="#5d6270" stroke-width="2.4"><path d="M12.5 22 Q32 26 51.5 22"/><path d="M12.5 42 Q32 46 51.5 42"/></g>`,
  // 2: lidded crate with rope handles
  (f) => `${peek(f, 18)}<rect x="7" y="20" width="50" height="28" rx="2" fill="#8a5a3a" stroke="#3d291f" stroke-width="1.2"/>
<path d="M5 ${f >= 1 ? 12 : 16} L59 ${f >= 1 ? 8 : 16} L59 21 L5 21 Z" fill="#9a6a45" stroke="#3d291f" stroke-width="1.2"/>
<g stroke="#3d291f" stroke-opacity="0.4"><line x1="7" y1="30" x2="57" y2="30"/><line x1="7" y1="39" x2="57" y2="39"/></g>
<g fill="none" stroke="#d7b882" stroke-width="2"><path d="M3 28 Q0 33 3 38"/><path d="M61 28 Q64 33 61 38"/></g>`,
  // 3: domed sea chest with iron bands
  (f) => `${peek(f, 16)}<path d="M6 18 Q32 ${f >= 1 ? 0 : 4} 58 18 L58 22 L6 22 Z" fill="#7a4e34" stroke="#2b1d14" stroke-width="1.2"/>
<rect x="6" y="20" width="52" height="28" rx="2.5" fill="#7a4e34" stroke="#2b1d14" stroke-width="1.2"/>
<g fill="#5d6270" stroke="#3a3f4a" stroke-width="0.6"><rect x="14" y="8" width="4" height="40"/><rect x="46" y="8" width="4" height="40"/><rect x="6" y="20" width="52" height="3"/></g>
<g fill="#a8b0bd"><circle cx="16" cy="28" r="1"/><circle cx="16" cy="40" r="1"/><circle cx="48" cy="28" r="1"/><circle cx="48" cy="40" r="1"/></g>`,
  // 4: captain's chest: dark wood, brass corners and lock
  (f) => `${peek(f, 16)}<path d="M5 18 Q32 ${f >= 1 ? -1 : 3} 59 18 L59 22 L5 22 Z" fill="#4a2e20" stroke="#1d120c" stroke-width="1.2"/>
<rect x="5" y="20" width="54" height="29" rx="2.5" fill="#4a2e20" stroke="#1d120c" stroke-width="1.2"/>
<g fill="none" stroke="#d9b25a" stroke-width="2"><path d="M5 26 V20 H11"/><path d="M59 26 V20 H53"/><path d="M5 43 V49 H11"/><path d="M59 43 V49 H53"/><path d="M5 20 H59"/></g>
<rect x="28" y="22" width="8" height="10" rx="1.5" fill="#d9b25a" stroke="#8a6a2a" stroke-width="1"/><circle cx="32" cy="27" r="1.2" fill="#3d291f"/>`,
  // 5: lantern chest: captain's chest crowned with a little lamp, glowing seams
  (f) => `<circle cx="32" cy="24" r="30" fill="url(#chestGlow)"/>${CHESTS[4](f)}
<g stroke="var(--lamp)" stroke-opacity="0.8" stroke-width="0.8"><line x1="8" y1="34" x2="56" y2="34"/></g>
<line x1="32" y1="2" x2="32" y2="6" stroke="#3a3044" stroke-width="1"/><rect x="28.5" y="5" width="7" height="9" rx="1.5" fill="var(--lamp)" stroke="#8a6a2a" stroke-width="1"/>`,
];

/** The storage chest. fill is 0..1; a different container per tier. */
export function chestSvg(fill: number, tier: number): string {
  const draw = CHESTS[Math.max(0, Math.min(CHEST_TIERS - 1, tier))];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 64 56" aria-hidden="true"><defs><radialGradient id="chestGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>${draw(fill)}</svg>`;
}
