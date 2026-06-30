/**
 * Difficulty system constants.
 *
 * All numeric constants used by DifficultyCalculator are defined here using
 * SCREAMING_SNAKE_CASE as required by Requirements 8.9 and the design spec
 * (design.md § Difficulty System).
 *
 * Requirements: 11.2
 */

// ─── Two-Phase Difficulty Formula ─────────────────────────────────────────

/** Maximum difficulty score at end of Phase 1 (also the Phase 1 starting value for Phase 2). */
export const D_MAX_PHASE1 = 50.0;

/** Absolute ceiling for D(N) — Phase 2 asymptotically approaches this value. */
export const D_CEILING = 100.0;

/** Challenge number at which Phase 1 ends and Phase 2 begins. */
export const PHASE1_CAP = 1000;

/**
 * Exponential decay scale factor for Phase 2.
 * Controls how quickly D(N) approaches D_CEILING after N=1000.
 * Larger → slower approach; smaller → faster approach.
 */
export const SCALE_FACTOR = 5000;

// ─── Timer ─────────────────────────────────────────────────────────────────

/** Timer value (seconds) at difficulty D=0 (N=1). */
export const TIMER_BASE_MAX_SECONDS = 180;

/** Amount subtracted from timer across the full difficulty range. */
export const TIMER_BASE_RANGE_SECONDS = 120;

/** Minimum timer value (seconds) regardless of difficulty. */
export const TIMER_MIN_SECONDS = 45;

// ─── Ring Counts ───────────────────────────────────────────────────────────

/** Coefficient for required ring count formula: `clamp(1 + floor(ND × coeff), ...)`. */
export const REQUIRED_RINGS_ND_COEFFICIENT = 5;

/** Minimum number of required rings. */
export const REQUIRED_RINGS_MIN = 1;

/** Maximum number of required rings. */
export const REQUIRED_RINGS_MAX = 6;

/** Coefficient for decoy ring count formula: `clamp(floor(ND × coeff), ...)`. */
export const DECOY_RINGS_ND_COEFFICIENT = 4;

/** Minimum number of decoy rings. */
export const DECOY_RINGS_MIN = 0;

/** Maximum number of decoy rings. */
export const DECOY_RINGS_MAX = 4;

// ─── Obstacles ─────────────────────────────────────────────────────────────

/** Maximum number of obstacles at full difficulty. */
export const MAX_OBSTACLES = 6;

/** Obstacles first appear at D greater than this threshold. */
export const OBSTACLE_APPEARANCE_THRESHOLD_D = 10;

// ─── Physics Modifiers ─────────────────────────────────────────────────────

/** Coefficient for modifier chance: `min(MAX_MODIFIER_CHANCE, ND × coeff)`. */
export const MODIFIER_CHANCE_ND_COEFFICIENT = 0.8;

/** Maximum modifier activation probability (capped). */
export const MAX_MODIFIER_CHANCE = 0.6;

/** Physics modifiers first appear at D greater than this threshold. */
export const MODIFIER_APPEARANCE_THRESHOLD_D = 15;

// ─── Water Current ─────────────────────────────────────────────────────────

/** Multiplier applied to base current; controls `maxCurrentStrength = BASE_CURRENT × (1 + 2 × ND)`. */
export const CURRENT_STRENGTH_ND_COEFFICIENT = 2.0;

// ─── Reward Multiplier ─────────────────────────────────────────────────────

/** Base reward multiplier at D=0. */
export const REWARD_MULTIPLIER_BASE = 1.0;

/** Coefficient for reward multiplier: `BASE + coeff × ND`. */
export const REWARD_MULTIPLIER_ND_COEFFICIENT = 3.0;

// ─── Peg Geometry ──────────────────────────────────────────────────────────

/**
 * Fraction of maxRadius removed at maximum difficulty.
 * `pegBaseRadius = maxRadius × (1 - coeff × ND)`.
 */
export const PEG_RADIUS_REDUCTION_FACTOR = 0.5;

/**
 * Fraction of maxSpacing removed at maximum difficulty.
 * `minPegSpacing = maxSpacing × (1 - coeff × ND)`.
 */
export const PEG_SPACING_REDUCTION_FACTOR = 0.4;
