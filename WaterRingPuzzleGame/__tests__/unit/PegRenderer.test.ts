/**
 * Unit tests for PegRenderer — task 5.4.3
 *
 * Smoke tests: since @shopify/react-native-skia is mocked in the Jest/Node
 * environment, these tests verify that:
 *   - The component module exports correctly
 *   - The component can be constructed without throwing
 *   - All accepted color IDs render without errors
 *   - Glow animation renders without errors at various t values
 *
 * Requirements: 38.3
 */

// ---------------------------------------------------------------------------
// Mock @shopify/react-native-skia before any imports
// ---------------------------------------------------------------------------

const mockPath = {
  moveTo: jest.fn().mockReturnThis(),
  lineTo: jest.fn().mockReturnThis(),
  close: jest.fn().mockReturnThis(),
  addOval: jest.fn().mockReturnThis(),
};

const mockPaint = {
  setColor: jest.fn().mockReturnThis(),
  setAntiAlias: jest.fn().mockReturnThis(),
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

import PegRenderer from '../../src/features/game/rendering/PegRenderer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePeg(
  overrides: Partial<{
    id: string;
    x: number;
    y: number;
    baseRadius: number;
    tipRadius: number;
    acceptedColorId: string;
    glowColor: string;
    isOccupied: boolean;
  }> = {},
): Parameters<typeof PegRenderer>[0]['pegs'][number] {
  return {
    id: 'peg-1',
    x: 200,
    y: 400,
    baseRadius: 20,
    tipRadius: 8,
    acceptedColorId: 'blue',
    glowColor: '#2196F3',
    isOccupied: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PegRenderer', () => {
  it('exports a function (React component)', () => {
    expect(typeof PegRenderer).toBe('function');
  });

  it('renders without throwing when pegs array is empty', () => {
    expect(() => PegRenderer({ pegs: [], t: 0 })).not.toThrow();
  });

  it('renders without throwing with a single unoccupied peg', () => {
    expect(() => PegRenderer({ pegs: [makePeg()], t: 0 })).not.toThrow();
  });

  it('renders without throwing with a single occupied peg (glow active)', () => {
    const peg = makePeg({ isOccupied: true, glowColor: '#4CAF50' });
    expect(() => PegRenderer({ pegs: [peg], t: 0.5 })).not.toThrow();
  });

  it('renders without throwing with multiple pegs', () => {
    const pegs = [
      makePeg({ id: 'peg-1', x: 100, y: 300, isOccupied: true }),
      makePeg({ id: 'peg-2', x: 300, y: 300, isOccupied: false }),
      makePeg({ id: 'peg-3', x: 200, y: 500, isOccupied: false }),
    ];
    expect(() => PegRenderer({ pegs, t: 0.25 })).not.toThrow();
  });

  it('renders without throwing for all supported accepted color IDs', () => {
    const colorIds = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
    for (const colorId of colorIds) {
      const peg = makePeg({ id: `peg-${colorId}`, acceptedColorId: colorId });
      expect(() => PegRenderer({ pegs: [peg], t: 0 })).not.toThrow();
    }
  });

  it('renders without throwing for an unknown accepted color ID (uses default)', () => {
    const peg = makePeg({ acceptedColorId: 'teal' }); // not in map
    expect(() => PegRenderer({ pegs: [peg], t: 0 })).not.toThrow();
  });

  it('renders without throwing at multiple t values (animation frames)', () => {
    const peg = makePeg({ isOccupied: true });
    const timeSteps = [0, 0.016, 0.333, 0.666, 1.0, 2.5, 10.0];
    for (const t of timeSteps) {
      expect(() => PegRenderer({ pegs: [peg], t })).not.toThrow();
    }
  });

  it('renders without throwing with varying peg geometries', () => {
    const pegs = [
      makePeg({ id: 'p1', baseRadius: 10, tipRadius: 4, y: 200 }),
      makePeg({ id: 'p2', baseRadius: 30, tipRadius: 12, y: 350 }),
      makePeg({ id: 'p3', baseRadius: 16, tipRadius: 6, y: 500, isOccupied: true }),
    ];
    expect(() => PegRenderer({ pegs, t: 0.75 })).not.toThrow();
  });
});
