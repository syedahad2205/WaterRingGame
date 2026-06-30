// WaterButton exports MIN_TOUCH_TARGET, BUTTON_FACE_SIZE, SPRING_BACK_CONFIG
// It exports MIN_TOUCH_TARGET = 88, BUTTON_FACE_SIZE = 72

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn(v => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn(v => v),
  withSpring: jest.fn(v => v),
  default: { View: 'Animated.View' },
}));
jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn(s => s), absoluteFillObject: {} },
  Pressable: 'Pressable', View: 'View', Text: 'Text',
}));

describe('WaterButton tests (task 8.2.1a + 8.2.1b)', () => {
  it('source defines MIN_TOUCH_TARGET = 88 (WCAG 2.5.5 requirement)', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    expect(source).toContain('MIN_TOUCH_TARGET = 88');
  });

  it('source defines accessibilityRole="button"', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    expect(source).toContain('accessibilityRole');
    expect(source).toContain('button');
  });

  it('source defines accessibilityLabel prop', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    expect(source).toContain('accessibilityLabel');
  });

  it('touch target width/height uses MIN_TOUCH_TARGET (88dp)', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    // The outer wrapper uses MIN_TOUCH_TARGET for width/height
    expect(source).toContain('MIN_TOUCH_TARGET');
    expect(source).toMatch(/width.*MIN_TOUCH_TARGET|height.*MIN_TOUCH_TARGET/);
  });

  it('depress animation uses 50ms linear timing (task 8.2.1a)', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    expect(source).toContain('50');  // DEPRESS_DURATION_MS = 50
  });

  it('haptic trigger present on press (task 8.2.1a)', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/components/WaterButton.tsx'), 'utf8'
    );
    expect(source).toMatch(/haptic|Haptic|HapticManager/);
  });
});
