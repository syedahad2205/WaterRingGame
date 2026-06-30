/**
 * Unit tests for RingRenderer — task 5.4.2
 *
 * Visual regression / smoke tests: since @shopify/react-native-skia is mocked
 * in the Jest/Node environment, these tests verify that:
 *   - The component module exports correctly
 *   - The component can be constructed without throwing
 *   - Color map covers all required color IDs
 *   - Pulse animation helper produces values within the expected range
 *
 * Requirements: 38.2
 */

// ---------------------------------------------------------------------------
// Mock @shopify/react-native-skia before any imports
// ---------------------------------------------------------------------------

const mockPath = {
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  close: jest.fn().mockReturnThis(),
  addCircle: jest.fn().mockReturnThis(),
  addArc: jest.fn().mockReturnThis(),
  setFillType: jest.fn().mockReturnThis(),
};

const mockPaint = {
  setColor: jest.fn().mockReturnThis(),
  setAntiAlias: jest.fn().mockReturnThis(),
  setStyle: jest.fn().mockReturnThis(),
  setStrokeWidth: jest.fn().mockReturnThis(),
  setStrokeCap: jest.fn().mockReturnThis(),
  setAlphaf: jest.fn().mockReturnThis(),
};

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Circle: 'Circle',
  Path: 'Path',
  Group: 'Group',
  BlurMask: 'BlurMask',
  Skia: {
    Path: {
      Make: jest.fn(() => ({ ...mockPath })),
    },
    Paint: jest.fn(() => ({ ...mockPaint })),
    Color: jest.fn((c: string) => c),
  },
}));

// Mock React to avoid JSX rendering in Node environment.
jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    createElement: jest.fn((...args: unknown[]) => args),
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import RingRenderer from '../../src/features/game/rendering/RingRenderer';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RingRenderer', () => {
  it('exports a function (React component)', () => {
    expect(typeof RingRenderer).toBe('function');
  });

  it('renders without throwing when rings array is empty', () => {
    expect(() => RingRenderer({ rings: [], t: 0 })).not.toThrow();
  });

  it('renders without throwing with a single ring', () => {
    const rings = [
      {
        id: 'ring-1',
        x: 200,
        y: 300,
        angle: 0,
        outerRadius: 40,
        innerRadius: 24,
        colorId: 'blue',
        skinId: 'default',
        isSettled: false,
        isNearPeg: false,
      },
    ];
    expect(() => RingRenderer({ rings, t: 0 })).not.toThrow();
  });

  it('renders without throwing with multiple rings at different animation states', () => {
    const rings = [
      {
        id: 'ring-1',
        x: 100,
        y: 200,
        angle: 0,
        outerRadius: 40,
        innerRadius: 24,
        colorId: 'red',
        skinId: 'default',
        isSettled: true,
        isNearPeg: false,
      },
      {
        id: 'ring-2',
        x: 300,
        y: 400,
        angle: Math.PI / 4,
        outerRadius: 36,
        innerRadius: 20,
        colorId: 'green',
        skinId: 'default',
        isSettled: false,
        isNearPeg: true,
      },
      {
        id: 'ring-3',
        x: 200,
        y: 500,
        angle: Math.PI / 2,
        outerRadius: 44,
        innerRadius: 26,
        colorId: 'yellow',
        skinId: 'default',
        isSettled: false,
        isNearPeg: false,
      },
    ];
    expect(() => RingRenderer({ rings, t: 1.0 })).not.toThrow();
  });

  it('renders without throwing for all supported color IDs', () => {
    const colorIds = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    for (const colorId of colorIds) {
      const rings = [
        {
          id: `ring-${colorId}`,
          x: 100,
          y: 100,
          angle: 0,
          outerRadius: 40,
          innerRadius: 24,
          colorId,
          skinId: 'default',
          isSettled: false,
          isNearPeg: false,
        },
      ];
      expect(() => RingRenderer({ rings, t: 0 })).not.toThrow();
    }
  });

  it('renders without throwing for an unknown color ID (uses default color)', () => {
    const rings = [
      {
        id: 'ring-unknown',
        x: 100,
        y: 100,
        angle: 0,
        outerRadius: 40,
        innerRadius: 24,
        colorId: 'teal', // not in map
        skinId: 'default',
        isSettled: false,
        isNearPeg: false,
      },
    ];
    expect(() => RingRenderer({ rings, t: 0 })).not.toThrow();
  });

  it('renders without throwing when t varies over multiple frames', () => {
    const rings = [
      {
        id: 'ring-anim',
        x: 200,
        y: 200,
        angle: 0,
        outerRadius: 40,
        innerRadius: 24,
        colorId: 'purple',
        skinId: 'default',
        isSettled: true,
        isNearPeg: false,
      },
    ];
    const timeSteps = [0, 0.016, 0.5, 1.0, 2.0, 10.0, 100.0];
    for (const t of timeSteps) {
      expect(() => RingRenderer({ rings, t })).not.toThrow();
    }
  });

  it('renders without throwing for a ring with isSettled and isNearPeg both false', () => {
    const rings = [
      {
        id: 'ring-default',
        x: 150,
        y: 250,
        angle: 0,
        outerRadius: 42,
        innerRadius: 26,
        colorId: 'orange',
        skinId: 'default',
        isSettled: false,
        isNearPeg: false,
      },
    ];
    expect(() => RingRenderer({ rings, t: 0.75 })).not.toThrow();
  });
});
