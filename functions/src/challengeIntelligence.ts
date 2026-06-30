import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecordAttemptData {
  challengeNumber: number;
  templateId: string;
  outcome: 'win' | 'loss';
  stars?: number;
  completionTimeMs?: number;
  continuesUsed?: number;
}

interface GetStatsData {
  challengeNumber: number;
}

// ---------------------------------------------------------------------------
// recordChallengeAttempt
// ---------------------------------------------------------------------------

export const recordChallengeAttempt = functions.https.onCall(
  async (data: RecordAttemptData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const userId = context.auth.uid;
    const { challengeNumber, templateId, outcome, stars, completionTimeMs, continuesUsed } = data;

    if (typeof challengeNumber !== 'number' || challengeNumber < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid challengeNumber.');
    }
    if (!['win', 'loss'].includes(outcome)) {
      throw new functions.https.HttpsError('invalid-argument', 'outcome must be win or loss.');
    }

    const now = Date.now();
    const attemptId = `${userId}_${now}`;

    const attemptData: Record<string, unknown> = {
      userId,
      templateId,
      outcome,
      createdAt: now,
      ...(typeof stars === 'number' ? { stars } : {}),
      ...(typeof completionTimeMs === 'number' ? { completionTimeMs } : {}),
      ...(typeof continuesUsed === 'number' ? { continuesUsed } : {}),
    };

    const statsRef = db.collection('challengeStats').doc(String(challengeNumber));
    const attemptRef = statsRef.collection('attempts').doc(attemptId);

    await db.runTransaction(async (tx) => {
      const statsSnap = await tx.get(statsRef);
      const existing = statsSnap.data() ?? {};

      const totalAttempts: number = ((existing['totalAttempts'] as number | undefined) ?? 0) + 1;
      const totalWins: number = ((existing['totalWins'] as number | undefined) ?? 0) + (outcome === 'win' ? 1 : 0);
      const totalLosses: number = ((existing['totalLosses'] as number | undefined) ?? 0) + (outcome === 'loss' ? 1 : 0);

      let avgCompletionTimeMs: number = (existing['avgCompletionTimeMs'] as number | undefined) ?? 0;
      if (typeof completionTimeMs === 'number' && outcome === 'win') {
        // Running average of win completion times
        const prevWins = totalWins - 1;
        avgCompletionTimeMs =
          prevWins === 0
            ? completionTimeMs
            : (avgCompletionTimeMs * prevWins + completionTimeMs) / totalWins;
      }

      let avgStars: number = (existing['avgStars'] as number | undefined) ?? 0;
      if (typeof stars === 'number' && outcome === 'win') {
        const prevWins = totalWins - 1;
        avgStars =
          prevWins === 0
            ? stars
            : (avgStars * prevWins + stars) / totalWins;
      }

      tx.set(
        statsRef,
        {
          challengeNumber,
          totalAttempts,
          totalWins,
          totalLosses,
          avgCompletionTimeMs,
          avgStars,
          updatedAt: now,
        },
        { merge: true },
      );

      tx.set(attemptRef, attemptData);
    });

    return { success: true };
  },
);

// ---------------------------------------------------------------------------
// getChallengeStats
// ---------------------------------------------------------------------------

export const getChallengeStats = functions.https.onCall(
  async (data: GetStatsData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const { challengeNumber } = data;

    if (typeof challengeNumber !== 'number' || challengeNumber < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid challengeNumber.');
    }

    const statsSnap = await db.collection('challengeStats').doc(String(challengeNumber)).get();

    if (!statsSnap.exists) {
      return {
        totalAttempts: 0,
        winRate: 0,
        avgCompletionTimeMs: 0,
        avgStars: 0,
      };
    }

    const d = statsSnap.data() ?? {};
    const totalAttempts: number = (d['totalAttempts'] as number | undefined) ?? 0;
    const totalWins: number = (d['totalWins'] as number | undefined) ?? 0;
    const avgCompletionTimeMs: number = (d['avgCompletionTimeMs'] as number | undefined) ?? 0;
    const avgStars: number = (d['avgStars'] as number | undefined) ?? 0;

    const winRate = totalAttempts > 0 ? totalWins / totalAttempts : 0;

    return { totalAttempts, winRate, avgCompletionTimeMs, avgStars };
  },
);
