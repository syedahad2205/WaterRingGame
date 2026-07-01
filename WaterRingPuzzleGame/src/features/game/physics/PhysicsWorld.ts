/**
 * PhysicsWorld — sole Matter.js integration point.
 *
 * This is the ONLY file in the codebase permitted to import matter-js
 * directly (enforced by ESLint `import/no-restricted-paths`).
 *
 * Exposes: initialize, step, applyWaterForces, getRingStates,
 *          getPegStates, serializeState, restoreState, destroy.
 *
 * Requirements: 10.1, 10.2, 10.6, 10.7, 10.8, 21.1
 */

import Matter from 'matter-js';

import type { ChallengeConfig, PegState } from '../../../types/challenge';
import { createRingBody } from './RingBody';
import {
  applyWaterForces as applyWaterForcesImpl,
  type InputState as WaterInputState,
} from './WaterSimulation';
import { triggerHaptic } from '../../../constants/hapticPatterns';
import { SETTLE_VELOCITY_THRESHOLD } from '../../../constants/physics';
import { audioEngine } from '../../audio/AudioEngine';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Live physics state for a single ring each tick. */
export interface RingState {
  id: string;
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  angularV: number;
  settledOnPegId: string | null;
}

/** Snapshot of a single peg (position + occupant). */
export interface PhysicsPegState {
  id: string;
  x: number;
  y: number;
  settledRingId: string | null;
}

/** Full serialisable snapshot of the physics world at a point in time. */
export interface SerializedPhysicsState {
  rings: RingState[];
  pegs: PhysicsPegState[];
  timestamp: number;
}

/**
 * Placeholder: will be replaced by the real InputState in task 4.2.x.
 * Captures which water-pressure buttons are currently held.
 */
export interface InputState {
  leftHeld: boolean;
  rightHeld: boolean;
  leftIntensity: number;
  rightIntensity: number;
}

// ---------------------------------------------------------------------------
// Constants (Requirement 10.2)
// ---------------------------------------------------------------------------

/** Matter.js engine configuration values — exported for tests and docs. */
export const PhysicsConstants = {
  GRAVITY_Y: 1,
  GRAVITY_SCALE: 0.001,
  POSITION_ITERATIONS: 6,
  VELOCITY_ITERATIONS: 4,
  CONSTRAINT_ITERATIONS: 2,
  BROADPHASE: 'grid' as const,

  /** Arena wall physics properties (Requirement 21.4). */
  WALL_RESTITUTION: 0.3,
  WALL_FRICTION: 0.1,
  WALL_THICKNESS: 50,
} as const;

// SETTLE_VELOCITY_THRESHOLD is imported from constants/physics.ts (Requirement 10.6).

/**
 * Maximum ring speed (px/tick) below which a ring is considered stuck.
 * Requirement 10.7.
 */
export const STUCK_VELOCITY_THRESHOLD = 0.3;

/**
 * Continuous milliseconds a ring must stay below STUCK_VELOCITY_THRESHOLD
 * before a nudge is applied. Requirement 10.7.
 */
export const STUCK_DURATION_MS = 5_000;

/**
 * Maximum number of random impulse nudges before teleporting.
 * Requirement 10.7.
 */
export const MAX_NUDGES = 3;

/**
 * Magnitude of the random impulse applied to a stuck ring. Requirement 10.7.
 */
export const NUDGE_FORCE = 0.01;

/**
 * Maximum angle deviation from vertical (in radians) for ring landing.
 * ±15° default; ±8° for Precision template. Requirement 10.6.
 */
export const SETTLE_ANGLE_TOLERANCE_DEFAULT = (15 * Math.PI) / 180;
export const SETTLE_ANGLE_TOLERANCE_PRECISION = (8 * Math.PI) / 180;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Tags attached to every ring body via body.plugin. */
interface RingPlugin {
  ringId: string;
  colorId: string;
  settledOnPegId: string | null;
  /** Timestamp (ms) of the most recent peg-bounce, for the 200ms debounce. */
  lastBounceTime: number;
  /** Timestamp (ms) when the ring first dropped below STUCK_VELOCITY_THRESHOLD. */
  stuckSinceTime: number | null;
  /** How many nudges have been applied so far. */
  nudgeCount: number;
  /** Initial spawn position (for teleport fallback). */
  initialX: number;
  initialY: number;
}

/** Tags attached to every peg body via body.plugin. */
interface PegPlugin {
  pegId: string;
  settledRingId: string | null;
  tipRadius: number;
  acceptedColorId: string;
  x: number;
  y: number;
}

function createArenaWalls(
  engine: Matter.Engine,
  width: number,
  height: number,
): void {
  const t = PhysicsConstants.WALL_THICKNESS;
  const wallOpts: Matter.IChamferableBodyDefinition = {
    isStatic: true,
    restitution: PhysicsConstants.WALL_RESTITUTION,
    friction: PhysicsConstants.WALL_FRICTION,
    label: 'wall',
  };
  const walls = [
    Matter.Bodies.rectangle(width / 2, -t / 2, width + t * 2, t, wallOpts), // top
    Matter.Bodies.rectangle(width / 2, height + t / 2, width + t * 2, t, wallOpts), // bottom
    Matter.Bodies.rectangle(-t / 2, height / 2, t, height + t * 2, wallOpts), // left
    Matter.Bodies.rectangle(width + t / 2, height / 2, t, height + t * 2, wallOpts), // right
  ];
  Matter.Composite.add(engine.world, walls);
}

function extractRingState(body: Matter.Body): RingState {
  const plugin = body.plugin as RingPlugin;
  return {
    id: plugin.ringId,
    x: body.position.x,
    y: body.position.y,
    angle: body.angle,
    vx: body.velocity.x,
    vy: body.velocity.y,
    angularV: body.angularVelocity,
    settledOnPegId: plugin.settledOnPegId,
  };
}

function extractPegState(body: Matter.Body): PhysicsPegState {
  const plugin = body.plugin as PegPlugin;
  return {
    id: plugin.pegId,
    x: plugin.x,
    y: plugin.y,
    settledRingId: plugin.settledRingId,
  };
}

/**
 * Euclidean distance between two 2-D points.
 */
function dist2D(
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Vector magnitude (speed).
 */
function vectorMag(v: Matter.Vector): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Check whether a value is finite (not NaN and not Infinity).
 */
function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n);
}

// ---------------------------------------------------------------------------
// Ring landing detection (Requirement 10.6)
// ---------------------------------------------------------------------------

/**
 * Mark a ring as settled on a peg: freeze velocity/angular velocity, snap
 * position to peg centre, update plugin metadata on both bodies, and emit
 * the ring_settled game event.
 */
function markRingSettled(
  ring: Matter.Body,
  peg: Matter.Body,
): void {
  const ringPlugin = ring.plugin as RingPlugin;
  const pegPlugin = peg.plugin as PegPlugin;

  // Idempotency guard — prevent double-settling
  if (ringPlugin.settledOnPegId !== null || pegPlugin.settledRingId !== null) {
    return;
  }

  // Freeze motion
  Matter.Body.setVelocity(ring, { x: 0, y: 0 });
  Matter.Body.setAngularVelocity(ring, 0);
  Matter.Body.setPosition(ring, { x: pegPlugin.x, y: pegPlugin.y });
  Matter.Body.setStatic(ring, true);

  // Update plugin state
  ringPlugin.settledOnPegId = pegPlugin.pegId;
  pegPlugin.settledRingId = ringPlugin.ringId;
}

/**
 * Determine the landing angle tolerance based on the template id.
 * Precision template uses ±8°, all others use ±15°.
 */
function angleTolerance(templateId: string): number {
  return templateId === 'Precision'
    ? SETTLE_ANGLE_TOLERANCE_PRECISION
    : SETTLE_ANGLE_TOLERANCE_DEFAULT;
}

/**
 * Given a Matter.js collision pair, return the ring body and peg body if
 * exactly one of the two bodies is a ring and the other is a peg. Returns
 * null otherwise.
 */
function extractRingPegPair(
  pair: Matter.Pair,
): { ring: Matter.Body; peg: Matter.Body } | null {
  const { bodyA, bodyB } = pair;
  const aIsRing = bodyA.label.startsWith('ring');
  const bIsRing = bodyB.label.startsWith('ring');
  const aIsPeg = bodyA.label.startsWith('peg');
  const bIsPeg = bodyB.label.startsWith('peg');
  if (aIsRing && bIsPeg) {
    return { ring: bodyA, peg: bodyB };
  }
  if (aIsPeg && bIsRing) {
    return { ring: bodyB, peg: bodyA };
  }
  return null;
}

/**
 * Handle a collisionStart event: evaluate all 5 landing conditions for each
 * ring-peg pair and settle the ring when all conditions are met.
 *
 * Conditions (Requirement 10.6):
 *   1. Ring centre within 1.2× peg tipRadius
 *   2. Ring speed below SETTLE_VELOCITY_THRESHOLD
 *   3. Ring angle within ±tolerance of vertical (0 or π)
 *   4. No bounce against this peg within last 200ms
 *   5. Ring colorId matches peg acceptedColorId
 *
 * @internal
 */
// eslint-disable-next-line max-lines-per-function
export function handleCollisionStart(
  event: Matter.IEventCollision<Matter.Engine>,
  templateId: string,
): void {
  const tolerance = angleTolerance(templateId);
  const now = Date.now();

  // Matter.js types vary by version; use a loose pair type
  for (const pair of event.pairs) {
    const { bodyA, bodyB } = pair;
    const aIsRing = bodyA.label.startsWith('ring');
    const bIsRing = bodyB.label.startsWith('ring');

    // Ring-ring collision: light haptic + SFX
    if (aIsRing && bIsRing) {
      triggerHaptic('ringCollision');
      try {
        audioEngine.getSFXManager().play('ring_collision');
      } catch {
        // SFX failure is non-fatal
      }
      continue;
    }

    // Ring-wall collision: wall hit haptic + SFX
    const aIsWall = bodyA.label === 'wall';
    const bIsWall = bodyB.label === 'wall';
    if ((aIsRing && bIsWall) || (bIsRing && aIsWall)) {
      triggerHaptic('ringWallHit');
      try {
        audioEngine.getSFXManager().play('ring_wall_collision');
      } catch {
        // SFX failure is non-fatal
      }
      continue;
    }

    const result = extractRingPegPair(pair);
    if (!result) {
      continue;
    }

    const { ring, peg } = result;
    const ringPlugin = ring.plugin as RingPlugin;
    const pegPlugin = peg.plugin as PegPlugin;

    // Skip if ring is already settled
    if (ringPlugin.settledOnPegId !== null) {
      continue;
    }

    // Skip if peg already has a settled ring (prevents double-occupation)
    if (pegPlugin.settledRingId !== null) {
      continue;
    }

    // Condition 1: centre within 1.2× tipRadius
    const d = dist2D(ring.position.x, ring.position.y, pegPlugin.x, pegPlugin.y);
    if (d > pegPlugin.tipRadius * 1.2) {
      // Record bounce time for Condition 4 tracking
      ringPlugin.lastBounceTime = now;
      continue;
    }

    // Condition 2: velocity below settle threshold
    const speed = vectorMag(ring.velocity);
    if (speed > SETTLE_VELOCITY_THRESHOLD) {
      ringPlugin.lastBounceTime = now;
      continue;
    }

    // Condition 3: angle within tolerance of vertical
    // Rings are symmetric (π-periodic), so we compare modulo π
    const normalised = Math.abs(ring.angle % Math.PI);
    const angleDiff = Math.min(normalised, Math.PI - normalised);
    if (angleDiff > tolerance) {
      ringPlugin.lastBounceTime = now;
      continue;
    }

    // Condition 4: no bounce within last 200ms
    if (now - ringPlugin.lastBounceTime < 200) {
      continue;
    }

    // Condition 5: colorId matches acceptedColorId
    if (ringPlugin.colorId !== pegPlugin.acceptedColorId) {
      ringPlugin.lastBounceTime = now;
      continue;
    }

    // All 5 conditions met — settle the ring
    markRingSettled(ring, peg);

    // Trigger ring-landing haptic + SFX feedback
    triggerHaptic('ringLandOnPeg');
    try {
      audioEngine.getSFXManager().play('ring_landed_peg');
    } catch {
      // SFX failure is non-fatal
    }

    // Perfect landing: ring centre is within 0.3× tipRadius of peg centre
    if (d <= pegPlugin.tipRadius * 0.3) {
      triggerHaptic('ringPerfectLand');
      try {
        audioEngine.getSFXManager().play('perfect_placement');
      } catch {
        // SFX failure is non-fatal
      }
    }

    // Notify any registered ring-landed callback (progressive music hooks)
    if (_onRingLandedCallback) {
      try {
        _onRingLandedCallback();
      } catch {
        // Callback failure is non-fatal
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Stuck detection (Requirement 10.7)
// ---------------------------------------------------------------------------

/**
 * Check all ring bodies for "stuck" state. A ring is stuck when its speed
 * and angular velocity have both been below STUCK_VELOCITY_THRESHOLD for
 * at least STUCK_DURATION_MS continuously, and the ring is not settled.
 *
 * Recovery sequence:
 *   - Nudges 1–3: apply a random impulse of magnitude NUDGE_FORCE
 *   - After 3 nudges: teleport to initial spawn position and reset counter
 *
 * @param ringBodies - Map of all ring bodies in the world.
 * @param now        - Current timestamp in ms (injectable for tests).
 *
 * @internal
 */
// eslint-disable-next-line max-lines-per-function
export function checkStuckRings(
  ringBodies: Map<string, Matter.Body>,
  now: number = Date.now(),
): void {
  ringBodies.forEach((body) => {
    const plugin = body.plugin as RingPlugin;

    // Settled rings are not stuck
    if (plugin.settledOnPegId !== null) {
      plugin.stuckSinceTime = null;
      plugin.nudgeCount = 0;
      return;
    }

    const speed = vectorMag(body.velocity);
    const angSpeed = Math.abs(body.angularVelocity);
    const isLowMotion =
      speed < STUCK_VELOCITY_THRESHOLD && angSpeed < STUCK_VELOCITY_THRESHOLD;

    if (!isLowMotion) {
      // Ring is moving — reset stuck timer
      plugin.stuckSinceTime = null;
      return;
    }

    // Start tracking if not already
    if (plugin.stuckSinceTime === null) {
      plugin.stuckSinceTime = now;
      return;
    }

    const stuckDuration = now - plugin.stuckSinceTime;
    if (stuckDuration < STUCK_DURATION_MS) {
      return;
    }

    // Ring has been stuck for >= 5 seconds — apply recovery
    if (plugin.nudgeCount < MAX_NUDGES) {
      // Apply random impulse
      const angle = Math.random() * 2 * Math.PI;
      Matter.Body.applyForce(body, body.position, {
        x: NUDGE_FORCE * Math.cos(angle),
        y: NUDGE_FORCE * Math.sin(angle),
      });
      plugin.nudgeCount += 1;
      plugin.stuckSinceTime = now; // reset timer for next nudge window
    } else {
      // Teleport to initial spawn position
      Matter.Body.setPosition(body, { x: plugin.initialX, y: plugin.initialY });
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(body, 0);
      plugin.nudgeCount = 0;
      plugin.stuckSinceTime = null;
    }
  });
}

// ---------------------------------------------------------------------------
// NaN guard (Requirement 10.8)
// ---------------------------------------------------------------------------

/**
 * Scan all ring bodies for NaN or Infinity positions/velocities.
 * If any are found, attempt to restore from `lastGoodState`.
 * Falls back to resetting to initial spawn positions if no backup exists.
 *
 * @param ringBodies   - Map of all ring bodies.
 * @param lastGoodState - Most recent serialized snapshot, or null.
 * @returns true if any NaN/Infinity was detected and corrected.
 *
 * @internal
 */
// eslint-disable-next-line max-lines-per-function
export function checkNaNPositions(
  ringBodies: Map<string, Matter.Body>,
  lastGoodState: SerializedPhysicsState | null,
): boolean {
  let nanDetected = false;

  ringBodies.forEach((body) => {
    const p = body.position;
    const v = body.velocity;
    const hasNaN =
      !isFiniteNumber(p.x) ||
      !isFiniteNumber(p.y) ||
      !isFiniteNumber(v.x) ||
      !isFiniteNumber(v.y) ||
      !isFiniteNumber(body.angle) ||
      !isFiniteNumber(body.angularVelocity);

    if (hasNaN) {
      nanDetected = true;
    }
  });

  if (!nanDetected) {
    return false;
  }

  // Log non-fatal event (Crashlytics integration deferred to task 16.2.2)
  if (__DEV__) console.error(
    '[PhysicsWorld] NaN/Infinity detected in ring positions — attempting recovery.',
  );

  if (lastGoodState !== null) {
    // Restore from last good snapshot.
    // Matter.Body.setPosition works as a delta (adds to current position),
    // so if the current position contains NaN we must write coordinates
    // directly before calling the API helper.
    lastGoodState.rings.forEach((rs) => {
      const body = ringBodies.get(rs.id);
      if (!body) {
        return;
      }
      // Force-write coordinates to clear any NaN before using Matter helpers
      body.position.x = rs.x;
      body.position.y = rs.y;
      Matter.Body.setVelocity(body, { x: rs.vx, y: rs.vy });
      Matter.Body.setAngle(body, rs.angle);
      Matter.Body.setAngularVelocity(body, rs.angularV);
      (body.plugin as RingPlugin).settledOnPegId = rs.settledOnPegId;
    });
  } else {
    // No backup — reset rings to their initial spawn positions.
    ringBodies.forEach((body) => {
      const plugin = body.plugin as RingPlugin;
      // Force-write coordinates to clear any NaN
      body.position.x = plugin.initialX;
      body.position.y = plugin.initialY;
      Matter.Body.setVelocity(body, { x: 0, y: 0 });
      Matter.Body.setAngle(body, 0);
      Matter.Body.setAngularVelocity(body, 0);
    });
  }

  return true;
}

// ---------------------------------------------------------------------------
// PhysicsWorld
// ---------------------------------------------------------------------------

/** Internal mutable state — one instance per active challenge. */
interface WorldState {
  engine: Matter.Engine;
  ringBodies: Map<string, Matter.Body>;
  pegBodies: Map<string, Matter.Body>;
  templateId: string;
  /** Full challenge config — needed for water force model. */
  challengeConfig: ChallengeConfig;
  /** Most recent known-good serialized state (updated each step). */
  lastGoodState: SerializedPhysicsState | null;
}

let _world: WorldState | null = null;

/**
 * Optional callback fired whenever a ring successfully lands on a peg.
 * Used by GameScreen to wire progressive music hooks (useAudio lifecycle)
 * into the physics layer without requiring React hooks in PhysicsWorld.
 */
let _onRingLandedCallback: (() => void) | null = null;

function assertInitialized(): WorldState {
  if (!_world) {
    throw new Error('PhysicsWorld: call initialize() before using this method.');
  }
  return _world;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Set up the Matter.js engine with the required config and create arena walls
 * plus placeholder bodies from the ChallengeConfig.
 *
 * Registers collision event handlers for ring landing detection (Req 10.6).
 *
 * Requirement 10.1, 10.2, 10.6, 21.1
 */
function initialize(config: ChallengeConfig): void {
  if (_world) {
    destroy();
  }

  const engine = Matter.Engine.create({
    gravity: {
      x: 0,
      y: PhysicsConstants.GRAVITY_Y,
      scale: PhysicsConstants.GRAVITY_SCALE,
    },
    positionIterations: PhysicsConstants.POSITION_ITERATIONS,
    velocityIterations: PhysicsConstants.VELOCITY_ITERATIONS,
    constraintIterations: PhysicsConstants.CONSTRAINT_ITERATIONS,
  });

  createArenaWalls(engine, config.arena.width, config.arena.height);

  const ringBodies = new Map<string, Matter.Body>();
  const pegBodies = new Map<string, Matter.Body>();

  addRingBodies(engine, config, ringBodies);
  addPegBodies(engine, config, pegBodies);

  _world = {
    engine,
    ringBodies,
    pegBodies,
    templateId: config.templateId,
    challengeConfig: config,
    lastGoodState: null,
  };

  // Register collision handler for ring landing (Requirement 10.6)
  Matter.Events.on(engine, 'collisionStart', (event) => {
    if (!_world) {
      return;
    }
    handleCollisionStart(event, _world.templateId);
  });
}

function addRingBodies(
  engine: Matter.Engine,
  config: ChallengeConfig,
  ringBodies: Map<string, Matter.Body>,
): void {
  config.rings.forEach((ringCfg) => {
    // Use the RingBody factory to create a 24-vertex polygon with correct
    // collision filters and per-tier physics properties (Req 10.3, 23.1-23.3).
    const body = createRingBody(ringCfg, ringCfg.initialPosition);

    // Augment the RingBodyPlugin with the additional fields PhysicsWorld
    // needs for landing detection (10.6), stuck detection (10.7), and
    // NaN recovery (10.8).
    const existingPlugin = body.plugin as Record<string, unknown>;
    Object.assign(existingPlugin, {
      lastBounceTime: 0,
      stuckSinceTime: null,
      nudgeCount: 0,
      initialX: ringCfg.initialPosition.x,
      initialY: ringCfg.initialPosition.y,
    });

    Matter.Composite.add(engine.world, body);
    ringBodies.set(ringCfg.id, body);
  });
}

function addPegBodies(
  engine: Matter.Engine,
  config: ChallengeConfig,
  pegBodies: Map<string, Matter.Body>,
): void {
  config.pegs.forEach((pegCfg) => {
    const body = Matter.Bodies.circle(
      pegCfg.position.x,
      pegCfg.position.y,
      pegCfg.tipRadius,
      {
        isStatic: true,
        isSensor: true,
        label: 'peg',
        plugin: {
          pegId: pegCfg.id,
          settledRingId: null,
          tipRadius: pegCfg.tipRadius,
          acceptedColorId: pegCfg.acceptedColorId,
          x: pegCfg.position.x,
          y: pegCfg.position.y,
        } satisfies PegPlugin,
      },
    );
    Matter.Composite.add(engine.world, body);
    pegBodies.set(pegCfg.id, body);
  });
}

/**
 * Advance the simulation by `dt` milliseconds.
 * Also runs stuck detection and NaN guard.
 * Called by the GameLoop at each fixed-timestep tick.
 *
 * Requirement 10.1, 10.7, 10.8
 */
function step(dt: number): void {
  // Bail silently if the world was destroyed (e.g. handleWin called stop()
  // while the GameLoop tick is still executing). This prevents a crash from
  // assertInitialized() throwing after destroy().
  if (!_world) return;
  const world = _world;

  // NaN guard before update (Requirement 10.8)
  checkNaNPositions(world.ringBodies, world.lastGoodState);

  Matter.Engine.update(world.engine, dt);

  // Stuck ring detection (Requirement 10.7)
  checkStuckRings(world.ringBodies);

  // Checkpoint: save known-good state after a successful step
  world.lastGoodState = _serializeNow(world);
}

/**
 * Internal snapshot helper — bypasses the public assertInitialized guard so
 * it can be called from within step().
 */
function _serializeNow(world: WorldState): SerializedPhysicsState {
  const rings: RingState[] = [];
  world.ringBodies.forEach((b) => rings.push(extractRingState(b)));
  const pegs: PhysicsPegState[] = [];
  world.pegBodies.forEach((b) => pegs.push(extractPegState(b)));
  return { rings, pegs, timestamp: Date.now() };
}

/**
 * Apply water forces to all non-settled ring bodies.
 *
 * Delegates to WaterSimulation.applyWaterForces which implements the
 * four-layer water force model (Req 22.1-22.7): directional button force,
 * background current, buoyancy, turbulence, and depth-scaled drag.
 *
 * Requirement 10.1, 22.1
 */
function applyWaterForces(input: InputState): void {
  if (!_world) return;
  const world = _world;
  const { arena } = world.challengeConfig;

  // Map the public InputState to the full WaterInputState expected by
  // WaterSimulation, providing arena dimensions and defaulting optional
  // turbulence fields when they are absent.
  const waterInput: WaterInputState = {
    leftHeld: input.leftHeld,
    rightHeld: input.rightHeld,
    leftIntensity: input.leftIntensity,
    rightIntensity: input.rightIntensity,
    turbulenceActive: (input as Partial<WaterInputState>).turbulenceActive ?? false,
    turbulenceSeed: (input as Partial<WaterInputState>).turbulenceSeed ?? 0,
    arenaWidth: arena.width,
    arenaHeight: arena.height,
  };

  applyWaterForcesImpl(world.engine.world, waterInput, world.challengeConfig);
}

/**
 * Extract current position, velocity, and angle of every ring body.
 *
 * Requirement 10.1
 */
function getRingStates(): RingState[] {
  if (!_world) return [];
  const states: RingState[] = [];
  _world.ringBodies.forEach((body) => {
    states.push(extractRingState(body));
  });
  return states;
}

/**
 * Extract peg positions and the ring IDs that have settled on them.
 *
 * Requirement 10.1
 */
function getPegStates(): PegState[] {
  if (!_world) return [];
  const states: PegState[] = [];
  _world.pegBodies.forEach((body) => {
    const plugin = body.plugin as PegPlugin;
    states.push({ id: plugin.pegId, settledRingId: plugin.settledRingId });
  });
  return states;
}

/**
 * Serialise all body states to a plain object for MMKV checkpointing.
 *
 * Requirement 10.1
 */
function serializeState(): SerializedPhysicsState {
  const world = assertInitialized();
  return _serializeNow(world);
}

/**
 * Restore body positions/velocities/angles from a serialised snapshot.
 *
 * Requirement 10.1
 */
function restoreState(state: SerializedPhysicsState): void {
  const { ringBodies, pegBodies } = assertInitialized();
  state.rings.forEach((rs) => {
    const body = ringBodies.get(rs.id);
    if (!body) {
      return;
    }
    Matter.Body.setPosition(body, { x: rs.x, y: rs.y });
    Matter.Body.setVelocity(body, { x: rs.vx, y: rs.vy });
    Matter.Body.setAngle(body, rs.angle);
    Matter.Body.setAngularVelocity(body, rs.angularV);
    (body.plugin as RingPlugin).settledOnPegId = rs.settledOnPegId;
  });
  state.pegs.forEach((ps) => {
    const body = pegBodies.get(ps.id);
    if (!body) {
      return;
    }
    (body.plugin as PegPlugin).settledRingId = ps.settledRingId;
  });
}

/**
 * Register a callback to be fired each time a ring successfully lands on a peg.
 *
 * This allows React components (e.g. GameScreen) to wire progressive music
 * lifecycle hooks (onFirstRingLanded, etc.) into the physics layer without
 * requiring React hooks inside PhysicsWorld.
 *
 * Pass `null` to unregister.
 */
function setOnRingLandedCallback(cb: (() => void) | null): void {
  _onRingLandedCallback = cb;
}

/**
 * Clear all bodies and tear down the engine.
 * Must be called when a challenge ends or the component unmounts.
 *
 * Requirement 10.1
 */
function destroy(): void {
  if (!_world) {
    return;
  }
  // Remove collision event listener before clearing engine (prevents listener stacking)
  Matter.Events.off(_world.engine, 'collisionStart');
  Matter.World.clear(_world.engine.world, false);
  Matter.Engine.clear(_world.engine);
  _world = null;
  _onRingLandedCallback = null;
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

export const PhysicsWorld = {
  initialize,
  step,
  applyWaterForces,
  getRingStates,
  getPegStates,
  serializeState,
  restoreState,
  destroy,
  setOnRingLandedCallback,
} as const;
