/**
 * RingWakeSystem.ts — Layer 3: Ring Wake System computation helpers.
 *
 * Pure computation module — no React, no Skia, no side effects.
 * All exported functions and types are safe to import and test without
 * any native module setup.
 *
 * Design.md specification (Layer 3 — Ring Wake System):
 *   - Every ring moving faster than a minimum velocity threshold generates a
 *     V-shaped wake (Kelvin wake angle = 19.5° half-angle).
 *   - Each ring maintains a circular buffer of position samples:
 *     last 300ms of positions at 30 samples/second (max 9 samples).
 *   - Wake length scales with ring velocity, max 80px.
 *   - Wake fades exponentially over 600ms.
 *   - Performance cap: with 6+ active rings, only the 3 fastest rings get wakes.
 *
 * Requirements: 38.4
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Kelvin wake half-angle in degrees (design.md Layer 3). */
export const KELVIN_ANGLE_DEG = 19.5;

/** Kelvin wake half-angle in radians. */
export const KELVIN_ANGLE_RAD = (KELVIN_ANGLE_DEG * Math.PI) / 180;

/** Maximum wake length in logical pixels. */
export const MAX_WAKE_LENGTH_PX = 80;

/** Wake fade duration in milliseconds. */
export const WAKE_FADE_MS = 600;

/** Duration of position history to retain, in milliseconds. */
export const WAKE_TRAIL_WINDOW_MS = 300;

/** Sample rate for wake trail positions (samples per second). */
export const WAKE_SAMPLE_RATE = 30;

/** Maximum number of position samples in the circular buffer.
 *  = WAKE_TRAIL_WINDOW_MS / 1000 * WAKE_SAMPLE_RATE = 9 samples. */
export const MAX_WAKE_SAMPLES = Math.round((WAKE_TRAIL_WINDOW_MS / 1000) * WAKE_SAMPLE_RATE);

/** When ring count meets or exceeds this threshold, apply the performance cap. */
export const WAKE_PERFORMANCE_CAP_THRESHOLD = 6;

/** Maximum number of wakes to render when performance cap is active. */
export const WAKE_PERFORMANCE_CAP_MAX = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single position sample in the wake trail circular buffer. */
export interface WakePositionSample {
  /** Ring x-position in logical pixels. */
  x: number;
  /** Ring y-position in logical pixels. */
  y: number;
  /** Timestamp of this sample in milliseconds (e.g. from performance.now()). */
  t: number;
}

/**
 * Wake trail for one ring.
 *
 * Maintains a circular buffer of the last {@link WAKE_TRAIL_WINDOW_MS}ms of
 * position samples at {@link WAKE_SAMPLE_RATE} samples/second.
 * Positions older than the window are pruned by {@link updateWakeTrails}.
 */
export interface WakeTrail {
  /** Unique ring identifier. */
  ringId: string;
  /** Ordered position samples (oldest first, newest last). */
  positions: WakePositionSample[];
}

/** A 2D point used in wake path computation. */
export interface WakePathPoint {
  x: number;
  y: number;
  /** Opacity at this point ∈ [0, 1] — decreases towards the tail. */
  opacity: number;
}

/** Current position and speed snapshot for a ring, used for performance cap logic. */
export interface RingSpeedSnapshot {
  ringId: string;
  x: number;
  y: number;
  /** Speed magnitude in pixels/second. */
  speed: number;
}

// ---------------------------------------------------------------------------
// Core pure functions
// ---------------------------------------------------------------------------

/**
 * Update wake trails for the current frame:
 *   1. Remove stale position samples older than {@link WAKE_TRAIL_WINDOW_MS}ms.
 *   2. Add a new sample for each ring in `ringPositions` (if the ring has a
 *      trail) or create a new trail entry for new rings.
 *   3. Enforce the circular buffer size cap ({@link MAX_WAKE_SAMPLES}).
 *
 * Rings that are no longer present in `ringPositions` are removed from the
 * returned trails array.
 *
 * @param trails        Current wake trails array (not mutated).
 * @param ringPositions Latest ring position snapshots.
 * @param nowMs         Current timestamp in milliseconds.
 * @returns             Updated wake trails array (new array + new sample objects).
 */
export function updateWakeTrails(
  trails: WakeTrail[],
  ringPositions: RingSpeedSnapshot[],
  nowMs: number,
): WakeTrail[] {
  const cutoffMs = nowMs - WAKE_TRAIL_WINDOW_MS;

  // Build a map of current ring ids for fast lookup.
  const activeRingIds = new Set(ringPositions.map((r) => r.ringId));

  // Build a map of existing trails by ringId.
  const trailMap = new Map<string, WakeTrail>(trails.map((t) => [t.ringId, t]));

  const updatedTrails: WakeTrail[] = [];

  for (const ring of ringPositions) {
    const existing = trailMap.get(ring.ringId);

    // Prune old positions and enforce the max sample cap.
    const pruned: WakePositionSample[] = existing
      ? existing.positions.filter((p) => p.t >= cutoffMs)
      : [];

    // Add the new sample.
    const newSample: WakePositionSample = { x: ring.x, y: ring.y, t: nowMs };
    const updated = [...pruned, newSample];

    // Cap at MAX_WAKE_SAMPLES — keep the most recent samples (tail of the array).
    const capped =
      updated.length > MAX_WAKE_SAMPLES
        ? updated.slice(updated.length - MAX_WAKE_SAMPLES)
        : updated;

    updatedTrails.push({ ringId: ring.ringId, positions: capped });
  }

  // Remove trails for rings no longer present (implicit: we only add trails
  // for rings in ringPositions above, so any ring not in activeRingIds is
  // simply not included).
  void activeRingIds; // used implicitly via the loop above

  return updatedTrails;
}

/**
 * Apply the performance cap: when there are 6+ active rings, return only
 * trails for the 3 fastest rings.
 *
 * @param trails          All active wake trails.
 * @param ringSnapshots   Speed snapshots for all active rings.
 * @returns               Filtered trails: all if < 6 rings, else top-3 fastest.
 */
export function applyWakePerformanceCap(
  trails: WakeTrail[],
  ringSnapshots: RingSpeedSnapshot[],
): WakeTrail[] {
  if (ringSnapshots.length < WAKE_PERFORMANCE_CAP_THRESHOLD) {
    return trails;
  }

  // Sort by speed descending; pick the top WAKE_PERFORMANCE_CAP_MAX ring ids.
  const topRingIds = new Set(
    [...ringSnapshots]
      .sort((a, b) => b.speed - a.speed)
      .slice(0, WAKE_PERFORMANCE_CAP_MAX)
      .map((r) => r.ringId),
  );

  return trails.filter((t) => topRingIds.has(t.ringId));
}

/**
 * Compute the V-shaped wake path points for a single wake trail.
 *
 * The wake is a Kelvin V shape centred on the most recent position in the
 * trail, opening behind the direction of travel.  The wake is split into a
 * left arm and a right arm at ±{@link KELVIN_ANGLE_RAD} from the reverse
 * travel direction.
 *
 * Length is capped at {@link MAX_WAKE_LENGTH_PX} and scales with the number
 * of position samples (more samples in the buffer = longer trail, reflecting
 * higher recent speed).
 *
 * Opacity at each point fades exponentially from the tip (newest, full opacity)
 * towards the tail (oldest, zero opacity) based on age relative to
 * {@link WAKE_FADE_MS}.
 *
 * @param trail         Wake trail for the ring.
 * @param nowMs         Current timestamp in milliseconds (for fade calculation).
 * @returns             Array of path points: [tipLeft, tailLeft, tip, tailRight,
 *                      tipRight] — suitable for building a Skia path.
 *                      Returns empty array if trail has fewer than 2 samples.
 */
export function computeWakePath(
  trail: WakeTrail,
  nowMs: number,
): WakePathPoint[] {
  if (trail.positions.length < 2) {
    return [];
  }

  const positions = trail.positions;
  const newest = positions[positions.length - 1];
  const oldest = positions[0];

  // Direction of travel: from oldest to newest sample.
  const dx = newest.x - oldest.x;
  const dy = newest.y - oldest.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If the ring hasn't moved, skip the wake.
  if (dist < 0.001) {
    return [];
  }

  // Unit vector in direction of travel.
  const ux = dx / dist;
  const uy = dy / dist;

  // Wake extends behind the ring (reverse direction).
  const bx = -ux;
  const by = -uy;

  // Scale wake length by distance travelled, capped at MAX_WAKE_LENGTH_PX.
  const wakeLength = Math.min(dist, MAX_WAKE_LENGTH_PX);

  // Age of the oldest sample (ms) — drives the fade.
  const ageMs = nowMs - oldest.t;
  const tailOpacity = Math.max(0, 1 - ageMs / WAKE_FADE_MS);

  // Rotate the backward direction by ±KELVIN_ANGLE_RAD for the two arms.
  const cosA = Math.cos(KELVIN_ANGLE_RAD);
  const sinA = Math.sin(KELVIN_ANGLE_RAD);

  // Left arm (rotate by +angle).
  const leftX = bx * cosA - by * sinA;
  const leftY = bx * sinA + by * cosA;

  // Right arm (rotate by -angle).
  const rightX = bx * cosA + by * sinA;
  const rightY = -bx * sinA + by * cosA;

  // Tip is the current ring position (newest sample).
  const tip: WakePathPoint = { x: newest.x, y: newest.y, opacity: 1.0 };

  // Tail points are at wakeLength distance from the tip, along each arm.
  const tailLeft: WakePathPoint = {
    x: newest.x + leftX * wakeLength,
    y: newest.y + leftY * wakeLength,
    opacity: tailOpacity,
  };

  const tailRight: WakePathPoint = {
    x: newest.x + rightX * wakeLength,
    y: newest.y + rightY * wakeLength,
    opacity: tailOpacity,
  };

  // Return [tailLeft, tip, tailRight] — a V shape opening behind the ring.
  return [tailLeft, tip, tailRight];
}
