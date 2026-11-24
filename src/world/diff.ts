import type { WorldItem } from './layout';

export interface ItemDiff {
  add: WorldItem[];
  remove: string[];
  move: WorldItem[];
}

const placed = (a: WorldItem, b: WorldItem) => a.x === b.x && a.y === b.y && a.z === b.z && a.rotY === b.rotY && a.size === b.size;

/** What changed between two layouts, by key: new things, gone things, and things that only moved. */
export function diffItems(prev: WorldItem[], next: WorldItem[]): ItemDiff {
  const before = new Map(prev.map((i) => [i.key, i]));
  const now = new Set(next.map((i) => i.key));
  const add: WorldItem[] = [];
  const move: WorldItem[] = [];
  for (const i of next) {
    const was = before.get(i.key);
    if (!was) add.push(i);
    else if (!placed(was, i)) move.push(i);
  }
  return { add, remove: prev.filter((i) => !now.has(i.key)).map((i) => i.key), move };
}
