/**
 * The lighthouse at each light level (1..10). It starts as a cracked, dim
 * ruin and is mended step by step; every level adds something you can see,
 * and the lamp and beam grow brighter and longer.
 */
const LX = 180;
const LY = 259;

interface Look {
  body: [string, string]; // gradient light/dark side
  stripe: string;
  stripeOpacity: number;
  lamp: string;
  lampGlow: number; // glow radius
  beamTo: number; // beam end x
  beamOpacity: number;
  roof: string;
}

const LOOKS: Look[] = [
  { body: ['#9a909a', '#4f4858'], stripe: '#6e4a4a', stripeOpacity: 0.5, lamp: '#9a8a5a', lampGlow: 14, beamTo: 250, beamOpacity: 0.25, roof: '#2c2636' },
  { body: ['#aaa0a6', '#5a5262'], stripe: '#7a4c4c', stripeOpacity: 0.55, lamp: '#c8b070', lampGlow: 20, beamTo: 290, beamOpacity: 0.4, roof: '#2c2636' },
  { body: ['#e6dbd0', '#7d708a'], stripe: '#8a5a5a', stripeOpacity: 0.7, lamp: '#ffd98a', lampGlow: 28, beamTo: 330, beamOpacity: 0.6, roof: '#3a3044' },
  { body: ['#ece2d8', '#7d708a'], stripe: '#b84a4a', stripeOpacity: 0.95, lamp: '#ffd98a', lampGlow: 30, beamTo: 360, beamOpacity: 0.7, roof: '#3a3044' },
  { body: ['#ece2d8', '#7d708a'], stripe: '#b84a4a', stripeOpacity: 0.95, lamp: '#ffe2a0', lampGlow: 34, beamTo: 390, beamOpacity: 0.8, roof: '#3a3044' },
  { body: ['#f0e6dc', '#80738c'], stripe: '#b84a4a', stripeOpacity: 1, lamp: '#ffe2a0', lampGlow: 36, beamTo: 410, beamOpacity: 0.85, roof: '#3a3044' },
  { body: ['#f0e6dc', '#80738c'], stripe: '#b84a4a', stripeOpacity: 1, lamp: '#eaffc0', lampGlow: 40, beamTo: 430, beamOpacity: 0.9, roof: '#3a3044' },
  { body: ['#f2e8de', '#82758e'], stripe: '#b84a4a', stripeOpacity: 1, lamp: '#eaffc0', lampGlow: 42, beamTo: 445, beamOpacity: 0.95, roof: '#3a3044' },
  { body: ['#f4eae0', '#84778f'], stripe: '#b84a4a', stripeOpacity: 1, lamp: '#fff0b8', lampGlow: 46, beamTo: 460, beamOpacity: 1, roof: '#d9a640' },
  { body: ['#f6ece2', '#867990'], stripe: '#c04848', stripeOpacity: 1, lamp: '#fff6d0', lampGlow: 54, beamTo: 480, beamOpacity: 1, roof: '#e8b84a' },
];

export function towerSvg(level: number): string {
  const L = Math.max(1, Math.min(LOOKS.length, level));
  const k = LOOKS[L - 1];
  const id = `tw${L}`;
  let s = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${k.body[0]}"/><stop offset="0.55" stop-color="${k.body[0]}" stop-opacity="0.85"/><stop offset="1" stop-color="${k.body[1]}"/></linearGradient></defs>`;
  // Tower body and stripes.
  s += `<path d="M162 432 L169 272 L191 272 L198 432 Z" fill="url(#${id})"/>`;
  s += `<path d="M165.6 366 L194.4 366 L195.2 384 L164.8 384 Z M167.7 312 L192.3 312 L192.9 328 L167.1 328 Z" fill="${k.stripe}" opacity="${k.stripeOpacity}"/>`;
  if (L === 1) {
    // Cracks, moss and a broken window.
    s += `<g fill="none" stroke="#2b2433" stroke-width="0.9"><path d="M172 290 l3 8 l-2 6 l4 9"/><path d="M190 350 l-4 6 l2 7"/><path d="M168 396 l5 4 l-1 7"/></g>`;
    s += `<path d="M163 432 q4 -10 10 -6 q3 -6 8 0 q4 -5 8 2 q4 -3 8 4 Z" fill="#4a6a4a" opacity="0.8"/>`;
  }
  if (L === 2) {
    // Scaffolding and fresh patches.
    s += `<g fill="#c9b08a" opacity="0.9"><rect x="172" y="294" width="8" height="6"/><rect x="183" y="352" width="7" height="6"/><rect x="169" y="398" width="7" height="6"/></g>`;
    s += `<g stroke="#8a6a4a" stroke-width="1.6"><line x1="156" y1="432" x2="158" y2="300"/><line x1="204" y1="432" x2="202" y2="300"/><line x1="156" y1="340" x2="204" y2="340"/><line x1="157" y1="390" x2="203" y2="390"/><line x1="156" y1="390" x2="204" y2="340"/></g>`;
  }
  // Door and window.
  s += `<rect x="176" y="404" width="8" height="28" rx="4" fill="${L >= 4 ? '#3a2a3a' : '#2b2433'}"/>`;
  if (L >= 6) s += `<path d="M176 408 a4 4 0 0 1 8 0" fill="none" stroke="#d9b25a" stroke-width="1.2"/>`;
  s += `<rect x="177" y="340" width="6" height="9" rx="3" fill="${L === 1 ? '#1d1830' : 'var(--lamp)'}" opacity="${L === 1 ? 1 : 0.65}"/>`;
  // Gallery (railing).
  s += `<rect x="160" y="268" width="40" height="5" rx="1.5" fill="${L >= 6 ? '#b8923a' : '#3a3044'}"/>`;
  const rail = L >= 6 ? '#d9b25a' : '#3a3044';
  s += L === 1
    ? `<g stroke="${rail}" stroke-width="1"><line x1="162" y1="268" x2="162" y2="262"/><line x1="160" y1="262" x2="176" y2="262"/></g>`
    : `<g stroke="${rail}" stroke-width="1"><line x1="162" y1="268" x2="162" y2="262"/><line x1="170" y1="268" x2="170" y2="262"/><line x1="190" y1="268" x2="190" y2="262"/><line x1="198" y1="268" x2="198" y2="262"/><line x1="160" y1="262" x2="200" y2="262"/></g>`;
  // Lamp room.
  if (L >= 10) s += `<circle class="halo" cx="${LX}" cy="${LY}" r="30" fill="none" stroke="#fff0b8" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="3 5"/>`;
  s += `<circle class="lamp" cx="${LX}" cy="${LY}" r="${k.lampGlow}" fill="url(#glow)"/>`;
  s += `<rect x="169" y="248" width="22" height="20" rx="2" fill="${k.lamp}"/>`;
  if (L >= 5) s += `<g fill="#bfe0ff" opacity="0.35"><rect x="170" y="249" width="5" height="18"/><rect x="185" y="249" width="5" height="18"/></g>`;
  if (L === 1) s += `<path d="M184 248 l7 0 l0 9 l-4 -3 Z" fill="#1d1830"/>`;
  s += `<g stroke="${L >= 6 ? '#8a6a2a' : '#3a3044'}" stroke-width="1.5"><line x1="176" y1="248" x2="176" y2="268"/><line x1="184" y1="248" x2="184" y2="268"/></g>`;
  if (L >= 7) s += `<circle cx="${LX}" cy="${LY - 1}" r="4" fill="#ffffff" opacity="0.85"/>`;
  // Roof.
  s += `<path d="M165 249 ${L >= 9 ? 'Q180 228 195 249' : 'L180 234 L195 249'} Z" fill="${k.roof}"/>`;
  s += `<line x1="180" y1="236" x2="180" y2="${L >= 9 ? 222 : 230}" stroke="${L >= 9 ? '#e8b84a' : '#3a3044'}" stroke-width="1.4"/>`;
  s += `<circle cx="180" cy="${L >= 9 ? 221 : 230}" r="${L >= 9 ? 2.6 : 2}" fill="${L >= 9 ? '#ffe08a' : '#3a3044'}"/>`;
  if (L >= 8) {
    // A string of pennants from the spire down to the gallery.
    const pts = [[180, 232], [168, 245], [160, 262]];
    s += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#3a3044" stroke-width="0.6"/>`;
    s += [[176, 236, '#d96b4a'], [171, 241, '#f3ecff'], [166, 247, '#4a90c8'], [163, 253, '#e8b84a']]
      .map(([x, y, c]) => `<path class="flag" d="M${x} ${y} l6 2 l-4 5 Z" fill="${c}"/>`).join('');
  }
  // Beam(s).
  const spread = 30 + (k.beamTo - 250) * 0.15;
  s += `<polygon class="beam" style="opacity:${k.beamOpacity}" points="${LX},${LY} ${k.beamTo},${LY - spread} ${k.beamTo},${LY + spread}" fill="url(#beamGrad)"/>`;
  if (L >= 10) s += `<polygon class="beam beam2" style="opacity:0.7" points="${LX},${LY} ${LX - (k.beamTo - LX)},${LY - spread} ${LX - (k.beamTo - LX)},${LY + spread}" fill="url(#beamGrad)"/>`;
  return s;
}
