import type { MaterialId } from '../../core/data';

const ICONS: Record<MaterialId, string> = {
  wood: `<rect x="4" y="11" width="24" height="10" rx="3" fill="#9a6a45" transform="rotate(-12 16 16)"/><g transform="rotate(-12 16 16)" stroke="#6b4a36" stroke-width="1" fill="none"><path d="M8 14 Q14 15 20 14"/><path d="M11 18 Q17 19 24 17"/><circle cx="23" cy="14" r="1.5"/></g>`,
  plastic: `<path d="M13 4 h6 v4 l3 4 v14 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 v-14 l3 -4 Z" fill="#7fc4c0" fill-opacity="0.85" stroke="#cdeeea" stroke-width="1"/><rect x="13" y="3" width="6" height="3" rx="1" fill="#3f7f99"/><rect x="12" y="15" width="8" height="6" fill="#f3ecff" fill-opacity="0.6"/>`,
  rope: `<g fill="none" stroke="#d7b882" stroke-width="2.6"><circle cx="16" cy="16" r="10"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="2"/></g><path d="M26 16 q3 4 0 9" fill="none" stroke="#d7b882" stroke-width="2.6" stroke-linecap="round"/>`,
  metal: `<g fill="#a8b0bd" stroke="#6c7482" stroke-width="1"><path d="M14 3 h4 l1 4 3 1.5 3.5-2.2 2.8 2.8-2.2 3.5 1.5 3 4 1 v4 l-4 1-1.5 3 2.2 3.5-2.8 2.8-3.5-2.2-3 1.5-1 4 h-4 l-1-4-3-1.5-3.5 2.2-2.8-2.8 2.2-3.5-1.5-3-4-1 v-4 l4-1 1.5-3-2.2-3.5 2.8-2.8 3.5 2.2 3-1.5 Z"/></g><circle cx="16" cy="16" r="4.5" fill="#2b2433"/>`,
};

export function itemIcon(m: MaterialId): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" aria-hidden="true">${ICONS[m]}</svg>`;
}

