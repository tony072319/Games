import { MATERIALS, PANEL_UPGRADES, type DestId, type Materials, type UpgradeId } from './data';
import { canBuy, offlineCapSeconds } from './economy';
import type { OfflineReport } from './sim';
import { emptyMaterials, type GameState } from './state';

export interface ArrivalLine {
  kind: 'away' | 'chest' | 'cap' | 'boat' | 'island' | 'tip';
  mats?: Materials;
  seconds?: number;
  hours?: number;
  dest?: DestId;
  upgrade?: UpgradeId;
}

const some = (m: Materials) => MATERIALS.some((k) => m[k] >= 1);

/**
 * What happened while you were away, one line per thing worth seeing.
 * Empty when nothing came in (then no dialog is shown).
 */
export function arrivalLines(s: GameState, r: OfflineReport): ArrivalLine[] {
  const lines: ArrivalLine[] = [];
  if (some(s.chest)) lines.push({ kind: 'chest', mats: { ...s.chest } });
  if (r.seconds > r.creditedSeconds + 1 && r.creditedSeconds >= 0 && some(s.chest)) {
    lines.push({ kind: 'cap', hours: offlineCapSeconds(s.levels.storage) / 3600 });
  }
  if (s.boat.cargo) lines.push({ kind: 'boat', dest: s.boat.cargo.dest, mats: { ...s.boat.cargo.haul } });
  const isl = emptyMaterials();
  for (const st of Object.values(s.islandStore)) if (st) for (const m of MATERIALS) isl[m] += st[m];
  if (some(isl)) lines.push({ kind: 'island', mats: isl });
  if (lines.length === 0) return [];
  const tip = PANEL_UPGRADES.find((id) => canBuy(s, id));
  if (tip) lines.push({ kind: 'tip', upgrade: tip });
  return [{ kind: 'away', seconds: r.seconds }, ...lines];
}
