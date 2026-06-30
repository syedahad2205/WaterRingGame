/**
 * Hardcoded fallback defaults for all Firebase Remote Config parameters.
 *
 * These values are used when:
 *  - The device is offline at app start
 *  - The Remote Config fetch fails for any reason
 *  - A parameter key is missing from the fetched config
 *
 * Requirements: 28.5, 28.6
 */

/** Shared HMAC salt used for global coin-event signing */
export const REMOTE_CONFIG_DEFAULT_SALT_GLOBAL = 'water-ring-v1-global';

/** Shared HMAC salt used for daily-challenge coin-event signing */
export const REMOTE_CONFIG_DEFAULT_SALT_DAILY = 'water-ring-v1-daily';

/** Coin cost for a single continue during a challenge */
export const REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST = 50;

/**
 * Magnitude of the upward water-pressure force applied to rings per button press.
 * Units: Matter.js force units per physics tick.
 */
export const REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE = 0.003;

/** Maximum number of rewarded-ad views a player may watch per calendar day */
export const REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS = 5;

/**
 * Live-ops event time windows keyed by event ID.
 * Shape: Record<string, { start: string; end: string }>
 * Empty object means no live-ops events are currently active.
 */
export const REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS: Record<string, unknown> = {};

/**
 * Minimum acceptable quality score (0.0–1.0) for generated challenges.
 * Challenges scoring below this threshold are regenerated (up to 5 retries).
 * Matches Requirement 11.5.
 */
export const REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD = 0.65;

/**
 * Bonus seconds added to the timer when a near-miss is detected
 * by the AdaptiveAssistController.
 */
export const REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS = 3;

/** Maximum number of bubble particles that may be active simultaneously in the arena */
export const REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES = 40;

/** Maximum number of ripple effects that may be active simultaneously in the arena */
export const REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES = 20;
