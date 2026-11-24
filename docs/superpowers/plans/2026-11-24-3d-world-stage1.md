# 3D World, Stage 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat SVG/canvas scene with a three.js world in the sample-G look (soft toon light, turquoise shallows with foam, pastel sky, warm glows, little people and pets), with everything the game has today shown and tappable in it. No new rules.

**Architecture:** A pure `src/world/layout.ts` turns `GameState` into a list of world items (model, place, size, tag); a renderer in `src/world/scene.ts` diffs that list into a three.js scene and adds sky, water, light, bloom and ambient life. The existing DOM buttons (chest, boat, hit areas, flotsam, bubbles, glints) stay — invisible over the 3D objects — and are positioned each frame from `world.anchor(tag)`, so click logic, accessibility labels and the e2e selectors keep working. Dialogs (sea map, island view, book, tree, arrival) are unchanged.

**Tech Stack:** TypeScript, Vite, three.js (npm `three` pinned to 0.170.0, MIT), Vitest, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-11-24-3d-world-design.md` (§1.5 look = sample G, §2 goals, §6 lit sea, §7 camera, §10 per-level looks, §11 tech, §12 stage 1, §13 assets). Reference sample: `public/look/g-cozy.html` (day) and `?night`.

## Differences from the spec (Claude's call, for this stage only)

- The sea-map and island dialogs and the upgrade card list stay as they are in stage 1; the world opens them (tap an island → its dialog). Folding them into bottom sheets over the world (spec §6, §8) comes right after, as stage 1b, so this stage changes how things look without also changing how menus work.

## Global Constraints

- Look = sample G: pastel gradient sky (not a photo sky), toon shading with a 4-step ramp `[150,200,235,255]`, warm colour multiply `(1,.97,.93)`, soft shadows, gentle bloom (day strength .32, night .5, threshold .97), turquoise shallows → blue deep, sand rim, white foam bands.
- Every upgrade level looks different in the world (spec §10).
- Old saves load unchanged; no new save fields in stage 1.
- All text through `t()` (zh + en); interface values only from `theme.css`; existing shared pieces (`.overlay`, cards, `.btn-*`).
- Only assets with a written commercial licence; each pack's licence file is copied next to its models in `public/models/<pack>/`; raw zips never enter the repo.
- Pixel ratio ≤ 2; shadow map 2048 desktop / 1024 when `innerWidth < 600`; no rendering while the page is hidden.
- Calm setting / `prefers-reduced-motion`: no auto-rotate, no camera inertia, water/flag/smoke motion slowed to 25%, 30 fps cap.
- Debug build (`?debug=1`) keeps working, including time ×1000.

## Review Focus

1. Phone puts the tab in the background and the WebGL context is lost → on return the world rebuilds itself; no blank canvas, no reload needed. (Task 4 test: simulate `webglcontextlost`/`restored`.)
2. A finger drag that rotates the camera starts on the chest/boat/flotsam button → it rotates, it does not collect. A short tap (< 8 px, < 300 ms) still collects. (Task 6 e2e.)
3. A model file fails to load (404/offline) → the game still starts; missing model is skipped and logged once; loading screen never hangs past 10 s. (Task 4 test with a bad path.)
4. Wide desktop / very short landscape window → anchors that project off-screen hide their bubble/glint instead of drawing outside the stage; glints never under the HUD. (Task 6 e2e at 1280×600.)
5. Switching sea or language rebuilds the world without leaking: geometries/materials of the old scene are disposed (renderer.info.memory returns to the same counts ±5). (Task 4 test.)

---

### Task 1: Assets in the repo + registry

**Files:**
- Create: `public/models/<pack>/…` (selected files only, see list), `public/models/<pack>/LICENSE.txt`
- Create: `src/world/assets.ts`
- Test: `tests/world/assets.test.ts`
- Modify: `package.json` (add `"three": "0.170.0"` to dependencies; `@types/three` 0.170 to devDependencies)

Source folders (scratchpad `dl/…`, re-downloadable with `itchpw.cjs` / OpenGameArt URLs in spec §13): reodesuxz Lighthouse, Harbor, Viking, Nature, IslandHuts, Tiki, Underwater, Volcano, Winter; KayKit Hexagon; Kenney Pirate, Mini Characters, Cube Pets (each with its own `Textures/colormap.png` folder — keep per-pack folders so the shared name never collides); Quaternius Fish (`Whale.fbx`, `Dolphin.fbx`).

**Interfaces:**
- Produces: `type ModelId = string` (e.g. `'lh/lighthouse_tall'`); `MODELS: Record<ModelId, { url: string; fit: 'height' | 'len'; size: number; anim?: string }>` — `size` is the default world size; `modelUrl(id)`; `ALL_MODEL_IDS`.

- [ ] **Step 1:** Write `tests/world/assets.test.ts`: every `MODELS[id].url` exists under `public/` (use `fs.existsSync`); every pack folder that has a model also has `LICENSE.txt`; total size of `public/models` < 12 MB.
- [ ] **Step 2:** Run `npx vitest run tests/world/assets.test.ts` → FAIL (module missing).
- [ ] **Step 3:** Copy the models the layout (Task 3) uses into `public/models/`, add licences, write `assets.ts`. Downscale any texture > 512 px with PIL.
- [ ] **Step 4:** `npm install` then the test → PASS; `npm run build` passes.
- [ ] **Step 5:** Commit `feat(world): model library with licences`.

### Task 2: Hex geometry and the lit sea

**Files:** Create `src/world/hex.ts`; Test `tests/world/hex.test.ts`.

**Interfaces:**
- Produces:
  - `TILE_W = 2`, `TILE_D = 2.3094` (KayKit tile, pointy along z); `hexToWorld(q: number, r: number): [x: number, z: number]` = `[TILE_W*(q + r/2), TILE_D*0.75*r]`; `hexDist(q,r)`; `ring(n): [q,r][]`.
  - `HOME_TILES: [q,r][]` = centre + ring(1) (7 tiles).
  - `litRadius(light: number): number` = `light + 2` (hexes); `litRadiusWorld(light)` = `litRadius(light) * TILE_W`.
  - `DEST_HEX: Record<DestId, [q,r]>` = wreck `[-5, 2]`… chosen so `hexDist` = wreck 5, gullrock 6, oldlight 7, firefly 8, at four different bearings, none on the pier side (q>0, r>0 quadrant).
  - `PIER_DIR = [0.55, 1]` (normalised in use), pier starts at `hexToWorld(1, 1)` edge.

- [ ] **Step 1:** Tests: `hexToWorld(1,0)` = `[2,0]`; `ring(1).length` = 6, `ring(2).length` = 12; `hexDist` of each `DEST_HEX` equals `DESTS[d].needLight + 2`; `litRadius(3) >= hexDist(DEST_HEX.wreck)` and `litRadius(2) < hexDist(DEST_HEX.wreck)`; no two destinations within 3 hexes of each other.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit `feat(world): hex grid and lit radius`.

### Task 3: World layout (pure)

**Files:** Create `src/world/layout.ts`, `src/world/looks.ts` (per-level tables); Test `tests/world/layout.test.ts`.

**Interfaces:**
- Consumes: `MODELS` (Task 1), hex helpers (Task 2), `GameState`, `DESTS`, `ISLAND_BUILDINGS`, `buildingLevel`, `NET_MILESTONES`.
- Produces:
  - `type Tag = 'light' | 'net' | 'chest' | 'boat' | 'dock' | \`island:${DestId}\` | \`bld:${BuildingId}\``
  - `interface WorldItem { key: string; model: ModelId; x: number; y: number; z: number; rotY: number; size?: number; tint?: number; tag?: Tag; glow?: 'lamp' | 'window' | 'lantern' | 'fire'; bob?: boolean; anim?: string }`
  - `worldLayout(s: GameState, nowMs: number): WorldItem[]` — `key` is stable for the same thing at the same look (e.g. `light:7:body`), so the renderer can diff.
  - `boatPosition(s: GameState, nowMs: number): { x: number; z: number; rotY: number; atDock: boolean }` — at the dock when no voyage; along the straight line pier-end → `DEST_HEX` and back, progress from `departAt/returnAt` (out for the first half, back for the second), clamped to [0,1] when the clock is before `departAt` or after `returnAt`.
  - `flotsamPosition(item: FloatingItem, nowMs: number): { x: number; z: number }` — drifts across the lit sea in front of the island, lane 0 far (z ≈ 6) to lane 1 near (z ≈ 11), x from −14 to +14 over `FLOAT_LIFETIME_MS`.
- `looks.ts` holds the per-level tables (spec §10), e.g. `LIGHT_LOOKS[1..10]`: 1 `lh/lighthouse_small` tinted `0x8a8090` + `kk/building_scaffolding`; 2 small + half scaffold + crates; 3 small clean + dock; 4 small + `lh/signal_lamp_post`; 5 `lh/lighthouse_tall`; 6 tall + `lh/fog_horn` + `lh/telescope_stand`; 7 tall + `kk/flag_red`; 8 tall + `tiki/string_lights`; 9 tall with gold-tinted top (`tint 0xffd27a` on a second lamp ring item); 10 tall + halo item + `beam: 2`. `NET_LOOKS` by milestone (0: `lh/fishing_net_pile`; ≥10 + `harbor/fishing_rod_rack`; ≥20 + `viking/fish_drying_rack`; ≥30 + `harbor/harbor_crane`; ≥40 + `harbor/fish_market_stall`; 50 + `lh/fishing_boat` moored) and net pile `size` = `0.35 + 0.01 * level`. `CHEST_LOOKS[1..11]`. `BOAT_LOOK(speed, cargo)`: `kenney/boat-row-small` → `harbor/sailboat` when speed ≥ 4 → `kenney/ship-small` when speed + cargo ≥ 12; laden adds `kk/crate_A_small` items. Island building looks: level 0 none, 1 `kk/building_stage_A`, 2 `kk/building_stage_C`, 3–5 the building model with +1/+2 props.
  - Life items (not tags): keeper `chars/character-male-a` anim `idle` at the house door from light ≥ 2; cat from light ≥ 1; chick from light ≥ 4; parrot on the flag from light ≥ 7; girl sitting on the pier end once the dock exists.

- [ ] **Step 1:** Tests:
  - new game → items include tag `light`, `net`, `chest`; no tag `dock`, no `boat`; no `island:*` with a building.
  - `levels.light` 1..10 → the set of models with keys starting `light:` is different for every level (10 distinct sets).
  - light 3 → has tag `dock`; light 2 → none.
  - boat built, no voyage → tag `boat`; voyage active → no item tagged `boat` (it is drawn by `boatPosition`), cargo waiting → boat item plus at least one crate item.
  - `wreck` discovered with `dismantler` 1 → item key `bld:dismantler:1`, model `kk/building_stage_A`; level 3 → model is the dismantler model.
  - undiscovered `gullrock` with light 4 → item tagged `island:gullrock` using the silhouette tint `0x556070`; light 3 → no gullrock item at all.
  - every `item.model` is a key of `MODELS`; all `key`s in one layout are unique.
  - `boatPosition` with clock before `departAt` → at the pier end, `atDock` false; at `returnAt` → at the pier end; at the midpoint → at the destination hex (±0.5).
  - `flotsamPosition` at spawn → x = −14; at `spawnedAt + FLOAT_LIFETIME_MS` → x = 14; never NaN for lane 0/1.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS. **Step 5:** Commit `feat(world): layout from game state`.

### Task 4: Renderer

**Files:** Create `src/world/scene.ts`, `src/world/water.ts`, `src/world/sky3d.ts`, `src/world/toon.ts`, `src/world/palette.ts`, `src/world/diff.ts`; Test `tests/world/diff.test.ts`, `tests/world/palette.test.ts`.

**Interfaces:**
- Consumes: `worldLayout`, `boatPosition`, `flotsamPosition`, `MODELS`, `Sky` (`src/ui/sky.ts`), `SeaId`.
- Produces:
  - `diffItems(prev: WorldItem[], next: WorldItem[]): { add: WorldItem[]; remove: string[]; move: WorldItem[] }` (pure; move = same key, different x/y/z/rotY/size).
  - `paletteFor(sky: Sky, sea: SeaId): { top; mid; low; sun; water; shallow; foam; fog; hemiSky; hemiGround; key; keyIntensity; bloom; night: number }` — colours as numbers. `night = 1 - sky.sun` blended with `sky.moon`; at `night` 0 it equals sample G day colours, at 1 sample G `?night` colours; `fog` sea darkens and greys (`mix` 40% toward `0x6a6a80`), `aurora` cools (`mix` 35% toward `0x3a7a86`).
  - `createWorld(host: HTMLElement, opts: { calm: boolean; onReady(): void; onError(msg: string): void }): World` with
    `interface World { update(items: WorldItem[], extra: { boat: ReturnType<typeof boatPosition> | null; flotsam: { id: number; x: number; z: number; curio: boolean; material: MaterialId }[] }): void; setSky(sky: Sky, sea: SeaId): void; setLight(level: number): void; setCalm(on: boolean): void; anchor(tag: Tag | \`flotsam:${number}\`): { x: number; y: number; visible: boolean } | null; pulse(tag: Tag): void; focus(where: 'home' | 'sea' | Tag): void; resize(): void; dispose(): void; readonly has: Set<Tag> }`
  - Water shader = sample G (`g-cozy.html` water block) with shore distance from the union of circles for land tiles, pier posts, boat and rocks (max 40), plus a soft darkening beyond `litRadiusWorld(light)` and a warm ring at its edge (sample F idea, strength .18).
  - Sky = sample G gradient shader fed by `paletteFor`; stars when `night > .5`.
  - Toon: `toonMaterial(src: Material, tint?: number)` replaces every loaded material (sample G `toon()`).
  - Bloom via `EffectComposer` + `UnrealBloomPass` + `OutputPass` (three/examples/jsm).
  - Camera: `OrbitControls`, target `(0.8, 1.8, 1.6)`, distance 12–60, polar max 1.36, no pan, damping (off when calm); `focus('sea')` eases to distance `litRadiusWorld(light) * 2.2`; `focus(tag)` eases the target to that item.
  - Context loss: listen for `webglcontextlost` (preventDefault) / `webglcontextrestored` → rebuild materials and re-run `update` with the last items.
  - Loading: preload the models of the first layout; any failed model is skipped (`console.warn` once per URL); `onReady` fires after preload or after 10 s, whichever first.

- [ ] **Step 1:** Tests: `diffItems([], [a])` → add `[a]`; same item twice → nothing; moved x → `move`; removed key → `remove`. `paletteFor(dayDuskSky,'dusk').water` = `0x3aa6c9`; `night` 1 → `0x2c5f8f`; `'fog'` result's `fog` differs from `'dusk'`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement the pure parts, then `scene.ts` around them.
- [ ] **Step 4:** Unit tests PASS; render check: a scratch page `public/look/world-check.html` (not linked) mounts `createWorld` with layouts for light 1, 5, 10 and saves screenshots via `node e2e/shots-world.mjs` (Playwright, swiftshader flags `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`). Look at them: the scene must read like `g-cozy.html`.
- [ ] **Step 5:** Context-loss / bad-model / dispose checks in the same script: call `WEBGL_lose_context.loseContext()` then `restoreContext()` → canvas not blank (pixel at the lighthouse not equal to the clear colour); register a model URL that 404s → `onReady` still fires within 10 s; build world, dispose, build again → `renderer.info.memory.geometries` equal ±5.
- [ ] **Step 6:** Commit `feat(world): three.js renderer in the cozy look`.

### Task 5: Life in the world

**Files:** Create `src/world/life.ts`; Modify `src/world/scene.ts`.

**Interfaces:**
- Consumes: scene from Task 4; `paletteFor(...).night`; light level.
- Produces: `createLife(scene, opts): { update(dt: number, t: number, ctx: { night: number; light: number; calm: boolean; anchors: Record<string, Vector3> }): void; dispose(): void }`.

Behaviour (from sample G; "the brighter the light, the livelier the sea"): chimney smoke (8 soft sprites) from the keeper house; fireflies (24 points) visible when `night > .3`; gulls `min(3, 1 + floor(light/3))` circling; one fish jump with splash ring every ~8 s once light ≥ 2; ship lights on the horizon `floor(light/2)`; whale passes every 2–4 min once light ≥ 5 (Quaternius `Whale.fbx`, swim clip), dolphins pair once light ≥ 8; flags sway; boats/buoys bob; lamp/fire/torch/string-light glow pulse. Replaces `src/ui/ambient.ts` events (meteor, gull, ship, fish, whale) — meteor stays as a sky streak in `sky3d.ts` when `night > .6`. Calm: all motion speeds × .25, no whale/dolphin.

- [ ] **Step 1:** Screenshot check via `e2e/shots-world.mjs` at light 1 vs 10, day vs night: light 10 shows more gulls and ship lights; night shows fireflies and glows.
- [ ] **Step 2:** Commit `feat(world): smoke, fireflies, gulls, fish, whale`.

### Task 6: Put the world into the game

> Before this task: run `ui-consistency:finding-patterns` for the stage area (HUD, goal bar, bubbles, glints, toolbar) and keep its checklist next to this task.

**Files:** Modify `src/ui/app.ts`, `src/ui/style.css`, `src/ui/ui.css`, `src/i18n/zh.json`, `src/i18n/en.json`, `e2e/smoke.mjs`; Remove use of `sceneBackSvg`, `sceneFrontSvg`, `drawSea`, `ambientLayer`, `playAmbient`, grain; keep `src/ui/art/*` for card thumbnails and dialogs.

**Interfaces:**
- Consumes: `createWorld`, `worldLayout`, `boatPosition`, `flotsamPosition`.
- Produces (DOM contract the e2e relies on): `.stage` contains `canvas.world`; existing `.chest`, `.boat`, `.hit[data-hit="light"|"net"]`, `.item`, `.bubble`, `.glint`, `.gull` buttons stay, now transparent (`background: none`, no SVG inside except the `.bar` on the chest) and positioned each frame from `world.anchor(tag)` (hidden when `visible` false); `.stage[data-world-has]` = space-separated `world.has` tags (e2e reads `dock`).
- New: world buttons bottom-right of the stage — `.view-btn[data-view="home"]` 🏠 and `[data-view="sea"]` 🌊 (`btn-quiet`, ≥ 44 px), i18n `view.home` "回岛"/"Home", `view.sea` "看海"/"Sea".
- Tap on an island in the world (`island:*` tag picked by `world` raycast on `pointerup` without drag) → discovered: `openIsland(d)`; else `openMap()` with that node selected.
- Drag vs tap: a pointer that moves > 8 px or lasts > 300 ms is a camera drag; DOM buttons ignore it (`pointerdown` handlers move to `click`-style "tap" helper `onTap(el, fn)` in `src/ui/dom.ts`).
- `onBuy` celebration: `world.pulse(tag)` instead of `.pulse`/`.flare` classes; sparkle at `world.anchor(tag)`.
- Calm/corner mode: `world.setCalm`; corner mode shows the world only.
- No WebGL (`createWorld` throws) → stage shows `t('world.noWebgl')` ("这个浏览器画不了 3D 画面，换个浏览器试试？" / "This browser can't draw the 3D scene — try another browser?") and the rest of the game still works.

- [ ] **Step 1:** Update `e2e/smoke.mjs`: wait for `canvas.world` and `.stage[data-world-has~="light"]`; replace `.dock-slot .dock` check with `.stage[data-world-has~="dock"]`; add: drag from the chest button 120 px sideways → chest total unchanged; at 1280×600 every visible `.bubble`/`.glint` lies inside `.stage`'s rect; tapping `.view-btn[data-view="sea"]` then `home` works without errors.
- [ ] **Step 2:** `npm run build && npm run e2e` → FAIL (no world yet).
- [ ] **Step 3:** Implement the integration.
- [ ] **Step 4:** `npm test && npm run build && npm run e2e` → PASS. Screenshots (`SHOTS=…`) at 390×844 and 1280×800, zh and en, look like sample G.
- [ ] **Step 5:** Commit `feat(ui): the game plays in the 3D world`.

### Task 7: Credits

**Files:** Modify `src/ui/app.ts` (settings menu item), `src/i18n/*.json`; Create `src/ui/credits.ts`.

- Settings menu gains "素材致谢"/"Credits" → `.overlay` + `.popup` listing each pack: name, author, licence (CC0 / free commercial), link text (no live links needed). Data in `CREDITS` array in `credits.ts`, one entry per folder in `public/models` + Poly Haven not used in stage 1 (omit) + audio not used yet (omit).
- [ ] **Step 1:** Test `tests/ui/credits.test.ts`: every folder in `public/models` has a `CREDITS` entry.
- [ ] **Step 2:** FAIL → implement → PASS. **Step 3:** Commit `feat(ui): credits for the art`.

### Task 8: Check and ship

- [ ] Independent UI check (`ui-consistency:verifying`) of Task 6/7 against DESIGN.md and the checklist; fix; recheck once.
- [ ] `npm test && npm run build && npm run e2e`; screenshots: light 1/5/10, each of the three seas, day and night, phone and desktop; compare with `g-cozy.html`.
- [ ] Push to `claude/magical-lovelace-wwdgfa`; wait for the Pages deploy; send the player-facing screenshots and the link.
