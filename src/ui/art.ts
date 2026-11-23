import type { MaterialId } from '../core/data';

/**
 * All game art is drawn here in code so it can be swapped for painted art later.
 * The scene uses a 360x640 portrait canvas; the sea surface is at y≈400.
 */

const STARS: readonly [number, number, number][] = [
  [30, 40, 1.2], [80, 90, 0.8], [130, 30, 1], [210, 70, 0.9], [260, 25, 1.3],
  [320, 60, 0.8], [300, 130, 1], [50, 150, 0.7], [110, 180, 0.9], [240, 160, 0.7],
  [340, 190, 0.9], [20, 230, 0.6],
];

export function sceneSvg(): string {
  const stars = STARS.map(
    ([x, y, r], i) => `<circle class="star" style="animation-delay:${(i % 5) * 1.3}s" cx="${x}" cy="${y}" r="${r}"/>`,
  ).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--sky-top)"/>
    <stop offset="0.55" stop-color="var(--sky-mid)"/>
    <stop offset="1" stop-color="var(--sky-horizon)"/>
  </linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="var(--sea-top)"/>
    <stop offset="1" stop-color="var(--sea)"/>
  </linearGradient>
  <linearGradient id="beamGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.55"/>
    <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="glow">
    <stop offset="0" stop-color="var(--lamp)" stop-opacity="0.9"/>
    <stop offset="1" stop-color="var(--lamp)" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="tower" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#d9cfc4"/>
    <stop offset="1" stop-color="#8f8494"/>
  </linearGradient>
</defs>
<rect width="360" height="400" fill="url(#sky)"/>
<g fill="#f3ecff">${stars}</g>
<ellipse cx="290" cy="400" rx="46" ry="22" fill="#f2a46a" opacity="0.55"/>
<rect y="398" width="360" height="242" fill="url(#sea)"/>
<path class="wave-1" d="M-40 420 Q-20 414 0 420 T40 420 T80 420 T120 420 T160 420 T200 420 T240 420 T280 420 T320 420 T360 420 T400 420" fill="none" stroke="#f2a46a" stroke-opacity="0.25" stroke-width="1.5"/>
<!-- rock and platform -->
<path d="M120 420 Q130 396 160 392 L204 390 Q232 394 244 420 Z" fill="#1a1626"/>
<g fill="#6b4a36">
  <rect x="104" y="404" width="152" height="7" rx="2"/>
  <rect x="112" y="411" width="5" height="16" fill="#4a3226"/>
  <rect x="243" y="411" width="5" height="16" fill="#4a3226"/>
</g>
<g stroke="#4a3226" stroke-width="1"><line x1="130" y1="404" x2="130" y2="411"/><line x1="156" y1="404" x2="156" y2="411"/><line x1="206" y1="404" x2="206" y2="411"/><line x1="230" y1="404" x2="230" y2="411"/></g>
<!-- tower -->
<path d="M160 404 L167 262 L193 262 L200 404 Z" fill="url(#tower)"/>
<path d="M163.5 340 L196.5 340 L197.3 356 L162.7 356 Z M165.4 296 L194.6 296 L195.3 310 L164.7 310 Z" fill="#9a4a4a" opacity="0.85"/>
<rect x="176" y="378" width="8" height="26" rx="4" fill="#2b2433"/>
<rect x="177" y="318" width="6" height="9" rx="3" fill="var(--lamp)" opacity="0.6"/>
<rect x="160" y="258" width="40" height="5" rx="1.5" fill="#3a3044"/>
<!-- lamp room -->
<circle class="lamp" cx="180" cy="245" r="34" fill="url(#glow)"/>
<rect x="169" y="236" width="22" height="22" rx="2" fill="var(--lamp)"/>
<g stroke="#3a3044" stroke-width="1.5"><line x1="176" y1="236" x2="176" y2="258"/><line x1="184" y1="236" x2="184" y2="258"/></g>
<path d="M165 237 L180 222 L195 237 Z" fill="#3a3044"/>
<circle cx="180" cy="220" r="2" fill="#3a3044"/>
<polygon class="beam" points="180,247 420,205 420,289" fill="url(#beamGrad)"/>
<!-- waves in front -->
<path class="wave-2" d="M-40 470 Q-20 462 0 470 T40 470 T80 470 T120 470 T160 470 T200 470 T240 470 T280 470 T320 470 T360 470 T400 470" fill="none" stroke="#8fa3d6" stroke-opacity="0.18" stroke-width="2"/>
<path class="wave-1" d="M-40 540 Q-20 532 0 540 T40 540 T80 540 T120 540 T160 540 T200 540 T240 540 T280 540 T320 540 T360 540 T400 540" fill="none" stroke="#8fa3d6" stroke-opacity="0.14" stroke-width="2"/>
<path class="wave-2" d="M-40 600 Q-20 592 0 600 T40 600 T80 600 T120 600 T160 600 T200 600 T240 600 T280 600 T320 600 T360 600 T400 600" fill="none" stroke="#8fa3d6" stroke-opacity="0.1" stroke-width="2"/>
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
