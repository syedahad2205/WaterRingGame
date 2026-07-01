import CryptoJS from 'crypto-js';

export interface LedgerEntry {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  source: string;
  timestamp: number;
  signature: string;
}

export class CoinLedger {
  private salt: string;

  constructor(salt = 'water-ring-v1-global') {
    // Guard: reject empty/undefined salt which would make HMAC trivially forgeable.
    if (!salt || typeof salt !== 'string' || salt.length === 0) {
      throw new Error('[CoinLedger] HMAC salt must be a non-empty string.');
    }
    this.salt = salt;
  }

  sign(entry: Omit<LedgerEntry, 'signature'>): LedgerEntry {
    // Validate amount before signing to prevent NaN/Infinity in the ledger.
    if (!Number.isFinite(entry.amount) || entry.amount < 0) {
      throw new Error(`[CoinLedger] Invalid amount: ${entry.amount}`);
    }
    const payload = CoinLedger.buildSignaturePayload(entry);
    const signature = CryptoJS.HmacSHA256(payload, this.salt).toString();
    return { ...entry, signature };
  }

  verify(entry: LedgerEntry): boolean {
    // Reject entries with non-finite amounts — they cannot have valid signatures.
    if (!Number.isFinite(entry.amount) || entry.amount < 0) {
      return false;
    }
    const { signature, ...rest } = entry;
    if (!signature || typeof signature !== 'string') return false;
    const expected = CryptoJS.HmacSHA256(
      CoinLedger.buildSignaturePayload(rest),
      this.salt,
    ).toString();
    return expected === signature;
  }

  static buildSignaturePayload(entry: Omit<LedgerEntry, 'signature'>): string {
    return `${entry.id}|${entry.type}|${entry.amount}|${entry.source}|${entry.timestamp}`;
  }

  static generateTxId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `tx_${timestamp}_${random}`;
  }
}

export function createLedgerEntry(
  type: 'earn' | 'spend',
  amount: number,
  source: string,
  salt: string,
  txId?: string,
): LedgerEntry {
  const ledger = new CoinLedger(salt);
  const base: Omit<LedgerEntry, 'signature'> = {
    id: txId ?? CoinLedger.generateTxId(),
    type,
    amount,
    source,
    timestamp: Date.now(),
  };
  return ledger.sign(base);
}
