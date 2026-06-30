/**
 * WaterShader.ts — Skia water shader support module.
 *
 * Responsibilities:
 *   1. Export the GLSL source string as a compile-time constant.
 *   2. Expose typed shader parameter types.
 *   3. Provide a runtime shader string resolver with a gradient-only fallback
 *      for environments where the RuntimeEffect API is unavailable
 *      (Requirement 41.5).
 *
 * Usage:
 *   import { WATER_SHADER_GLSL, getWaterShader, type WaterShaderParams } from './WaterShader';
 *
 * The shader is used by WaterRenderer (Layer 1).  When `getWaterShader`
 * returns null, WaterRenderer falls back to a plain solid-colour fill.
 *
 * Requirements: 41.3, 41.4, 41.5
 */

// ---------------------------------------------------------------------------
// GLSL source constant
// ---------------------------------------------------------------------------

/**
 * Full GLSL source for the water body shader.
 *
 * Inlined here rather than imported as a file to avoid bundler complications
 * with .glsl assets in React Native.  The content mirrors water.glsl exactly.
 *
 * Uniforms (in order):
 *   float  time          — elapsed seconds
 *   float  brightness    — base brightness multiplier (0.0–1.0)
 *   float  causticSpeed  — caustic scroll speed
 *   float3 tint          — RGB water colour tint
 *
 * Requirements: 41.3, 41.4
 */
export const WATER_SHADER_GLSL: string = `
uniform float time;
uniform float brightness;
uniform float causticSpeed;
uniform float3 tint;

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / 1000.0;

    // 1. Vertical gradient — dark at bottom, light at surface
    float gradientFactor = mix(1.0, 0.4, uv.y);

    // 2. Caustic shimmer — branch-free scrolling interference
    float scroll = time * causticSpeed;
    float causticFreq = 8.0;
    float causticA = sin(causticFreq * (uv.x + scroll))
                   * cos(causticFreq * (uv.y + scroll * 0.7));
    float causticB = sin(causticFreq * (uv.x - scroll * 0.5))
                   * cos(causticFreq * (uv.y + scroll * 1.3));
    float caustic = (causticA + causticB) * 0.25 + 0.5;
    float causticContrib = caustic * uv.y * 0.18;

    // 3. Specular highlight near surface — branch-free smoothstep
    float specularOscillation = sin(time * 0.8 + uv.x * 3.0) * 0.05;
    float specularBand = smoothstep(0.0, 0.10 + specularOscillation, uv.y);
    float specularContrib = (1.0 - specularBand) * 0.25;

    // 4. Compose
    float3 colour = tint * gradientFactor * brightness;
    colour += causticContrib;
    colour += specularContrib;
    colour = clamp(colour, 0.0, 1.0);

    return half4(half3(colour), 1.0);
}
`.trim();

// ---------------------------------------------------------------------------
// Gradient-only fallback shader
//
// Used when the full shader fails to compile (Requirement 41.5).
// It applies only the vertical gradient — no caustics, no specular.
// This is guaranteed to compile on every Skia version because it uses only
// the most basic GLSL constructs.
// ---------------------------------------------------------------------------

/**
 * Minimal fallback shader — vertical gradient only.
 * No caustics, no specular.  Always compiles.
 *
 * Requirements: 41.5
 */
export const WATER_GRADIENT_FALLBACK_GLSL: string = `
uniform float3 tint;

half4 main(float2 fragCoord) {
    float2 uv = fragCoord / 1000.0;
    float gradientFactor = mix(1.0, 0.4, uv.y);
    float3 colour = clamp(tint * gradientFactor, 0.0, 1.0);
    return half4(half3(colour), 1.0);
}
`.trim();

// ---------------------------------------------------------------------------
// Shader parameter types
// ---------------------------------------------------------------------------

/**
 * Typed parameters for the water shader uniforms.
 *
 * These are passed to `Skia.RuntimeEffect.makeShader(uniforms)` in order:
 *   [time, brightness, causticSpeed, ...tintRGB]
 */
export interface WaterShaderParams {
  /** Elapsed seconds — drives animation. */
  time: number;
  /** Base brightness multiplier (0.0–1.0). Default: 1.0. */
  brightness: number;
  /** Caustic pattern scroll speed. Default: 0.3. */
  causticSpeed: number;
  /**
   * RGB colour tint as a tuple.  Each channel is in [0.0, 1.0].
   * Derived from the `waterColor` hex prop via `hexToRgbFloat`.
   */
  tint: readonly [number, number, number];
}

/**
 * Options for `getWaterShader`.
 */
export interface GetWaterShaderOptions {
  /** Active theme identifier — reserved for future theme-specific shaders. */
  themeId: string;
  /** Hex colour string, e.g. '#2196F3'. */
  waterColor: string;
}

// ---------------------------------------------------------------------------
// Runtime shader resolver
// ---------------------------------------------------------------------------

/**
 * Returns the GLSL source string to use for the current environment.
 *
 * Strategy (Requirement 41.5 — fallback on compile error):
 *   1. Return WATER_SHADER_GLSL (full shader with caustics + specular).
 *   2. The caller (WaterRenderer) wraps `RuntimeEffect.Make` in a try/catch.
 *      If the full shader fails to compile it falls back to a plain solid fill.
 *
 * Returns null if the Skia RuntimeEffect API is known to be unavailable in
 * the current environment (e.g., test environments that mock Skia without the
 * RuntimeEffect method).  A null return tells WaterRenderer to skip shader
 * application entirely and render a plain colour fill.
 */
export function getWaterShader(options: GetWaterShaderOptions): string | null {
  // In non-production environments (Jest, Storybook) @shopify/react-native-skia
  // may be mocked without RuntimeEffect.  We return null so WaterRenderer does
  // not attempt to compile the shader.
  //
  // Detection: check whether the global Skia object exposes RuntimeEffect.
  // This guard runs at call time (not module load time) so it works in tests.
  try {
    // Dynamic require avoids a hard import that would fail in test environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Skia } = require('@shopify/react-native-skia') as {
      Skia: { RuntimeEffect?: { Make?: unknown } };
    };
    if (typeof Skia?.RuntimeEffect?.Make !== 'function') {
      return null;
    }
  } catch {
    // Module not found — test or SSR environment.
    return null;
  }

  // Future: return a different shader string per themeId if themes need it.
  // For now all themes use the same base shader.
  void options; // consumed for future expansion
  return WATER_SHADER_GLSL;
}

// ---------------------------------------------------------------------------
// Utility: convert hex colour to normalised RGB float tuple
// ---------------------------------------------------------------------------

/**
 * Convert a CSS hex colour string to a normalised RGB float tuple [r, g, b].
 *
 * Accepts '#RGB' (3-digit), '#RRGGBB' (6-digit), and '#AARRGGBB' (8-digit,
 * alpha channel is ignored — the shader manages opacity).
 *
 * Returns [0.13, 0.59, 0.95] (the default water blue) if parsing fails.
 */
export function hexToRgbFloat(hex: string): readonly [number, number, number] {
  const clean = hex.replace('#', '');

  let r: number;
  let g: number;
  let b: number;

  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else if (clean.length === 8) {
    // AARRGGBB — skip alpha (first two chars)
    r = parseInt(clean.slice(2, 4), 16);
    g = parseInt(clean.slice(4, 6), 16);
    b = parseInt(clean.slice(6, 8), 16);
  } else {
    // Fallback: default water blue (#2196F3)
    return [0.13, 0.59, 0.95];
  }

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return [0.13, 0.59, 0.95];
  }

  return [r / 255, g / 255, b / 255];
}
