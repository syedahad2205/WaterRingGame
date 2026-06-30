/**
 * Economy domain types.
 * Used by three or more features — lives in src/types/ per Requirement 2.6.
 */

export interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  source: string;
  timestamp: number;
}

export type PurchaseState = 'idle' | 'pending' | 'success' | 'failed';

export interface FreeContinueTracking {
  /** Whether the free continue has been used today. */
  usedToday: boolean;
  /** ISO date string (YYYY-MM-DD) of the last reset date. */
  resetDate: string;
}
