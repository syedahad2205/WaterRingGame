/**
 * DeviceTierManager — Device tier layer management for WaterRenderer.
 *
 * Reads the device performance tier from MMKV (set by the benchmark in Epic 1)
 * and determines which rendering layers are active.
 *
 * Device tiers (design.md §Rendering — Performance Tiers):
 *   high  — all 5 layers active
 *   mid   — layers 1–4 (no ripples — Layer 5)
 *   low   — layers 1–2 only (no wakes, bubbles, ripples)
 *
 * Layer names (matching RenderLayer in dirtyFlags.ts):
 *   Layer 1 — WaterBody
 *   Layer 2 — WaterDisplacement
 *   Layer 3 — RingWake
 *   Layer 4 — Bubbles
 *   Layer 5 — Ripples
 *
 * Requirements: 24.3, 44.4, 41.3, 41.4, 41.5
 */

import { MMKV } from 'react-native-mmkv';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeviceTier = 'high' | 'mid' | 'low';

// ---------------------------------------------------------------------------
// Layer name constants
// ---------------------------------------------------------------------------

/** Canonical layer names used by getActiveLayersForTier. */
export const LAYER_WATER_BODY = 'WaterBody';
export const LAYER_WATER_DISPLACEMENT = 'WaterDisplacement';
export const LAYER_RING_WAKE = 'RingWake';
export const LAYER_BUBBLES = 'Bubbles';
export const LAYER_RIPPLES = 'Ripples';

/** All 5 layer names in draw order. */
export const ALL_LAYERS: ReadonlyArray<string> = [
  LAYER_WATER_BODY,        // Layer 1
  LAYER_WATER_DISPLACEMENT, // Layer 2
  LAYER_RING_WAKE,         // Layer 3
  LAYER_BUBBLES,           // Layer 4
  LAYER_RIPPLES,           // Layer 5
];

// ---------------------------------------------------------------------------
// MMKV instance and key
// ---------------------------------------------------------------------------

/** MMKV key written by PerformanceBenchmark.ts (Epic 1, task 1.6.1). */
export const DEVICE_TIER_MMKV_KEY = 'device_performance_tier';

// Lazy-initialised so that mocks can be registered before the module executes.
let _mmkv: MMKV | null = null;

function getMmkv(): MMKV {
  if (_mmkv === null) {
    _mmkv = new MMKV();
  }
  return _mmkv;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the set of layer names that should be active for the given device tier.
 *
 * - high: all 5 layers (WaterBody, WaterDisplacement, RingWake, Bubbles, Ripples)
 * - mid:  layers 1–4   (WaterBody, WaterDisplacement, RingWake, Bubbles)
 * - low:  layers 1–2   (WaterBody, WaterDisplacement)
 */
export function getActiveLayersForTier(tier: DeviceTier): Set<string> {
  switch (tier) {
    case 'high':
      return new Set(ALL_LAYERS);

    case 'mid':
      return new Set([
        LAYER_WATER_BODY,
        LAYER_WATER_DISPLACEMENT,
        LAYER_RING_WAKE,
        LAYER_BUBBLES,
      ]);

    case 'low':
      return new Set([
        LAYER_WATER_BODY,
        LAYER_WATER_DISPLACEMENT,
      ]);

    default: {
      // Exhaustiveness check — TypeScript will catch unhandled tiers at compile
      // time. At runtime, fall back to mid for safety.
      const _exhaustive: never = tier;
      void _exhaustive;
      return new Set([
        LAYER_WATER_BODY,
        LAYER_WATER_DISPLACEMENT,
        LAYER_RING_WAKE,
        LAYER_BUBBLES,
      ]);
    }
  }
}

/**
 * Reads the device performance tier from MMKV.
 *
 * Falls back to 'mid' if the key is missing or the stored value is not a
 * recognised tier string.  This is consistent with the "mid" default
 * documented in design.md §Performance Tiers.
 */
export function readDeviceTier(): DeviceTier {
  try {
    const stored = getMmkv().getString(DEVICE_TIER_MMKV_KEY);
    if (stored === 'high' || stored === 'mid' || stored === 'low') {
      return stored;
    }
  } catch {
    // MMKV read failure — use fallback.
  }
  return 'mid';
}

/**
 * @internal — Exposed for testing to inject a custom MMKV instance.
 * Not part of the public API.
 */
export function _setMmkvInstance(instance: MMKV): void {
  _mmkv = instance;
}

/**
 * @internal — Resets the cached MMKV instance (used between tests).
 */
export function _resetMmkvInstance(): void {
  _mmkv = null;
}
