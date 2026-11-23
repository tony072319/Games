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

const ICONS: Record<DestId, string> = {
  wreck: `<path d="M4 34 Q14 26 24 30 Q34 24 44 34 Z" fill="#2c2446"/><path d="M12 30 L36 22 L38 28 L14 34 Z" fill="#6a4430" stroke="#2b1d14" stroke-width="0.8"/><line x1="26" y1="25" x2="20" y2="6" stroke="#5a3a26" stroke-width="2"/><path d="M20 8 L30 14 L22 16 Z" fill="#b8ad9a" opacity="0.8"/><circle cx="34" cy="20" r="2" fill="#a8b0bd"/>`,
  gullrock: `<path d="M8 36 L16 10 L24 4 L32 14 L40 36 Z" fill="#4a4260" stroke="#2c2446" stroke-width="1"/><path d="M16 10 L24 4 L26 12 Z" fill="#f3ecff" opacity="0.6"/><g fill="none" stroke="#f3ecff" stroke-width="1.2"><path d="M30 6 q2 -2 4 0 q2 -2 4 0"/><path d="M6 12 q2 -2 4 0 q2 -2 4 0"/></g>`,
  oldlight: `<path d="M4 36 Q24 28 44 36 Z" fill="#2c2446"/><path d="M19 34 L21 12 L28 12 L30 34 Z" fill="#9a909a"/><rect x="19" y="18" width="11" height="3" fill="#6e4a4a"/><path d="M20 12 L24.5 6 L29 12 Z" fill="#2c2446"/><path d="M27 12 l2 -3 l1 3 Z" fill="#1d1830"/><path d="M22 26 l3 4" stroke="#2b2433"/>`,
  firefly: `<path d="M2 36 Q24 24 46 36 Z" fill="#2a4038"/><path d="M14 30 Q12 18 18 14 Q24 18 20 30 Z" fill="#3a6a4a"/><path d="M26 32 Q26 16 32 12 Q38 18 34 32 Z" fill="#4a7a54"/><g fill="#eaffb0"><circle cx="10" cy="16" r="1.5"/><circle cx="22" cy="8" r="1.2"/><circle cx="38" cy="10" r="1.5"/><circle cx="42" cy="22" r="1.2"/><circle cx="30" cy="22" r="1"/></g>`,
};

export function islandIcon(d: DestId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 40" aria-hidden="true">${ICONS[d]}</svg>`;
}
