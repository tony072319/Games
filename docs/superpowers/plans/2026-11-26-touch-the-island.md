# Touch the Island — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-11-26-touch-the-island-design.md`

## Global Constraints
- zh + en text; keyboard reachable (hidden buttons over tapped things); e2e updated to tap the island instead of toolbar buttons.

## Review Focus
1. Every feature the toolbar opened is still reachable by tap and by keyboard (map, book, build, seas, pass).
2. A drag that starts on the island ground doesn't open the build sheet (tap only).
3. Pass light from the lighthouse only when canPassLight; otherwise the light card.
4. Old toolbar-dependent code (badges, the seas chips, mapBtn 'locked' state) removed or moved, no dead references.
5. Goal bar "follow" highlights the right island thing for every target.

### Task 1: Tags in the world
`layout.ts` Tag adds 'house' (keeper's house), 'town' (the first town place, the anchor), 'ground' (home ground, other town places, decorations). Tests: tags present; one 'town' and one 'house'.

### Task 2: App wiring, toolbar removed
`app.ts`: tapThing: house → book, town/ground → build sheet, light → pass when canPassLight; hits for house/town; glints: house when newFind, town when anything to build is affordable, light when canPass; toolbar removed (map/book/decor/seas/pass buttons); seas switcher moves into the sea map header; followGoal for 'map'/'ship'/etc. Sea map: `seas` chips. e2e updated. Build + e2e.

### Task 3: Numbers review
Sim three profiles (NORMAL, KEEN, FIRST) and a per-sea breakdown; find anything off (shares, leftovers, early pace, guiding, friends, two boats, decorations/land spend); tune; report.

### Task 4: Check and ship
Fresh review, one fix pass, push, report in Chinese.
