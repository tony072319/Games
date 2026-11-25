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
  BOAT_BASE: 0.459,
  /** Each cargo level adds this to the haul. */
  CARGO_STEP: 0.08,
  /** Each speed level shortens trips by this. */
  SPEED_STEP: 0.02,
  /** Each lighthouse level above 1 brings the boat home this much sooner. */
  LIGHT_RETURN: 0.03,
  /** Each level of an island producer makes this share of the net's own catch (before the sea's richness). */
  BUILDING_PCT: 0.0724,
  /** Net upgrade cost grows by this each level (was 1.6; the net now reaches 40+ every sea). */
  NET_COST_GROWTH: 1.4,
  /** Lighthouse levels 7–10 cost this much more per level past 6. */
  LATE_LIGHT_MULT: 3.31,
  /** Polishing the lamp: glow it costs, how long it lasts, and how many more finds drift by. */
  /** From this lighthouse level on, each level is mended in this many parts (same total price). */
  LIGHT_PARTS: 4,
  /** Island decorations: price of the first one, and how much dearer each next one is. */
  DECOR_BASE: 304,
  DECOR_GROWTH: 1.3,
  /** Decorations open with the dock (lighthouse level 3), after the first steps. */
  DECOR_FROM_LIGHT: 3,
  /** Expanding the island: the first tile's price and how much dearer each next one is. */
  LAND_BASE: 400,
  LAND_GROWTH: 1.15,
  LIGHT_PARTS_FROM: 5,
  POLISH_GLOW: 3,
  POLISH_MS: 30 * 60 * 1000,
  POLISH_SPAWN_BONUS: 0.6,
  /** The recycler: lighthouse level that unlocks it, source items per second per level, how much surplus it keeps. */
  RECYCLE_LIGHT: 4,
  RECYCLE_RATE: 0.3,
  RECYCLE_SURPLUS: 10,
  PLASTIC_PER_ROPE: 3,
  WOOD_PER_METAL: 5,
  /** Each star of starlight adds this to everything you make. */
  STAR_BONUS: 0.00395,
  /** Starlight for leaving a sea lit is the old formula times this. */
  STAR_PASS_MULT: 0.275,
  /** Materials left behind turn into up to this many stars (one per tenfold). */
  MAT_STAR_CAP: 8,
  /** Talent prices by tier. */
  TALENT_COSTS: [2, 4, 8, 14],
  /** Resetting talents costs this share of what was spent (at least one star). */
  RESET_SHARE: 0.1,
  /** Under the aurora at night, this share of finds are glow, worth this much each. */
  AURORA_GLOW_CHANCE: 0.15,
  AURORA_GLOW_AMOUNT: 1,
  /** Each sea's richness and the price of mending there, relative to the dusk sea. */
  FOG_RATE: 1.77,
  FOG_COST: 12.5,
  AURORA_RATE: 3.4,
  AURORA_COST: 71,
  /** Lighthouse price: all of it scaled by this, growing by LIGHT_GROWTH a level. */
  LIGHT_COST_MULT: 0.95,
  LIGHT_GROWTH: 2.75,
  /** Talent prices are TALENT_COSTS times this. */
  TALENT_COST_SCALE: 1,
};
