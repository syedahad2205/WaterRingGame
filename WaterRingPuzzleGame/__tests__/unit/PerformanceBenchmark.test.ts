/**
 * Unit tests for PerformanceBenchmark — classification thresholds and caching.
 *
 * Requirements: 24.3, 44.4
 *
 * The benchmark classification rules are:
 *   durationMs < 67       → 'high'
 *   67 ≤ durationMs ≤ 90  → 'mid'
 *   durationMs > 90       → 'low'
 */

// react-native-mmkv needs native binaries; mock it so tests run in Node.js.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock Matter.js so the benchmark runner does not require native physics.
// We only need to verify classification and caching; physics execution is
// tested separately and requires a native environment.
jest.mock(
  '../../src/features/game/physics/PhysicsBenchmarkRunner',
  () => ({
    runPhysicsBenchmarkTicks: jest.fn(),
  }),
);

import {
  classifyTier,
  getCachedTier,
  runBenchmark,
  MMKV_KEY_DEVICE_TIER,
  TIER_HIGH_THRESHOLD_MS,
  TIER_MID_THRESHOLD_MS,
} from '../../src/utils/PerformanceBenchmark';
import type { DeviceTier } from '../../src/utils/PerformanceBenchmark';
import { runPhysicsBenchmarkTicks } from '../../src/features/game/physics/PhysicsBenchmarkRunner';
import * as MMKVStorage from '../../src/services/storage/MMKVStorage';

const mockRunTicks = runPhysicsBenchmarkTicks as jest.MockedFunction<typeof runPhysicsBenchmarkTicks>;

// ---------------------------------------------------------------------------
// classifyTier — threshold correctness
// ---------------------------------------------------------------------------

describe('classifyTier — tier thresholds (Requirements 24.3, 44.4)', () => {
  // ── High-end tier ────────────────────────────────────────────────────────

  it('classifies 0ms as high', () => {
    expect(classifyTier(0)).toBe('high');
  });

  it('classifies 1ms as high', () => {
    expect(classifyTier(1)).toBe('high');
  });

  it('classifies 50ms as high', () => {
    expect(classifyTier(50)).toBe('high');
  });

  it('classifies 66.99ms (just below threshold) as high', () => {
    expect(classifyTier(66.99)).toBe('high');
  });

  it(`classifies exactly ${TIER_HIGH_THRESHOLD_MS - 1}ms as high`, () => {
    expect(classifyTier(TIER_HIGH_THRESHOLD_MS - 1)).toBe('high');
  });

  // ── Boundary at 67ms ─────────────────────────────────────────────────────

  it(`classifies exactly ${TIER_HIGH_THRESHOLD_MS}ms as mid (boundary)`, () => {
    expect(classifyTier(TIER_HIGH_THRESHOLD_MS)).toBe('mid');
  });

  // ── Mid-range tier ───────────────────────────────────────────────────────

  it('classifies 67ms as mid', () => {
    expect(classifyTier(67)).toBe('mid');
  });

  it('classifies 75ms as mid', () => {
    expect(classifyTier(75)).toBe('mid');
  });

  it('classifies 89ms as mid', () => {
    expect(classifyTier(89)).toBe('mid');
  });

  it('classifies 89.99ms as mid', () => {
    expect(classifyTier(89.99)).toBe('mid');
  });

  it(`classifies exactly ${TIER_MID_THRESHOLD_MS}ms as mid (upper boundary)`, () => {
    expect(classifyTier(TIER_MID_THRESHOLD_MS)).toBe('mid');
  });

  // ── Low-end tier ─────────────────────────────────────────────────────────

  it('classifies 90.01ms as low', () => {
    expect(classifyTier(90.01)).toBe('low');
  });

  it('classifies 91ms as low', () => {
    expect(classifyTier(91)).toBe('low');
  });

  it('classifies 150ms as low', () => {
    expect(classifyTier(150)).toBe('low');
  });

  it('classifies 500ms as low', () => {
    expect(classifyTier(500)).toBe('low');
  });

  it(`classifies ${TIER_MID_THRESHOLD_MS + 1}ms as low`, () => {
    expect(classifyTier(TIER_MID_THRESHOLD_MS + 1)).toBe('low');
  });
});

// ---------------------------------------------------------------------------
// classifyTier — return type correctness
// ---------------------------------------------------------------------------

describe('classifyTier — return values are valid DeviceTier literals', () => {
  const validTiers: DeviceTier[] = ['high', 'mid', 'low'];

  it.each([0, 30, 66, 67, 80, 90, 91, 200])('returns a valid DeviceTier for %dms', (ms) => {
    const result = classifyTier(ms);
    expect(validTiers).toContain(result);
  });
});

// ---------------------------------------------------------------------------
// getCachedTier — reads from MMKV
// ---------------------------------------------------------------------------

describe('getCachedTier — MMKV cache reads', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when nothing is cached', () => {
    jest.spyOn(MMKVStorage, 'getItem').mockReturnValue(null);
    expect(getCachedTier()).toBeNull();
  });

  it.each(['high', 'mid', 'low'] as DeviceTier[])(
    'returns "%s" when that value is cached',
    (tier) => {
      jest.spyOn(MMKVStorage, 'getItem').mockReturnValue(tier);
      expect(getCachedTier()).toBe(tier);
    },
  );

  it('returns null for an unknown cached string (discards invalid data)', () => {
    jest.spyOn(MMKVStorage, 'getItem').mockReturnValue('ultra');
    expect(getCachedTier()).toBeNull();
  });

  it('reads from the correct MMKV key', () => {
    const spy = jest.spyOn(MMKVStorage, 'getItem').mockReturnValue(null);
    getCachedTier();
    expect(spy).toHaveBeenCalledWith(MMKV_KEY_DEVICE_TIER);
  });
});

// ---------------------------------------------------------------------------
// runBenchmark — integration of ticks → classify → cache
// ---------------------------------------------------------------------------

describe('runBenchmark — end-to-end classification and caching', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    mockRunTicks.mockReset();
  });

  it('returns "high" when ticks complete in 30ms', async () => {
    mockRunTicks.mockReturnValue(30);
    const tier = await runBenchmark();
    expect(tier).toBe('high');
  });

  it('returns "mid" when ticks complete in 80ms', async () => {
    mockRunTicks.mockReturnValue(80);
    const tier = await runBenchmark();
    expect(tier).toBe('mid');
  });

  it('returns "low" when ticks complete in 120ms', async () => {
    mockRunTicks.mockReturnValue(120);
    const tier = await runBenchmark();
    expect(tier).toBe('low');
  });

  it('writes the result to MMKV with the correct key', async () => {
    mockRunTicks.mockReturnValue(50);
    const spy = jest.spyOn(MMKVStorage, 'setItem');
    await runBenchmark();
    expect(spy).toHaveBeenCalledWith(MMKV_KEY_DEVICE_TIER, 'high');
  });

  it('writes "mid" to MMKV when duration is 75ms', async () => {
    mockRunTicks.mockReturnValue(75);
    const spy = jest.spyOn(MMKVStorage, 'setItem');
    await runBenchmark();
    expect(spy).toHaveBeenCalledWith(MMKV_KEY_DEVICE_TIER, 'mid');
  });

  it('writes "low" to MMKV when duration is 100ms', async () => {
    mockRunTicks.mockReturnValue(100);
    const spy = jest.spyOn(MMKVStorage, 'setItem');
    await runBenchmark();
    expect(spy).toHaveBeenCalledWith(MMKV_KEY_DEVICE_TIER, 'low');
  });

  it('calls runPhysicsBenchmarkTicks exactly once per invocation', async () => {
    mockRunTicks.mockReturnValue(45);
    await runBenchmark();
    expect(mockRunTicks).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Threshold constant sanity checks
// ---------------------------------------------------------------------------

describe('threshold constants', () => {
  it('TIER_HIGH_THRESHOLD_MS is 67', () => {
    expect(TIER_HIGH_THRESHOLD_MS).toBe(67);
  });

  it('TIER_MID_THRESHOLD_MS is 90', () => {
    expect(TIER_MID_THRESHOLD_MS).toBe(90);
  });

  it('TIER_HIGH_THRESHOLD_MS is less than TIER_MID_THRESHOLD_MS', () => {
    expect(TIER_HIGH_THRESHOLD_MS).toBeLessThan(TIER_MID_THRESHOLD_MS);
  });

  it('MMKV_KEY_DEVICE_TIER is the expected string', () => {
    expect(MMKV_KEY_DEVICE_TIER).toBe('device_performance_tier');
  });
});
