# "Less plain" round 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game feel alive and responsive: talking buttons, scene you can tap, a next-goal bar, an arrival report, light/fog/life in the scene that grow with the lighthouse, and a corner mode.

**Architecture:** New pure rules in `src/core/advice.ts` (affordability, time-to-afford, next-level effect, next goal, tutorial) and `src/core/arrival.ts` (arrival report lines), unit-tested. UI wiring in `src/ui/` following DESIGN.md and `theme.css` (no literals in `ui.css`). Scene art in `src/ui/art/*`, `src/ui/sea.ts`, `src/ui/style.css`.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-23-lighthouse-idle-design.md` §17 (plus the research report `reports/同类放置游戏 UI 养成 画面.md`).

## Global Constraints

- Main line: "灯越亮，海就越热闹" — scene warmth, fog retreat and ship lights scale with lighthouse light level.
- Do less, use light: no clutter; at most ~3 ambient creatures on screen at once.
- Every text through `t()` (zh + en); numbers through `formatNumber`; interface values only from `theme.css`.
- Everything tappable ≥ 44px; new dialogs use the shared `.overlay` frame and `dismiss()`.
- Old saves load unchanged (new settings fields default silently).
- "Calm" setting and `prefers-reduced-motion` both turn off the new motion.

## Review Focus

1. A material the player has no income of (glow before Firefly Isle) → eta shows "—"/far, never "Infinity 分钟" or NaN. (Task 1 test)
2. Returning after a long time with nothing new (chest empty, no boat, no islands) → no arrival dialog. (Task 2 test)
3. Tapping a scene object while a dialog is open → nothing happens behind the dialog. (Task 4, stage isolation already; e2e)
4. Corner mode on a phone, then reload → stays in corner mode with a visible way back. (Task 7 e2e)
5. Tutorial on an old save that has already played → no tutorial. (Task 2 test)

---

### Task 1: Advice rules

**Files:** Create `src/core/advice.ts`; Test `tests/core/advice.test.ts`.

**Interfaces (produces):**
- `incomePerSecond(s: GameState): Materials` — net rate × weights (current sea, starlight included); island production not included.
- `etaSeconds(s, cost: Materials): number | null` — 0 if affordable; null if any missing material has zero income; else max over missing of need/income.
- `affordState(s, cost): 'can' | 'soon' | 'far'` — can if affordable; soon if eta ≤ 600 s; else far.
- `type Effect = { kind: 'percent' | 'hours' | 'unlock' | 'end'; value?: number; key?: string }`
- `nextEffect(s, id: UpgradeId): Effect | null` — null at max. net: percent = round((autoRate(L+1)/autoRate(L) − 1)·100); storage: hours = 1; light: unlock key `upg.light.next.dock|reach|end`; speed: percent = 8 (shorter); cargo: percent = round(25/(1+0.25(L−1))).
- `type Goal = { key: string; params?: Record<string, string|number>; target: 'flotsam'|'chest'|'boat'|'net'|'storage'|'light'|'map' }`
- `nextGoal(s, now): Goal` in this order: tutorial step (stats.tutorial < 3: 0 → `goal.tapDrift`/flotsam, 1 → `goal.collectChest`/chest, 2 → `goal.mendNet`/net); boat cargo → `goal.unload`/boat; chest ≥ 50% full → `goal.collectChest`/chest; light < 3 → `goal.dock`/light; boat not built → `goal.buildBoat`/map; boat idle with a reachable island → `goal.sail`/map; light upgrade affordable → `goal.mend`{name}/light; otherwise the panel upgrade with the smallest eta → `goal.saveFor`{name, time}/that id.

- [ ] Tests: `etaSeconds` 0 when affordable; wood-only cost at net 1 (0.05 wood/s) for 30 wood with 0 → 600; glow cost before firefly → null and `affordState` 'far'; 'soon' at eta 600, 'far' at 601; `nextEffect('net', L1).value` = 120; storage hours 1; light at 2 → key `upg.light.next.dock`; null at max; `nextGoal` tutorial 0 on new game → target flotsam; tutorial done + cargo → boat; tutorial done + chest 60% → chest; light 1 rich → light.
- [ ] Fail → implement → pass → commit `feat(core): advice rules for costs, effects and goals`.

### Task 2: Arrival report + new settings

**Files:** Create `src/core/arrival.ts`; Modify `src/core/state.ts`, `src/core/save.ts`; Tests `tests/core/arrival.test.ts`, `tests/core/save.test.ts`.

**Interfaces (produces):**
- `GameState.settings` gains `calm: boolean` (default false), `mini: boolean` (default false); `stats.tutorial: number` (default 0 for new games; **3 when loading an old save with `stats.tapped > 0`**).
- `type ArrivalLine = { kind: 'away'|'chest'|'cap'|'boat'|'island'|'tip'; mats?: Materials; seconds?: number; hours?: number; dest?: DestId; key?: string; upgrade?: UpgradeId }`
- `arrivalLines(s, report: OfflineReport): ArrivalLine[]` — `away`; `chest` with s.chest if ≥1 item; `cap` with hours when report.seconds > report.creditedSeconds; `boat` with cargo haul when cargo waiting; `island` with the sum of current-sea island stores if ≥1; `tip` with the first affordable panel upgrade. Returns [] when there is nothing but `away`.

- [ ] Tests: empty new game after 3 h → []; chest filled → has chest line; capped → cap line with storage hours; cargo → boat line; old save with tapped 5 → tutorial 3; new game → tutorial 0, calm false, mini false; round-trip of calm/mini/tutorial.
- [ ] Fail → implement → pass → commit `feat(core): arrival report and settings for calm, corner mode, tutorial`.

### Task 3: Cards that speak, and feel

**Files:** Modify `src/ui/card.ts`, `src/ui/upgrades.ts`, `src/ui/ui.css`, `src/ui/theme.css`, `src/ui/hud.ts` (calm toggle in settings menu), `src/ui/app.ts`, i18n.

- `CardSpec` gains `state: 'can'|'soon'|'far'`, `eta?: string`, `effect?: string`. Card shows effect line under the title ("下一级 +20%"); buy button: can = accent + soft glow pulse (`--t-breathe`), soon = disabled look with "约 X 分钟", far = disabled.
- Light upgrade: tower slot gets class `flare` (beam/lamp brighten 600 ms) + existing sparkle.
- `.game.calm` disables the new decorative animations (same list as reduced motion for new rules).
- Settings menu gains "动画: 全部/简洁" (`settings.calm`).
- [ ] Screenshot review; `npm test && npm run build`; commit `feat(ui): upgrade cards show state, time and effect`.

### Task 4: Tappable scene, hint glints, goal bar, tutorial

**Files:** Modify `src/ui/app.ts`, `src/ui/upgrades.ts` (expose `open(id)`), `src/ui/ui.css`, `src/ui/art/scene.ts` (hit positions), i18n.

- Invisible ≥44px `.hit` buttons over the tower (scene x 160–200, y 230–432) and the net (x 30–130, y 360–480); chest and boat already tappable (chest/boat keep their collect action; long-press not needed). Tap tower/net → `panel.open(id)`: open that card, scroll into view, flash.
- `.glint` dot above tower/net/chest(storage)/boat(map) when that upgrade is `can`.
- `.goal` bar between scene and action bar: icon + text from `nextGoal`; tap → highlight target (`.spot` ring on the scene object or open the map). Tutorial advances: tap drift → 1, collect chest → 2, buy net → 3.
- [ ] e2e: new game shows goal "点一下海上漂来的东西"; after tap it changes; tapping the lighthouse opens the lighthouse card. Commit `feat(ui): tap the scene, next-goal bar and first-time steps`.

### Task 5: Arrival report dialog

**Files:** Modify `src/ui/offlinePopup.ts` (becomes the arrival dialog), `src/ui/app.ts`, `src/ui/ui.css`, i18n.

- Lines appear one by one (`--t-small` apart; all at once in calm mode). Buttons stay "收下" / "翻倍收下" (collect chest + unload boat in one go); tip line has a button that closes and opens that card.
- Shown when `arrivalLines` is non-empty and away ≥ 60 s.
- [ ] e2e: debug +8 h shows the arrival dialog with chest line and cap line. Commit `feat(ui): arrival report`.

### Task 6: Light, fog and life in the scene

**Files:** Modify `src/ui/sea.ts`, `src/ui/art/scene.ts`, `src/ui/art/tower.ts`, `src/ui/app.ts`, `src/ui/style.css`; Create `src/ui/life.ts`.

- Light level drives `--light` (0.1–1): warm water pool size and lamp glitter strength in `drawSea`, fog band opacity in front SVG (`1 − light`), beam glow.
- Grain: a 128×128 noise canvas made once → `background-image` on a `.grain` overlay (opacity 0.06, `mix-blend-mode: overlay`).
- Beam glow (blurred duplicate) and rim light on the tower's sunset side.
- Life (`life.ts`): gull on the platform (tap → flies off, returns after 20–40 s); cat on the platform by the door (blinks, tail sway); keeper silhouette in the window from light 2 (moves every ~8 s); night plankton sparkles in `drawSea` when sky.moon > 0.3; ship lights on the horizon, count = floor(light/2), slow drift, blinking.
- [ ] Screenshots at light 1 / 5 / 10, day and night; commit `feat(art): light, fog and life grow with the lighthouse`.

### Task 7: Corner mode

**Files:** Modify `src/ui/app.ts`, `src/ui/hud.ts`, `src/ui/ui.css`, i18n.

- Settings menu item "角落模式"; `.game.mini`: hides toolbar, panel, goal bar; HUD shows materials only; scene fills; a small "展开" button (44px) top-right restores. Saved in `settings.mini`.
- [ ] e2e: turn on corner mode, reload, still mini, tap 展开 → panel visible. Commit `feat(ui): corner mode`.

### Task 8: Check and ship

- [ ] Independent UI check (ui-consistency:verifying) against DESIGN.md + this plan, with screenshots; fix, recheck once.
- [ ] `npm test && npm run build && npm run e2e`; push; wait for deploy; screenshots to the user.
