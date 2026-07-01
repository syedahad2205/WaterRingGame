/**
 * DailyRewardService.ts
 * Manages the 7-day rotating daily reward calendar.
 *
 * Players earn escalating rewards for consecutive daily logins.
 * Premium players receive 2x amounts on premium-flagged reward days.
 */

import { useEconomyStore } from '../../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DailyReward {
  day: number; // 1-7 for weekly cycle
  type: 'coins' | 'gems' | 'theme_unlock' | 'ring_unlock';
  amount: number;
  label: string;
  isPremium: boolean; // premium players get 2x
}

// ---------------------------------------------------------------------------
// Reward calendar (7-day cycle)
// ---------------------------------------------------------------------------

export const DAILY_REWARDS: DailyReward[] = [
  { day: 1, type: 'coins', amount: 100, label: '100 Coins', isPremium: false },
  { day: 2, type: 'coins', amount: 150, label: '150 Coins', isPremium: false },
  { day: 3, type: 'gems', amount: 10, label: '10 Gems', isPremium: false },
  { day: 4, type: 'coins', amount: 250, label: '250 Coins', isPremium: false },
  { day: 5, type: 'coins', amount: 300, label: '300 Coins', isPremium: false },
  { day: 6, type: 'gems', amount: 25, label: '25 Gems', isPremium: false },
  { day: 7, type: 'coins', amount: 500, label: '500 Coins + Bonus', isPremium: true },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the start of today (midnight) as a Date, using UTC.
 * UTC prevents timezone-change exploits where a player changes their device
 * clock or timezone to claim the daily reward multiple times in one real day.
 */
function todayMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Parse an ISO date string and return its midnight Date in UTC.
 * Returns epoch on invalid input to prevent NaN-based comparisons from
 * bypassing the claim guard.
 */
function dateMidnight(isoDate: string): Date {
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) {
    return new Date(0);
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Returns the 1-7 cycle position for a given streak count.
 * Streak 0 maps to day 1 (first claim).
 */
export function getCurrentDay(streak: number): number {
  if (streak <= 0) return 1;
  return ((streak - 1) % 7) + 1;
}

/**
 * Check whether the player can claim today's reward.
 *
 * Returns true when:
 *  - lastClaimDate is null (never claimed), or
 *  - lastClaimDate is before today (at least one calendar day has passed).
 */
export function canClaimToday(lastClaimDate: string | null): boolean {
  if (lastClaimDate === null) return true;
  const lastMidnight = dateMidnight(lastClaimDate);
  const today = todayMidnight();
  return lastMidnight.getTime() < today.getTime();
}

/**
 * Claim the daily reward for the current streak position.
 *
 * Credits the reward to the economy store and returns the DailyReward that
 * was awarded. Coins are credited via `creditCoins`; gem rewards also use
 * `creditCoins` with a distinguishing source label (a dedicated gem balance
 * can be wired up later without changing this API).
 *
 * @param currentStreak  The player's current login streak (1-based after update).
 * @param isPremiumPlayer  Whether the player has a premium subscription (2x on premium days).
 * @returns The DailyReward that was claimed.
 */
export function claimDailyReward(
  currentStreak: number,
  isPremiumPlayer: boolean = false,
): DailyReward {
  const day = getCurrentDay(currentStreak);
  const reward = DAILY_REWARDS[day - 1];

  const multiplier = isPremiumPlayer && reward.isPremium ? 2 : 1;
  const finalAmount = reward.amount * multiplier;

  const { creditCoins } = useEconomyStore.getState();

  const source =
    reward.type === 'coins'
      ? `daily_reward_day_${day}`
      : `daily_reward_${reward.type}_day_${day}`;

  creditCoins(finalAmount, source);

  return { ...reward, amount: finalAmount };
}

/**
 * Get the next 7 upcoming rewards starting from the given streak position.
 *
 * @param streak  Current streak count (0 means the player has not yet claimed day 1).
 * @returns Array of 7 DailyReward objects in upcoming order.
 */
export function getUpcomingRewards(streak: number): DailyReward[] {
  const currentDay = getCurrentDay(streak + 1); // next claim day
  const rewards: DailyReward[] = [];
  for (let i = 0; i < 7; i++) {
    const dayIndex = ((currentDay - 1 + i) % 7);
    rewards.push(DAILY_REWARDS[dayIndex]);
  }
  return rewards;
}
