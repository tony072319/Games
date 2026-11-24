# Round 2: milestones, collection book, starlight tree — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give long-term goals: milestone multipliers (net, islands), a 36-item collection book with bonuses, and a starlight talent tree with automation.

**Architecture:** Pure rules in `src/core/milestones.ts`, `src/core/curios.ts`, `src/core/talents.ts`, hooked into `economy.ts` (netRate, seaBoost, chestCapacity), `islands.ts` (islandRates), `boat.ts` (voyageMs, voyageHaul, settle/unload), `flotsam.ts` (curio drift), `sim.ts` (auto chest, auto boat), `seas.ts` (start-at-3). UI: card progress line, island milestone line, book sheet, talent sheet, shelf in the scene.

**Spec:** `docs/superpowers/specs/2026-11-23-lighthouse-idle-design.md` §18.

## Global Constraints
- Old saves load unchanged: new fields (`curios`, `talents`, `boat.lastDest`) default silently; existing starlight keeps its +3% each.
- All text through `t()` (zh+en), numbers through `formatNumber`; UI values only from `theme.css`; shared card/dialog/menu pieces.
- Randomness injectable (`rng` param) so tests are deterministic.

## Review Focus
1. All curios of a sea found → drift/boat/chest finds stop offering duplicates (no error, nothing shown). (curios test)
2. Talent reset refunds every point; learning out of order is refused. (talents test)
3. Auto-boat while offline for days → bounded loop, no freeze. (talents/sim test: ≤ 200 trips)
4. Clock moved backwards with auto-boat → no trips, no negative time. (sim test)
5. Loading a save with an unknown curio/talent id → dropped as 'repaired', game starts. (save test)

### Task 1 — Milestones (core)
- `NET_MILESTONES = [10,20,30,40,50]`, `netMilestoneMult(level)` = 1.25^(milestones reached), `nextNetMilestone(level): number | null`.
- `islandTier(s, d): 0|1|2` (all three buildings ≥3 → 1, ≥5 → 2); `islandMult(tier)` = 1, 1.25, 1.875.
- Hook: `netRate` × netMilestoneMult; `islandRates` × islandMult(tier).
- Tests: mult at 9/10/50; netRate at net 10 = autoRate(10)×1.25; island tier and rate ×1.25 at all-3.

### Task 2 — Curios (core)
- `CurioId = string` (`dusk:0`…`aurora:11`); `CURIOS: Curio[]` with `{ id, sea, index, rarity, source: 'any'|'boat', needLight?, dest? }`: index 0–7 common any; 8 rare any needLight 5; 9 rare boat dest 'oldlight'; 10 rare any needLight 7; 11 legend boat dest 'firefly' needLight 9.
- `state.curios: CurioId[]`; `eligibleCurios(s, how: 'drift'|'chest'|'boat', dest?)`; `pickCurio(s, how, rng, dest?) : CurioId | null`; `foundCurio(s, id)`.
- Chances: drift 0.006 per spawned item, chest 0.15 when ≥50% full, boat 0.25; × talent `cur1` 1.5. Talent `rare2` lowers needLight by 2.
- `curioBonus(s)` = (1 + 0.01×found) × (1 + 0.1 per completed sea page that matches s.sea) — applied in `seaBoost`.
- Flotsam: `FloatingItem.curio?: boolean` set at spawn with the drift chance; `collect` on a curio item returns `{ curio: CurioId | null }` in addition (null → normal material).
- Boat: `settleVoyage(s, now, rng = Math.random)` may attach `cargo.curio`; `unloadBoat` records it.
- Tests: eligibility gates; pick never returns a found one; null when all found; bonus +1% per item and +10% page; drift flag with rng; boat cargo curio recorded on unload.

### Task 3 — Talents (core)
- `TalentId` 12 ids by branch: fire: `net1`,`chest2`,`prod3`,`autoChest`; sail: `voy1`,`haul2`,`isl3`,`autoBoat`; star: `cur1`,`rare2`,`drift3`,`start3`. Costs by tier 2/4/8/14; tier 3 needs `reached` fog, tier 4 needs aurora; must learn in order.
- `talentPoints(s)` = starlight − spent; `canLearn`, `learn`, `resetTalents`, `has(s, id)`.
- Effects: net1 netRate ×1.15; chest2 +2 h offline cap (chestCapacity, arrival cap); prod3 seaBoost ×1.2; voy1 voyageMs ×0.85; haul2 haul ×1.3; isl3 islandRates ×1.3; drift3 tapYield ×2; start3 new sea starts at light 3; autoChest: in `tick`, full chest → collected; autoBoat: in `tick` and `applyOffline`, a returned boat unloads and re-sails to `boat.lastDest` (chained offline, max 200 trips, never before `departAt`).
- Tests for each effect, order/cost/sea gates, reset, offline chain bound, clock backwards.

### Task 4 — Save
- Persist `curios`, `talents`, `boat.lastDest`; drop unknown ids as repaired. Tests: round trip; old save defaults; unknown ids.

### Task 5 — UI: milestones
- `CardSpec.progress?: { label: string; value: number }` rendered as a thin bar under the cost row (net card: "再升 N 级：渔网 ×1.25"). Island view: milestone line + bar. Map node `.flourish` when tier ≥ 1; island scene lanterns/flags overlay at tier ≥ 1/2.

### Task 6 — UI: collection book + shelf + drifting curio
- Action bar "图鉴" button with badge when something new. Book sheet (`.overlay.sheet-overlay` + `.seamap`): page per reached sea, 4×3 grid of 44px+ cells; found = icon + name, tap shows the line; not found = silhouette + hint; page bonus + total bonus.
- Drifting curio item glows; collecting shows toast "找到了：{name}" and flies to the book button. Shelf in front SVG shows up to 3 latest rare/legend icons.
- 36 code-drawn icons (`src/ui/art/curios.ts`), names and lines in zh/en.

### Task 7 — UI: starlight tree
- HUD ✦ becomes a button (≥44px) opening the talent sheet: 3 columns × 4 nodes, each with name, effect, cost and state (learned / can learn / locked + reason); points header; reset button (confirm). Learning plays the upgrade sound + sparkle.

### Task 8 — Check and ship
- Independent UI check; e2e: book opens and shows 12 cells; debug "+1 珍品" finds one; talent learn + reset; milestone bar on net card. Push, deploy, screenshots.
