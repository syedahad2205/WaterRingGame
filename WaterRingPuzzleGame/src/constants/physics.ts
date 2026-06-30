/**
 * Physics constants for the Water Ring Puzzle Game.
 *
 * All numeric constants used by the physics engine are defined here per
 * Requirement 9.8 (all numeric constants in src/constants/).
 *
 * Requirements: 9.8, 22.1–22.7, 23.1–23.3
 */

// ---------------------------------------------------------------------------
// Matter.js engine configuration (Requirement 10.2)
// ---------------------------------------------------------------------------

/** Matter.js gravity Y component (downward positive). */
export const GRAVITY_Y = 1;

/** Matter.js gravity scale factor. */
export const GRAVITY_SCALE = 0.001;

/** Matter.js position solver iterations. */
export const POSITION_ITERATIONS = 6;

/** Matter.js velocity solver iterations. */
export const VELOCITY_ITERATIONS = 4;

/** Matter.js constraint solver iterations. */
export const CONSTRAINT_ITERATIONS = 2;

// ---------------------------------------------------------------------------
// Water force model — Layer 1: Directional Button Force (Requirement 22.2)
// ---------------------------------------------------------------------------

/**
 * Base water button force magnitude (Remote Config default `base_water_force`).
 * Requirement 22.2, 28.5.
 */
export const BASE_WATER_FORCE = 0.003;

/**
 * Maximum force that can be applied by a single button press per tick.
 * Equals BASE_WATER_FORCE (at full intensity, no falloff reduction).
 * Requirement 22.2.
 */
export const MAX_BUTTON_FORCE = BASE_WATER_FORCE;

/** Horizontal component scale for the button force. */
export const BUTTON_H_FACTOR = 1.0;

/** Vertical (upward) component scale for the button force. */
export const BUTTON_V_FACTOR = 0.2;

// ---------------------------------------------------------------------------
// Water force model — Layer 2: Background Current (Requirement 22.3)
// ---------------------------------------------------------------------------

/** Multiplier applied to ambientForce for the background current. */
export const CURRENT_STRENGTH_MULTIPLIER = 1.0;

/** Current magnitude scale factor for difficulty: BASE_CURRENT * (1 + ND * CURRENT_SCALE). */
export const CURRENT_SCALE = 0.5;

// ---------------------------------------------------------------------------
// Water force model — Layer 3: Buoyancy (Requirement 22.4)
// ---------------------------------------------------------------------------

/** Base buoyancy force per unit depth. */
export const BUOYANCY_BASE = 0.0005;

/**
 * Water surface Y-coordinate as a fraction of arena height.
 * Placed near the top of the arena (5%).
 */
export const WATER_SURFACE_FRACTION = 0.05;

// ---------------------------------------------------------------------------
// Water force model — Layer 4: Turbulence (Requirement 22.5)
// ---------------------------------------------------------------------------

/** Turbulence multiplier applied to the base water force. */
export const TURBULENCE_FACTOR = 0.8;

// ---------------------------------------------------------------------------
// Water force model — Force accumulation / safety clamp (Requirement 22.1)
// ---------------------------------------------------------------------------

/**
 * Maximum total force magnitude applied to any ring in one tick.
 * Safety clamp for all four layers combined.
 * Requirement 22.1 (Property 1).
 */
export const MAX_WATER_FORCE = 0.012;

// ---------------------------------------------------------------------------
// Water force model — Drag (Requirement 22.7)
// ---------------------------------------------------------------------------

/**
 * Depth-based drag scale factor.
 * depthFactor = 1 + DRAG_DEPTH_SCALE * (y / arenaHeight)
 * Makes rings near the bottom feel heavier/more sluggish.
 */
export const DRAG_DEPTH_SCALE = 0.5;

// ---------------------------------------------------------------------------
// Ring physics properties (Requirement 23.1–23.3)
// ---------------------------------------------------------------------------

/** Small ring outer radius in px. */
export const RING_SMALL_RADIUS = 22;
/** Small ring mass. */
export const RING_SMALL_MASS = 0.5;
/** Small ring buoyancy coefficient. */
export const RING_SMALL_BUOYANCY = 0.85;

/** Medium ring outer radius in px. */
export const RING_MEDIUM_RADIUS = 32;
/** Medium ring mass. */
export const RING_MEDIUM_MASS = 1.0;
/** Medium ring buoyancy coefficient. */
export const RING_MEDIUM_BUOYANCY = 0.65;

/** Large ring outer radius in px. */
export const RING_LARGE_RADIUS = 44;
/** Large ring mass. */
export const RING_LARGE_MASS = 2.2;
/** Large ring buoyancy coefficient. */
export const RING_LARGE_BUOYANCY = 0.45;

// ---------------------------------------------------------------------------
// Ring landing detection (Requirement 23.4)
// ---------------------------------------------------------------------------

/** Ring center must be within this multiple of peg tipRadius to land. */
export const PEG_ACCEPTANCE_RADIUS_FACTOR = 1.2;

/** Velocity threshold below which a ring may settle (px/tick). */
export const SETTLE_VELOCITY_THRESHOLD = 0.5;

/** Maximum angle deviation (radians) for standard landing. */
export const SETTLE_ANGLE_THRESHOLD = (15 * Math.PI) / 180; // 15°

/** Maximum angle deviation (radians) for Precision template landing. */
export const SETTLE_ANGLE_THRESHOLD_PRECISION = (8 * Math.PI) / 180; // 8°

/** Minimum time (ms) since last bounce for landing to register. */
export const SETTLE_NO_BOUNCE_WINDOW_MS = 200;

// ---------------------------------------------------------------------------
// Stuck detection (Requirement 10.7)
// ---------------------------------------------------------------------------

/** Velocity/angular-velocity below which a ring is considered stuck. */
export const STUCK_THRESHOLD = 0.01;

/** Continuous seconds below STUCK_THRESHOLD before nudge is applied. */
export const STUCK_DETECTION_SECONDS = 5;

/** Maximum nudges before teleporting a stuck ring. */
export const STUCK_MAX_NUDGES = 3;

// ---------------------------------------------------------------------------
// Win condition (Requirement 23.5)
// ---------------------------------------------------------------------------

/** Milliseconds all required rings must remain settled to trigger a win. */
export const WIN_STABILITY_WINDOW_MS = 500;

// ---------------------------------------------------------------------------
// Arena walls (Requirement 21.4)
// ---------------------------------------------------------------------------

/** Arena wall restitution (bounce). */
export const WALL_RESTITUTION = 0.3;

/** Arena wall friction. */
export const WALL_FRICTION = 0.1;

// ---------------------------------------------------------------------------
// Button intensity ramp (Requirement 22.6)
// ---------------------------------------------------------------------------

/** Button intensity ramps from 0 to 1.0 over this many ms. */
export const BUTTON_RAMP_UP_MS = 300;

/** Button holds at peak intensity until this many ms. */
export const BUTTON_HOLD_PEAK_MS = 1500;

/** Button decays to floor intensity over this many ms after peak. */
export const BUTTON_DECAY_MS = 2000;

/** Minimum intensity floor after decay. */
export const BUTTON_INTENSITY_FLOOR = 0.3;
