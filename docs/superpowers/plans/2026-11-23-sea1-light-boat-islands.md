# Sea 1: Lighthouse Light, Boat, Islands — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the lighthouse-light upgrade track (gates the dock, boat range and sea completion), a boat that sails timed voyages from a sea map, and four discoverable islands with one-time perks and repeatable hauls.

**Architecture:** Same split as phase 1: rules in `src/core/` (pure, unit-tested, mutate `GameState`), drawing in `src/ui/art/`, wiring in `src/ui/`. Voyages are absolute wall-clock (`departAt`/`returnAt`), settled inside `tick`/`applyOffline` so they complete while offline.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright e2e (unchanged).

**Spec:** `docs/superpowers/specs/2026-11-23-lighthouse-idle-design.md` §14 (and §7.2 visible-change rule, §4 anti-goals).

## Global Constraints

- Every upgrade level must look different on screen (spec §7.2 note): lighthouse levels 1–10 each distinct.
- Nothing drawn may leave the screen on a 390×844 phone (scene x within ~[20, 340]).
- All text via `t()`, keys in both `zh.json` and `en.json`.
- Old saves (no `light`, `boat`, `glow`, `discovered`) load as `'loaded'` with defaults — never reset progress.
- Collect/unload uses the existing fly-to-HUD + sound feedback.

## Review Focus

1. Voyage finishes while the game is closed → on open the boat is docked and laden; unloading works once (no double unload on double-tap).
2. Device clock moved backwards during a voyage → no crash, voyage does not finish early, no negative time shown.
3. Debug "+8 小时" must also advance an active voyage.
4. Old save from before this change → same materials/levels, `light` 1, no boat.
5. Map on a short desktop window → all reachable nodes tappable, not hidden under panels.

---

### Task 1: Core — glow material, new upgrades, perks, save compatibility

**Files:** Modify `src/core/data.ts`, `src/core/state.ts`, `src/core/economy.ts`, `src/core/sim.ts`, `src/core/save.ts`; tests in `tests/core/*.test.ts`.

**Interfaces (produces):**
- `MaterialId` adds `'glow'`; `MATERIALS` = wood, plastic, rope, metal, glow; `MATERIAL_WEIGHTS.glow = 0` (never drifts).
- `UpgradeId = 'net' | 'storage' | 'light' | 'speed' | 'cargo'`; `PANEL_UPGRADES = ['net','storage','light']`; `BOAT_UPGRADES = ['speed','cargo']`; `MAX_LEVEL` adds `light: 10, speed: 10, cargo: 10`.
- `DestId = 'wreck' | 'gullrock' | 'oldlight' | 'firefly'`.
- `GameState` adds `boat: { built: boolean; voyage: Voyage | null; cargo: Cargo | null }`, `discovered: DestId[]`.
  - `Voyage = { dest: DestId; departAt: number; returnAt: number }`; `Cargo = { dest: DestId; haul: Materials; discovery: boolean }`.
- `netRate(state): number` = `autoRate(net) × (discovered gullrock ? 1.25 : 1)`; `fillChest`/`chestCapacity` use it.
- `upgradeCost` additions (L = current level, all `Math.ceil`):
  - light: wood `200·2.2^(L-1)`, plastic `80·2.2^(L-1)`, rope `40·2.2^(L-1)` if L≥2, metal `20·2.2^(L-2)` if L≥2, glow `5·2^(L-7)` if L≥7; ×0.8 on every entry when `oldlight` discovered (`upgradeCost(id, L, state?)`).
  - speed: wood `150·1.9^(L-1)`, metal `30·1.9^(L-1)`. cargo: wood `120·1.9^(L-1)`, rope `40·1.9^(L-1)`.
- Save: missing material/level/boat/discovered/settings keys → defaults silently; present-but-invalid → dropped (`'repaired'`).

- [ ] Tests: glow never picked by `pickMaterial`; `upgradeCost('light',1)` = `{wood:200, plastic:80, rope:0, metal:0, glow:0}`; `upgradeCost('light',7)` has `glow 5`; with `oldlight` discovered `upgradeCost('light',1,s).wood` = 160; `netRate` ×1.25 with gullrock; phase-1 save JSON (no glow/light/boat) loads `'loaded'` with `levels.light 1`, `boat.built false`.
- [ ] Watch fail → implement → pass → commit `feat(core): lighthouse light, boat upgrades, glow, perks`.

### Task 2: Core — boat and voyages

**Files:** Create `src/core/boat.ts`; modify `src/core/sim.ts`; test `tests/core/boat.test.ts`.

**Interfaces (produces):**
- `DESTS: Record<DestId, { minutes: number; needLight: number; mix: Partial<Materials>; order: number }>`
  - wreck 15 min, light 3, mix metal .5 wood .3 rope .2
  - gullrock 60, light 4, mix rope .4 plastic .4 wood .2
  - oldlight 240, light 5, mix wood .4 metal .3 plastic .3
  - firefly 480, light 6, mix wood .5 plastic .5 (+ glow, below)
- `DOCK_LIGHT = 3`; `BOAT_COST: Materials` = wood 500, rope 150, metal 60.
- `canBuildBoat(s)`, `buildBoat(s): boolean`.
- `reachable(s, d): boolean` = built && `light ≥ needLight`.
- `voyageMs(s, d)` = `minutes·60000·0.92^(speed-1)`.
- `startVoyage(s, d, now): boolean` — needs reachable, no voyage, no cargo waiting.
- `voyageHaul(s, d): Materials` — total items = `netRate(s)·minutes·60·0.8·(1+0.25·(cargo-1))` split by `mix`; firefly adds `glow = 2 + cargo`.
- `settleVoyage(s, now): Cargo | null` — if `now ≥ returnAt`: cargo = haul (+ discovery reward on first visit: wreck metal +200, firefly glow +5), voyage = null; returns new cargo. Called at the start of `tick` and `applyOffline`.
- `unloadBoat(s): Cargo | null` — moves haul into materials, marks discovered, clears cargo. Second call → null.

- [ ] Tests: cannot build before light 3; build deducts cost once; wreck voyage at speed 1 lasts 15 min; `settleVoyage` before returnAt → null; at returnAt → cargo with metal > wood; first wreck unload marks discovered and includes +200 metal; second unload null; firefly haul has glow `2+cargo` (+5 first time); clock earlier than departAt → not settled; `applyOffline` 10 h later settles an 8 h voyage.
- [ ] Watch fail → implement → pass → commit `feat(core): boat voyages and island discovery`.

### Task 3: Art — lighthouse levels, dock, boat, map

**Files:** Create `src/ui/art/tower.ts`, `src/ui/art/boat.ts`, `src/ui/art/map.ts`; modify `src/ui/art/scene.ts` (tower → `<g class="tower-slot">`, add `<g class="dock-slot">`), `src/ui/art.ts`; test `tests/ui/art.test.ts`.

**Interfaces (produces):**
- `towerSvg(level: number): string` — 10 distinct looks: 1 weathered/cracked/dim; 2 scaffold patches; 3 cleaned; 4 repainted stripes; 5 new glass, longer beam; 6 brass gallery; 7 gold-green lens; 8 pennants; 9 gold dome; 10 halo + double beam. Beam length/brightness grows per level.
- `dockSvg(): string` — pier extending right of the platform (x 262–322).
- `BOAT_POS = { x: 300, y: 462 }`; `boatSvg(laden: boolean, cargoLevel: number): string` (viewBox 0 0 80 50).
- `islandIcon(d: DestId): string` (map icons).

- [ ] Tests: `towerSvg` distinct for 1..10; `boatSvg(true,1) !== boatSvg(false,1)`; front SVG contains `tower-slot` and `dock-slot`.
- [ ] Implement, screenshot all 10 tower levels, commit `feat(art): lighthouse levels, dock, boat, island icons`.

### Task 4: UI — lighthouse card, boat on the dock, sea map, unload, discovery

**Files:** Create `src/ui/seaMap.ts`; modify `src/ui/app.ts`, `src/ui/upgrades.ts`, `src/ui/offlinePopup.ts`, `src/ui/debug.ts`, `src/ui/hud.ts`, `src/ui/style.css`, `src/i18n/*.json`, `e2e/smoke.mjs`.

Behaviour:
- Panel shows net, storage, light cards (light card text: what the next level unlocks). A "海图" button above the cards (locked note until light 3); badge when cargo is waiting.
- Scene: tower slot redrawn on light change (+ sparkle); dock appears at light ≥ 3; boat button at `BOAT_POS` when built and not away; laden boat glows/bobs; tap → `unloadBoat` → fly icons + chest sound; first discovery → small dialog with island name, description and its perk.
- HUD shows glow only once the player has any.
- Map overlay (`openSeaMap`): lighthouse at centre, lit radius by light level, 4 nodes at fixed angles; reachable undiscovered = "?" with time; discovered = icon + name; out of range = dark. Tap node → details + "出航" (disabled while away/laden). While away: boat dot along the path + remaining time. Bottom: build-boat card (if not built) or speed/cargo upgrade cards.
- Toast when a voyage settles while open; offline popup mentions a returned boat.
- Debug: `+N 小时` also shifts an active voyage back by N hours; button "小船立即返航".

- [ ] e2e: debug build → light to 3 → build boat → open map → sail to wreck → "立即返航" → boat laden → tap → materials rise and discovery dialog shows → old real save untouched.
- [ ] `npm test && npm run build && npm run e2e` → pass; screenshots reviewed; commit `feat(ui): sea map, boat voyages, lighthouse upgrades`; push.
