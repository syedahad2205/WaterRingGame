/**
 * RemoteConfigService
 *
 * Fetches Firebase Remote Config parameters at app start, caches them for
 * 1 hour, and falls back to hardcoded defaults on any failure.
 *
 * IMPORTANT — session boundary contract (Requirement 28.6 / 16.6):
 *   New Remote Config values are activated only between sessions, never
 *   mid-challenge.  Callers (e.g. GameLoop) MUST call `getConfig()` once
 *   before a challenge starts and cache the returned snapshot locally for
 *   the duration of that challenge.  Do NOT call `getConfig()` from within
 *   the active game loop tick.
 *
 * Requirements: 28.5, 28.6, 16.6
 */

import remoteConfig from '@react-native-firebase/remote-config';
import {
  REMOTE_CONFIG_DEFAULT_SALT_GLOBAL,
  REMOTE_CONFIG_DEFAULT_SALT_DAILY,
  REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST,
  REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE,
  REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS,
  REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS,
  REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD,
  REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS,
  REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES,
  REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES,
} from '../../constants/remoteConfigDefaults';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Typed snapshot of all 10 Remote Config parameters. */
export interface RemoteConfigValues {
  /** Shared HMAC salt for global coin-event signing */
  salt_global: string;
  /** Shared HMAC salt for daily-challenge coin-event signing */
  salt_daily: string;
  /** Coin cost of a single continue */
  base_continue_cost: number;
  /**
   * Magnitude of the upward water-pressure force per button press.
   * Units: Matter.js force units per physics tick.
   */
  base_water_force: number;
  /** Maximum rewarded-ad views per calendar day */
  max_daily_ad_views: number;
  /**
   * Live-ops event time windows keyed by event ID.
   * Shape: Record<string, { start: string; end: string }>
   */
  event_windows: Record<string, unknown>;
  /** Minimum quality score (0.0–1.0) before a challenge is regenerated */
  quality_score_threshold: number;
  /** Bonus seconds granted on near-miss detection */
  near_miss_bonus_seconds: number;
  /** Maximum simultaneous bubble particles */
  max_active_bubbles: number;
  /** Maximum simultaneous ripple effects */
  max_active_ripples: number;

  // Ad config (synced to AdService)
  /** Maximum rewarded ad views per day */
  ad_rewarded_daily_limit: number;
  /** Maximum interstitial ad views per day */
  ad_interstitial_daily_limit: number;
  /** Cooldown between rewarded ads in ms */
  ad_rewarded_cooldown_ms: number;
  /** Cooldown between interstitial ads in ms */
  ad_interstitial_cooldown_ms: number;
  /** Show interstitial after every N games */
  ad_interstitial_game_interval: number;
  /** Coins rewarded per rewarded ad view */
  ad_rewarded_coin_amount: number;

  // Economy config (synced to PurchaseService)
  /** Coins granted for small coin pack */
  coin_pack_small_amount: number;
  /** Coins granted for medium coin pack */
  coin_pack_medium_amount: number;
  /** Coins granted for large coin pack */
  coin_pack_large_amount: number;
  /** Coins granted for XL coin pack */
  coin_pack_xl_amount: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/** Hardcoded fallback used whenever fetch/parse fails. */
const DEFAULTS: RemoteConfigValues = {
  salt_global: REMOTE_CONFIG_DEFAULT_SALT_GLOBAL,
  salt_daily: REMOTE_CONFIG_DEFAULT_SALT_DAILY,
  base_continue_cost: REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST,
  base_water_force: REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE,
  max_daily_ad_views: REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS,
  event_windows: REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS,
  quality_score_threshold: REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD,
  near_miss_bonus_seconds: REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS,
  max_active_bubbles: REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES,
  max_active_ripples: REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES,

  // Ad config defaults
  ad_rewarded_daily_limit: 5,
  ad_interstitial_daily_limit: 3,
  ad_rewarded_cooldown_ms: 300_000,
  ad_interstitial_cooldown_ms: 600_000,
  ad_interstitial_game_interval: 3,
  ad_rewarded_coin_amount: 50,

  // Economy config defaults
  coin_pack_small_amount: 500,
  coin_pack_medium_amount: 1500,
  coin_pack_large_amount: 5000,
  coin_pack_xl_amount: 15000,
};

/** Cache TTL: 1 hour (milliseconds). */
const CACHE_TTL_MS = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Service implementation
// ---------------------------------------------------------------------------

/**
 * RemoteConfigService manages fetching, caching, and accessing Firebase
 * Remote Config values with automatic fallback to hardcoded defaults.
 *
 * Usage:
 *   const configService = new RemoteConfigService();
 *   await configService.fetchAndActivate();   // call once at app start
 *   const config = configService.getConfig(); // read snapshot before each challenge
 */
export class RemoteConfigService {
  private _activeValues: RemoteConfigValues = { ...DEFAULTS };
  private _lastFetchTime = 0;

  /**
   * Fetches the latest Remote Config from Firebase and activates it.
   *
   * - Caches fetched values for `CACHE_TTL_MS` (1 hour).
   * - On any error, silently retains the current active values
   *   (which default to the hardcoded constants on first run).
   *
   * Call this once at app start, before the first challenge begins.
   * Do NOT call mid-challenge (see session boundary contract above).
   */
  public async fetchAndActivate(): Promise<void> {
    try {
      const rc = remoteConfig();

      // Configure minimum fetch interval to 1 hour for production caching.
      await rc.setConfigSettings({
        minimumFetchIntervalMillis: CACHE_TTL_MS,
      });

      // Register all 10 default values so Firebase can return them even when
      // a key has not yet been published to the Remote Config console.
      await rc.setDefaults({
        salt_global: DEFAULTS.salt_global,
        salt_daily: DEFAULTS.salt_daily,
        base_continue_cost: DEFAULTS.base_continue_cost,
        base_water_force: DEFAULTS.base_water_force,
        max_daily_ad_views: DEFAULTS.max_daily_ad_views,
        event_windows: JSON.stringify(DEFAULTS.event_windows),
        quality_score_threshold: DEFAULTS.quality_score_threshold,
        near_miss_bonus_seconds: DEFAULTS.near_miss_bonus_seconds,
        max_active_bubbles: DEFAULTS.max_active_bubbles,
        max_active_ripples: DEFAULTS.max_active_ripples,
        ad_rewarded_daily_limit: DEFAULTS.ad_rewarded_daily_limit,
        ad_interstitial_daily_limit: DEFAULTS.ad_interstitial_daily_limit,
        ad_rewarded_cooldown_ms: DEFAULTS.ad_rewarded_cooldown_ms,
        ad_interstitial_cooldown_ms: DEFAULTS.ad_interstitial_cooldown_ms,
        ad_interstitial_game_interval: DEFAULTS.ad_interstitial_game_interval,
        ad_rewarded_coin_amount: DEFAULTS.ad_rewarded_coin_amount,
        coin_pack_small_amount: DEFAULTS.coin_pack_small_amount,
        coin_pack_medium_amount: DEFAULTS.coin_pack_medium_amount,
        coin_pack_large_amount: DEFAULTS.coin_pack_large_amount,
        coin_pack_xl_amount: DEFAULTS.coin_pack_xl_amount,
      });

      await rc.fetchAndActivate();
      this._activeValues = this._readValues(rc);
      this._lastFetchTime = Date.now();
    } catch {
      // Fetch or activation failed — retain current active values (defaults on
      // first run, or last successfully fetched values on subsequent runs).
      // The service intentionally swallows the error so a network failure
      // never blocks app startup.
    }
  }

  /**
   * Returns the currently active Remote Config snapshot.
   *
   * If `fetchAndActivate()` has never been called or has always failed,
   * this returns the hardcoded defaults from `remoteConfigDefaults.ts`.
   *
   * IMPORTANT: Call this once per challenge and cache the result locally.
   * Do NOT call this method from inside the game loop tick.
   */
  public getConfig(): RemoteConfigValues {
    return { ...this._activeValues };
  }

  /**
   * Returns the timestamp (ms since epoch) of the last successful fetch,
   * or 0 if no successful fetch has occurred.
   */
  public getLastFetchTime(): number {
    return this._lastFetchTime;
  }

  /**
   * Returns `true` if the cached config is still within the 1-hour TTL.
   */
  public isCacheValid(): boolean {
    return this._lastFetchTime > 0 && Date.now() - this._lastFetchTime < CACHE_TTL_MS;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Reads all 10 parameters from the activated Remote Config instance,
   * falling back to the hardcoded default for each individual key if the
   * fetched value cannot be parsed.
   */
  private _readValues(rc: ReturnType<typeof remoteConfig>): RemoteConfigValues {
    return {
      salt_global: rc.getString('salt_global') || DEFAULTS.salt_global,
      salt_daily: rc.getString('salt_daily') || DEFAULTS.salt_daily,
      base_continue_cost: this._parsePositiveNumber(
        rc.getNumber('base_continue_cost'),
        DEFAULTS.base_continue_cost,
      ),
      base_water_force: this._parsePositiveNumber(
        rc.getNumber('base_water_force'),
        DEFAULTS.base_water_force,
      ),
      max_daily_ad_views: this._parseNumber(
        rc.getNumber('max_daily_ad_views'),
        DEFAULTS.max_daily_ad_views,
      ),
      event_windows: this._parseEventWindows(rc.getString('event_windows')),
      quality_score_threshold: this._parseNumber(
        rc.getNumber('quality_score_threshold'),
        DEFAULTS.quality_score_threshold,
      ),
      near_miss_bonus_seconds: this._parsePositiveNumber(
        rc.getNumber('near_miss_bonus_seconds'),
        DEFAULTS.near_miss_bonus_seconds,
      ),
      max_active_bubbles: this._parsePositiveNumber(
        rc.getNumber('max_active_bubbles'),
        DEFAULTS.max_active_bubbles,
      ),
      max_active_ripples: this._parsePositiveNumber(
        rc.getNumber('max_active_ripples'),
        DEFAULTS.max_active_ripples,
      ),

      // Ad config
      ad_rewarded_daily_limit: this._parseNumber(
        rc.getNumber('ad_rewarded_daily_limit'),
        DEFAULTS.ad_rewarded_daily_limit,
      ),
      ad_interstitial_daily_limit: this._parseNumber(
        rc.getNumber('ad_interstitial_daily_limit'),
        DEFAULTS.ad_interstitial_daily_limit,
      ),
      ad_rewarded_cooldown_ms: this._parsePositiveNumber(
        rc.getNumber('ad_rewarded_cooldown_ms'),
        DEFAULTS.ad_rewarded_cooldown_ms,
      ),
      ad_interstitial_cooldown_ms: this._parsePositiveNumber(
        rc.getNumber('ad_interstitial_cooldown_ms'),
        DEFAULTS.ad_interstitial_cooldown_ms,
      ),
      ad_interstitial_game_interval: this._parsePositiveNumber(
        rc.getNumber('ad_interstitial_game_interval'),
        DEFAULTS.ad_interstitial_game_interval,
      ),
      ad_rewarded_coin_amount: this._parsePositiveNumber(
        rc.getNumber('ad_rewarded_coin_amount'),
        DEFAULTS.ad_rewarded_coin_amount,
      ),

      // Economy config
      coin_pack_small_amount: this._parsePositiveNumber(
        rc.getNumber('coin_pack_small_amount'),
        DEFAULTS.coin_pack_small_amount,
      ),
      coin_pack_medium_amount: this._parsePositiveNumber(
        rc.getNumber('coin_pack_medium_amount'),
        DEFAULTS.coin_pack_medium_amount,
      ),
      coin_pack_large_amount: this._parsePositiveNumber(
        rc.getNumber('coin_pack_large_amount'),
        DEFAULTS.coin_pack_large_amount,
      ),
      coin_pack_xl_amount: this._parsePositiveNumber(
        rc.getNumber('coin_pack_xl_amount'),
        DEFAULTS.coin_pack_xl_amount,
      ),
    };
  }

  /** Returns `value` if it is a finite, non-negative number; otherwise returns `fallback`. */
  private _parseNumber(value: number, fallback: number): number {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  /**
   * Returns `value` if it is a finite number strictly greater than 0;
   * otherwise returns `fallback`. Use for parameters where 0 would cause
   * a division-by-zero or halt gameplay (e.g. base_water_force, cooldowns).
   */
  private _parsePositiveNumber(value: number, fallback: number): number {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  /**
   * Parses a JSON string into an event-windows record.
   * Falls back to the empty-object default on any parse error.
   */
  private _parseEventWindows(raw: string): Record<string, unknown> {
    if (!raw) {
      return DEFAULTS.event_windows;
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return DEFAULTS.event_windows;
    } catch {
      return DEFAULTS.event_windows;
    }
  }
}
