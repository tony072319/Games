# Island Town — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Goal:** A big terraced home island with a town that grows with progress.
**Spec:** `docs/superpowers/specs/2026-11-26-island-town-design.md`

## Global Constraints
- The town changes only the picture; pacing tests unchanged; old saves load; models from `public/models`.

## Review Focus
1. Every town slot, home object and decoration stands on land (height > 0.1) at every `land`, not in another object's footprint.
2. Shores within MAX_SHORES at the bigger outline; boat routes and drift lanes stay on water.
3. Islands still appear exactly at their light level (lit radius vs. their distance).
4. Walkers stay on the street ring and on land.
5. Town size is monotone in progress and capped at the slot count.

### Task 1: Terraced terrain
`terrain.ts`: kind `town` — three tiers (harbour ~0.5, town ~2.0, peak ~4.0) with steep walls between; `homeShape(land)` radius 13 + land × 0.15; `paint(x,z)` street colour on the town ring. Tests: tiers' heights ordered; walls steep; streets coloured; outline at waterline.

### Task 2: World at the new scale
`hex.ts` litRadius = light + 8, DEST_HEX at needLight + 8; `layout.ts` SEA_RING from the home outline, home objects re-placed (house on the peak, chest and net at the harbour), decorations on the harbour ring; `scene.ts` HOME_REACH unchanged ratio. Tests updated (islands at light level; routes and lanes on water; shores fit).

### Task 3: The town
`core/town.ts`: `townPoints(s)`, `townShown(s, slots)`; `world/town.ts`: ordered `TOWN_SLOTS` per sea style on the harbour and town rings (clear of pier and decorations), walkers on the street ring, window glow. Tests: monotone, capped, on land, no overlaps, walkers on street.

### Task 4: Look, check and ship
Screenshots (start, mid, full; phone + desktop), adjust; build + e2e; fresh review; one fix pass; push; report in Chinese.
