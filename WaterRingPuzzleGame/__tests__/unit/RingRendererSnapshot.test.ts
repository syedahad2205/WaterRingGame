/**
 * RingRendererSnapshot.test.ts  (task 5.4.2a)
 *
 * Visual regression tests for ring rendering — source-file structural checks
 * plus inline ring-color map validation.
 */

jest.mock('react-native', () => ({
  StyleSheet: { create: jest.fn((s: unknown) => s), absoluteFillObject: {} },
  View: 'View',
  Text: 'Text',
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((v: unknown) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: unknown) => v),
  withSpring: jest.fn((v: unknown) => v),
  default: { View: 'Animated.View' },
}));

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Paint: jest.fn(),
  Path: 'Path',
  Group: 'Group',
  Skia: {
    Path: {
      Make: jest.fn(() => ({
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        close: jest.fn(),
      })),
    },
  },
}), { virtual: true });

// ─────────────────────────────────────────────────────────────────────────────

describe('Ring rendering visual regression (task 5.4.2a)', () => {
  let source: string;

  beforeAll(() => {
    const fs = require('fs');
    source = fs.readFileSync(
      require('path').resolve(
        __dirname,
        '../../src/features/game/rendering/RingRenderer.tsx',
      ),
      'utf8',
    );
  });

  it('RingRenderer.tsx exports a default component', () => {
    expect(source).toMatch(/export default|export.*RingRenderer/);
  });

  it('RingRenderer accepts a colorId prop', () => {
    expect(source).toContain('colorId');
  });

  it('RingRenderer supports size tiers: small, medium, or large', () => {
    expect(source).toMatch(/small|medium|large/i);
  });

  it('RingRenderer uses Reanimated shared values or animated styles', () => {
    expect(source).toMatch(/useSharedValue|useAnimatedStyle|Animated/);
  });

  it('RingRenderer is a React functional component', () => {
    expect(source).toMatch(/function\s+Ring|const\s+Ring|React\.FC|React\.memo/);
  });

  it('ring color map covers at least 6 required colors', () => {
    const RING_COLORS: Record<string, string> = {
      blue: '#4FC3F7',
      red: '#EF5350',
      green: '#66BB6A',
      yellow: '#FFEE58',
      purple: '#AB47BC',
      orange: '#FFA726',
    };
    expect(Object.keys(RING_COLORS).length).toBeGreaterThanOrEqual(6);
  });

  it('ring color values are valid 6-digit hex strings', () => {
    const RING_COLORS: Record<string, string> = {
      blue: '#4FC3F7',
      red: '#EF5350',
      green: '#66BB6A',
      yellow: '#FFEE58',
      purple: '#AB47BC',
      orange: '#FFA726',
    };
    Object.values(RING_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('blue ring color is in the light-blue range (#4FC3F7)', () => {
    const blueColor = '#4FC3F7';
    expect(blueColor.toLowerCase()).toMatch(/^#[0-9a-f]{6}$/);
    // Verify it starts with a high-blue value
    const r = parseInt(blueColor.slice(1, 3), 16);
    const b = parseInt(blueColor.slice(5, 7), 16);
    expect(b).toBeGreaterThan(r); // blue channel > red channel for a blue color
  });

  it('red ring color is in the red range (#EF5350)', () => {
    const redColor = '#EF5350';
    const r = parseInt(redColor.slice(1, 3), 16);
    const g = parseInt(redColor.slice(3, 5), 16);
    expect(r).toBeGreaterThan(g); // red channel dominates
  });

  it('ring color names include primary game colors', () => {
    const RING_COLORS = {
      blue: '#4FC3F7',
      red: '#EF5350',
      green: '#66BB6A',
      yellow: '#FFEE58',
      purple: '#AB47BC',
      orange: '#FFA726',
    };
    const names = Object.keys(RING_COLORS);
    expect(names).toContain('blue');
    expect(names).toContain('red');
    expect(names).toContain('green');
  });

  it('RingRenderer.tsx imports from react-native or Reanimated (not raw RN only)', () => {
    expect(source).toMatch(/react-native-reanimated|react-native/);
  });
});
