# 守灯人 Lightkeeper — Design

**Read:** a quiet idle game · players who open it for a minute at work · dusk/night, a little lonely, warm lamp light on dark water · dark, tonal UI with one warm accent.

The scene is the star. The interface sits around it in dark, slightly translucent surfaces and never competes with the lighthouse's light.

All values live in `src/ui/theme.css`. Interface styles (`src/ui/ui.css`) use only those names. The scene and its animations are in `src/ui/style.css`.

## Colour roles

| Token | Use |
|---|---|
| `--c-ink` | Main text |
| `--c-ink-dim` | Descriptions, captions, secondary text |
| `--c-ink-faint` | Disabled text, missing materials in a cost |
| `--c-gold` (`--lamp`) | Light: dialog titles, highlights, focus ring, bubbles, starlight |
| `--c-accent` | **The one action colour**: primary buttons only |
| `--c-on-accent` | Text on accent or gold |
| `--c-surface-0` | Bars and panels over the scene (translucent) |
| `--c-surface-1` / `--c-surface-2` | Cards / an opened card |
| `--c-surface-dialog` | Dialogs, sheets, menus, toasts |
| `--c-scrim` | Behind dialogs |
| `--c-track` | The empty part of a progress bar |
| `--c-rare` | Border of rare finds in the book |

Rules: one accent per surface. Gold means "light" (something good, or where you are), not "press me". Never pure black or white.

## Type roles

| Role | Size | Weight | Line height |
|---|---|---|---|
| Caption (costs, levels) | `--fs-caption` 12 | 400 | tight |
| Body (descriptions, dialog text) | `--fs-body` 13 | 400 | `--lh-body` 1.45 |
| HUD numbers | `--fs-body` 13 | 600 | tight (body size so five materials fit one row) |
| Label (card titles, buttons, menu items) | `--fs-label` 15 | 600 | `--lh-tight` 1.2 |
| Title (dialog titles) | `--fs-title` 18 | 600 | tight |
| Display (the voyage between seas) | `--fs-display` 22 | 400 | `--lh-display` 1.8 |

Headings: dialog title `h2`, card or section title `h3`.

## Spacing, radius, size

- Spacing base **4**: `--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32. Tighter inside a group, looser between groups.
- Radius: `--r-sm` 8 (buttons) · `--r-md` 12 (cards, bars) · `--r-lg` 16 (dialogs, sheets) · `--r-pill` (chips, HUD, bubbles).
- Anything tappable is at least `--tap` (44px). Card pictures are `--thumb` (56px).

## Depth and motion

- Dark UI separates by tone first (surface-0 → 1 → 2 → dialog). One soft shadow, `--shadow-dialog`, for things that float. `--glow-gold` only for light.
- Cards carry `--edge-light`: a thin line of lamplight along the top edge, a hairline border (`--c-line`) and a small shadow, so they read as raised against the painted world. Primary buttons are lit from above: `--grad-accent` with `--edge-accent`. Nothing else gets a gradient.
- `--t-micro` 100ms for presses (buttons shrink with the `scale` property, so positioned buttons keep their place), `--t-small` 200ms for menus and exits, `--t-medium` 300ms for dialogs entering. Enter with `--ease-out`, leave with `--ease-in`.
- Every dialog uses the shared `.overlay` frame, so it rises in and sinks out the same way; close with `dismiss()`.
- `prefers-reduced-motion` turns animation off.

## Shared pieces

| Piece | Where | Use for |
|---|---|---|
| `upgradeCard()` | `src/ui/card.ts` | Every upgrade: picture, name + level, cost row, buy button; description hidden until tapped (always shown for island buildings and the boat builder) |
| `costRow()` | `src/ui/card.ts` | Any cost; missing materials dim |
| `.overlay` + `.popup` / `.seamap` | `ui.css`, `dismiss()` in `dom.ts` | Every dialog and sheet |
| `openMenu()` | `src/ui/dom.ts` | Small menus (settings, seas) |
| `.buy` / `.btn-primary`, `.btn-ghost` | `ui.css` | Primary and secondary actions |
| `.btn-bar` | `ui.css` | The action bar under the scene (sea chart, seas, pass the light) |
| `.btn-quiet` | `ui.css` | Icon buttons over the scene (settings) |
| `.bubble` | `ui.css` | "Something to collect here" over the chest and boat |
| `t()`, `formatNumber()` | `src/i18n` | Every word and every number the player reads |

## Layout

- Phone (portrait): HUD bar over the sky; scene; action bar; upgrade cards.
- Wide screen (≥ 900px and landscape): scene on the left, action bar and cards in a 400px column on the right.

## Don't

- Add a colour, size, radius or duration in `ui.css` that isn't a theme name.
- Write a second card, button or dialog style beside the shared one.
- Put long explanations on screen permanently; show them when asked.

- Longer loops have their own names: `--t-flash`, `--t-float`, `--t-toast`, `--t-breathe`, `--t-voyage`.
- The test build's panel uses plain values on purpose; players never see it.
