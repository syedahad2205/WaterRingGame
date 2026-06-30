/**
 * Social feature types — shared across socialSlice and social feature services.
 * Placed in src/types/ per Requirement 2.6 (types used by 3+ features go here).
 */

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  rank: number;
  completionTimeMs: number;
  challengeNumber: number;
  timestamp: number;
}

export type SocialNotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'challenge_beaten'
  | 'ghost_unlocked'
  | 'leaderboard_rank_change';

export interface SocialNotification {
  id: string;
  type: SocialNotificationType;
  fromUserId: string;
  fromDisplayName: string;
  challengeNumber?: number;
  timestamp: number;
  read: boolean;
}
