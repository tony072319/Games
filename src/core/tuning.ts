/**
 * Every number the economy is tuned by, in one place (balance pass, 2026-11-25).
 * The simulator (tools/sim) checks the design targets against these.
 */
export const T = {
  /** Rewarded ads are not in yet: the "take double" button stays hidden until they are (author decision 1A). */
  ADS_ENABLED: false,
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
  /** Net upgrade cost grows by this each level (was 1.6; the net now reaches 40+ every sea). */
  NET_COST_GROWTH: 1.22,
  /** Lighthouse levels 7–10 cost this much more per level past 6. */
  LATE_LIGHT_MULT: 1.6,
  /** Polishing the lamp: glow it costs, how long it lasts, and how many more finds drift by. */
  POLISH_GLOW: 3,
  POLISH_MS: 30 * 60 * 1000,
  POLISH_SPAWN_BONUS: 0.6,
  /** The recycler: lighthouse level that unlocks it, source items per second per level, how much surplus it keeps. */
  RECYCLE_LIGHT: 4,
  RECYCLE_RATE: 0.5,
  RECYCLE_SURPLUS: 10,
  PLASTIC_PER_ROPE: 3,
  WOOD_PER_METAL: 5,
  /** Each star of starlight adds this to everything you make. */
  STAR_BONUS: 0.03,
  /** Starlight for leaving a sea lit is the old formula times this. */
  STAR_PASS_MULT: 1,
  /** Materials left behind turn into up to this many stars (one per tenfold). */
  MAT_STAR_CAP: 8,
  /** Talent prices by tier. */
  TALENT_COSTS: [3, 6, 12, 20] as const,
  /** Resetting talents costs this share of what was spent (at least one star). */
  RESET_SHARE: 0.1,
  /** Under the aurora at night, this share of finds are glow, worth this much each. */
  AURORA_GLOW_CHANCE: 0.15,
  AURORA_GLOW_AMOUNT: 1,
};
