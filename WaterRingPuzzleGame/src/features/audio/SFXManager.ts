/**
 * SFXManager — discrete sound effect playback manager
 *
 * Manages all 17 gameplay SFX events with per-event volume, pitch, and
 * stereo panning support. All SFX events are documented no-ops until audio
 * asset files are available (react-native-sound is installed but not yet
 * loaded with real files).
 *
 * Asset paths:
 *   Android : assets/sounds/sfx/{eventName}.ogg
 *   iOS     : assets/sounds/sfx/{eventName}.m4a
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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * All 17 supported SFX event names.
 *
 * Mapped to files:
 *   button_tap           → sfx/button_tap.{ogg,m4a}
 *   button_hold_start    → sfx/button_hold_start.{ogg,m4a}
 *   button_hold_peak     → sfx/button_hold_peak.{ogg,m4a}
 *   rapid_tap            → sfx/rapid_tap.{ogg,m4a}
 *   ring_collision       → sfx/ring_collision.{ogg,m4a}        (spatial: panning by x-pos)
 *   ring_wall_collision  → sfx/ring_wall_collision.{ogg,m4a}   (spatial: panning by x-pos)
 *   ring_near_peg        → sfx/ring_near_peg.{ogg,m4a}
 *   ring_landed_peg      → sfx/ring_landed_peg.{ogg,m4a}
 *   perfect_placement    → sfx/perfect_placement.{ogg,m4a}
 *   timer_warning_amber  → sfx/timer_warning_amber.{ogg,m4a}
 *   timer_warning_red    → sfx/timer_warning_red.{ogg,m4a}
 *   victory              → sfx/victory.{ogg,m4a}
 *   defeat               → sfx/defeat.{ogg,m4a}
 *   achievement_unlock   → sfx/achievement_unlock.{ogg,m4a}
 *   coin_earn            → sfx/coin_earn.{ogg,m4a}
 *   navigation_tap       → sfx/navigation_tap.{ogg,m4a}
 *   purchase_confirm     → sfx/purchase_confirm.{ogg,m4a}
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
// Internal asset path building
// ---------------------------------------------------------------------------

/**
 * Returns the platform-appropriate asset file path for a given SFX event.
 * The Platform import is guarded to avoid crashing in test environments
 * that do not have react-native fully mocked.
 */
function getSFXFilePath(event: SFXEventName): string {
  let ext = 'm4a'; // iOS default
  try {
    // Dynamic require to prevent crash when react-native is not available
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const { Platform } = require('react-native') as { Platform: { OS: string } };
    if (Platform.OS === 'android') {
      ext = 'ogg';
    }
  } catch {
    // Not in a React Native environment (e.g., pure Node.js test) — use m4a default
  }
  return `assets/sounds/sfx/${event}.${ext}`;
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
   * All SFX events are currently no-ops pending audio asset availability.
   * When assets are added, replace the TODO section with a react-native-sound
   * play() call:
   * ```typescript
   * const sound = new Sound(getSFXFilePath(event), Sound.MAIN_BUNDLE, (err) => {
   *   if (!err) {
   *     sound.setVolume(effectiveVolume);
   *     sound.setPan(panning);
   *     sound.setSpeed(pitch);
   *     sound.play(() => sound.release());
   *   }
   * });
   * ```
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
      const filePath = getSFXFilePath(event);

      // TODO: Load and play via react-native-sound when assets are available:
      //   const sound = new Sound(filePath, Sound.MAIN_BUNDLE, (err) => {
      //     if (!err) {
      //       sound.setVolume(effectiveVolume);
      //       sound.setPan(panning);
      //       sound.setSpeed(pitch);
      //       sound.play(() => sound.release());
      //     }
      //   });
      void filePath;
      void pitch;
      void panning;
      void effectiveVolume;
    } catch (err) {
      // Graceful degradation — SFX failure must never crash the game
      console.warn('[SFXManager] play failed (non-fatal):', err);
    }
  }

  /**
   * Preloads the sound files for the given event list into memory.
   * Call this before a challenge starts to avoid first-play latency.
   *
   * TODO: When react-native-sound is wired, load each file into memory:
   * ```typescript
   * for (const event of events) {
   *   if (!this._preloadedEvents.has(event)) {
   *     const sound = new Sound(getSFXFilePath(event), Sound.MAIN_BUNDLE, (err) => {
   *       if (!err) { this._soundCache.set(event, sound); }
   *     });
   *     this._preloadedEvents.add(event);
   *   }
   * }
   * ```
   *
   * Requirements: 14.1
   */
  async preload(events: SFXEventName[]): Promise<void> {
    try {
      for (const event of events) {
        if (!this._preloadedEvents.has(event)) {
          // TODO: preload audio file via react-native-sound when assets available
          this._preloadedEvents.add(event);
        }
      }
    } catch (err) {
      console.warn('[SFXManager] preload failed (non-fatal):', err);
    }
  }

  /**
   * Releases all preloaded sound objects from memory.
   * Call this when leaving a challenge to free audio resources.
   *
   * TODO: When react-native-sound is wired:
   * ```typescript
   * for (const sound of this._soundCache.values()) {
   *   sound.release();
   * }
   * this._soundCache.clear();
   * ```
   *
   * Requirements: 14.1
   */
  unloadAll(): void {
    try {
      // TODO: release all cached react-native-sound objects when linked
      this._preloadedEvents.clear();
    } catch (err) {
      console.warn('[SFXManager] unloadAll failed (non-fatal):', err);
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
