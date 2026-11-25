# Roomy Island & Island Expansion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A home island two rings wide with room between things, and a long-tail "expand the island" purchase in wood + plastic that fills the later seas.

**Architecture:** World geometry in `src/world/hex.ts` grows by two rings (home 0–2, light radius +4, destinations +2, decorations on ring 3). Core `src/core/land.ts` holds per-sea `land` (tiles bought) like decorations. The layout draws expansion tiles from an ordered list; the water only gets outer-edge tiles as shores. The decorations sheet gets an expansion card. The simulator buys land with decorations; Task 4 tunes.

**Spec:** `docs/superpowers/specs/2026-11-25-roomy-island-design.md`

## Global Constraints
- Pacing inside `tests/sim/targets.test.ts`; boat untouched; expansion changes no numbers.
- Old saves load (`land` default 0); zh + en text; models only from `public/models`.

## Review Focus
1. Light 1 at game start: the whole home island (ring 2) and the lit water look right; islands still appear exactly when their light level is reached. (Task 1 test)
2. Every land tile + decoration + home tile at once → shores ≤ MAX_SHORES, no tile on the pier line or on a destination island. (Task 1/3 tests)
3. Drifting finds never float over land at full expansion. (Task 3 test)
4. `land` beyond the tile list or negative/non-integer in a save → clamped/ignored. (Task 2 test)
5. Switching seas keeps each sea's land; a new sea starts at 0. (Task 2 test)

### Task 1: Bigger world geometry
**Files:** `src/world/hex.ts`, `src/world/layout.ts`, `src/world/scene.ts`, `src/world/water.ts`; tests `tests/world/hex.test.ts`, `layout.test.ts`, `decor.test.ts`.
- `HOME_TILES` = ring 0..2 (19); `litRadius(l) = l + 4`; `DEST_HEX` = wreck [-7,7], gullrock [0,-8], oldlight [9,-9], firefly [-10,5]; `PIER_TILE = [0,2]`; `DECOR_SLOTS` on ring 3 (every other free tile, away from the pier line); flotsam lanes `z = 11 + lane * 5`; home objects spread over rings 0–2; `MAX_SHORES = 64` and only land tiles with a non-land neighbour get a shore; camera default pulled back so ring 3 fits (DEFAULT_CAM scaled ×1.3 from the target).
- [ ] Update geometry tests first (19 home tiles, lit +4, dests at needLight+4, pier from ring 2, decor slots on ring 3), FAIL → implement → PASS → commit `feat(world): a roomier home island`.

### Task 2: Land (rules)
**Files:** create `src/core/land.ts`; modify `state.ts`, `seas.ts`, `save.ts`, `tuning.ts`; test `tests/core/land.test.ts`.
- `LAND_MAX` (number of expansion tiles, from the world list length, passed as a constant 36 and asserted equal in Task 3), `landCost(s): Materials | null` = wood/plastic halves of `LAND_BASE * LAND_GROWTH^land * SEA_DEF.cost`; `canExpand`, `expand`; locked below `DECOR_FROM_LIGHT`; per sea; saved (clamp to 0..LAND_MAX integer).
- [ ] Tests: price grows; locked below light 3; max stops; per sea; pass resets; save clamps. FAIL → PASS → commit `feat(core): expand the island`.

### Task 3: Land in the world and the sheet
**Files:** `src/world/hex.ts` (`LAND_TILES: Hex[]` ordered: ring 3 minus decor slots, then ring 4; none on the pier line), `layout.ts` (tiles `land:<i>` for i < land, with sea wash; occasional grass/flower tuft), `src/ui/decorSpecs.ts` + `decor.ts` (first card "扩建小岛 n/N"), i18n; tests `tests/world/land.test.ts`, `tests/ui/decor.test.ts`.
- [ ] Tests: LAND_TILES length = LAND_MAX, distinct, not home/decor/pier/dest-adjacent; full layout shores ≤ MAX_SHORES; flotsam lanes clear of all land; card present. FAIL → PASS → commit `feat: island expansion in the world and the sheet`.

### Task 4: Sim and tuning
- [ ] Sim buys the cheapest of land/decor last; floors back to [0.85, 0.8, 0.7] if reachable (else best achieved, ledgered); tune LAND_BASE/LAND_GROWTH on 6 seeds; commit `balance: island expansion fills the later seas`.

### Task 5: Look, check and ship
- [ ] Screenshots (start island, fully expanded and decorated, phone + desktop), adjust spacing/camera; build + e2e; fresh review; one fix pass; push; report in Chinese.
