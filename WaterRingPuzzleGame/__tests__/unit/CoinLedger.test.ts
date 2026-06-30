/**
 * CoinLedger.test.ts — task 12.1.1a
 * Tests CoinLedger signing/verification and createLedgerEntry.
 */

jest.mock('crypto-js', () => ({
  HmacSHA256: (payload: string, key: string) => ({
    toString: () => 'mock_hmac_' + key + '_' + payload,
  }),
}));

import {
  CoinLedger,
  createLedgerEntry,
  LedgerEntry,
} from '../../src/features/economy/CoinLedger';

describe('CoinLedger', () => {
  let ledger: CoinLedger;

  beforeEach(() => {
    ledger = new CoinLedger('test-salt');
  });

  describe('sign', () => {
    it('adds a non-empty signature field', () => {
      const base = { id: 'tx_001', type: 'earn' as const, amount: 100, source: 'test', timestamp: 1000 };
      const signed = ledger.sign(base);
      expect(signed.signature).toBeTruthy();
      expect(signed.signature.length).toBeGreaterThan(0);
    });

    it('returned entry includes all original fields', () => {
      const base = { id: 'tx_002', type: 'spend' as const, amount: 50, source: 'shop', timestamp: 2000 };
      const signed = ledger.sign(base);
      expect(signed.id).toBe('tx_002');
      expect(signed.amount).toBe(50);
      expect(signed.source).toBe('shop');
    });
  });

  describe('verify', () => {
    it('returns true for an unmodified signed entry', () => {
      const base = { id: 'tx_003', type: 'earn' as const, amount: 200, source: 'level_up', timestamp: 3000 };
      const signed = ledger.sign(base);
      expect(ledger.verify(signed)).toBe(true);
    });

    it('returns false when amount is tampered', () => {
      const base = { id: 'tx_004', type: 'earn' as const, amount: 100, source: 'win', timestamp: 4000 };
      const signed = ledger.sign(base);
      const tampered: LedgerEntry = { ...signed, amount: 9999 };
      expect(ledger.verify(tampered)).toBe(false);
    });

    it('returns false when source is tampered', () => {
      const base = { id: 'tx_005', type: 'earn' as const, amount: 100, source: 'legit', timestamp: 5000 };
      const signed = ledger.sign(base);
      const tampered: LedgerEntry = { ...signed, source: 'hacked' };
      expect(ledger.verify(tampered)).toBe(false);
    });

    it('returns false when signature itself is altered', () => {
      const base = { id: 'tx_006', type: 'earn' as const, amount: 100, source: 'test', timestamp: 6000 };
      const signed = ledger.sign(base);
      const tampered: LedgerEntry = { ...signed, signature: 'bad_sig' };
      expect(ledger.verify(tampered)).toBe(false);
    });
  });

  describe('buildSignaturePayload', () => {
    it('contains id, type, amount, source, timestamp', () => {
      const entry = { id: 'tx_007', type: 'earn' as const, amount: 75, source: 'daily', timestamp: 7000 };
      const payload = CoinLedger.buildSignaturePayload(entry);
      expect(payload).toContain('tx_007');
      expect(payload).toContain('earn');
      expect(payload).toContain('75');
      expect(payload).toContain('daily');
      expect(payload).toContain('7000');
    });
  });

  describe('generateTxId', () => {
    it('returns a non-empty string', () => {
      const txId = CoinLedger.generateTxId();
      expect(typeof txId).toBe('string');
      expect(txId.length).toBeGreaterThan(0);
    });

    it('two consecutive calls return different values', () => {
      const id1 = CoinLedger.generateTxId();
      const id2 = CoinLedger.generateTxId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createLedgerEntry', () => {
    it('returns a valid signed entry with correct type and amount', () => {
      const entry = createLedgerEntry('earn', 100, 'level_complete', 'test-salt');
      expect(entry.type).toBe('earn');
      expect(entry.amount).toBe(100);
      expect(entry.source).toBe('level_complete');
      expect(entry.signature).toBeTruthy();
    });

    it('verify passes for entry created with createLedgerEntry', () => {
      const entry = createLedgerEntry('earn', 100, 'level_complete', 'test-salt');
      const verifier = new CoinLedger('test-salt');
      expect(verifier.verify(entry)).toBe(true);
    });

    it('uses provided txId when given', () => {
      const entry = createLedgerEntry('spend', 50, 'shop', 'salt', 'custom_tx_id');
      expect(entry.id).toBe('custom_tx_id');
    });
  });
});
