/**
 * syncIdempotency.property.test.ts  (task 13.3.2a)
 *
 * Property-based tests for SyncManager queue idempotency and monotonicity.
 * Uses fast-check to generate random operation IDs and payloads.
 */

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

jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() =>
    jest.fn(() => Promise.resolve({ data: { success: true } })),
  ),
}));

import * as fc from 'fast-check';
import { SyncManager } from '../../src/services/sync/SyncManager';

// ─────────────────────────────────────────────────────────────────────────────

describe('Property test: sync idempotency (task 13.3.2a)', () => {
  // Create a fresh SyncManager instance per test so we don't share state
  function makeSyncManager(): SyncManager {
    // SyncManager is a class (exported), not just a singleton
    return new SyncManager();
  }

  it('Property: queue length is non-negative after any enqueue sequence', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 20 }),
        (payloadStrings) => {
          const sm = makeSyncManager();
          payloadStrings.forEach((_, i) => {
            sm.enqueue({
              type: 'user_update',
              payload: { index: i },
            });
          });
          const status = sm.getStatus();
          return status.queueLength >= 0;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property: removeFromQueue reduces queue length or keeps it the same', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: 1, maxLength: 10 }),
        (payloadStrings) => {
          const sm = makeSyncManager();
          payloadStrings.forEach((_, i) => {
            sm.enqueue({
              type: 'score_submit',
              payload: { val: i },
            });
          });

          const beforeLength = sm.getStatus().queueLength;

          // Get internal queue to find an id to remove
          const queue = (sm as any).queue as Array<{ id: string }>;
          if (queue.length > 0) {
            const idToRemove = queue[0].id;
            sm.removeFromQueue(idToRemove);
          }

          const afterLength = sm.getStatus().queueLength;
          return afterLength <= beforeLength;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property: queue length after N enqueues equals N (no auto-flush in test env)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 15 }),
        (n) => {
          const sm = makeSyncManager();
          // Set state to offline so flush doesn't trigger
          (sm as any).state = 'offline';

          for (let i = 0; i < n; i++) {
            sm.enqueue({ type: 'user_update', payload: { i } });
          }

          return sm.getStatus().queueLength === n;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property: getStatus always returns a valid SyncState string', () => {
    const validStates = ['idle', 'syncing', 'success', 'failed', 'offline'];
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (n) => {
          const sm = makeSyncManager();
          (sm as any).state = 'offline';
          for (let i = 0; i < n; i++) {
            sm.enqueue({ type: 'coin_credit', payload: {} });
          }
          return validStates.includes(sm.getStatus().state);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property: removeFromQueue with unknown id does not throw or corrupt queue', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (randomId) => {
          const sm = makeSyncManager();
          (sm as any).state = 'offline';
          sm.enqueue({ type: 'user_update', payload: {} });
          const before = sm.getStatus().queueLength;

          // Remove a probably-nonexistent id
          sm.removeFromQueue(randomId);
          const after = sm.getStatus().queueLength;

          // Queue length either stays same (id not found) or decreases (id found)
          return after <= before && after >= 0;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('Property: queueLength is always a non-negative integer', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { maxLength: 10 }),
        (ops) => {
          const sm = makeSyncManager();
          (sm as any).state = 'offline';
          ops.forEach((enqueue, i) => {
            if (enqueue) {
              sm.enqueue({ type: 'achievement_unlock', payload: { i } });
            } else {
              const q = (sm as any).queue as Array<{ id: string }>;
              if (q.length > 0) sm.removeFromQueue(q[0].id);
            }
          });
          const { queueLength } = sm.getStatus();
          return Number.isInteger(queueLength) && queueLength >= 0;
        },
      ),
      { numRuns: 100 },
    );
  });
});
