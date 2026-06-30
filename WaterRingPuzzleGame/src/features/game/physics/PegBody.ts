/**
 * PegBody — Matter.js sensor body factory for pegs.
 *
 * Pegs are sensor bodies (isSensor: true) that detect ring overlap without
 * producing a physical collision response. They occupy a separate collision
 * filter category from rings so that rings can still collide with each other
 * and with walls while peg sensors only detect ring bodies.
 *
 * Collision filter categories
 * ───────────────────────────
 *   CATEGORY_RING       = 0x0001  (rings collide with walls and other rings)
 *   CATEGORY_WALL       = 0x0002  (arena walls)
 *   CATEGORY_PEG_SENSOR = 0x0004  (peg sensor — detects ring bodies only)
 *
 * Ring filter  : category = CATEGORY_RING,       mask = CATEGORY_RING | CATEGORY_WALL
 * Peg filter   : category = CATEGORY_PEG_SENSOR, mask = CATEGORY_RING
 *
 * Body metadata (body.plugin)
 * ────────────────────────────
 *   pegId              – unique peg identifier
 *   acceptedColorId    – color the landing ring must match
 *   acceptedRingSizes  – size categories this peg accepts
 *   tipRadius          – tip radius used for acceptance zone (1.2 × tipRadius)
 *   acceptanceRadius   – pre-computed 1.2 × tipRadius for fast lookup
 *   isMoving           – whether this peg follows a movement path
 *   movementPath       – optional PathDefinition for moving pegs
 *   settledRingId      – id of the ring currently settled here, or null
 *
 * Requirements: 10.4
 */

import Matter from 'matter-js';
import type { PegConfig, PathDefinition, RingSizeCategory } from '../../../types/challenge';

// ---------------------------------------------------------------------------
// Collision filter constants
// ---------------------------------------------------------------------------

/** Rings: collide with other rings and walls. */
export const CATEGORY_RING = 0x0001;

/** Arena walls: collide with rings. */
export const CATEGORY_WALL = 0x0002;

/** Peg sensors: detect ring bodies but have no physical collision response. */
export const CATEGORY_PEG_SENSOR = 0x0004;

// ---------------------------------------------------------------------------
// Peg-sensor acceptance zone multiplier
// ---------------------------------------------------------------------------

/**
 * A ring center must be within (ACCEPTANCE_ZONE_MULTIPLIER × tipRadius) of
 * the peg center horizontally for acceptance to be evaluated.
 *
 * Requirement 10.4 / 10.6 condition 1.
 */
export const ACCEPTANCE_ZONE_MULTIPLIER = 1.2;

// ---------------------------------------------------------------------------
// Typed plugin metadata stored on body.plugin
// ---------------------------------------------------------------------------

export interface PegBodyPlugin {
  pegId: string;
  acceptedColorId: string;
  acceptedRingSizes: RingSizeCategory[];
  tipRadius: number;
  /** Pre-computed acceptance radius = ACCEPTANCE_ZONE_MULTIPLIER × tipRadius. */
  acceptanceRadius: number;
  isMoving: boolean;
  movementPath?: PathDefinition;
  settledRingId: string | null;
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * createPegBody
 *
 * Constructs a circular Matter.js sensor body for a peg.
 * The body radius equals the peg's tipRadius so it represents the acceptance
 * zone centre point, while the full acceptance radius is stored in plugin.
 *
 * @param config - The peg configuration from ChallengeConfig.
 * @returns A fully configured Matter.Body (sensor, correct filter, metadata).
 */
export function createPegBody(config: PegConfig): Matter.Body {
  const acceptanceRadius = ACCEPTANCE_ZONE_MULTIPLIER * config.tipRadius;

  const body = Matter.Bodies.circle(
    config.position.x,
    config.position.y,
    // Use tipRadius as the body radius — acceptance zone is tracked via plugin.
    config.tipRadius,
    {
      isStatic: true,
      isSensor: true,
      label: `peg_${config.id}`,
      collisionFilter: {
        category: CATEGORY_PEG_SENSOR,
        mask: CATEGORY_RING,
        group: 0,
      },
      // Sensors have no restitution / friction, but set safe defaults.
      restitution: 0,
      friction: 0,
      frictionAir: 0,
    },
  );

  // Attach metadata to body.plugin so the collision handler can read it
  // without an external lookup table.
  const plugin: PegBodyPlugin = {
    pegId: config.id,
    acceptedColorId: config.acceptedColorId,
    acceptedRingSizes: config.acceptedRingSizes,
    tipRadius: config.tipRadius,
    acceptanceRadius,
    isMoving: config.isMoving,
    movementPath: config.movementPath,
    settledRingId: null,
  };

  (body as Matter.Body & { plugin: PegBodyPlugin }).plugin = plugin;

  return body;
}

// ---------------------------------------------------------------------------
// Moving peg update
// ---------------------------------------------------------------------------

/**
 * updateMovingPeg
 *
 * Repositions a moving peg body according to its PathDefinition each physics
 * tick. Call once per fixed-timestep tick with the accumulated elapsed time
 * (in milliseconds) from challenge start.
 *
 * The peg travels along its waypoints linearly, looping if path.loop is true.
 * Matter.Body.setPosition is used (not velocity) because pegs are static
 * sensor bodies — they should not participate in impulse calculations.
 *
 * @param body         - The peg Matter.Body returned by createPegBody.
 * @param elapsedTime  - Milliseconds since challenge start (monotonically increasing).
 */
export function updateMovingPeg(body: Matter.Body, elapsedTime: number): void {
  const plugin = (body as Matter.Body & { plugin?: PegBodyPlugin }).plugin;

  if (!plugin || !plugin.isMoving || !plugin.movementPath) {
    return;
  }

  const path = plugin.movementPath;
  const { points, durationMs, loop } = path;

  if (points.length === 0) {
    return;
  }

  if (points.length === 1) {
    Matter.Body.setPosition(body, { x: points[0].x, y: points[0].y });
    return;
  }

  // Determine the normalized time position along the path [0, 1).
  let normalizedTime: number;
  if (loop) {
    normalizedTime = (elapsedTime % durationMs) / durationMs;
  } else {
    normalizedTime = Math.min(elapsedTime / durationMs, 1);
  }

  // Map normalizedTime onto the segment between adjacent waypoints.
  // Each segment has equal time weight (1 / (points.length - 1)).
  const segmentCount = points.length - 1;
  const segmentDuration = 1 / segmentCount;
  const segmentIndex = Math.min(
    Math.floor(normalizedTime / segmentDuration),
    segmentCount - 1,
  );
  const segmentT = (normalizedTime - segmentIndex * segmentDuration) / segmentDuration;

  const from = points[segmentIndex];
  const to = points[segmentIndex + 1];

  const newX = from.x + (to.x - from.x) * segmentT;
  const newY = from.y + (to.y - from.y) * segmentT;

  Matter.Body.setPosition(body, { x: newX, y: newY });
}

// ---------------------------------------------------------------------------
// Plugin accessor helper
// ---------------------------------------------------------------------------

/**
 * getPegPlugin
 *
 * Type-safe accessor for the PegBodyPlugin stored on a body's plugin field.
 * Returns null if the body is not a peg body (e.g. ring or obstacle body).
 */
export function getPegPlugin(body: Matter.Body): PegBodyPlugin | null {
  const plugin = (body as Matter.Body & { plugin?: PegBodyPlugin }).plugin;
  if (
    plugin !== null &&
    plugin !== undefined &&
    typeof plugin === 'object' &&
    'pegId' in plugin
  ) {
    return plugin as PegBodyPlugin;
  }
  return null;
}
