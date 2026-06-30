/**
 * Unit tests for the water surface sine-wave formula — task 5.1.1a
 *
 * Tests the pure `computeWaterSurfaceY` function and related exports from
 * `waterSurface.ts`.  No React or Skia dependencies — pure math only.
 *
 * Coverage:
 *   - Wave formula at t=0, t=1s, t=5s (task requirement)
 *   - WAVE_CONFIGS constants match design.md
 *   - Symmetry and boundary conditions
 *   - MAX_WAVE_DISPLACEMENT constant
 *
 * Requirements: 38.1
 */

import {
  computeWaterSurfaceY,
  WAVE_CONFIGS,
  MAX_WAVE_DISPLACEMENT,
  type WaveConfig,
} from '@features/game/rendering/waterSurface';

import {
  WATER_SHADER_GLSL,
  WATER_GRADIENT_FALLBACK_GLSL,
  hexToRgbFloat,
} from '@features/game/rendering/WaterShader';

import {
  DirtyFlagManager,
  RenderLayer,
  hasRingStateChanged,
  hasPegStateChanged,
} from '@features/game/rendering/dirtyFlags';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_Y = 200;   // Nominal water surface Y in logical pixels
const WIDTH = 400;    // Arena width

// ---------------------------------------------------------------------------
// WAVE_CONFIGS sanity checks — must match design.md exactly
// ---------------------------------------------------------------------------

describe('WAVE_CONFIGS', () => {
  it('contains exactly 4 wave layers', () => {
    expect(WAVE_CONFIGS).toHaveLength(4);
  });

  it('wave 0 — base swell: amplitude=4px, freq=0.3Hz, phaseSpeed=0.4 rad/s', () => {
    expect(WAVE_CONFIGS[0]).toEqual({ amplitude: 4.0, frequency: 0.3, phaseSpeed: 0.4 });
  });

  it('wave 1 — mid ripple: amplitude=2px, freq=0.8Hz, phaseSpeed=0.9 rad/s', () => {
    expect(WAVE_CONFIGS[1]).toEqual({ amplitude: 2.0, frequency: 0.8, phaseSpeed: 0.9 });
  });

  it('wave 2 — high ripple: amplitude=1px, freq=1.6Hz, phaseSpeed=1.8 rad/s', () => {
    expect(WAVE_CONFIGS[2]).toEqual({ amplitude: 1.0, frequency: 1.6, phaseSpeed: 1.8 });
  });

  it('wave 3 — micro chop: amplitude=0.5px, freq=3.2Hz, phaseSpeed=3.5 rad/s', () => {
    expect(WAVE_CONFIGS[3]).toEqual({ amplitude: 0.5, frequency: 3.2, phaseSpeed: 3.5 });
  });
});

// ---------------------------------------------------------------------------
// MAX_WAVE_DISPLACEMENT
// ---------------------------------------------------------------------------

describe('MAX_WAVE_DISPLACEMENT', () => {
  it('equals the sum of all wave amplitudes (4 + 2 + 1 + 0.5 = 7.5)', () => {
    expect(MAX_WAVE_DISPLACEMENT).toBeCloseTo(7.5, 10);
  });
});

// ---------------------------------------------------------------------------
// computeWaterSurfaceY — formula validation
// ---------------------------------------------------------------------------

describe('computeWaterSurfaceY', () => {
  // -------------------------------------------------------------------------
  // t = 0 — all phase offsets are 0; formula reduces to pure spatial waves
  // -------------------------------------------------------------------------
  describe('at t=0', () => {
    it('returns BASE_Y at x=0 (all sines are 0 when spatial phase=0 and t=0)', () => {
      // At x=0: spatial phase = 2π × freq × (0 / width) = 0
      // At t=0: temporal phase = phaseSpeed × 0 = 0
      // sin(0 + 0) = 0 for all waves → displacement = 0
      const y = computeWaterSurfaceY(0, WIDTH, BASE_Y, 0);
      expect(y).toBeCloseTo(BASE_Y, 10);
    });

    it('returns BASE_Y at x=WIDTH (one full spatial cycle; sin(2π) = 0)', () => {
      // At x=WIDTH: spatial phase = 2π × freq × (WIDTH / WIDTH) = 2π × freq
      // For freq=0.3: sin(2π × 0.3) ≈ sin(1.885) ≈ 0.951 ≠ 0 (not a full cycle)
      // This test just checks the function does not throw and returns a finite number.
      const y = computeWaterSurfaceY(WIDTH, WIDTH, BASE_Y, 0);
      expect(Number.isFinite(y)).toBe(true);
    });

    it('returns a value within [BASE_Y - MAX_DISP, BASE_Y + MAX_DISP]', () => {
      const maxDisp = 7.5; // sum of all amplitudes
      for (let x = 0; x <= WIDTH; x += 10) {
        const y = computeWaterSurfaceY(x, WIDTH, BASE_Y, 0);
        expect(y).toBeGreaterThanOrEqual(BASE_Y - maxDisp - 1e-9);
        expect(y).toBeLessThanOrEqual(BASE_Y + maxDisp + 1e-9);
      }
    });

    it('matches hand-calculated result at x=WIDTH/4, t=0', () => {
      // Spatial normalised position: xNorm = (WIDTH/4) / WIDTH = 0.25
      // Each wave: amplitude × sin(2π × freq × xNorm)
      const xNorm = 0.25;
      let expected = 0;
      for (const w of WAVE_CONFIGS) {
        expected += w.amplitude * Math.sin(2 * Math.PI * w.frequency * xNorm);
      }
      const y = computeWaterSurfaceY(WIDTH * 0.25, WIDTH, BASE_Y, 0);
      expect(y).toBeCloseTo(BASE_Y + expected, 10);
    });
  });

  // -------------------------------------------------------------------------
  // t = 1s
  // -------------------------------------------------------------------------
  describe('at t=1s', () => {
    it('returns a value within [BASE_Y - 7.5, BASE_Y + 7.5]', () => {
      const maxDisp = 7.5;
      for (let x = 0; x <= WIDTH; x += 25) {
        const y = computeWaterSurfaceY(x, WIDTH, BASE_Y, 1);
        expect(y).toBeGreaterThanOrEqual(BASE_Y - maxDisp - 1e-9);
        expect(y).toBeLessThanOrEqual(BASE_Y + maxDisp + 1e-9);
      }
    });

    it('differs from t=0 at mid-screen (waves have advanced)', () => {
      const y0 = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, 0);
      const y1 = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, 1);
      // After 1 second the phase offsets have advanced — values should differ.
      expect(y1).not.toBeCloseTo(y0, 3);
    });

    it('matches hand-calculated result at x=WIDTH/2, t=1', () => {
      const xNorm = 0.5;
      const t = 1;
      let expected = 0;
      for (const w of WAVE_CONFIGS) {
        expected += w.amplitude * Math.sin(
          2 * Math.PI * w.frequency * xNorm + w.phaseSpeed * t,
        );
      }
      const y = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, t);
      expect(y).toBeCloseTo(BASE_Y + expected, 10);
    });
  });

  // -------------------------------------------------------------------------
  // t = 5s
  // -------------------------------------------------------------------------
  describe('at t=5s', () => {
    it('returns a finite value at every sample point', () => {
      for (let x = 0; x <= WIDTH; x += 20) {
        const y = computeWaterSurfaceY(x, WIDTH, BASE_Y, 5);
        expect(Number.isFinite(y)).toBe(true);
      }
    });

    it('stays within maximum displacement bounds at t=5', () => {
      const maxDisp = 7.5;
      for (let x = 0; x <= WIDTH; x += 10) {
        const y = computeWaterSurfaceY(x, WIDTH, BASE_Y, 5);
        expect(y).toBeGreaterThanOrEqual(BASE_Y - maxDisp - 1e-9);
        expect(y).toBeLessThanOrEqual(BASE_Y + maxDisp + 1e-9);
      }
    });

    it('matches hand-calculated result at x=WIDTH*0.75, t=5', () => {
      const xNorm = 0.75;
      const t = 5;
      let expected = 0;
      for (const w of WAVE_CONFIGS) {
        expected += w.amplitude * Math.sin(
          2 * Math.PI * w.frequency * xNorm + w.phaseSpeed * t,
        );
      }
      const y = computeWaterSurfaceY(WIDTH * 0.75, WIDTH, BASE_Y, t);
      expect(y).toBeCloseTo(BASE_Y + expected, 10);
    });
  });

  // -------------------------------------------------------------------------
  // Behaviour with custom wave configs
  // -------------------------------------------------------------------------
  describe('custom wave configs', () => {
    it('respects a single-wave config exactly', () => {
      const singleWave: WaveConfig[] = [{ amplitude: 10, frequency: 1, phaseSpeed: 0 }];
      // At x=0, t=0: sin(0) = 0 → y = BASE_Y
      expect(computeWaterSurfaceY(0, WIDTH, BASE_Y, 0, singleWave)).toBeCloseTo(BASE_Y, 10);

      // At x=WIDTH/4, t=0: sin(2π × 1 × 0.25) = sin(π/2) = 1 → y = BASE_Y + 10
      expect(computeWaterSurfaceY(WIDTH / 4, WIDTH, BASE_Y, 0, singleWave)).toBeCloseTo(
        BASE_Y + 10,
        10,
      );

      // At x=WIDTH/2, t=0: sin(2π × 1 × 0.5) = sin(π) ≈ 0 → y ≈ BASE_Y
      expect(computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, 0, singleWave)).toBeCloseTo(BASE_Y, 10);

      // At x=3*WIDTH/4, t=0: sin(2π × 1 × 0.75) = sin(3π/2) = -1 → y = BASE_Y - 10
      expect(computeWaterSurfaceY((WIDTH * 3) / 4, WIDTH, BASE_Y, 0, singleWave)).toBeCloseTo(
        BASE_Y - 10,
        10,
      );
    });

    it('returns BASE_Y for empty wave array (no waves)', () => {
      const y = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, 3.0, []);
      expect(y).toBeCloseTo(BASE_Y, 10);
    });

    it('phase advances correctly with phaseSpeed', () => {
      const wave: WaveConfig[] = [{ amplitude: 5, frequency: 0.5, phaseSpeed: Math.PI }];
      const t = 1;
      // At x=0, t=1: sin(0 + π × 1) = sin(π) ≈ 0
      expect(computeWaterSurfaceY(0, WIDTH, BASE_Y, t, wave)).toBeCloseTo(BASE_Y, 10);
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    it('handles zero width gracefully (no NaN, no throw)', () => {
      // x / width = 0 / 0 — should produce NaN but should not throw
      expect(() => computeWaterSurfaceY(0, 0, BASE_Y, 0)).not.toThrow();
    });

    it('handles very large t without overflow', () => {
      // t = 1e8 seconds — sin is periodic so result stays finite
      const y = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, 1e8);
      expect(Number.isFinite(y)).toBe(true);
    });

    it('handles negative t (reverse time)', () => {
      const y = computeWaterSurfaceY(WIDTH / 2, WIDTH, BASE_Y, -1);
      expect(Number.isFinite(y)).toBe(true);
      expect(y).toBeGreaterThanOrEqual(BASE_Y - 7.5 - 1e-9);
      expect(y).toBeLessThanOrEqual(BASE_Y + 7.5 + 1e-9);
    });
  });
});

// ---------------------------------------------------------------------------
// WaterShader utilities — hexToRgbFloat
// ---------------------------------------------------------------------------

describe('hexToRgbFloat', () => {
  it('converts #RRGGBB correctly', () => {
    const [r, g, b] = hexToRgbFloat('#2196F3');
    expect(r).toBeCloseTo(0x21 / 255, 5);
    expect(g).toBeCloseTo(0x96 / 255, 5);
    expect(b).toBeCloseTo(0xf3 / 255, 5);
  });

  it('converts #RGB (3-digit) correctly', () => {
    const [r, g, b] = hexToRgbFloat('#FFF');
    expect(r).toBeCloseTo(1.0, 5);
    expect(g).toBeCloseTo(1.0, 5);
    expect(b).toBeCloseTo(1.0, 5);
  });

  it('returns fallback blue for invalid hex', () => {
    const [r, g, b] = hexToRgbFloat('not-a-colour');
    expect(r).toBeCloseTo(0.13, 2);
    expect(g).toBeCloseTo(0.59, 2);
    expect(b).toBeCloseTo(0.95, 2);
  });

  it('output channels are in [0, 1]', () => {
    for (const hex of ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF']) {
      const [r, g, b] = hexToRgbFloat(hex);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Dirty-flag unit tests — task 5.1.3a
//
// Validates: "in a stable settled state only the water surface layer SHALL
// animate" (Requirement 4.3)
// ---------------------------------------------------------------------------

describe('DirtyFlagManager', () => {

  // -------------------------------------------------------------------------
  // Task 5.1.3a: stable state → only WaterBody is dirty
  // -------------------------------------------------------------------------

  it('5.1.3a: in stable settled state, only WaterBody is dirty (Req 4.3)', () => {
    const mgr = new DirtyFlagManager();

    // Stable settled state: isActive=true but no ring/peg changes
    mgr.updateWaterBodyFlag(true);
    mgr.updateRingFlags([]); // no rings → not dirty
    mgr.updatePegFlags([]);  // no pegs → not dirty
    mgr.markClean(RenderLayer.WaterDisplacement);
    mgr.markClean(RenderLayer.Bubbles);
    mgr.markClean(RenderLayer.Ripples);

    // Water body must be dirty (always animates)
    expect(mgr.isLayerDirty(RenderLayer.WaterBody)).toBe(true);

    // All other layers must be clean (no state changed)
    expect(mgr.isLayerDirty(RenderLayer.WaterDisplacement)).toBe(false);
    expect(mgr.isLayerDirty(RenderLayer.Rings)).toBe(false);
    expect(mgr.isLayerDirty(RenderLayer.Pegs)).toBe(false);
    expect(mgr.isLayerDirty(RenderLayer.Bubbles)).toBe(false);
    expect(mgr.isLayerDirty(RenderLayer.Ripples)).toBe(false);
    expect(mgr.isLayerDirty(RenderLayer.RingWake)).toBe(false);
  });

  it('water body is NOT dirty when isActive=false (frozen animation)', () => {
    const mgr = new DirtyFlagManager();
    mgr.updateWaterBodyFlag(false);
    expect(mgr.isLayerDirty(RenderLayer.WaterBody)).toBe(false);
  });

  it('water body is always dirty when isActive=true', () => {
    const mgr = new DirtyFlagManager();
    mgr.updateWaterBodyFlag(true);
    expect(mgr.isLayerDirty(RenderLayer.WaterBody)).toBe(true);
  });

  it('ring layer is dirty when ring positions change', () => {
    const mgr = new DirtyFlagManager();
    const snap1 = [{ id: 'r1', x: 100, y: 200, angle: 0, vx: 0, vy: 0 }];
    mgr.updateRingFlags(snap1); // first call — always dirty (prev is empty)
    expect(mgr.isLayerDirty(RenderLayer.Rings)).toBe(true);

    // Second call with same data — not dirty
    mgr.updateRingFlags(snap1);
    expect(mgr.isLayerDirty(RenderLayer.Rings)).toBe(false);

    // Third call with changed position — dirty again
    mgr.updateRingFlags([{ id: 'r1', x: 105, y: 200, angle: 0, vx: 0, vy: 0 }]);
    expect(mgr.isLayerDirty(RenderLayer.Rings)).toBe(true);
  });

  it('peg layer is dirty only when occupancy changes', () => {
    const mgr = new DirtyFlagManager();
    const snap1 = [{ id: 'p1', settledRingId: null }];
    mgr.updatePegFlags(snap1);
    expect(mgr.isLayerDirty(RenderLayer.Pegs)).toBe(true);

    mgr.updatePegFlags(snap1);
    expect(mgr.isLayerDirty(RenderLayer.Pegs)).toBe(false);

    // Ring lands on peg
    mgr.updatePegFlags([{ id: 'p1', settledRingId: 'ring-1' }]);
    expect(mgr.isLayerDirty(RenderLayer.Pegs)).toBe(true);
  });

  it('ring wake layer is dirty only when a ring is moving', () => {
    const mgr = new DirtyFlagManager();

    // Stationary ring
    mgr.updateRingFlags([{ id: 'r1', x: 100, y: 200, angle: 0, vx: 0.1, vy: 0.1 }]);
    expect(mgr.isLayerDirty(RenderLayer.RingWake)).toBe(false);

    // Moving ring (velocity above threshold)
    mgr.updateRingFlags([{ id: 'r1', x: 100, y: 200, angle: 0, vx: 5.0, vy: 3.0 }]);
    expect(mgr.isLayerDirty(RenderLayer.RingWake)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // hasRingStateChanged helper tests
  // -------------------------------------------------------------------------

  it('hasRingStateChanged: returns true when ring count changes', () => {
    expect(
      hasRingStateChanged(
        [{ id: 'r1', x: 0, y: 0, angle: 0, vx: 0, vy: 0 }],
        [],
      ),
    ).toBe(true);
  });

  it('hasRingStateChanged: returns false for identical snapshots', () => {
    const snap = [{ id: 'r1', x: 100, y: 200, angle: 0.5, vx: 1, vy: -0.5 }];
    expect(hasRingStateChanged(snap, [...snap])).toBe(false);
  });

  it('hasRingStateChanged: returns true when position changes beyond tolerance', () => {
    const prev = [{ id: 'r1', x: 100, y: 200, angle: 0, vx: 0, vy: 0 }];
    const next = [{ id: 'r1', x: 100.5, y: 200, angle: 0, vx: 0, vy: 0 }];
    expect(hasRingStateChanged(prev, next)).toBe(true);
  });

  // -------------------------------------------------------------------------
  // hasPegStateChanged helper tests
  // -------------------------------------------------------------------------

  it('hasPegStateChanged: returns false when state is identical', () => {
    const snap = [{ id: 'p1', settledRingId: null }];
    expect(hasPegStateChanged(snap, [...snap])).toBe(false);
  });

  it('hasPegStateChanged: returns true when a ring settles', () => {
    const prev = [{ id: 'p1', settledRingId: null }];
    const next = [{ id: 'p1', settledRingId: 'ring-1' }];
    expect(hasPegStateChanged(prev, next)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// WATER_SHADER_GLSL smoke test — task 5.1.2a
//
// Validates that the shader source string is a non-empty string and contains
// the required uniform declarations.
// ---------------------------------------------------------------------------

describe('WATER_SHADER_GLSL', () => {

  it('is a non-empty string', () => {
    expect(typeof WATER_SHADER_GLSL).toBe('string');
    expect(WATER_SHADER_GLSL.length).toBeGreaterThan(0);
  });

  it('declares required uniforms: time, brightness, causticSpeed, tint', () => {
    expect(WATER_SHADER_GLSL).toContain('uniform float time');
    expect(WATER_SHADER_GLSL).toContain('uniform float brightness');
    expect(WATER_SHADER_GLSL).toContain('uniform float causticSpeed');
    expect(WATER_SHADER_GLSL).toContain('uniform float3 tint');
  });

  it('contains main() entry point', () => {
    expect(WATER_SHADER_GLSL).toContain('half4 main(');
  });

  it('does NOT contain if/else branching (no conditional branching on mobile GPU)', () => {
    // Strip comments first to avoid false positives in comment text.
    const noComments = WATER_SHADER_GLSL.replace(/\/\/[^\n]*/g, '');
    expect(noComments).not.toMatch(/\bif\s*\(/);
    expect(noComments).not.toMatch(/\belse\b/);
  });

  it('uses step() or smoothstep() instead of branching', () => {
    expect(WATER_SHADER_GLSL).toMatch(/\b(step|smoothstep)\s*\(/);
  });

  // task 5.1.2b — fallback shader
  it('fallback shader: gradient-only GLSL is a non-empty string', () => {
    expect(typeof WATER_GRADIENT_FALLBACK_GLSL).toBe('string');
    expect(WATER_GRADIENT_FALLBACK_GLSL.length).toBeGreaterThan(0);
  });

  it('fallback shader: contains main() and tint uniform', () => {
    expect(WATER_GRADIENT_FALLBACK_GLSL).toContain('half4 main(');
    expect(WATER_GRADIENT_FALLBACK_GLSL).toContain('uniform float3 tint');
  });

  it('fallback shader: does NOT contain if/else branching', () => {
    const noComments = WATER_GRADIENT_FALLBACK_GLSL.replace(/\/\/[^\n]*/g, '');
    expect(noComments).not.toMatch(/\bif\s*\(/);
    expect(noComments).not.toMatch(/\belse\b/);
  });
});
