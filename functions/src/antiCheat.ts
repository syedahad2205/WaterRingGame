import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SOLVE_TIME_MS = 8000;
const MAX_SCORE = 10000;
const REPORTS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const REPORTS_FLAG_THRESHOLD = 3;
const TIMESTAMP_FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes (default)

// ---------------------------------------------------------------------------
// Exported helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the score is within physically possible bounds for the
 * given challenge and completion time.
 */
export function isScorePhysicallyPossible(
  score: number,
  completionTimeMs: number,
  _challengeNumber: number,
): boolean {
  if (score < 0 || score > MAX_SCORE) return false;
  if (completionTimeMs < MIN_SOLVE_TIME_MS) return false;

  // Score-per-second sanity check: max ~1.25 points/ms == 10000 over 8 seconds
  const maxScorePerMs = MAX_SCORE / MIN_SOLVE_TIME_MS;
  if (score / completionTimeMs > maxScorePerMs) return false;

  return true;
}

/**
 * Returns true if the timestamp is within the allowed freshness window.
 * Default window: 5 minutes.
 */
export function isTimestampFresh(
  timestamp: number,
  windowMs: number = TIMESTAMP_FRESHNESS_WINDOW_MS,
): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age >= 0 && age <= windowMs;
}

// ---------------------------------------------------------------------------
// reportSuspiciousActivity
// ---------------------------------------------------------------------------

interface ReportData {
  userId: string;
  reason: string;
  metadata?: Record<string, unknown>;
}

export const reportSuspiciousActivity = functions.https.onCall(
  async (data: ReportData, context: functions.https.CallableContext) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const reporterId = context.auth.uid;
    const { userId, reason, metadata } = data;

    if (!userId || typeof userId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'userId is required.');
    }
    if (!reason || typeof reason !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'reason is required.');
    }

    const now = Date.now();
    const reportId = `${userId}_${now}_${Math.random().toString(36).slice(2, 8)}`;

    const reportDoc = {
      reportId,
      reportedUserId: userId,
      reporterId,
      reason,
      metadata: metadata ?? {},
      createdAt: now,
    };

    await db.collection('antiCheatReports').doc(reportId).set(reportDoc);

    // Check if user has 3+ reports in the last 24h
    const windowStart = now - REPORTS_WINDOW_MS;
    const recentReportsSnap = await db
      .collection('antiCheatReports')
      .where('reportedUserId', '==', userId)
      .where('createdAt', '>=', windowStart)
      .count()
      .get();

    const recentCount = recentReportsSnap.data().count ?? 0;

    if (recentCount >= REPORTS_FLAG_THRESHOLD) {
      await db.collection('users').doc(userId).set(
        { flagged: true, flaggedAt: now, flagReason: 'anti_cheat_reports' },
        { merge: true },
      );
      functions.logger.warn('[antiCheat] User flagged for suspicious activity', {
        userId,
        recentCount,
      });
    }

    return { success: true, reportId };
  },
);
