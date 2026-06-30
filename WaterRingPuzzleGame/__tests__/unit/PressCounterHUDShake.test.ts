// PressCounterHUD exports shouldShake(pressCount): boolean
// SHAKE_THRESHOLD = 10

import { shouldShake } from '../../src/components/PressCounterHUD';

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(v => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withSequence: jest.fn(v => v),
  withTiming: jest.fn(v => v),
  withRepeat: jest.fn(v => v),
  cancelAnimation: jest.fn(),
  Easing: { linear: jest.fn(), out: jest.fn(x => x) },
  default: { View: 'Animated.View', Text: 'Animated.Text' },
}));
jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn(s => s) },
  View: 'View', Text: 'Text',
}));

describe('PressCounterHUD shake trigger (task 8.2.3a)', () => {
  it('shouldShake returns false for press count above threshold', () => {
    expect(shouldShake(11)).toBe(false);
    expect(shouldShake(50)).toBe(false);
    expect(shouldShake(100)).toBe(false);
  });

  it('shouldShake returns true at threshold (10)', () => {
    expect(shouldShake(10)).toBe(true);
  });

  it('shouldShake returns true below threshold', () => {
    expect(shouldShake(9)).toBe(true);
    expect(shouldShake(5)).toBe(true);
    expect(shouldShake(1)).toBe(true);
  });

  it('shouldShake returns true at 0', () => {
    expect(shouldShake(0)).toBe(true);
  });

  it('shouldShake does not return true for negative press count', () => {
    // Negative pressCount is invalid; behavior defined as false
    expect(shouldShake(-1)).toBe(false);
  });
});
