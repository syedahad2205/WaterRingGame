/**
 * Unit tests for DebugOverlay — task 3.3.3
 *
 * Covers:
 *  - Stats interface shape — all required fields with correct types
 *  - enableDebugOverlay / disableDebugOverlay toggle visibility
 *  - updateDebugStats merges partial and full stats
 *  - useDebugOverlay returns { isVisible, toggle, stats }
 *  - toggle() switches visibility correctly
 *  - DebugOverlay component is a function (React component)
 *  - Production guard: DebugOverlay returns null when __DEV__ is falsy
 *  - _resetDebugOverlay restores defaults
 *
 * Requirements: 3.3.3
 */

// ---------------------------------------------------------------------------
// __DEV__ global — React Native defines this; Jest/Node does not.
// Must be set BEFORE any import that references it.
// ---------------------------------------------------------------------------
(global as Record<string, unknown>).__DEV__ = true;

// ---------------------------------------------------------------------------
// Mocks — must come before all imports
// ---------------------------------------------------------------------------

jest.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    absoluteFillObject: {},
  },
  View: 'View',
  Text: 'Text',
}));

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  // Stub hooks so we can call the hook function directly in a Node environment
  // without a full React renderer. useEffect is no-op; useCallback returns fn;
  // useState returns a synchronous [value, setter] pair backed by module state.
  return {
    ...actual,
    // Keep a per-test map of useState slots.
    useState: (init: unknown) => {
      const value = typeof init === 'function' ? (init as () => unknown)() : init;
      return [value, () => undefined];
    },
    useEffect: () => undefined,
    useCallback: (fn: unknown) => fn,
  };
});

// ---------------------------------------------------------------------------
// Imports  (after mocks are registered)
// ---------------------------------------------------------------------------

import {
  DebugOverlay,
  useDebugOverlay,
  enableDebugOverlay,
  disableDebugOverlay,
  updateDebugStats,
  _resetDebugOverlay,
} from '../../src/features/game/core/DebugOverlay';
import type { DebugStats } from '../../src/features/game/core/DebugOverlay';

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  _resetDebugOverlay();
});

afterEach(() => {
  _resetDebugOverlay();
});

// ===========================================================================
// 1. Exported API surface
// ===========================================================================

describe('Exported API surface', () => {
  it('exports enableDebugOverlay as a function', () => {
    expect(typeof enableDebugOverlay).toBe('function');
  });

  it('exports disableDebugOverlay as a function', () => {
    expect(typeof disableDebugOverlay).toBe('function');
  });

  it('exports updateDebugStats as a function', () => {
    expect(typeof updateDebugStats).toBe('function');
  });

  it('exports useDebugOverlay as a function', () => {
    expect(typeof useDebugOverlay).toBe('function');
  });

  it('exports DebugOverlay as a function (React component)', () => {
    expect(typeof DebugOverlay).toBe('function');
  });

  it('useDebugOverlay returns object with isVisible, toggle, and stats keys', () => {
    const result = useDebugOverlay();
    expect(result).toHaveProperty('isVisible');
    expect(result).toHaveProperty('toggle');
    expect(result).toHaveProperty('stats');
  });
});

// ===========================================================================
// 2. DebugStats interface shape
// ===========================================================================

describe('DebugStats interface shape', () => {
  it('stats object contains all 8 required fields', () => {
    const { stats } = useDebugOverlay();
    // Type-check at runtime by asserting the keys exist.
    expect(stats).toHaveProperty('fps');
    expect(stats).toHaveProperty('physicsTickMs');
    expect(stats).toHaveProperty('ringCount');
    expect(stats).toHaveProperty('pegCount');
    expect(stats).toHaveProperty('challengeNumber');
    expect(stats).toHaveProperty('templateId');
    expect(stats).toHaveProperty('assistFlags');
    expect(stats).toHaveProperty('mmkvWriteLatencyMs');
  });

  it('all numeric stats default to 0', () => {
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(0);
    expect(stats.physicsTickMs).toBe(0);
    expect(stats.ringCount).toBe(0);
    expect(stats.pegCount).toBe(0);
    expect(stats.challengeNumber).toBe(0);
    expect(stats.mmkvWriteLatencyMs).toBe(0);
  });

  it('templateId defaults to empty string', () => {
    const { stats } = useDebugOverlay();
    expect(stats.templateId).toBe('');
  });

  it('assistFlags defaults to an empty array', () => {
    const { stats } = useDebugOverlay();
    expect(stats.assistFlags).toEqual([]);
  });

  it('all stat field types match the interface', () => {
    updateDebugStats({
      fps: 60,
      physicsTickMs: 2.5,
      ringCount: 3,
      pegCount: 4,
      challengeNumber: 7,
      templateId: 'Classic',
      assistFlags: ['slow_rings'],
      mmkvWriteLatencyMs: 0.4,
    } satisfies DebugStats);

    const { stats } = useDebugOverlay();
    expect(typeof stats.fps).toBe('number');
    expect(typeof stats.physicsTickMs).toBe('number');
    expect(typeof stats.ringCount).toBe('number');
    expect(typeof stats.pegCount).toBe('number');
    expect(typeof stats.challengeNumber).toBe('number');
    expect(typeof stats.templateId).toBe('string');
    expect(Array.isArray(stats.assistFlags)).toBe(true);
    expect(typeof stats.mmkvWriteLatencyMs).toBe('number');
  });
});

// ===========================================================================
// 3. enableDebugOverlay / disableDebugOverlay
// ===========================================================================

describe('enableDebugOverlay / disableDebugOverlay', () => {
  it('overlay starts hidden after reset', () => {
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(false);
  });

  it('enableDebugOverlay makes the overlay visible', () => {
    enableDebugOverlay();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(true);
  });

  it('disableDebugOverlay hides the overlay', () => {
    enableDebugOverlay();
    disableDebugOverlay();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(false);
  });

  it('calling disableDebugOverlay when already hidden is a no-op', () => {
    disableDebugOverlay();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(false);
  });

  it('calling enableDebugOverlay twice stays visible', () => {
    enableDebugOverlay();
    enableDebugOverlay();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(true);
  });
});

// ===========================================================================
// 4. toggle() from useDebugOverlay
// ===========================================================================

describe('toggle()', () => {
  it('toggle switches from hidden to visible', () => {
    const { toggle } = useDebugOverlay();
    toggle();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(true);
  });

  it('toggle switches from visible to hidden', () => {
    enableDebugOverlay();
    const { toggle } = useDebugOverlay();
    toggle();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(false);
  });
});

// ===========================================================================
// 5. updateDebugStats
// ===========================================================================

describe('updateDebugStats', () => {
  it('merges partial stats (only specified keys change)', () => {
    updateDebugStats({ fps: 58, physicsTickMs: 3.1 });
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(58);
    expect(stats.physicsTickMs).toBe(3.1);
    // Other fields remain at default.
    expect(stats.ringCount).toBe(0);
    expect(stats.pegCount).toBe(0);
  });

  it('updates all fields when fully provided', () => {
    updateDebugStats({
      fps: 60,
      physicsTickMs: 2.5,
      ringCount: 3,
      pegCount: 4,
      challengeNumber: 7,
      templateId: 'Classic',
      assistFlags: ['slow_rings'],
      mmkvWriteLatencyMs: 0.4,
    });
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(60);
    expect(stats.physicsTickMs).toBe(2.5);
    expect(stats.ringCount).toBe(3);
    expect(stats.pegCount).toBe(4);
    expect(stats.challengeNumber).toBe(7);
    expect(stats.templateId).toBe('Classic');
    expect(stats.assistFlags).toEqual(['slow_rings']);
    expect(stats.mmkvWriteLatencyMs).toBe(0.4);
  });

  it('subsequent calls accumulate correctly (last write wins per key)', () => {
    updateDebugStats({ fps: 30 });
    updateDebugStats({ fps: 55, ringCount: 2 });
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(55);
    expect(stats.ringCount).toBe(2);
  });

  it('assistFlags can be an empty array', () => {
    updateDebugStats({ assistFlags: [] });
    const { stats } = useDebugOverlay();
    expect(stats.assistFlags).toEqual([]);
  });

  it('assistFlags can contain multiple entries', () => {
    updateDebugStats({ assistFlags: ['slow_rings', 'aim_guide', 'ghost_hint'] });
    const { stats } = useDebugOverlay();
    expect(stats.assistFlags).toHaveLength(3);
    expect(stats.assistFlags).toContain('aim_guide');
  });

  it('mmkvWriteLatencyMs accepts sub-millisecond values', () => {
    updateDebugStats({ mmkvWriteLatencyMs: 0.123 });
    const { stats } = useDebugOverlay();
    expect(stats.mmkvWriteLatencyMs).toBeCloseTo(0.123, 3);
  });
});

// ===========================================================================
// 6. _resetDebugOverlay
// ===========================================================================

describe('_resetDebugOverlay', () => {
  it('resets visibility to false', () => {
    enableDebugOverlay();
    _resetDebugOverlay();
    const { isVisible } = useDebugOverlay();
    expect(isVisible).toBe(false);
  });

  it('resets all stats to defaults', () => {
    updateDebugStats({ fps: 45, challengeNumber: 3, templateId: 'Spiral', assistFlags: ['x'] });
    _resetDebugOverlay();
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(0);
    expect(stats.challengeNumber).toBe(0);
    expect(stats.templateId).toBe('');
    expect(stats.assistFlags).toEqual([]);
  });
});

// ===========================================================================
// 7. DebugOverlay component — production guard
// ===========================================================================

describe('DebugOverlay component', () => {
  it('is a callable function (React component)', () => {
    expect(typeof DebugOverlay).toBe('function');
  });

  it('returns null when overlay is hidden (default state)', () => {
    // __DEV__ is true in Jest; overlay hidden → render null.
    const result = DebugOverlay();
    expect(result).toBeNull();
  });

  it('returns a non-null React element when overlay is visible', () => {
    enableDebugOverlay();
    const result = DebugOverlay();
    // In dev mode with isVisible=true, the component should return something.
    expect(result).not.toBeNull();
  });

  it('production guard: component returns null when __DEV__ is false', () => {
    // Simulate the production guard by temporarily overriding __DEV__.
    // The DebugOverlay function checks __DEV__ at the top of the function body.
    // We patch the global so the guard fires, verify null, then restore.
    const originalDev = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;
    try {
      enableDebugOverlay(); // even if visible, production returns null
      const result = DebugOverlay();
      expect(result).toBeNull();
    } finally {
      (global as Record<string, unknown>).__DEV__ = originalDev;
    }
  });

  it('production guard: useDebugOverlay returns isVisible=false when __DEV__ is false', () => {
    const originalDev = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;
    try {
      enableDebugOverlay();
      const { isVisible } = useDebugOverlay();
      expect(isVisible).toBe(false);
    } finally {
      (global as Record<string, unknown>).__DEV__ = originalDev;
    }
  });

  it('production guard: enableDebugOverlay is a no-op when __DEV__ is false', () => {
    const originalDev = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;
    try {
      enableDebugOverlay();
      // Visibility must remain false (the enable call was ignored).
      // Restore __DEV__ first so useDebugOverlay reads module-level state correctly.
      (global as Record<string, unknown>).__DEV__ = originalDev;
      // The module-level _isVisible was not changed because the guard fired.
      const { isVisible } = useDebugOverlay();
      expect(isVisible).toBe(false);
    } finally {
      (global as Record<string, unknown>).__DEV__ = originalDev;
    }
  });

  it('production guard: updateDebugStats is a no-op when __DEV__ is false', () => {
    const originalDev = (global as Record<string, unknown>).__DEV__;
    (global as Record<string, unknown>).__DEV__ = false;
    try {
      updateDebugStats({ fps: 120 });
    } finally {
      (global as Record<string, unknown>).__DEV__ = originalDev;
    }
    // Stats should still be at default — the update was ignored.
    const { stats } = useDebugOverlay();
    expect(stats.fps).toBe(0);
  });
});
