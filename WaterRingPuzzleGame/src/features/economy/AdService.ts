// Requires: npm install react-native-google-mobile-ads
// Production-ready Google AdMob integration for Water Ring Puzzle Game

import { Platform } from 'react-native';
import { analyticsService } from '../../services/firebase/AnalyticsService';

// ---------------------------------------------------------------------------
// Dynamic import — graceful fallback if SDK is not linked yet
// ---------------------------------------------------------------------------

let MobileAds: any = null;
let RewardedAd: any = null;
let InterstitialAd: any = null;
let BannerAd: any = null;
let AdEventType: any = null;
let RewardedAdEventType: any = null;
let TestIds: any = null;

try {
  const admob = require('react-native-google-mobile-ads');
  MobileAds = admob.default;
  RewardedAd = admob.RewardedAd;
  InterstitialAd = admob.InterstitialAd;
  BannerAd = admob.BannerAd;
  AdEventType = admob.AdEventType;
  RewardedAdEventType = admob.RewardedAdEventType;
  TestIds = admob.TestIds;
} catch {
  if (__DEV__) console.warn('[AdService] react-native-google-mobile-ads not installed');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'failed';
export type AdRewardType = 'coins' | 'continue' | 'xp_boost';
export type AdType = 'rewarded' | 'interstitial' | 'banner' | 'app_open';

export interface AdReward {
  type: AdRewardType;
  amount: number;
}

export interface AdConfig {
  rewardedAdUnitId: string;
  interstitialAdUnitId: string;
  bannerAdUnitId: string;
  appOpenAdUnitId: string;
  maxDailyRewarded: number;
  maxDailyInterstitial: number;
  rewardedCooldownMs: number;
  interstitialCooldownMs: number;
  interstitialAfterGames: number;
}

// ---------------------------------------------------------------------------
// Default config (uses test IDs in dev)
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: AdConfig = {
  rewardedAdUnitId: __DEV__
    ? (TestIds?.REWARDED ?? 'ca-app-pub-3940256099942544/5224354917')
    : Platform.OS === 'ios'
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY' // Replace with real iOS ad unit
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ', // Replace with real Android ad unit
  interstitialAdUnitId: __DEV__
    ? (TestIds?.INTERSTITIAL ?? 'ca-app-pub-3940256099942544/1033173712')
    : Platform.OS === 'ios'
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  bannerAdUnitId: __DEV__
    ? (TestIds?.BANNER ?? 'ca-app-pub-3940256099942544/6300978111')
    : Platform.OS === 'ios'
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  appOpenAdUnitId: __DEV__
    ? (TestIds?.APP_OPEN ?? 'ca-app-pub-3940256099942544/9257395921')
    : Platform.OS === 'ios'
      ? 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY'
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ',
  maxDailyRewarded: 5,
  maxDailyInterstitial: 3,
  rewardedCooldownMs: 300_000,       // 5 minutes
  interstitialCooldownMs: 600_000,   // 10 minutes
  interstitialAfterGames: 3,
};

// ---------------------------------------------------------------------------
// Reward amounts (overridable via Remote Config)
// ---------------------------------------------------------------------------

interface RewardConfig {
  coins: number;
  continue: number;
  xpBoostDurationMs: number;
}

const DEFAULT_REWARDS: RewardConfig = {
  coins: 50,
  continue: 1,
  xpBoostDurationMs: 30 * 60 * 1000, // 30 minutes
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AdService {
  private static instance: AdService | null = null;

  private config: AdConfig = { ...DEFAULT_CONFIG };
  private rewards: RewardConfig = { ...DEFAULT_REWARDS };
  private initialized = false;

  // State tracking
  private rewardedState: AdState = 'idle';
  private interstitialState: AdState = 'idle';

  // Loaded ad instances
  private rewardedAd: any = null;
  private interstitialAd: any = null;

  // Listener cleanup functions
  private rewardedListeners: Array<() => void> = [];
  private interstitialListeners: Array<() => void> = [];

  // Frequency / cooldown tracking
  private dailyRewardedCount = 0;
  private dailyInterstitialCount = 0;
  private lastRewardedShownAt = 0;
  private lastInterstitialShownAt = 0;
  private dailyResetDate = '';

  private constructor() { /* intentional no-op */ }

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialize the AdMob SDK and apply config overrides from Remote Config.
   */
  async initialize(config?: Partial<AdConfig>): Promise<void> {
    if (this.initialized) return;

    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.checkDailyReset();

    if (!MobileAds) {
      if (__DEV__) console.warn('[AdService] AdMob SDK not available — running in stub mode');
      this.initialized = true;
      return;
    }

    try {
      await MobileAds().initialize();
      this.initialized = true;

      analyticsService.logEvent('ad_service_initialized', {
        platform: Platform.OS,
      });

      // Preload ads
      this.loadRewardedAd();
      this.loadInterstitial();
    } catch (error: any) {
      if (__DEV__) console.error('[AdService] initialization failed:', error);
      analyticsService.logEvent('ad_service_init_failed', {
        error: error?.message ?? 'unknown',
      });
      // Mark as initialized so the app doesn't block
      this.initialized = true;
    }
  }

  /**
   * Update reward config from Remote Config values.
   */
  updateRewardConfig(overrides: Partial<RewardConfig>): void {
    this.rewards = { ...this.rewards, ...overrides };
  }

  /**
   * Update ad config from Remote Config values.
   */
  updateAdConfig(overrides: Partial<AdConfig>): void {
    this.config = { ...this.config, ...overrides };
  }

  // -------------------------------------------------------------------------
  // Rewarded Ads
  // -------------------------------------------------------------------------

  /**
   * Create and load a rewarded ad. Handles errors and retries.
   */
  loadRewardedAd(): void {
    if (!MobileAds || !RewardedAd) {
      this.rewardedState = 'idle';
      return;
    }

    if (this.rewardedState === 'loading' || this.rewardedState === 'ready') {
      return;
    }

    this.rewardedState = 'loading';
    this.cleanupRewardedListeners();

    analyticsService.logEvent('ad_requested', { adType: 'rewarded' });

    try {
      this.rewardedAd = RewardedAd.createForAdRequest(this.config.rewardedAdUnitId);

      const loadedUnsub = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          this.rewardedState = 'ready';
          analyticsService.logEvent('ad_loaded', { adType: 'rewarded' });
        },
      );

      const errorUnsub = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.rewardedState = 'failed';
          if (__DEV__) console.error('[AdService] Rewarded ad load failed:', error);
          analyticsService.logEvent('ad_load_failed', {
            adType: 'rewarded',
            error: error?.message ?? 'unknown',
          });
        },
      );

      this.rewardedListeners.push(loadedUnsub, errorUnsub);
      this.rewardedAd.load();
    } catch (error: any) {
      this.rewardedState = 'failed';
      if (__DEV__) console.error('[AdService] Rewarded ad creation failed:', error);
      analyticsService.logEvent('ad_load_failed', {
        adType: 'rewarded',
        error: error?.message ?? 'unknown',
      });
    }
  }

  /**
   * Show a rewarded ad and return the reward on completion.
   * Returns null if the ad cannot be shown (not ready, cooldown, daily limit, ad-free, etc.).
   */
  async showRewardedAd(rewardType: AdRewardType): Promise<AdReward | null> {
    this.checkDailyReset();

    // Check if user is ad-free
    if (await this.isAdFree()) {
      return null;
    }

    if (this.rewardedState !== 'ready' || !this.rewardedAd) {
      if (__DEV__) console.warn('[AdService] Rewarded ad not ready, state:', this.rewardedState);
      return null;
    }

    if (!this.canWatchRewardedAd()) {
      if (__DEV__) console.warn('[AdService] Rewarded ad blocked by limit/cooldown');
      return null;
    }

    this.rewardedState = 'showing';

    return new Promise<AdReward | null>((resolve) => {
      let rewarded = false;

      const earnedUnsub = this.rewardedAd.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        () => {
          rewarded = true;
          analyticsService.logEvent('ad_rewarded', {
            adType: 'rewarded',
            rewardType,
          });
        },
      );

      const closedUnsub = this.rewardedAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          this.rewardedState = 'idle';
          this.lastRewardedShownAt = Date.now();
          this.dailyRewardedCount++;

          earnedUnsub();
          closedUnsub();
          errorUnsub();

          analyticsService.logEvent('ad_closed', { adType: 'rewarded' });

          if (rewarded) {
            const reward = this.getRewardAmount(rewardType);
            // Preload next ad
            this.loadRewardedAd();
            resolve(reward);
          } else {
            analyticsService.logEvent('ad_skipped', { adType: 'rewarded' });
            // Preload next ad
            this.loadRewardedAd();
            resolve(null);
          }
        },
      );

      const errorUnsub = this.rewardedAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.rewardedState = 'failed';
          if (__DEV__) console.error('[AdService] Rewarded ad show error:', error);
          analyticsService.logEvent('ad_load_failed', {
            adType: 'rewarded',
            error: error?.message ?? 'unknown',
          });

          earnedUnsub();
          closedUnsub();
          errorUnsub();

          this.loadRewardedAd();
          resolve(null);
        },
      );

      try {
        analyticsService.logEvent('ad_impression', { adType: 'rewarded' });
        this.rewardedAd.show();
      } catch (error: any) {
        this.rewardedState = 'failed';
        if (__DEV__) console.error('[AdService] Rewarded ad show failed:', error);
        earnedUnsub();
        closedUnsub();
        errorUnsub();
        this.loadRewardedAd();
        resolve(null);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Interstitial Ads
  // -------------------------------------------------------------------------

  /**
   * Load an interstitial ad.
   */
  loadInterstitial(): void {
    if (!MobileAds || !InterstitialAd) {
      this.interstitialState = 'idle';
      return;
    }

    if (this.interstitialState === 'loading' || this.interstitialState === 'ready') {
      return;
    }

    this.interstitialState = 'loading';
    this.cleanupInterstitialListeners();

    analyticsService.logEvent('ad_requested', { adType: 'interstitial' });

    try {
      this.interstitialAd = InterstitialAd.createForAdRequest(
        this.config.interstitialAdUnitId,
      );

      const loadedUnsub = this.interstitialAd.addAdEventListener(
        AdEventType.LOADED,
        () => {
          this.interstitialState = 'ready';
          analyticsService.logEvent('ad_loaded', { adType: 'interstitial' });
        },
      );

      const errorUnsub = this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.interstitialState = 'failed';
          if (__DEV__) console.error('[AdService] Interstitial load failed:', error);
          analyticsService.logEvent('ad_load_failed', {
            adType: 'interstitial',
            error: error?.message ?? 'unknown',
          });
        },
      );

      this.interstitialListeners.push(loadedUnsub, errorUnsub);
      this.interstitialAd.load();
    } catch (error: any) {
      this.interstitialState = 'failed';
      if (__DEV__) console.error('[AdService] Interstitial creation failed:', error);
    }
  }

  /**
   * Show an interstitial ad if frequency caps allow.
   * Returns true if shown, false if blocked.
   */
  async showInterstitial(): Promise<boolean> {
    this.checkDailyReset();

    if (await this.isAdFree()) return false;

    if (this.interstitialState !== 'ready' || !this.interstitialAd) {
      return false;
    }

    // Check daily limit
    if (this.dailyInterstitialCount >= this.config.maxDailyInterstitial) {
      if (__DEV__) console.log('[AdService] Interstitial daily limit reached');
      return false;
    }

    // Check cooldown
    if (
      this.lastInterstitialShownAt > 0 &&
      Date.now() - this.lastInterstitialShownAt < this.config.interstitialCooldownMs
    ) {
      if (__DEV__) console.log('[AdService] Interstitial cooldown active');
      return false;
    }

    this.interstitialState = 'showing';

    return new Promise<boolean>((resolve) => {
      const closedUnsub = this.interstitialAd.addAdEventListener(
        AdEventType.CLOSED,
        () => {
          this.interstitialState = 'idle';
          this.lastInterstitialShownAt = Date.now();
          this.dailyInterstitialCount++;

          closedUnsub();
          errorUnsub();
          clickedUnsub();

          analyticsService.logEvent('ad_closed', { adType: 'interstitial' });
          this.loadInterstitial();
          resolve(true);
        },
      );

      const errorUnsub = this.interstitialAd.addAdEventListener(
        AdEventType.ERROR,
        (error: any) => {
          this.interstitialState = 'failed';
          if (__DEV__) console.error('[AdService] Interstitial show error:', error);

          closedUnsub();
          errorUnsub();
          clickedUnsub();

          this.loadInterstitial();
          resolve(false);
        },
      );

      const clickedUnsub = this.interstitialAd.addAdEventListener(
        AdEventType.CLICKED,
        () => {
          analyticsService.logEvent('ad_clicked', { adType: 'interstitial' });
        },
      );

      try {
        analyticsService.logEvent('ad_impression', { adType: 'interstitial' });
        this.interstitialAd.show();
      } catch (error: any) {
        this.interstitialState = 'failed';
        if (__DEV__) console.error('[AdService] Interstitial show failed:', error);
        closedUnsub();
        errorUnsub();
        clickedUnsub();
        this.loadInterstitial();
        resolve(false);
      }
    });
  }

  /**
   * Check if an interstitial should be shown based on game count and cooldown.
   */
  shouldShowInterstitial(gamesPlayed: number): boolean {
    if (this.dailyInterstitialCount >= this.config.maxDailyInterstitial) {
      return false;
    }

    if (
      this.lastInterstitialShownAt > 0 &&
      Date.now() - this.lastInterstitialShownAt < this.config.interstitialCooldownMs
    ) {
      return false;
    }

    // Show after every Nth game
    return gamesPlayed > 0 && gamesPlayed % this.config.interstitialAfterGames === 0;
  }

  // -------------------------------------------------------------------------
  // Frequency / eligibility checks
  // -------------------------------------------------------------------------

  /**
   * Check if the user can watch another rewarded ad (daily limit + cooldown).
   */
  canWatchRewardedAd(): boolean {
    this.checkDailyReset();

    if (this.dailyRewardedCount >= this.config.maxDailyRewarded) {
      return false;
    }

    if (
      this.lastRewardedShownAt > 0 &&
      Date.now() - this.lastRewardedShownAt < this.config.rewardedCooldownMs
    ) {
      return false;
    }

    return true;
  }

  /**
   * Delegate to PurchaseService to check if user has ad-free access.
   */
  async isAdFree(): Promise<boolean> {
    try {
      const { PurchaseService } = require('./PurchaseService');
      return await PurchaseService.getInstance().isAdFree();
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Rewards
  // -------------------------------------------------------------------------

  /**
   * Get the reward amount for a given reward type.
   */
  getRewardAmount(type: AdRewardType): AdReward {
    switch (type) {
      case 'coins':
        return { type: 'coins', amount: this.rewards.coins };
      case 'continue':
        return { type: 'continue', amount: this.rewards.continue };
      case 'xp_boost':
        return { type: 'xp_boost', amount: this.rewards.xpBoostDurationMs };
      default:
        return { type: 'coins', amount: this.rewards.coins };
    }
  }

  /**
   * Get remaining rewarded ad views for today.
   */
  getRemainingRewardedAds(): number {
    this.checkDailyReset();
    return Math.max(0, this.config.maxDailyRewarded - this.dailyRewardedCount);
  }

  /**
   * Get the cooldown remaining in ms before the next rewarded ad can be shown.
   * Returns 0 if no cooldown is active.
   */
  getRewardedCooldownRemaining(): number {
    if (this.lastRewardedShownAt === 0) return 0;
    const elapsed = Date.now() - this.lastRewardedShownAt;
    return Math.max(0, this.config.rewardedCooldownMs - elapsed);
  }

  // -------------------------------------------------------------------------
  // State accessors
  // -------------------------------------------------------------------------

  getRewardedState(): AdState {
    return this.rewardedState;
  }

  getInterstitialState(): AdState {
    return this.interstitialState;
  }

  getState(): AdState {
    return this.rewardedState;
  }

  // -------------------------------------------------------------------------
  // Daily reset
  // -------------------------------------------------------------------------

  /**
   * Reset daily counters. Called automatically when the date changes.
   */
  resetDailyCounters(): void {
    this.dailyRewardedCount = 0;
    this.dailyInterstitialCount = 0;
    this.dailyResetDate = new Date().toISOString().slice(0, 10);
    this.rewardedState = 'idle';
    this.interstitialState = 'idle';
    if (__DEV__) console.log('[AdService] Daily counters reset');
  }

  /**
   * Check if the date has changed and reset counters if needed.
   */
  private checkDailyReset(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (this.dailyResetDate !== today) {
      this.resetDailyCounters();
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup helpers
  // -------------------------------------------------------------------------

  private cleanupRewardedListeners(): void {
    for (const unsub of this.rewardedListeners) {
      try { unsub(); } catch { /* ignore */ }
    }
    this.rewardedListeners = [];
  }

  private cleanupInterstitialListeners(): void {
    for (const unsub of this.interstitialListeners) {
      try { unsub(); } catch { /* ignore */ }
    }
    this.interstitialListeners = [];
  }
}

export const adService: AdService = AdService.getInstance();
