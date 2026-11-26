# Sculpted Island & Better Voyages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the hex-tile islands with sculpted 3D terrain, and make voyages a story with choices: log, commissions, rare returns, per-sea island rules, a second boat.

**Spec:** `docs/superpowers/specs/2026-11-26-island-and-voyages-design.md`

## Global Constraints
- Pacing within `tests/sim/targets.test.ts`; old saves load (new fields default); zh + en; models from `public/models`.

## Review Focus
1. Terrain height sampled where objects stand is finite and ≥ 0 on land; nothing floats or sinks (object y = height).
2. Water shores follow the outline at every `land` 0..28 within MAX_SHORES.
3. Two boats never share one voyage/cargo; unloading one never touches the other; old saves get boat 2 unbuilt.
4. Aurora ice: a frozen island yields nothing and cannot be built on until broken; the sim still finishes aurora in range.
5. Commission reward and progress per sea; delivering twice or with too little is refused.

### Task 1: Terrain generator (pure)
`src/world/terrain.ts`: `islandShape(kind, seed, radius)`; `heightAt(shape, x, z): number` (≤0 = water); `outline(shape, n): [x,z,r][]` for shores; `terrainMesh(shape, palette)` (three.js, vertex colours: sand/grass/rock by height and slope, toon). Home radius from `land`: `homeRadius(land) = 5 + land * 0.12`. Tests: height finite; centre highest region > beach; beach ring height small; outline points at height ≈ 0; radius grows with land.

### Task 2: Islands in the world
`layout.ts`: home ground = one `terrain:home:<land>:<sea>` item (scene builds the mesh); object y from `heightAt`; decorations at fixed angles on the outer slope; destination islands as terrain items with per-dest shapes; remove hex grass tiles, `inlandNoShore`, LAND_TILES use; shores = outline. `scene.ts`: build/dispose terrain meshes by key. Tests: no `kk/hex_grass`; objects y = height at their spot; shores ≤ MAX_SHORES at land 28; finds and boat route clear of the outline. Screenshot review.

### Task 3: Voyage log and rare returns
`src/core/voyageLog.ts`: `rollStory(s, dest, rng): Story` at settle (`{ key, bonus?: 'haul' | 'early' | 'find' }`), stored on `Cargo.story`; `Cargo.rare` when curio, discovery or bonus. UI: arrival/unload shows the story line; world: rare cargo → lantern on bow + gull escort while returning (voyage records `rare` once settled; for the trip back use a seeded pre-roll at departure). i18n story templates per dest × sea (≥ 4 each). Tests: deterministic with rng; bonus applied once; old cargo without story loads.

### Task 4: Commissions
`src/core/commission.ts`: per sea per dest `{ material, amount, done }` + `friend[dest]` 0–3; `commissionFor(s, dest)`, `deliver(s, dest)`; amount = rate-based; reward. UI: island card in sea map shows request + deliver button + friendship hearts. World: friendship ≥1 lanterns, ≥2 flags, ≥3 hut light on that island. Tests + sim delivers when affordable.

### Task 5: Per-sea island rules
Fog: dest visible-but-unreachable until `light ≥ needLight + 1`. Aurora: `ice[dest]` per sea; first trip to an iced island is a "break ice" trip (no haul, story), then normal; buildings need ice broken. Tests; sim adapts; retune to targets.

### Task 6: Second boat
`s.boat2` (same shape as `s.boat`), built from fog sea on (`BOAT2_COST`); boat functions take `which: 0 | 1`; offline/autoSail handle both; sea map lists both boats; world draws boat 2 at a second mooring. Tests; sim sails both; retune.

### Task 7: Check and ship
Build, e2e, screenshots, fresh review, one fix pass, push, report in Chinese.
