/**
 * Unit tests for DeviceTierManager — task 5.5.1
 *
 * Covers:
 *   - getActiveLayersForTier returns correct layer sets for all 3 tiers
 *   - readDeviceTier reads from MMKV and returns the stored value
 *   - readDeviceTier falls back to 'mid' when key is missing
 *   - readDeviceTier falls back to 'mid' when value is unrecognised
 *   - readDeviceTier falls back to 'mid' when MMKV throws
 *
 * Requirements: 24.3, 44.4, 41.3, 41.4, 41.5
 */

// ---------------------------------------------------------------------------
// Mock react-native-mmkv before any imports
// ---------------------------------------------------------------------------

let mockMmkvStore: Record<string, string> = {};

const mockMmkvInstance = {
  getString: jest.fn((key: string): string | undefined => mockMmkvStore[key]),
  set: jest.fn((key: string, value: string): void => {
    mockMmkvStore[key] = value;
  }),
  delete: jest.fn((key: string): void => {
    delete mockMmkvStore[key];
  }),
};

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => mockMmkvInstance),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  getActiveLayersForTier,
  readDeviceTier,
  _setMmkvInstance,
  _resetMmkvInstance,
  DEVICE_TIER_MMKV_KEY,
  LAYER_WATER_BODY,
  LAYER_WATER_DISPLACEMENT,
  LAYER_RING_WAKE,
  LAYER_BUBBLES,
  LAYER_RIPPLES,
  ALL_LAYERS,
} from '../../src/features/game/rendering/DeviceTierManager';
import type { DeviceTier } from '../../src/features/game/rendering/DeviceTierManager';

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockMmkvStore = {};
  mockMmkvInstance.getString.mockClear();
  // Inject the mock MMKV instance so readDeviceTier uses it.
  _setMmkvInstance(mockMmkvInstance as unknown as import('react-native-mmkv').MMKV);
});

afterEach(() => {
  _resetMmkvInstance();
});

// ---------------------------------------------------------------------------
// getActiveLayersForTier
// ---------------------------------------------------------------------------

describe('getActiveLayersForTier', () => {
  // ── High tier ────────────────────────────────────────────────────────────

  it('high tier returns all 5 layers', () => {
    const layers = getActiveLayersForTier('high');
    expect(layers.size).toBe(5);
  });

  it('high tier contains WaterBody (Layer 1)', () => {
    expect(getActiveLayersForTier('high').has(LAYER_WATER_BODY)).toBe(true);
  });

  it('high tier contains WaterDisplacement (Layer 2)', () => {
    expect(getActiveLayersForTier('high').has(LAYER_WATER_DISPLACEMENT)).toBe(true);
  });

  it('high tier contains RingWake (Layer 3)', () => {
    expect(getActiveLayersForTier('high').has(LAYER_RING_WAKE)).toBe(true);
  });

  it('high tier contains Bubbles (Layer 4)', () => {
    expect(getActiveLayersForTier('high').has(LAYER_BUBBLES)).toBe(true);
  });

  it('high tier contains Ripples (Layer 5)', () => {
    expect(getActiveLayersForTier('high').has(LAYER_RIPPLES)).toBe(true);
  });

  it('high tier contains every layer in ALL_LAYERS', () => {
    const layers = getActiveLayersForTier('high');
    for (const layer of ALL_LAYERS) {
      expect(layers.has(layer)).toBe(true);
    }
  });

  // ── Mid tier ─────────────────────────────────────────────────────────────

  it('mid tier returns 4 layers (no Ripples)', () => {
    const layers = getActiveLayersForTier('mid');
    expect(layers.size).toBe(4);
  });

  it('mid tier contains WaterBody (Layer 1)', () => {
    expect(getActiveLayersForTier('mid').has(LAYER_WATER_BODY)).toBe(true);
  });

  it('mid tier contains WaterDisplacement (Layer 2)', () => {
    expect(getActiveLayersForTier('mid').has(LAYER_WATER_DISPLACEMENT)).toBe(true);
  });

  it('mid tier contains RingWake (Layer 3)', () => {
    expect(getActiveLayersForTier('mid').has(LAYER_RING_WAKE)).toBe(true);
  });

  it('mid tier contains Bubbles (Layer 4)', () => {
    expect(getActiveLayersForTier('mid').has(LAYER_BUBBLES)).toBe(true);
  });

  it('mid tier does NOT contain Ripples (Layer 5)', () => {
    expect(getActiveLayersForTier('mid').has(LAYER_RIPPLES)).toBe(false);
  });

  // ── Low tier ─────────────────────────────────────────────────────────────

  it('low tier returns only 2 layers', () => {
    const layers = getActiveLayersForTier('low');
    expect(layers.size).toBe(2);
  });

  it('low tier contains WaterBody (Layer 1)', () => {
    expect(getActiveLayersForTier('low').has(LAYER_WATER_BODY)).toBe(true);
  });

  it('low tier contains WaterDisplacement (Layer 2)', () => {
    expect(getActiveLayersForTier('low').has(LAYER_WATER_DISPLACEMENT)).toBe(true);
  });

  it('low tier does NOT contain RingWake (Layer 3)', () => {
    expect(getActiveLayersForTier('low').has(LAYER_RING_WAKE)).toBe(false);
  });

  it('low tier does NOT contain Bubbles (Layer 4)', () => {
    expect(getActiveLayersForTier('low').has(LAYER_BUBBLES)).toBe(false);
  });

  it('low tier does NOT contain Ripples (Layer 5)', () => {
    expect(getActiveLayersForTier('low').has(LAYER_RIPPLES)).toBe(false);
  });

  // ── Return type ──────────────────────────────────────────────────────────

  it('returns a Set instance', () => {
    for (const tier of ['high', 'mid', 'low'] as DeviceTier[]) {
      expect(getActiveLayersForTier(tier)).toBeInstanceOf(Set);
    }
  });

  it('each call returns a new Set instance (no shared mutable state)', () => {
    const a = getActiveLayersForTier('high');
    const b = getActiveLayersForTier('high');
    expect(a).not.toBe(b);
  });
});

// ---------------------------------------------------------------------------
// readDeviceTier
// ---------------------------------------------------------------------------

describe('readDeviceTier', () => {
  it('returns "high" when MMKV key is "high"', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'high';
    expect(readDeviceTier()).toBe('high');
  });

  it('returns "mid" when MMKV key is "mid"', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'mid';
    expect(readDeviceTier()).toBe('mid');
  });

  it('returns "low" when MMKV key is "low"', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'low';
    expect(readDeviceTier()).toBe('low');
  });

  it('falls back to "mid" when MMKV key is missing', () => {
    // mockMmkvStore is empty — key not set.
    expect(readDeviceTier()).toBe('mid');
  });

  it('falls back to "mid" when stored value is unrecognised', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'ultra'; // not a valid tier
    expect(readDeviceTier()).toBe('mid');
  });

  it('falls back to "mid" when stored value is an empty string', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = '';
    expect(readDeviceTier()).toBe('mid');
  });

  it('falls back to "mid" when MMKV.getString throws', () => {
    mockMmkvInstance.getString.mockImplementationOnce(() => {
      throw new Error('MMKV read failure');
    });
    expect(readDeviceTier()).toBe('mid');
  });

  it('reads from the MMKV key "device_performance_tier"', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'high';
    readDeviceTier();
    expect(mockMmkvInstance.getString).toHaveBeenCalledWith(DEVICE_TIER_MMKV_KEY);
  });
});

// ---------------------------------------------------------------------------
// Integration: readDeviceTier + getActiveLayersForTier
// ---------------------------------------------------------------------------

describe('readDeviceTier + getActiveLayersForTier integration', () => {
  it('high tier from MMKV → all 5 layers active', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'high';
    const tier = readDeviceTier();
    const layers = getActiveLayersForTier(tier);
    expect(layers.size).toBe(5);
    expect(layers.has(LAYER_RIPPLES)).toBe(true);
  });

  it('mid tier from MMKV → layers 1–4, Ripples inactive', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'mid';
    const tier = readDeviceTier();
    const layers = getActiveLayersForTier(tier);
    expect(layers.size).toBe(4);
    expect(layers.has(LAYER_WATER_BODY)).toBe(true);
    expect(layers.has(LAYER_BUBBLES)).toBe(true);
    expect(layers.has(LAYER_RIPPLES)).toBe(false);
  });

  it('low tier from MMKV → only layers 1–2 active', () => {
    mockMmkvStore[DEVICE_TIER_MMKV_KEY] = 'low';
    const tier = readDeviceTier();
    const layers = getActiveLayersForTier(tier);
    expect(layers.size).toBe(2);
    expect(layers.has(LAYER_WATER_BODY)).toBe(true);
    expect(layers.has(LAYER_WATER_DISPLACEMENT)).toBe(true);
    expect(layers.has(LAYER_RING_WAKE)).toBe(false);
    expect(layers.has(LAYER_BUBBLES)).toBe(false);
    expect(layers.has(LAYER_RIPPLES)).toBe(false);
  });

  it('missing MMKV key → mid fallback → 4 layers active (no Ripples)', () => {
    // Key not set — falls back to 'mid'.
    const tier = readDeviceTier();
    expect(tier).toBe('mid');
    const layers = getActiveLayersForTier(tier);
    expect(layers.has(LAYER_RIPPLES)).toBe(false);
    expect(layers.size).toBe(4);
  });
});
