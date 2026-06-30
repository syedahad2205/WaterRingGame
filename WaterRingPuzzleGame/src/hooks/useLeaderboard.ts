/**
 * useLeaderboard
 *
 * Wraps the socialSlice leaderboard cache. Components use this hook to read
 * cached leaderboard data and check staleness without importing the store
 * directly.
 *
 * The hook subscribes only to the two cache maps so it does not re-render on
 * unrelated social state changes (Requirement 17.8).
 *
 * Requirements: 17.6, 17.8
 */

import { useCallback } from 'react';
import {
  useSocialStore,
  selectLeaderboardCache,
} from '../store/slices/socialSlice';

import type { LeaderboardEntry } from '../types/social';

/** Default TTL for stale-check: 60 seconds. */
const DEFAULT_TTL_MS = 60_000;

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseLeaderboardResult {
  /**
   * Return cached entries for a leaderboard, or an empty array if none exist.
   * @param leaderboardId  e.g. 'challenge_42_global'
   */
  getCachedLeaderboard: (leaderboardId: string) => LeaderboardEntry[];

  /**
   * Unix timestamp (ms) of the last successful fetch, or null if never fetched.
   * @param leaderboardId
   */
  lastFetchTime: (leaderboardId: string) => number | null;

  /**
   * Write a fresh set of entries into the cache and update the fetch timestamp.
   * @param leaderboardId
   * @param entries
   */
  cacheLeaderboard: (leaderboardId: string, entries: LeaderboardEntry[]) => void;

  /**
   * Returns true if the cached data is older than `ttlMs` (default 60 s),
   * or if there is no cached data at all.
   * @param leaderboardId
   * @param ttlMs  Optional override for the staleness threshold in milliseconds.
   */
  isStale: (leaderboardId: string, ttlMs?: number) => boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLeaderboard(): UseLeaderboardResult {
  // Subscribe to both cache maps together — they are always updated in the
  // same cacheLeaderboard action so a single selector covering both is fine.
  const leaderboardCache = useSocialStore(selectLeaderboardCache);
  // lastLeaderboardFetch lives on the same store; select it inline.
  const lastLeaderboardFetch = useSocialStore(
    (state) => state.lastLeaderboardFetch,
  );

  const getCachedLeaderboard = useCallback(
    (leaderboardId: string): LeaderboardEntry[] => {
      return leaderboardCache[leaderboardId] ?? [];
    },
    [leaderboardCache],
  );

  const lastFetchTime = useCallback(
    (leaderboardId: string): number | null => {
      const ts = lastLeaderboardFetch[leaderboardId];
      return ts !== undefined ? ts : null;
    },
    [lastLeaderboardFetch],
  );

  const cacheLeaderboard = useCallback(
    (leaderboardId: string, entries: LeaderboardEntry[]): void => {
      useSocialStore.getState().cacheLeaderboard(leaderboardId, entries);
    },
    [],
  );

  const isStale = useCallback(
    (leaderboardId: string, ttlMs: number = DEFAULT_TTL_MS): boolean => {
      const ts = lastLeaderboardFetch[leaderboardId];
      if (ts === undefined) return true;
      return Date.now() - ts > ttlMs;
    },
    [lastLeaderboardFetch],
  );

  return {
    getCachedLeaderboard,
    lastFetchTime,
    cacheLeaderboard,
    isStale,
  };
}
