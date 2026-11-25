import type { MaterialId } from '../../core/data';

/** The author's material pictures (cut by tools/cut_icons.py), served from public/icons. */

export function itemIcon(m: MaterialId): string {
  return `<img class="item-icon" src="icons/${m}.png" alt="" draggable="false">`;
}

