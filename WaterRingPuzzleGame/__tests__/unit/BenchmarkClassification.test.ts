/**
 * BenchmarkClassification.test.ts — task 1.6.1a
 * Verifies the tier classification thresholds and logic in PerformanceBenchmark.
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock the physics benchmark runner so runBenchmark() doesn't execute Matter.js
jest.mock('../../src/features/game/physics/PhysicsBenchmarkRunner', () => ({
  runPhysicsBenchmarkTicks: jest.fn().mockReturnValue(50),
}));

// Mock MMKVStorage so no native module is loaded
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  })),
}));

import {
  classifyTier,
  TIER_HIGH_THRESHOLD_MS,
  TIER_MID_THRESHOLD_MS,
} from '../../src/utils/PerformanceBenchmark';

describe('PerformanceBenchmark — tier classification thresholds', () => {
  it('TIER_HIGH_THRESHOLD_MS equals 67', () => {
    expect(TIER_HIGH_THRESHOLD_MS).toBe(67);
  });

  it('TIER_MID_THRESHOLD_MS equals 90', () => {
    expect(TIER_MID_THRESHOLD_MS).toBe(90);
  });
});

describe('classifyTier', () => {
  it('classifyTier(0) returns "high"', () => {
    expect(classifyTier(0)).toBe('high');
  });

  it('classifyTier(66) returns "high" (below high threshold)', () => {
    expect(classifyTier(66)).toBe('high');
  });

  it('classifyTier(67) returns "mid" (exactly at high threshold)', () => {
    // 67 is NOT < 67 so it falls through to the mid bucket
    expect(classifyTier(67)).toBe('mid');
  });

  it('classifyTier(80) returns "mid"', () => {
    expect(classifyTier(80)).toBe('mid');
  });

  it('classifyTier(90) returns "mid" (at mid threshold, <= check)', () => {
    expect(classifyTier(90)).toBe('mid');
  });

  it('classifyTier(91) returns "low"', () => {
    expect(classifyTier(91)).toBe('low');
  });

  it('classifyTier(999) returns "low"', () => {
    expect(classifyTier(999)).toBe('low');
  });

  it('result is always one of "high" | "mid" | "low"', () => {
    const samples = [0, 1, 66, 67, 68, 89, 90, 91, 200, 1000];
    const validTiers = new Set(['high', 'mid', 'low']);
    for (const ms of samples) {
      expect(validTiers.has(classifyTier(ms))).toBe(true);
    }
  });
});
