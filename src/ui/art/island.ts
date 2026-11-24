import type { BuildingId, DestId, SeaId } from '../../core/data';

/**
 * Island scenes (viewBox 0 0 360 240) and the buildings that go on them.
 * Buildings are drawn around (0,0) = the middle of their footprint on the
 * ground, reaching up to about y = -80. Every level adds something visible.
 */

export const PLOTS: Record<DestId, [number, number][]> = {
  wreck: [[78, 196], [184, 182], [292, 200]],
  gullrock: [[72, 204], [178, 150], [290, 196]],
  oldlight: [[84, 198], [196, 188], [296, 204]],
  firefly: [[76, 200], [184, 186], [290, 202]],
};

const SKY = `<defs>
<linearGradient id="isky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#15143a"/><stop offset="0.7" stop-color="#3d2e5e"/><stop offset="1" stop-color="#8a5478"/></linearGradient>
<linearGradient id="isea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2a52"/><stop offset="1" stop-color="#0a0c20"/></linearGradient>
<radialGradient id="iglow"><stop offset="0" stop-color="#ffd98a" stop-opacity="0.85"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
<radialGradient id="fglow"><stop offset="0" stop-color="#eaffb0" stop-opacity="0.9"/><stop offset="1" stop-color="#eaffb0" stop-opacity="0"/></radialGradient>
<pattern id="imesh" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0 L0 4 M0 0 L4 0" stroke="#c9a978" stroke-width="0.6"/></pattern>
</defs>
<rect width="360" height="240" fill="url(#isky)"/>
<g fill="#f3ecff" opacity="0.7"><circle cx="30" cy="24" r="1"/><circle cx="120" cy="14" r="0.8"/><circle cx="250" cy="30" r="1.1"/><circle cx="330" cy="12" r="0.8"/><circle cx="190" cy="44" r="0.7"/></g>
<rect y="150" width="360" height="90" fill="url(#isea)"/>
<g stroke="#c9b8ff" stroke-opacity="0.15"><path d="M0 160 q20 -3 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none"/><path d="M0 230 q30 -5 60 0 t60 0 t60 0 t60 0 t60 0 t60 0" fill="none"/></g>`;

const LAND: Record<DestId, string> = {
  wreck: `<path d="M10 214 Q40 176 110 182 Q150 170 200 172 Q260 176 300 186 Q340 196 352 216 Z" fill="#2c2440"/>
<path d="M200 172 Q240 168 270 176 L262 150 L240 158 Z" fill="#3a3150"/>
<g transform="translate(250 150) rotate(-14)"><path d="M-40 10 L40 10 L30 28 L-30 28 Z" fill="#5a3a26" stroke="#2b1d14"/><line x1="-6" y1="10" x2="-14" y2="-40" stroke="#4a3020" stroke-width="3"/><path d="M-14 -36 L4 -24 L-12 -20 Z" fill="#8a8070" opacity="0.7"/><g stroke="#2b1d14"><line x1="-20" y1="12" x2="-22" y2="26"/><line x1="0" y1="12" x2="0" y2="27"/><line x1="20" y1="12" x2="21" y2="26"/></g></g>
<g fill="#a8b0bd" opacity="0.6"><circle cx="140" cy="190" r="2"/><circle cx="322" cy="208" r="2.4"/></g>`,
  gullrock: `<path d="M6 220 Q30 190 80 196 L120 186 L140 120 L160 90 L184 70 L206 96 L222 140 L240 186 Q300 182 354 218 Z" fill="#3a3456"/>
<path d="M160 90 L184 70 L190 100 Z M206 96 L222 140 L210 130 Z" fill="#f3ecff" opacity="0.4"/>
<g fill="none" stroke="#f3ecff" stroke-width="1.4" stroke-linecap="round"><path class="iwing" d="M120 60 q4 -4 8 0 q4 -4 8 0"/><path class="iwing" d="M236 48 q4 -4 8 0 q4 -4 8 0"/><path class="iwing" d="M60 90 q3 -3 6 0 q3 -3 6 0"/></g>
<path d="M150 150 L218 150 L214 156 L154 156 Z" fill="#4a4266"/>`,
  oldlight: `<path d="M8 218 Q40 186 120 188 Q200 180 280 190 Q336 198 352 220 Z" fill="#2c3a34"/>
<path d="M30 200 Q90 184 160 186 Q240 180 330 200" fill="none" stroke="#4a6a4a" stroke-width="5" stroke-linecap="round"/>
<g transform="translate(332 0)" opacity="0.9"><path d="M-14 192 L-10 92 L8 92 L12 192 Z" fill="#8a808a"/><rect x="-12" y="120" width="22" height="8" fill="#6e4a4a"/><path d="M-12 92 L-1 76 L10 92 Z" fill="#2c2636"/><path d="M4 92 l6 -8 l2 8 Z" fill="#15143a"/><path d="M-6 150 l4 6 l-2 6" stroke="#2b2433" fill="none"/></g>`,
  firefly: `<path d="M6 220 Q36 184 110 186 Q190 176 270 186 Q336 194 354 220 Z" fill="#1f3a30"/>
<g fill="#2e5a40"><path d="M20 196 Q16 160 30 146 Q44 160 40 196 Z"/><path d="M330 200 Q326 150 342 136 Q358 152 352 200 Z"/><path d="M236 186 Q234 150 246 138 Q260 152 256 186 Z"/><path d="M128 188 Q124 156 138 144 Q150 158 146 188 Z"/></g>
<g class="fireflies"><circle cx="40" cy="140" r="6" fill="url(#fglow)"/><circle cx="150" cy="130" r="5" fill="url(#fglow)"/><circle cx="250" cy="120" r="6" fill="url(#fglow)"/><circle cx="320" cy="150" r="5" fill="url(#fglow)"/><circle cx="210" cy="160" r="4" fill="url(#fglow)"/><circle cx="100" cy="170" r="4" fill="url(#fglow)"/></g>`,
};

/** Each sea's weather over its islands. */
const WEATHER: Record<SeaId, string> = {
  dusk: '',
  fog: `<g fill="#d0d0e0"><ellipse class="fogbank" cx="80" cy="180" rx="140" ry="16" opacity="0.22"/><ellipse class="fogbank f2" cx="280" cy="150" rx="150" ry="14" opacity="0.18"/><ellipse class="fogbank f3" cx="180" cy="220" rx="200" ry="12" opacity="0.2"/></g><rect width="360" height="240" fill="#8a8aa0" opacity="0.12"/>`,
  aurora: `<defs><linearGradient id="iaur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7affc0" stop-opacity="0"/><stop offset="0.5" stop-color="#7affc0" stop-opacity="0.4"/><stop offset="1" stop-color="#b48aff" stop-opacity="0"/></linearGradient></defs>
<path class="aur a1" d="M-20 20 Q80 -10 170 30 T380 20 L380 90 Q280 60 180 90 T-20 80 Z" fill="url(#iaur)"/>
<rect width="360" height="240" fill="#4ab0c8" opacity="0.08"/>
<g fill="#eef8ff"><circle class="snow" cx="40" cy="40" r="1.2"/><circle class="snow" cx="120" cy="70" r="1"/><circle class="snow" cx="210" cy="30" r="1.3"/><circle class="snow" cx="300" cy="80" r="1"/><circle class="snow" cx="170" cy="110" r="1.1"/></g>
<g fill="#dceef6" opacity="0.9"><path d="M14 226 L40 222 L44 230 L16 232 Z"/><path d="M320 230 L348 226 L352 234 L322 236 Z"/></g>`,
};

export function islandSceneSvg(d: DestId, sea: SeaId = 'dusk'): string {
  return `${SKY}${LAND[d]}${WEATHER[sea]}`;
}

const lamp = (x: number, y: number) =>
  `<circle cx="${x}" cy="${y}" r="9" fill="url(#iglow)" class="lamp"/><rect x="${x - 2.5}" y="${y - 3}" width="5" height="6" rx="1" fill="#ffd98a" stroke="#3a3044" stroke-width="0.6"/>`;
const flag = (x: number, y: number, c: string) =>
  `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 16}" stroke="#3a3044" stroke-width="1"/><path class="flag" d="M${x} ${y - 16} l11 3 l-11 4 Z" fill="${c}"/>`;
const crate = (x: number, y: number, c = '#8a6a4a') =>
  `<rect x="${x}" y="${y - 9}" width="10" height="9" fill="${c}" stroke="#3d291f" stroke-width="0.8"/><path d="M${x} ${y - 9} l10 9 M${x + 10} ${y - 9} l-10 9" stroke="#3d291f" stroke-width="0.5"/>`;
const smoke = (x: number, y: number) =>
  `<g class="smoke" fill="#c8c0d8" opacity="0.5"><circle cx="${x}" cy="${y}" r="3"/><circle cx="${x + 3}" cy="${y - 7}" r="4"/><circle cx="${x + 1}" cy="${y - 15}" r="5"/></g>`;
const ground = (w: number) => `<ellipse cx="0" cy="1" rx="${w}" ry="4" fill="#000" opacity="0.25"/>`;

type Draw = (L: number) => string;

const DRAW: Record<BuildingId, Draw> = {
  dismantler: (L) => `${ground(30)}
<rect x="-24" y="-18" width="48" height="5" fill="#7a5640"/><rect x="-21" y="-13" width="4" height="13" fill="#5d4030"/><rect x="17" y="-13" width="4" height="13" fill="#5d4030"/>
<path d="M-10 -18 l14 -6 l6 4 l-14 6 Z" fill="#a8b0bd" stroke="#6c7482" stroke-width="0.6"/>
${L >= 2 ? '<g fill="#a8b0bd" stroke="#6c7482" stroke-width="0.6"><path d="M28 0 l8 -10 l6 4 l4 6 Z"/><circle cx="38" cy="-12" r="3"/></g>' : ''}
${L >= 3 ? '<line x1="-24" y1="-18" x2="-24" y2="-58" stroke="#5d4030" stroke-width="3"/><line x1="-24" y1="-56" x2="6" y2="-50" stroke="#5d4030" stroke-width="2.4"/><line x1="4" y1="-50" x2="4" y2="-30" stroke="#d7b882"/><path d="M0 -30 h8 l-1 6 h-6 Z" fill="#6c7482"/>' : ''}
${L >= 4 ? lamp(-24, -62) : ''}
${L >= 5 ? '<g class="sparks" fill="#ffd25a"><circle cx="2" cy="-26" r="1"/><circle cx="8" cy="-30" r="0.8"/><circle cx="-4" cy="-28" r="0.8"/></g><rect x="-34" y="-4" width="10" height="4" fill="#d9b25a"/>' + crate(24, -18, '#94603c') : ''}`,
  rack: (L) => `${ground(30)}
<line x1="-22" y1="0" x2="-22" y2="-46" stroke="#b49a5a" stroke-width="3"/><line x1="22" y1="0" x2="22" y2="-46" stroke="#b49a5a" stroke-width="3"/><line x1="-24" y1="-44" x2="24" y2="-44" stroke="#8a7a3a" stroke-width="2"/>
<path d="M-20 -44 Q0 ${-44 + 10 + L * 4} 20 -44 L20 -${30 - L * 3} Q0 ${-16 + L * 3} -20 -${30 - L * 3} Z" fill="url(#imesh)" stroke="#d7b882"/>
${L >= 3 ? '<g transform="translate(34 0)"><line x1="0" y1="0" x2="0" y2="-34" stroke="#b49a5a" stroke-width="2.4"/><line x1="18" y1="0" x2="18" y2="-34" stroke="#b49a5a" stroke-width="2.4"/><path d="M0 -32 Q9 -22 18 -32 L18 -16 Q9 -8 0 -16 Z" fill="url(#imesh)" stroke="#d7b882"/></g>' : ''}
${L >= 4 ? '<g fill="none" stroke="#d7b882" stroke-width="1.8"><ellipse cx="-34" cy="-3" rx="7" ry="3"/><ellipse cx="-34" cy="-6" rx="5" ry="2"/></g>' : ''}
${L >= 5 ? flag(-22, -46, '#d96b4a') + lamp(22, -50) : ''}
${[0, 1, 2].slice(0, Math.min(3, L)).map((i) => `<ellipse cx="${-12 + i * 12}" cy="-34" rx="3" ry="2" fill="${i % 2 ? '#f3ecff' : '#d96b4a'}"/>`).join('')}`,
  boatshed: (L) => `${ground(36)}
<rect x="-26" y="-30" width="${44 + L * 2}" height="30" fill="#7a5640" stroke="#3d291f"/>
<path d="M-32 -28 L${-4 + L} -${52 + L * 2} L${24 + L * 2} -28 Z" fill="${L >= 5 ? '#a04848' : '#5a3a26'}" stroke="#2b1d14"/>
<rect x="-6" y="-20" width="12" height="20" fill="#2b2433"/>
${L >= 2 ? '<rect x="-20" y="-22" width="8" height="7" fill="#ffd98a" opacity="0.8"/>' : '<rect x="-20" y="-22" width="8" height="7" fill="#1d1830"/>'}
${L >= 3 ? '<path d="M24 0 L52 6 L52 10 L24 4 Z" fill="#6a4a32"/><path d="M30 2 L50 6 Q46 12 36 11 Z" fill="#8a5a3a" stroke="#2b1d14" stroke-width="0.6"/>' : ''}
${L >= 4 ? `<rect x="6" y="-50" width="5" height="12" fill="#4a3226"/>${smoke(9, -56)}` : ''}
${L >= 5 ? '<rect x="-12" y="-40" width="22" height="7" rx="1" fill="#d9b25a"/><path d="M-6 -37 h10" stroke="#5a3a26"/>' : ''}`,
  nest: (L) => `${ground(24)}
<line x1="0" y1="0" x2="0" y2="-${36 + L * 4}" stroke="#7a5640" stroke-width="3"/>
<g transform="translate(0 -${36 + L * 4})"><path d="M-12 0 L0 -12 L12 0 L12 14 L-12 14 Z" fill="#94603c" stroke="#3d291f"/><circle cx="0" cy="5" r="3.4" fill="#1d1830"/><path d="M-14 1 L0 -14 L14 1" fill="none" stroke="#5a3a26" stroke-width="2.4"/></g>
${Array.from({ length: L }, (_, i) => `<g transform="translate(${-18 + i * 9} -${8 + (i % 2) * 4})"><ellipse rx="4" ry="2.6" fill="#f3ecff"/><circle cx="3" cy="-2" r="1.8" fill="#f3ecff"/><path d="M4.5 -2 l2 0.6 l-2 0.6 Z" fill="#e8a23a"/></g>`).join('')}
${L >= 3 ? '<g transform="translate(22 -26)"><line x1="0" y1="26" x2="0" y2="0" stroke="#7a5640" stroke-width="2.4"/><path d="M-9 0 L0 -9 L9 0 L9 10 L-9 10 Z" fill="#8a5a3a" stroke="#3d291f"/><circle cx="0" cy="4" r="2.4" fill="#1d1830"/></g>' : ''}
${L >= 4 ? '<g><rect x="-30" y="-12" width="5" height="12" rx="1.5" fill="#7fc4c0"/><rect x="-24" y="-10" width="5" height="10" rx="1.5" fill="#9fd4cf"/><rect x="-27" y="-20" width="5" height="9" rx="1.5" fill="#7fc4c0"/></g>' : ''}
${L >= 5 ? lamp(0, -70) : ''}`,
  kelp: (L) => `${ground(30)}
<rect x="-26" y="-40" width="52" height="3" fill="#7a5640"/><line x1="-24" y1="0" x2="-24" y2="-40" stroke="#7a5640" stroke-width="3"/><line x1="24" y1="0" x2="24" y2="-40" stroke="#7a5640" stroke-width="3"/>
${Array.from({ length: 2 + L * 2 }, (_, i) => `<path class="sway" d="M${-20 + i * (40 / (1 + L * 2))} -37 q3 10 -1 20 q-3 8 1 ${10 + (i % 3) * 3}" fill="none" stroke="${i % 2 ? '#4a8a5a' : '#6aa06a'}" stroke-width="2.4" stroke-linecap="round"/>`).join('')}
${L >= 4 ? '<path d="M28 0 L44 0 L42 -12 L30 -12 Z" fill="#b49a5a" stroke="#7a6a3a"/><path d="M31 -12 q6 -6 10 0" fill="none" stroke="#6aa06a" stroke-width="2"/>' : ''}
${L >= 5 ? lamp(-24, -46) + flag(24, -40, '#4a90c8') : ''}`,
  lookout: (L) => {
    const h = 30 + L * 10;
    return `${ground(26)}
<g stroke="#7a5640" stroke-width="2.6"><line x1="-16" y1="0" x2="-10" y2="-${h}"/><line x1="16" y1="0" x2="10" y2="-${h}"/></g>
<g stroke="#5d4030" stroke-width="1.4">${Array.from({ length: L + 1 }, (_, i) => `<line x1="${-15 + i}" y1="-${(h / (L + 1)) * (i + 0.5)}" x2="${15 - i}" y2="-${(h / (L + 1)) * (i + 0.5)}"/>`).join('')}</g>
<rect x="-18" y="-${h + 4}" width="36" height="5" fill="#8a6a4a" stroke="#3d291f"/>
<g stroke="#5d4030" stroke-width="1.2"><line x1="-17" y1="-${h + 4}" x2="-17" y2="-${h + 14}"/><line x1="17" y1="-${h + 4}" x2="17" y2="-${h + 14}"/><line x1="-17" y1="-${h + 12}" x2="17" y2="-${h + 12}"/></g>
${L >= 3 ? `<g transform="translate(6 -${h + 10}) rotate(-20)"><rect x="0" y="-2" width="14" height="4" rx="1" fill="#d9b25a"/></g>` : ''}
${L >= 4 ? flag(-17, -(h + 14), '#d96b4a') : ''}
${L >= 5 ? `<path d="M-22 -${h + 14} L0 -${h + 32} L22 -${h + 14} Z" fill="#5a3a26" stroke="#2b1d14"/>${lamp(0, -(h + 22))}` : ''}`;
  },
  depot: (L) => `${ground(34)}
<rect x="-28" y="-30" width="56" height="30" fill="${L >= 2 ? '#8a5a3a' : '#6a5040'}" stroke="#3d291f"/>
<path d="M-32 -28 L0 -48 L32 -28 Z" fill="${L >= 2 ? '#5a3a26' : '#4a3a32'}" stroke="#2b1d14"/>
${L < 2 ? '<path d="M6 -40 l8 6 l-10 2 Z" fill="#15143a"/>' : ''}
<rect x="-10" y="-22" width="20" height="22" fill="#2b2433"/><path d="M-10 -22 l20 22 M10 -22 l-20 22" stroke="#5a3a26" stroke-width="1.4"/>
${L >= 3 ? crate(32, 0) + crate(42, 0, '#7a5a3e') + crate(36, -9, '#94603c') : ''}
${L >= 4 ? lamp(-30, -34) : ''}
${L >= 5 ? '<rect x="-20" y="-62" width="40" height="16" fill="#8a5a3a" stroke="#3d291f"/><path d="M-24 -60 L0 -76 L24 -60 Z" fill="#a04848" stroke="#2b1d14"/><rect x="-6" y="-58" width="12" height="8" fill="#ffd98a" opacity="0.85"/>' : ''}`,
  workshop: (L) => `${ground(34)}
<rect x="-26" y="-32" width="52" height="32" fill="#5d6270" stroke="#3a3f4a"/>
<path d="M-30 -30 L30 -30 L26 -42 L-26 -42 Z" fill="#4a4f5c" stroke="#2c3038"/>
<rect x="-18" y="-24" width="14" height="24" fill="#2b2433"/>
<path d="M6 -10 h14 v4 h-3 v6 h-8 v-6 h-3 Z" fill="#2c3038"/>
${L >= 2 ? `<rect x="14" y="-58" width="7" height="18" fill="#3a3f4a"/>${smoke(17, -64)}` : ''}
${L >= 3 ? '<g transform="translate(0 -50)"><circle r="7" fill="none" stroke="#d9b25a" stroke-width="2.4" stroke-dasharray="3 2"/><circle r="2.4" fill="#d9b25a"/></g>' : ''}
${L >= 4 ? '<rect x="-18" y="-16" width="14" height="16" fill="#ff8a4a" opacity="0.75"/><circle cx="-11" cy="-8" r="10" fill="url(#iglow)"/>' : ''}
${L >= 5 ? '<rect x="26" y="-22" width="18" height="22" fill="#5d6270" stroke="#3a3f4a"/><path d="M24 -22 L35 -32 L46 -22 Z" fill="#4a4f5c"/>' + lamp(35, -36) : ''}`,
  desk: (L) => `${ground(26)}
<rect x="-18" y="-16" width="36" height="4" fill="#6a4430"/><rect x="-16" y="-12" width="3" height="12" fill="#4a2e20"/><rect x="13" y="-12" width="3" height="12" fill="#4a2e20"/>
<path d="M-8 -16 l8 -3 l8 3 l-8 2 Z" fill="#efe6d6" stroke="#b8ad9a" stroke-width="0.5"/>
${lamp(12, -22)}
${L >= 2 ? '<path d="M-28 0 v-14 h8 v-6 h3 v20" fill="none" stroke="#6a4430" stroke-width="2.4"/>' : ''}
${L >= 3 ? '<rect x="22" y="-34" width="14" height="34" fill="#5a3a26" stroke="#2b1d14"/><g fill="#a04848"><rect x="24" y="-31" width="3" height="8"/><rect x="28" y="-30" width="3" height="7"/></g><g fill="#4a90c8"><rect x="32" y="-31" width="2.5" height="8"/><rect x="24" y="-20" width="3" height="8"/></g><rect x="29" y="-20" width="4" height="8" fill="#d9b25a"/>' : ''}
${L >= 4 ? '<line x1="-22" y1="0" x2="-22" y2="-44" stroke="#6a4430" stroke-width="2.4"/><line x1="40" y1="0" x2="40" y2="-44" stroke="#6a4430" stroke-width="2.4"/><path d="M-28 -42 Q9 -62 46 -42 Z" fill="#a04848" opacity="0.9"/>' : ''}
${L >= 5 ? '<g transform="translate(-6 -26)"><circle r="6" fill="#4a90c8" stroke="#d9b25a"/><path d="M-6 0 h12 M0 -6 v12" stroke="#7fd18a" stroke-width="1"/><line x1="0" y1="6" x2="0" y2="10" stroke="#d9b25a"/></g><circle cx="12" cy="-22" r="16" fill="url(#iglow)" opacity="0.8"/>' : ''}`,
  jars: (L) => {
    const n = L * 2;
    let s = `${ground(30)}<rect x="-26" y="-4" width="52" height="4" fill="#6a4430"/>`;
    if (L >= 2) s += '<rect x="-26" y="-26" width="52" height="3" fill="#6a4430"/><line x1="-25" y1="0" x2="-25" y2="-26" stroke="#4a2e20" stroke-width="2"/><line x1="25" y1="0" x2="25" y2="-26" stroke="#4a2e20" stroke-width="2"/>';
    if (L >= 4) s += '<rect x="-26" y="-48" width="52" height="3" fill="#6a4430"/><line x1="-25" y1="-26" x2="-25" y2="-48" stroke="#4a2e20" stroke-width="2"/><line x1="25" y1="-26" x2="25" y2="-48" stroke="#4a2e20" stroke-width="2"/>';
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 4);
      const x = -18 + (i % 4) * 12;
      const y = -4 - row * 22;
      s += `<circle cx="${x}" cy="${y - 7}" r="8" fill="url(#fglow)" class="lamp"/><rect x="${x - 4}" y="${y - 12}" width="8" height="12" rx="2" fill="#eaffb0" fill-opacity="0.45" stroke="#cfe8d8" stroke-width="0.8"/><rect x="${x - 3}" y="${y - 14}" width="6" height="2.4" fill="#8a6a4a"/>`;
    }
    return s;
  },
  orchard: (L) => {
    let s = ground(38);
    const xs = [0, -24, 24, -12, 12];
    for (let i = 0; i < L; i++) {
      const x = xs[i];
      const big = i === 0 ? 1.2 : 1;
      s += `<g transform="translate(${x} ${i >= 3 ? -4 : 0}) scale(${big})"><rect x="-2" y="-16" width="4" height="16" fill="#5a3a26"/><circle cy="-26" r="13" fill="${i % 2 ? '#3a6a4a' : '#4a7a54'}"/><circle cx="-6" cy="-20" r="8" fill="#3a6a4a"/><g fill="#e8a24a"><circle cx="-4" cy="-28" r="2"/><circle cx="5" cy="-22" r="2"/>${L >= 3 ? '<circle cx="3" cy="-33" r="2"/>' : ''}</g></g>`;
    }
    if (L >= 4) s += '<path d="M30 0 L46 0 L44 -10 L32 -10 Z" fill="#b49a5a"/><g fill="#e8a24a"><circle cx="35" cy="-11" r="2"/><circle cx="40" cy="-11" r="2"/></g>';
    return s;
  },
  path: (L) => {
    let s = '';
    for (let i = 0; i < 2 + L * 2; i++) {
      const x = -34 + i * (68 / (1 + L * 2));
      const y = Math.sin(i * 1.3) * 4;
      s += `<circle cx="${x}" cy="${y}" r="6" fill="url(#fglow)"/><ellipse cx="${x}" cy="${y}" rx="4" ry="2.4" fill="#cfe8d8"/>`;
    }
    for (let i = 0; i < Math.floor(L / 2) + (L >= 1 ? 1 : 0); i++) {
      const x = -30 + i * 30;
      s += `<line x1="${x}" y1="-2" x2="${x}" y2="-24" stroke="#4a3226" stroke-width="1.6"/><circle cx="${x}" cy="-26" r="7" fill="url(#fglow)" class="lamp"/><circle cx="${x}" cy="-26" r="2.2" fill="#eaffb0"/>`;
    }
    if (L >= 5) s += '<path d="M-10 -40 Q0 -54 10 -40" fill="none" stroke="#eaffb0" stroke-width="2" opacity="0.8"/><circle cx="0" cy="-46" r="12" fill="url(#fglow)"/>';
    return s;
  },
};

/** A building at a level (0 = empty plot). */
export function buildingSvg(b: BuildingId, level: number): string {
  if (level <= 0) return `<g class="plot"><ellipse rx="30" ry="7" fill="none" stroke="#ffd98a" stroke-opacity="0.6" stroke-dasharray="4 4"/><path d="M-5 -12 h10 M0 -17 v10" stroke="#ffd98a" stroke-width="2" stroke-linecap="round"/></g>`;
  return DRAW[b](Math.min(5, level));
}

/** An island that reached its milestone celebrates: a string of lanterns (tier 1) and flags (tier 2). */
export function flourishSvg(tier: number): string {
  if (tier <= 0) return '';
  const lights = [40, 80, 120, 160, 200, 240, 280, 320]
    .map((x, i) => `<circle cx="${x}" cy="${118 + Math.sin(i) * 6}" r="7" fill="url(#iglow)" class="lamp"/><circle cx="${x}" cy="${118 + Math.sin(i) * 6}" r="2" fill="#ffd98a"/>`)
    .join('');
  const line = `<path d="M20 112 Q100 132 180 116 T340 114" fill="none" stroke="#3a3044" stroke-width="0.8"/>`;
  const flags =
    tier >= 2
      ? [60, 140, 220, 300].map((x, i) => `<path class="flag" d="M${x} ${124 + (i % 2) * 4} l10 3 l-10 4 Z" fill="${['#d96b4a', '#4a90c8', '#e8b84a', '#7fd18a'][i]}"/>`).join('')
      : '';
  return `<g class="flourish">${line}${lights}${flags}</g>`;
}
