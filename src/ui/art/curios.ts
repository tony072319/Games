/**
 * Small code-drawn pictures for the 36 curios (viewBox 0 0 32 32).
 * Simple on purpose: placeholders that read clearly at 32–48px until real art replaces them.
 */
const D: Record<string, string> = {
  // ---- the dusk sea ----
  'dusk:0': `<path d="M16 26 L5 13 Q16 2 27 13 Z" fill="#f2c7a8" stroke="#c98a6a"/><g stroke="#c98a6a" stroke-width="0.8"><path d="M16 26 L10 9"/><path d="M16 26 L16 7"/><path d="M16 26 L22 9"/></g>`,
  'dusk:1': `<circle cx="16" cy="16" r="10" fill="#7fc4c0" fill-opacity="0.75" stroke="#cdeeea"/><path d="M8 13 Q16 9 24 13 M8 19 Q16 23 24 19" stroke="#d7b882" fill="none"/><circle cx="12" cy="12" r="2.4" fill="#fff" opacity="0.6"/>`,
  'dusk:2': `<circle cx="16" cy="16" r="11" fill="#b8923a" stroke="#6a4a1a"/><circle cx="16" cy="16" r="8.5" fill="#efe6d6"/><path d="M16 9 L18.5 16 L16 23 L13.5 16 Z" fill="#c04848"/><path d="M16 16 L18.5 16 L16 23 Z" fill="#3a3044"/>`,
  'dusk:3': `<path d="M5 19 L27 19 L23 26 L9 26 Z" fill="#a0683e" stroke="#5a3a26"/><line x1="16" y1="19" x2="16" y2="5" stroke="#5a3a26" stroke-width="1.5"/><path d="M16 6 L25 17 L16 17 Z" fill="#efe6d6"/>`,
  'dusk:4': `<path d="M16 4 L19 13 L28 13 L21 19 L24 28 L16 22 L8 28 L11 19 L4 13 L13 13 Z" fill="#e0805a" stroke="#a84a30"/><g fill="#f6c0a0"><circle cx="16" cy="15" r="1"/><circle cx="16" cy="19" r="1"/></g>`,
  'dusk:5': `<circle cx="10" cy="16" r="5.5" fill="none" stroke="#9a6a45" stroke-width="2.4"/><path d="M15 16 L27 16 M23 16 L23 20 M26 16 L26 19" stroke="#9a6a45" stroke-width="2.4" stroke-linecap="round"/>`,
  'dusk:6': `<circle cx="16" cy="17" r="11" fill="#ffd98a" opacity="0.25"/><path d="M11 9 h10 l2 4 v9 l-2 3 h-10 l-2 -3 v-9 Z" fill="#ffd98a" stroke="#5d6270" stroke-width="1.2"/><path d="M13 5 h6 v4 h-6 Z" fill="#5d6270"/>`,
  'dusk:7': `<path d="M16 28 L16 18 M16 20 L10 12 M16 18 L22 9 M10 12 L8 6 M10 12 L13 7 M22 9 L25 5" stroke="#e46a6a" stroke-width="2.4" stroke-linecap="round" fill="none"/>`,
  'dusk:8': `<path d="M12 4 h8 v4 l3 4 v14 a2 2 0 0 1 -2 2 h-10 a2 2 0 0 1 -2 -2 v-14 l3 -4 Z" fill="#7fc4c0" fill-opacity="0.6" stroke="#cdeeea"/><rect x="12" y="13" width="8" height="10" rx="1" fill="#efe6d6" transform="rotate(-8 16 18)"/><rect x="13" y="2" width="6" height="3" fill="#8a6a4a"/>`,
  'dusk:9': `<circle cx="16" cy="18" r="10" fill="#d9b25a" stroke="#8a6a2a"/><circle cx="16" cy="18" r="7.5" fill="#fff6e0"/><path d="M16 18 L16 13 M16 18 L19.5 19.5" stroke="#3a3044" stroke-width="1.3" stroke-linecap="round"/><circle cx="16" cy="6" r="2.4" fill="none" stroke="#d9b25a" stroke-width="1.5"/>`,
  'dusk:10': `<circle cx="16" cy="16" r="13" fill="#bff5d8" opacity="0.25"/><path d="M6 20 Q8 8 20 6 Q28 8 26 16 Q22 26 10 24 Z" fill="#f0d6e8" stroke="#b88aa8"/><path d="M12 20 Q14 12 22 12" fill="none" stroke="#b88aa8"/>`,
  'dusk:11': `<circle cx="16" cy="16" r="14" fill="#ffe7a8" opacity="0.3"/><path d="M16 27 L5 15 Q4 8 10 7 Q14 7 16 11 Q18 7 22 7 Q28 8 27 15 Z" fill="#eaffb0" stroke="#bff5d8"/><circle cx="13" cy="13" r="2" fill="#fff" opacity="0.8"/>`,
  // ---- the foggy night sea ----
  'fog:0': `<path d="M9 22 Q9 9 16 8 Q23 9 23 22 Z" fill="#b8b0c8" stroke="#6a6480"/><rect x="7" y="22" width="18" height="3" rx="1.5" fill="#6a6480"/><circle cx="16" cy="27" r="2" fill="#6a6480"/><rect x="15" y="5" width="2" height="3" fill="#6a6480"/>`,
  'fog:1': `<line x1="8" y1="4" x2="8" y2="28" stroke="#6a5a4a" stroke-width="2"/><path d="M9 5 Q16 3 25 7 Q18 10 25 14 Q16 16 9 13 Z" fill="#c8a0a0" opacity="0.8"/>`,
  'fog:2': `<path d="M4 18 L22 9 L26 15 L8 24 Z" fill="#8a929f" stroke="#4a4f5c"/><path d="M22 9 L28 6 L30 11 L26 15 Z" fill="#5d6270"/><path d="M12 15 l2 4" stroke="#2c3038" stroke-width="1.5"/>`,
  'fog:3': `<path d="M6 20 Q16 15 26 20 L23 23 Q16 21 9 23 Z" fill="#6a7a5a"/><path d="M10 20 Q10 9 16 9 Q22 9 22 20 Z" fill="#7a8a6a" stroke="#4a5a3a"/>`,
  'fog:4': `<path d="M8 26 Q12 12 24 5 Q22 16 12 24 Z" fill="#ece6f5" stroke="#9a93b3"/><path d="M8 26 L20 10" stroke="#9a93b3"/>`,
  'fog:5': `<rect x="5" y="13" width="18" height="7" rx="3.5" fill="#a8b0bd" stroke="#6c7482"/><circle cx="22" cy="16.5" r="5" fill="#a8b0bd" stroke="#6c7482"/><circle cx="12" cy="16.5" r="1.6" fill="#2c3038"/>`,
  'fog:6': `<rect x="5" y="9" width="22" height="14" rx="1.5" fill="#e8dcc0" stroke="#a8946a"/><path d="M20 9 v14" stroke="#a8946a" stroke-dasharray="1.5 1.5"/><path d="M8 14 h9 M8 18 h7" stroke="#a8946a"/>`,
  'fog:7': `<path d="M6 16 Q11 8 16 16 Q21 24 26 16 M6 16 Q11 24 16 16 Q21 8 26 16" fill="none" stroke="#d7b882" stroke-width="2.6"/><g fill="#fff"><circle cx="10" cy="12" r="0.8"/><circle cx="22" cy="20" r="0.8"/></g>`,
  'fog:8': `<rect x="5" y="9" width="22" height="15" rx="1.5" fill="#efe6d6" stroke="#a8946a"/><path d="M5 10 L16 18 L27 10" fill="none" stroke="#a8946a"/><circle cx="16" cy="19" r="2.4" fill="#a04848"/>`,
  'fog:9': `<rect x="7" y="5" width="18" height="22" rx="1.5" fill="#4a3a5a" stroke="#2b1d3a"/><rect x="9" y="5" width="2" height="22" fill="#2b1d3a"/><path d="M14 12 h8 M14 16 h6" stroke="#d9b25a"/>`,
  'fog:10': `<circle cx="16" cy="13" r="12" fill="#8ff0e0" opacity="0.2"/><path d="M7 15 Q7 5 16 5 Q25 5 25 15 Z" fill="#8ff0e0" fill-opacity="0.7"/><path d="M10 15 q0 6 -2 10 M14 15 q1 7 0 11 M18 15 q-1 7 0 11 M22 15 q0 6 2 10" stroke="#8ff0e0" fill="none"/>`,
  'fog:11': `<circle cx="16" cy="9" r="9" fill="#ffd98a" opacity="0.35"/><path d="M16 4 Q20 9 16 13 Q12 9 16 4 Z" fill="#fff0b8"/><rect x="12" y="13" width="8" height="14" rx="1" fill="#ece6f5" stroke="#b8ad9a"/>`,
  // ---- the aurora ice sea ----
  'aurora:0': `<path d="M16 3 V29 M5 9.5 L27 22.5 M5 22.5 L27 9.5" stroke="#cfefff" stroke-width="2" stroke-linecap="round"/><path d="M16 7 l-3 -3 M16 7 l3 -3 M16 25 l-3 3 M16 25 l3 3" stroke="#cfefff" stroke-width="1.4"/>`,
  'aurora:1': `<path d="M9 21 Q9 10 16 10 Q23 10 23 21 Z" fill="#d9b25a" stroke="#8a6a2a"/><rect x="7" y="21" width="18" height="3" rx="1.5" fill="#a04848"/><circle cx="16" cy="26" r="2" fill="#8a6a2a"/>`,
  'aurora:2': `<path d="M9 27 V13 Q9 6 15 6 Q21 6 21 13 V27 Z" fill="#c04848"/><path d="M21 15 Q26 13 26 18 Q26 21 21 21" fill="#c04848"/><path d="M9 23 h12" stroke="#f3ecff" stroke-width="2"/>`,
  'aurora:3': `<rect x="3" y="7" width="26" height="18" rx="3" fill="#cfefff" fill-opacity="0.55" stroke="#9cc4d4"/><path d="M8 16 Q14 11 20 16 Q14 21 8 16 Z M20 16 L25 12 L25 20 Z" fill="#6a8aa8"/>`,
  'aurora:4': `<path d="M4 20 Q4 25 9 25 H27" fill="none" stroke="#7a5640" stroke-width="3" stroke-linecap="round"/><rect x="8" y="14" width="19" height="4" rx="1" fill="#94603c"/><path d="M12 18 V22 M22 18 V22" stroke="#7a5640" stroke-width="2"/>`,
  'aurora:5': `<path d="M12 5 Q20 4 21 13 Q21 22 15 28 Q14 18 12 5 Z" fill="#f3ecff" stroke="#b8b0c8"/>`,
  'aurora:6': `<rect x="5" y="6" width="22" height="20" rx="1" fill="#f3ecff"/><rect x="7" y="8" width="18" height="13" fill="#0a2a3a"/><path d="M7 14 Q12 9 16 13 T25 11 V16 Q19 17 14 15 T7 18 Z" fill="#7affc0" opacity="0.7"/>`,
  'aurora:7': `<rect x="4" y="6" width="24" height="20" rx="3" fill="#cfefff" fill-opacity="0.5" stroke="#9cc4d4"/><circle cx="16" cy="16" r="6.5" fill="#d9b25a" stroke="#8a6a2a"/><path d="M14 16 h4 M16 13 v6" stroke="#8a6a2a"/>`,
  'aurora:8': `<path d="M4 8 L11 6 L20 9 L28 7 V24 L20 26 L11 23 L4 25 Z" fill="#e8dcc0" stroke="#a8946a"/><path d="M11 6 V23 M20 9 V26" stroke="#a8946a" stroke-width="0.8"/><path d="M14 13 l3 3 m0 -3 l-3 3" stroke="#a04848" stroke-width="1.4"/>`,
  'aurora:9': `<circle cx="9" cy="16" r="6" fill="none" stroke="#7affc0" stroke-width="2.6"/><path d="M15 16 H28 M24 16 V21 M27 16 V20" stroke="#7affc0" stroke-width="2.6" stroke-linecap="round"/><circle cx="9" cy="16" r="10" fill="#7affc0" opacity="0.15"/>`,
  'aurora:10': `<circle cx="16" cy="16" r="13" fill="#e8a24a" opacity="0.2"/><path d="M9 7 L23 6 L27 17 L19 27 L8 24 L5 14 Z" fill="#e8a24a" fill-opacity="0.8" stroke="#b87a2a"/><circle cx="15" cy="16" r="2" fill="#eaffb0"/>`,
  'aurora:11': `<circle cx="16" cy="16" r="14" fill="#b48aff" opacity="0.2"/><path d="M16 3 L21 14 L16 29 L11 14 Z" fill="#7affc0" fill-opacity="0.85"/><path d="M16 3 L21 14 L16 18 Z" fill="#b48aff" opacity="0.7"/>`,
};

export function curioIcon(id: string, silhouette = false): string {
  const body = D[id] ?? '';
  // Not found yet: the same shape, as a dark silhouette.
  const inner = silhouette ? `<g style="filter:brightness(0) opacity(.45)">${body}</g>` : body;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">${inner}</svg>`;
}

/** The little shelf by the lighthouse door: up to three rare finds. */
export function shelfSvg(ids: string[]): string {
  if (ids.length === 0) return '';
  const items = ids
    .slice(-3)
    .map((id, i) => `<svg x="${186 + i * 9}" y="${396}" width="9" height="9" viewBox="0 0 32 32">${D[id] ?? ''}</svg>`)
    .join('');
  return `<g class="shelf"><rect x="185" y="405" width="29" height="2" fill="#7a5640"/>${items}</g>`;
}
