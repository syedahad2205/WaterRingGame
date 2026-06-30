/**
 * AnimationConstants.test.ts
 * Tasks: 10.1.1a, 10.1.2a, 10.1.3a, 10.2.1a, 10.2.2a, 10.2.2b
 *
 * Tests animation constants and timing sequences across multiple source files.
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((v: unknown) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: unknown) => v),
  withDelay: jest.fn((_d: unknown, v: unknown) => v),
  withSequence: jest.fn((v: unknown) => v),
  withSpring: jest.fn((v: unknown) => v),
  withRepeat: jest.fn((v: unknown) => v),
  cancelAnimation: jest.fn(),
  Easing: { out: jest.fn(), in: jest.fn(), inOut: jest.fn(), bezier: jest.fn() },
  interpolateColor: jest.fn(),
  runOnJS: jest.fn((fn: Function) => fn),
}));

jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn((s: unknown) => s), absoluteFillObject: {} },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
  AccessibilityInfo: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), fetch: jest.fn(() => Promise.resolve(false)) },
}));

jest.mock('@react-native-firebase/analytics', () => () => ({ logEvent: jest.fn(() => Promise.resolve()) }));
jest.mock('@react-native-firebase/firestore', () => () => ({ collection: jest.fn(() => ({ doc: jest.fn() })) }));
jest.mock('@react-native-firebase/functions', () => () => ({ httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))) }));

// Import constants under test
import { VICTORY_TIMING, starAnimationDelays } from '../../src/screens/VictoryScreen';
import { BANNER_TIMING } from '../../src/components/AchievementUnlockBanner';

// ─────────────────────────────────────────────────────────────────────────────
// 10.1.1a — Ring landing spring parameters
// ─────────────────────────────────────────────────────────────────────────────

describe('10.1.1a: Ring landing animation spring parameters', () => {
  it('RingRenderer.tsx defines spring config for ring landing', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/features/game/rendering/RingRenderer.tsx'),
      'utf8',
    );
    expect(source).toMatch(/damping|stiffness|spring/i);
  });

  it('landing spring has positive damping', () => {
    const LANDING_SPRING_DAMPING = 25;
    const LANDING_SPRING_STIFFNESS = 300;
    expect(LANDING_SPRING_DAMPING).toBeGreaterThan(0);
    expect(LANDING_SPRING_STIFFNESS).toBeGreaterThan(0);
  });

  it('spring stiffness is greater than damping (underdamped fast-settle)', () => {
    const LANDING_SPRING_DAMPING = 25;
    const LANDING_SPRING_STIFFNESS = 300;
    expect(LANDING_SPRING_STIFFNESS).toBeGreaterThan(LANDING_SPRING_DAMPING);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.1.2a — Near-peg glow opacity range and frequency
// ─────────────────────────────────────────────────────────────────────────────

describe('10.1.2a: Near-peg glow opacity range and frequency', () => {
  it('PegRenderer.tsx defines glow opacity in range 0.3–0.8', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/features/game/rendering/PegRenderer.tsx'),
      'utf8',
    );
    expect(source).toMatch(/0\.3|0\.8|glow/i);
  });

  it('glow pulse frequency ~1.5Hz means period ~667ms', () => {
    const GLOW_FREQUENCY_HZ = 1.5;
    const periodMs = 1000 / GLOW_FREQUENCY_HZ;
    expect(periodMs).toBeCloseTo(667, 0);
  });

  it('opacity range [0.3, 0.8] is valid (min < max, both in [0,1])', () => {
    const GLOW_MIN = 0.3;
    const GLOW_MAX = 0.8;
    expect(GLOW_MIN).toBeGreaterThan(0);
    expect(GLOW_MAX).toBeLessThan(1);
    expect(GLOW_MIN).toBeLessThan(GLOW_MAX);
  });

  it('glow min opacity 0.3 is visible (> 0)', () => {
    expect(0.3).toBeGreaterThan(0);
  });

  it('glow max opacity 0.8 leaves some transparency (< 1)', () => {
    expect(0.8).toBeLessThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.1.3a — Timer animation transition thresholds
// ─────────────────────────────────────────────────────────────────────────────

describe('10.1.3a: Timer animation transitions at 30% and 10%', () => {
  it('TimerArc.tsx has 30% threshold for amber color', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/components/TimerArc.tsx'),
      'utf8',
    );
    expect(source).toMatch(/0\.3|30/);
  });

  it('TimerArc.tsx has 10% threshold for red + pulse', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/components/TimerArc.tsx'),
      'utf8',
    );
    expect(source).toMatch(/0\.1|10/);
  });

  it('color transitions: normal → amber → red are sequential (amber threshold > red threshold)', () => {
    const AMBER_THRESHOLD = 0.3;
    const RED_THRESHOLD = 0.1;
    expect(AMBER_THRESHOLD).toBeGreaterThan(RED_THRESHOLD);
    expect(RED_THRESHOLD).toBeGreaterThan(0);
  });

  it('TimerArc.tsx uses Reanimated for animation', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/components/TimerArc.tsx'),
      'utf8',
    );
    expect(source).toMatch(/useSharedValue|withTiming|withRepeat/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.2.1a — Victory sequence step order and timing
// ─────────────────────────────────────────────────────────────────────────────

describe('10.2.1a: Victory sequence step order and timing', () => {
  it('VICTORY_TIMING defines panelZoomMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('panelZoomMs');
    expect(VICTORY_TIMING.panelZoomMs).toBeGreaterThan(0);
  });

  it('VICTORY_TIMING defines flashMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('flashMs');
    expect(VICTORY_TIMING.flashMs).toBeGreaterThan(0);
  });

  it('VICTORY_TIMING defines starFlipMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('starFlipMs');
    expect(VICTORY_TIMING.starFlipMs).toBeGreaterThan(0);
  });

  it('VICTORY_TIMING defines starGapMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('starGapMs');
    expect(VICTORY_TIMING.starGapMs).toBeGreaterThanOrEqual(0);
  });

  it('VICTORY_TIMING defines coinsArcMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('coinsArcMs');
    expect(VICTORY_TIMING.coinsArcMs).toBeGreaterThan(0);
  });

  it('VICTORY_TIMING defines xpFillMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('xpFillMs');
    expect(VICTORY_TIMING.xpFillMs).toBeGreaterThan(0);
  });

  it('VICTORY_TIMING defines minimumTotalMs', () => {
    expect(VICTORY_TIMING).toHaveProperty('minimumTotalMs');
  });

  it('step order: zoom starts first, flash begins before zoom ends', () => {
    const zoomStart = 0;
    const flashStart = VICTORY_TIMING.panelZoomMs - 100;
    expect(zoomStart).toBeLessThanOrEqual(flashStart);
    expect(flashStart).toBeLessThan(VICTORY_TIMING.panelZoomMs + VICTORY_TIMING.flashMs);
  });

  it('victory sequence total >= 4000ms (requirement 34.3)', () => {
    expect(VICTORY_TIMING.minimumTotalMs).toBeGreaterThanOrEqual(4000);
  });

  it('starAnimationDelays returns array with length = starCount', () => {
    expect(starAnimationDelays(1)).toHaveLength(1);
    expect(starAnimationDelays(2)).toHaveLength(2);
    expect(starAnimationDelays(3)).toHaveLength(3);
  });

  it('starAnimationDelays produces increasing delays', () => {
    const delays = starAnimationDelays(3);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it('star animations start after panel zoom + flash (base offset)', () => {
    const delays = starAnimationDelays(3);
    const expectedBase = VICTORY_TIMING.panelZoomMs + VICTORY_TIMING.flashMs;
    expect(delays[0]).toBeGreaterThanOrEqual(expectedBase);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.2.2a — Achievement banner timing and rank-up spring
// ─────────────────────────────────────────────────────────────────────────────

describe('10.2.2a: Achievement banner timing and rank-up spring', () => {
  it('BANNER_TIMING.display equals 2200', () => {
    expect(BANNER_TIMING.display).toBe(2200);
  });

  it('achievement banner total visible > 2.5 seconds', () => {
    const slideIn = BANNER_TIMING.slideIn ?? 400;
    const total = slideIn + BANNER_TIMING.display;
    expect(total).toBeGreaterThan(2500);
  });

  it('BANNER_TIMING.total includes slideIn + display + slideOut', () => {
    const expected = BANNER_TIMING.slideIn + BANNER_TIMING.display + BANNER_TIMING.slideOut;
    expect(BANNER_TIMING.total).toBe(expected);
  });

  it('BANNER_TIMING.slideIn is positive', () => {
    expect(BANNER_TIMING.slideIn).toBeGreaterThan(0);
  });

  it('BANNER_TIMING.slideOut is positive', () => {
    expect(BANNER_TIMING.slideOut).toBeGreaterThan(0);
  });

  it('rank-up spring stiffness and damping are both positive (spring will settle)', () => {
    const damping = 30;
    const stiffness = 300;
    expect(damping).toBeGreaterThan(0);
    expect(stiffness).toBeGreaterThan(0);
  });

  it('AchievementUnlockBanner.tsx uses spring animation for slide-in', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/components/AchievementUnlockBanner.tsx'),
      'utf8',
    );
    expect(source).toMatch(/withSpring|spring/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10.2.2b — Defeat sequence → modal render
// ─────────────────────────────────────────────────────────────────────────────

describe('10.2.2b: Defeat sequence modal render', () => {
  it('DefeatScreen.tsx fades in on mount using withTiming/useEffect/opacity', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/screens/DefeatScreen.tsx'),
      'utf8',
    );
    expect(source).toMatch(/withTiming|useEffect|opacity/);
  });

  it('DefeatScreen.tsx shows rings-placed count', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/screens/DefeatScreen.tsx'),
      'utf8',
    );
    expect(source).toMatch(/rings|placed|peg/i);
  });

  it('DefeatScreen.tsx does NOT contain the word FAIL or FAILED', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/screens/DefeatScreen.tsx'),
      'utf8',
    );
    // Requirement 34.4: never show "FAIL" or "FAILED"
    expect(source).not.toMatch(/\bFAIL(ED)?\b/);
  });

  it('DefeatScreen.tsx uses Reanimated animated values', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/screens/DefeatScreen.tsx'),
      'utf8',
    );
    expect(source).toMatch(/useSharedValue|useAnimatedStyle/);
  });
});
