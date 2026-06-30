/**
 * WaterDisplacement.ts — Layer 2: Water Displacement computation helpers.
 *
 * Pure computation module — no React, no Skia, no side effects.
 * All exported functions are deterministic pure functions safe to call
 * from tests without any native module setup.
 *
 * Design.md specification (Layer 2 — Water Displacement):
 *   DisplacementBulge(x, side, intensity, t) =
 *     intensity × GaussianBell(x, μ=sourceX, σ=ScreenWidth×0.2)
 *     × DecayEnvelope(t - pressStartTime, tau=300ms)
 *
 * Where:
 *   GaussianBell(x, μ, σ)  = exp(-(x - μ)² / (2 × σ²))
 *   DecayEnvelope(tMs, τ)  = clamp(exp(-tMs / τ), 0, 1)
 *
 * Key constraints (design.md, Requirement 38.3):
 *   - Maximum displacement: 12px at source wall, 0 at center, at max intensity.
 *   - Gaussian sigma = arenaWidth × 0.2
 *   - Decay time constant τ = 300ms
 *   - Visual only — does NOT affect physics.
 *
 * Requirements: 38.3
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Sigma factor for the Gaussian bell: σ = arenaWidth × SIGMA_FACTOR. */
export const SIGMA_FACTOR = 0.2;

/** Decay time constant in milliseconds (τ = 300ms). */
export const DECAY_TAU_MS = 300;

/** Maximum displacement in pixels at the source wall with intensity=1. */
export const MAX_DISPLACEMENT_PX = 12;

// ---------------------------------------------------------------------------
// Core pure functions
// ---------------------------------------------------------------------------

/**
 * Compute the Gaussian bell value at position `x` centred on `mu` with
 * standard deviation `sigma`.
 *
 * GaussianBell(x, μ, σ) = exp(-(x - μ)² / (2 × σ²))
 *
 * Returns a value in [0, 1]: 1.0 when x == mu, decaying towards 0.
 *
 * @param x     Sample position in logical pixels.
 * @param mu    Centre (mean) of the bell curve, in logical pixels.
 * @param sigma Standard deviation (width) of the bell curve, in logical pixels.
 * @returns     Bell value ∈ [0, 1].
 */
export function gaussianBell(x: number, mu: number, sigma: number): number {
  if (sigma <= 0) {
    return x === mu ? 1 : 0;
  }
  const diff = x - mu;
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

/**
 * Compute the exponential decay envelope value for a given elapsed time.
 *
 * DecayEnvelope(tMs, τ) = clamp(exp(-tMs / τ), 0, 1)
 *
 * @param tMs Elapsed time since the event, in milliseconds. Negative values
 *            are treated as 0 (event has not started yet → returns 1.0).
 * @param tau Decay time constant in milliseconds.
 * @returns   Envelope value clamped to [0, 1].
 */
export function decayEnvelope(tMs: number, tau: number): number {
  if (tau <= 0) {
    return 0;
  }
  const effectiveT = Math.max(0, tMs);
  const value = Math.exp(-effectiveT / tau);
  // Clamp to [0, 1] to guard against any floating-point edge cases.
  return Math.min(1, Math.max(0, value));
}

/**
 * Compute the displacement bulge height at horizontal position `x`.
 *
 * Formula:
 *   displacement = MAX_DISPLACEMENT_PX
 *                  × intensity
 *                  × GaussianBell(x, μ=sideX, σ=arenaWidth×SIGMA_FACTOR)
 *                  × DecayEnvelope(tMs, τ=DECAY_TAU_MS)
 *
 * The result is a vertical offset in logical pixels to add to (subtract from)
 * the water surface Y.  A positive result means the surface rises upward
 * (the bulge is visible above the baseline).
 *
 * @param x           Horizontal sample position, in logical pixels.
 * @param sideX       X-coordinate of the source wall (0 for left, arenaWidth
 *                    for right).
 * @param intensity   Button press intensity ∈ [0, 1].
 * @param tMs         Time since the press started, in milliseconds.
 * @param arenaWidth  Total arena width in logical pixels; used to compute σ.
 * @returns           Displacement in logical pixels ∈ [0, MAX_DISPLACEMENT_PX].
 */
export function computeDisplacementBulge(
  x: number,
  sideX: number,
  intensity: number,
  tMs: number,
  arenaWidth: number,
): number {
  if (intensity <= 0) {
    return 0;
  }

  const sigma = arenaWidth * SIGMA_FACTOR;
  const bell = gaussianBell(x, sideX, sigma);
  const decay = decayEnvelope(tMs, DECAY_TAU_MS);

  return MAX_DISPLACEMENT_PX * intensity * bell * decay;
}

/**
 * Compute the final water surface Y position at `x` by adding displacement
 * contributions from both sides (left and right buttons).
 *
 * The displacement bulge raises the water surface (decreases Y in screen
 * coordinates where Y increases downward), so the displacement is subtracted
 * from `baseSurfaceY`.
 *
 * @param x              Horizontal sample position, in logical pixels.
 * @param leftDisp       Displacement from the left button at this x (pixels).
 * @param rightDisp      Displacement from the right button at this x (pixels).
 * @param baseSurfaceY   Baseline water surface Y (already including sine waves).
 * @returns              Adjusted Y in screen pixels (higher displacement →
 *                       smaller Y → visually higher water surface).
 */
export function computeDisplacementY(
  x: number,
  leftDisp: number,
  rightDisp: number,
  baseSurfaceY: number,
): number {
  // Suppress unused parameter warning — x is included for API completeness
  // and future per-position blending logic.
  void x;

  // Combine both sides: take the maximum of the two displacements so both
  // buttons can contribute without doubling when pressed simultaneously.
  const totalDisplacement = Math.max(leftDisp, rightDisp);

  // Subtract from Y because screen coordinates have Y increasing downward:
  // a positive displacement makes the surface visually rise (move up = smaller Y).
  return baseSurfaceY - totalDisplacement;
}
