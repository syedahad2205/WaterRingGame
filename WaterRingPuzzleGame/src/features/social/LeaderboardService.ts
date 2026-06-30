/**
 * LeaderboardService — full implementation (Epic 14)
 *
 * All leaderboard reads/writes go through Cloud Functions — never writes
 * directly to Firestore leaderboard collections from the client.
 */

import functions from '@react-native-firebase/functions';
import CryptoJS from 'crypto-js';
import type { LeaderboardEntry } from '../../types/social';

// Re-export for consumers who import from this module
export type { LeaderboardEntry };

export type LeaderboardScope = 'global' | 'country' | 'friends';
export type LeaderboardTimeFilter = 'today' | 'week' | 'allTime';

export interface ScoreSubmission {
  challengeNumber: number;
  score: number;
  completionTimeMs: number;
  starsEarned: 1 | 2 | 3;
  continuesUsed: number;
  replayId?: string;
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  /** Player's own rank entry, pinned separately (null if not on board). */
  selfEntry: LeaderboardEntry | null;
  totalCount: number;
  fetchedAt: number;
}

// ---------------------------------------------------------------------------
// LeaderboardService
// ---------------------------------------------------------------------------

export class LeaderboardService {
  private cache: Map<string, { page: LeaderboardPage; expiresAt: number }> = new Map();
  readonly CACHE_TTL_MS = 60_000; // 1 minute

  // -------------------------------------------------------------------------
  // submitScore
  // -------------------------------------------------------------------------

  async submitScore(
    userId: string,
    submission: ScoreSubmission,
    hmacSalt: string,
  ): Promise<{ rank: number }> {
    const { challengeNumber, score, completionTimeMs, starsEarned, continuesUsed, replayId } =
      submission;

    const hmacSignature = this.buildScoreSignature(userId, challengeNumber, score, hmacSalt);

    const callable = functions().httpsCallable('submitScore');
    const result = await callable({
      challengeNumber,
      score,
      completionTimeMs,
      starsEarned,
      continuesUsed,
      ...(replayId ? { replayId } : {}),
      hmacSignature,
    });

    const data = result.data as { success: boolean; rank: number };
    if (!data.success) {
      throw new Error('submitScore cloud function returned failure');
    }

    // Invalidate cache so next fetch is fresh
    this.invalidateCache(challengeNumber);

    return { rank: data.rank };
  }

  // -------------------------------------------------------------------------
  // getLeaderboard
  // -------------------------------------------------------------------------

  async getLeaderboard(
    scope: LeaderboardScope,
    challengeNumber: number,
    timeFilter: LeaderboardTimeFilter,
    userId: string,
    limit = 50,
  ): Promise<LeaderboardPage> {
    const cacheKey = `${scope}:${challengeNumber}:${timeFilter}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.page;
    }

    const callable = functions().httpsCallable('getLeaderboard');
    const result = await callable({ challengeNumber, scope, timeFilter, limit });

    const data = result.data as {
      entries: LeaderboardEntry[];
      totalCount: number;
    };

    // Find the caller's own entry in the result set
    const selfEntry = data.entries.find((e) => e.userId === userId) ?? null;

    const page: LeaderboardPage = {
      entries: data.entries,
      selfEntry,
      totalCount: data.totalCount,
      fetchedAt: Date.now(),
    };

    this.cache.set(cacheKey, { page, expiresAt: Date.now() + this.CACHE_TTL_MS });

    return page;
  }

  // -------------------------------------------------------------------------
  // invalidateCache
  // -------------------------------------------------------------------------

  invalidateCache(challengeNumber: number): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${challengeNumber}:`)) {
        this.cache.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // buildScoreSignature (private)
  // -------------------------------------------------------------------------

  private buildScoreSignature(
    userId: string,
    challengeNumber: number,
    score: number,
    salt: string,
  ): string {
    const payload = `${userId}:${challengeNumber}:${score}`;
    return CryptoJS.HmacSHA256(payload, salt).toString();
  }

  // ── Alias methods for interface-contract tests ────────────────────────────

  /** Alias: fetch top scores for a challenge (delegates to getLeaderboard). */
  getTopScores(challengeNumber: number, limit = 50): Promise<LeaderboardPage> {
    return this.getLeaderboard('global', challengeNumber, 'allTime', '', limit);
  }

  /** Alias: fetch friend scores for a challenge. */
  getFriendScores(challengeNumber: number, userId: string, limit = 50): Promise<LeaderboardPage> {
    return this.getLeaderboard('friends', challengeNumber, 'allTime', userId, limit);
  }

  /** Alias: get a player's rank for a challenge. */
  async getPlayerRank(challengeNumber: number, userId: string): Promise<number | null> {
    const page = await this.getLeaderboard('global', challengeNumber, 'allTime', userId, 100);
    return page.selfEntry?.rank ?? null;
  }
}

export const leaderboardService = new LeaderboardService();
