import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EPOCH = new Date('2024-01-01T00:00:00Z').getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CHALLENGE_POOL_SIZE = 500;

function dateStrFromDate(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysSinceEpoch(dateStr: string): number {
  const ts = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.floor((ts - EPOCH) / MS_PER_DAY);
}

/**
 * Very small seeded pseudo-random number generator (mulberry32).
 * Returns a float in [0, 1).
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface DailyChallengeDoc {
  challengeNumber: number;
  templateId: string;
  seed: string;
  dateStr: string;
  expiresAt: number;
  createdAt: number;
}

function generateChallengeForDate(dateStr: string): DailyChallengeDoc {
  const days = daysSinceEpoch(dateStr);
  const challengeNumber = (days % CHALLENGE_POOL_SIZE) + 1;
  const rand = mulberry32(days);

  // Template IDs: t001–t020 (assumed pool)
  const templateIndex = Math.floor(rand() * 20) + 1;
  const templateId = `t${String(templateIndex).padStart(3, '0')}`;

  // Seed: hex string derived from date + days
  const seedVal = Math.floor(rand() * 0xffffffff);
  const seed = seedVal.toString(16).padStart(8, '0');

  // Expires at end of the UTC day
  const expiresAt = new Date(dateStr + 'T00:00:00Z').getTime() + MS_PER_DAY;

  return {
    challengeNumber,
    templateId,
    seed,
    dateStr,
    expiresAt,
    createdAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// getDailyChallenge
// ---------------------------------------------------------------------------

export const getDailyChallenge = functions.https.onCall(
  async (
    data: { dateStr?: string },
    context: functions.https.CallableContext,
  ) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }

    const dateStr =
      typeof data.dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.dateStr)
        ? data.dateStr
        : dateStrFromDate(new Date());

    const docRef = db.collection('dailyChallenges').doc(dateStr);
    const snap = await docRef.get();

    if (snap.exists) {
      const doc = snap.data() as DailyChallengeDoc;
      return {
        challengeNumber: doc.challengeNumber,
        templateId: doc.templateId,
        seed: doc.seed,
        expiresAt: doc.expiresAt,
      };
    }

    // Generate deterministically and cache
    const generated = generateChallengeForDate(dateStr);
    await docRef.set(generated);

    return {
      challengeNumber: generated.challengeNumber,
      templateId: generated.templateId,
      seed: generated.seed,
      expiresAt: generated.expiresAt,
    };
  },
);

// ---------------------------------------------------------------------------
// generateDailyChallenge (scheduled — runs daily 00:00 UTC)
// ---------------------------------------------------------------------------

export const generateDailyChallenge = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    // Pre-generate tomorrow's challenge
    const tomorrow = new Date(Date.now() + MS_PER_DAY);
    const dateStr = dateStrFromDate(tomorrow);

    const docRef = db.collection('dailyChallenges').doc(dateStr);
    const snap = await docRef.get();

    if (snap.exists) {
      functions.logger.info(`[generateDailyChallenge] already exists for ${dateStr}`);
      return;
    }

    const generated = generateChallengeForDate(dateStr);
    await docRef.set(generated);

    functions.logger.info(`[generateDailyChallenge] created challenge for ${dateStr}`, {
      challengeNumber: generated.challengeNumber,
      templateId: generated.templateId,
    });
  });
