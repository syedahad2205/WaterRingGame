import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreSubmissionData {
  challengeNumber: number;
  score: number;
  completionTimeMs: number;
  starsEarned: 1 | 2 | 3;
  continuesUsed: number;
  replayId?: string;
  hmacSignature: string;
}

interface GetLeaderboardData {
  challengeNumber: number;
  scope: 'global' | 'country' | 'friends';
  timeFilter: 'today' | 'week' | 'allTime';
  limit?: number;
}

interface ScoreEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  rank: number;
  completionTimeMs: number;
  challengeNumber: number;
  timestamp: number;
  starsEarned: number;
  continuesUsed: number;
  replayId?: string;
  country?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getServerSalt(): Promise<string> {
  try {
    const rc = admin.remoteConfig();
    const template = await rc.getTemplate();
    const param = template.parameters['leaderboard_hmac_salt'];
    if (param?.defaultValue && 'value' in param.defaultValue) {
      return param.defaultValue.value as string;
    }
  } catch {
    // fall through to env fallback
  }
  return process.env.LEADERBOARD_HMAC_SALT ?? 'water-ring-leaderboard-v1';
}

function verifyHmac(payload: string, signature: string, salt: string): boolean {
  const expected = crypto
    .createHmac('sha256', salt)
    .update(payload)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

function getTimeFilterCutoff(timeFilter: 'today' | 'week' | 'allTime'): number {
  const now = Date.now();
  if (timeFilter === 'today') {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (timeFilter === 'week') {
    return now - 7 * 24 * 60 * 60 * 1000;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// submitScore
// ---------------------------------------------------------------------------

export const submitScore = functions.https.onCall(
  async (data: ScoreSubmissionData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const userId = context.auth.uid;
    const {
      challengeNumber,
      score,
      completionTimeMs,
      starsEarned,
      continuesUsed,
      replayId,
      hmacSignature,
    } = data;

    // --- Basic validation ---
    if (typeof challengeNumber !== 'number' || challengeNumber < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid challengeNumber.');
    }
    if (typeof score !== 'number' || score < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'score must be >= 0.');
    }
    if (typeof completionTimeMs !== 'number' || completionTimeMs <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'completionTimeMs must be > 0.');
    }
    if (![1, 2, 3].includes(starsEarned)) {
      throw new functions.https.HttpsError('invalid-argument', 'starsEarned must be 1, 2, or 3.');
    }
    if (typeof continuesUsed !== 'number' || continuesUsed < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'continuesUsed must be >= 0.');
    }

    // --- Anti-cheat gates ---
    if (completionTimeMs < 8000) {
      throw new functions.https.HttpsError('failed-precondition', 'Completion time is below minimum threshold.');
    }
    if (score > 10000) {
      throw new functions.https.HttpsError('failed-precondition', 'Score exceeds maximum allowed value.');
    }

    // --- HMAC verification ---
    const salt = await getServerSalt();
    const payload = `${userId}:${challengeNumber}:${score}`;
    if (!verifyHmac(payload, hmacSignature, salt)) {
      throw new functions.https.HttpsError('permission-denied', 'Invalid HMAC signature.');
    }

    // --- Fetch user profile ---
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data() ?? {};
    const country: string | undefined = userData['country'] as string | undefined;

    const entry: Omit<ScoreEntry, 'rank'> = {
      userId,
      username: (userData['username'] as string | undefined) ?? '',
      displayName: (userData['displayName'] as string | undefined) ?? '',
      avatarUrl: (userData['avatarUrl'] as string | undefined) ?? '',
      score,
      completionTimeMs,
      challengeNumber,
      starsEarned,
      continuesUsed,
      timestamp: Date.now(),
      ...(replayId ? { replayId } : {}),
      ...(country ? { country } : {}),
    };

    // --- Write to global leaderboard ---
    const globalRef = db
      .collection('leaderboard')
      .doc('global')
      .collection(String(challengeNumber))
      .collection('scores')
      .doc(userId);

    await globalRef.set(entry, { merge: false });

    // --- Write to country leaderboard if available ---
    if (country) {
      const countryRef = db
        .collection('leaderboard')
        .doc('country')
        .collection(country)
        .doc(String(challengeNumber))
        .collection('scores')
        .doc(userId);
      await countryRef.set(entry, { merge: false });
    }

    // --- Compute rank ---
    const higherScoresSnap = await db
      .collection('leaderboard')
      .doc('global')
      .collection(String(challengeNumber))
      .collection('scores')
      .where('score', '>', score)
      .count()
      .get();

    const rank = (higherScoresSnap.data().count ?? 0) + 1;

    return { success: true, rank };
  },
);

// ---------------------------------------------------------------------------
// getLeaderboard
// ---------------------------------------------------------------------------

export const getLeaderboard = functions.https.onCall(
  async (data: GetLeaderboardData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const userId = context.auth.uid;
    const { challengeNumber, scope, timeFilter, limit = 50 } = data;

    if (typeof challengeNumber !== 'number' || challengeNumber < 1) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid challengeNumber.');
    }
    if (!['global', 'country', 'friends'].includes(scope)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid scope.');
    }
    if (!['today', 'week', 'allTime'].includes(timeFilter)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid timeFilter.');
    }

    const clampedLimit = Math.min(Math.max(1, limit), 100);
    const cutoff = getTimeFilterCutoff(timeFilter);

    let collectionRef: admin.firestore.CollectionReference;

    if (scope === 'global') {
      collectionRef = db
        .collection('leaderboard')
        .doc('global')
        .collection(String(challengeNumber))
        .collection('scores');
    } else if (scope === 'country') {
      const userDoc = await db.collection('users').doc(userId).get();
      const country = (userDoc.data() ?? {})['country'] as string | undefined;
      if (!country) {
        return { entries: [], totalCount: 0 };
      }
      collectionRef = db
        .collection('leaderboard')
        .doc('country')
        .collection(country)
        .doc(String(challengeNumber))
        .collection('scores');
    } else {
      // friends scope: fetch friend list then filter
      const friendsSnap = await db
        .collection('users')
        .doc(userId)
        .collection('friends')
        .where('status', '==', 'accepted')
        .get();
      const friendIds: string[] = friendsSnap.docs.map((d) => d.id);
      friendIds.push(userId); // include self

      collectionRef = db
        .collection('leaderboard')
        .doc('global')
        .collection(String(challengeNumber))
        .collection('scores');

      let q: admin.firestore.Query = collectionRef.orderBy('score', 'desc').orderBy('completionTimeMs', 'asc');
      if (cutoff > 0) {
        q = q.where('timestamp', '>=', cutoff);
      }

      const snap = await q.get();
      const allEntries: ScoreEntry[] = snap.docs
        .map((d, i) => ({ ...(d.data() as Omit<ScoreEntry, 'rank'>), rank: i + 1 }))
        .filter((e) => friendIds.includes(e.userId));

      const friendEntries = allEntries.slice(0, clampedLimit);
      // Re-rank within friend scope
      friendEntries.forEach((e, i) => { e.rank = i + 1; });

      return { entries: friendEntries, totalCount: allEntries.length };
    }

    let query: admin.firestore.Query = collectionRef
      .orderBy('score', 'desc')
      .orderBy('completionTimeMs', 'asc');

    if (cutoff > 0) {
      query = query.where('timestamp', '>=', cutoff);
    }

    const [snap, countSnap] = await Promise.all([
      query.limit(clampedLimit).get(),
      cutoff > 0
        ? query.count().get()
        : collectionRef.count().get(),
    ]);

    const entries: ScoreEntry[] = snap.docs.map((d, i) => ({
      ...(d.data() as Omit<ScoreEntry, 'rank'>),
      rank: i + 1,
    }));

    const totalCount = countSnap.data().count ?? 0;

    return { entries, totalCount };
  },
);
