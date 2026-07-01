/**
 * Remote Config Defaults — single source of truth for all server-configurable values.
 * These defaults are used when Remote Config hasn't fetched yet or is unavailable.
 * Every economy value, difficulty parameter, and feature flag should live here.
 *
 * Requirements: 28.5, 28.6
 */

export const RC_DEFAULTS = {
  // Economy — Coin rewards
  coins_per_star: 50,
  coins_per_perfect: 100,
  coins_per_challenge_complete: 25,
  coins_per_daily_challenge: 200,
  coins_first_clear_bonus: 100,

  // Economy — Continue
  base_continue_cost: 50,

  // Economy — Ad rewards
  ad_rewarded_coin_amount: 50,
  ad_rewarded_xp_boost_minutes: 30,

  // Economy — Packs
  coin_pack_small_amount: 500,
  coin_pack_medium_amount: 1500,
  coin_pack_large_amount: 5000,
  coin_pack_xl_amount: 15000,
  gem_pack_small_amount: 50,
  gem_pack_large_amount: 200,

  // Ads — Frequency
  ad_rewarded_daily_limit: 5,
  ad_interstitial_daily_limit: 3,
  ad_rewarded_cooldown_ms: 300000,
  ad_interstitial_cooldown_ms: 600000,
  ad_interstitial_game_interval: 3,

  // Gameplay — Difficulty
  base_water_force: 0.002,
  timer_seconds_easy: 90,
  timer_seconds_medium: 60,
  timer_seconds_hard: 45,
  ring_count_min: 3,
  ring_count_max: 8,

  // Progression
  xp_per_star: 25,
  xp_per_challenge: 50,
  xp_per_perfect: 100,
  xp_level_base: 100,
  xp_level_multiplier: 1.15,

  // Missions
  daily_mission_count: 3,
  weekly_mission_count: 5,
  daily_mission_all_complete_bonus: 100,
  weekly_mission_all_complete_bonus: 500,

  // Daily Rewards
  streak_7_day_bonus: 500,
  streak_14_day_bonus: 1000,
  streak_30_day_bonus: 2500,

  // Physics
  quality_score_threshold: 0.65,
  near_miss_bonus_seconds: 5,
  max_active_bubbles: 30,
  max_active_ripples: 20,

  // Feature Flags
  feature_missions_enabled: true,
  feature_daily_rewards_enabled: true,
  feature_leaderboard_enabled: true,
  feature_social_enabled: false,
  feature_season_pass_enabled: false,

  // Crypto
  salt_global: 'water-ring-v1-global',
  salt_daily: 'water-ring-daily-v1',
} as const;

export type RemoteConfigKey = keyof typeof RC_DEFAULTS;

// ---------------------------------------------------------------------------
// Legacy named exports — kept for backward compatibility with existing imports.
// New code should prefer RC_DEFAULTS.<key> directly.
// ---------------------------------------------------------------------------

/** @deprecated Use RC_DEFAULTS.salt_global */
export const REMOTE_CONFIG_DEFAULT_SALT_GLOBAL = RC_DEFAULTS.salt_global;

/** @deprecated Use RC_DEFAULTS.salt_daily */
export const REMOTE_CONFIG_DEFAULT_SALT_DAILY = RC_DEFAULTS.salt_daily;

/** @deprecated Use RC_DEFAULTS.base_continue_cost */
export const REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST = RC_DEFAULTS.base_continue_cost;

/** @deprecated Use RC_DEFAULTS.base_water_force */
export const REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE = RC_DEFAULTS.base_water_force;

/** @deprecated Use RC_DEFAULTS.ad_rewarded_daily_limit */
export const REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS = RC_DEFAULTS.ad_rewarded_daily_limit;

/**
 * Live-ops event time windows keyed by event ID.
 * Shape: Record<string, { start: string; end: string }>
 * Empty object means no live-ops events are currently active.
 */
export const REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS: Record<string, unknown> = {};

/** @deprecated Use RC_DEFAULTS.quality_score_threshold */
export const REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD = RC_DEFAULTS.quality_score_threshold;

/** @deprecated Use RC_DEFAULTS.near_miss_bonus_seconds */
export const REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS = RC_DEFAULTS.near_miss_bonus_seconds;

/** @deprecated Use RC_DEFAULTS.max_active_bubbles */
export const REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES = RC_DEFAULTS.max_active_bubbles;

/** @deprecated Use RC_DEFAULTS.max_active_ripples */
export const REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES = RC_DEFAULTS.max_active_ripples;
