/**
 * LeaderboardService — stub
 *
 * Leaderboard read/write via Cloud Functions only — never writes directly
 * to Firestore leaderboard collections.
 * Full implementation: see Requirement 16.5 and design.md §Social Features.
 *
 * This stub exports a class with the full public interface so that the
 * DI context in Providers.tsx can be properly typed.
 */

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  rank: number;
}

export class LeaderboardService {
  async submitScore(_challengeNumber: number, _score: number): Promise<void> { /* stub */ }
  async getTopScores(_challengeNumber: number, _limit: number): Promise<LeaderboardEntry[]> {
    return [];
  }
  async getFriendScores(_challengeNumber: number): Promise<LeaderboardEntry[]> { return []; }
  async getPlayerRank(_challengeNumber: number, _userId: string): Promise<number | null> {
    return null;
  }
}
