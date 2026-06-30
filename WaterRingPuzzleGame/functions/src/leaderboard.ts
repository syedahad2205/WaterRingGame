import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string;
  score: number;
  rank: number;
  completionTimeMs: number;
  challengeNumber: number;
  timestamp: number;
}

export const submitScore = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to submit a score.');
  }

  const { challengeNumber, score, completionTimeMs, starsEarned, continuesUsed, replayId, hmacSignature } = request.data as {
    challengeNumber: number;
    score: number;
    completionTimeMs: number;
    starsEarned: number;
    continuesUsed: number;
    replayId?: string;
    hmacSignature: string;
  };

  if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
    throw new HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
  }
  if (score === undefined || score < 0) {
    throw new HttpsError('invalid-argument', 'score must be >= 0.');
  }
  if (completionTimeMs === undefined || completionTimeMs < 0) {
    throw new HttpsError('invalid-argument', 'completionTimeMs must be >= 0.');
  }
  if (!starsEarned || starsEarned < 1 || starsEarned > 3) {
    throw new HttpsError('invalid-argument', 'starsEarned must be between 1 and 3.');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    let displayName = '';
    const userDoc = await db.doc(`users/${userId}`).get();
    if (userDoc.exists) {
      displayName = userDoc.data()?.displayName ?? '';
    }

    const entryData = {
      userId,
      displayName,
      score,
      completionTimeMs,
      starsEarned,
      continuesUsed,
      replayId: replayId ?? null,
      hmacSignature,
      challengeNumber,
      timestamp: Date.now(),
    };

    await db.doc(`scores/${challengeNumber}/entries/${userId}`).set(entryData, { merge: true });
    await db.doc(`leaderboard/${challengeNumber}/global/${userId}`).set(entryData, { merge: true });

    const higherScoresSnap = await db
      .collection(`scores/${challengeNumber}/entries`)
      .where('score', '>', score)
      .count()
      .get();

    const rank = higherScoresSnap.data().count + 1;

    return { rank, success: true };
  } catch (err) {
    throw new HttpsError('internal', `Failed to submit score: ${(err as Error).message}`);
  }
});

export const getLeaderboard = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to fetch leaderboard.');
  }

  const { challengeNumber, scope, limit, friendIds } = request.data as {
    challengeNumber: number;
    scope: 'global' | 'country' | 'friends';
    limit?: number;
    friendIds?: string[];
  };

  if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
    throw new HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();
  const fetchLimit = limit ?? 50;

  try {
    let query: admin.firestore.Query = db
      .collection(`scores/${challengeNumber}/entries`)
      .orderBy('score', 'desc');

    if (scope === 'friends' && friendIds && friendIds.length > 0) {
      query = query.where('userId', 'in', friendIds.slice(0, 30));
    }

    query = query.limit(fetchLimit);

    const snap = await query.get();
    const totalCountSnap = await db
      .collection(`scores/${challengeNumber}/entries`)
      .count()
      .get();

    const entries: LeaderboardEntry[] = snap.docs.map((doc: admin.firestore.QueryDocumentSnapshot, index: number) => {
      const d = doc.data();
      return {
        userId: d.userId,
        displayName: d.displayName ?? '',
        username: d.username ?? '',
        avatarUrl: d.avatarUrl ?? '',
        score: d.score,
        rank: index + 1,
        completionTimeMs: d.completionTimeMs,
        challengeNumber: d.challengeNumber,
        timestamp: d.timestamp,
      };
    });

    let selfEntry: LeaderboardEntry | null = null;
    const selfDoc = await db.doc(`scores/${challengeNumber}/entries/${userId}`).get();
    if (selfDoc.exists) {
      const d = selfDoc.data()!;
      const higherSnap = await db
        .collection(`scores/${challengeNumber}/entries`)
        .where('score', '>', d.score)
        .count()
        .get();
      selfEntry = {
        userId: d.userId,
        displayName: d.displayName ?? '',
        username: d.username ?? '',
        avatarUrl: d.avatarUrl ?? '',
        score: d.score,
        rank: higherSnap.data().count + 1,
        completionTimeMs: d.completionTimeMs,
        challengeNumber: d.challengeNumber,
        timestamp: d.timestamp,
      };
    }

    return {
      entries,
      selfEntry,
      totalCount: totalCountSnap.data().count,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    throw new HttpsError('internal', `Failed to fetch leaderboard: ${(err as Error).message}`);
  }
});
