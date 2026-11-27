import type { MaterialId } from '../../core/data';

/** The author's material pictures (cut by tools/cut_icons.py), served from public/icons. */

export function itemIcon(m: MaterialId): string {
  return `<img class="item-icon" src="icons/${m}.png" alt="" draggable="false">`;
}


/**
 * The interface's small signs, drawn as one set: a solid shape in the text's colour with a paler
 * second tone, round corners, on a 20-unit square. They take their colour from where they sit.
 */
const sign = (body: string) => `<svg viewBox="0 0 20 20" aria-hidden="true">${body}</svg>`;
export const UI_ICONS = {
  /** Back to the island: the lighthouse on its hill. */
  home: sign(`<path d="M2 17q8-6 16 0z" fill="currentColor" opacity=".45"/><path d="M8 15.5L8.9 7h2.2l.9 8.5z" fill="currentColor"/><path d="M8.2 6.6h3.6V4.4L10 2.6 8.2 4.4z" fill="currentColor"/><path d="M12.4 5.2l5-1.6v3.2z" fill="currentColor" opacity=".45"/>`),
  /** Out to sea: two swells and a sail. */
  sea: sign(`<path d="M9 3v8h6.5z" fill="currentColor"/><path d="M8 5v6H3.8z" fill="currentColor" opacity=".45"/><path d="M1.5 14.2q2.1-2 4.25 0t4.25 0 4.25 0 4.25 0" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M3.5 17.6q1.6-1.5 3.25 0t3.25 0 3.25 0 3.25 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`),
  /** What to do next: a star with its glint. */
  goal: sign(`<path d="M10 1.6l2.4 5.2 5.7.7-4.2 3.9 1.1 5.6L10 14.2 5 17l1.1-5.6L1.9 7.5l5.7-.7z" fill="currentColor"/><path d="M10 1.6l2.4 5.2 5.7.7-4.2 3.9L10 10z" fill="#fff" opacity=".28"/>`),
  /** Settings: a cog. */
  gear: sign(`<path d="M8.4 1.6h3.2l.5 2.2 1.5.7 2-1.2 2.2 2.2-1.2 2 .7 1.5 2.2.5v3.2l-2.2.5-.7 1.5 1.2 2-2.2 2.2-2-1.2-1.5.7-.5 2.2H8.4l-.5-2.2-1.5-.7-2 1.2-2.2-2.2 1.2-2-.7-1.5-2.2-.5V9.5l2.2-.5.7-1.5-1.2-2 2.2-2.2 2 1.2 1.5-.7z" fill="currentColor" opacity=".9" transform="translate(1 0.2) scale(.9)"/><circle cx="10" cy="10.2" r="3" fill="var(--c-surface-dialog)"/><circle cx="10" cy="10.2" r="1.3" fill="currentColor" opacity=".55"/>`),
  /** Polishing the lamp: a lamp and a sparkle. */
  polish: sign(`<path d="M6 8h6l1 2v5l-1 2H6l-1-2v-5z" fill="currentColor"/><path d="M7 5.5h4V8H7z" fill="currentColor" opacity=".5"/><path d="M8 10.5h2v4.5H8z" fill="#fff" opacity=".35"/><path d="M16 2l.8 2.2L19 5l-2.2.8L16 8l-.8-2.2L13 5l2.2-.8z" fill="currentColor"/>`),
  /** The recycler: two arrows going round. */
  recycle: sign(`<path d="M10 3a7 7 0 0 1 6.6 4.7l1.6-.6-.9 4.4-3.8-2.6 1.6-.6A5.2 5.2 0 0 0 5.3 7.6L3.7 6.8A7 7 0 0 1 10 3z" fill="currentColor"/><path d="M10 17a7 7 0 0 1-6.6-4.7l-1.6.6.9-4.4 3.8 2.6-1.6.6a5.2 5.2 0 0 0 9.8.7l1.6.8A7 7 0 0 1 10 17z" fill="currentColor" opacity=".55"/>`),
} as const;
