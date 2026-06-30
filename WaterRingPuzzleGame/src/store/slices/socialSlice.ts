/**
 * socialSlice — owns friends list, leaderboard cache, ghost cache, and
 * pending challenge notifications.
 *
 * Requirements: 17.6, 18.1, 18.2
 * Persists to MMKV key: 'social_slice'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
import type { LeaderboardEntry, SocialNotification } from '../../types/social';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SocialState {
  /** List of friend user IDs. */
  friendIds: string[];
  /**
   * Cached leaderboard entries keyed by a leaderboard identifier
   * (e.g. 'challenge_42_global', 'challenge_42_friends').
   */
  leaderboardCache: Record<string, LeaderboardEntry[]>;
  /**
   * Cached ghost replay references keyed by a composite key
   * (e.g. 'userId_challengeNumber').
   * Value is the Firebase Storage path for the ghost replay.
   */
  ghostCache: Record<string, string>;
  /** Unread social notifications pending display. */
  pendingNotifications: SocialNotification[];
  /**
   * Timestamps of the last successful leaderboard fetch per leaderboard ID.
   * Used to show "Last updated [time]" when offline (Requirement 20.2).
   */
  lastLeaderboardFetch: Record<string, number>;
}

export interface SocialActions {
  addFriend: (userId: string) => void;
  removeFriend: (userId: string) => void;
  cacheLeaderboard: (leaderboardId: string, entries: LeaderboardEntry[]) => void;
  cacheGhost: (ghostKey: string, storagePath: string) => void;
  addNotification: (notification: SocialNotification) => void;
  clearNotification: (notificationId: string) => void;
}

export type SocialStore = SocialState & SocialActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultSocialState: SocialState = {
  friendIds: [],
  leaderboardCache: {},
  ghostCache: {},
  pendingNotifications: [],
  lastLeaderboardFetch: {},
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSocialStore = create<SocialStore>()(
  persist(
    // eslint-disable-next-line max-lines-per-function
    (set) => ({
      ...defaultSocialState,

      addFriend: (userId: string): void =>
        set((state) => {
          if (state.friendIds.includes(userId)) {
            return state;
          }
          return { friendIds: [...state.friendIds, userId] };
        }),

      removeFriend: (userId: string): void =>
        set((state) => ({
          friendIds: state.friendIds.filter((id) => id !== userId),
        })),

      cacheLeaderboard: (leaderboardId: string, entries: LeaderboardEntry[]): void =>
        set((state) => ({
          leaderboardCache: {
            ...state.leaderboardCache,
            [leaderboardId]: entries,
          },
          lastLeaderboardFetch: {
            ...state.lastLeaderboardFetch,
            [leaderboardId]: Date.now(),
          },
        })),

      cacheGhost: (ghostKey: string, storagePath: string): void =>
        set((state) => ({
          ghostCache: {
            ...state.ghostCache,
            [ghostKey]: storagePath,
          },
        })),

      addNotification: (notification: SocialNotification): void =>
        set((state) => ({
          pendingNotifications: [...state.pendingNotifications, notification],
        })),

      clearNotification: (notificationId: string): void =>
        set((state) => ({
          pendingNotifications: state.pendingNotifications.filter(
            (n) => n.id !== notificationId,
          ),
        })),
    }),
    {
      name: 'social_slice',
      storage: createJSONStorage(() => createSliceMMKVStorage('social_slice')),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors — Requirement 17.8
// ---------------------------------------------------------------------------

export const selectFriendIds = (state: SocialStore): string[] => state.friendIds;

export const selectLeaderboardCache = (
  state: SocialStore,
): Record<string, LeaderboardEntry[]> => state.leaderboardCache;

export const selectCachedLeaderboard =
  (leaderboardId: string) =>
  (state: SocialStore): LeaderboardEntry[] | undefined =>
    state.leaderboardCache[leaderboardId];

export const selectGhostCache = (state: SocialStore): Record<string, string> =>
  state.ghostCache;

export const selectCachedGhost =
  (ghostKey: string) =>
  (state: SocialStore): string | undefined =>
    state.ghostCache[ghostKey];

export const selectPendingNotifications = (
  state: SocialStore,
): SocialNotification[] => state.pendingNotifications;

export const selectLastLeaderboardFetch =
  (leaderboardId: string) =>
  (state: SocialStore): number | undefined =>
    state.lastLeaderboardFetch[leaderboardId];
