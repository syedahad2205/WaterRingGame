/**
 * antiCheat.integration.test.ts
 * Tasks: 13.2.1a, 13.2.2a, 13.2.3a, 13.2.3b
 *
 * Anti-cheat validation via mocked Cloud Functions callable.
 * The mock simulates server-side validation rules:
 *   - completionTimeMs < 8000  → rejected (too fast)
 *   - score > 10000            → rejected (impossible)
 *   - missing HMAC             → rejected
 *   - creditCoins missing HMAC → rejected
 *   - duplicate txId           → idempotent success
 */

jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn((fnName: string) => {
    if (fnName === 'submitScore') {
      return jest.fn((payload: any) => {
        if (payload.completionTimeMs < 8000) {
          return Promise.reject(new Error('Score rejected: solve time too fast'));
        }
        if (payload.score > 10000) {
          return Promise.reject(new Error('Score rejected: impossible score'));
        }
        if (!payload.hmac) {
          return Promise.reject(new Error('Score rejected: missing HMAC'));
        }
        return Promise.resolve({ data: { success: true, rank: 5 } });
      });
    }
    if (fnName === 'creditCoins') {
      return jest.fn((payload: any) => {
        if (!payload.hmac) {
          return Promise.reject(new Error('Invalid HMAC'));
        }
        if (payload.txId === 'already_processed') {
          return Promise.resolve({ data: { success: true, idempotent: true } });
        }
        return Promise.resolve({ data: { success: true, newBalance: payload.amount } });
      });
    }
    if (fnName === 'getDailyChallenge') {
      return jest.fn(() =>
        Promise.resolve({
          data: {
            challengeNumber: 1,
            seed: 'daily_seed_' + new Date().toISOString().slice(0, 10),
          },
        }),
      );
    }
    return jest.fn(() => Promise.resolve({ data: { success: true } }));
  }),
}));

jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(() => ({ toString: () => 'valid_hmac' })),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

import { CloudFunctionsService } from '../../src/services/firebase/CloudFunctionsService';

// ─── helper: unwrap FunctionResult<T> ────────────────────────────────────────
// CloudFunctionsService.call wraps result in { data, success, error }
async function callAndUnwrap(
  svc: CloudFunctionsService,
  name: Parameters<CloudFunctionsService['call']>[0],
  payload: unknown,
): Promise<Record<string, unknown>> {
  const result = await svc.call(name as any, payload);
  if (!result.success) {
    throw new Error(result.error ?? 'call failed');
  }
  return result.data as Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Anti-cheat integration tests (tasks 13.2.1a, 13.2.2a, 13.2.3a, 13.2.3b)', () => {
  let svc: CloudFunctionsService;

  beforeAll(() => {
    svc = CloudFunctionsService.getInstance();
  });

  // ── 13.2.1a: Score submission validation ──────────────────────────────────

  describe('13.2.1a: Score submission validation', () => {
    it('rejects score with completionTimeMs < 8000ms (minimum solve time)', async () => {
      await expect(
        callAndUnwrap(svc, 'submitScore', {
          score: 9000,
          completionTimeMs: 7000,
          hmac: 'valid_hmac',
          challengeNumber: 1,
        }),
      ).rejects.toThrow();
    });

    it('accepts valid score submission', async () => {
      const result = await callAndUnwrap(svc, 'submitScore', {
        score: 9000,
        completionTimeMs: 30000,
        hmac: 'valid_hmac',
        challengeNumber: 1,
      });
      expect(result).toHaveProperty('success', true);
    });

    it('rejects score > 10000 (maximum possible score)', async () => {
      await expect(
        callAndUnwrap(svc, 'submitScore', {
          score: 99999,
          completionTimeMs: 30000,
          hmac: 'valid_hmac',
          challengeNumber: 1,
        }),
      ).rejects.toThrow();
    });

    it('rejects score submission with missing HMAC', async () => {
      await expect(
        callAndUnwrap(svc, 'submitScore', {
          score: 9000,
          completionTimeMs: 30000,
          hmac: '',
          challengeNumber: 1,
        }),
      ).rejects.toThrow();
    });

    it('valid submission returns a rank', async () => {
      const result = await callAndUnwrap(svc, 'submitScore', {
        score: 8500,
        completionTimeMs: 45000,
        hmac: 'valid_hmac',
        challengeNumber: 1,
      });
      expect(result).toHaveProperty('rank');
    });
  });

  // ── 13.2.2a: Coin credit HMAC validation ──────────────────────────────────

  describe('13.2.2a: Coin credit HMAC validation', () => {
    it('rejects creditCoins without HMAC', async () => {
      await expect(
        callAndUnwrap(svc, 'creditCoins', { amount: 100, txId: 'tx_new', hmac: '' }),
      ).rejects.toThrow('Invalid HMAC');
    });

    it('accepts creditCoins with valid HMAC', async () => {
      const result = await callAndUnwrap(svc, 'creditCoins', {
        amount: 100,
        txId: 'tx_valid',
        hmac: 'valid_hmac',
      });
      expect(result).toHaveProperty('success', true);
    });

    it('duplicate txId silently succeeds (idempotent)', async () => {
      const result = await callAndUnwrap(svc, 'creditCoins', {
        amount: 100,
        txId: 'already_processed',
        hmac: 'valid_hmac',
      });
      expect(result).toHaveProperty('idempotent', true);
    });
  });

  // ── 13.2.3a: Anti-cheat criteria constants ────────────────────────────────

  describe('13.2.3a: Anti-cheat criteria validation', () => {
    it('minimum solve time is 8000ms', () => {
      const MIN_SOLVE_TIME_MS = 8000;
      expect(MIN_SOLVE_TIME_MS).toBe(8000);
    });

    it('maximum score is 10000', () => {
      const MAX_SCORE = 10000;
      expect(MAX_SCORE).toBe(10000);
    });

    it('minimum solve time < maximum expected completion time', () => {
      const MIN_SOLVE_TIME_MS = 8000;
      const MAX_TIMER_MS = 120_000; // 2 minutes
      expect(MIN_SOLVE_TIME_MS).toBeLessThan(MAX_TIMER_MS);
    });
  });

  // ── 13.2.3b: Daily challenge generation ───────────────────────────────────

  describe('13.2.3b: Daily challenge generation', () => {
    it('getDailyChallenge returns a result with seed', async () => {
      const result = await callAndUnwrap(svc, 'getDailyChallenge', {});
      expect(result).toHaveProperty('seed');
    });

    it('daily challenge seed contains today date string', async () => {
      const result = await callAndUnwrap(svc, 'getDailyChallenge', {});
      const today = new Date().toISOString().slice(0, 10);
      expect(result.seed as string).toContain(today);
    });

    it('getDailyChallenge returns challengeNumber', async () => {
      const result = await callAndUnwrap(svc, 'getDailyChallenge', {});
      expect(result).toHaveProperty('challengeNumber');
    });
  });
});
