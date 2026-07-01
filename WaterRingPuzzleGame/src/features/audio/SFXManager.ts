/**
 * SFXManager — discrete sound effect playback manager
 *
 * Manages all 17 gameplay SFX events with per-event volume, pitch, and
 * stereo panning support. Playback is powered by react-native-sound with
 * optional preloading for low-latency replay during gameplay.
 *
 * Asset paths (resolved via SOUND_MAP from audioMap.ts):
 *   Android : res/raw/{category}_{name} (flat, no extension)
 *   iOS     : {category}/{name}.mp3 (from app bundle)
 *
 * Spatial audio design:
 *   Ring-ring collision SFX panning is driven by the ring's x-position
 *   in the arena: panning = (x / arenaWidth) * 2 - 1
 *   This maps 0 → full-left (-1), arenaWidth → full-right (+1).
 *
 *   Pitch variation (±8%) uses a challenge PRNG sub-seed to make each
 *   collision subtly unique while remaining deterministic per challenge:
 *   pitch = 1.0 + (prng.next() * 0.16 - 0.08)
 *
 * All public methods are safe to call in any order; they do not throw even
 * if the native audio module is unavailable (test / simulator environments).
 *
 * Requirements: 14.1 (playSFX interface), 8.1 (audio feature folder)
 */

import Sound from 'react-native-sound';
import { SOUND_MAP, type SoundName } from '../../constants/audioMap';

// Enable playback in silence mode on iOS
Sound.setCategory('Playback');

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * All 17 supported SFX event names.
 *
 * Each event maps to a SoundName in SOUND_MAP. The file path is resolved
 * from the SOUND_MAP entry with platform-specific handling:
 *   iOS     : file path from SOUND_MAP (e.g. 'ui/button_press.mp3')
 *   Android : flattened underscore name without extension (e.g. 'ui_button_press')
 */
export type SFXEventName =
  | 'button_tap'
  | 'button_hold_start'
  | 'button_hold_peak'
  | 'rapid_tap'
  | 'ring_collision'
  | 'ring_wall_collision'
  | 'ring_near_peg'
  | 'ring_landed_peg'
  | 'perfect_placement'
  | 'timer_warning_amber'
  | 'timer_warning_red'
  | 'victory'
  | 'defeat'
  | 'achievement_unlock'
  | 'coin_earn'
  | 'navigation_tap'
  | 'purchase_confirm';

/**
 * Per-call SFX playback options.
 * All fields are optional — defaults are applied per-event.
 */
export interface SFXOptions {
  /**
   * Volume override for this specific playback (0.0 – 1.0).
   * Multiplied by the master SFX volume.
   * Default: 1.0
   */
  volume?: number;

  /**
   * Pitch multiplier (0.5 = half speed, 2.0 = double speed).
   * Used for the ±8% random variation on ring collision sounds.
   * Default: 1.0
   */
  pitch?: number;

  /**
   * Stereo panning (-1.0 = full left, 0.0 = center, 1.0 = full right).
   * For spatial ring collision events, computed as:
   *   panning = (ringX / arenaWidth) * 2 - 1
   * Default: 0.0 (center)
   */
  panning?: number;
}

// ---------------------------------------------------------------------------
// SFXEventName → SoundName mapping
// ---------------------------------------------------------------------------

/**
 * Maps each SFXEventName to the corresponding key in SOUND_MAP.
 * This bridges the legacy 17-event SFX API with the unified SOUND_MAP asset catalogue.
 */
const SFX_EVENT_TO_SOUND_NAME: Record<SFXEventName, SoundName> = {
  button_tap:           'ui_button_press',
  button_hold_start:    'button_hold_start',
  button_hold_peak:     'button_hold_peak',
  rapid_tap:            'rapid_tap',
  ring_collision:       'ring_collision',
  ring_wall_collision:  'ring_wall_collision',
  ring_near_peg:        'ring_near_peg',
  ring_landed_peg:      'ring_land_peg',
  perfect_placement:    'ring_perfect_land',
  timer_warning_amber:  'timer_warning',
  timer_warning_red:    'timer_critical',
  victory:              'victory_fanfare',
  defeat:               'defeat_sound',
  achievement_unlock:   'achievement_unlock',
  coin_earn:            'coin_collect',
  navigation_tap:       'ui_tab_switch',
  purchase_confirm:     'purchase_success',
};

// ---------------------------------------------------------------------------
// Internal asset path building
// ---------------------------------------------------------------------------

/**
 * Detect whether we are running on Android. Guarded to avoid crashing in
 * test environments that do not have react-native fully mocked.
 */
let _isAndroid = false;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { Platform } = require('react-native') as { Platform: { OS: string } };
  _isAndroid = Platform.OS === 'android';
} catch {
  // Not in a React Native environment — default to iOS paths
}

/**
 * Returns the platform-appropriate asset file path for a given SFX event.
 *
 * Looks up the event in SOUND_MAP via SFX_EVENT_TO_SOUND_NAME, then:
 *   iOS     : returns the file path as-is (e.g. 'ui/button_press.mp3')
 *             react-native-sound resolves this from the app bundle.
 *   Android : flattens path separators to underscores and strips the extension
 *             (e.g. 'ui_button_press') because Android res/raw resources are
 *             referenced by name only, without extension or subdirectories.
 */
function getSFXFilePath(event: SFXEventName): string {
  const soundName = SFX_EVENT_TO_SOUND_NAME[event];
  const asset = SOUND_MAP[soundName];
  const filePath = asset.file; // e.g. 'ui/button_press.mp3'

  if (_isAndroid) {
    // Flatten: 'ui/button_press.mp3' → 'ui_button_press'
    return filePath.replace(/\.\w+$/, '').replace(/\//g, '_');
  }
  // iOS: return as-is; react-native-sound resolves from MAIN_BUNDLE
  return filePath;
}

// ---------------------------------------------------------------------------
// Default SFX volumes per event
// ---------------------------------------------------------------------------

/**
 * Designed relative volumes for each SFX event (0.0 – 1.0).
 * These are multiplied by the master SFX volume at play time.
 *
 * Lower volumes for subtle feedback events, higher for rewarding moments.
 */
const SFX_DEFAULT_VOLUMES: Record<SFXEventName, number> = {
  button_tap:           0.7,
  button_hold_start:    0.6,
  button_hold_peak:     0.8,
  rapid_tap:            0.65,
  ring_collision:       0.5,
  ring_wall_collision:  0.55,
  ring_near_peg:        0.4,
  ring_landed_peg:      0.9,
  perfect_placement:    1.0,
  timer_warning_amber:  0.7,
  timer_warning_red:    0.85,
  victory:              1.0,
  defeat:               0.8,
  achievement_unlock:   0.95,
  coin_earn:            0.75,
  navigation_tap:       0.5,
  purchase_confirm:     0.9,
};

// ---------------------------------------------------------------------------
// SFXManager
// ---------------------------------------------------------------------------

/**
 * SFXManager — handles discrete SFX playback for all 17 game sound events.
 *
 * This manager is intentionally kept separate from AudioEngine to maintain
 * a clean separation between the state-machine-driven music layer and the
 * fire-and-forget SFX layer.
 *
 * Requirements: 14.1, 8.1
 */
export class SFXManager {
  private _masterVolume = 1.0;

  /**
   * Set of SFX event names that have been queued for preloading.
   * Populated by preload() — used as a cache key to avoid duplicate loads.
   */
  private _preloadedEvents: Set<SFXEventName> = new Set();

  /**
   * Cache of preloaded Sound instances keyed by event name.
   * Preloaded sounds are kept in memory for low-latency replay.
   */
  private _soundCache: Map<SFXEventName, Sound> = new Map();

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Plays the SFX for the given event name.
   *
   * Effective volume = masterVolume × event default volume × options.volume (if provided).
   * If masterVolume is 0, the call is a no-op.
   *
   * Spatial audio:
   *   For ring_collision and ring_wall_collision, pass `options.panning` computed as:
   *     panning = (ringX / arenaWidth) * 2 - 1
   *
   *   For ring_collision, pass `options.pitch` computed with PRNG sub-seed as:
   *     pitch = 1.0 + (prng.next() * 0.16 - 0.08)   // ±8% variation
   *
   * If the sound has been preloaded, it is replayed from cache (low latency).
   * Otherwise, the sound is loaded on-demand and released after playback.
   *
   * Requirements: 14.1
   */
  play(event: SFXEventName, options?: SFXOptions): void {
    try {
      if (this._masterVolume <= 0) {
        return; // Master volume is 0 — muted
      }

      const eventDefaultVolume = SFX_DEFAULT_VOLUMES[event];
      const optionsVolume = options?.volume ?? 1.0;
      const effectiveVolume = this._clamp(this._masterVolume * eventDefaultVolume * optionsVolume);

      if (effectiveVolume <= 0) {
        return;
      }

      const pitch = this._clampPitch(options?.pitch ?? 1.0);
      const panning = this._clampPanning(options?.panning ?? 0.0);

      // If the sound is preloaded, clone-play from the cache for low latency.
      // Otherwise, load on-demand (slightly higher first-play latency).
      const cached = this._soundCache.get(event);
      if (cached) {
        // Reset to beginning in case the cached sound was previously played
        cached.setCurrentTime(0);
        cached.setVolume(effectiveVolume);
        cached.setPan(panning);
        cached.setSpeed(pitch);
        cached.play((success) => {
          if (!success) {
            if (__DEV__) console.warn(`[SFXManager] cached playback failed for ${event}`);
          }
        });
      } else {
        const filePath = getSFXFilePath(event);
        const sound = new Sound(filePath, Sound.MAIN_BUNDLE, (err) => {
          if (err) {
            if (__DEV__) console.warn(`[SFXManager] failed to load ${filePath}:`, err);
            return;
          }
          sound.setVolume(effectiveVolume);
          sound.setPan(panning);
          sound.setSpeed(pitch);
          sound.play((success) => {
            if (!success) {
              if (__DEV__) console.warn(`[SFXManager] playback failed for ${event}`);
            }
            sound.release();
          });
        });
      }
    } catch (err) {
      // Graceful degradation — SFX failure must never crash the game
      if (__DEV__) console.warn('[SFXManager] play failed (non-fatal):', err);
    }
  }

  /**
   * Preloads the sound files for the given event list into memory.
   * Call this before a challenge starts to avoid first-play latency.
   *
   * Loads each file into memory via react-native-sound. Resolves when all
   * files have been loaded (or individually failed with a warning).
   *
   * Requirements: 14.1
   */
  async preload(events: SFXEventName[]): Promise<void> {
    try {
      const loadPromises: Promise<void>[] = [];
      for (const event of events) {
        if (!this._preloadedEvents.has(event)) {
          this._preloadedEvents.add(event);
          const filePath = getSFXFilePath(event);
          loadPromises.push(
            new Promise<void>((resolve) => {
              const sound = new Sound(filePath, Sound.MAIN_BUNDLE, (err) => {
                if (err) {
                  if (__DEV__) console.warn(`[SFXManager] preload failed for ${filePath}:`, err);
                  this._preloadedEvents.delete(event);
                } else {
                  this._soundCache.set(event, sound);
                }
                resolve(); // resolve even on error — preload failures are non-fatal
              });
            }),
          );
        }
      }
      await Promise.all(loadPromises);
    } catch (err) {
      if (__DEV__) console.warn('[SFXManager] preload failed (non-fatal):', err);
    }
  }

  /**
   * Releases all preloaded sound objects from memory.
   * Call this when leaving a challenge to free audio resources.
   *
   * Stops and releases all cached react-native-sound instances.
   *
   * Requirements: 14.1
   */
  unloadAll(): void {
    try {
      for (const sound of this._soundCache.values()) {
        try {
          sound.stop();
          sound.release();
        } catch {
          // Individual release failure is non-fatal
        }
      }
      this._soundCache.clear();
      this._preloadedEvents.clear();
    } catch (err) {
      if (__DEV__) console.warn('[SFXManager] unloadAll failed (non-fatal):', err);
    }
  }

  /**
   * Sets the master volume multiplier for all SFX playback.
   * At 0, all play() calls become no-ops (muted).
   *
   * @param volume - Clamped to [0, 1].
   * Requirements: 14.1
   */
  setMasterVolume(volume: number): void {
    this._masterVolume = this._clamp(volume);
  }

  // ---------------------------------------------------------------------------
  // Inspection helpers
  // ---------------------------------------------------------------------------

  /** Returns the current master SFX volume (0.0 – 1.0). */
  getMasterVolume(): number {
    return this._masterVolume;
  }

  /** Returns true if the given event has been queued for preloading. */
  isPreloaded(event: SFXEventName): boolean {
    return this._preloadedEvents.has(event);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Clamps a value to the [0, 1] range. */
  private _clamp(v: number): number {
    return Math.max(0, Math.min(1, v));
  }

  /** Clamps pitch to the [0.5, 2.0] range. */
  private _clampPitch(v: number): number {
    return Math.max(0.5, Math.min(2.0, v));
  }

  /** Clamps panning to the [-1.0, 1.0] range. */
  private _clampPanning(v: number): number {
    return Math.max(-1.0, Math.min(1.0, v));
  }
}
