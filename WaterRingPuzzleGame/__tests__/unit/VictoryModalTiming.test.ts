import {
  VICTORY_TIMING,
  starAnimationDelays,
} from '../../src/screens/VictoryScreen';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(v => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn(v => v),
  withDelay: jest.fn((_d, v) => v),
  withSequence: jest.fn(v => v),
  withSpring: jest.fn(v => v),
  Easing: { out: jest.fn(x => x), ease: jest.fn() },
  default: { View: 'Animated.View', Text: 'Animated.Text' },
}));
jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn(s => s), absoluteFillObject: {} },
  Pressable: 'Pressable', View: 'View', Text: 'Text', AccessibilityInfo: { isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)) },
}));

describe('VictoryModal animation sequence timing (task 8.3.3a)', () => {
  it('VICTORY_TIMING is defined', () => {
    expect(VICTORY_TIMING).toBeDefined();
  });

  it('panelZoomMs = 400', () => {
    expect(VICTORY_TIMING.panelZoomMs).toBe(400);
  });

  it('flashMs = 200', () => {
    expect(VICTORY_TIMING.flashMs).toBe(200);
  });

  it('minimumTotalMs >= 4000 (requirement: total sequence >= 4 seconds)', () => {
    expect(VICTORY_TIMING.minimumTotalMs).toBeGreaterThanOrEqual(4000);
  });

  it('starFlipMs + starGapMs together form smooth transitions', () => {
    expect(VICTORY_TIMING.starFlipMs).toBeGreaterThan(0);
    expect(VICTORY_TIMING.starGapMs).toBeGreaterThanOrEqual(0);
  });

  it('starAnimationDelays returns correct number of delays for 1 star', () => {
    const delays = starAnimationDelays(1);
    expect(delays).toHaveLength(1);
    expect(delays[0]).toBeGreaterThanOrEqual(0);
  });

  it('starAnimationDelays returns 3 delays for 3 stars', () => {
    const delays = starAnimationDelays(3);
    expect(delays).toHaveLength(3);
  });

  it('star delays are in ascending order', () => {
    const delays = starAnimationDelays(3);
    expect(delays[1]).toBeGreaterThan(delays[0]);
    expect(delays[2]).toBeGreaterThan(delays[1]);
  });

  it('total sequence duration meets minimum', () => {
    const delays = starAnimationDelays(3);
    const totalAfterStars = delays[2] + VICTORY_TIMING.starFlipMs + VICTORY_TIMING.coinsArcMs + VICTORY_TIMING.xpFillMs;
    expect(totalAfterStars).toBeGreaterThanOrEqual(VICTORY_TIMING.minimumTotalMs);
  });
});
