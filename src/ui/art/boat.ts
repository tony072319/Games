import type { DestId } from '../../core/data';

/** Where the boat sits, tied to the end of the dock (scene coordinates). */
export const BOAT_POS = { x: 300, y: 466 };

/** The pier that appears when the lighthouse reaches light 3. */
export function dockSvg(): string {
  return `<g class="dock">
<rect x="262" y="436" width="62" height="6" rx="1.5" fill="#7a5640"/>
<rect x="262" y="441" width="62" height="1.6" fill="#4a3226"/>
<g stroke="#4a3226" stroke-width="1"><line x1="276" y1="436" x2="276" y2="442"/><line x1="292" y1="436" x2="292" y2="442"/><line x1="308" y1="436" x2="308" y2="442"/></g>
<rect x="282" y="442" width="4" height="22" fill="#3d291f"/><rect x="318" y="442" width="4" height="22" fill="#3d291f"/>
<rect x="318" y="420" width="3" height="16" fill="#3d291f"/>
<circle cx="319.5" cy="419" r="7" fill="url(#glow)" class="lamp"/><rect x="317" y="415" width="5" height="6" rx="1" fill="var(--lamp)"/>
<path d="M290 436 q-4 -5 0 -6 q4 1 0 6" fill="#5d6270"/>
</g>`;
}

/** A small sailing boat. Laden = back from a voyage with its hold piled high. */
export function boatSvg(laden: boolean, cargoLevel: number): string {
  const hull = cargoLevel >= 5 ? '#6a4430' : '#8a5a3a';
  const stripe = cargoLevel >= 3 ? `<path d="M12 32 L68 32" stroke="${cargoLevel >= 8 ? '#d9b25a' : '#f3ecff'}" stroke-width="2"/>` : '';
  const load = laden
    ? `<g><rect x="22" y="20" width="12" height="10" fill="#8a6a4a" stroke="#3d291f" stroke-width="0.8"/><rect x="35" y="22" width="10" height="8" fill="#7a5a3e" stroke="#3d291f" stroke-width="0.8"/><rect x="27" y="13" width="10" height="8" fill="#94603c" stroke="#3d291f" stroke-width="0.8"/>
<rect x="47" y="18" width="6" height="11" rx="2" fill="#7fc4c0"/><circle cx="55" cy="25" r="3.5" fill="none" stroke="#d7b882" stroke-width="1.8"/>
<circle cx="40" cy="14" r="9" fill="url(#bglow)"/><path d="M40 8 L42 14 L40 20 L38 14 Z" fill="#bff5d8"/></g>`
    : '';
  const sail = laden
    ? `<path d="M40 4 L40 1 L58 14 L40 14 Z" fill="#efe6d6" stroke="#b8ad9a" stroke-width="0.6"/>`
    : `<rect x="38" y="10" width="4" height="4" rx="1" fill="#efe6d6"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -4 80 50" aria-hidden="true"><defs><radialGradient id="bglow"><stop offset="0" stop-color="#ffe7a8" stop-opacity="0.8"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>
<line x1="40" y1="0" x2="40" y2="30" stroke="#5a3a26" stroke-width="2"/>
${sail}${load}
<path d="M6 28 L74 28 Q70 42 56 44 L24 44 Q10 42 6 28 Z" fill="${hull}" stroke="#2b1d14" stroke-width="1.2"/>
${stripe}
<path d="M6 28 L74 28" stroke="#c9a978" stroke-width="1.4"/>
<ellipse cx="40" cy="46" rx="34" ry="2.4" fill="#e8e0ff" opacity="0.25"/>
</svg>`;
}

/** Each island on the chart: a little picture on its own ring of shallows, drawn like the curios (two tones, lit from the top left). */
const SHALLOWS = `<ellipse cx="24" cy="33" rx="22" ry="6.5" fill="#3fb5c2" opacity=".5"/><ellipse cx="24" cy="33" rx="18" ry="4.6" fill="#bff5f0" opacity=".55"/>`;
const ICONS: Record<DestId, string> = {
  // The wreck reef: a broken hull on a low reef.
  wreck: `${SHALLOWS}<path d="M6 33 Q14 26 24 28 Q35 25 42 33 Q24 37 6 33 Z" fill="#8f8aa0" stroke="#4a4660" stroke-width="1.2" stroke-linejoin="round"/><path d="M13 29 L34 20 L37 27 L16 33 Z" fill="#a8744a" stroke="#5a341d" stroke-width="1.2" stroke-linejoin="round"/><path d="M13 29 L34 20 L34.8 22 L14 31 Z" fill="#d7a06e"/><path d="M20 30 l1.5 -3.4 M26 28 l1.5 -3.6 M31 26 l1.2 -3.4" stroke="#5a341d" stroke-width="1"/><path d="M25 24 L20 5" stroke="#5a341d" stroke-width="2" stroke-linecap="round"/><path d="M20.4 7 L31 13 L22.4 15.5 Z" fill="#efe6d6" stroke="#b8a37a" stroke-width="1" stroke-linejoin="round" opacity=".92"/>`,
  // Gull rock: a tall stack with gulls round it.
  gullrock: `${SHALLOWS}<path d="M11 34 L16 13 L23 4 L31 12 L37 34 Q24 37 11 34 Z" fill="#8a8498" stroke="#454058" stroke-width="1.3" stroke-linejoin="round"/><path d="M16 13 L23 4 L25 13 L20 22 L14.5 20 Z" fill="#b5b0c4"/><path d="M20 22 L25 13 L29 24 L26 34 L18 34 Z" fill="#787288" opacity=".7"/><path d="M19 9 L23 4 L26 8.5 Q22.5 10.5 19 9 Z" fill="#fbf7ff"/><g fill="none" stroke="#fbf7ff" stroke-width="1.5" stroke-linecap="round"><path d="M33 7 q2.2 -2.6 4.4 0 q2.2 -2.6 4.4 0"/><path d="M4 13 q2 -2.4 4 0 q2 -2.4 4 0"/><path d="M36 17 q1.6 -2 3.2 0 q1.6 -2 3.2 0"/></g>`,
  // The abandoned lighthouse on its cape.
  oldlight: `${SHALLOWS}<path d="M5 34 Q14 24 26 26 Q38 25 43 34 Q24 37 5 34 Z" fill="#7fa86a" stroke="#4a6a3c" stroke-width="1.2" stroke-linejoin="round"/><path d="M18 31 L20.5 11 H27.5 L30 31 Z" fill="#b8b2c2" stroke="#4a4660" stroke-width="1.3" stroke-linejoin="round"/><path d="M18 31 L20.5 11 H23 L21.5 31 Z" fill="#dcd8e6"/><path d="M19.4 20 H28.6 L29.1 24.5 H18.9 Z" fill="#8a5a5a"/><rect x="19.5" y="6" width="9" height="5" rx="1" fill="#5d5870" stroke="#4a4660" stroke-width="1.2"/><path d="M18.5 6 L24 1.5 L29.5 6 Z" fill="#6e4a4a" stroke="#4a4660" stroke-width="1.2" stroke-linejoin="round"/><path d="M25 14 l2 4 -2.5 2 1.5 4" fill="none" stroke="#4a4660" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M32 30 l4 -2 2 3" fill="#9a94a8" stroke="#4a4660" stroke-width="1"/>`,
  // Firefly isle: a dark grove full of small lights.
  firefly: `${SHALLOWS}<path d="M5 34 Q14 25 24 26 Q34 25 43 34 Q24 37 5 34 Z" fill="#4f8a5a" stroke="#2c5238" stroke-width="1.2" stroke-linejoin="round"/><path d="M15 30 Q11 16 18 11 Q25 16 21 30 Z" fill="#3f7a52" stroke="#2c5238" stroke-width="1.2" stroke-linejoin="round"/><path d="M26 31 Q24 13 31 8 Q39 15 35 31 Z" fill="#5a9a62" stroke="#2c5238" stroke-width="1.2" stroke-linejoin="round"/><path d="M26 31 Q24 13 31 8 Q28 16 29.5 31 Z" fill="#7cb87a"/><g fill="#eaffb0"><circle cx="9" cy="16" r="1.7"/><circle cx="23" cy="6" r="1.4"/><circle cx="40" cy="9" r="1.8"/><circle cx="43" cy="22" r="1.3"/><circle cx="31" cy="20" r="1.2"/><circle cx="17" cy="20" r="1.1"/></g><g fill="#eaffb0" opacity=".3"><circle cx="9" cy="16" r="4"/><circle cx="40" cy="9" r="4.4"/><circle cx="23" cy="6" r="3.4"/></g>`,
};

export function islandIcon(d: DestId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" aria-hidden="true">${ICONS[d]}</svg>`;
}
