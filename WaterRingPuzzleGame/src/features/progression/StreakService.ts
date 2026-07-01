/**
 * StreakService.ts
 * Manages login streak tracking and milestone rewards.
 *
 * A streak increments when the player logs in on consecutive calendar days.
 * If a day is missed the streak resets to 1. Logging in multiple times on
 * the same day does not change the streak.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null; // ISO date string (YYYY-MM-DD or full ISO)
  totalLoginDays: number;
}

export interface MilestoneReward {
  streak: number;
  coins: number;
  themeUnlock?: string; // theme ID to unlock, if any
  label: string;
}

// ---------------------------------------------------------------------------
// Milestone definitions
// ---------------------------------------------------------------------------

const MILESTONES: MilestoneReward[] = [
  { streak: 7, coins: 500, label: '7-Day Streak Bonus' },
  { streak: 14, coins: 1000, label: '14-Day Streak Bonus' },
  { streak: 30, coins: 2500, themeUnlock: 'streak_master_theme', label: '30-Day Streak Bonus + Theme' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the calendar date string (YYYY-MM-DD) from a Date, using UTC.
 *
 * IMPORTANT: Uses UTC to prevent timezone changes between sessions from
 * causing double-counts or false streak breaks. A player who changes their
 * device timezone (e.g. +12 to -12) would previously get a different
 * "today" string, which could either break a valid streak or grant two
 * logins in a single real day.
 */
function toDateKey(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a date string and return its midnight Date in UTC.
 * If the date string is invalid, returns epoch (1970-01-01) to force a
 * streak reset rather than silently producing NaN-based comparisons.
 */
function dateMidnight(isoDate: string): Date {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) {
    return new Date(0);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Get today's midnight in UTC.
 */
function todayMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Check and update the streak based on the current date.
 *
 * Rules:
 *  - If lastLoginDate is today, no change (already counted).
 *  - If lastLoginDate was yesterday, increment streak.
 *  - If lastLoginDate is older than yesterday (or null), reset streak to 1.
 *
 * Always updates lastLoginDate to today and increments totalLoginDays when
 * a new day is recorded.
 *
 * @param state  The current StreakState.
 * @returns A new StreakState with updated values (immutable update).
 */
export function checkAndUpdateStreak(state: StreakState): StreakState {
  const today = todayMidnight();
  const todayKey = toDateKey(today);

  // Already logged in today — no changes.
  if (state.lastLoginDate !== null) {
    const lastKey = toDateKey(dateMidnight(state.lastLoginDate));
    if (lastKey === todayKey) {
      return state;
    }
  }

  // Determine whether last login was yesterday.
  let newStreak = 1;
  if (state.lastLoginDate !== null) {
    const lastMidnight = dateMidnight(state.lastLoginDate);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastMidnight.getTime() === yesterday.getTime()) {
      // Consecutive day — extend the streak.
      newStreak = state.currentStreak + 1;
    }
    // Otherwise streak resets to 1 (handled by default).
  }

  const newLongest = Math.max(state.longestStreak, newStreak);

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastLoginDate: todayKey,
    totalLoginDays: state.totalLoginDays + 1,
  };
}

/**
 * Get the milestone reward for the given streak count, if one exists.
 *
 * Milestones fire exactly when the streak reaches the threshold value
 * (7, 14, 30). Returns null if the streak is not a milestone boundary.
 */
export function getMilestoneReward(streak: number): MilestoneReward | null {
  return MILESTONES.find((m) => m.streak === streak) ?? null;
}
