/**
 * WaterSimulation — four-layer water force model.
 *
 * This file is inside `src/features/game/physics/` and is therefore permitted
 * to import Matter.js directly (ESLint `import/no-restricted-paths`).
 *
 * Implements Requirements 22.1 – 22.7:
 *   Layer 1 — Directional Button Force   (Req 22.2)
 *   Layer 2 — Background Current Force   (Req 22.3)
 *   Layer 3 — Buoyancy Force             (Req 22.4)
 *   Layer 4 — Turbulence Force           (Req 22.5)
 *   Drag Model                           (Req 22.7)
 *
 * All four layer functions are exported so unit/property tests can exercise
 * them in isolation without a live Matter.js world.
 */

import Matter from 'matter-js';

import {
  BASE_WATER_FORCE as PHYSICS_BASE_WATER_FORCE,
  MAX_WATER_FORCE as PHYSICS_MAX_WATER_FORCE,
  BUOYANCY_BASE as PHYSICS_BUOYANCY_BASE,
  WATER_SURFACE_FRACTION as PHYSICS_WATER_SURFACE_FRACTION,
  TURBULENCE_FACTOR as PHYSICS_TURBULENCE_FACTOR,
  CURRENT_STRENGTH_MULTIPLIER as PHYSICS_CURRENT_STRENGTH_MULTIPLIER,
  DRAG_DEPTH_SCALE as PHYSICS_DRAG_DEPTH_SCALE,
  BUTTON_H_FACTOR,
  BUTTON_V_FACTOR,
} from '../../../constants/physics';

import type { ChallengeConfig, WaterCurrentProfile } from '../../../types/challenge';

// ---------------------------------------------------------------------------
// InputState (expands the placeholder from PhysicsWorld.ts — Req 22.6)
// ---------------------------------------------------------------------------

/**
 * Snapshot of the input system at a single physics tick.
 *
 * Requirement 16.1 (InputController interface) and 22.2/22.5 (force inputs).
 */
export interface InputState {
  /** Whether the left water-pressure button is currently held. */
  leftHeld: boolean;
  /** Whether the right water-pressure button is currently held. */
  rightHeld: boolean;
  /** 0.0 – 1.0 intensity ramp for the left button (Req 22.6). */
  leftIntensity: number;
  /** 0.0 – 1.0 intensity ramp for the right button (Req 22.6). */
  rightIntensity: number;
  /** True when a rapid-tap gesture has been detected this tick (Req 22.5). */
  turbulenceActive: boolean;
  /**
   * Timestamp used to seed the turbulence PRNG.
   * Should be the millisecond timestamp of the triggering input event.
   */
  turbulenceSeed: number;
  /** Arena width in display pixels (needed for force falloff). */
  arenaWidth: number;
  /** Arena height in display pixels (needed for buoyancy and drag). */
  arenaHeight: number;
}

// ---------------------------------------------------------------------------
// Constants — re-exported from src/constants/physics.ts (Req 9.8)
// These aliases maintain backward-compatibility for any test/consumer that
// imports them directly from WaterSimulation.
// ---------------------------------------------------------------------------

/**
 * Base water button force magnitude (Remote Config default `base_water_force`).
 * Requirement 22.2, 28.5.
 */
export const BASE_WATER_FORCE = PHYSICS_BASE_WATER_FORCE;

/**
 * Maximum total force magnitude that may be applied to any ring in one tick.
 * Safety clamp for all four layers combined.
 * Requirement 22.1 (Property 1).
 */
export const MAX_WATER_FORCE = PHYSICS_MAX_WATER_FORCE;

/** Base buoyancy force per unit depth (Req 22.4). */
export const BUOYANCY_BASE = PHYSICS_BUOYANCY_BASE;

/**
 * Maximum force magnitude from a single button press (at full intensity, no falloff).
 * Used for clamping and reference; equals BASE_WATER_FORCE.
 * Requirement 22.2.
 */
export const MAX_BUTTON_FORCE = PHYSICS_BASE_WATER_FORCE;

/** Horizontal component scale for the button force (Req 22.2). */
const H_FACTOR = BUTTON_H_FACTOR;

/** Vertical (upward) component scale for the button force (Req 22.2). */
const V_FACTOR = BUTTON_V_FACTOR;

/**
 * Water surface Y-coordinate as a fraction of arena height.
 * Placed near the top of the arena (5 %).
 */
const WATER_SURFACE_FRACTION = PHYSICS_WATER_SURFACE_FRACTION;

/** Turbulence multiplier applied to the base water force (Req 22.5). */
const TURBULENCE_FACTOR = PHYSICS_TURBULENCE_FACTOR;

/** Multiplier applied to `ambientForce` for the background current. */
const CURRENT_STRENGTH_MULTIPLIER = PHYSICS_CURRENT_STRENGTH_MULTIPLIER;

/**
 * Depth-based drag scale factor.
 * Total linear drag = linearDamping * (1 + DRAG_DEPTH_SCALE * y/h)
 * This makes rings near the bottom feel heavier / more sluggish (Req 22.7).
 */
const DRAG_DEPTH_SCALE = PHYSICS_DRAG_DEPTH_SCALE;

// ---------------------------------------------------------------------------
// Xoshiro128** PRNG (Req 22.5, 24.6)
// ---------------------------------------------------------------------------

/**
 * A minimal Xoshiro128** PRNG state.
 * Seeded from a 32-bit integer; used to produce reproducible turbulence
 * directions keyed to the triggering input timestamp.
 */
interface Xoshiro128State {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

/** Bit-rotate left (32-bit unsigned). */
function rotl32(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

/**
 * Seed Xoshiro128** from a 32-bit integer.
 * Uses SplitMix32 to expand the seed into four 32-bit words.
 */
function xoshiro128Seed(seed32: number): Xoshiro128State {
  let h = seed32 >>> 0;
  const next = (): number => {
    h = (h + 0x9e3779b9) >>> 0;
    let z = h;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  return { s0: next(), s1: next(), s2: next(), s3: next() };
}

/**
 * Advance Xoshiro128** and return a 32-bit unsigned result in [0, 2^32).
 */
function xoshiro128Next(state: Xoshiro128State): number {
  const result = Math.imul(rotl32(Math.imul(state.s1, 5) >>> 0, 7), 9) >>> 0;
  const t = (state.s1 << 9) >>> 0;
  state.s2 = (state.s2 ^ state.s0) >>> 0;
  state.s3 = (state.s3 ^ state.s1) >>> 0;
  state.s1 = (state.s1 ^ state.s2) >>> 0;
  state.s0 = (state.s0 ^ state.s3) >>> 0;
  state.s2 = (state.s2 ^ t) >>> 0;
  state.s3 = rotl32(state.s3, 11);
  return result;
}

/**
 * Return a float in [0, 1) from the PRNG state.
 */
function xoshiro128Float(state: Xoshiro128State): number {
  return xoshiro128Next(state) / 0x100000000;
}

// ---------------------------------------------------------------------------
// Layer 1: Directional Button Force (Req 22.2)
// ---------------------------------------------------------------------------

/** Inputs for the button force computation. */
export interface ButtonForceInput {
  /** Ring x-coordinate in world space. */
  x: number;
  /** Which button: 'left' or 'right'. */
  side: 'left' | 'right';
  /** Button intensity 0.0 – 1.0. */
  intensity: number;
  /** Arena width in pixels. */
  arenaWidth: number;
}

/** A 2-D force vector. */
export interface ForceVector {
  x: number;
  y: number;
}

/**
 * Compute the directional water-jet force from one button press.
 *
 * Formula (Req 22.2):
 *   sourceX = side === 'left' ? 0 : arenaWidth
 *   falloff = 1 - |x - sourceX| / arenaWidth
 *   magnitude = BASE_WATER_FORCE * intensity * falloff
 *   result = { x: direction * magnitude * H_FACTOR,
 *              y: -magnitude * V_FACTOR }
 *
 * Left button → rightward force (direction = +1)
 * Right button → leftward force (direction = -1)
 *
 * @param input - Ring position, button side, intensity, and arena width.
 * @returns Force vector to be applied this tick.
 */
export function computeButtonForce(input: ButtonForceInput): ForceVector {
  const { x, side, intensity, arenaWidth } = input;
  const sourceX = side === 'left' ? 0 : arenaWidth;
  const direction = side === 'left' ? 1 : -1;

  // Linear falloff: full force at the source wall, zero at the opposite wall.
  const rawFalloff = 1 - Math.abs(x - sourceX) / arenaWidth;
  const falloff = Math.max(0, rawFalloff); // clamp to [0, ∞)

  const magnitude = BASE_WATER_FORCE * intensity * falloff;

  return {
    x: direction * magnitude * H_FACTOR,
    y: -magnitude * V_FACTOR, // upward (negative y in screen coords)
  };
}

// ---------------------------------------------------------------------------
// Layer 2: Background Current Force (Req 22.3)
// ---------------------------------------------------------------------------

/**
 * Compute the persistent ambient horizontal current force.
 *
 * Formula (Req 22.3):
 *   F.x = ambientForce * currentStrengthMultiplier
 *   F.y = 0 (horizontal only)
 *
 * @param profile - WaterCurrentProfile from ChallengeConfig.
 * @returns Force vector (horizontal only).
 */
export function computeBackgroundCurrent(profile: WaterCurrentProfile): ForceVector {
  return {
    x: profile.ambientForce * CURRENT_STRENGTH_MULTIPLIER,
    y: 0,
  };
}

// ---------------------------------------------------------------------------
// Layer 3: Buoyancy Force (Req 22.4)
// ---------------------------------------------------------------------------

/** Inputs required for buoyancy computation. */
export interface BuoyancyInput {
  /** Ring y-coordinate in world space (screen coords: increases downward). */
  y: number;
  /** Ring buoyancy coefficient 0.0 (stone) – 1.0 (cork). */
  buoyancy: number;
  /** Arena height in pixels. */
  arenaHeight: number;
}

/**
 * Compute the buoyancy force for a ring.
 *
 * Formula (Req 22.4):
 *   waterSurface = arenaHeight * WATER_SURFACE_FRACTION
 *   F.y = -BUOYANCY_BASE * ring.buoyancy * (ring.y - waterSurface) / arenaHeight
 *
 * The result is always ≤ 0 (upward) because:
 *   - rings below the surface have y > waterSurface → positive multiplier → negated
 *   - rings at or above the surface produce zero or very small near-zero values
 *
 * @param input - Ring y-position, buoyancy coefficient, and arena height.
 * @returns Force vector (y ≤ 0, always upward or zero).
 */
export function computeBuoyancy(input: BuoyancyInput): ForceVector {
  const { y, buoyancy, arenaHeight } = input;
  const waterSurface = arenaHeight * WATER_SURFACE_FRACTION;
  const depth = y - waterSurface; // positive when below water surface

  // Only apply buoyancy when ring is below the water surface.
  // Above the surface there is no upward water push.
  const effectiveDepth = Math.max(0, depth);

  const fy = -(BUOYANCY_BASE * buoyancy * effectiveDepth) / arenaHeight;

  return { x: 0, y: fy };
}

// ---------------------------------------------------------------------------
// Layer 4: Turbulence Force (Req 22.5)
// ---------------------------------------------------------------------------

/**
 * Compute the turbulence impulse force.
 *
 * Triggered by rapid-tap input. Uses Xoshiro128** seeded from the input
 * timestamp to produce a reproducible, deterministic random unit vector
 * within ±45° of horizontal (Req 22.5, 24.6).
 *
 * Formula (Req 22.5):
 *   F_turb = BASE_WATER_FORCE * TURBULENCE_FACTOR * RandomUnit(θ ± 45°, seed)
 *
 * @param turbulenceSeed - Integer seed (e.g. input timestamp ms).
 * @returns Force vector with magnitude BASE_WATER_FORCE * TURBULENCE_FACTOR.
 */
export function computeTurbulence(turbulenceSeed: number): ForceVector {
  const state = xoshiro128Seed(turbulenceSeed >>> 0);

  // Generate a random angle in the range [-π/4, π/4] around 0 (horizontal).
  // xoshiro128Float returns [0,1), map to [-0.5, 0.5), scale by π/2 for ±45°.
  const rawFloat = xoshiro128Float(state);
  const theta = (rawFloat - 0.5) * (Math.PI / 2);

  const magnitude = BASE_WATER_FORCE * TURBULENCE_FACTOR;

  return {
    x: magnitude * Math.cos(theta),
    y: magnitude * Math.sin(theta),
  };
}

// ---------------------------------------------------------------------------
// Force vector utilities
// ---------------------------------------------------------------------------

/** Add two force vectors component-wise. */
function addForces(a: ForceVector, b: ForceVector): ForceVector {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Euclidean magnitude of a force vector. */
export function forceMagnitude(f: ForceVector): number {
  return Math.sqrt(f.x * f.x + f.y * f.y);
}

/**
 * Clamp a force vector so its magnitude does not exceed `maxMagnitude`.
 * Direction is preserved.
 */
function clampForce(f: ForceVector, maxMagnitude: number): ForceVector {
  const mag = forceMagnitude(f);
  if (mag <= maxMagnitude || mag === 0) {
    return f;
  }
  const scale = maxMagnitude / mag;
  return { x: f.x * scale, y: f.y * scale };
}

// ---------------------------------------------------------------------------
// Drag model (Req 22.7)
// ---------------------------------------------------------------------------

/** Parameters needed to apply the drag model for one ring body. */
export interface DragParams {
  /** Ring y-position in world space. */
  y: number;
  /** Arena height in pixels. */
  arenaHeight: number;
  /** Ring linear damping coefficient from RingConfig. */
  linearDamping: number;
  /** Ring angular damping coefficient from RingConfig. */
  angularDamping: number;
  /** Fixed timestep in seconds (typically 16.67 / 1000 ≈ 0.01667). */
  dtSeconds: number;
}

/**
 * Apply the depth-scaled drag model directly to a Matter.Body.
 *
 * Formula (Req 22.7):
 *   depthFactor = 1.0 + DRAG_DEPTH_SCALE * (y / arenaHeight)
 *   v(t+1) = v(t) * (1 - linearDamping * depthFactor * dt)
 *   ω(t+1) = ω(t) * (1 - angularDamping * depthFactor * dt)
 *
 * @param body   - The Matter.Body to modify in-place.
 * @param params - Drag parameters for this ring at this tick.
 */
export function applyDragModel(body: Matter.Body, params: DragParams): void {
  const { y, arenaHeight, linearDamping, angularDamping, dtSeconds } = params;

  // Depth factor: increases drag near the bottom (Req 22.7).
  const depthFactor = 1.0 + DRAG_DEPTH_SCALE * (Math.max(0, y) / arenaHeight);

  const linearDecay = Math.max(0, 1 - linearDamping * depthFactor * dtSeconds);
  const angularDecay = Math.max(0, 1 - angularDamping * depthFactor * dtSeconds);

  Matter.Body.setVelocity(body, {
    x: body.velocity.x * linearDecay,
    y: body.velocity.y * linearDecay,
  });
  Matter.Body.setAngularVelocity(body, body.angularVelocity * angularDecay);
}

// ---------------------------------------------------------------------------
// Plugin type for ring bodies (mirrors the private type in PhysicsWorld.ts)
// ---------------------------------------------------------------------------

interface RingPlugin {
  ringId: string;
  settledOnPegId: string | null;
  buoyancy?: number;
  linearDamping?: number;
  angularDamping?: number;
}

// ---------------------------------------------------------------------------
// Main export: applyWaterForces (Req 22.1)
// ---------------------------------------------------------------------------

/**
 * Apply all four water force layers to every non-settled ring in the world,
 * then apply the depth-scaled drag model.
 *
 * Called once per physics tick (before `Matter.Engine.update`) by GameLoop
 * via `PhysicsWorld.applyWaterForces`.
 *
 * Processing order per ring:
 *   1. Layer 1 — Directional Button Force (left and/or right)
 *   2. Layer 2 — Background Current Force
 *   3. Layer 3 — Buoyancy Force
 *   4. Layer 4 — Turbulence Force (when turbulenceActive)
 *   5. Clamp total force to MAX_WATER_FORCE
 *   6. Apply via Matter.Body.applyForce
 *   7. Drag model
 *
 * Requirements: 22.1 – 22.7
 *
 * @param world         - The active Matter.World instance.
 * @param inputState    - Current input snapshot from InputController.
 * @param challengeConfig - Active challenge configuration (for current profile).
 */
export function applyWaterForces(
  world: Matter.World,
  inputState: InputState,
  challengeConfig: ChallengeConfig,
): void {
  const {
    leftHeld,
    rightHeld,
    leftIntensity,
    rightIntensity,
    turbulenceActive,
    turbulenceSeed,
    arenaWidth,
    arenaHeight,
  } = inputState;

  const dtSeconds = 16.67 / 1000; // fixed timestep in seconds
  const profile = challengeConfig.waterCurrentProfile;

  // Retrieve all bodies from the world.
  const allBodies = Matter.Composite.allBodies(world);

  for (const body of allBodies) {
    // Only process ring bodies (label starts with 'ring').
    if (!body.label.startsWith('ring')) {
      continue;
    }

    const plugin = body.plugin as RingPlugin;

    // Settled rings receive zero force (Req 22.1, Property 2).
    if (plugin.settledOnPegId !== null) {
      continue;
    }

    const ringX = body.position.x;
    const ringY = body.position.y;

    // Retrieve per-ring physics properties stored in the plugin by RingBody.
    // Fall back to config-level defaults if the plugin fields are missing
    // (e.g. if bodies were created directly in tests).
    const ringBuoyancy = typeof plugin.buoyancy === 'number' ? plugin.buoyancy : 0.65;
    const ringLinearDamping =
      typeof plugin.linearDamping === 'number' ? plugin.linearDamping : body.frictionAir;
    const ringAngularDamping =
      typeof plugin.angularDamping === 'number' ? plugin.angularDamping : 0.05;

    // ------------------------------------------------------------------
    // Layer 1: Directional Button Force
    // ------------------------------------------------------------------
    let total: ForceVector = { x: 0, y: 0 };

    if (leftHeld && leftIntensity > 0) {
      const f = computeButtonForce({ x: ringX, side: 'left', intensity: leftIntensity, arenaWidth });
      total = addForces(total, f);
    }

    if (rightHeld && rightIntensity > 0) {
      const f = computeButtonForce({ x: ringX, side: 'right', intensity: rightIntensity, arenaWidth });
      total = addForces(total, f);
    }

    // ------------------------------------------------------------------
    // Layer 2: Background Current Force
    // ------------------------------------------------------------------
    const currentForce = computeBackgroundCurrent(profile);
    total = addForces(total, currentForce);

    // ------------------------------------------------------------------
    // Layer 3: Buoyancy Force
    // ------------------------------------------------------------------
    const buoyancyForce = computeBuoyancy({ y: ringY, buoyancy: ringBuoyancy, arenaHeight });
    total = addForces(total, buoyancyForce);

    // ------------------------------------------------------------------
    // Layer 4: Turbulence Force
    // ------------------------------------------------------------------
    if (turbulenceActive) {
      const turbForce = computeTurbulence(turbulenceSeed);
      total = addForces(total, turbForce);
    }

    // ------------------------------------------------------------------
    // Safety clamp: total force magnitude must not exceed MAX_WATER_FORCE
    // (Property 1, Req 22.1)
    // ------------------------------------------------------------------
    const clamped = clampForce(total, MAX_WATER_FORCE);

    // ------------------------------------------------------------------
    // Apply force at ring centroid
    // ------------------------------------------------------------------
    Matter.Body.applyForce(body, body.position, clamped);

    // ------------------------------------------------------------------
    // Drag model (Req 22.7)
    // ------------------------------------------------------------------
    applyDragModel(body, {
      y: ringY,
      arenaHeight,
      linearDamping: ringLinearDamping,
      angularDamping: ringAngularDamping,
      dtSeconds,
    });
  }
}
