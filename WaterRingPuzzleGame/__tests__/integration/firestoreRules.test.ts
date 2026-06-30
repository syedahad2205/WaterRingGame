/**
 * Firestore Security Rules — Integration Tests
 *
 * Validates: Requirements 26.3, 26.4, 26.5, 26.6, 26.7
 *
 * Prerequisites:
 *   - Firebase Emulator must be running: `npm run emulators`
 *   - Firestore emulator on port 8080 (configured in firebase.json)
 *
 * Run:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx jest --testPathPattern=firestoreRules
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROJECT_ID = 'demo-water-ring-test';
const FIRESTORE_HOST = '127.0.0.1';
const FIRESTORE_PORT = 8080;

const RULES_PATH = path.resolve(__dirname, '../../firestore.rules');

// Allow extra time for emulator connections (30 seconds per test)
jest.setTimeout(30000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Load rules from the project root firestore.rules file. */
function loadRules(): string {
  return fs.readFileSync(RULES_PATH, 'utf8');
}

// ─── Suite setup ──────────────────────────────────────────────────────────────

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: loadRules(),
      host: FIRESTORE_HOST,
      port: FIRESTORE_PORT,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// ─── Requirement 26.7: All reads/writes require a valid Firebase Auth token ────

describe('Req 26.7 — Unauthenticated access is always denied', () => {
  it('denies unauthenticated read of a player document', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc('players/alice').get());
  });

  it('denies unauthenticated write to a player document', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().doc('players/alice').set({ name: 'Alice' }),
    );
  });

  it('denies unauthenticated read of a leaderboard entry', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().doc('leaderboards/global/entries/alice').get(),
    );
  });

  it('denies unauthenticated read of an economy transaction', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc('economy/tx-001').get());
  });

  it('denies unauthenticated read of challenge intelligence', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().doc('challenge_intelligence/42').get(),
    );
  });
});

// ─── Requirement 26.3: /players/{userId} — owner read/write only ──────────────

describe('Req 26.3 — /players/{userId}: owner read/write only', () => {
  beforeEach(async () => {
    // Seed a player document using admin access (bypasses rules)
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('players/alice')
        .set({ name: 'Alice', xp: 0, level: 1 });
    });
  });

  it('allows the owning user to read their own document', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(alice.firestore().doc('players/alice').get());
  });

  it('allows the owning user to write their own document', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().doc('players/alice').update({ xp: 100 }),
    );
  });

  it('denies a different authenticated user reading another player document', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(bob.firestore().doc('players/alice').get());
  });

  it('denies a different authenticated user writing another player document', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().doc('players/alice').update({ xp: 9999 }),
    );
  });
});

// ─── Requirement 26.3: /players/{userId}/challenges/{N} ───────────────────────

describe('Req 26.3 — /players/{userId}/challenges/{N}: owner only', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('players/alice/challenges/1')
        .set({ stars: 3, completionTime: 42 });
    });
  });

  it('allows owner to read their challenge sub-document', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().doc('players/alice/challenges/1').get(),
    );
  });

  it('allows owner to write their challenge sub-document', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice
        .firestore()
        .doc('players/alice/challenges/2')
        .set({ stars: 2, completionTime: 88 }),
    );
  });

  it('denies a different user reading another player challenge sub-document', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().doc('players/alice/challenges/1').get(),
    );
  });

  it('denies a different user writing another player challenge sub-document', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().doc('players/alice/challenges/3').set({ stars: 1 }),
    );
  });
});

// ─── Requirement 26.3: /players/{userId}/mastery/{templateId} ─────────────────

describe('Req 26.3 — /players/{userId}/mastery/{templateId}: owner only', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('players/alice/mastery/classic')
        .set({ masteryLevel: 3 });
    });
  });

  it('allows owner to read their mastery document', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().doc('players/alice/mastery/classic').get(),
    );
  });

  it('denies another user reading mastery document', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().doc('players/alice/mastery/classic').get(),
    );
  });
});

// ─── Requirement 26.4: /leaderboards/{id}/entries/{userId} ────────────────────
// Readable by all authenticated users; NO client writes.

describe('Req 26.4 — /leaderboards/: authenticated read, no client writes', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('leaderboards/global/entries/alice')
        .set({ score: 1000, completionTime: 42, userId: 'alice' });
    });
  });

  it('allows any authenticated user to read a leaderboard entry', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertSucceeds(
      bob.firestore().doc('leaderboards/global/entries/alice').get(),
    );
  });

  it('allows an authenticated user to read their own leaderboard entry', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().doc('leaderboards/global/entries/alice').get(),
    );
  });

  it('denies any authenticated user writing a leaderboard entry (client-side)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice
        .firestore()
        .doc('leaderboards/global/entries/alice')
        .set({ score: 9999 }),
    );
  });

  it('denies another authenticated user writing a leaderboard entry', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob
        .firestore()
        .doc('leaderboards/global/entries/alice')
        .set({ score: 0 }),
    );
  });

  it('denies unauthenticated read of a leaderboard entry', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().doc('leaderboards/global/entries/alice').get(),
    );
  });
});

// ─── Requirement 26.5: /economy/{txId} ────────────────────────────────────────
// Readable only by the transaction owner; NO client writes.

describe('Req 26.5 — /economy/{txId}: owner read only, no client writes', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('economy/tx-001')
        .set({
          userId: 'alice',
          amount: 100,
          type: 'EARN',
          balanceBefore: 0,
          balanceAfter: 100,
        });
    });
  });

  it('allows the owning user to read their economy transaction', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(alice.firestore().doc('economy/tx-001').get());
  });

  it('denies a different authenticated user reading an economy transaction', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(bob.firestore().doc('economy/tx-001').get());
  });

  it('denies the owning user writing to economy (client writes not allowed)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice
        .firestore()
        .doc('economy/tx-002')
        .set({
          userId: 'alice',
          amount: 999,
          type: 'EARN',
          balanceBefore: 100,
          balanceAfter: 1099,
        }),
    );
  });

  it('denies another user writing to economy', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertFails(
      bob.firestore().doc('economy/tx-003').set({ userId: 'bob', amount: 50 }),
    );
  });

  it('denies unauthenticated read of an economy transaction', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(unauthed.firestore().doc('economy/tx-001').get());
  });
});

// ─── Requirement 26.6: /challenge_intelligence/{N} ────────────────────────────
// Readable by all authenticated users; NO client writes.

describe('Req 26.6 — /challenge_intelligence: authenticated read, no client writes', () => {
  beforeEach(async () => {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await ctx
        .firestore()
        .doc('challenge_intelligence/42')
        .set({ completionRate: 0.72, medianSolveTime: 65 });
    });
  });

  it('allows any authenticated user to read challenge intelligence', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertSucceeds(
      alice.firestore().doc('challenge_intelligence/42').get(),
    );
  });

  it('allows a different authenticated user to read challenge intelligence', async () => {
    const bob = testEnv.authenticatedContext('bob');
    await assertSucceeds(
      bob.firestore().doc('challenge_intelligence/42').get(),
    );
  });

  it('denies any authenticated user writing challenge intelligence (client-side)', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice
        .firestore()
        .doc('challenge_intelligence/42')
        .set({ completionRate: 0.99 }),
    );
  });

  it('denies unauthenticated read of challenge intelligence', async () => {
    const unauthed = testEnv.unauthenticatedContext();
    await assertFails(
      unauthed.firestore().doc('challenge_intelligence/42').get(),
    );
  });
});

// ─── Catch-all: deny all other paths ──────────────────────────────────────────

describe('Catch-all — all other paths are denied', () => {
  it('denies authenticated read of an arbitrary top-level collection', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(alice.firestore().doc('unknown_collection/doc1').get());
  });

  it('denies authenticated write to an arbitrary top-level collection', async () => {
    const alice = testEnv.authenticatedContext('alice');
    await assertFails(
      alice.firestore().doc('unknown_collection/doc1').set({ data: true }),
    );
  });
});
