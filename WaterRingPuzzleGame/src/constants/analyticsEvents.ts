/**
 * Analytics Event Catalog — every trackable event in the game.
 * Used by AnalyticsService.logEvent() and GameEventEmitter.
 */
export const ANALYTICS_EVENTS = {
  // Session
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  APP_OPEN: 'app_open',
  APP_BACKGROUND: 'app_background',

  // Onboarding
  FIRST_LAUNCH: 'first_launch',
  TUTORIAL_START: 'tutorial_start',
  TUTORIAL_STEP: 'tutorial_step',
  TUTORIAL_COMPLETE: 'tutorial_complete',
  TUTORIAL_SKIP: 'tutorial_skip',

  // Gameplay
  GAME_START: 'game_start',
  GAME_COMPLETE: 'game_complete',
  GAME_FAIL: 'game_fail',
  GAME_PAUSE: 'game_pause',
  GAME_RESUME: 'game_resume',
  GAME_QUIT: 'game_quit',
  RING_LANDED: 'ring_landed',
  PERFECT_PLACEMENT: 'perfect_placement',
  COMBO_ACHIEVED: 'combo_achieved',
  TIMER_WARNING: 'timer_warning',
  CONTINUE_USED: 'continue_used',
  CONTINUE_DECLINED: 'continue_declined',

  // Daily
  DAILY_CHALLENGE_START: 'daily_challenge_start',
  DAILY_CHALLENGE_COMPLETE: 'daily_challenge_complete',
  DAILY_CHALLENGE_FAIL: 'daily_challenge_fail',

  // Progression
  LEVEL_UP: 'level_up',
  ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  PRESTIGE_UP: 'prestige_up',
  STAR_EARNED: 'star_earned',

  // Economy
  COINS_EARNED: 'coins_earned',
  COINS_SPENT: 'coins_spent',
  GEMS_EARNED: 'gems_earned',
  GEMS_SPENT: 'gems_spent',

  // Monetization
  IAP_INITIATED: 'iap_initiated',
  IAP_SUCCESS: 'iap_success',
  IAP_FAILED: 'iap_failed',
  IAP_CANCELLED: 'iap_cancelled',
  IAP_RESTORED: 'iap_restored',

  // Ads
  AD_REQUESTED: 'ad_requested',
  AD_LOADED: 'ad_loaded',
  AD_LOAD_FAILED: 'ad_load_failed',
  AD_IMPRESSION: 'ad_impression',
  AD_CLICKED: 'ad_clicked',
  AD_REWARDED: 'ad_rewarded',
  AD_CLOSED: 'ad_closed',
  AD_SKIPPED: 'ad_skipped',

  // Retention
  DAILY_REWARD_CLAIMED: 'daily_reward_claimed',
  STREAK_MILESTONE: 'streak_milestone',
  MISSION_COMPLETED: 'mission_completed',
  MISSION_REWARD_CLAIMED: 'mission_reward_claimed',

  // Social
  LEADERBOARD_VIEWED: 'leaderboard_viewed',
  SHARE_INITIATED: 'share_initiated',

  // Store
  STORE_OPENED: 'store_opened',
  STORE_ITEM_VIEWED: 'store_item_viewed',
  THEME_UNLOCKED: 'theme_unlocked',
  THEME_APPLIED: 'theme_applied',

  // Settings
  SETTINGS_CHANGED: 'settings_changed',
  SOUND_TOGGLED: 'sound_toggled',
  MUSIC_TOGGLED: 'music_toggled',
  HAPTIC_TOGGLED: 'haptic_toggled',

  // Navigation
  SCREEN_VIEW: 'screen_view',
  TAB_SWITCH: 'tab_switch',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

/**
 * Standard event parameters for each event type.
 * Used for documentation and type-checking.
 */
export interface AnalyticsEventParams {
  [ANALYTICS_EVENTS.GAME_START]: {
    challenge_number: number;
    is_daily: boolean;
    theme_id: string;
  };
  [ANALYTICS_EVENTS.GAME_COMPLETE]: {
    challenge_number: number;
    stars: number;
    time_remaining: number;
    rings_landed: number;
    rings_total: number;
    perfect_count: number;
    max_combo: number;
    coins_earned: number;
    is_daily: boolean;
    theme_id: string;
  };
  [ANALYTICS_EVENTS.GAME_FAIL]: {
    challenge_number: number;
    rings_landed: number;
    rings_total: number;
    time_remaining: number;
    is_daily: boolean;
  };
  [ANALYTICS_EVENTS.CONTINUE_USED]: {
    challenge_number: number;
    cost: number;
    continue_count: number;
  };
  [ANALYTICS_EVENTS.LEVEL_UP]: {
    new_level: number;
    total_xp: number;
  };
  [ANALYTICS_EVENTS.ACHIEVEMENT_UNLOCKED]: {
    achievement_id: string;
    achievement_name: string;
    xp_reward: number;
  };
  [ANALYTICS_EVENTS.COINS_EARNED]: {
    amount: number;
    source: string;
    balance_after: number;
  };
  [ANALYTICS_EVENTS.COINS_SPENT]: {
    amount: number;
    item_type: string;
    item_id: string;
    balance_after: number;
  };
  [ANALYTICS_EVENTS.IAP_INITIATED]: {
    product_id: string;
    price: number;
    currency: string;
  };
  [ANALYTICS_EVENTS.IAP_SUCCESS]: {
    product_id: string;
    price: number;
    currency: string;
    transaction_id: string;
  };
  [ANALYTICS_EVENTS.IAP_FAILED]: {
    product_id: string;
    error_code: string;
    error_message: string;
  };
  [ANALYTICS_EVENTS.IAP_CANCELLED]: {
    product_id: string;
  };
  [ANALYTICS_EVENTS.AD_REQUESTED]: {
    ad_type: string;
    placement: string;
  };
  [ANALYTICS_EVENTS.AD_IMPRESSION]: {
    ad_type: string;
    placement: string;
    ad_network: string;
  };
  [ANALYTICS_EVENTS.AD_REWARDED]: {
    ad_type: string;
    reward_type: string;
    reward_amount: number;
  };
  [ANALYTICS_EVENTS.AD_LOAD_FAILED]: {
    ad_type: string;
    error_code: string;
  };
  [ANALYTICS_EVENTS.DAILY_REWARD_CLAIMED]: {
    day: number;
    streak_length: number;
    reward_type: string;
    reward_amount: number;
  };
  [ANALYTICS_EVENTS.STREAK_MILESTONE]: {
    streak_length: number;
    bonus_amount: number;
  };
  [ANALYTICS_EVENTS.MISSION_COMPLETED]: {
    mission_id: string;
    mission_type: string;
    reward_amount: number;
  };
  [ANALYTICS_EVENTS.SCREEN_VIEW]: {
    screen_name: string;
    previous_screen?: string;
  };
  [ANALYTICS_EVENTS.TUTORIAL_STEP]: {
    step_number: number;
    step_name: string;
  };
  [ANALYTICS_EVENTS.SETTINGS_CHANGED]: {
    setting_name: string;
    old_value: string | number | boolean;
    new_value: string | number | boolean;
  };
  [ANALYTICS_EVENTS.THEME_APPLIED]: {
    theme_id: string;
    category: string;
  };
  [ANALYTICS_EVENTS.STORE_ITEM_VIEWED]: {
    item_id: string;
    item_name: string;
    price: number;
  };
}
