# 第一阶段：灯塔基地 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-playable first slice of 《守灯人》: a dusk lighthouse on the sea, flotsam drifting past that you tap to collect, a net that auto-collects (also while offline, up to a storage cap), two upgrades, a "while you were away" popup, local autosave, zh/en text, deployed to GitHub Pages on every push.

**Architecture:** Pure game logic in `src/core/` (no DOM, fully unit-tested, mutates a single `GameState`). Rendering in `src/ui/` with plain DOM + inline SVG drawn in code + CSS animations (no game engine; an idle game is mostly UI). All display text lives in `src/i18n/zh.json` / `en.json`. Vite builds a static site that GitHub Actions deploys to Pages.

**Tech Stack:** TypeScript (strict), Vite, Vitest, Playwright (pre-installed; one smoke test), GitHub Actions + GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-23-lighthouse-idle-design.md` (sections 7.1, 7.2, 7.8, 8, 10, 11 stage 1).

## Global Constraints

- Mood: dusk/night, dark palette, quiet; animations calm, no flashing (spec §4, §8).
- No display string hard-coded in `.ts`; every string comes from `t()` with keys present in both `zh.json` and `en.json` (spec §6).
- One session loop ("collect → upgrade → close") must be doable in 1–3 minutes; offline collection summary shown on open (spec §7.1).
- No ads/IAP SDKs; the "double offline haul" button exists and is free (spec §9).
- Save is a single versioned JSON blob in `localStorage` (spec §10). Key: `lightkeeper.save`.
- Art must be replaceable later: all drawing lives in `src/ui/art.ts` behind named functions (spec §8).
- Vite `base: './'` so the build works under `https://tony072319.github.io/Games/`.
- Phone portrait first; on wide screens the game is a centered column, max-width 480px, and must still work in a small desktop window (spec §7.8).
- A debug mode (`?debug=1`) to fast-forward time, so long-term pacing can be checked (spec §7.7).

## Review Focus

1. Tab hidden for a long time, then shown again (摸鱼 pattern) → the gap is credited as offline time (respecting the cap) and the popup appears; the live loop never credits a huge `dt` uncapped. → Task 4 `tick` test + Task 9 visibility handling.
2. Device clock moved backwards (save time is in the future) → no negative gains, no crash; `lastActiveAt` resets to now. → Task 4 test.
3. Corrupted / hand-edited / missing-field save → game starts (new or repaired), old blob backed up to `lightkeeper.save.corrupt`, never a white screen. → Task 6 tests.
4. Closing the tab/app right after an upgrade → progress kept (save on `visibilitychange`→hidden and `pagehide`, plus every 10 s). → Task 9.
5. Very large numbers after long play → shown compactly (`1.2万`, `12.3K`), never as `1.2e+21` or long decimals; fractional material never shown. → Task 7 `formatNumber` tests.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `.gitignore`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build` (`tsc --noEmit && vite build`), `test` (`vitest run`), `e2e` (`node e2e/smoke.mjs`, added in Task 9).

- [ ] **Step 1:** Create `package.json` (private, `"type": "module"`), devDependencies `typescript`, `vite`, `vitest`. `tsconfig.json` strict, `target ES2020`, `moduleResolution bundler`, `resolveJsonModule true`. `vite.config.ts` with `base: './'` and Vitest `environment: 'node'`. `.gitignore`: `node_modules`, `dist`.
- [ ] **Step 2:** `index.html` with `<div id="app">`, viewport meta `width=device-width, initial-scale=1, viewport-fit=cover`, title `守灯人 Lightkeeper`; `src/main.ts` writes nothing yet but imports cleanly.
- [ ] **Step 3:** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`.
- [ ] **Step 4:** Run `npm install && npm test && npm run build` → tests pass, `dist/index.html` exists.
- [ ] **Step 5:** Commit `chore: scaffold Vite + TypeScript + Vitest`.

---

### Task 2: Game data and state

**Files:**
- Create: `src/core/data.ts`, `src/core/state.ts`
- Test: `tests/core/state.test.ts`

**Interfaces:**
- Produces (`data.ts`):
  - `type MaterialId = 'wood' | 'plastic' | 'rope' | 'metal'`
  - `const MATERIALS: readonly MaterialId[]` (that order)
  - `type Materials = Record<MaterialId, number>`
  - `const MATERIAL_WEIGHTS: Materials = { wood: 0.5, plastic: 0.3, rope: 0.15, metal: 0.05 }`
  - `type UpgradeId = 'net' | 'storage'`; `const UPGRADES: readonly UpgradeId[]`
  - `const MAX_LEVEL: Record<UpgradeId, number> = { net: 50, storage: 11 }`
  - Flotsam constants: `SPAWN_INTERVAL_MS = 3000`, `MAX_FLOATING = 6`, `FLOAT_LIFETIME_MS = 12000`
  - `OFFLINE_MIN_REPORT_SECONDS = 60`, `LIVE_DT_MAX_SECONDS = 5`, `AUTOSAVE_MS = 10000`
- Produces (`state.ts`):
  - `type Lang = 'zh' | 'en'`
  - `interface GameState { version: 1; materials: Materials; levels: Record<UpgradeId, number>; lastActiveAt: number /* epoch ms */; settings: { lang: Lang }; stats: { tapped: number } }`
  - `newGame(nowMs: number, lang: Lang): GameState`
  - `emptyMaterials(): Materials`

- [ ] **Step 1: Failing test** — `newGame(1000, 'zh')` has all materials `0`, `levels` `{ net: 1, storage: 1 }`, `lastActiveAt === 1000`, `settings.lang === 'zh'`, `version === 1`; weights sum to `1` (`toBeCloseTo`).
- [ ] **Step 2:** `npm test` → FAIL (module missing).
- [ ] **Step 3:** Implement the two files with the values above.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(core): game data and state`.

---

### Task 3: Economy (rates, caps, costs, buying)

**Files:**
- Create: `src/core/economy.ts`
- Test: `tests/core/economy.test.ts`

**Interfaces:**
- Consumes: Task 2 types/constants.
- Produces:
  - `autoRate(netLevel: number): number` — items/second = `0.1 * L * 1.1^(L-1)`
  - `offlineCapSeconds(storageLevel: number): number` — `(1 + L) * 3600` (L1 = 2 h, L11 = 12 h)
  - `tapYield(netLevel: number): number` — `Math.max(1, Math.round(autoRate(L) * 10))`
  - `upgradeCost(id: UpgradeId, currentLevel: number): Materials` (cost to go L → L+1, each entry `Math.ceil`):
    - net: wood `15·1.6^(L-1)`; rope `5·1.6^(L-3)` if L ≥ 3 else 0; metal `2·1.6^(L-6)` if L ≥ 6 else 0; plastic 0
    - storage: wood `30·1.8^(L-1)`; plastic `10·1.8^(L-1)`; rope 0; metal 0
  - `canBuy(state: GameState, id: UpgradeId): boolean` — false at `MAX_LEVEL`
  - `buyUpgrade(state: GameState, id: UpgradeId): boolean` — deducts cost, increments level, returns success; no change on failure
  - `addMaterials(state: GameState, gained: Materials, factor?: number): void`

- [ ] **Step 1: Failing tests:**
  - `autoRate(1)` = `0.1`; `autoRate(2)` ≈ `0.22`
  - `offlineCapSeconds(1)` = `7200`; `offlineCapSeconds(11)` = `43200`
  - `tapYield(1)` = `1`
  - `upgradeCost('net', 1)` = `{ wood: 15, plastic: 0, rope: 0, metal: 0 }`; `upgradeCost('net', 3)` = `{ wood: 39, plastic: 0, rope: 5, metal: 0 }`; `upgradeCost('storage', 1)` = `{ wood: 30, plastic: 10, rope: 0, metal: 0 }`
  - with wood 15: `buyUpgrade(s,'net')` → `true`, net level 2, wood 0; again → `false`, unchanged
  - at storage level 11 with huge materials: `canBuy` false, `buyUpgrade` false
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(core): economy formulas and upgrades`.

---

### Task 4: Simulation (live tick + offline)

**Files:**
- Create: `src/core/sim.ts`
- Test: `tests/core/sim.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `interface OfflineReport { seconds: number; creditedSeconds: number; gained: Materials }`
  - `expectedGain(netLevel: number, seconds: number): Materials` — `autoRate·seconds·weight` per material (fractional; state stores fractions, UI floors)
  - `applyOffline(state: GameState, nowMs: number): OfflineReport` — elapsed = `(now − lastActiveAt)/1000`; if negative → 0; credited = `min(elapsed, offlineCapSeconds(storage))`; adds gain; sets `lastActiveAt = now`
  - `claimDouble(state: GameState, report: OfflineReport): void` — adds `report.gained` once more
  - `tick(state: GameState, nowMs: number): OfflineReport | null` — if `now − lastActiveAt` ≤ `LIVE_DT_MAX_SECONDS`·1000, add `expectedGain` for that dt, set `lastActiveAt = now`, return `null`; otherwise delegate to `applyOffline` and return its report

- [ ] **Step 1: Failing tests:**
  - new game at t=0, `applyOffline(s, 3h)` → `seconds 10800`, `creditedSeconds 7200`, gained wood `360`, plastic `216`, rope `108`, metal `36` (`toBeCloseTo`), state materials equal those, `lastActiveAt` = 3 h
  - `claimDouble` after that → wood `720`
  - clock backwards: `lastActiveAt = 10_000`, `applyOffline(s, 5_000)` → `seconds 0`, gains all 0, `lastActiveAt === 5_000`
  - `tick(s, 1000)` from 0 → returns `null`, wood ≈ `0.05`
  - `tick(s, 60_000)` from 0 → returns report with `creditedSeconds 60`
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(core): live tick and offline earnings`.

---

### Task 5: Flotsam (drifting items you tap)

**Files:**
- Create: `src/core/flotsam.ts`
- Test: `tests/core/flotsam.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `interface FloatingItem { id: number; material: MaterialId; spawnedAt: number; lane: number /* 0..1, vertical position band */ }`
  - `interface FlotsamField { items: FloatingItem[]; nextId: number; lastSpawnAt: number }`
  - `newField(nowMs: number): FlotsamField`
  - `pickMaterial(r: number): MaterialId` — r in [0,1), cumulative over `MATERIAL_WEIGHTS` in `MATERIALS` order
  - `updateField(field: FlotsamField, nowMs: number, rng: () => number): void` — drop items older than `FLOAT_LIFETIME_MS`; spawn at most one item per `SPAWN_INTERVAL_MS` while count < `MAX_FLOATING`
  - `collect(field: FlotsamField, state: GameState, id: number): { material: MaterialId; amount: number } | null` — removes item, adds `tapYield(net)` of its material, increments `stats.tapped`; `null` if id not present (double-tap safe)

- [ ] **Step 1: Failing tests:**
  - `pickMaterial(0)` wood, `(0.55)` plastic, `(0.85)` rope, `(0.99)` metal
  - field at 0; `updateField(f, 3000, () => 0)` → 1 item; repeated every 3000 ms up to 30000 → never more than 6
  - item spawned at 3000 is gone at `3000 + 12001`
  - `collect` existing id → `{ material: 'wood', amount: 1 }`, wood +1, `stats.tapped` 1; same id again → `null`, wood unchanged
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(core): drifting flotsam`.

---

### Task 6: Save / load

**Files:**
- Create: `src/core/save.ts`
- Test: `tests/core/save.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `const SAVE_KEY = 'lightkeeper.save'`, `const CORRUPT_KEY = 'lightkeeper.save.corrupt'`
  - `interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }`
  - `saveGame(kv: KV, state: GameState): void` — JSON
  - `loadGame(kv: KV, nowMs: number, lang: Lang): { state: GameState; status: 'new' | 'loaded' | 'repaired' | 'corrupt' }`
    - no save → `newGame`, `'new'`
    - unparsable JSON, non-object, or `version` not `1` → copy raw to `CORRUPT_KEY`, `newGame`, `'corrupt'`
    - parsable v1 with missing/invalid fields → start from `newGame` and copy over each valid field (material: finite ≥ 0; level: integer in `[1, MAX_LEVEL]`; `lastActiveAt`: finite; lang in `zh|en`), `'repaired'` if anything was dropped, else `'loaded'`

- [ ] **Step 1: Failing tests** (in-memory `KV` from a `Map`):
  - round trip: modified state saved then loaded → deep equal, `'loaded'`
  - empty KV → `'new'`
  - `'{oops'` → `'corrupt'`, `CORRUPT_KEY` holds `'{oops'`
  - `{"version":1,"materials":{"wood":-5,"rope":3},"levels":{"net":999}}` → wood 0, rope 3, net 1, `'repaired'`
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(core): versioned save with repair`.

---

### Task 7: Text (zh/en) and number formatting

**Files:**
- Create: `src/i18n/index.ts`, `src/i18n/zh.json`, `src/i18n/en.json`
- Test: `tests/i18n.test.ts`

**Interfaces:**
- Consumes: `Lang` from Task 2.
- Produces:
  - `detectLang(navLangs: readonly string[]): Lang` — first entry starting with `zh` → `'zh'`, else `'en'`
  - `t(lang: Lang, key: string, params?: Record<string, string | number>): string` — replaces `{name}`; missing key returns the key
  - `formatNumber(n: number, lang: Lang): string` — floors; below 10 000 plain integer; zh: `万` (1e4), `亿` (1e8), then `e` notation above 1e16 as `1.23e16`; en: `K`/`M`/`B`/`T`, then `1.23e15`; one decimal for compact forms, trailing `.0` dropped
  - Keys (both files, identical set): `game.title`, `mat.wood|plastic|rope|metal`, `upg.net.name`, `upg.net.desc` (uses `{rate}`), `upg.storage.name`, `upg.storage.desc` (uses `{hours}`), `ui.level` (`{level}`), `ui.max`, `ui.buy`, `ui.perHour` (`{n}`), `offline.title`, `offline.away` (`{time}`), `offline.capped`, `offline.collect`, `offline.double`, `time.hm` (`{h}`,`{m}`), `time.m` (`{m}`), `settings.lang`, `save.corrupt`. Chinese copy: calm, a little lonely (e.g. `offline.title` = `潮水退去之后`, en = `When the tide went out`).

- [ ] **Step 1: Failing tests:**
  - `detectLang(['zh-CN'])` zh; `(['en-US','zh'])` en; `([])` en
  - `t('en','ui.level',{level:3})` contains `3`; `t('zh','nope')` === `'nope'`
  - zh and en key sets equal (`Object.keys` sorted)
  - `formatNumber(9999.9,'zh')` `'9999'`; `(12345,'zh')` `'1.2万'`; `(12345,'en')` `'12.3K'`; `(2e8,'zh')` `'2亿'`; `(1e21,'en')` matches `/e21$/`
- [ ] **Step 2:** FAIL. **Step 3:** Implement and write all copy. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(i18n): zh/en text and number formatting`.

---

### Task 8: Art (SVG drawn in code)

**Files:**
- Create: `src/ui/art.ts`, `src/ui/style.css`
- Test: `tests/ui/art.test.ts`

**Interfaces:**
- Produces (each returns an SVG markup string):
  - `sceneSvg(): string` — dusk sky gradient (deep indigo → muted orange at horizon), a few stars, lighthouse with lamp room on a small rock + wooden platform, sea with 2–3 layered wave paths; elements carrying classes `beam`, `wave-1`, `wave-2`, `lamp` for CSS animation; root `viewBox="0 0 360 640"`
  - `itemIcon(m: MaterialId): string` — small icons (plank, bottle, coiled rope, gear/bolt), `viewBox="0 0 32 32"`
  - `style.css`: palette as CSS variables (`--sky-top`, `--sky-horizon`, `--sea`, `--lamp`, `--ui-bg`, `--ui-text`); slow keyframes: beam sweep ~8 s, waves bob ~6 s, items drift left→right over 12 s with gentle bob; `prefers-reduced-motion` disables them

- [ ] **Step 1: Failing tests:** `sceneSvg()` starts with `<svg`, contains `class="beam"` and `viewBox="0 0 360 640"`; `itemIcon` for each material starts with `<svg`, and the four strings are distinct.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(ui): code-drawn dusk lighthouse art`.

---

### Task 9: Playable screen (wiring, loop, popup, debug)

**Files:**
- Create: `src/ui/app.ts`, `src/ui/hud.ts`, `src/ui/upgrades.ts`, `src/ui/offlinePopup.ts`, `src/ui/debug.ts`, `e2e/smoke.mjs`
- Modify: `src/main.ts`, `index.html`, `package.json` (add `e2e` script)

**Interfaces:**
- Consumes: everything above.
- Produces: `startApp(root: HTMLElement, opts: { now: () => number; kv: KV; navLangs: readonly string[]; debug: boolean }): void` (`main.ts` passes `Date.now`, `localStorage`, `navigator.languages`, and `?debug=1`).

Behavior (layout per spec §7.8):
- Top HUD: four materials with icons, values via `formatNumber`; small language toggle (zh/en) that saves.
- Middle: `sceneSvg()`; a flotsam layer of `<button>` elements with `itemIcon`, positioned by `lane`, drifting via CSS; tap → `collect`, small "+N" float text that fades.
- Bottom panel: one card per upgrade: name, level, description with current value (`/小时` rate, cap hours), cost per material (unaffordable parts dimmed), buy button disabled when `!canBuy`; shows `ui.max` at max.
- Loop: `requestAnimationFrame` → `tick` + `updateField` + re-render numbers (cheap: update text nodes, rebuild cards only on level/affordability change). If `tick` returns a report with `creditedSeconds ≥ OFFLINE_MIN_REPORT_SECONDS`, show the popup.
- On start: `loadGame` → `applyOffline` → popup if ≥ 60 s (shows time away, "capped" note when `seconds > creditedSeconds`, gains, buttons **收下** and **翻倍收下**; double calls `claimDouble`). If status `'corrupt'`, show `save.corrupt` note once.
- Saving: every `AUTOSAVE_MS`, after each purchase, on `visibilitychange` → hidden, and on `pagehide`.
- Debug (`?debug=1`): small panel with "+1 小时", "+8 小时" (shifts `lastActiveAt` back so the next tick yields an offline report) and "+1000 全部材料".

- [ ] **Step 1:** Implement the modules above.
- [ ] **Step 2:** `npm run build` → no type errors.
- [ ] **Step 3: e2e smoke** (`e2e/smoke.mjs`, Playwright, runs against `vite preview`): open on a 390×844 viewport; HUD shows 4 materials; wait ≤ 4 s for a flotsam button and click it → wood/plastic/rope/metal total increases; open `?debug=1`, click "+1000", buy net → level text shows 2; click "+8 小时" → popup visible, click double → popup closes; reload → net level still 2. Save screenshots (deviceScaleFactor 2) to the scratchpad for review.
- [ ] **Step 4:** `npm test && npm run e2e` → all pass.
- [ ] **Step 5:** Commit `feat(ui): playable lighthouse base`.

---

### Task 10: Deploy to GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: `npm test`, `npm run build` producing `dist/`.

- [ ] **Step 1:** Workflow: on push to `main` and `claude/**`, plus `workflow_dispatch`; jobs: `npm ci` → `npm test` → `npm run build` → `actions/upload-pages-artifact` (`dist`) → `actions/deploy-pages`. Permissions `pages: write`, `id-token: write`; `concurrency: pages`.
- [ ] **Step 2:** `README.md` in Chinese: what the game is, the play URL `https://tony072319.github.io/Games/`, and the one-time steps for the owner — make the repo public (Settings → General → Danger Zone → Change visibility) and set Settings → Pages → Source = "GitHub Actions"; note that if Pages only allows the default branch, set this branch as default or merge to `main`.
- [ ] **Step 3:** `npm ci && npm test && npm run build` locally → pass.
- [ ] **Step 4:** Commit `ci: deploy to GitHub Pages`, push the branch.
