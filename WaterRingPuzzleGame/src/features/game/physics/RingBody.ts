/**
 * RingBody — Matter.js ring body factory and pool manager.
 *
 * Rings are represented as 24-vertex polygons that approximate a circle.
 * Matter.js does not support hollow bodies natively — the inner hole is
 * visual-only. All physics interactions use the outer polygon.
 *
 * poly-decomp is required by Matter.Bodies.fromVertices for correct
 * polygon decomposition. It must be registered via Matter.Common.setDecomp
 * before any fromVertices call is made.
 *
 * Collision filter
 * ────────────────
 *   Rings use CATEGORY_RING and collide with other rings (CATEGORY_RING)
 *   and arena walls (CATEGORY_WALL). They do NOT collide with peg sensors
 *   (CATEGORY_PEG_SENSOR) in the normal sense — pegs are sensors whose
 *   collision handler decides when a ring has "settled".
 *
 * Body metadata (body.plugin)
 * ────────────────────────────
 *   ringId          – unique ring identifier (matches RingConfig.id)
 *   colorId         – color used for peg matching
 *   sizeCategory    – 'small' | 'medium' | 'large'
 *   buoyancy        – 0.0 (stone) to 1.0 (cork)
 *   settledOnPegId  – id of the peg this ring is settled on, or null
 *   isDecoy         – decoy rings need no peg match
 *
 * Size tier properties (Requirements 23.1, 23.2, 23.3)
 * ──────────────────────────────────────────────────────
 *   small  : outerRadius=22, mass=0.5, buoyancy=0.85, frictionAir=0.015, restitution=0.3
 *   medium : outerRadius=32, mass=1.0, buoyancy=0.65, frictionAir=0.015, restitution=0.3
 *   large  : outerRadius=44, mass=2.2, buoyancy=0.45, frictionAir=0.015, restitution=0.3
 *
 * Object pooling (Requirement 24.4)
 * ───────────────────────────────────
 *   RingBodyPool pre-allocates all bodies at challenge start and reuses
 *   them. No new allocations happen during active gameplay.
 *
 * Requirements: 10.3, 23.1, 23.2, 23.3, 24.4
 */

import Matter from 'matter-js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const decomp = require('poly-decomp') as unknown;
import type { RingConfig, Vector2D } from '../../../types/challenge';
import { CATEGORY_RING, CATEGORY_WALL } from './PegBody';

// ---------------------------------------------------------------------------
// Register poly-decomp for Matter.Bodies.fromVertices
// ---------------------------------------------------------------------------

// Must be called once before any fromVertices call.
Matter.Common.setDecomp(decomp);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of polygon vertices used to approximate a ring circle. */
export const RING_VERTEX_COUNT = 24;

/** Restitution applied to all ring bodies (slight bounce). */
const RING_RESTITUTION = 0.3;

/** Air friction / water drag coefficient applied to all ring bodies. */
const RING_FRICTION_AIR = 0.015;

/** Default angular damping for ring bodies. */
const RING_ANGULAR_DAMPING = 0.01;

/** Default linear (translation) damping for ring bodies. */
// const RING_LINEAR_DAMPING = 0.01; // unused

// ---------------------------------------------------------------------------
// Typed plugin metadata stored on body.plugin
// ---------------------------------------------------------------------------

export interface RingBodyPlugin {
  ringId: string;
  colorId: string;
  sizeCategory: 'small' | 'medium' | 'large';
  buoyancy: number;
  settledOnPegId: string | null;
  isDecoy: boolean;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/**
 * buildPolygonVertices
 *
 * Generates `RING_VERTEX_COUNT` evenly-spaced vertices on the circumference
 * of a circle of the given `outerRadius`, centred at `position`.
 *
 * @param position    - Centre of the circle in world space.
 * @param outerRadius - Radius of the ring's outer edge in pixels.
 * @returns Array of 24 {x, y} vertices.
 */
function buildPolygonVertices(
  position: Vector2D,
  outerRadius: number,
): Matter.Vector[] {
  const vertices: Matter.Vector[] = [];
  for (let i = 0; i < RING_VERTEX_COUNT; i++) {
    const angle = (2 * Math.PI * i) / RING_VERTEX_COUNT;
    vertices.push({
      x: position.x + outerRadius * Math.cos(angle),
      y: position.y + outerRadius * Math.sin(angle),
    });
  }
  return vertices;
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * createRingBody
 *
 * Constructs a 24-vertex polygon Matter.js body for a ring.
 * Per-tier physics properties are applied after body creation so that the
 * exact mass matches the spec (Matter may internally scale mass via area).
 *
 * @param config   - Full ring configuration from ChallengeConfig.rings[].
 * @param position - Initial spawn position in world space.
 * @returns A fully configured Matter.Body ready to be added to a world.
 */
export function createRingBody(config: RingConfig, position: Vector2D): Matter.Body {
  const vertices = buildPolygonVertices(position, config.outerRadius);

  // fromVertices uses poly-decomp to decompose the polygon.
  // We pass flagInternal=false so Matter merges co-planar parts cleanly.
  const body = Matter.Bodies.fromVertices(
    position.x,
    position.y,
    [vertices],
    {
      label: `ring_${config.id}`,
      restitution: config.restitution ?? RING_RESTITUTION,
      frictionAir: config.frictionAir ?? RING_FRICTION_AIR,
      friction: 0.1,
      collisionFilter: {
        category: CATEGORY_RING,
        // Rings collide with other rings and arena walls, but NOT peg sensors.
        mask: CATEGORY_RING | CATEGORY_WALL,
        group: 0,
      },
    },
    // flagInternal=false, removeCollinear=0.01, minimumArea=10
    false,
    0.01,
    10,
  );

  // Override mass with the exact spec value; Matter may recompute from area.
  Matter.Body.setMass(body, config.mass);

  // Apply damping values.
  // angularDamping is a valid Matter.js property but missing from @types/matter-js.
  // We use a cast to set it; the WaterSimulation reads it to apply angular drag.
  (body as Matter.Body & { angularDamping: number }).angularDamping =
    config.angularDamping ?? RING_ANGULAR_DAMPING;
  body.frictionAir = config.frictionAir ?? RING_FRICTION_AIR;

  // Attach metadata to body.plugin for fast lookup in collision handlers.
  const plugin: RingBodyPlugin = {
    ringId: config.id,
    colorId: config.colorId,
    sizeCategory: config.sizeCategory,
    buoyancy: config.buoyancy,
    settledOnPegId: null,
    isDecoy: config.isDecoy,
  };

  (body as Matter.Body & { plugin: RingBodyPlugin }).plugin = plugin;

  return body;
}

// ---------------------------------------------------------------------------
// Ring Body Pool (Requirement 24.4 — no new allocations during gameplay)
// ---------------------------------------------------------------------------

/**
 * RingBodyPool
 *
 * Pre-allocates all ring bodies at challenge start and provides O(1) lookup
 * by ringId during gameplay. No new Matter.Body objects are created after
 * preAllocate has been called.
 *
 * Usage:
 *   // At challenge start:
 *   RingBodyPool.preAllocate(challengeConfig.rings);
 *
 *   // During gameplay:
 *   const body = RingBodyPool.getBody('ring-1');
 */
export const RingBodyPool = {
  _pool: new Map<string, Matter.Body>(),

  /**
   * preAllocate
   *
   * Creates and caches one Matter.Body for each ring in `rings`.
   * The body is positioned at each ring's `initialPosition`.
   * Clears any previously pooled bodies first.
   *
   * @param rings - Array of RingConfig from ChallengeConfig.
   */
  preAllocate(rings: RingConfig[]): void {
    this._pool.clear();
    for (const ringConfig of rings) {
      const body = createRingBody(ringConfig, ringConfig.initialPosition);
      this._pool.set(ringConfig.id, body);
    }
  },

  /**
   * getBody
   *
   * Returns the pre-allocated Matter.Body for the given ringId.
   * Returns null if the ringId was not in the original rings array.
   *
   * @param ringId - The ring identifier matching RingConfig.id.
   */
  getBody(ringId: string): Matter.Body | null {
    return this._pool.get(ringId) ?? null;
  },

  /**
   * getAllBodies
   *
   * Returns all pooled bodies as an array, e.g. to add them all to a world.
   */
  getAllBodies(): Matter.Body[] {
    return Array.from(this._pool.values());
  },

  /**
   * clear
   *
   * Releases all pooled bodies. Call at challenge end or when
   * the physics world is torn down.
   */
  clear(): void {
    this._pool.clear();
  },
};

// ---------------------------------------------------------------------------
// Plugin accessor helper
// ---------------------------------------------------------------------------

/**
 * getRingPlugin
 *
 * Type-safe accessor for the RingBodyPlugin stored on a body's plugin field.
 * Returns null if the body is not a ring body (e.g. peg or obstacle body).
 */
export function getRingPlugin(body: Matter.Body): RingBodyPlugin | null {
  const plugin = (body as Matter.Body & { plugin?: RingBodyPlugin }).plugin;
  if (
    plugin !== null &&
    plugin !== undefined &&
    typeof plugin === 'object' &&
    'ringId' in plugin
  ) {
    return plugin as RingBodyPlugin;
  }
  return null;
}
