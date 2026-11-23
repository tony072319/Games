/**
 * The storage chest, drawn for a given level (1..11): a different container
 * or a new visible detail at every level. fill (0..1) shows how full it is:
 * catch pokes out of the top, and the lid lifts when it's full.
 */

/** Bits of catch poking out; rises as the chest fills. */
function peek(fill: number, top: number): string {
  if (fill <= 0.15) return '';
  const dy = top - 11 + (1 - Math.min(1, fill)) * 11;
  return `<g transform="translate(0 ${dy.toFixed(1)})">
<rect x="14" y="4" width="17" height="6" rx="2" fill="#9a6a45" transform="rotate(-12 22 7)"/>
<rect x="33" y="0" width="7" height="12" rx="2" fill="#7fc4c0"/><rect x="34.5" y="-1.5" width="4" height="2" fill="#3f7f99"/>
<circle cx="47" cy="7" r="4.2" fill="none" stroke="#d7b882" stroke-width="2"/>
${fill > 0.55 ? '<circle cx="25" cy="2" r="3.2" fill="#a8b0bd" stroke="#6c7482" stroke-width="0.8"/><path d="M50 2 q4 -4 8 0" fill="none" stroke="#d7b882" stroke-width="1.6"/>' : ''}
${fill >= 1 ? '<path d="M18 -1 Q22 -5 26 -1 Q22 3 18 -1 Z M26 -1 l3 -2 v4 Z" fill="#9fb2d8"/>' : ''}</g>`;
}

const crate = (f: number) => `${peek(f, 22)}<g stroke="#3d291f" stroke-width="1.1">
<rect x="8" y="22" width="48" height="8" fill="#8a6a4a"/><rect x="8" y="31" width="48" height="8" fill="#7a5a3e"/>
<path d="M8 40 H30 L36 48 H8 Z" fill="#8a6a4a"/><path d="M40 40 H56 V48 H44 Z" fill="#7a5a3e"/>
<rect x="8" y="20" width="4" height="30" fill="#6a4a32"/><rect x="52" y="20" width="4" height="30" fill="#6a4a32"/></g>
<g fill="#3d291f"><circle cx="10" cy="26" r="0.8"/><circle cx="54" cy="26" r="0.8"/><circle cx="10" cy="44" r="0.8"/><circle cx="54" cy="44" r="0.8"/></g>`;

const barrel = (f: number, lid: boolean) => `${peek(f, 14)}
<path d="M13 14 Q9 32 13 50 H51 Q55 32 51 14 Z" fill="#94603c" stroke="#3d291f" stroke-width="1.2"/>
<ellipse cx="32" cy="14" rx="19" ry="3.6" fill="#5a3a26" stroke="#3d291f" stroke-width="1"/>
<g stroke="#3d291f" stroke-opacity="0.45" stroke-width="1"><path d="M22 15 Q20 32 22 50"/><path d="M32 17 V50"/><path d="M42 15 Q44 32 42 50"/></g>
<g fill="none" stroke="#5d6270" stroke-width="2.4"><path d="M11.5 22 Q32 26 52.5 22"/><path d="M11.5 42 Q32 46 52.5 42"/></g>
${lid ? `<g transform="rotate(${f >= 1 ? -24 : -8} 52 12)"><ellipse cx="34" cy="12" rx="19" ry="3.4" fill="#7a5640" stroke="#3d291f" stroke-width="1"/></g><path d="M11 32 Q32 37 53 32" fill="none" stroke="#d7b882" stroke-width="1.6"/><path d="M27 30 q5 -3 10 0 q-5 3 -10 0 Z M37 30 l3 -2 v4 Z" fill="#e0c088"/>` : ''}`;

const lidded = (f: number, emblem: boolean) => `${peek(f, 18)}
<rect x="7" y="20" width="50" height="29" rx="2" fill="#8a5a3a" stroke="#3d291f" stroke-width="1.2"/>
<path d="M5 ${f >= 1 ? 11 : 16} L59 ${f >= 1 ? 7 : 16} L59 21 L5 21 Z" fill="#9a6a45" stroke="#3d291f" stroke-width="1.2"/>
<g stroke="#3d291f" stroke-opacity="0.4"><line x1="7" y1="30" x2="57" y2="30"/><line x1="7" y1="40" x2="57" y2="40"/></g>
<g fill="none" stroke="#d7b882" stroke-width="2.2"><path d="M3 27 Q-0.5 33 3 39"/><path d="M61 27 Q64.5 33 61 39"/></g>
${emblem ? `<path d="M22 35 q10 -7 20 0 q-10 7 -20 0 Z M42 35 l5 -4 v8 Z" fill="none" stroke="#f3ecff" stroke-opacity="0.75" stroke-width="1.4"/><circle cx="27" cy="34" r="0.9" fill="#f3ecff"/><rect x="29" y="19" width="6" height="6" rx="1" fill="#5d6270"/>` : ''}`;

const seaChest = (f: number, rivets: boolean) => `${peek(f, 16)}
<path d="M6 18 Q32 ${f >= 1 ? 0 : 4} 58 18 L58 22 L6 22 Z" fill="#7a4e34" stroke="#2b1d14" stroke-width="1.2"/>
<rect x="6" y="20" width="52" height="29" rx="2.5" fill="#7a4e34" stroke="#2b1d14" stroke-width="1.2"/>
<g fill="#5d6270" stroke="#3a3f4a" stroke-width="0.6"><rect x="14" y="8" width="4.5" height="41"/><rect x="45.5" y="8" width="4.5" height="41"/><rect x="6" y="20" width="52" height="3"/></g>
${rivets ? `<g fill="#c8d0dc"><circle cx="16.2" cy="27" r="1.1"/><circle cx="16.2" cy="35" r="1.1"/><circle cx="16.2" cy="43" r="1.1"/><circle cx="47.8" cy="27" r="1.1"/><circle cx="47.8" cy="35" r="1.1"/><circle cx="47.8" cy="43" r="1.1"/></g>
<g fill="none" stroke="#c8d0dc" stroke-width="1.5" stroke-linecap="round"><line x1="32" y1="27" x2="32" y2="42"/><line x1="28" y1="30" x2="36" y2="30"/><path d="M26 38 Q32 45 38 38"/></g><circle cx="32" cy="26" r="1.6" fill="none" stroke="#c8d0dc" stroke-width="1.2"/>` : ''}`;

const captain = (f: number, gem: boolean) => `${peek(f, 16)}
<path d="M5 18 Q32 ${f >= 1 ? -1 : 3} 59 18 L59 22 L5 22 Z" fill="#4a2e20" stroke="#1d120c" stroke-width="1.2"/>
<rect x="5" y="20" width="54" height="29" rx="2.5" fill="#4a2e20" stroke="#1d120c" stroke-width="1.2"/>
${gem ? '<rect x="5" y="20" width="54" height="4" fill="#8a2438"/><rect x="5" y="45" width="54" height="2.5" fill="#8a2438"/>' : ''}
<g fill="none" stroke="#d9b25a" stroke-width="2.2"><path d="M5 27 V20 H12"/><path d="M59 27 V20 H52"/><path d="M5 42 V49 H12"/><path d="M59 42 V49 H52"/><path d="M5 20 H59"/></g>
<rect x="27.5" y="22" width="9" height="11" rx="1.6" fill="#d9b25a" stroke="#8a6a2a" stroke-width="1"/>
${gem ? '<path d="M32 24 L35 27.5 L32 31 L29 27.5 Z" fill="#5ab4f0" stroke="#e8f6ff" stroke-width="0.5"/>' : '<circle cx="32" cy="27.5" r="1.3" fill="#3d291f"/>'}`;

const lanternChest = (f: number, gilded: boolean) => `<circle cx="32" cy="22" r="${gilded ? 36 : 30}" fill="url(#chestGlow)"/>${captain(f, true)}
<g stroke="var(--lamp)" stroke-opacity="0.85" stroke-width="0.9"><line x1="8" y1="35" x2="56" y2="35"/></g>
<line x1="32" y1="0" x2="32" y2="5" stroke="#3a3044" stroke-width="1"/>
<path d="M28 5 h8 l1 2 v6 l-1 2 h-8 l-1 -2 v-6 Z" fill="var(--lamp)" stroke="#8a6a2a" stroke-width="1"/>
${gilded ? `<g fill="none" stroke="#ffd25a" stroke-width="0.9"><path d="M10 38 q6 -6 12 0 q-6 6 -12 0"/><path d="M42 38 q6 -6 12 0 q-6 6 -12 0"/></g>
<g fill="#fff4c8"><path class="twinkle" d="M54 6 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 Z"/><path class="twinkle" style="animation-delay:.8s" d="M8 10 l0.8 2.2 l2.2 0.8 l-2.2 0.8 l-0.8 2.2 l-0.8 -2.2 l-2.2 -0.8 l2.2 -0.8 Z"/></g>` : ''}`;

const LOOKS: ((fill: number) => string)[] = [
  crate, // 1
  (f) => barrel(f, false), // 2
  (f) => barrel(f, true), // 3: lid, rope band, painted fish
  (f) => lidded(f, false), // 4
  (f) => lidded(f, true), // 5: stencilled fish and latch
  (f) => seaChest(f, false), // 6
  (f) => seaChest(f, true), // 7: rivets and anchor
  (f) => captain(f, false), // 8
  (f) => captain(f, true), // 9: velvet trim, gem lock
  (f) => lanternChest(f, false), // 10
  (f) => lanternChest(f, true), // 11: gold filigree, sparkles
];

export function chestSvg(fill: number, level: number): string {
  const draw = LOOKS[Math.max(1, Math.min(LOOKS.length, level)) - 1];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -14 72 66" aria-hidden="true"><defs><radialGradient id="chestGlow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>${draw(fill)}</svg>`;
}
