/**
 * Unit tests for WaterDisplacement — task 5.2.1
 *
 * Covers:
 *   - Gaussian bell at x=0, x=arenaWidth/2, x=arenaWidth
 *   - Decay envelope at t=0 (≈1.0), t=300ms (≈0.368), t=600ms (≈0.135)
 *   - Zero displacement when intensity=0
 *   - computeDisplacementBulge formula correctness
 *   - computeDisplacementY surface Y computation
 *
 * Requirements: 38.3
 */

import {
  gaussianBell,
  decayEnvelope,
  computeDisplacementBulge,
  computeDisplacementY,
  SIGMA_FACTOR,
  DECAY_TAU_MS,
  MAX_DISPLACEMENT_PX,
} from '@features/game/rendering/WaterDisplacement';

const ARENA_WIDTH = 400;

// ---------------------------------------------------------------------------
// gaussianBell
// ---------------------------------------------------------------------------

describe('gaussianBell', () => {
  const sigma = ARENA_WIDTH * SIGMA_FACTOR; // 80px

  it('equals 1.0 at the centre (x == mu)', () => {
    expect(gaussianBell(0, 0, sigma)).toBeCloseTo(1.0, 10);
    expect(gaussianBell(200, 200, sigma)).toBeCloseTo(1.0, 10);
  });

  it('is less than 1 when x != mu', () => {
    expect(gaussianBell(ARENA_WIDTH / 2, 0, sigma)).toBeLessThan(1.0);
    expect(gaussianBell(ARENA_WIDTH, 0, sigma)).toBeLessThan(1.0);
  });

  it('at x=0 with mu=0: equals 1.0 (source wall)', () => {
    const value = gaussianBell(0, 0, sigma);
    expect(value).toBeCloseTo(1.0, 10);
  });

  it('at x=arenaWidth/2 with mu=0: decays significantly', () => {
    // sigma=80, x-mu=200 → exp(-200²/(2×80²)) = exp(-3.125) ≈ 0.0439
    const value = gaussianBell(ARENA_WIDTH / 2, 0, sigma);
    expect(value).toBeCloseTo(Math.exp(-(200 * 200) / (2 * sigma * sigma)), 10);
    expect(value).toBeLessThan(0.1); // significant decay
  });

  it('at x=arenaWidth with mu=0: further decayed', () => {
    const value = gaussianBell(ARENA_WIDTH, 0, sigma);
    const mid = gaussianBell(ARENA_WIDTH / 2, 0, sigma);
    expect(value).toBeLessThan(mid);
  });

  it('is symmetric around mu', () => {
    const left = gaussianBell(50, 200, sigma);
    const right = gaussianBell(350, 200, sigma);
    expect(left).toBeCloseTo(right, 10);
  });

  it('with sigma <= 0 returns 1 at centre and 0 elsewhere', () => {
    expect(gaussianBell(5, 5, 0)).toBe(1);
    expect(gaussianBell(6, 5, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// decayEnvelope
// ---------------------------------------------------------------------------

describe('decayEnvelope', () => {
  it('at t=0 returns 1.0 (no decay yet)', () => {
    const value = decayEnvelope(0, DECAY_TAU_MS);
    expect(value).toBeCloseTo(1.0, 10);
  });

  it('at t=tau (300ms) returns e^(-1) ≈ 0.3679', () => {
    // exp(-300/300) = exp(-1) ≈ 0.36787944
    const value = decayEnvelope(DECAY_TAU_MS, DECAY_TAU_MS);
    expect(value).toBeCloseTo(Math.exp(-1), 10);
    expect(value).toBeCloseTo(0.368, 2);
  });

  it('at t=2×tau (600ms) returns e^(-2) ≈ 0.1353', () => {
    // exp(-600/300) = exp(-2) ≈ 0.13533528
    const value = decayEnvelope(2 * DECAY_TAU_MS, DECAY_TAU_MS);
    expect(value).toBeCloseTo(Math.exp(-2), 10);
    expect(value).toBeCloseTo(0.135, 2);
  });

  it('is monotonically decreasing with time', () => {
    const t0 = decayEnvelope(0, DECAY_TAU_MS);
    const t1 = decayEnvelope(100, DECAY_TAU_MS);
    const t2 = decayEnvelope(300, DECAY_TAU_MS);
    const t3 = decayEnvelope(600, DECAY_TAU_MS);
    expect(t0).toBeGreaterThan(t1);
    expect(t1).toBeGreaterThan(t2);
    expect(t2).toBeGreaterThan(t3);
  });

  it('clamps output to [0, 1]', () => {
    const value = decayEnvelope(0, DECAY_TAU_MS);
    expect(value).toBeLessThanOrEqual(1);
    expect(value).toBeGreaterThanOrEqual(0);

    const largeT = decayEnvelope(100_000, DECAY_TAU_MS);
    expect(largeT).toBeGreaterThanOrEqual(0);
  });

  it('negative time is treated as t=0 (event not started yet → 1.0)', () => {
    const value = decayEnvelope(-100, DECAY_TAU_MS);
    expect(value).toBeCloseTo(1.0, 10);
  });

  it('with tau <= 0 returns 0', () => {
    expect(decayEnvelope(0, 0)).toBe(0);
    expect(decayEnvelope(100, -10)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeDisplacementBulge
// ---------------------------------------------------------------------------

describe('computeDisplacementBulge', () => {
  it('returns 0 when intensity = 0', () => {
    const disp = computeDisplacementBulge(0, 0, 0, 0, ARENA_WIDTH);
    expect(disp).toBe(0);
  });

  it('returns 0 when intensity = 0, regardless of position or time', () => {
    expect(computeDisplacementBulge(100, 0, 0, 0, ARENA_WIDTH)).toBe(0);
    expect(computeDisplacementBulge(0, 0, 0, 500, ARENA_WIDTH)).toBe(0);
    expect(computeDisplacementBulge(200, 0, 0, 200, ARENA_WIDTH)).toBe(0);
  });

  it('at x=sideX, t=0, intensity=1 returns MAX_DISPLACEMENT_PX (12px)', () => {
    // At source wall with full intensity and no decay: bell=1, decay=1 → max
    const disp = computeDisplacementBulge(0, 0, 1.0, 0, ARENA_WIDTH);
    expect(disp).toBeCloseTo(MAX_DISPLACEMENT_PX, 10);
    expect(disp).toBeCloseTo(12, 10);
  });

  it('decays with time: t=300ms gives roughly half the initial value', () => {
    const t0 = computeDisplacementBulge(0, 0, 1.0, 0, ARENA_WIDTH);
    const t300 = computeDisplacementBulge(0, 0, 1.0, 300, ARENA_WIDTH);
    // Decay envelope at t=tau = e^-1 ≈ 0.368
    expect(t300).toBeCloseTo(t0 * Math.exp(-1), 8);
  });

  it('decreases with distance from sideX: x=arenaWidth/2 < x=0', () => {
    const atWall = computeDisplacementBulge(0, 0, 1.0, 0, ARENA_WIDTH);
    const atMid = computeDisplacementBulge(ARENA_WIDTH / 2, 0, 1.0, 0, ARENA_WIDTH);
    expect(atMid).toBeLessThan(atWall);
  });

  it('intensity scales the output linearly', () => {
    const half = computeDisplacementBulge(0, 0, 0.5, 0, ARENA_WIDTH);
    const full = computeDisplacementBulge(0, 0, 1.0, 0, ARENA_WIDTH);
    expect(half).toBeCloseTo(full / 2, 10);
  });

  it('output is always non-negative', () => {
    expect(computeDisplacementBulge(0, 0, 1.0, 0, ARENA_WIDTH)).toBeGreaterThanOrEqual(0);
    expect(computeDisplacementBulge(200, 0, 1.0, 500, ARENA_WIDTH)).toBeGreaterThanOrEqual(0);
    expect(computeDisplacementBulge(400, 0, 1.0, 1000, ARENA_WIDTH)).toBeGreaterThanOrEqual(0);
  });

  it('right-side displacement: sideX=arenaWidth gives max at x=arenaWidth', () => {
    const atRightWall = computeDisplacementBulge(ARENA_WIDTH, ARENA_WIDTH, 1.0, 0, ARENA_WIDTH);
    expect(atRightWall).toBeCloseTo(MAX_DISPLACEMENT_PX, 10);
  });
});

// ---------------------------------------------------------------------------
// computeDisplacementY
// ---------------------------------------------------------------------------

describe('computeDisplacementY', () => {
  const baseSurfaceY = 300;

  it('returns baseSurfaceY when both displacements are 0', () => {
    expect(computeDisplacementY(0, 0, 0, baseSurfaceY)).toBe(baseSurfaceY);
    expect(computeDisplacementY(200, 0, 0, baseSurfaceY)).toBe(baseSurfaceY);
  });

  it('subtracts the larger of left/right displacement from baseSurfaceY', () => {
    const result = computeDisplacementY(0, 8, 4, baseSurfaceY);
    expect(result).toBe(baseSurfaceY - 8);
  });

  it('uses right displacement when it is larger', () => {
    const result = computeDisplacementY(100, 3, 10, baseSurfaceY);
    expect(result).toBe(baseSurfaceY - 10);
  });

  it('uses left displacement when equal', () => {
    const result = computeDisplacementY(50, 5, 5, baseSurfaceY);
    expect(result).toBe(baseSurfaceY - 5);
  });

  it('a 12px displacement raises the surface by 12px', () => {
    const result = computeDisplacementY(0, 12, 0, baseSurfaceY);
    expect(result).toBe(baseSurfaceY - 12);
  });
});

// ---------------------------------------------------------------------------
// Constants sanity checks
// ---------------------------------------------------------------------------

describe('WaterDisplacement constants', () => {
  it('SIGMA_FACTOR is 0.2', () => {
    expect(SIGMA_FACTOR).toBe(0.2);
  });

  it('DECAY_TAU_MS is 300', () => {
    expect(DECAY_TAU_MS).toBe(300);
  });

  it('MAX_DISPLACEMENT_PX is 12', () => {
    expect(MAX_DISPLACEMENT_PX).toBe(12);
  });
});
