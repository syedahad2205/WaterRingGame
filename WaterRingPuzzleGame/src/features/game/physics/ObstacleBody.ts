/**
 * ObstacleBody — arena wall factory and game obstacle factory.
 *
 * Arena walls are four static, thick rectangles that bound the physics
 * simulation viewport. Obstacles are dynamic (or static) bodies placed
 * inside the arena according to a ChallengeConfig.
 *
 * Requirements: 21.4, 21.5
 */

import Matter from 'matter-js';
import { ArenaLayout, ObstacleConfig } from '../../../types/challenge';

// ---------------------------------------------------------------------------
// Collision categories
// ---------------------------------------------------------------------------

/** Collision filter category for arena walls. */
export const CATEGORY_WALL = 0x0004;

/** Collision filter mask for walls — collide with everything by default. */
export const MASK_WALL = 0xffff;

// ---------------------------------------------------------------------------
// Wall constants
// ---------------------------------------------------------------------------

/**
 * Thickness (px) of each arena wall. Must be large enough to prevent
 * fast-moving rings from tunnelling through in a single physics tick.
 */
const WALL_THICKNESS = 50;

/** Restitution applied to every arena wall (Requirement 21.4). */
const WALL_RESTITUTION = 0.3;

/** Friction applied to every arena wall (Requirement 21.4). */
const WALL_FRICTION = 0.1;

// ---------------------------------------------------------------------------
// Arena wall factory
// ---------------------------------------------------------------------------

/**
 * Creates four static wall bodies that bound the arena viewport.
 *
 * Wall placement (center coordinates, half-thickness inset):
 *   - Left:   x = -WALL_THICKNESS/2,         y = height/2
 *   - Right:  x = width + WALL_THICKNESS/2,  y = height/2
 *   - Top:    x = width/2,                   y = -WALL_THICKNESS/2
 *   - Bottom: x = width/2,                   y = height + WALL_THICKNESS/2
 *
 * The wall centers sit outside the viewport so the inner face is exactly
 * flush with the viewport edge.
 *
 * Note: Matter.js resets restitution to 0 and friction to 1 when `isStatic`
 * is passed as a constructor option. We work around this by making the body
 * static via `Body.setStatic` after creation and then assigning the physics
 * properties directly.
 *
 * @param arenaLayout - Arena dimensions from ChallengeConfig.
 * @returns Array of four static Matter.Body instances [left, right, top, bottom].
 *
 * Requirements: 21.4, 21.5
 */
export function createArenaWalls(arenaLayout: ArenaLayout): Matter.Body[] {
  const { width, height } = arenaLayout;

  const half = WALL_THICKNESS / 2;

  const collisionFilter = { category: CATEGORY_WALL, mask: MASK_WALL };

  const makeWall = (x: number, y: number, w: number, h: number, label: string): Matter.Body => {
    const body = Matter.Bodies.rectangle(x, y, w, h, {
      label,
      collisionFilter,
    });
    Matter.Body.setStatic(body, true);
    // isStatic resets restitution/friction — assign after setStatic
    body.restitution = WALL_RESTITUTION;
    body.friction = WALL_FRICTION;
    return body;
  };

  // Left wall — tall rectangle on the left edge
  const left = makeWall(
    -half,
    height / 2,
    WALL_THICKNESS,
    height + WALL_THICKNESS * 2,
    'wall-left',
  );

  // Right wall — tall rectangle on the right edge
  const right = makeWall(
    width + half,
    height / 2,
    WALL_THICKNESS,
    height + WALL_THICKNESS * 2,
    'wall-right',
  );

  // Top wall — wide rectangle on the top edge
  const top = makeWall(
    width / 2,
    -half,
    width + WALL_THICKNESS * 2,
    WALL_THICKNESS,
    'wall-top',
  );

  // Bottom wall — wide rectangle on the bottom edge
  const bottom = makeWall(
    width / 2,
    height + half,
    width + WALL_THICKNESS * 2,
    WALL_THICKNESS,
    'wall-bottom',
  );

  return [left, right, top, bottom];
}

// ---------------------------------------------------------------------------
// Obstacle factory helpers
// ---------------------------------------------------------------------------

/**
 * Creates a horizontal bar obstacle body.
 *
 * @param x      - Center x position in px.
 * @param y      - Center y position in px.
 * @param width  - Bar width in px.
 * @param height - Bar height in px.
 * @returns A static Matter.Body rectangle.
 */
export function createHorizontalBar(
  x: number,
  y: number,
  width: number,
  height: number,
): Matter.Body {
  const body = Matter.Bodies.rectangle(x, y, width, height, {
    label: 'obstacle-bar',
  });
  Matter.Body.setStatic(body, true);
  body.restitution = 0.3;
  body.friction = 0.1;
  return body;
}

// ---------------------------------------------------------------------------
// Generic obstacle factory
// ---------------------------------------------------------------------------

/**
 * Creates a Matter.Body from a serialised ObstacleConfig.
 *
 * Supported shapes:
 *   - 'rectangle' — uses config.width × config.height
 *   - 'circle'    — uses config.width as radius
 *   - 'polygon'   — uses config.vertices (falls back to rectangle if absent)
 *
 * Note: Matter.js resets restitution/friction when `isStatic` is passed as a
 * constructor option. For static obstacles we use Body.setStatic after
 * creation and assign the physics values directly.
 *
 * @param config - Obstacle configuration from ChallengeConfig.
 * @returns A Matter.Body with physics properties set from the config.
 */
export function createObstacleFromConfig(config: ObstacleConfig): Matter.Body {
  const { position, angle, width, height, shape, restitution, friction, vertices } = config;

  const constructorProps: Matter.IBodyDefinition = {
    angle,
    label: `obstacle-${config.id}`,
  };

  let body: Matter.Body;

  if (shape === 'circle') {
    body = Matter.Bodies.circle(position.x, position.y, width, constructorProps);
  } else if (shape === 'polygon' && vertices && vertices.length >= 3) {
    body = Matter.Bodies.fromVertices(
      position.x,
      position.y,
      [vertices.map(v => ({ x: v.x, y: v.y }))],
      constructorProps,
    );
  } else {
    // Default: rectangle (also handles 'rectangle' shape explicitly)
    body = Matter.Bodies.rectangle(position.x, position.y, width, height, constructorProps);
  }

  // Set static flag via setStatic to avoid Matter.js resetting restitution/friction,
  // then assign the physics values after the fact.
  if (!config.isMoving) {
    Matter.Body.setStatic(body, true);
  }
  body.restitution = restitution;
  body.friction = friction;

  return body;
}
