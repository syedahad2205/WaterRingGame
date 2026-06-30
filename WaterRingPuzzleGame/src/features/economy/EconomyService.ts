/**
 * EconomyService — stub
 *
 * Coin balance, IAP transactions, and server-validated economy operations.
 * Full implementation: see Requirement 12 and design.md §Economy System.
 *
 * This stub exports a class with the full public interface so that the
 * DI context in Providers.tsx can be properly typed.
 */

export interface SpendResult {
  success: boolean;
  newBalance: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
}

export interface RestoreResult {
  restoredCount: number;
}

export class EconomyService {
  async creditCoins(
    _userId: string,
    _amount: number,
    _source: string,
    _txId: string,
  ): Promise<void> { /* stub */ }

  async spendCoins(
    _userId: string,
    _amount: number,
    _sink: string,
  ): Promise<SpendResult> {
    return { success: false, newBalance: 0 };
  }

  async getBalance(_userId: string): Promise<number> { return 0; }

  async initiatePurchase(_productId: string): Promise<PurchaseResult> {
    return { success: false };
  }

  async restorePurchases(): Promise<RestoreResult> { return { restoredCount: 0 }; }
}
