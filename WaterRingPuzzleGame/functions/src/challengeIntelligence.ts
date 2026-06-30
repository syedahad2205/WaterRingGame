import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

function computeMedian(sortedValues: number[]): number {
  if (sortedValues.length === 0) return 0;
  const mid = Math.floor(sortedValues.length / 2);
  if (sortedValues.length % 2 === 0) {
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
  }
  return sortedValues[mid];
}

function computePercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, index)];
}

export const getChallengeIntelligence = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to get challenge intelligence.');
  }

  const { challengeNumber } = request.data as { challengeNumber: number };

  if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
    throw new HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    const entriesSnap = await db
      .collection(`scores/${challengeNumber}/entries`)
      .limit(1000)
      .get();

    const scores: number[] = [];
    const times: number[] = [];
    const starDist: Record<string, number> = { '1': 0, '2': 0, '3': 0 };

    for (const doc of entriesSnap.docs) {
      const d = doc.data();
      if (typeof d.score === 'number') scores.push(d.score);
      if (typeof d.completionTimeMs === 'number') times.push(d.completionTimeMs);
      if (d.starsEarned === 1) starDist['1']++;
      else if (d.starsEarned === 2) starDist['2']++;
      else if (d.starsEarned === 3) starDist['3']++;
    }

    scores.sort((a, b) => a - b);
    times.sort((a, b) => a - b);

    const totalEntries = entriesSnap.size;
    const averageCompletionTimeMs =
      times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
    const medianScore = computeMedian(scores);
    const topPercentileScore = computePercentile(scores, 95);

    let completionRate = 0;
    if (challengeNumber > 1) {
      const prevCountSnap = await db
        .collection(`scores/${challengeNumber - 1}/entries`)
        .count()
        .get();
      const prevCount = prevCountSnap.data().count;
      completionRate = prevCount > 0 ? totalEntries / prevCount : 0;
    } else {
      completionRate = 1;
    }

    const personalBestDoc = await db
      .doc(`users/${userId}/progress/${challengeNumber}`)
      .get();

    const personalBest = personalBestDoc.exists ? personalBestDoc.data() ?? null : null;

    return {
      globalStats: {
        averageCompletionTimeMs,
        medianScore,
        completionRate,
        starDistribution: starDist,
        topPercentileScore,
        totalEntries,
      },
      personalBest,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    throw new HttpsError('internal', `Failed to get challenge intelligence: ${(err as Error).message}`);
  }
});
