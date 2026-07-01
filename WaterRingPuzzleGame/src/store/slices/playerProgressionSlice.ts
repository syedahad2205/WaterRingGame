/**
 * playerProgressionSlice.ts
 * Zustand slice persisting streak, daily rewards, missions, and lifetime stats.
 *
 * Uses MMKV persistence via the same pattern as economySlice.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
import type { Mission } from '../../features/progression/MissionService';

/** MMKV key used to persist this slice. */
export const PLAYER_PROGRESSION_MMKV_KEY = 'player_progression_slice';

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface PlayerProgressionState {
  // Streak
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalLoginDays: number;

  // Daily rewards
  lastDailyClaimDate: string | null;
  dailyRewardsClaimed: number;

  // Missions
  dailyMissions: Mission[];
  weeklyMissions: Mission[];
  lastDailyMissionDate: string | null;
  lastWeeklyMissionWeek: number | null;

  // Lifetime stats
  lifetimeCoinsEarned: number;
  lifetimeRingsLanded: number;
  lifetimePerfectPlacements: number;
  lifetimeCombos: number;
  lifetimeGamesPlayed: number;
  lifetimePlayTimeMinutes: number;
  bestCombo: number;
  perfectGames: number;
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

export interface PlayerProgressionActions {
  // Streak
  setStreak: (streak: number) => void;
  setLongestStreak: (longest: number) => void;
  setLastLoginDate: (date: string | null) => void;
  setTotalLoginDays: (total: number) => void;
  updateStreakState: (state: {
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string | null;
    totalLoginDays: number;
  }) => void;

  // Daily rewards
  setLastDailyClaimDate: (date: string | null) => void;
  incrementDailyRewardsClaimed: () => void;

  // Missions
  setDailyMissions: (missions: Mission[]) => void;
  setWeeklyMissions: (missions: Mission[]) => void;
  setLastDailyMissionDate: (date: string | null) => void;
  setLastWeeklyMissionWeek: (week: number | null) => void;

  // Lifetime stats
  incrementLifetimeCoinsEarned: (amount: number) => void;
  incrementLifetimeRingsLanded: (amount: number) => void;
  incrementLifetimePerfectPlacements: (amount: number) => void;
  incrementLifetimeCombos: (amount: number) => void;
  incrementLifetimeGamesPlayed: () => void;
  incrementLifetimePlayTimeMinutes: (minutes: number) => void;
  setBestCombo: (combo: number) => void;
  incrementPerfectGames: () => void;

  /** Reset all progression state (e.g. for account reset). */
  resetProgression: () => void;
}

export type PlayerProgressionSlice = PlayerProgressionState & PlayerProgressionActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: PlayerProgressionState = {
  currentStreak: 0,
  longestStreak: 0,
  lastLoginDate: null,
  totalLoginDays: 0,

  lastDailyClaimDate: null,
  dailyRewardsClaimed: 0,

  dailyMissions: [],
  weeklyMissions: [],
  lastDailyMissionDate: null,
  lastWeeklyMissionWeek: null,

  lifetimeCoinsEarned: 0,
  lifetimeRingsLanded: 0,
  lifetimePerfectPlacements: 0,
  lifetimeCombos: 0,
  lifetimeGamesPlayed: 0,
  lifetimePlayTimeMinutes: 0,
  bestCombo: 0,
  perfectGames: 0,
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const usePlayerProgressionStore = create<PlayerProgressionSlice>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      // -- Streak --
      setStreak: (streak: number) => set({ currentStreak: streak }),
      setLongestStreak: (longest: number) => set({ longestStreak: longest }),
      setLastLoginDate: (date: string | null) => set({ lastLoginDate: date }),
      setTotalLoginDays: (total: number) => set({ totalLoginDays: total }),
      updateStreakState: (streakState) =>
        set({
          currentStreak: streakState.currentStreak,
          longestStreak: streakState.longestStreak,
          lastLoginDate: streakState.lastLoginDate,
          totalLoginDays: streakState.totalLoginDays,
        }),

      // -- Daily rewards --
      setLastDailyClaimDate: (date: string | null) => set({ lastDailyClaimDate: date }),
      incrementDailyRewardsClaimed: () =>
        set((state) => ({ dailyRewardsClaimed: state.dailyRewardsClaimed + 1 })),

      // -- Missions --
      setDailyMissions: (missions: Mission[]) => set({ dailyMissions: missions }),
      setWeeklyMissions: (missions: Mission[]) => set({ weeklyMissions: missions }),
      setLastDailyMissionDate: (date: string | null) => set({ lastDailyMissionDate: date }),
      setLastWeeklyMissionWeek: (week: number | null) => set({ lastWeeklyMissionWeek: week }),

      // -- Lifetime stats --
      // All increment methods guard against NaN/Infinity/negative amounts and
      // cap at Number.MAX_SAFE_INTEGER to prevent silent overflow corruption.
      incrementLifetimeCoinsEarned: (amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((state) => ({
          lifetimeCoinsEarned: Math.min(state.lifetimeCoinsEarned + amount, Number.MAX_SAFE_INTEGER),
        }));
      },
      incrementLifetimeRingsLanded: (amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((state) => ({
          lifetimeRingsLanded: Math.min(state.lifetimeRingsLanded + amount, Number.MAX_SAFE_INTEGER),
        }));
      },
      incrementLifetimePerfectPlacements: (amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((state) => ({
          lifetimePerfectPlacements: Math.min(state.lifetimePerfectPlacements + amount, Number.MAX_SAFE_INTEGER),
        }));
      },
      incrementLifetimeCombos: (amount: number) => {
        if (!Number.isFinite(amount) || amount <= 0) return;
        set((state) => ({
          lifetimeCombos: Math.min(state.lifetimeCombos + amount, Number.MAX_SAFE_INTEGER),
        }));
      },
      incrementLifetimeGamesPlayed: () =>
        set((state) => ({
          lifetimeGamesPlayed: Math.min(state.lifetimeGamesPlayed + 1, Number.MAX_SAFE_INTEGER),
        })),
      incrementLifetimePlayTimeMinutes: (minutes: number) => {
        if (!Number.isFinite(minutes) || minutes <= 0) return;
        set((state) => ({
          lifetimePlayTimeMinutes: Math.min(state.lifetimePlayTimeMinutes + minutes, Number.MAX_SAFE_INTEGER),
        }));
      },
      setBestCombo: (combo: number) =>
        set((state) => ({ bestCombo: Math.max(state.bestCombo, combo) })),
      incrementPerfectGames: () =>
        set((state) => ({ perfectGames: state.perfectGames + 1 })),

      // -- Reset --
      resetProgression: () => set(DEFAULT_STATE),
    }),
    {
      name: PLAYER_PROGRESSION_MMKV_KEY,
      storage: createJSONStorage(() => createSliceMMKVStorage(PLAYER_PROGRESSION_MMKV_KEY)),
      partialize: (state): PlayerProgressionState => ({
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastLoginDate: state.lastLoginDate,
        totalLoginDays: state.totalLoginDays,
        lastDailyClaimDate: state.lastDailyClaimDate,
        dailyRewardsClaimed: state.dailyRewardsClaimed,
        dailyMissions: state.dailyMissions,
        weeklyMissions: state.weeklyMissions,
        lastDailyMissionDate: state.lastDailyMissionDate,
        lastWeeklyMissionWeek: state.lastWeeklyMissionWeek,
        lifetimeCoinsEarned: state.lifetimeCoinsEarned,
        lifetimeRingsLanded: state.lifetimeRingsLanded,
        lifetimePerfectPlacements: state.lifetimePerfectPlacements,
        lifetimeCombos: state.lifetimeCombos,
        lifetimeGamesPlayed: state.lifetimeGamesPlayed,
        lifetimePlayTimeMinutes: state.lifetimePlayTimeMinutes,
        bestCombo: state.bestCombo,
        perfectGames: state.perfectGames,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors
// ---------------------------------------------------------------------------

export const selectCurrentStreak = (state: PlayerProgressionSlice): number => state.currentStreak;
export const selectLongestStreak = (state: PlayerProgressionSlice): number => state.longestStreak;
export const selectLastLoginDate = (state: PlayerProgressionSlice): string | null => state.lastLoginDate;
export const selectTotalLoginDays = (state: PlayerProgressionSlice): number => state.totalLoginDays;
export const selectLastDailyClaimDate = (state: PlayerProgressionSlice): string | null => state.lastDailyClaimDate;
export const selectDailyRewardsClaimed = (state: PlayerProgressionSlice): number => state.dailyRewardsClaimed;
export const selectDailyMissions = (state: PlayerProgressionSlice): Mission[] => state.dailyMissions;
export const selectWeeklyMissions = (state: PlayerProgressionSlice): Mission[] => state.weeklyMissions;
export const selectLifetimeCoinsEarned = (state: PlayerProgressionSlice): number => state.lifetimeCoinsEarned;
export const selectLifetimeRingsLanded = (state: PlayerProgressionSlice): number => state.lifetimeRingsLanded;
export const selectLifetimeGamesPlayed = (state: PlayerProgressionSlice): number => state.lifetimeGamesPlayed;
export const selectBestCombo = (state: PlayerProgressionSlice): number => state.bestCombo;
export const selectPerfectGames = (state: PlayerProgressionSlice): number => state.perfectGames;
