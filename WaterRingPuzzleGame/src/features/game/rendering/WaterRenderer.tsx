/**
 * WaterRenderer — Layer 1: Water Body
 *
 * Renders the animated water surface using four summed sine waves as specified
 * in design.md §Water Feel — Layer 1.
 *
 * Wave parameters (design.md table):
 *   wave 0: amplitude=4px,   freq=0.3Hz,  phaseSpeed=0.4 rad/s  (base swell)
 *   wave 1: amplitude=2px,   freq=0.8Hz,  phaseSpeed=0.9 rad/s  (mid ripple)
 *   wave 2: amplitude=1px,   freq=1.6Hz,  phaseSpeed=1.8 rad/s  (high ripple)
 *   wave 3: amplitude=0.5px, freq=3.2Hz,  phaseSpeed=3.5 rad/s  (micro chop)
 *
 * Surface Y formula (design.md):
 *   WaterSurfaceY(x, t) = BASE_Y + Σ(i=0..3) [
 *     amplitude_i × sin(2π × freq_i × (x / width) + phaseSpeed_i × t)
 *   ]
 *
 * Dirty-flag optimization (Requirement 4.3):
 *   - The water surface ALWAYS animates — it is always "dirty".
 *   - When isActive=false the animation freezes at the last rendered frame.
 *   - Ring and peg layers are controlled by their own dirty flags (not part
 *     of this component — see GameRenderer.tsx).
 *
 * Requirements: 38.1, 4.3, 41.3, 41.4, 41.5
 */

import React, { useCallback, useRef } from 'react';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useFrameCallback } from 'react-native-reanimated';

import { computeWaterSurfaceY, WAVE_CONFIGS } from './waterSurface';
import { getWaterShader } from './WaterShader';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaterRendererProps {
  /** Viewport width in logical pixels. */
  width: number;
  /** Viewport height in logical pixels. */
  height: number;
  /**
   * Y-coordinate (from top) of the calm water surface baseline.
   * Waves oscillate around this value.
   */
  waterSurfaceY: number;
  /** Hex color string for the water tint, e.g. '#2196F3'. */
  waterColor: string;
  /** Active theme identifier — passed to the shader as a uniform. */
  themeId: string;
  /**
   * Dirty-flag control (Requirement 4.3):
   * - true  → the frame callback advances time, surface animates continuously.
   * - false → animation freezes; no new frames are drawn.
   *           Use false when not in active gameplay (pause, menus, victory screen).
   */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Wave constants (design.md, Layer 1 table)
// ---------------------------------------------------------------------------

/** Number of horizontal sample points used to draw the surface path. */
const SURFACE_SAMPLE_COUNT = 60;

// ---------------------------------------------------------------------------
// WaterRenderer component
// ---------------------------------------------------------------------------

/**
 * WaterRenderer renders the water body (Layer 1) using a filled Skia path.
 *
 * The surface shape is computed on the JS side each frame, then handed to
 * Skia for GPU rasterisation.  When `isActive` is false the frame callback
 * is paused (dirty-flag optimisation, Requirement 4.3).
 */
// eslint-disable-next-line max-lines-per-function
export default function WaterRenderer({
  width,
  height,
  waterSurfaceY,
  waterColor,
  themeId,
  isActive,
}: WaterRendererProps): React.JSX.Element {
  // ---------------------------------------------------------------------------
  // Animated time value — written by the frame callback
  // ---------------------------------------------------------------------------

  /**
   * Accumulated elapsed time in seconds.
   * The frame callback increments this each frame when isActive=true.
   * The surface path is recomputed from this value each render.
   */
  const elapsedSeconds = useSharedValue<number>(0);

  /**
   * Timestamp of the previous frame (milliseconds from performance.now()).
   * Used to compute a per-frame dt that is independent of frame rate.
   */
  const lastTimestampRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Dirty flag: freeze when not in active gameplay (Requirement 4.3)
  // ---------------------------------------------------------------------------
  /**
   * isDirty tracks whether the water surface needs to be redrawn.
   *
   * Design rule (Requirement 4.3):
   *   "In a stable settled state only the water surface layer SHALL animate."
   *
   * The surface is ALWAYS dirty during active gameplay (waves animate
   * continuously regardless of physics state).  It becomes NOT dirty only when
   * isActive=false (pause, menus) — at that point the frame callback stops
   * advancing time so the surface freezes at its last rendered shape.
   */
  const isDirty = isActive;

  // ---------------------------------------------------------------------------
  // Frame callback — advances elapsed time
  // ---------------------------------------------------------------------------

  useFrameCallback(
    (frameInfo) => {
      if (!isDirty) {
        // Surface is frozen — do not advance time.
        lastTimestampRef.current = null;
        return;
      }

      const now = frameInfo.timestamp; // ms
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = now;
        return;
      }

      const dtSeconds = (now - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = now;

      // Accumulate elapsed time (wrapping at a large value to avoid float drift).
      elapsedSeconds.value = (elapsedSeconds.value + dtSeconds) % 10000;
    },
    true, // isActive flag for the frame callback itself
  );

  // ---------------------------------------------------------------------------
  // Build the filled water surface path each render
  // ---------------------------------------------------------------------------

  /**
   * Computes the Skia path representing the water surface + filled body.
   *
   * Path construction:
   *   1. Move to (0, surfaceY(0, t))
   *   2. Line to each sample point along the surface
   *   3. Line to (width, height)  — bottom-right corner
   *   4. Line to (0,     height)  — bottom-left corner
   *   5. Close — fills the entire water body below the surface curve
   */
  const buildSurfacePath = useCallback(
    (t: number): ReturnType<typeof Skia.Path.Make> => {
      const path = Skia.Path.Make();
      const step = width / SURFACE_SAMPLE_COUNT;

      // Start at the left edge of the water surface.
      const y0 = computeWaterSurfaceY(0, width, waterSurfaceY, t, WAVE_CONFIGS);
      path.moveTo(0, y0);

      // Trace the wave across the top surface.
      for (let i = 1; i <= SURFACE_SAMPLE_COUNT; i++) {
        const x = Math.min(i * step, width);
        const y = computeWaterSurfaceY(x, width, waterSurfaceY, t, WAVE_CONFIGS);
        path.lineTo(x, y);
      }

      // Close the filled region down through the bottom of the canvas.
      path.lineTo(width, height);
      path.lineTo(0, height);
      path.close();

      return path;
    },
    [width, height, waterSurfaceY],
  );

  // ---------------------------------------------------------------------------
  // Resolve shader with fallback (Requirement 41.5)
  // ---------------------------------------------------------------------------

  const shaderSource = getWaterShader({ themeId, waterColor });

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  // Read current time to build the surface path.  On every re-render (triggered
  // by Reanimated shared-value changes) we re-compute the path.
  const t = elapsedSeconds.value;
  const surfacePath = buildSurfacePath(t);

  const paint = Skia.Paint();
  paint.setColor(Skia.Color(waterColor));
  paint.setAntiAlias(true);

  // If a shader is available try to apply it; fall back gracefully on error.
  if (shaderSource !== null) {
    try {
      const runtimeEffect = Skia.RuntimeEffect.Make(shaderSource);
      if (runtimeEffect) {
        const shader = runtimeEffect.makeShader([
          t, // time uniform
          1.0, // brightness uniform
          0.3, // causticSpeed uniform
        ]);
        paint.setShader(shader);
      }
    } catch {
      // Shader compilation failed — paint remains a solid colour (fallback).
    }
  }

  return (
    <Canvas style={{ width, height }} accessibilityLabel="Water surface animation">
      <Path path={surfacePath} paint={paint} />
    </Canvas>
  );
}

// Re-export helpers so tests can import directly from this module.
export { computeWaterSurfaceY, WAVE_CONFIGS } from './waterSurface';
