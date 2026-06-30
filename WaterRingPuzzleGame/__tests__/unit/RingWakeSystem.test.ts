/**
 * Unit tests for RingWakeSystem — task 5.2.2
 *
 * Covers:
 *   - Circular buffer overflow: positions > 300ms old are pruned
 *   - Performance cap: 6+ rings → wakes only for 3 fastest
 *   - V-shape path computation: 3 points (tailLeft, tip, tailRight)
 *   - updateWakeTrails adds new samples and removes stale ones
 *   - computeWakePath returns empty array for insufficient samples
 *
 * Requirements: 38.4
 */

import {
  updateWakeTrails,
  computeWakePath,
  applyWakePerformanceCap,
  WAKE_TRAIL_WINDOW_MS,
  MAX_WAKE_SAMPLES,
  WAKE_PERFORMANCE_CAP_THRESHOLD,
  WAKE_PERFORMANCE_CAP_MAX,
  KELVIN_ANGLE_DEG,
  MAX_WAKE_LENGTH_PX,
  WAKE_FADE_MS,
} from '@features/game/rendering/RingWakeSystem';

import type { WakeTrail, RingSpeedSnapshot, WakePositionSample } from '@features/game/rendering/RingWakeSystem';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRing(id: string, x: number, y: number, speed: number): RingSpeedSnapshot {
  return { ringId: id, x, y, speed };
}

function makeTrail(ringId: string, positions: WakePositionSample[]): WakeTrail {
  return { ringId, positions };
}

// ---------------------------------------------------------------------------
// updateWakeTrails — basic behaviour
// ---------------------------------------------------------------------------

describe('updateWakeTrails — basic behaviour', () => {
  it('creates a new trail for a ring with no existing trail', () => {
    const trails: WakeTrail[] = [];
    const rings = [makeRing('r1', 100, 200, 50)];
    const now = 1000;

    const result = updateWakeTrails(trails, rings, now);

    expect(result).toHaveLength(1);
    expect(result[0].ringId).toBe('r1');
    expect(result[0].positions).toHaveLength(1);
    expect(result[0].positions[0]).toEqual({ x: 100, y: 200, t: now });
  });

  it('appends a new sample to an existing trail', () => {
    const existing: WakeTrail[] = [
      makeTrail('r1', [{ x: 90, y: 190, t: 900 }]),
    ];
    const rings = [makeRing('r1', 100, 200, 50)];
    const now = 1000;

    const result = updateWakeTrails(existing, rings, now);

    expect(result[0].positions).toHaveLength(2);
    expect(result[0].positions[1]).toEqual({ x: 100, y: 200, t: now });
  });

  it('removes trails for rings no longer present', () => {
    const existing: WakeTrail[] = [
      makeTrail('r1', [{ x: 100, y: 200, t: 900 }]),
      makeTrail('r2', [{ x: 200, y: 300, t: 900 }]),
    ];
    // Only r1 is still active.
    const rings = [makeRing('r1', 100, 200, 50)];
    const now = 1000;

    const result = updateWakeTrails(existing, rings, now);

    expect(result).toHaveLength(1);
    expect(result[0].ringId).toBe('r1');
  });

  it('handles empty ring positions — returns empty trails', () => {
    const existing: WakeTrail[] = [
      makeTrail('r1', [{ x: 100, y: 200, t: 900 }]),
    ];
    const result = updateWakeTrails(existing, [], 1000);
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateWakeTrails — circular buffer / pruning
// ---------------------------------------------------------------------------

describe('updateWakeTrails — circular buffer overflow handling (positions > 300ms old pruned)', () => {
  it('prunes positions older than WAKE_TRAIL_WINDOW_MS (300ms)', () => {
    const now = 1000;
    const old = now - WAKE_TRAIL_WINDOW_MS - 1; // 1ms past the window

    const existing: WakeTrail[] = [
      makeTrail('r1', [
        { x: 80, y: 180, t: old },      // too old — should be pruned
        { x: 90, y: 190, t: now - 100 }, // within window — kept
      ]),
    ];
    const rings = [makeRing('r1', 100, 200, 50)];

    const result = updateWakeTrails(existing, rings, now);

    const positions = result[0].positions;
    // old sample pruned; 1 kept + 1 new = 2
    expect(positions).toHaveLength(2);
    expect(positions.every((p) => p.t >= now - WAKE_TRAIL_WINDOW_MS)).toBe(true);
  });

  it('keeps positions exactly at the window boundary', () => {
    const now = 1000;
    const boundary = now - WAKE_TRAIL_WINDOW_MS; // exactly 300ms ago — should be kept

    const existing: WakeTrail[] = [
      makeTrail('r1', [{ x: 80, y: 180, t: boundary }]),
    ];
    const rings = [makeRing('r1', 100, 200, 50)];

    const result = updateWakeTrails(existing, rings, now);

    // boundary sample kept + new sample = 2
    expect(result[0].positions).toHaveLength(2);
    expect(result[0].positions[0].t).toBe(boundary);
  });

  it('caps the buffer at MAX_WAKE_SAMPLES (9) when overflow occurs', () => {
    const now = 1000;
    // Create MAX_WAKE_SAMPLES existing samples all within the time window.
    const oldPositions: WakePositionSample[] = [];
    for (let i = 0; i < MAX_WAKE_SAMPLES; i++) {
      oldPositions.push({ x: i * 10, y: 100, t: now - (MAX_WAKE_SAMPLES - i) * 10 });
    }

    const existing: WakeTrail[] = [makeTrail('r1', oldPositions)];
    const rings = [makeRing('r1', 200, 100, 50)];

    const result = updateWakeTrails(existing, rings, now);

    // Buffer was already at max; adding 1 more should keep it at MAX_WAKE_SAMPLES.
    expect(result[0].positions.length).toBeLessThanOrEqual(MAX_WAKE_SAMPLES);
  });

  it('MAX_WAKE_SAMPLES equals 9 (300ms window at 30 samples/sec)', () => {
    expect(MAX_WAKE_SAMPLES).toBe(9);
  });
});

// ---------------------------------------------------------------------------
// applyWakePerformanceCap
// ---------------------------------------------------------------------------

describe('applyWakePerformanceCap — performance cap (6 rings → 3 wakes for fastest)', () => {
  function makeTrails(ids: string[]): WakeTrail[] {
    return ids.map((id) => makeTrail(id, [{ x: 0, y: 0, t: 1000 }]));
  }

  it('returns all trails when fewer than 6 rings', () => {
    const rings = [
      makeRing('r1', 0, 0, 10),
      makeRing('r2', 0, 0, 20),
      makeRing('r3', 0, 0, 30),
      makeRing('r4', 0, 0, 40),
      makeRing('r5', 0, 0, 50),
    ];
    const trails = makeTrails(['r1', 'r2', 'r3', 'r4', 'r5']);

    const result = applyWakePerformanceCap(trails, rings);

    expect(result).toHaveLength(5);
  });

  it('returns exactly 3 trails when 6 rings active', () => {
    const rings = [
      makeRing('r1', 0, 0, 10),
      makeRing('r2', 0, 0, 20),
      makeRing('r3', 0, 0, 30),
      makeRing('r4', 0, 0, 40),
      makeRing('r5', 0, 0, 50),
      makeRing('r6', 0, 0, 60),
    ];
    const trails = makeTrails(['r1', 'r2', 'r3', 'r4', 'r5', 'r6']);

    const result = applyWakePerformanceCap(trails, rings);

    expect(result).toHaveLength(WAKE_PERFORMANCE_CAP_MAX); // 3
  });

  it('keeps the 3 fastest rings when 6 are active', () => {
    const rings = [
      makeRing('slow1', 0, 0, 5),
      makeRing('slow2', 0, 0, 10),
      makeRing('slow3', 0, 0, 15),
      makeRing('fast1', 0, 0, 100),
      makeRing('fast2', 0, 0, 200),
      makeRing('fast3', 0, 0, 300),
    ];
    const trails = makeTrails(['slow1', 'slow2', 'slow3', 'fast1', 'fast2', 'fast3']);

    const result = applyWakePerformanceCap(trails, rings);

    const keptIds = new Set(result.map((t) => t.ringId));
    expect(keptIds.has('fast1')).toBe(true);
    expect(keptIds.has('fast2')).toBe(true);
    expect(keptIds.has('fast3')).toBe(true);
    expect(keptIds.has('slow1')).toBe(false);
    expect(keptIds.has('slow2')).toBe(false);
    expect(keptIds.has('slow3')).toBe(false);
  });

  it('returns 3 trails when 8 rings active', () => {
    const rings = Array.from({ length: 8 }, (_, i) =>
      makeRing(`r${i}`, 0, 0, (i + 1) * 10),
    );
    const trails = makeTrails(rings.map((r) => r.ringId));

    const result = applyWakePerformanceCap(trails, rings);

    expect(result).toHaveLength(WAKE_PERFORMANCE_CAP_MAX);
  });

  it('WAKE_PERFORMANCE_CAP_THRESHOLD is 6', () => {
    expect(WAKE_PERFORMANCE_CAP_THRESHOLD).toBe(6);
  });

  it('WAKE_PERFORMANCE_CAP_MAX is 3', () => {
    expect(WAKE_PERFORMANCE_CAP_MAX).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// computeWakePath — V-shape path computation
// ---------------------------------------------------------------------------

describe('computeWakePath — V-shape path computation', () => {
  it('returns empty array when trail has fewer than 2 positions', () => {
    const trail = makeTrail('r1', [{ x: 100, y: 200, t: 900 }]);
    expect(computeWakePath(trail, 1000)).toHaveLength(0);
  });

  it('returns empty array for an empty trail', () => {
    const trail = makeTrail('r1', []);
    expect(computeWakePath(trail, 1000)).toHaveLength(0);
  });

  it('returns 3 path points for a valid trail (V shape: tailLeft, tip, tailRight)', () => {
    const now = 1000;
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 100 },  // oldest (starting position)
      { x: 80, y: 100, t: now },        // newest (current position, moving rightward)
    ]);

    const path = computeWakePath(trail, now);

    expect(path).toHaveLength(3);
  });

  it('tip point is at the most recent ring position', () => {
    const now = 1000;
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 100 },
      { x: 80, y: 100, t: now },
    ]);

    const path = computeWakePath(trail, now);

    // The middle point (index 1) is the tip — the current ring position.
    const tip = path[1];
    expect(tip.x).toBeCloseTo(80, 5);
    expect(tip.y).toBeCloseTo(100, 5);
    expect(tip.opacity).toBe(1.0);
  });

  it('tail points are behind the ring (in direction opposite to travel)', () => {
    const now = 1000;
    // Ring moving rightward (+x direction) — tails should be to the left of tip.
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 100 },
      { x: 80, y: 100, t: now },
    ]);

    const path = computeWakePath(trail, now);
    const [tailLeft, tip, tailRight] = path;

    // Both tails should be to the left (smaller x) of the tip for rightward travel.
    expect(tailLeft.x).toBeLessThan(tip.x);
    expect(tailRight.x).toBeLessThan(tip.x);
  });

  it('V shape: the two tail points are on opposite sides (different y offset)', () => {
    const now = 1000;
    // Ring moving rightward — V opens to the left; tails should differ in y.
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 100 },
      { x: 80, y: 100, t: now },
    ]);

    const path = computeWakePath(trail, now);
    const [tailLeft, , tailRight] = path;

    // The two arms should be symmetric: same x (up to float precision) but mirrored y.
    expect(tailLeft.x).toBeCloseTo(tailRight.x, 5);
    expect(Math.abs(tailLeft.y - 100)).toBeCloseTo(Math.abs(tailRight.y - 100), 5);
    // They should be on opposite sides of the travel axis.
    expect(tailLeft.y).not.toBeCloseTo(tailRight.y, 5);
  });

  it('wake length does not exceed MAX_WAKE_LENGTH_PX (80px)', () => {
    const now = 1000;
    // Long trail: ring moved 200px, but wake should be capped at 80px.
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 200 },
      { x: 200, y: 100, t: now },
    ]);

    const path = computeWakePath(trail, now);
    const [tailLeft, tip] = path;

    const dx = tip.x - tailLeft.x;
    const dy = tip.y - tailLeft.y;
    const armLength = Math.sqrt(dx * dx + dy * dy);

    expect(armLength).toBeLessThanOrEqual(MAX_WAKE_LENGTH_PX + 0.001);
  });

  it('Kelvin angle: the two arms are separated by 2 × KELVIN_ANGLE_DEG (39°) around the tail direction', () => {
    const now = 1000;
    // Ring moving straight right (+x direction).
    const trail = makeTrail('r1', [
      { x: 0, y: 100, t: now - 100 },
      { x: 50, y: 100, t: now },
    ]);

    const path = computeWakePath(trail, now);
    const [tailLeft, tip, tailRight] = path;

    // Direction from tip to tailLeft.
    const leftAngle = Math.atan2(tailLeft.y - tip.y, tailLeft.x - tip.x);
    // Direction from tip to tailRight.
    const rightAngle = Math.atan2(tailRight.y - tip.y, tailRight.x - tip.x);

    // The angle between the two arms should be 2 × KELVIN_ANGLE_DEG.
    let angleBetween = Math.abs(leftAngle - rightAngle);
    if (angleBetween > Math.PI) {
      angleBetween = 2 * Math.PI - angleBetween;
    }

    const expectedAngleRad = (2 * KELVIN_ANGLE_DEG * Math.PI) / 180;
    expect(angleBetween).toBeCloseTo(expectedAngleRad, 5);
  });

  it('tail opacity decreases with age (fade over WAKE_FADE_MS)', () => {
    const now = 1000;
    // Fresh trail: oldest sample just 1ms old → tail opacity near 1.
    const freshTrail = makeTrail('r1', [
      { x: 0, y: 0, t: now - 1 },
      { x: 50, y: 0, t: now },
    ]);

    // Old trail: oldest sample WAKE_FADE_MS ms old → tail opacity near 0.
    const oldTrail = makeTrail('r1', [
      { x: 0, y: 0, t: now - WAKE_FADE_MS },
      { x: 50, y: 0, t: now },
    ]);

    const freshPath = computeWakePath(freshTrail, now);
    const oldPath = computeWakePath(oldTrail, now);

    const freshTailOpacity = freshPath[0].opacity;
    const oldTailOpacity = oldPath[0].opacity;

    expect(freshTailOpacity).toBeGreaterThan(oldTailOpacity);
    expect(oldTailOpacity).toBeCloseTo(0, 5);
  });

  it('tip always has opacity 1.0', () => {
    const now = 1000;
    const trail = makeTrail('r1', [
      { x: 0, y: 0, t: now - 500 },
      { x: 50, y: 0, t: now },
    ]);

    const path = computeWakePath(trail, now);

    expect(path[1].opacity).toBe(1.0);
  });

  it('returns empty array when ring has not moved (distance ≈ 0)', () => {
    const now = 1000;
    const trail = makeTrail('r1', [
      { x: 100, y: 200, t: now - 100 },
      { x: 100, y: 200, t: now }, // same position
    ]);

    const path = computeWakePath(trail, now);
    expect(path).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------

describe('RingWakeSystem constants', () => {
  it('KELVIN_ANGLE_DEG is 19.5', () => {
    expect(KELVIN_ANGLE_DEG).toBe(19.5);
  });

  it('MAX_WAKE_LENGTH_PX is 80', () => {
    expect(MAX_WAKE_LENGTH_PX).toBe(80);
  });

  it('WAKE_FADE_MS is 600', () => {
    expect(WAKE_FADE_MS).toBe(600);
  });

  it('WAKE_TRAIL_WINDOW_MS is 300', () => {
    expect(WAKE_TRAIL_WINDOW_MS).toBe(300);
  });
});
