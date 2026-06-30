/**
 * waterSurface.ts — Pure sine-wave water surface computation helpers.
 *
 * Extracted as a pure module so it can be unit-tested independently of any
 * React or Skia dependencies.
 *
 * Design.md specification (Layer 1 — Water Body):
 *   WaterSurfaceY(x, t) = BASE_Y + Σ(i=0..3) [
 *     amplitude_i × sin(2π × freq_i × (x / width) + phaseSpeed_i × t)
 *   ]
 *
 * Wave table (design.md):
 *   | Layer       | Amplitude | Frequency | Phase Speed |
 *   |-------------|-----------|-----------|-------------|
 *   | Base swell  | 4px       | 0.3 Hz    | 0.4 rad/s   |
 *   | Mid ripple  | 2px       | 0.8 Hz    | 0.9 rad/s   |
 *   | High ripple | 1px       | 1.6 Hz    | 1.8 rad/s   |
 *   | Micro chop  | 0.5px     | 3.2 Hz    | 3.5 rad/s   |
 *
 * Requirements: 38.1
 */

// ---------------------------------------------------------------------------
// Wave configuration types
// ---------------------------------------------------------------------------

/** Parameters for a single sine wave layer. */
export interface WaveConfig {
  /** Peak displacement amplitude in logical pixels. */
  amplitude: number;
  /** Spatial frequency in Hz (cycles per screen width). */
  frequency: number;
  /** Phase offset advancement speed in radians per second. */
  phaseSpeed: number;
}

// ---------------------------------------------------------------------------
// Canonical wave table (design.md Layer 1)
// ---------------------------------------------------------------------------

/**
 * The four summed sine wave layers that compose the water surface.
 *
 * Exported so that:
 *  1. WaterRenderer can import them for rendering.
 *  2. Unit tests can snapshot the exact values.
 */
export const WAVE_CONFIGS: readonly WaveConfig[] = [
  { amplitude: 4.0, frequency: 0.3, phaseSpeed: 0.4 }, // base swell
  { amplitude: 2.0, frequency: 0.8, phaseSpeed: 0.9 }, // mid ripple
  { amplitude: 1.0, frequency: 1.6, phaseSpeed: 1.8 }, // high ripple
  { amplitude: 0.5, frequency: 3.2, phaseSpeed: 3.5 }, // micro chop
] as const;

// ---------------------------------------------------------------------------
// Core computation — pure function, no side effects
// ---------------------------------------------------------------------------

/**
 * Compute the water surface Y coordinate at a given horizontal position and
 * time, by summing four sine wave layers.
 *
 * @param x         Horizontal position in logical pixels (0 = left edge).
 * @param width     Total arena width in logical pixels.
 * @param baseY     Calm water surface Y (from top); waves oscillate around this.
 * @param t         Elapsed time in seconds.
 * @param waves     Array of WaveConfig objects (defaults to WAVE_CONFIGS).
 * @returns         The surface Y coordinate at (x, t).
 *
 * Formula (design.md):
 *   result = baseY + Σ amplitude_i × sin(2π × freq_i × (x / width) + phaseSpeed_i × t)
 */
export function computeWaterSurfaceY(
  x: number,
  width: number,
  baseY: number,
  t: number,
  waves: readonly WaveConfig[] = WAVE_CONFIGS,
): number {
  let displacement = 0;

  for (const wave of waves) {
    const spatialPhase = (2 * Math.PI * wave.frequency * x) / width;
    const temporalPhase = wave.phaseSpeed * t;
    displacement += wave.amplitude * Math.sin(spatialPhase + temporalPhase);
  }

  return baseY + displacement;
}

// ---------------------------------------------------------------------------
// Convenience: maximum possible displacement (sum of all amplitudes)
// ---------------------------------------------------------------------------

/**
 * Maximum absolute displacement from the baseline that the summed wave can
 * produce (worst-case constructive interference of all four layers).
 *
 * Useful for layout calculations (e.g. ensuring the canvas has enough headroom
 * above the nominal waterSurfaceY).
 */
export const MAX_WAVE_DISPLACEMENT: number = WAVE_CONFIGS.reduce(
  (sum, w) => sum + w.amplitude,
  0,
);
