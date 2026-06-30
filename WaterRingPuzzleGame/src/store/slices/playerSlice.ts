/**
 * playerSlice.ts
 * Zustand slice for player profile, XP, level, and prestige data.
 *
 * Persists to MMKV key: 'player_slice'
 * Requirements: 17.1, 18.1, 18.2
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';

/** MMKV key used to persist this slice. */
export const PLAYER_SLICE_MMKV_KEY = 'player_slice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Player rank tiers — based on challenge number milestones.
 * Ripple (challenges 1–49) → Leviathan (2000+)
 */
export type PlayerRank =
  | 'Ripple'
  | 'Current'
  | 'Wave'
  | 'Tide'
  | 'Surge'
  | 'Tempest'
  | 'Maelstrom'
  | 'Leviathan';

export interface PlayerProfile {
  /** Firebase Auth UID. */
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
}

export interface PlayerStateFields extends PlayerProfile {
  xp: number;
  level: number;
  /**
   * Number of prestige resets completed. State field named `prestige`;
   * the corresponding action that triggers a prestige is `applyPrestige`
   * to avoid TypeScript identifier collision on the combined slice type.
   */
  prestige: number;
  rank: PlayerRank;
  totalStars: number;
  /** Completionist percentage 0–100. */
  completionScorePercent: number;
}

export interface PlayerActions {
  /**
   * Overwrite profile fields (partial update).
   * Does not modify XP, level, prestige, rank, totalStars, or
   * completionScorePercent.
   */
  updateProfile: (fields: Partial<PlayerProfile>) => void;

  /**
   * Add XP to the player total.
   *
   * NOTE: Does NOT auto-apply a level-up. Callers should check whether
   * a level-up threshold is reached and dispatch `levelUp` separately.
   * (Requirement: "addXP should check for level-up but NOT auto-apply it")
   */
  addXP: (amount: number) => void;

  /**
   * Increment level by 1 and update rank accordingly.
   * Dispatch after confirming XP threshold from XPSystem.
   */
  levelUp: () => void;

  /**
   * Trigger a prestige reset: increment the prestige counter and reset
   * level to 1 (rank resets to Ripple). XP is preserved.
   *
   * Named `applyPrestige` on the slice type to avoid a TypeScript
   * identifier collision with the `prestige: number` state field.
   * Consumers that want the spec-exact `prestige` name should destructure
   * `applyPrestige as prestige` at the call site.
   */
  applyPrestige: () => void;
}

/** Combined Zustand store type for the player slice. */
export type PlayerSlice = PlayerStateFields & PlayerActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive PlayerRank from level. Used as a proxy for challenge number until
 * the challenge slice provides `highestChallengeNumber`.
 */
export const rankFromLevel = (level: number): PlayerRank => {
  if (level < 50) return 'Ripple';
  if (level < 150) return 'Current';
  if (level < 300) return 'Wave';
  if (level < 500) return 'Tide';
  if (level < 800) return 'Surge';
  if (level < 1200) return 'Tempest';
  if (level < 2000) return 'Maelstrom';
  return 'Leviathan';
};

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: PlayerStateFields = {
  userId: '',
  username: '',
  displayName: '',
  avatarUrl: null,
  country: '',
  xp: 0,
  level: 1,
  prestige: 0,
  rank: 'Ripple',
  totalStars: 0,
  completionScorePercent: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlayerStore = create<PlayerSlice>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      updateProfile: (fields: Partial<PlayerProfile>): void => {
        set((state) => ({ ...state, ...fields }));
      },

      addXP: (amount: number): void => {
        if (amount <= 0) return;
        set((state) => ({ xp: state.xp + amount }));
        // Level-up is intentionally NOT applied here. Caller owns that logic.
      },

      levelUp: (): void => {
        set((state) => {
          const newLevel = state.level + 1;
          return {
            level: newLevel,
            rank: rankFromLevel(newLevel),
          };
        });
      },

      applyPrestige: (): void => {
        set((state) => ({
          prestige: state.prestige + 1,
          level: 1,
          rank: 'Ripple' as PlayerRank,
        }));
      },
    }),
    {
      name: PLAYER_SLICE_MMKV_KEY,
      storage: createJSONStorage(() => createSliceMMKVStorage(PLAYER_SLICE_MMKV_KEY)),
      // Exclude action functions from serialization.
      partialize: (state): PlayerStateFields => ({
        userId: state.userId,
        username: state.username,
        displayName: state.displayName,
        avatarUrl: state.avatarUrl,
        country: state.country,
        xp: state.xp,
        level: state.level,
        prestige: state.prestige,
        rank: state.rank,
        totalStars: state.totalStars,
        completionScorePercent: state.completionScorePercent,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors (Requirement 17.8 — read only the specific field needed)
// ---------------------------------------------------------------------------

/** Select player level (granular). */
export const selectPlayerLevel = (state: PlayerSlice): number => state.level;

/** Select player XP total (granular). */
export const selectPlayerXP = (state: PlayerSlice): number => state.xp;

/** Select prestige count (granular). */
export const selectPrestige = (state: PlayerSlice): number => state.prestige;

/** Select player rank (granular). */
export const selectPlayerRank = (state: PlayerSlice): PlayerRank => state.rank;

/** Select total stars (granular). */
export const selectTotalStars = (state: PlayerSlice): number => state.totalStars;

/** Select completion score percentage (granular). */
export const selectCompletionScorePercent = (state: PlayerSlice): number =>
  state.completionScorePercent;

/** Select the full profile sub-object (userId, username, displayName, avatarUrl, country). */
export const selectPlayerProfile = (state: PlayerSlice): PlayerProfile => ({
  userId: state.userId,
  username: state.username,
  displayName: state.displayName,
  avatarUrl: state.avatarUrl,
  country: state.country,
});
