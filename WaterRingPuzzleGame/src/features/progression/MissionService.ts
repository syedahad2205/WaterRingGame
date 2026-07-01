/**
 * MissionService.ts
 * Generates, tracks, and rewards daily and weekly missions.
 *
 * Daily missions: 3 randomly selected each calendar day (date-seeded).
 * Weekly missions: 5 randomly selected each week (week-number-seeded).
 */

import { useEconomyStore } from '../../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MissionType = 'daily' | 'weekly';
export type MissionCategory = 'gameplay' | 'collection' | 'social' | 'economy';

export interface Mission {
  id: string;
  type: MissionType;
  category: MissionCategory;
  title: string;
  description: string;
  iconName: string;
  target: number;
  progress: number;
  reward: { type: 'coins' | 'gems' | 'xp'; amount: number };
  isCompleted: boolean;
  isClaimed: boolean;
}

// ---------------------------------------------------------------------------
// Daily mission templates (3 active per day)
// ---------------------------------------------------------------------------

export const DAILY_MISSION_TEMPLATES: Omit<Mission, 'id' | 'progress' | 'isCompleted' | 'isClaimed'>[] = [
  { type: 'daily', category: 'gameplay', title: 'Ring Master', description: 'Land 10 rings on pegs', iconName: 'ring', target: 10, reward: { type: 'coins', amount: 100 } },
  { type: 'daily', category: 'gameplay', title: 'Perfect Play', description: 'Get 3 perfect placements', iconName: 'star', target: 3, reward: { type: 'coins', amount: 150 } },
  { type: 'daily', category: 'gameplay', title: 'Challenger', description: 'Complete 3 challenges', iconName: 'target', target: 3, reward: { type: 'coins', amount: 200 } },
  { type: 'daily', category: 'gameplay', title: 'Star Collector', description: 'Earn 6 stars', iconName: 'star', target: 6, reward: { type: 'coins', amount: 120 } },
  { type: 'daily', category: 'gameplay', title: 'Combo King', description: 'Get a 3x combo', iconName: 'flame', target: 1, reward: { type: 'gems', amount: 5 } },
  { type: 'daily', category: 'economy', title: 'Big Spender', description: 'Spend 200 coins', iconName: 'coin', target: 200, reward: { type: 'coins', amount: 100 } },
  { type: 'daily', category: 'gameplay', title: 'Speed Runner', description: 'Complete a challenge under 30s', iconName: 'timer', target: 1, reward: { type: 'gems', amount: 10 } },
  { type: 'daily', category: 'gameplay', title: 'No Mistakes', description: 'Complete without wall collision', iconName: 'shield', target: 1, reward: { type: 'coins', amount: 200 } },
];

// ---------------------------------------------------------------------------
// Weekly mission templates (5 active per week)
// ---------------------------------------------------------------------------

export const WEEKLY_MISSION_TEMPLATES: Omit<Mission, 'id' | 'progress' | 'isCompleted' | 'isClaimed'>[] = [
  { type: 'weekly', category: 'gameplay', title: 'Weekly Warrior', description: 'Complete 15 challenges', iconName: 'trophy', target: 15, reward: { type: 'coins', amount: 500 } },
  { type: 'weekly', category: 'gameplay', title: 'Star Hunter', description: 'Earn 30 stars', iconName: 'star', target: 30, reward: { type: 'gems', amount: 25 } },
  { type: 'weekly', category: 'gameplay', title: 'Perfect Week', description: 'Get 10 perfect placements', iconName: 'crown', target: 10, reward: { type: 'coins', amount: 750 } },
  { type: 'weekly', category: 'collection', title: 'Theme Explorer', description: 'Play with 5 different themes', iconName: 'collection', target: 5, reward: { type: 'gems', amount: 15 } },
  { type: 'weekly', category: 'gameplay', title: 'Endurance', description: 'Play 30 minutes total', iconName: 'timer', target: 30, reward: { type: 'coins', amount: 1000 } },
  { type: 'weekly', category: 'gameplay', title: 'Combo Master', description: 'Get 20 combos', iconName: 'flame', target: 20, reward: { type: 'coins', amount: 600 } },
];

// ---------------------------------------------------------------------------
// Seeded random — deterministic selection per day/week
// ---------------------------------------------------------------------------

/**
 * Simple seeded PRNG (Mulberry32).
 * Returns a function that yields [0, 1) on each call.
 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick `count` unique random indices from an array using a seeded PRNG.
 */
function pickRandom<T>(items: T[], count: number, seed: number): T[] {
  const rng = seededRandom(seed);
  const pool = [...items];
  const result: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

/**
 * Convert a date string (YYYY-MM-DD) to a numeric seed.
 */
function dateSeed(dateString: string): number {
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    hash = (hash * 31 + dateString.charCodeAt(i)) | 0;
  }
  return hash;
}

// ---------------------------------------------------------------------------
// Service methods
// ---------------------------------------------------------------------------

/**
 * Generate 3 daily missions for the given date.
 * The same date always produces the same set of missions (deterministic).
 *
 * @param dateString  ISO date string (YYYY-MM-DD) used as seed.
 * @returns Array of 3 Mission objects with progress initialized to 0.
 */
export function generateDailyMissions(dateString: string): Mission[] {
  // Guard: if dateString is empty or not a valid YYYY-MM-DD format, fall back
  // to today's UTC date to prevent a zero-seed (which would always select the
  // same missions) and to prevent invalid mission IDs.
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString).getTime());
  const safeDateString = validDate ? dateString : new Date().toISOString().slice(0, 10);
  const seed = dateSeed(safeDateString);
  const selected = pickRandom(DAILY_MISSION_TEMPLATES, 3, seed);
  return selected.map((template, index) => ({
    ...template,
    id: `daily_${safeDateString}_${index}`,
    progress: 0,
    isCompleted: false,
    isClaimed: false,
  }));
}

/**
 * Generate 5 weekly missions for the given week number.
 *
 * @param weekNumber  ISO week number (1-53) used as seed.
 * @returns Array of 5 Mission objects with progress initialized to 0.
 */
export function generateWeeklyMissions(weekNumber: number): Mission[] {
  const seed = weekNumber * 7919; // prime multiplier for better distribution
  const selected = pickRandom(WEEKLY_MISSION_TEMPLATES, 5, seed);
  return selected.map((template, index) => ({
    ...template,
    id: `weekly_w${weekNumber}_${index}`,
    progress: 0,
    isCompleted: false,
    isClaimed: false,
  }));
}

/**
 * Update progress on all missions that match the given event type.
 *
 * Event types map to mission titles/categories. The mapping:
 *  - 'ring_landed' -> Ring Master
 *  - 'perfect_placement' -> Perfect Play, Perfect Week
 *  - 'challenge_complete' -> Challenger, Weekly Warrior
 *  - 'star_earned' -> Star Collector, Star Hunter
 *  - 'combo' -> Combo King, Combo Master
 *  - 'coins_spent' -> Big Spender
 *  - 'speed_complete' -> Speed Runner
 *  - 'no_collision_complete' -> No Mistakes
 *  - 'theme_used' -> Theme Explorer
 *  - 'play_time_minute' -> Endurance
 *
 * @param missions  Current mission array.
 * @param eventType  The gameplay event type.
 * @param amount  How much to increment progress by.
 * @returns New array of missions with updated progress and completion flags.
 */
export function updateProgress(
  missions: Mission[],
  eventType: string,
  amount: number,
): Mission[] {
  // Guard: reject non-finite, negative, or zero amounts to prevent progress
  // decrement or NaN corruption. Also short-circuit on empty mission arrays.
  if (!Number.isFinite(amount) || amount <= 0 || missions.length === 0) {
    return missions;
  }

  const EVENT_TO_TITLES: Record<string, string[]> = {
    ring_landed: ['Ring Master'],
    perfect_placement: ['Perfect Play', 'Perfect Week'],
    challenge_complete: ['Challenger', 'Weekly Warrior'],
    star_earned: ['Star Collector', 'Star Hunter'],
    combo: ['Combo King', 'Combo Master'],
    coins_spent: ['Big Spender'],
    speed_complete: ['Speed Runner'],
    no_collision_complete: ['No Mistakes'],
    theme_used: ['Theme Explorer'],
    play_time_minute: ['Endurance'],
  };

  const matchingTitles = EVENT_TO_TITLES[eventType] ?? [];
  if (matchingTitles.length === 0) return missions;

  return missions.map((mission) => {
    if (mission.isClaimed || !matchingTitles.includes(mission.title)) {
      return mission;
    }

    const newProgress = Math.min(mission.progress + amount, mission.target);
    const isCompleted = newProgress >= mission.target;

    if (newProgress === mission.progress) return mission;

    return {
      ...mission,
      progress: newProgress,
      isCompleted,
    };
  });
}

/**
 * Claim the reward for a completed mission.
 * Credits the reward via the economy store and marks the mission as claimed.
 *
 * @param mission  The mission to claim (must be completed and not yet claimed).
 * @returns The updated mission with isClaimed set to true, or the same mission if not claimable.
 */
export function claimReward(mission: Mission): Mission {
  if (!mission.isCompleted || mission.isClaimed) {
    return mission;
  }

  const { creditCoins } = useEconomyStore.getState();
  const source = `mission_${mission.id}`;
  creditCoins(mission.reward.amount, source);

  return { ...mission, isClaimed: true };
}

/**
 * Calculate the completion bonus for finishing all missions of a set.
 *
 * - All daily missions completed and claimed: 100 coins bonus.
 * - All weekly missions completed and claimed: 500 coins bonus.
 *
 * @param missions  The full set of daily or weekly missions.
 * @returns The bonus coin amount (0 if not all claimed), or null if no bonus applies.
 */
export function getCompletionBonus(missions: Mission[]): number {
  if (missions.length === 0) return 0;

  const allClaimed = missions.every((m) => m.isClaimed);
  if (!allClaimed) return 0;

  const type = missions[0].type;
  if (type === 'daily') return 100;
  if (type === 'weekly') return 500;
  return 0;
}
