# Lighthouse Parts & Island Decorations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the later seas things to buy on most visits — the lighthouse mended part by part from level 5, and a set of island decorations — without changing the tuned pacing.

**Architecture:** Core rules in `src/core` (pure, tested): a `priceOf(state, id)` that is what the button buys now (a quarter-level part for the lighthouse from level 5, else the level), and a new `src/core/decor.ts`. Both are per-sea state (top-level fields swapped by `seas.ts` snapshot/restore, saved by `save.ts`). The simulator buys them too; Task 3 tunes decoration prices and restores the buy-ratio targets. UI adds part progress to the lighthouse card and a decorations sheet; the 3D layout adds a ring of small tiles with decoration models.

**Tech Stack:** TypeScript, Vitest, three.js world (existing).

**Spec:** `docs/superpowers/specs/2026-11-25-late-sea-content-design.md`

## Global Constraints

- Pacing stays inside `tests/sim/targets.test.ts` (dusk 4–6 d, fog 14–21 d, aurora 28–42 d, shares, talent fill 55–70%).
- Decorations change only the picture: no rate, capacity or cost depends on them.
- Old saves load: new fields default (`lightParts` 0, `decor` {}), no "dropped" flag for their absence.
- All text through `t()` in zh + en; UI values from `theme.css`; cards reuse `upgradeCard`.
- Models only from `public/models` (already credited).

## Review Focus

1. Lighthouse at part 3/4 and the player switches sea and back → progress kept per sea, not shared. (Task 1 test)
2. Passing the light with parts in progress → the new sea starts at 0 parts and no decorations. (Task 1, Task 2 tests)
3. Save with `lightParts` out of range (e.g. 7, -1, 2.5) or unknown decoration ids → loads clamped/ignored, no crash. (Task 1, Task 2 tests)
4. `upgradeCost('light', …)` still means a whole level (used by leftovers, advice, the sim's "last step") while the button shows a part price. (Task 1 test)
5. Buying the 4th part at level 9 makes level 10 and `canPassLight` true. (Task 1 test)

---

### Task 1: Lighthouse parts

**Files:** Modify `src/core/economy.ts`, `src/core/state.ts`, `src/core/seas.ts`, `src/core/save.ts`, `src/core/tuning.ts`, `src/core/advice.ts`, `src/ui/upgrades.ts`, `tools/sim/sim.ts`; Test `tests/core/lightParts.test.ts`.

**Interfaces (produces):**
- `T.LIGHT_PARTS = 4`, `T.LIGHT_PARTS_FROM = 5` (level the split starts at: buying levels 6–10).
- `GameState.lightParts: number` (0..3), `SeaState.lightParts: number`.
- `priceOf(state, id: UpgradeId): Materials` — light with `levels.light >= LIGHT_PARTS_FROM`: `ceil(levelCost[m] / LIGHT_PARTS)` per material; otherwise `upgradeCost(id, level, state)`.
- `canBuy`/`buyUpgrade` use `priceOf`; buying a light part increments `lightParts`, and at `LIGHT_PARTS` sets it to 0 and `levels.light += 1`.
- Callers that mean "what the button costs" switch to `priceOf`: `ui/upgrades.ts` (lines 63, 84), `advice.ts:87`, `sim.ts:101`. `upgradeCost` keeps meaning a whole level.

- [ ] Tests (`lightParts.test.ts`): below level 5 one buy = one level; at level 5 four buys of `ceil(cost/4)` make level 6 and parts go 1,2,3,0; four parts cost ≥ the level and < level + 4 per material; at 9 the 4th part gives 10 and `canPassLight`; parts survive `switchSea` away and back (per sea) and a save round-trip; `passLight` starts the new sea at 0; loader clamps `lightParts` 7 → 0, -1 → 0, 2.5 → 0 for a non-integer and absence → 0 without `dropped`. Run → FAIL → implement → PASS; full suite green (existing light tests that buy levels ≥5 in one call get updated to buy parts) → commit `feat(core): mend the lighthouse part by part from level 5`.

### Task 2: Decorations (rules)

**Files:** Create `src/core/decor.ts`; Modify `src/core/state.ts`, `src/core/seas.ts`, `src/core/save.ts`, `src/core/tuning.ts`; Test `tests/core/decor.test.ts`.

**Interfaces (produces):**
- `type DecorId = 'lantern' | 'flowers' | 'bench' | 'flags' | 'well' | 'garden' | 'hut' | 'torches' | 'lights' | 'tower'`; `DECOR_IDS: readonly DecorId[]` in that order; `DECOR_TIERS = 3`.
- `GameState.decor: Partial<Record<DecorId, number>>` (tier 1..3), `SeaState.decor` likewise.
- `decorBought(s): number` = sum of tiers; `decorCost(s, id): Materials | null` (null at tier 3) = for the next purchase n = `decorBought(s)`: total `T.DECOR_BASE * T.DECOR_GROWTH ** n * SEA_DEF[s.sea].cost`, split by tier: tier 1 wood .6 plastic .4; tier 2 wood .4 rope .3 plastic .3; tier 3 wood .3 rope .3 metal .3 glow (fixed `ceil(n/6)`), each `Math.ceil`.
- `canDecorate(s, id): boolean`, `decorate(s, id): boolean` (pays, tier +1).
- `T.DECOR_BASE = 200`, `T.DECOR_GROWTH = 1.25` (provisional; Task 3 tunes).

- [ ] Tests: first lantern costs `ceil(200*.6*k)` wood; prices grow with each purchase in any item; tier 3 is the last (`decorCost` null, `decorate` false); refused without materials, never negative; per sea across `switchSea`; `passLight` gives the new sea `{}`; save round-trip; loader ignores unknown ids and tiers outside 1..3; decorations change no rate (`netRate`, `chestCapacity`, `voyageHaul` equal before/after). FAIL → implement → PASS → commit `feat(core): island decorations`.

### Task 3: Simulator buys them; tune to the targets

**Files:** Modify `tools/sim/sim.ts` (`shop`: after buildings and before net, buy the cheapest affordable decoration; light parts already flow through `priceOf`), `tools/sim/tune.ts` (knobs `DECOR_BASE` 20–5000 log, `DECOR_GROWTH` 1.05–1.6), `src/core/tuning.ts`, `tests/sim/targets.test.ts`.

- [ ] Restore the buy-ratio floors to `[0.85, 0.8, 0.8]`; run the targets test → FAIL (current 83/53/31%). Tune `DECOR_BASE`/`DECOR_GROWTH` (and only if needed `LIGHT_PARTS`) until every target in `targets.test.ts` passes on seeds 1–6. Commit `balance: decorations and lighthouse parts fill the later seas` with the report table. If 0.8 is unreachable, ledger a ruling with the best achieved values.

### Task 4: Cards and the decorations sheet

**Files:** Modify `src/ui/upgrades.ts` (lighthouse card: `card.parts` line "零件 {n}/4 · {name}" when split applies; button buys one part), `src/ui/app.ts` (toolbar button `.decor-btn` "装饰" with an SVG icon, opens `createDecorSheet`), Create `src/ui/decor.ts` (`createDecorSheet(lang, state, { buy(id), close() }): { el; update(state) }` — one `upgradeCard` per decoration with tier "n/3", next tier name, cost, eta; maxed shows done), i18n zh/en keys `decor.open`, `decor.title`, `decor.<id>.<1|2|3>` (30 names), `card.parts`, `part.1..4` (换透镜 / 修栏杆 / 刷漆 / 加固; Lens / Railing / Paint / Brace); Test `tests/ui/decor.test.ts` (sheet lists 10 cards in DECOR_IDS order; buying calls `buy`; i18n has every key in both languages); e2e: open the sheet, buy a decoration in the test build.
- Use ui-consistency:adjusting for the card change and finding-patterns for the sheet (follow `book.ts`/`seaMap.ts` sheet pattern).
- [ ] FAIL → implement → PASS; `npm run build`; commit `feat(ui): lighthouse parts on the card, decorations sheet`.

### Task 5: Decorations in the 3D world

**Files:** Modify `src/world/layout.ts` (decor slots), `src/world/hex.ts` (`DECOR_SLOTS: Record<DecorId, Hex>` — ring(2) tiles except `PIER_TILE`'s outward neighbour and the one beside it; 10 slots), `src/world/looks.ts` (`DECOR_LOOKS: Record<DecorId, Part[][]>` per tier, models from the list below); Test `tests/world/decor.test.ts`.
- Each bought decoration adds a small ground tile at its slot (same `GROUND` wash as home) and its tier's parts; keys `decor:<id>:<tier>` so the diff swaps models on tier change.
- Models (tier 1 → 3): lantern `lh/signal_lamp_post` → `harbor/dock_post_lantern` → `winter/lantern_xmas` (glow); flowers `nature/flower_yellow` → + `flower_red` → + `flower_purple` + `bush_round`; bench `kk/pallet` → `kk/crate_long_A` + `kk/sack` → `huts/hammock`; flags `kk/flag_blue` → + `flag_yellow` → `kp/flag-high-pennant`; well `kk/building_well_blue` → `viking/well` → + `kpet/animal-bunny`; garden `nature/fern` → `huts/banana_plant` → `volcano/coconut_cluster` + `nature/palm_tree`; hut `kk/tent` → `viking/small_hut` → `volcano/thatch_hut`; torches `tiki/tiki_torch` ×1 → ×2 → ×3 (glow fire); lights `huts/rope_fence` → `tiki/string_lights` → + `lh/telescope_stand`; tower `kk/building_stage_A` → `kk/building_tower_A_blue` → `viking/watchtower`.
- [ ] Tests: no decor → no `decor:` items; lantern tier 2 → items keyed `decor:lantern:2` at its slot, plus `decor:lantern:tile`; slots are 10 distinct ring-2 hexes not on the pier line; every model id exists in `MODELS`. FAIL → PASS; screenshot (test build, all decorations tier 3) checked; `npm test && npm run build && npm run e2e`; commit `feat(world): decorations around the island`.

### Task 6: Check and ship

- [ ] Whole-branch review (fresh reviewer, opus); one fix pass; push; screenshots + sim table to the author in Chinese.
