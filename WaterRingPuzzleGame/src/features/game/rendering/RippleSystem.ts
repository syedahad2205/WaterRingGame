/**
 * RippleSystem.ts — Layer 5 of the Water Renderer
 *
 * Manages a pool of up to MAX_RIPPLES surface ripples.  Each ripple expands
 * outward from its spawn point and fades to zero opacity over its lifetime.
 * Four ripple types are supported, each with distinct visual parameters.
 *
 * Requirements: 43.4
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RippleType = 'bubble_pop' | 'ring_surface_break' | 'button_press' | 'rain_drop';

export interface Ripple {
  id: number;
  x: number; // centre x (px)
  y: number; // centre y (px)
  type: RippleType;
  spawnTimeMs: number;
  active: boolean;
}

/** Visual parameters that drive the expansion and fade of a ripple. */
export interface RippleParams {
  maxOpacity: number; // peak opacity (at t=0)
  durationMs: number; // total lifetime in milliseconds
  expandSpeed: number; // expansion rate in pixels per second
}

/** Instantaneous render state for a single ripple. */
export interface RippleState {
  radius: number;
  opacity: number;
  alive: boolean;
}

/** Ready-to-use data for Skia drawCircle. */
export interface RipplePath {
  x: number;
  y: number;
  radius: number;
  opacity: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_RIPPLES = 20;

/**
 * Per-type parameters table.
 *
 * | Type               | maxOpacity | durationMs | expandSpeed (px/s) |
 * |--------------------|------------|------------|---------------------|
 * | bubble_pop         | 0.30       | 600        | 80                  |
 * | ring_surface_break | 0.50       | 800        | 100                 |
 * | button_press       | 0.40       | 1000       | 120                 |
 * | rain_drop          | 0.25       | 500        | 60                  |
 */
export const RIPPLE_PARAMS: Record<RippleType, RippleParams> = {
  bubble_pop: { maxOpacity: 0.3, durationMs: 600, expandSpeed: 80 },
  ring_surface_break: { maxOpacity: 0.5, durationMs: 800, expandSpeed: 100 },
  button_press: { maxOpacity: 0.4, durationMs: 1000, expandSpeed: 120 },
  rain_drop: { maxOpacity: 0.25, durationMs: 500, expandSpeed: 60 },
};

// ---------------------------------------------------------------------------
// Internal counter for unique ripple IDs
// ---------------------------------------------------------------------------

let _nextId = 1;

// ---------------------------------------------------------------------------
// Pool management
// ---------------------------------------------------------------------------

/**
 * Spawn a new ripple into `pool`.
 *
 * If the pool has reached MAX_RIPPLES, the oldest entry (lowest id) is
 * removed to make room for the new one.
 *
 * @param pool     Mutable ripple array (modified in-place).
 * @param x        Centre x coordinate (px).
 * @param y        Centre y coordinate (px).
 * @param type     Which ripple type to spawn.
 * @param nowMs    Current timestamp in milliseconds.
 */
export function spawnRipple(
  pool: Ripple[],
  x: number,
  y: number,
  type: RippleType,
  nowMs: number,
): void {
  // Cull oldest if the pool is full.
  if (pool.length >= MAX_RIPPLES) {
    // Find the entry with the smallest id (spawned earliest).
    let oldestIdx = 0;
    for (let i = 1; i < pool.length; i++) {
      if (pool[i].id < pool[oldestIdx].id) {
        oldestIdx = i;
      }
    }
    pool.splice(oldestIdx, 1);
  }

  pool.push({
    id: _nextId++,
    x,
    y,
    type,
    spawnTimeMs: nowMs,
    active: true,
  });
}

/**
 * Mark expired ripples as inactive and return the number still alive.
 *
 * @param pool   Mutable ripple array.
 * @param nowMs  Current timestamp in milliseconds.
 * @returns      Number of active (not yet expired) ripples.
 */
export function updateRipples(pool: Ripple[], nowMs: number): number {
  let activeCount = 0;
  for (const ripple of pool) {
    if (!ripple.active) {
      continue;
    }
    const { durationMs } = RIPPLE_PARAMS[ripple.type];
    const elapsed = nowMs - ripple.spawnTimeMs;
    if (elapsed >= durationMs) {
      ripple.active = false;
    } else {
      activeCount++;
    }
  }
  return activeCount;
}

// ---------------------------------------------------------------------------
// Per-ripple state computation
// ---------------------------------------------------------------------------

/**
 * Compute the instantaneous visual state of a ripple at `nowMs`.
 *
 * Formulae:
 *   elapsed  = nowMs − spawnTimeMs
 *   radius   = expandSpeed × (elapsed / 1000)
 *   opacity  = maxOpacity × (1 − elapsed / durationMs)   ← linear fade-out
 *   alive    = elapsed < durationMs
 *
 * @param ripple  The ripple to evaluate.
 * @param nowMs   Current timestamp in milliseconds.
 */
export function getRippleState(ripple: Ripple, nowMs: number): RippleState {
  const { maxOpacity, durationMs, expandSpeed } = RIPPLE_PARAMS[ripple.type];
  const elapsed = nowMs - ripple.spawnTimeMs;

  const alive = elapsed < durationMs;
  const radius = expandSpeed * (elapsed / 1000);

  // Clamp progress to [0, 1] so we never produce negative opacity.
  const progress = Math.min(elapsed / durationMs, 1);
  const opacity = maxOpacity * (1 - progress);

  return { radius, opacity, alive };
}

/**
 * Build the draw-call descriptor used by the Skia canvas layer.
 *
 * Returns the ripple's centre, current radius, and current opacity — all the
 * data needed for a single `drawCircle` call with a stroke-style paint.
 *
 * @param ripple  The ripple to render.
 * @param nowMs   Current timestamp in milliseconds.
 */
export function computeRipplePath(ripple: Ripple, nowMs: number): RipplePath {
  const { radius, opacity } = getRippleState(ripple, nowMs);
  return {
    x: ripple.x,
    y: ripple.y,
    radius,
    opacity,
  };
}
