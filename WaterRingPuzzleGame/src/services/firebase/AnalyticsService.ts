/**
 * AnalyticsService — Epic 16
 *
 * Passive Firebase Analytics wrapper. Provides:
 * - logEvent() with mandatory context (userId, sessionId, challengeNumber,
 *   timestamp, platform, appVersion, generatorVersion, deviceTier)
 * - 10-second batch flush + AppState background flush
 * - Silent error suppression (analytics must NEVER throw)
 * - Passive GameEventEmitter observer (never calls back into game)
 * 
 * Requirements: 31.1–31.4
 */
import { AppState, AppStateStatus, Platform } from 'react-native';
import { version as APP_VERSION_FROM_PACKAGE } from '../../../package.json';
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { gameEventEmitter } from '../../utils/GameEventEmitter';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsContext {
  userId?: string;
  sessionId: string;
  challengeNumber?: number;
  deviceTier?: 'high' | 'mid' | 'low';
  appVersion: string;
  generatorVersion: string;
  platform: 'ios' | 'android';
}

interface PendingEvent {
  name: string;
  params: Record<string, unknown>;
  enqueuedAt: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLUSH_INTERVAL_MS = 10_000;
const GENERATOR_VERSION = '1.0.0';
const APP_VERSION = APP_VERSION_FROM_PACKAGE;

// ---------------------------------------------------------------------------
// AnalyticsService class
// ---------------------------------------------------------------------------

export class AnalyticsService {
  private context: AnalyticsContext = {
    sessionId: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    appVersion: APP_VERSION,
    generatorVersion: GENERATOR_VERSION,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
  };

  private queue: PendingEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: { remove: () => void } | null = null;
  private gameEventUnsubscribes: Array<() => void> = [];

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  start(): void {
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS);
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'background' || state === 'inactive') {
          this.flush();
        }
      }
    );
    this.subscribeToGameEvents();
  }

  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.appStateSubscription?.remove();
    // Unsubscribe from all game event emitter subscriptions
    for (const unsub of this.gameEventUnsubscribes) {
      unsub();
    }
    this.gameEventUnsubscribes = [];
    this.flush();
  }

  // -------------------------------------------------------------------------
  // Context management
  // -------------------------------------------------------------------------

  setUserId(userId: string): void {
    this.context.userId = userId;
    try { analytics().setUserId(userId); } catch { /* silent */ }
  }

  setUserProperty(name: string, value: string): void {
    try { analytics().setUserProperties({ [name]: value }); } catch { /* silent */ }
  }

  setChallenge(challengeNumber: number): void {
    this.context.challengeNumber = challengeNumber;
  }

  setDeviceTier(tier: 'high' | 'mid' | 'low'): void {
    this.context.deviceTier = tier;
  }

  // -------------------------------------------------------------------------
  // Core logging
  // -------------------------------------------------------------------------

  logEvent(name: string, params?: Record<string, unknown>): void {
    try {
      const enriched: Record<string, unknown> = {
        ...(params ?? {}),
        ...this.mandatoryContext(),
      };
      this.queue.push({ name, params: enriched, enqueuedAt: Date.now() });
    } catch { /* silent — analytics must never throw */ }
  }

  private mandatoryContext(): Record<string, unknown> {
    return {
      user_id: this.context.userId ?? 'anonymous',
      session_id: this.context.sessionId,
      challenge_number: this.context.challengeNumber ?? 0,
      timestamp: Date.now(),
      platform: this.context.platform,
      app_version: this.context.appVersion,
      generator_version: this.context.generatorVersion,
      device_tier: this.context.deviceTier ?? 'unknown',
    };
  }

  // -------------------------------------------------------------------------
  // Flush
  // -------------------------------------------------------------------------

  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);
    for (const evt of batch) {
      try {
        await analytics().logEvent(evt.name, evt.params as Record<string, string | number>);
      } catch { /* silent */ }
    }
  }

  // -------------------------------------------------------------------------
  // Crashlytics helpers
  // -------------------------------------------------------------------------

  logNonFatal(error: Error, context?: Record<string, string>): void {
    try {
      if (context) {
        crashlytics().setAttributes(context);
      }
      crashlytics().recordError(error);
    } catch { /* silent */ }
  }

  setPhysicsContext(ctx: { activeRingCount: number; challengeNumber: number; deviceTier: string; platform: string }): void {
    try {
      crashlytics().setAttributes({
        active_ring_count: String(ctx.activeRingCount),
        challenge_number: String(ctx.challengeNumber),
        device_tier: ctx.deviceTier,
        platform: ctx.platform,
      });
    } catch { /* silent */ }
  }

  // -------------------------------------------------------------------------
  // Event catalog — all 60+ events via GameEventEmitter subscriptions
  // -------------------------------------------------------------------------

  // eslint-disable-next-line max-lines-per-function
  private subscribeToGameEvents(): void {
    const sub = (event: string, mapper: (data?: unknown) => Record<string, unknown>): void => {
      const unsub = gameEventEmitter.subscribe(event as import('../../utils/GameEventEmitter').GameEventName, (data: unknown) => {
        this.logEvent(event, mapper(data));
      });
      this.gameEventUnsubscribes.push(unsub);
    };

    // --- Gameplay lifecycle ---
    sub('challenge_start',      d => ({ ...d as object }));
    sub('challenge_complete',   d => ({ ...d as object }));
    sub('challenge_fail',       d => ({ ...d as object }));
    sub('challenge_quit',       d => ({ ...d as object }));
    sub('continue_used',        d => ({ ...d as object }));
    sub('first_ring_moved',     d => ({ ...d as object }));
    sub('first_ring_landed',    d => ({ ...d as object }));
    sub('challenge_midpoint',   d => ({ ...d as object }));
    sub('ring_settled',         d => ({ ...d as object }));
    sub('ring_near_peg_glow',   d => ({ ...d as object }));

    // --- Input ---
    sub('button_tap',              d => ({ ...d as object }));
    sub('button_hold_start',       d => ({ ...d as object }));
    sub('button_hold_peak',        d => ({ ...d as object }));
    sub('rapid_tap',               d => ({ ...d as object }));
    sub('simultaneous_press',      d => ({ ...d as object }));

    // --- Physics ---
    sub('stuck_detection_nudge',     d => ({ ...d as object }));
    sub('stuck_detection_teleport',  d => ({ ...d as object }));

    // --- Progression ---
    sub('xp_earned',           d => ({ ...d as object }));
    sub('level_up',            d => ({ ...d as object }));
    sub('prestige',            d => ({ ...d as object }));
    sub('achievement_unlock',  d => ({ ...d as object }));
    sub('collection_complete', d => ({ ...d as object }));
    sub('mastery_level_up',    d => ({ ...d as object }));

    // --- Economy ---
    sub('coin_earned',        d => ({ ...d as object }));
    sub('coin_spent',         d => ({ ...d as object }));
    sub('iap_initiated',      d => ({ ...d as object }));
    sub('iap_complete',       d => ({ ...d as object }));
    sub('iap_failed',         d => ({ ...d as object }));
    sub('ad_view_start',      d => ({ ...d as object }));
    sub('ad_view_complete',   d => ({ ...d as object }));
    sub('ad_skip',            d => ({ ...d as object }));

    // --- Social ---
    sub('leaderboard_view',       d => ({ ...d as object }));
    sub('score_submitted',        d => ({ ...d as object }));
    sub('ghost_replay_started',   d => ({ ...d as object }));
    sub('challenge_shared',       d => ({ ...d as object }));
    sub('friend_added',           d => ({ ...d as object }));

    // --- Session ---
    sub('session_start',    d => ({ ...d as object }));
    sub('session_end',      d => ({ ...d as object }));
    sub('app_background',   d => ({ ...d as object }));
    sub('app_foreground',   d => ({ ...d as object }));

    // --- Performance ---
    sub('frame_drop',          d => ({ ...d as object }));
    sub('perf_tier_downgrade', d => ({ ...d as object }));

    // --- Accessibility ---
    sub('a11y_voiceover_on',     d => ({ ...d as object }));
    sub('a11y_reduce_motion_on', d => ({ ...d as object }));
    sub('a11y_colorblind_set',   d => ({ ...d as object }));

    // --- Onboarding ---
    sub('onboarding_start',     d => ({ ...d as object }));
    sub('onboarding_complete',  d => ({ ...d as object }));
    sub('onboarding_skip',      d => ({ ...d as object }));

    // --- Error / recovery ---
    sub('physics_nan_recovery',     d => {
      this.logNonFatal(new Error('physics_nan_recovery'), { challenge: String((d as unknown as { challengeNumber?: number })?.challengeNumber ?? 0) });
      return { ...d as object };
    });
    sub('ring_stuck_teleport', d => {
      this.logNonFatal(new Error('ring_stuck_teleport'), { challenge: String((d as unknown as { challengeNumber?: number })?.challengeNumber ?? 0) });
      return { ...d as object };
    });

    // --- Replay ---
    sub('replay_start',    d => ({ ...d as object }));
    sub('replay_end',      d => ({ ...d as object }));
    sub('replay_seek',     d => ({ ...d as object }));
    sub('replay_share',    d => ({ ...d as object }));

    // --- Store ---
    sub('store_open',        d => ({ ...d as object }));
    sub('cosmetic_purchase', d => ({ ...d as object }));
    sub('cosmetic_equip',    d => ({ ...d as object }));

    // --- Settings ---
    sub('settings_change',  d => ({ ...d as object }));
    sub('theme_change',     d => ({ ...d as object }));
    sub('language_change',  d => ({ ...d as object }));
  }
}

// Singleton
export const analyticsService = new AnalyticsService();
