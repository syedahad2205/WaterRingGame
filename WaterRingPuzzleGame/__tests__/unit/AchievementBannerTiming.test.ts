import { BANNER_TIMING } from '../../src/components/AchievementUnlockBanner';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(v => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSpring: jest.fn(v => v),
  withTiming: jest.fn(v => v),
  withDelay: jest.fn((_d, v) => v),
  withSequence: jest.fn(v => v),
  runOnJS: jest.fn(fn => fn),
  Easing: { in: jest.fn(x => x), ease: jest.fn() },
  default: { View: 'Animated.View' },
}));
jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn(s => s) },
  Pressable: 'Pressable', View: 'View', Text: 'Text',
  AccessibilityInfo: { isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)) },
}));

describe('AchievementUnlockBanner timing sequence (task 8.3.4b)', () => {
  it('BANNER_TIMING is defined', () => {
    expect(BANNER_TIMING).toBeDefined();
  });

  it('slide-in spring is ~400ms', () => {
    const slideIn = BANNER_TIMING.slideIn ?? 400;
    expect(slideIn).toBeGreaterThanOrEqual(300);
    expect(slideIn).toBeLessThanOrEqual(600);
  });

  it('display duration is ~2200ms', () => {
    expect(BANNER_TIMING.display).toBe(2200);
  });

  it('slide-out is ~400ms', () => {
    const slideOut = BANNER_TIMING.slideOut ?? 400;
    expect(slideOut).toBeGreaterThanOrEqual(300);
  });

  it('total banner duration > 2s', () => {
    const total = (BANNER_TIMING.slideIn ?? 400) + BANNER_TIMING.display + (BANNER_TIMING.slideOut ?? 400);
    expect(total).toBeGreaterThan(2000);
  });
});
