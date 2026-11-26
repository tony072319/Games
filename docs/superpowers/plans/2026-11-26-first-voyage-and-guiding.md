# First Voyage & Night Guiding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-11-26-first-voyage-and-guiding-design.md`

## Global Constraints
- `tests/sim/targets.test.ts` keeps passing; old saves load; zh + en text.

## Review Focus
1. A save made before this change, mid-voyage → loads and settles; the 3-minute trial applies only to the very first trip of a game.
2. Guiding the same ship twice, or a ship after it left, or by day → refused, no reward.
3. Ship field across the night/day boundary and after a long absence → no burst of ships, none by day.
4. The cheaper early lighthouse doesn't shorten the later seas below their targets (levels 1–2 only).
5. Tapping a ship and a drifting find in the same spot → each is its own target.

### Task 1: First voyage within ten minutes
`tuning.ts` EARLY_LIGHT_MULT (levels 1→2, 2→3), BOAT_COST_MULT; `boat.ts` trial: first voyage of a game (no island discovered in any sea, dusk) lasts T.TRIAL_MINUTES (3); sim profile `FIRST` (checks every minute for 15 min, 15 taps each, then NORMAL); test `tests/sim/firstSession.test.ts`: first voyage started ≤ 10 min; existing targets pass.

### Task 2: Passing ships at night (rules)
`core/ships.ts`: `ShipField`, `updateShips(field, now, rng)` (spawn only when nightness > 0.5, every T.SHIP_EVERY_MS ± jitter, lifetime T.SHIP_LIFE_MS, no catch-up burst), `guideShip(s, field, id, now): Materials | null` (reward = total income/s × T.GUIDE_SECONDS split by MATERIAL_WEIGHTS, glow with T.GUIDE_GLOW_CHANCE; once per ship), `shipPosition(ship, now)`. Tests.

### Task 3: Guiding in the world and the UI
World: ships drawn (model kp/ship-small) at their positions, tagged `ship:<id>` (pickable like finds); a beam mesh from the lamp at night that sweeps, and points at a guided ship for 2 s; guided ship blinks. UI: tap → guide, float the gift, toast; goal hint `goal.guide` the first night a ship is out (stats.guided = 0). Sim: NORMAL guides one ship per night-time visit. Tests (layout/world pure parts), e2e: none (night timing).

### Task 4: Check and ship
Build, e2e, screenshots (night with a ship and the beam), fresh review, one fix pass, push, report in Chinese.
