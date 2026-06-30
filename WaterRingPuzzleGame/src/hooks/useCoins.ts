/**
 * useCoins
 *
 * Convenience hook that surfaces the economySlice Zustand store to UI
 * components. Only subscribes to the fields this hook exposes so consumers
 * do not re-render on unrelated economy mutations (e.g. purchaseState).
 *
 * Actions are retrieved via `useEconomyStore.getState()` — stable references
 * that never cause re-renders.
 *
 * Requirements: 17.2, 17.8
 */

import {
  useEconomyStore,
  selectCoinBalance,
  selectTransactionHistory,
} from '../store/slices/economySlice';

import type { Transaction } from '../types/economy';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseCoinsResult {
  /** Current soft-currency coin balance. Always >= 0. */
  coinBalance: number;
  /** Ordered list of the last 50 transactions (oldest first). */
  transactionHistory: Transaction[];

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Add coins to the balance and record the transaction.
   * @param amount   Positive integer number of coins.
   * @param source   Human-readable source label (e.g. 'level_complete').
   * @param txId     Optional idempotency key.
   */
  creditCoins: (amount: number, source: string, txId?: string) => void;

  /**
   * Deduct coins from the balance.
   * @returns true if successful; false if the balance was insufficient.
   */
  debitCoins: (amount: number, source: string) => boolean;

  /**
   * Pure predicate — does not mutate state.
   * @returns true if the current balance is >= amount.
   */
  canAfford: (amount: number) => boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCoins(): UseCoinsResult {
  // Granular selectors (Requirement 17.8).
  const coinBalance = useEconomyStore(selectCoinBalance);
  const transactionHistory = useEconomyStore(selectTransactionHistory);

  const creditCoins = (amount: number, source: string, txId?: string): void => {
    useEconomyStore.getState().creditCoins(amount, source, txId);
  };

  const debitCoins = (amount: number, source: string): boolean => {
    return useEconomyStore.getState().debitCoins(amount, source);
  };

  const canAfford = (amount: number): boolean => {
    return useEconomyStore.getState().coinBalance >= amount;
  };

  return {
    coinBalance,
    transactionHistory,
    creditCoins,
    debitCoins,
    canAfford,
  };
}
