/**
 * The scene is painted in three layers that share a 360x640 canvas
 * (preserveAspectRatio="xMidYMid slice"):
 *   back  — sky, sun, moon, clouds, far islands (SVG)
 *   sea   — the water, painted every frame (canvas, see sea.ts)
 *   front — island, platform, lighthouse, net (SVG, transparent elsewhere)
 * Far-off events (a ship on the horizon) go between sea and front, so the
 * lighthouse passes in front of them.
 */

export const HORIZON_Y = 330;
/** Where the lamp sits; the beam rotates around this point. */
export const LAMP = { x: 180, y: 259 };
/** Storage chest anchor on the platform (scene coordinates). */
export const CHEST_POS = { x: 236, y: 432 };
/** Band of sea in front of the island where flotsam drifts. */
export const SEA_BAND = { top: 482, bottom: 606 };

const STARS: readonly [number, number, number][] = [
  [30, 40, 1.2], [80, 90, 0.8], [130, 30, 1], [210, 70, 0.9], [260, 25, 1.3],
  [320, 60, 0.8], [300, 130, 1], [50, 150, 0.7], [110, 175, 0.9], [345, 20, 0.7],
  [175, 120, 0.6], [20, 210, 0.6],
];


const DEFS = `
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
`;

const open = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;

export function sceneBackSvg(): string {
  const stars = STARS.map(
    ([x, y, r], i) => `<circle class="star" style="animation-delay:${(i % 5) * 1.3}s" cx="${x}" cy="${y}" r="${r}"/>`,
  ).join('');
  return `${open}<defs>${DEFS}</defs>
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

</svg>`;
}

export function sceneFrontSvg(): string {
  return `${open}<defs>${DEFS}</defs>
<rect class="haze" y="${HORIZON_Y}" width="360" height="36" fill="url(#haze)"/>
<!-- island, light pool, platform -->
<ellipse cx="180" cy="458" rx="120" ry="22" fill="url(#pool)"/>
<path d="M108 452 Q120 424 150 418 L176 412 Q214 410 236 422 Q256 432 262 452 Z" fill="url(#rock)"/>
<path class="foam" d="M100 452 Q140 446 180 452 T262 452" fill="none" stroke="#e8e0ff" stroke-opacity="0.35" stroke-width="2" stroke-linecap="round"/>
<g class="dock-slot"></g>
<g class="net-slot"></g>
<g>
  <rect x="98" y="432" width="166" height="8" rx="2" fill="#7a5640"/>
  <rect x="98" y="438" width="166" height="2" fill="#4a3226"/>
  <g stroke="#4a3226" stroke-width="1"><line x1="122" y1="432" x2="122" y2="440"/><line x1="148" y1="432" x2="148" y2="440"/><line x1="212" y1="432" x2="212" y2="440"/><line x1="240" y1="432" x2="240" y2="440"/></g>
  <rect x="106" y="440" width="5" height="18" fill="#3d291f"/>
  <rect x="252" y="440" width="5" height="18" fill="#3d291f"/>
</g>

<g class="tower-slot"></g>
</svg>`;
}
