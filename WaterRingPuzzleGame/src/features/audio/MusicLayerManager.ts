/**
 * MusicLayerManager — stem-based adaptive music layer
 *
 * Manages the underlying audio player for adaptive music stems using
 * react-native-sound. Stem switching is handled exclusively through volume
 * changes -- stems are preloaded for a theme and then faded in/out rather
 * than being loaded and unloaded on the fly.
 *
 * For each theme, stem tracks are stored at:
 *   assets/sounds/music/{themeId}/{stemName}.mp3
 *
 * Six stems per theme:
 *   base      — always-on foundation layer
 *   texture   — atmospheric texture layer
 *   rhythm    — rhythmic percussion layer
 *   melody    — melodic lead layer
 *   counter   — counter-melody / harmony layer
 *   intensity — high-tension escalation layer
 *
 * Each stem is an independent looping Sound instance. All six stems play
 * simultaneously; volume controls determine which layers are audible.
 *
 * All native audio API calls are wrapped in try/catch for graceful degradation
 * in test environments where react-native-sound is unavailable.
 *
 * Requirements: 14.2, 8.1
 */

import Sound from 'react-native-sound';

// Enable playback in silence mode on iOS
Sound.setCategory('Playback');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported stem names for music layer management. */
export type StemName = 'base' | 'texture' | 'rhythm' | 'melody' | 'counter' | 'intensity';

/**
 * Configuration for a single music stem track.
 * Used by loadTheme() to know which files to preload.
 */
export interface MusicStemConfig {
  /** The music theme this stem belongs to (e.g. 'ocean', 'forest'). */
  themeId: string;
  /** The stem layer this track represents. */
  stemName: StemName;
  /** Relative asset path; resolved at runtime to a bundled or cached URI. */
  filePath: string;
  /** Default target volume for this stem (0.0 – 1.0). */
  targetVolume: number;
}

/** Internal per-stem state tracked by the manager. */
interface StemTrackState {
  /** Whether the stem track has been loaded into the player. */
  loaded: boolean;
  /** The react-native-sound instance for this stem (null until loaded). */
  sound: Sound | null;
  /** Current volume (0.0 – 1.0). */
  currentVolume: number;
  /** Any pending fade timer handle. */
  fadeTimerId: ReturnType<typeof setInterval> | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Stem names in declaration order. */
const STEM_NAMES: StemName[] = ['base', 'texture', 'rhythm', 'melody', 'counter', 'intensity'];

/** Minimum interval between fade steps (ms). */
const FADE_STEP_INTERVAL_MS = 16; // ~60 fps

// ---------------------------------------------------------------------------
// Helpers
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
 * Builds the asset path for a given theme + stem combination.
 *
 *   iOS     : 'music/{themeId}/{stemName}.mp3' (resolved from MAIN_BUNDLE)
 *   Android : 'music_{themeId}_{stemName}' (flat res/raw resource name, no extension)
 */
function buildStemPath(themeId: string, stemName: StemName): string {
  if (_isAndroid) {
    return `music_${themeId}_${stemName}`;
  }
  return `music/${themeId}/${stemName}.mp3`;
}

/** Clamps a value to [0, 1]. */
function clamp(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// MusicLayerManager
// ---------------------------------------------------------------------------

/**
 * MusicLayerManager
 *
 * Manages stem-based adaptive music mixing for the Water Ring Puzzle Game.
 * Each stem is a looping react-native-sound instance controlled via volume fades.
 *
 * Requirements: 14.2 (stem activation state machine), 8.1 (audio feature folder)
 */
export class MusicLayerManager {
  private _initialized = false;
  private _activeThemeId: string | null = null;
  private _stemStates: Map<string, StemTrackState> = new Map();

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes the music layer manager.
   *
   * react-native-sound handles audio session configuration via
   * Sound.setCategory('Playback') at module load time. This method
   * simply marks the manager as ready for use.
   *
   * Requirements: 14.5 (platform audio session duck external audio)
   */
  async initialize(): Promise<void> {
    try {
      if (this._initialized) {
        return;
      }

      // Sound.setCategory('Playback') is called at module scope above.
      // No additional async setup is needed for react-native-sound.
      this._initialized = true;
    } catch (err) {
      // Graceful degradation — audio unavailable but game continues normally.
      if (__DEV__) console.warn('[MusicLayerManager] initialize failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Theme loading
  // ---------------------------------------------------------------------------

  /**
   * Preloads all six stem tracks for the given theme.
   * Tracks are loaded at volume 0 and set to loop. They begin playing
   * immediately (silently) so that all stems stay in sync.
   *
   * Theme directory: assets/sounds/music/{themeId}/
   * Files: base.mp3, texture.mp3, rhythm.mp3, melody.mp3, counter.mp3, intensity.mp3
   */
  async loadTheme(themeId: string): Promise<void> {
    try {
      if (!this._initialized) {
        await this.initialize();
      }

      // Release any previously loaded stems
      this._releaseAllSounds();

      const newStates = new Map<string, StemTrackState>();
      const loadPromises: Promise<void>[] = [];

      for (const stemName of STEM_NAMES) {
        const path = buildStemPath(themeId, stemName);
        const state: StemTrackState = {
          loaded: false,
          sound: null,
          currentVolume: 0,
          fadeTimerId: null,
        };
        newStates.set(stemName, state);

        loadPromises.push(
          new Promise<void>((resolve) => {
            const sound = new Sound(path, Sound.MAIN_BUNDLE, (err) => {
              if (err) {
                if (__DEV__) console.warn(`[MusicLayerManager] failed to load stem ${stemName} from ${path}:`, err);
                resolve();
                return;
              }
              sound.setVolume(0);
              sound.setNumberOfLoops(-1); // loop indefinitely
              state.sound = sound;
              state.loaded = true;
              // Start playing at volume 0 so all stems stay in sync
              sound.play((success) => {
                if (!success) {
                  if (__DEV__) console.warn(`[MusicLayerManager] stem ${stemName} playback stopped unexpectedly`);
                }
              });
              resolve();
            });
          }),
        );
      }

      await Promise.all(loadPromises);
      this._stemStates = newStates;
      this._activeThemeId = themeId;
    } catch (err) {
      if (__DEV__) console.warn('[MusicLayerManager] loadTheme failed (non-fatal):', err);
    }
  }

  /**
   * Updates the internal active theme ID.
   * Call this after a crossfade completes to keep internal state consistent.
   */
  setThemeId(themeId: string): void {
    this._activeThemeId = themeId;
  }

  // ---------------------------------------------------------------------------
  // Stem volume control
  // ---------------------------------------------------------------------------

  /**
   * Fades a single stem to the target volume over the given duration.
   *
   * Implemented as a step-based linear fade using setInterval (safe in both
   * RN and test environments). When fadeDurationMs is 0 the change is immediate.
   * Each step applies the volume to the underlying react-native-sound instance.
   */
  setStemVolume(stemName: string, volume: number, fadeDurationMs: number): void {
    try {
      const target = clamp(volume);
      const state = this._getOrCreateStemState(stemName);

      // Cancel any existing fade
      if (state.fadeTimerId !== null) {
        clearInterval(state.fadeTimerId);
        state.fadeTimerId = null;
      }

      if (fadeDurationMs <= 0) {
        state.currentVolume = target;
        if (state.sound) {
          state.sound.setVolume(target);
        }
        return;
      }

      const start = state.currentVolume;
      const delta = target - start;
      const steps = Math.max(1, Math.floor(fadeDurationMs / FADE_STEP_INTERVAL_MS));
      const stepSize = delta / steps;
      let step = 0;

      state.fadeTimerId = setInterval(() => {
        step++;
        const current = step >= steps ? target : clamp(start + stepSize * step);
        state.currentVolume = current;
        if (state.sound) {
          state.sound.setVolume(current);
        }

        if (step >= steps) {
          clearInterval(state.fadeTimerId!);
          state.fadeTimerId = null;
        }
      }, FADE_STEP_INTERVAL_MS);
    } catch (err) {
      if (__DEV__) console.warn('[MusicLayerManager] setStemVolume failed (non-fatal):', err);
    }
  }

  /**
   * Applies a complete stem volume map, fading all stems simultaneously.
   * Stems not present in the `volumes` map retain their current volumes.
   *
   * Called by AudioEngine._applyNativeVolumes() to enact state machine
   * transitions across all stems in one operation.
   */
  setAllStemsVolume(volumes: Record<string, number>, fadeDurationMs: number): void {
    try {
      for (const [stemName, volume] of Object.entries(volumes)) {
        this.setStemVolume(stemName, volume, fadeDurationMs);
      }
    } catch (err) {
      if (__DEV__) console.warn('[MusicLayerManager] setAllStemsVolume failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Theme crossfade (task 9.2.2)
  // ---------------------------------------------------------------------------

  /**
   * Crossfades from the current theme to a new theme over the given duration.
   *
   * Strategy:
   *  1. Fade out all current stems over durationMs
   *  2. Release old sounds, load new theme at volume 0
   *  3. Fade in new theme's base + texture stems
   */
  async crossfadeToTheme(newThemeId: string, durationMs: number): Promise<void> {
    try {
      if (newThemeId === this._activeThemeId) {
        return; // Already on this theme
      }

      // Fade out all current stems
      this.setAllStemsVolume(
        Object.fromEntries(STEM_NAMES.map((s) => [s, 0])),
        durationMs,
      );

      // Wait for fade-out before loading new theme
      await this._delay(durationMs);

      // Load and initialize the new theme (releases old stems internally)
      await this.loadTheme(newThemeId);

      // Fade in base + texture of the new theme
      this.setStemVolume('base', 1.0, durationMs);
      this.setStemVolume('texture', 0.8, durationMs);
    } catch (err) {
      if (__DEV__) console.warn('[MusicLayerManager] crossfadeToTheme failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Stops all stem playback, releases sound resources, and resets internal state.
   */
  stopAll(): void {
    try {
      this._releaseAllSounds();
      this._activeThemeId = null;
    } catch (err) {
      if (__DEV__) console.warn('[MusicLayerManager] stopAll failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Inspection helpers
  // ---------------------------------------------------------------------------

  /** Returns true if initialize() has been called successfully. */
  isInitialized(): boolean {
    return this._initialized;
  }

  /** Returns the currently active theme ID, or null if no theme is loaded. */
  getActiveThemeId(): string | null {
    return this._activeThemeId;
  }

  /**
   * Returns the current volume of a stem (0.0 – 1.0).
   * Returns 0 for stems that have not been loaded yet.
   */
  getStemVolume(stemName: string): number {
    return this._stemStates.get(stemName)?.currentVolume ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns the StemTrackState for the given stem name, creating it if needed.
   */
  private _getOrCreateStemState(stemName: string): StemTrackState {
    let state = this._stemStates.get(stemName);
    if (state === undefined) {
      state = { loaded: false, sound: null, currentVolume: 0, fadeTimerId: null };
      this._stemStates.set(stemName, state);
    }
    return state;
  }

  /**
   * Stops, releases, and clears all loaded Sound instances and their fade timers.
   */
  private _releaseAllSounds(): void {
    for (const state of this._stemStates.values()) {
      if (state.fadeTimerId !== null) {
        clearInterval(state.fadeTimerId);
        state.fadeTimerId = null;
      }
      if (state.sound) {
        try {
          state.sound.stop();
          state.sound.release();
        } catch {
          // Individual release failure is non-fatal
        }
        state.sound = null;
      }
      state.loaded = false;
      state.currentVolume = 0;
    }
    this._stemStates.clear();
  }

  /**
   * Resolves after the given delay in milliseconds.
   * Safe in both RN and test environments.
   */
  private _delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => { setTimeout(resolve, ms); });
  }
}
