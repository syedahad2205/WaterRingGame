/**
 * HapticManager — full implementation
 *
 * Manages device haptic feedback with:
 *  - Platform capability detection (iOS Taptic Engine, Android API 26+ VibrationEffect)
 *  - All 25 named haptic events with designed amplitude/timing patterns
 *  - Global intensity scaling (0.0 – 1.0); at 0 all haptics are suppressed
 *  - Ring-collision throttle: max 3 events per 100 ms
 *  - Graceful no-op degradation on unsupported devices (no exceptions thrown)
 *  - Settings integration: reads hapticIntensity and hapticsEnabled from settingsSlice
 *    and subscribes to changes so intensity stays in sync with user preferences
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4, 15.5
 */

import { Platform } from 'react-native';
import RNHapticFeedback, {
  HapticFeedbackTypes,
  type HapticEvent as RNHapticEvent,
} from 'react-native-haptic-feedback';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All 25 named haptic events supported by the game. */
export type HapticEvent =
  | 'buttonTap'
  | 'buttonHoldStart'
  | 'buttonHoldSustained'
  | 'buttonHoldPeak'
  | 'rapidTap'
  | 'simultaneousPress'
  | 'ringCollisionLight'
  | 'ringCollisionHeavy'
  | 'ringWallCollision'
  | 'ringNearPeg'
  | 'ringLandedPeg'
  | 'perfectPlacement'
  | 'pegOccupied'
  | 'timerWarning'
  | 'timerCritical'
  | 'victory'
  | 'defeat'
  | 'bossVictory'
  | 'continueGranted'
  | 'navigationTap'
  | 'purchaseConfirm'
  | 'achievementUnlock'
  | 'cosmeticEquipped'
  | 'coinEarn'
  | 'actionBlocked';

/**
 * A multi-step haptic pattern.
 *  - `amplitudes`: 0–255 amplitude per step (Android); maps to 0.0–1.0 for iOS
 *  - `timings`:    duration in ms per step
 *  - `repeat`:     -1 = infinite, 0 = play once
 */
export interface HapticPattern {
  amplitudes: number[];
  timings: number[];
  repeat: number;
}

// ---------------------------------------------------------------------------
// Internal step shape used when building RNHapticEvent arrays
// ---------------------------------------------------------------------------

interface PatternStep {
  /** Amplitude 0–255 (raw, before intensity scaling) */
  amplitude: number;
  /** Duration in ms */
  timing: number;
  /** 0.0–1.0 sharpness hint for iOS Core Haptics */
  sharpness: number;
}

// ---------------------------------------------------------------------------
// Collision-throttle constants
// ---------------------------------------------------------------------------

/** Collision events in this list are subject to the throttle. */
const COLLISION_EVENTS = new Set<HapticEvent>([
  'ringCollisionLight',
  'ringCollisionHeavy',
]);

const COLLISION_THROTTLE_WINDOW_MS = 100;
const COLLISION_THROTTLE_MAX_COUNT = 3;

// ---------------------------------------------------------------------------
// Event → pattern catalogue
//
// Each event is defined as an array of PatternStep objects that are translated
// to `triggerPattern` calls (or `trigger` for single-step events on iOS).
//
// Amplitude scale: 0–255 (Android VibrationEffect). iOS maps to 0.0–1.0 by
// dividing by 255. Global intensity further scales all amplitudes at call time.
// ---------------------------------------------------------------------------

function buildSingleStep(amplitude: number, timing: number, sharpness: number): PatternStep[] {
  return [{ amplitude, timing, sharpness }];
}

const EVENT_PATTERNS: Record<HapticEvent, PatternStep[]> = {
  // ── UI interactions ────────────────────────────────────────────────────
  /** Light tap ~10 ms */
  navigationTap: buildSingleStep(80, 6, 0.4),

  /** Standard button tap ~10 ms */
  buttonTap: buildSingleStep(150, 10, 0.5),

  /** Hold starting feedback ~15 ms */
  buttonHoldStart: buildSingleStep(190, 15, 0.6),

  /** Sustained hold pulse — medium, repeatable */
  buttonHoldSustained: buildSingleStep(160, 12, 0.5),

  /** Hold peak — heavy impact ~20 ms */
  buttonHoldPeak: buildSingleStep(240, 20, 0.8),

  /** Rapid successive tap feedback */
  rapidTap: buildSingleStep(130, 8, 0.5),

  /** Both buttons pressed simultaneously */
  simultaneousPress: [
    { amplitude: 200, timing: 15, sharpness: 0.7 },
    { amplitude: 150, timing: 10, sharpness: 0.5 },
  ],

  // ── Ring physics ────────────────────────────────────────────────────────
  /** Light ring-ring collision */
  ringCollisionLight: buildSingleStep(100, 8, 0.3),

  /** Heavy ring-ring collision */
  ringCollisionHeavy: buildSingleStep(200, 15, 0.7),

  /** Ring hitting arena wall */
  ringWallCollision: buildSingleStep(160, 12, 0.5),

  /** Ring hovering near a peg — subtle proximity pulse */
  ringNearPeg: buildSingleStep(80, 6, 0.2),

  /**
   * Ring landed on a peg — MOST IMPORTANT event.
   * Two-pulse: medium then heavy with 15 ms gap.
   */
  ringLandedPeg: [
    { amplitude: 190, timing: 15, sharpness: 0.6 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },  // gap
    { amplitude: 240, timing: 20, sharpness: 0.9 },
  ],

  /**
   * Perfect placement (centre-aligned, fastest settle).
   * Three escalating pulses.
   */
  perfectPlacement: [
    { amplitude: 150, timing: 12, sharpness: 0.5 },
    { amplitude: 0,   timing: 10, sharpness: 0.0 },
    { amplitude: 200, timing: 15, sharpness: 0.7 },
    { amplitude: 0,   timing: 10, sharpness: 0.0 },
    { amplitude: 240, timing: 20, sharpness: 0.9 },
  ],

  /** Attempted placement on occupied peg — short dull bump */
  pegOccupied: buildSingleStep(120, 10, 0.3),

  // ── Timer ───────────────────────────────────────────────────────────────
  /** Slow warning pulse 8 ms */
  timerWarning: buildSingleStep(160, 8, 0.4),

  /** Fast critical pulse 8 ms */
  timerCritical: buildSingleStep(200, 8, 0.6),

  // ── Challenge outcomes ──────────────────────────────────────────────────
  /**
   * Victory — long escalating pattern ~250 ms total.
   */
  victory: [
    { amplitude: 150, timing: 30, sharpness: 0.5 },
    { amplitude: 0,   timing: 20, sharpness: 0.0 },
    { amplitude: 190, timing: 40, sharpness: 0.7 },
    { amplitude: 0,   timing: 20, sharpness: 0.0 },
    { amplitude: 220, timing: 50, sharpness: 0.8 },
    { amplitude: 0,   timing: 20, sharpness: 0.0 },
    { amplitude: 255, timing: 60, sharpness: 1.0 },
  ],

  /**
   * Defeat — two dull pulses with gap.
   */
  defeat: [
    { amplitude: 180, timing: 40, sharpness: 0.3 },
    { amplitude: 0,   timing: 40, sharpness: 0.0 },
    { amplitude: 180, timing: 40, sharpness: 0.3 },
  ],

  /**
   * Boss victory — longer epic pattern.
   */
  bossVictory: [
    { amplitude: 140, timing: 25, sharpness: 0.5 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },
    { amplitude: 180, timing: 35, sharpness: 0.6 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },
    { amplitude: 210, timing: 45, sharpness: 0.8 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },
    { amplitude: 240, timing: 55, sharpness: 0.9 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },
    { amplitude: 255, timing: 70, sharpness: 1.0 },
  ],

  // ── Economy / progression ───────────────────────────────────────────────
  /** Continue screen granted — warm double-tap */
  continueGranted: [
    { amplitude: 180, timing: 15, sharpness: 0.6 },
    { amplitude: 0,   timing: 10, sharpness: 0.0 },
    { amplitude: 220, timing: 20, sharpness: 0.8 },
  ],

  /** IAP purchase confirmed */
  purchaseConfirm: [
    { amplitude: 200, timing: 20, sharpness: 0.7 },
    { amplitude: 0,   timing: 15, sharpness: 0.0 },
    { amplitude: 240, timing: 25, sharpness: 0.9 },
  ],

  /** Achievement unlocked */
  achievementUnlock: [
    { amplitude: 160, timing: 20, sharpness: 0.5 },
    { amplitude: 0,   timing: 10, sharpness: 0.0 },
    { amplitude: 200, timing: 25, sharpness: 0.7 },
    { amplitude: 0,   timing: 10, sharpness: 0.0 },
    { amplitude: 230, timing: 30, sharpness: 0.9 },
  ],

  /** Cosmetic item equipped */
  cosmeticEquipped: [
    { amplitude: 170, timing: 15, sharpness: 0.6 },
    { amplitude: 0,   timing: 8,  sharpness: 0.0 },
    { amplitude: 200, timing: 20, sharpness: 0.8 },
  ],

  /** Coin earned */
  coinEarn: buildSingleStep(140, 10, 0.5),

  /** Action blocked / invalid */
  actionBlocked: buildSingleStep(100, 12, 0.2),
};

// ---------------------------------------------------------------------------
// HapticManager class
// ---------------------------------------------------------------------------

/**
 * Type for the Zustand store selector subscribe pattern.
 * We import `useSettingsStore` lazily (inside initialize) to avoid
 * circular dependency issues at module load time and to support test
 * environments where the store is not available.
 */
type SettingsUnsubscribeFn = () => void;

export class HapticManager {
  private _supported: boolean;
  private _globalIntensity: number = 1.0;

  /** Timestamps (ms) of recent collision haptic events for throttling. */
  private _collisionTimestamps: number[] = [];

  /**
   * Zustand store unsubscribe function; set by initialize().
   * Stored so it can be cleaned up if needed in future.
   */
  private _settingsUnsubscribe: SettingsUnsubscribeFn | null = null;

  constructor() {
    this._supported = this._detectSupport();
  }

  // ── Settings integration ───────────────────────────────────────────────────

  /**
   * Reads the initial haptic intensity and enabled state from settingsSlice and
   * subscribes to subsequent changes so the manager stays in sync with user
   * preferences without requiring manual calls to setGlobalIntensity().
   *
   * Behaviour:
   *  - If `settingsSlice.hapticsEnabled` is false, intensity is forced to 0.
   *  - If `settingsSlice.hapticsEnabled` is true, intensity is set to
   *    `settingsSlice.hapticIntensity` (clamped to [0, 1]).
   *  - Whenever either value changes, the above rule is re-applied.
   *
   * The store import is deferred inside this method to:
   *  1. Avoid circular dependencies at module load time.
   *  2. Allow test environments to construct HapticManager without the store.
   *
   * Requirements: 15.5 (global intensity scale), 17.4 (settingsSlice ownership)
   *
   * @returns A cleanup function that unsubscribes from the settings store.
   *          Call this when tearing down the service (e.g. in tests or when
   *          a new HapticManager instance replaces the old one).
   */
  initialize(): SettingsUnsubscribeFn {
    try {
      // Lazy import to support test environments that don't have the full store.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useSettingsStore } = require('@store/slices/settingsSlice') as {
        useSettingsStore: {
          getState: () => { hapticsEnabled: boolean; hapticIntensity: number };
          subscribe: (
            listener: (state: { hapticsEnabled: boolean; hapticIntensity: number }) => void,
          ) => SettingsUnsubscribeFn;
        };
      };

      // Apply initial values from current store state
      const applySettings = (state: { hapticsEnabled: boolean; hapticIntensity: number }): void => {
        if (!state.hapticsEnabled) {
          this.setGlobalIntensity(0);
        } else {
          this.setGlobalIntensity(state.hapticIntensity);
        }
      };

      applySettings(useSettingsStore.getState());

      // Subscribe to future changes
      const unsubscribe = useSettingsStore.subscribe(applySettings);
      this._settingsUnsubscribe = unsubscribe;
      return unsubscribe;
    } catch (err) {
      // Graceful degradation — settings store unavailable (e.g. test environment)
      console.warn('[HapticManager] initialize: could not connect to settingsSlice (non-fatal):', err);
      const noop = (): void => {};
      return noop;
    }
  }

  /**
   * Tears down the settings store subscription created by initialize().
   * Call this when the manager is being replaced or the component tree unmounts.
   */
  destroy(): void {
    if (this._settingsUnsubscribe !== null) {
      this._settingsUnsubscribe();
      this._settingsUnsubscribe = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Trigger one of the 25 named haptic events.
   * No-op on unsupported devices or when global intensity is 0.
   */
  public trigger(event: HapticEvent): void {
    if (!this._supported) {
      return;
    }
    if (this._globalIntensity === 0) {
      return;
    }
    if (COLLISION_EVENTS.has(event) && !this._allowCollision()) {
      return;
    }

    const steps = EVENT_PATTERNS[event];
    this._playSteps(steps);
  }

  /**
   * Trigger a custom HapticPattern.
   * No-op on unsupported devices or when global intensity is 0.
   */
  public triggerPattern(pattern: HapticPattern): void {
    if (!this._supported) {
      return;
    }
    if (this._globalIntensity === 0) {
      return;
    }

    const steps: PatternStep[] = pattern.amplitudes.map((amp, i) => ({
      amplitude: amp,
      timing: pattern.timings[i] ?? 10,
      sharpness: 0.5,
    }));
    this._playSteps(steps);
  }

  /** Cancel any ongoing haptic sequence. No-op on unsupported devices. */
  public cancelAll(): void {
    if (!this._supported) {
      return;
    }
    try {
      RNHapticFeedback.stop();
    } catch {
      // Graceful degradation — never throw
    }
  }

  /**
   * Set the global intensity multiplier (0.0 – 1.0).
   * 0.0 suppresses all haptics; 1.0 plays at full designed amplitude.
   */
  public setGlobalIntensity(scale: number): void {
    this._globalIntensity = Math.max(0, Math.min(1, scale));
  }

  /** Returns true if this device can produce haptic feedback. */
  public isSupported(): boolean {
    return this._supported;
  }

  // ── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Detect haptic capability at construction time.
   * - iOS: use react-native-haptic-feedback which internally checks for Taptic Engine
   * - Android: always attempt; VibrationEffect API 26+ is handled inside RNHapticFeedback
   * - Anything else: unsupported
   */
  private _detectSupport(): boolean {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return false;
    }
    try {
      return RNHapticFeedback.isSupported();
    } catch {
      return false;
    }
  }

  /**
   * Apply global intensity scaling and fire the steps as a pattern via
   * react-native-haptic-feedback's `triggerPattern` API.
   *
   * Silent (amplitude 0) steps are included to create timing gaps — the
   * library correctly passes them through as pauses to the native layer.
   */
  private _playSteps(steps: PatternStep[]): void {
    try {
      const events: RNHapticEvent[] = steps.map((step, i) => {
        const scaledAmplitude = Math.round(step.amplitude * this._globalIntensity);
        const intensity = scaledAmplitude / 255;

        // Compute start time as cumulative sum of preceding timings
        const time = steps.slice(0, i).reduce((acc, s) => acc + s.timing, 0);

        return {
          time,
          type: 'transient' as const,
          intensity,
          sharpness: step.sharpness,
        };
      });

      // Filter out zero-intensity events (silence steps / fully suppressed)
      const activeEvents = events.filter((e) => (e.intensity ?? 0) > 0);
      if (activeEvents.length === 0) {
        return;
      }

      RNHapticFeedback.triggerPattern(activeEvents, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch {
      // Graceful degradation — never throw
    }
  }

  /**
   * Throttle check for ring collision events.
   * Returns true if the event should be allowed; false if throttled.
   * Allows up to COLLISION_THROTTLE_MAX_COUNT events per COLLISION_THROTTLE_WINDOW_MS.
   */
  private _allowCollision(): boolean {
    const now = Date.now();
    const windowStart = now - COLLISION_THROTTLE_WINDOW_MS;

    // Remove timestamps outside the window
    this._collisionTimestamps = this._collisionTimestamps.filter((t) => t >= windowStart);

    if (this._collisionTimestamps.length >= COLLISION_THROTTLE_MAX_COUNT) {
      return false;
    }

    this._collisionTimestamps.push(now);
    return true;
  }
}
