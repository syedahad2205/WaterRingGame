/**
 * Unit tests for ContinueService
 *
 * Covers:
 *   - computeContinueCost formula and escalation
 *   - computeContinueBonusTime bounds
 *   - computeMaxContinues range
 *   - useContinue coin deduction
 *   - Property 12: Cost(D, n+1) > Cost(D, n)
 *   - Property 16: bonusTime <= 60 (original timer concept)
 *
 * Validates: Requirements 7.2.1, 12.3
 */

// Mock react-native-mmkv so tests run in Node.js.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import * as fc from 'fast-check';
import {
  computeContinueCost,
  computeContinueBonusTime,
  computeMaxContinues,
  useContinue,
} from '../../src/features/economy/ContinueService';
import { useEconomyStore } from '../../src/store/slices/economySlice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetEconomy(balance = 0): void {
  useEconomyStore.setState({
    coinBalance: balance,
    transactionHistory: [],
    purchaseState: 'idle',
    freeContinueTracking: { usedToday: false, resetDate: '' },
    dailyAdViewCount: 0,
  });
}

// ---------------------------------------------------------------------------
// computeContinueCost
// ---------------------------------------------------------------------------

describe('computeContinueCost — formula', () => {
  it('returns BASE_CONTINUE_COST (50) at D=0, n=1', () => {
    // ND=0, n=1: 50 × (1+0) × 1.5^0 = 50
    expect(computeContinueCost(0, 1)).toBe(50);
  });

  it('scales correctly at D=50, n=1', () => {
    // ND=0.5: 50 × 1.5 × 1 = 75
    expect(computeContinueCost(50, 1)).toBe(75);
  });

  it('scales correctly at D=100, n=1', () => {
    // ND=1.0: 50 × 2 × 1 = 100
    expect(computeContinueCost(100, 1)).toBe(100);
  });

  it('escalates from n=1 to n=2 at D=0', () => {
    // n=1: 50, n=2: 50 × 1.5 = 75
    expect(computeContinueCost(0, 2)).toBe(75);
  });

  it('escalates from n=2 to n=3 at D=0', () => {
    // n=3: 50 × 1.5^2 = 112.5 → rounded to 113
    expect(computeContinueCost(0, 3)).toBeCloseTo(113, 0);
  });

  it('returns rounded integer', () => {
    const result = computeContinueCost(33, 2);
    expect(Number.isInteger(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Property 12: Cost(D, n+1) > Cost(D, n)
// **Validates: Requirements 7.2.1 Property 12**
// ---------------------------------------------------------------------------

describe('Property 12 — continue cost escalates with continue number', () => {
  it('Cost(D, n+1) > Cost(D, n) for all D in [0,100] and n in [1,10]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 10 }),
        (d, n) => {
          const costN = computeContinueCost(d, n);
          const costN1 = computeContinueCost(d, n + 1);
          return costN1 > costN;
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// computeContinueBonusTime
// ---------------------------------------------------------------------------

describe('computeContinueBonusTime — bounds', () => {
  it('returns 60 at D=0 (easiest)', () => {
    // max(30, 60 × (1 - 0)) = 60
    expect(computeContinueBonusTime(0)).toBe(60);
  });

  it('returns 30 at D=100 (hardest)', () => {
    // max(30, 60 × (1 - 0.5)) = max(30, 30) = 30
    expect(computeContinueBonusTime(100)).toBe(30);
  });

  it('is always >= 30', () => {
    for (let d = 0; d <= 100; d += 5) {
      expect(computeContinueBonusTime(d)).toBeGreaterThanOrEqual(30);
    }
  });

  it('is always <= 60', () => {
    for (let d = 0; d <= 100; d += 5) {
      expect(computeContinueBonusTime(d)).toBeLessThanOrEqual(60);
    }
  });
});

// ---------------------------------------------------------------------------
// Property 16: bonusTime <= 60
// **Validates: Requirements 7.2.1 Property 16**
// ---------------------------------------------------------------------------

describe('Property 16 — bonus time bounded by 60s', () => {
  it('BonusTime(D) <= 60 for all D in [0,100]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (d) => {
          const bonus = computeContinueBonusTime(d);
          return bonus <= 60;
        },
      ),
      { numRuns: 500 },
    );
  });

  it('BonusTime(D) >= 30 for all D in [0,100]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (d) => {
          const bonus = computeContinueBonusTime(d);
          return bonus >= 30;
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// computeMaxContinues
// ---------------------------------------------------------------------------

describe('computeMaxContinues — range', () => {
  it('returns 3 at D=0 (easiest)', () => {
    // 3 - floor(0 × 2) = 3
    expect(computeMaxContinues(0)).toBe(3);
  });

  it('returns 1 at D=100 (hardest)', () => {
    // 3 - floor(1.0 × 2) = 3 - 2 = 1
    expect(computeMaxContinues(100)).toBe(1);
  });

  it('is always in [1, 3]', () => {
    for (let d = 0; d <= 100; d += 10) {
      const result = computeMaxContinues(d);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(3);
    }
  });
});

// ---------------------------------------------------------------------------
// useContinue — coin deduction
// ---------------------------------------------------------------------------

describe('useContinue — coin deduction', () => {
  beforeEach(() => resetEconomy(0));

  it('returns success=false when balance is insufficient', () => {
    resetEconomy(0);
    const result = useContinue(0, 1, 'test-user');
    expect(result.success).toBe(false);
    expect(result.coinsDeducted).toBe(0);
  });

  it('deducts correct coins when balance is sufficient', () => {
    const cost = computeContinueCost(0, 1); // 50
    resetEconomy(cost + 10);

    const result = useContinue(0, 1, 'test-user');
    expect(result.success).toBe(true);
    expect(result.coinsDeducted).toBe(cost);
    expect(useEconomyStore.getState().coinBalance).toBe(10);
  });

  it('returns correct bonusSeconds even on failure', () => {
    resetEconomy(0);
    const result = useContinue(50, 1, 'test-user');
    expect(result.bonusSeconds).toBe(computeContinueBonusTime(50));
  });

  it('deducts escalated amount for continue number 2', () => {
    const cost2 = computeContinueCost(0, 2); // 75
    resetEconomy(cost2 + 100);

    const result = useContinue(0, 2, 'test-user');
    expect(result.success).toBe(true);
    expect(result.coinsDeducted).toBe(cost2);
  });
});
