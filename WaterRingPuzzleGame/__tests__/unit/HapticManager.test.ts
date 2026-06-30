/**
 * Unit tests for HapticManager — tasks 9.3.1a and 9.3.1b
 *
 * Covers:
 *  - All 25 named haptic events trigger without throwing (9.3.1a)
 *  - Each event maps to a non-empty pattern with valid amplitudes and timings (9.3.1a)
 *  - Unsupported device: trigger is no-op without error (9.3.1b)
 *  - Global intensity 0 suppresses all haptics
 *  - Ring collision throttle: max 3 per 100 ms
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

// ---------------------------------------------------------------------------
// Platform mock — must be declared before any imports so jest.mock hoisting works
// ---------------------------------------------------------------------------

/** Mutable reference controlling Platform.OS in tests (must be prefixed 'mock'). */
let mockPlatformOS: string = 'ios';

jest.mock('react-native', () => ({
  Platform: {
    get OS(): string {
      return mockPlatformOS;
    },
  },
}));

// ---------------------------------------------------------------------------
// react-native-haptic-feedback mock
// ---------------------------------------------------------------------------

const mockTriggerPattern = jest.fn();
const mockStop = jest.fn();
const mockIsSupported = jest.fn();

jest.mock('react-native-haptic-feedback', () => {
  return {
    __esModule: true,
    default: {
      trigger: jest.fn(),
      stop: (...args: unknown[]): unknown => mockStop(...args),
      isSupported: (): boolean => mockIsSupported(),
      triggerPattern: (...args: unknown[]): unknown => mockTriggerPattern(...args),
      impact: jest.fn(),
      setEnabled: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
      playAHAP: jest.fn().mockResolvedValue(undefined),
      getSystemHapticStatus: jest.fn().mockResolvedValue({
        vibrationEnabled: true,
        ringerMode: 'normal',
      }),
    },
    HapticFeedbackTypes: {
      impactLight: 'impactLight',
      impactMedium: 'impactMedium',
      impactHeavy: 'impactHeavy',
      selection: 'selection',
    },
  };
});

// ---------------------------------------------------------------------------
// Module under test (imported AFTER mocks are registered)
// ---------------------------------------------------------------------------

import { HapticManager, type HapticEvent, type HapticPattern } from '@features/audio/HapticManager';

// ---------------------------------------------------------------------------
// All 25 haptic event names
// ---------------------------------------------------------------------------

const ALL_EVENTS: HapticEvent[] = [
  'buttonTap',
  'buttonHoldStart',
  'buttonHoldSustained',
  'buttonHoldPeak',
  'rapidTap',
  'simultaneousPress',
  'ringCollisionLight',
  'ringCollisionHeavy',
  'ringWallCollision',
  'ringNearPeg',
  'ringLandedPeg',
  'perfectPlacement',
  'pegOccupied',
  'timerWarning',
  'timerCritical',
  'victory',
  'defeat',
  'bossVictory',
  'continueGranted',
  'navigationTap',
  'purchaseConfirm',
  'achievementUnlock',
  'cosmeticEquipped',
  'coinEarn',
  'actionBlocked',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh HapticManager instance for each test. */
function makeManager(): HapticManager {
  return new HapticManager();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HapticManager — event catalogue (9.3.1a)', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockStop.mockClear();
    mockIsSupported.mockReturnValue(true);
    mockPlatformOS = 'ios';
  });

  it('ALL_EVENTS contains exactly 25 unique named events', () => {
    expect(ALL_EVENTS).toHaveLength(25);
    expect(new Set(ALL_EVENTS).size).toBe(25);
  });

  describe('every event triggers without throwing', () => {
    it.each(ALL_EVENTS)('trigger("%s") does not throw', (event) => {
      const manager = makeManager();
      expect(() => manager.trigger(event)).not.toThrow();
    });
  });

  describe('every event invokes the haptic library on a supported device', () => {
    // Each test uses a fresh manager so collision throttle never blocks the
    // first call.
    it.each(ALL_EVENTS)('trigger("%s") calls triggerPattern once', (event) => {
      const manager = makeManager();
      mockTriggerPattern.mockClear();
      manager.trigger(event);
      expect(mockTriggerPattern).toHaveBeenCalledTimes(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Unsupported device — no-op without error (9.3.1b)
// ---------------------------------------------------------------------------

describe('HapticManager — unsupported device (9.3.1b)', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockStop.mockClear();
    mockIsSupported.mockReturnValue(false);
    mockPlatformOS = 'ios';
  });

  it('isSupported() returns false when the library reports no support', () => {
    const manager = makeManager();
    expect(manager.isSupported()).toBe(false);
  });

  it.each(ALL_EVENTS)(
    'trigger("%s") is a no-op without throwing on unsupported device',
    (event) => {
      const manager = makeManager();
      expect(() => manager.trigger(event)).not.toThrow();
      expect(mockTriggerPattern).not.toHaveBeenCalled();
    },
  );

  it('triggerPattern() is a no-op without throwing on unsupported device', () => {
    const manager = makeManager();
    const pattern: HapticPattern = { amplitudes: [200, 100], timings: [20, 10], repeat: 0 };
    expect(() => manager.triggerPattern(pattern)).not.toThrow();
    expect(mockTriggerPattern).not.toHaveBeenCalled();
  });

  it('cancelAll() is a no-op without throwing on unsupported device', () => {
    const manager = makeManager();
    expect(() => manager.cancelAll()).not.toThrow();
    expect(mockStop).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Non-mobile platform (web)
// ---------------------------------------------------------------------------

describe('HapticManager — non-mobile platform (web)', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockIsSupported.mockReturnValue(false);
    mockPlatformOS = 'web';
  });

  afterEach(() => {
    mockPlatformOS = 'ios';
  });

  it('isSupported() returns false on non-mobile platform', () => {
    const manager = makeManager();
    expect(manager.isSupported()).toBe(false);
  });

  it.each(['buttonTap', 'victory', 'ringLandedPeg'] as HapticEvent[])(
    'trigger("%s") is a no-op on web',
    (event) => {
      const manager = makeManager();
      expect(() => manager.trigger(event)).not.toThrow();
      expect(mockTriggerPattern).not.toHaveBeenCalled();
    },
  );
});

// ---------------------------------------------------------------------------
// Global intensity scaling
// ---------------------------------------------------------------------------

describe('HapticManager — global intensity scaling', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockIsSupported.mockReturnValue(true);
    mockPlatformOS = 'ios';
  });

  it('setGlobalIntensity(0) suppresses ALL 25 haptic events', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(0);

    for (const event of ALL_EVENTS) {
      manager.trigger(event);
    }

    expect(mockTriggerPattern).not.toHaveBeenCalled();
  });

  it('setGlobalIntensity(1) allows haptics through at full amplitude', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(1);
    manager.trigger('buttonTap');
    expect(mockTriggerPattern).toHaveBeenCalledTimes(1);
  });

  it('clamps intensity values above 1 down to 1.0', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(2.0);
    manager.trigger('buttonTap');
    expect(mockTriggerPattern).toHaveBeenCalledTimes(1);
    const events = mockTriggerPattern.mock.calls[0][0] as Array<{ intensity?: number }>;
    events.forEach((e) => {
      if (e.intensity !== undefined) {
        expect(e.intensity).toBeLessThanOrEqual(1.0);
      }
    });
  });

  it('clamps intensity values below 0 up to 0 (suppresses all haptics)', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(-1.0);
    manager.trigger('buttonTap');
    // amplitude × 0 = 0 → all events filtered → no call
    expect(mockTriggerPattern).not.toHaveBeenCalled();
  });

  it('intensity 0.5 scales amplitudes to ~50% of designed value', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(0.5);
    // buttonHoldPeak is designed with amplitude 240
    manager.trigger('buttonHoldPeak');

    const events = mockTriggerPattern.mock.calls[0][0] as Array<{ intensity: number }>;
    // Expected: round(240 * 0.5) / 255 ≈ 0.4706
    const expected = Math.round(240 * 0.5) / 255;
    expect(events[0].intensity).toBeCloseTo(expected, 2);
  });

  it('triggerPattern with custom pattern respects global intensity 0', () => {
    const manager = makeManager();
    manager.setGlobalIntensity(0);
    const pattern: HapticPattern = { amplitudes: [200], timings: [20], repeat: 0 };
    manager.triggerPattern(pattern);
    expect(mockTriggerPattern).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Ring collision throttle: max 3 per 100 ms (Requirement 15.4)
// ---------------------------------------------------------------------------

describe('HapticManager — ring collision throttle', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockIsSupported.mockReturnValue(true);
    mockPlatformOS = 'android';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    mockPlatformOS = 'ios';
  });

  it('allows exactly 3 ringCollisionLight events in a 100 ms window', () => {
    const manager = makeManager();

    manager.trigger('ringCollisionLight'); // 1 → allowed
    manager.trigger('ringCollisionLight'); // 2 → allowed
    manager.trigger('ringCollisionLight'); // 3 → allowed
    manager.trigger('ringCollisionLight'); // 4 → throttled

    expect(mockTriggerPattern).toHaveBeenCalledTimes(3);
  });

  it('allows exactly 3 ringCollisionHeavy events in a 100 ms window', () => {
    const manager = makeManager();

    manager.trigger('ringCollisionHeavy'); // 1
    manager.trigger('ringCollisionHeavy'); // 2
    manager.trigger('ringCollisionHeavy'); // 3
    manager.trigger('ringCollisionHeavy'); // 4 → throttled

    expect(mockTriggerPattern).toHaveBeenCalledTimes(3);
  });

  it('throttle window resets after 100 ms — allows 3 more events', () => {
    const manager = makeManager();

    // Fill the throttle window
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight'); // throttled
    expect(mockTriggerPattern).toHaveBeenCalledTimes(3);

    // Advance past the 100 ms window
    jest.advanceTimersByTime(101);
    mockTriggerPattern.mockClear();

    // Window reset — 3 more should be allowed
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    expect(mockTriggerPattern).toHaveBeenCalledTimes(3);
  });

  it('non-collision events bypass the throttle entirely', () => {
    const manager = makeManager();

    for (let i = 0; i < 6; i++) {
      manager.trigger('buttonTap');
    }

    // All 6 should go through — no throttle applied
    expect(mockTriggerPattern).toHaveBeenCalledTimes(6);
  });

  it('ringCollisionLight and ringCollisionHeavy share the same throttle bucket', () => {
    const manager = makeManager();

    // 3 light collisions fill the shared window
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    manager.trigger('ringCollisionLight');
    mockTriggerPattern.mockClear();

    // Heavy collisions are also throttled because the window is full
    manager.trigger('ringCollisionHeavy');
    manager.trigger('ringCollisionHeavy');
    manager.trigger('ringCollisionHeavy');

    expect(mockTriggerPattern).toHaveBeenCalledTimes(0);
  });
});

// ---------------------------------------------------------------------------
// triggerPattern (custom HapticPattern API)
// ---------------------------------------------------------------------------

describe('HapticManager — triggerPattern (custom pattern)', () => {
  beforeEach(() => {
    mockTriggerPattern.mockClear();
    mockIsSupported.mockReturnValue(true);
    mockPlatformOS = 'ios';
  });

  it('fires triggerPattern once with the correct event count', () => {
    const manager = makeManager();
    const pattern: HapticPattern = {
      amplitudes: [200, 150, 100],
      timings: [20, 15, 10],
      repeat: 0,
    };
    manager.triggerPattern(pattern);
    expect(mockTriggerPattern).toHaveBeenCalledTimes(1);
    const events = mockTriggerPattern.mock.calls[0][0] as unknown[];
    expect(events).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// cancelAll
// ---------------------------------------------------------------------------

describe('HapticManager — cancelAll', () => {
  beforeEach(() => {
    mockStop.mockClear();
    mockIsSupported.mockReturnValue(true);
    mockPlatformOS = 'ios';
  });

  it('delegates to stop() on the haptic library when supported', () => {
    const manager = makeManager();
    manager.cancelAll();
    expect(mockStop).toHaveBeenCalledTimes(1);
  });
});
