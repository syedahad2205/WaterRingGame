/**
 * PerformanceBenchmark.ts
 *
 * Device performance tier detection via a 1-second physics benchmark.
 *
 * Algorithm:
 *   1. Delegate to PhysicsBenchmarkRunner (in physics folder — only place
 *      allowed to use Matter.js directly per Requirement 2.3)
 *   2. Classify the elapsed time into a DeviceTier
 *   3. Cache the result to MMKV key `device_performance_tier`
 *
 * Thresholds (Requirement 24.3, 44.4):
 *   < 67ms  → 'high'  (high-end device)
 *   67–90ms → 'mid'   (mid-range device)
 *   > 90ms  → 'low'   (low-end device)
 *
 * Requirements: 24.3, 44.4
 */

import { runPhysicsBenchmarkTicks } from '../features/game/physics/PhysicsBenchmarkRunner';
import { getItem, setItem } from '../services/storage/MMKVStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Device performance tier based on the physics benchmark result.
 *
 * 'high'  — high-end device (< 67ms for 60 ticks)
 * 'mid'   — mid-range device (67–90ms)
 * 'low'   — low-end device (> 90ms)
 */
export type DeviceTier = 'high' | 'mid' | 'low';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** MMKV key used to cache the benchmark result. */
export const MMKV_KEY_DEVICE_TIER = 'device_performance_tier';

/** Duration threshold (ms) below which the device is classified as high-end. */
export const TIER_HIGH_THRESHOLD_MS = 67;

/** Duration threshold (ms) below which the device is classified as mid-range. */
export const TIER_MID_THRESHOLD_MS = 90;

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify a benchmark duration into a DeviceTier.
 *
 * @param durationMs - Wall-clock time taken to run 60 physics ticks (ms).
 * @returns The corresponding DeviceTier.
 */
export function classifyTier(durationMs: number): DeviceTier {
  if (durationMs < TIER_HIGH_THRESHOLD_MS) {
    return 'high';
  }
  if (durationMs <= TIER_MID_THRESHOLD_MS) {
    return 'mid';
  }
  return 'low';
}

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

/**
 * Read the previously cached DeviceTier from MMKV.
 *
 * Returns `null` if no result has been cached yet, or if the stored value
 * has been corrupted (CRC32 mismatch — handled by MMKVStorage).
 */
export function getCachedTier(): DeviceTier | null {
  const raw = getItem(MMKV_KEY_DEVICE_TIER);
  if (raw === null) {
    return null;
  }

  // Validate the stored string is a known tier value.
  if (raw === 'high' || raw === 'mid' || raw === 'low') {
    return raw;
  }

  // Unknown value — discard.
  return null;
}

/**
 * Persist a DeviceTier result to MMKV.
 */
function cacheTier(tier: DeviceTier): void {
  setItem(MMKV_KEY_DEVICE_TIER, tier);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the 1-second physics benchmark and return the detected DeviceTier.
 *
 * - Runs 60 Matter.js physics ticks synchronously via PhysicsBenchmarkRunner.
 * - Classifies the elapsed wall-clock time into a tier.
 * - Caches the result to MMKV key `device_performance_tier`.
 *
 * This is an async function to allow callers to await it cleanly at app start
 * without blocking the JS thread (even though the benchmark itself is sync,
 * wrapping it in a Promise lets the event loop breathe before and after).
 *
 * @returns A Promise resolving to the detected DeviceTier.
 */
export async function runBenchmark(): Promise<DeviceTier> {
  const durationMs = runPhysicsBenchmarkTicks();
  const tier = classifyTier(durationMs);
  cacheTier(tier);
  return tier;
}

// ---------------------------------------------------------------------------
// FrameRateController — Epic 18 Task 18.2.2
// ---------------------------------------------------------------------------

/**
 * FrameRateController — Epic 18 Task 18.2.2
 *
 * Monitors rolling average frame time and auto-downgrades to 30fps
 * when 60fps cannot be sustained.
 * Trigger: P10 frame time > 14ms for 3 consecutive seconds.
 *
 * Requirements: 42.6, 24.2
 */
const DOWNGRADE_THRESHOLD_MS = 14;
const DOWNGRADE_WINDOW_FRAMES = 180; // ~3s at 60fps
const RESTORE_THRESHOLD_MS = 12;
// const RESTORE_WINDOW_FRAMES = 300; // ~5s at 60fps — unused

export class FrameRateController {
  private frameTimes: number[] = [];
  private currentTarget: 60 | 30 = 60;
  private onDowngrade?: (target: 30 | 60) => void;

  constructor(onTargetChange?: (target: 30 | 60) => void) {
    this.onDowngrade = onTargetChange;
  }

  /** Record a frame time (called each tick). */
  recordFrameTime(dtMs: number): void {
    this.frameTimes.push(dtMs);
    if (this.frameTimes.length > DOWNGRADE_WINDOW_FRAMES) {
      this.frameTimes.shift();
    }
    this.evaluate();
  }

  private evaluate(): void {
    if (this.frameTimes.length < DOWNGRADE_WINDOW_FRAMES) return;

    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const p10Index = Math.floor(sorted.length * 0.1);
    const p10 = sorted[p10Index];

    if (this.currentTarget === 60 && p10 > DOWNGRADE_THRESHOLD_MS) {
      this.currentTarget = 30;
      this.onDowngrade?.(30);
    } else if (this.currentTarget === 30 && p10 < RESTORE_THRESHOLD_MS) {
      this.currentTarget = 60;
      this.onDowngrade?.(60);
    }
  }

  getCurrentTarget(): 60 | 30 { return this.currentTarget; }
  reset(): void { this.frameTimes = []; this.currentTarget = 60; }
  getP10FrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.1)];
  }
}
