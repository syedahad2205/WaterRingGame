// Coin earn amounts per event
export const COINS_PER_CHALLENGE_STAR: Record<1 | 2 | 3, number> = { 1: 25, 2: 50, 3: 100 };
export const COINS_DAILY_COMPLETION_BONUS = 150;
export const COINS_FIRST_COMPLETION_BONUS = 50;
export const COINS_STREAK_BONUS_PER_DAY = 10;
export const COINS_AD_REWARD = 50;
export const COINS_PRESTIGE_REWARD = 1000;
export const COINS_MASTERY_REWARDS: Record<string, number> = {
  bronze: 100,
  silver: 250,
  gold: 500,
  platinum: 1000,
};

// Coin cost amounts
export const COST_CONTINUE_BASE = 50; // multiplies by (continueCount + 1)
export const COST_COSMETIC_TIER: Record<string, number> = {
  common: 150,
  rare: 500,
  epic: 1200,
  legendary: 3000,
};

// RevenueCat product IDs
export const PRODUCT_IDS = {
  COINS_100: 'coins_100',
  COINS_550: 'coins_550',
  COINS_1200: 'coins_1200',
  COINS_2500: 'coins_2500',
  COINS_6500: 'coins_6500',
  COINS_14000: 'coins_14000',
  VIP_MONTHLY: 'vip_monthly',
  VIP_ANNUAL: 'vip_annual',
} as const;

// Daily ad limit
export const MAX_DAILY_AD_VIEWS = 5;
export const AD_FATIGUE_GAP_MS = 300_000;
