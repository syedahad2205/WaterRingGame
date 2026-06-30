// TODO: link AdMob (react-native-google-mobile-ads) or IronSource SDK before production

export type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'failed';
export type AdRewardType = 'coins' | 'continue' | 'xp_boost';

export interface AdReward {
  type: AdRewardType;
  amount: number;
}

export class AdService {
  private static instance: AdService | null = null;

  readonly MAX_DAILY_ADS = 5;
  readonly AD_COINS_REWARD = 50;
  readonly AD_FATIGUE_MIN_GAP_MS = 300_000;

  private state: AdState = 'idle';
  private lastAdShownAt = 0;
  private initialized = false;

  private constructor() { /* intentional no-op */ }

  static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    // TODO: await MobileAds().initialize();
    // TODO: await IronSource.init(APP_KEY);
    console.log('[AdService] mock initialize');
    this.initialized = true;
    this.state = 'idle';
  }

  async loadRewardedAd(): Promise<void> {
    if (!this.initialized) {
      console.warn('[AdService] not initialized');
      return;
    }
    this.state = 'loading';
    // TODO: const ad = await RewardedAd.createForAdRequest(AD_UNIT_ID);
    // await ad.load();
    await new Promise<void>(resolve => { setTimeout(resolve, 500); }); // mock load delay
    this.state = 'ready';
    console.log('[AdService] mock ad loaded');
  }

  async showRewardedAd(): Promise<AdReward | null> {
    if (this.state !== 'ready') {
      console.warn('[AdService] ad not ready, current state:', this.state);
      return null;
    }

    if (!this.isFatigueGapMet()) {
      console.warn('[AdService] fatigue gap not met');
      return null;
    }

    this.state = 'showing';
    // TODO: ad.show();  listen for reward callback
    await new Promise<void>(resolve => { setTimeout(resolve, 1000); }); // mock show delay

    this.lastAdShownAt = Date.now();
    this.state = 'idle';

    const reward: AdReward = { type: 'coins', amount: this.AD_COINS_REWARD };
    console.log('[AdService] mock reward earned', reward);
    return reward;
  }

  canWatchAd(dailyViewCount: number): boolean {
    return dailyViewCount < this.MAX_DAILY_ADS;
  }

  isFatigueGapMet(): boolean {
    if (this.lastAdShownAt === 0) return true;
    return Date.now() - this.lastAdShownAt >= this.AD_FATIGUE_MIN_GAP_MS;
  }

  getState(): AdState {
    return this.state;
  }

  resetDailyCount(): void {
    // Daily view count is managed externally (e.g. in the store).
    // This method resets any internal ad-cycle state if needed.
    this.state = 'idle';
    console.log('[AdService] daily count reset');
  }
}

export const adService: AdService = AdService.getInstance();
