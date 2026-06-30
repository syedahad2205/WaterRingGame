import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as admin from 'firebase-admin';

function hashDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export const getDailyChallenge = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to get daily challenge.');
  }

  const { date } = request.data as { date?: string };
  const targetDate = date ?? new Date().toISOString().slice(0, 10);

  const db = admin.firestore();

  try {
    const docRef = db.doc(`dailyChallenges/${targetDate}`);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data()!;
      return {
        challengeNumber: data.challengeNumber,
        date: data.date,
        seed: data.seed,
      };
    }

    const dateHash = hashDate(targetDate);
    const challengeNumber = (dateHash % 500) + 1;
    const seed = dateHash % 100000;

    return {
      challengeNumber,
      date: targetDate,
      seed,
    };
  } catch (err) {
    throw new HttpsError('internal', `Failed to get daily challenge: ${(err as Error).message}`);
  }
});

export const generateDailyChallenge = onSchedule('every 24 hours', async () => {
  const db = admin.firestore();

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const dateHash = hashDate(tomorrow);
  const challengeNumber = (dateHash % 500) + 1;
  const seed = Date.now() % 100000;

  await db.doc(`dailyChallenges/${tomorrow}`).set({
    challengeNumber,
    date: tomorrow,
    seed,
    generatedAt: Date.now(),
  });
});
