/**
 * Every number the economy is tuned by, in one place (balance pass, 2026-11-25).
 * The simulator (tools/sim) checks the design targets against these.
 */
export const T = {
  /** A tap on a drifting find pays this many seconds of current income. */
  TAP_SECONDS: 12,
  /** At deep night a tap pays this much more… */
  NIGHT_TAP_BONUS: 0.5,
  /** …and finds drift by this much more often. */
  NIGHT_SPAWN_BONUS: 0.5,
  /** A trip brings this share of the net's catch for the same minutes, before cargo. */
  BOAT_BASE: 0.7,
  /** Each cargo level adds this to the haul. */
  CARGO_STEP: 0.08,
  /** Each speed level shortens trips by this. */
  SPEED_STEP: 0.02,
  /** Each lighthouse level above 1 brings the boat home this much sooner. */
  LIGHT_RETURN: 0.03,
  /** Each level of an island producer makes this share of the net's own catch (before the sea's richness). */
  BUILDING_PCT: 0.04,
};
