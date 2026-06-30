import { useEconomyStore } from '../../store/slices/economySlice';
import { CoinLedger, createLedgerEntry } from './CoinLedger';

export interface SpendResult {
  success: boolean;
  newBalance: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface RestoreResult {
  restoredCount: number;
}

export class EconomyService {
  private ledger: CoinLedger;

  constructor(hmacSalt?: string) {
    this.ledger = new CoinLedger(hmacSalt ?? 'water-ring-v1-global');
  }

  async creditCoins(
    userId: string,
    amount: number,
    source: string,
    txId?: string,
  ): Promise<void> {
    const { creditCoins } = useEconomyStore.getState();
    const resolvedTxId = txId ?? CoinLedger.generateTxId();
    creditCoins(amount, source, resolvedTxId);

    const entry = createLedgerEntry('earn', amount, source, this.ledger['salt'], resolvedTxId);

    // Async server sync — fire and forget
    this.syncToServer(userId, entry).catch((err: unknown) => {
      console.warn('[EconomyService] server sync failed', err);
    });
  }

  async spendCoins(
    userId: string,
    amount: number,
    sink: string,
  ): Promise<SpendResult> {
    const { debitCoins, coinBalance } = useEconomyStore.getState();
    const success = debitCoins(amount, sink);
    const newBalance = success ? coinBalance - amount : coinBalance;

    if (success) {
      const entry = createLedgerEntry('spend', amount, sink, this.ledger['salt']);
      this.syncToServer(userId, entry).catch((err: unknown) => {
        console.warn('[EconomyService] server sync failed', err);
      });
    }

    return { success, newBalance };
  }

  getBalance(): number {
    return useEconomyStore.getState().coinBalance;
  }

  async initiatePurchase(_productId: string): Promise<PurchaseResult> {
    try {
      // TODO: wire up real PurchaseService
      const { PurchaseService } = await import('./PurchaseService');
      const svc = PurchaseService.getInstance();
      const outcome = await svc.purchase(_productId as Parameters<typeof svc.purchase>[0]);
      return {
        success: outcome.success,
        transactionId: outcome.transactionId,
        error: outcome.error,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  }

  async restorePurchases(): Promise<RestoreResult> {
    try {
      const { PurchaseService } = await import('./PurchaseService');
      const svc = PurchaseService.getInstance();
      return await svc.restorePurchases();
    } catch {
      return { restoredCount: 0 };
    }
  }

  private async syncToServer(userId: string, entry: object): Promise<void> {
    // Dynamic require to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { CloudFunctionsService } = require('../../services/CloudFunctionsService') as {
      CloudFunctionsService: { call: (fn: string, payload: unknown) => Promise<unknown> };
    };
    await CloudFunctionsService.call('economy', { userId, entry });
  }
}

export const economyService: EconomyService = new EconomyService();
