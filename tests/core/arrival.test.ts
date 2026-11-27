import { describe, expect, test } from 'vitest';
import { arrivalLines } from '../../src/core/arrival';
import { applyOffline } from '../../src/core/sim';
import { emptyMaterials, newGame } from '../../src/core/state';

const H = 3_600_000;

describe('arrival report', () => {
  test('nothing new → no report', () => {
    const s = newGame(0, 'zh');
    s.chest = emptyMaterials();
    const r = { seconds: 3 * 3600, creditedSeconds: 0, gained: emptyMaterials() };
    expect(arrivalLines(s, r)).toEqual([]);
  });
  test('a filled chest, and a cap line when it filled up', () => {
    const s = newGame(0, 'zh');
    const r = applyOffline(s, 5 * H);
    const lines = arrivalLines(s, r);
    expect(lines[0]).toMatchObject({ kind: 'away', seconds: 5 * 3600 });
    expect(lines.find((l) => l.kind === 'chest')?.mats?.wood).toBeGreaterThan(300);
    expect(lines.find((l) => l.kind === 'cap')).toMatchObject({ hours: 2 });
  });
  test('the boat and the islands', () => {
    const s = newGame(0, 'zh');
    s.boat.cargo = { sea: 'dusk', dest: 'wreck', haul: { ...emptyMaterials(), metal: 50 }, discovery: false, fromIsland: emptyMaterials() };
    s.islandStore.wreck = { ...emptyMaterials(), rope: 12 };
    const r = applyOffline(s, H);
    const lines = arrivalLines(s, r);
    expect(lines.find((l) => l.kind === 'boat')).toMatchObject({ dest: 'wreck' });
    expect(lines.find((l) => l.kind === 'island')?.mats?.rope).toBe(12);
  });
  test('a tip when something is affordable', () => {
    const s = newGame(0, 'zh');
    s.materials.wood = 100;
    const r = applyOffline(s, H);
    expect(arrivalLines(s, r).find((l) => l.kind === 'tip')).toMatchObject({ upgrade: 'net' });
  });
});

import { seaEventAt } from '../../src/core/seaEvents';
describe('the arrival report and events at sea', () => {
  test('says when an event is on as you arrive, with what it gives', () => {
    let t = 0;
    while (seaEventAt(t)?.id !== 'whales') t += 60e3;
    const s = newGame(0, 'zh');
    s.levels.light = 3;
    s.chest.wood = 50;
    const lines = arrivalLines(s, { seconds: 3600, creditedSeconds: 3600, gained: s.chest }, t);
    const ev = lines.find((l) => l.kind === 'event');
    expect(ev?.event).toBe('whales');
    expect(arrivalLines(s, { seconds: 3600, creditedSeconds: 3600, gained: s.chest }, seaEventAt(t)!.endAt + 1).some((l) => l.kind === 'event')).toBe(false);
  });
});
