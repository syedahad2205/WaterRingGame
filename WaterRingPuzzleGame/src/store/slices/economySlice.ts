/**
 * economySlice.ts
 * Zustand slice owning all economy state: coin balance, transaction history,
 * purchase state, free-continue tracking, and daily ad view count.
 *
 * Requirements: 17.2, 18.4
 * Property 14 (design.md): coinBalance MUST never go below 0.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
import type { Transaction, PurchaseState, FreeContinueTracking } from '../../types/economy';

/** Maximum number of transactions kept in history (oldest evicted first). */
const MAX_TRANSACTION_HISTORY = 50;

/** MMKV key used to persist this slice. */
export const ECONOMY_SLICE_MMKV_KEY = 'economy_slice';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface EconomyState {
  /** Current soft-currency balance. Never goes below 0 (Property 14). */
  coinBalance: number;

  /**
   * Ordered list of the last MAX_TRANSACTION_HISTORY transactions.
   * Index 0 = oldest; index length-1 = newest.
   */
  transactionHistory: Transaction[];

  /** RevenueCat / IAP purchase flow state. */
  purchaseState: PurchaseState;

  /** Tracks daily free-continue entitlement. */
  freeContinueTracking: FreeContinueTracking;

  /** Number of rewarded-ad views seen today. */
  dailyAdViewCount: number;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

export interface EconomyActions {
  /**
   * Add coins to the balance and record the transaction.
   * @param amount  Positive integer number of coins to add.
   * @param source  Human-readable source label (e.g. 'level_complete').
   * @param txId    Optional idempotency key (e.g. RevenueCat transaction ID).
   */
  creditCoins: (amount: number, source: string, txId?: string) => void;

  /**
   * Deduct coins from the balance.
   * @returns true if the deduction succeeded; false if insufficient balance.
   */
  debitCoins: (amount: number, source: string) => boolean;

  /**
   * Append a pre-built Transaction record to history.
   * Exposed for cases where the caller already constructed the record.
   */
  recordTransaction: (tx: Transaction) => void;

  /** Increment the daily ad view count by 1. */
  recordAdView: () => void;

  /** Update the purchase flow state machine. */
  setPurchaseState: (state: PurchaseState) => void;

  /** Update the free-continue tracking. */
  setFreeContinueTracking: (tracking: FreeContinueTracking) => void;
}

export type EconomySlice = EconomyState & EconomyActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: EconomyState = {
  coinBalance: 0,
  transactionHistory: [],
  purchaseState: 'idle',
  freeContinueTracking: {
    usedToday: false,
    resetDate: '',
  },
  dailyAdViewCount: 0,
};

// ---------------------------------------------------------------------------
// Helper: cap transaction history
// ---------------------------------------------------------------------------

function cappedHistory(history: Transaction[], newTx: Transaction): Transaction[] {
  const updated = [...history, newTx];
  if (updated.length > MAX_TRANSACTION_HISTORY) {
    return updated.slice(updated.length - MAX_TRANSACTION_HISTORY);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Helper: build a transaction record
// ---------------------------------------------------------------------------

function buildTransaction(
  type: 'earn' | 'spend',
  amount: number,
  source: string,
  txId?: string,
): Transaction {
  return {
    id: txId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    amount,
    source,
    timestamp: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useEconomyStore = create<EconomySlice>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      creditCoins: (amount: number, source: string, txId?: string): void => {
        if (amount <= 0) return;
        const tx = buildTransaction('earn', amount, source, txId);
        set((state) => ({
          coinBalance: state.coinBalance + amount,
          transactionHistory: cappedHistory(state.transactionHistory, tx),
        }));
      },

      debitCoins: (amount: number, source: string): boolean => {
        const { coinBalance } = get();
        if (amount <= 0) return false;
        // Reject if balance would go negative — Property 14.
        if (coinBalance < amount) return false;

        const tx = buildTransaction('spend', amount, source);
        set((state) => ({
          // Guard once more against concurrent state access.
          coinBalance: Math.max(0, state.coinBalance - amount),
          transactionHistory: cappedHistory(state.transactionHistory, tx),
        }));
        return true;
      },

      recordTransaction: (tx: Transaction): void => {
        set((state) => ({
          transactionHistory: cappedHistory(state.transactionHistory, tx),
        }));
      },

      recordAdView: (): void => {
        set((state) => ({
          dailyAdViewCount: state.dailyAdViewCount + 1,
        }));
      },

      setPurchaseState: (purchaseState: PurchaseState): void => {
        set({ purchaseState });
      },

      setFreeContinueTracking: (freeContinueTracking: FreeContinueTracking): void => {
        set({ freeContinueTracking });
      },
    }),
    {
      name: ECONOMY_SLICE_MMKV_KEY,
      storage: createJSONStorage(() => createSliceMMKVStorage(ECONOMY_SLICE_MMKV_KEY)),
      // Only persist state fields, not actions.
      partialize: (state): EconomyState => ({
        coinBalance: state.coinBalance,
        transactionHistory: state.transactionHistory,
        purchaseState: state.purchaseState,
        freeContinueTracking: state.freeContinueTracking,
        dailyAdViewCount: state.dailyAdViewCount,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors (Requirement 17.8 — read only the specific field needed)
// ---------------------------------------------------------------------------

/** Select the current coin balance. */
export const selectCoinBalance = (state: EconomySlice): number => state.coinBalance;

/** Select today's rewarded-ad view count. */
export const selectDailyAdCount = (state: EconomySlice): number => state.dailyAdViewCount;

/** Select the full transaction history (read-only). */
export const selectTransactionHistory = (state: EconomySlice): Transaction[] =>
  state.transactionHistory;

/** Select the current purchase flow state. */
export const selectPurchaseState = (state: EconomySlice): PurchaseState => state.purchaseState;

/** Select the free-continue tracking object. */
export const selectFreeContinueTracking = (state: EconomySlice): FreeContinueTracking =>
  state.freeContinueTracking;
