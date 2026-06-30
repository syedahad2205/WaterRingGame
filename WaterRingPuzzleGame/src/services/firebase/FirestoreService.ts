import firestore from '@react-native-firebase/firestore';

export interface UserDocument {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string;
  level: number;
  xp: number;
  prestige: number;
  coinBalance: number;
  totalStars: number;
  createdAt: number;
  updatedAt: number;
}

export interface ScoreDocument {
  userId: string;
  displayName: string;
  score: number;
  completionTimeMs: number;
  starsEarned: number;
  continuesUsed: number;
  challengeNumber: number;
  replayId?: string;
  timestamp: number;
}

export interface ReplayMetaDocument {
  replayId: string;
  userId: string;
  challengeNumber: number;
  durationMs: number;
  compressedSizeBytes: number;
  storageUrl: string;
  timestamp: number;
}

export class FirestoreService {
  // ── User documents ───────────────────────────────────────────────────────────

  async getUser(userId: string): Promise<UserDocument | null> {
    try {
      const snap = await firestore().collection('users').doc(userId).get();
      if (!snap.exists) return null;
      return snap.data() as UserDocument;
    } catch (e) {
      console.warn('[FirestoreService] getUser error:', e);
      return null;
    }
  }

  async setUser(userId: string, data: Partial<UserDocument>): Promise<void> {
    try {
      await firestore().collection('users').doc(userId).set(data, { merge: true });
    } catch (e) {
      console.warn('[FirestoreService] setUser error:', e);
    }
  }

  async updateUser(userId: string, fields: Partial<UserDocument>): Promise<void> {
    try {
      await firestore().collection('users').doc(userId).update(fields);
    } catch (e) {
      console.warn('[FirestoreService] updateUser error:', e);
    }
  }

  // ── Score documents ──────────────────────────────────────────────────────────

  async submitScore(
    scope: string,
    challengeNumber: number,
    score: ScoreDocument,
  ): Promise<void> {
    try {
      await firestore()
        .collection('leaderboard')
        .doc(scope)
        .collection(String(challengeNumber))
        .doc('scores')
        .collection(score.userId)
        .doc(score.userId)
        .set(score, { merge: false });
    } catch (e) {
      console.warn('[FirestoreService] submitScore error:', e);
    }
  }

  async getTopScores(
    scope: string,
    challengeNumber: number,
    limit = 100,
  ): Promise<ScoreDocument[]> {
    try {
      const snap = await firestore()
        .collectionGroup('scores')
        .where('challengeNumber', '==', challengeNumber)
        .orderBy('score', 'desc')
        .limit(limit)
        .get();
      return snap.docs.map(d => d.data() as ScoreDocument);
    } catch (e) {
      console.warn('[FirestoreService] getTopScores error:', e);
      return [];
    }
  }

  async getUserScore(
    scope: string,
    challengeNumber: number,
    userId: string,
  ): Promise<ScoreDocument | null> {
    try {
      const snap = await firestore()
        .collection('leaderboard')
        .doc(scope)
        .collection(String(challengeNumber))
        .doc('scores')
        .collection(userId)
        .doc(userId)
        .get();
      if (!snap.exists) return null;
      return snap.data() as ScoreDocument;
    } catch (e) {
      console.warn('[FirestoreService] getUserScore error:', e);
      return null;
    }
  }

  // ── Replay metadata ──────────────────────────────────────────────────────────

  async saveReplayMeta(meta: ReplayMetaDocument): Promise<void> {
    try {
      await firestore().collection('replays').doc(meta.replayId).set(meta);
    } catch (e) {
      console.warn('[FirestoreService] saveReplayMeta error:', e);
    }
  }

  async getReplayMeta(replayId: string): Promise<ReplayMetaDocument | null> {
    try {
      const snap = await firestore().collection('replays').doc(replayId).get();
      if (!snap.exists) return null;
      return snap.data() as ReplayMetaDocument;
    } catch (e) {
      console.warn('[FirestoreService] getReplayMeta error:', e);
      return null;
    }
  }
}

export const firestoreService = new FirestoreService();
