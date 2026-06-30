/**
 * Unit tests for economySlice
 *
 * Covers: Requirement 17.2, Property 14 (coinBalance never negative)
 */

// react-native-mmkv needs native binaries; mock it so tests run in Node.js.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import { useEconomyStore } from '../../src/store/slices/economySlice';
import { selectCoinBalance, selectDailyAdCount } from '../../src/store/slices/economySlice';
import type { Transaction } from '../../src/types/economy';

/** Helper: reset the store to default state before each test. */
function resetStore(): void {
  useEconomyStore.setState({
    coinBalance: 0,
    transactionHistory: [],
    purchaseState: 'idle',
    freeContinueTracking: { usedToday: false, resetDate: '' },
    dailyAdViewCount: 0,
  });
}

// ---------------------------------------------------------------------------
// creditCoins
// ---------------------------------------------------------------------------

describe('economySlice — creditCoins', () => {
  beforeEach(resetStore);

  it('increases coinBalance by the credited amount', () => {
    const { creditCoins } = useEconomyStore.getState();
    creditCoins(100, 'level_complete');
    expect(useEconomyStore.getState().coinBalance).toBe(100);
  });

  it('accumulates multiple credits', () => {
    const { creditCoins } = useEconomyStore.getState();
    creditCoins(50, 'reward');
    creditCoins(75, 'reward');
    expect(useEconomyStore.getState().coinBalance).toBe(125);
  });

  it('adds an earn transaction to the history', () => {
    const { creditCoins } = useEconomyStore.getState();
    creditCoins(200, 'daily_challenge');
    const history = useEconomyStore.getState().transactionHistory;
    expect(history).toHaveLength(1);
    expect(history[0].type).toBe('earn');
    expect(history[0].amount).toBe(200);
    expect(history[0].source).toBe('daily_challenge');
  });

  it('ignores zero or negative credit amounts', () => {
    const { creditCoins } = useEconomyStore.getState();
    creditCoins(0, 'zero');
    creditCoins(-50, 'negative');
    expect(useEconomyStore.getState().coinBalance).toBe(0);
    expect(useEconomyStore.getState().transactionHistory).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// debitCoins — non-negative invariant (Property 14)
// ---------------------------------------------------------------------------

describe('economySlice — debitCoins (Property 14: balance never negative)', () => {
  beforeEach(resetStore);

  it('deducts coins when balance is sufficient', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(500, 'setup');
    const result = debitCoins(200, 'purchase');
    expect(result).toBe(true);
    expect(useEconomyStore.getState().coinBalance).toBe(300);
  });

  it('returns false and does NOT deduct when balance is insufficient', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(100, 'setup');
    const result = debitCoins(200, 'purchase');
    expect(result).toBe(false);
    // Balance must remain unchanged.
    expect(useEconomyStore.getState().coinBalance).toBe(100);
  });

  it('returns false when balance is exactly zero and debit amount is positive', () => {
    const { debitCoins } = useEconomyStore.getState();
    const result = debitCoins(1, 'purchase');
    expect(result).toBe(false);
    expect(useEconomyStore.getState().coinBalance).toBe(0);
  });

  it('coinBalance NEVER goes below 0', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(50, 'setup');
    debitCoins(40, 'spend');
    debitCoins(40, 'spend'); // would go negative — should be rejected
    expect(useEconomyStore.getState().coinBalance).toBeGreaterThanOrEqual(0);
  });

  it('allows exact debit equal to balance (reaches zero, not negative)', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(150, 'setup');
    const result = debitCoins(150, 'exact');
    expect(result).toBe(true);
    expect(useEconomyStore.getState().coinBalance).toBe(0);
  });

  it('adds a spend transaction to history on successful debit', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(300, 'setup');
    debitCoins(100, 'continue');
    const history = useEconomyStore.getState().transactionHistory;
    const spendTx = history.find((tx) => tx.type === 'spend');
    expect(spendTx).toBeDefined();
    expect(spendTx?.amount).toBe(100);
    expect(spendTx?.source).toBe('continue');
  });

  it('does NOT add a transaction when debit is rejected', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(50, 'setup');
    const beforeCount = useEconomyStore.getState().transactionHistory.length;
    debitCoins(100, 'failed_purchase');
    expect(useEconomyStore.getState().transactionHistory).toHaveLength(beforeCount);
  });

  it('rejects zero debit amount', () => {
    const { creditCoins, debitCoins } = useEconomyStore.getState();
    creditCoins(100, 'setup');
    const result = debitCoins(0, 'zero');
    expect(result).toBe(false);
    expect(useEconomyStore.getState().coinBalance).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// Transaction history — cap at 50
// ---------------------------------------------------------------------------

describe('economySlice — transaction history capped at 50', () => {
  beforeEach(resetStore);

  it('history length never exceeds 50', () => {
    const { creditCoins } = useEconomyStore.getState();
    // Credit 60 times to overflow the cap.
    for (let i = 0; i < 60; i++) {
      creditCoins(1, `reward_${i}`);
    }
    const { transactionHistory } = useEconomyStore.getState();
    expect(transactionHistory).toHaveLength(50);
  });

  it('oldest entries are evicted when cap is exceeded', () => {
    const { creditCoins } = useEconomyStore.getState();
    for (let i = 0; i < 55; i++) {
      creditCoins(1, `source_${i}`);
    }
    const { transactionHistory } = useEconomyStore.getState();
    // The first 5 entries (source_0..source_4) should have been evicted.
    const sources = transactionHistory.map((tx) => tx.source);
    expect(sources).not.toContain('source_0');
    expect(sources).not.toContain('source_4');
    expect(sources).toContain('source_54');
  });
});

// ---------------------------------------------------------------------------
// recordTransaction
// ---------------------------------------------------------------------------

describe('economySlice — recordTransaction', () => {
  beforeEach(resetStore);

  it('appends a pre-built transaction to history', () => {
    const { recordTransaction } = useEconomyStore.getState();
    const tx: Transaction = {
      id: 'manual-tx-001',
      type: 'earn',
      amount: 500,
      source: 'iap',
      timestamp: Date.now(),
    };
    recordTransaction(tx);
    const { transactionHistory } = useEconomyStore.getState();
    expect(transactionHistory).toHaveLength(1);
    expect(transactionHistory[0].id).toBe('manual-tx-001');
  });
});

// ---------------------------------------------------------------------------
// recordAdView
// ---------------------------------------------------------------------------

describe('economySlice — recordAdView', () => {
  beforeEach(resetStore);

  it('increments dailyAdViewCount by 1 on each call', () => {
    const { recordAdView } = useEconomyStore.getState();
    recordAdView();
    recordAdView();
    expect(useEconomyStore.getState().dailyAdViewCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe('economySlice — selectors', () => {
  beforeEach(resetStore);

  it('selectCoinBalance returns the current balance', () => {
    const { creditCoins } = useEconomyStore.getState();
    creditCoins(250, 'reward');
    const balance = selectCoinBalance(useEconomyStore.getState());
    expect(balance).toBe(250);
  });

  it('selectDailyAdCount returns the current ad count', () => {
    const { recordAdView } = useEconomyStore.getState();
    recordAdView();
    recordAdView();
    recordAdView();
    const count = selectDailyAdCount(useEconomyStore.getState());
    expect(count).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// purchaseState
// ---------------------------------------------------------------------------

describe('economySlice — purchaseState', () => {
  beforeEach(resetStore);

  it('starts as idle', () => {
    expect(useEconomyStore.getState().purchaseState).toBe('idle');
  });

  it('can be updated to pending, success, and failed', () => {
    const { setPurchaseState } = useEconomyStore.getState();
    setPurchaseState('pending');
    expect(useEconomyStore.getState().purchaseState).toBe('pending');
    setPurchaseState('success');
    expect(useEconomyStore.getState().purchaseState).toBe('success');
    setPurchaseState('failed');
    expect(useEconomyStore.getState().purchaseState).toBe('failed');
  });
});

// ---------------------------------------------------------------------------
// freeContinueTracking
// ---------------------------------------------------------------------------

describe('economySlice — freeContinueTracking', () => {
  beforeEach(resetStore);

  it('starts with usedToday: false and empty resetDate', () => {
    const { freeContinueTracking } = useEconomyStore.getState();
    expect(freeContinueTracking.usedToday).toBe(false);
    expect(freeContinueTracking.resetDate).toBe('');
  });

  it('can be updated via setFreeContinueTracking', () => {
    const { setFreeContinueTracking } = useEconomyStore.getState();
    setFreeContinueTracking({ usedToday: true, resetDate: '2025-07-08' });
    const { freeContinueTracking } = useEconomyStore.getState();
    expect(freeContinueTracking.usedToday).toBe(true);
    expect(freeContinueTracking.resetDate).toBe('2025-07-08');
  });
});
