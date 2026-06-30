import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

export const reportAntiCheat = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to report anti-cheat data.');
  }

  const { challengeNumber, completionTimeMs, score, pressCount, sessionId } = request.data as {
    challengeNumber: number;
    completionTimeMs: number;
    score: number;
    pressCount: number;
    sessionId: string;
  };

  const userId = request.auth.uid;
  const db = admin.firestore();

  let flagged = false;
  let reason: string | null = null;

  if (completionTimeMs < 5000) {
    flagged = true;
    reason = 'Completion time too fast (< 5 seconds).';
  } else if (score > challengeNumber * 1000) {
    flagged = true;
    reason = `Score ${score} exceeds maximum possible for challenge ${challengeNumber}.`;
  }

  const reportData = {
    challengeNumber,
    completionTimeMs,
    score,
    pressCount,
    sessionId,
    userId,
    flagged,
    reason,
    timestamp: Date.now(),
  };

  try {
    await db.doc(`antiCheat/${userId}/reports/${sessionId}`).set(reportData);

    if (flagged) {
      const flaggedRef = db.doc(`antiCheat/flaggedUsers/${userId}`);
      await db.runTransaction(async (tx: admin.firestore.Transaction) => {
        const flaggedDoc = await tx.get(flaggedRef);
        const currentCount: number = flaggedDoc.exists ? (flaggedDoc.data()?.count ?? 0) : 0;
        tx.set(flaggedRef, {
          userId,
          count: currentCount + 1,
          lastFlaggedAt: Date.now(),
          lastReason: reason,
        }, { merge: true });
      });
    }

    return { accepted: true, flagged };
  } catch (err) {
    throw new HttpsError('internal', `Failed to report anti-cheat data: ${(err as Error).message}`);
  }
});
