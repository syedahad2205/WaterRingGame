/**
 * Challenge domain types.
 * Used by three or more features — lives in src/types/ per Requirement 2.6.
 *
 * Requirements: 17.3, 18.3
 */

// ---------------------------------------------------------------------------
// Geometry / Physics primitives
// ---------------------------------------------------------------------------

export interface Vector2D {
  x: number;
  y: number;
}

export type RingSizeCategory = 'small' | 'medium' | 'large';

// ---------------------------------------------------------------------------
// Ring configuration
// ---------------------------------------------------------------------------

export interface RingConfig {
  id: string;
  /** Outer collision/visual radius in px. */
  outerRadius: number;
  /** Inner hole radius (visual only). */
  innerRadius: number;
  /** Mass in kg-equivalent. */
  mass: number;
  /** 0.0 (stone) → 1.0 (cork). */
  buoyancy: number;
  angularDamping: number;
  linearDamping: number;
  /** Wall/ring bounce coefficient. */
  restitution: number;
  /** Water drag coefficient. */
  frictionAir: number;
  sizeCategory: RingSizeCategory;
  /** Required to match peg acceptedColorId. */
  colorId: string;
  /** Active cosmetic skin identifier. */
  skinId: string;
  /** Decoy rings need no peg. */
  isDecoy: boolean;
  /** Spawn position. */
  initialPosition: Vector2D;
}

// ---------------------------------------------------------------------------
// Peg configuration
// ---------------------------------------------------------------------------

export interface PathPoint {
  x: number;
  y: number;
  /** Easing curve identifier at this waypoint. */
  easing?: string;
}

export interface PathDefinition {
  points: PathPoint[];
  /** Total duration in ms for a full path traversal. */
  durationMs: number;
  /** Whether the path loops. */
  loop: boolean;
}

export interface PegConfig {
  id: string;
  position: Vector2D;
  height: number;
  baseRadius: number;
  tipRadius: number;
  acceptedRingSizes: RingSizeCategory[];
  /** Must match the target ring's colorId. */
  acceptedColorId: string;
  isMoving: boolean;
  movementPath?: PathDefinition;
  /** Used in Pressure Zones template. */
  requiresMinVelocity?: number;
  /** Hex colour used for peg glow (matches acceptedColorId ring). */
  glowColor: string;
}

// ---------------------------------------------------------------------------
// Obstacle configuration
// ---------------------------------------------------------------------------

export type ObstacleShape = 'rectangle' | 'circle' | 'polygon';

export interface ObstacleConfig {
  id: string;
  shape: ObstacleShape;
  position: Vector2D;
  /** Rotation in radians. */
  angle: number;
  /** Width (rectangle) or radius (circle). */
  width: number;
  /** Height (rectangle). */
  height: number;
  /** Polygon vertices relative to position (polygon shape only). */
  vertices?: Vector2D[];
  isMoving: boolean;
  movementPath?: PathDefinition;
  restitution: number;
  friction: number;
}

// ---------------------------------------------------------------------------
// Water current profile
// ---------------------------------------------------------------------------

export interface WaterCurrentProfile {
  /** Ambient horizontal current force. Positive = rightward. */
  ambientForce: number;
  /** Turbulence intensity multiplier 0.0–1.0. */
  turbulenceIntensity: number;
  /** Index of predefined current variation pattern. */
  variationPattern: number;
}

// ---------------------------------------------------------------------------
// Physics modifiers
// ---------------------------------------------------------------------------

export interface PhysicsModifiers {
  /** Global gravity scale multiplier. Default 1.0. */
  gravityScale: number;
  /** Global water viscosity multiplier. Default 1.0. */
  waterViscosity: number;
  /** Global buoyancy multiplier. Default 1.0. */
  buoyancyMultiplier: number;
}

// ---------------------------------------------------------------------------
// Challenge Intelligence Metadata
// ---------------------------------------------------------------------------

export interface ChallengeIntelligenceMetadata {
  /** Estimated solution time in seconds. */
  estimatedSolveTimeSecs: number;
  /** Which of the three solver strategies succeeded (0–2). */
  successfulSolverStrategies: number[];
  /** Composite quality score 0.0–1.0. */
  qualityScore: number;
  /** Key difficulty drivers as human-readable labels. */
  difficultyDrivers: string[];
}

// ---------------------------------------------------------------------------
// Arena layout
// ---------------------------------------------------------------------------

export interface ArenaLayout {
  /** Viewport width in dp. */
  width: number;
  /** Viewport height in dp. */
  height: number;
  /** Y-coordinate of the water surface in dp. */
  waterSurfaceY: number;
  /** Active visual theme identifier. */
  themeId: string;
  /** Active environment identifier (weather, time-of-day). */
  environmentId: string;
}

// ---------------------------------------------------------------------------
// Timer configuration
// ---------------------------------------------------------------------------

export interface TimerConfig {
  /** Total allowed time in seconds. */
  totalSeconds: number;
  /** Seconds at which the amber warning triggers. */
  amberThresholdSecs: number;
  /** Seconds at which the critical (red) warning triggers. */
  criticalThresholdSecs: number;
}

// ---------------------------------------------------------------------------
// ChallengeConfig — the complete deterministic spec for one challenge instance
// ---------------------------------------------------------------------------

/**
 * ChallengeConfig is the output of ChallengeGenerator.generate(n).
 * It is a fully deterministic, serialisable value object — no methods,
 * no closures, no references to runtime state.
 *
 * Requirement 1.6: The Challenge Generator SHALL be a pure function that
 * accepts a challenge number and returns a ChallengeConfig with no side
 * effects, no network calls, and no store access.
 */
export interface ChallengeConfig {
  /** Canonical challenge number (1-based). 0 = daily challenge. */
  challengeNumber: number;
  /** ISO date string for daily challenges; empty string otherwise. */
  dailyDate: string;
  /** PRNG seed used to generate this challenge. */
  seed: string;
  /** Semantic version of the generator pipeline that produced this config. */
  generatorVersion: string;
  /** 24 named templates — e.g. 'Classic', 'Cascades', 'Pressure Zones'. */
  templateId: string;
  /** Difficulty score 0–100. */
  difficultyScore: number;
  /** Normalised difficulty 0.0–1.0 (difficultyScore / 100). */
  normalizedDifficulty: number;

  arena: ArenaLayout;
  timer: TimerConfig;
  rings: RingConfig[];
  pegs: PegConfig[];
  obstacles: ObstacleConfig[];
  waterCurrentProfile: WaterCurrentProfile;
  physicsModifiers: PhysicsModifiers;
  intelligenceMetadata: ChallengeIntelligenceMetadata;

  /** True if this is a Boss Challenge (every 50th challenge number). */
  isBossChallenge: boolean;
  /** True if this is a Daily Challenge. */
  isDailyChallenge: boolean;
}

// ---------------------------------------------------------------------------
// Runtime ring / peg state (owned by challengeSlice during active gameplay)
// ---------------------------------------------------------------------------

/** Live position and orientation of a single ring in the physics world. */
export interface RingPosition {
  id: string;
  x: number;
  y: number;
  /** Rotation in radians. */
  angle: number;
}

/** Live velocity of a single ring. */
export interface RingVelocity {
  id: string;
  vx: number;
  vy: number;
  angularV: number;
}

/** Live peg state — tracks which ring (if any) has settled on this peg. */
export interface PegState {
  id: string;
  /** The id of the ring that has settled here; null if peg is empty. */
  settledRingId: string | null;
}

// ---------------------------------------------------------------------------
// Win / Loss state machine
// ---------------------------------------------------------------------------

/**
 * Win/Loss lifecycle for an active challenge.
 *
 * idle     → loadChallenge  → playing
 * playing  → recordWin      → won
 * playing  → recordLoss     → lost
 * won/lost → loadChallenge  → playing   (next challenge or retry)
 */
export type WinLossState = 'idle' | 'playing' | 'won' | 'lost';
