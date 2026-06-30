/**
 * MusicLayerManager — stem-based adaptive music layer
 *
 * Manages the underlying track player for adaptive music stems. Stem switching
 * is handled exclusively through volume changes — stems are preloaded for a
 * theme and then faded in/out rather than being loaded and unloaded on the fly.
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
 * Platform audio session configuration:
 *   iOS     : AVAudioSession category .playback with .duckOthers option.
 *             Configured via TrackPlayer.setupPlayer() capabilities.
 *   Android : AudioFocusRequest(AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).
 *             Configured automatically by react-native-track-player when
 *             `capabilities` and `compactCapabilities` are set in setup.
 *
 * All native audio API calls are wrapped in try/catch for graceful degradation
 * in test environments where react-native-track-player is unavailable.
 *
 * Requirements: 14.2, 8.1
 */

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

/** Number of fade steps per fade operation. */
const FADE_STEPS = 20;

/** Minimum interval between fade steps (ms). */
const FADE_STEP_INTERVAL_MS = 16; // ~60 fps

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds the asset path for a given theme + stem combination.
 * Placeholder path — replace with asset resolution logic when files are available.
 */
function buildStemPath(themeId: string, stemName: StemName): string {
  return `assets/sounds/music/${themeId}/${stemName}.mp3`;
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
 * All methods that interact with the native audio layer are documented no-ops
 * until react-native-track-player is configured and audio assets are available.
 *
 * Requirements: 14.2 (stem activation state machine), 8.1 (audio feature folder)
 *
 * TODO: Wire the TODO sections to react-native-track-player once assets land.
 */
export class MusicLayerManager {
  private _initialized: boolean = false;
  private _activeThemeId: string | null = null;
  private _stemStates: Map<string, StemTrackState> = new Map();

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initializes the track player with the required capabilities.
   *
   * Platform configuration:
   *   iOS     : AVAudioSession category .playback with .duckOthers
   *   Android : AudioFocusRequest(AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
   *
   * Both platforms are configured automatically when TrackPlayer.setupPlayer()
   * is called with the capability options below.
   *
   * Requirements: 14.5 (platform audio session duck external audio)
   *
   * TODO: Uncomment the TrackPlayer setup when react-native-track-player is linked:
   * ```typescript
   * import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';
   *
   * await TrackPlayer.setupPlayer({
   *   autoHandleInterruptions: true,
   * });
   * await TrackPlayer.updateOptions({
   *   android: {
   *     appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
   *   },
   *   capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
   *   compactCapabilities: [Capability.Play, Capability.Pause],
   *   // duckOthers is implied by AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK on Android
   *   // and AVAudioSession.duckOthers on iOS via the TrackPlayer bridge.
   * });
   * ```
   */
  async initialize(): Promise<void> {
    try {
      if (this._initialized) {
        return;
      }

      // TODO: call TrackPlayer.setupPlayer() with capabilities as documented above
      // when react-native-track-player is linked and audio assets are available.

      this._initialized = true;
    } catch (err) {
      // Graceful degradation — audio unavailable but game continues normally.
      console.warn('[MusicLayerManager] initialize failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Theme loading
  // ---------------------------------------------------------------------------

  /**
   * Preloads all six stem tracks for the given theme into the player queue.
   * Tracks are loaded at volume 0 so they are silent until explicitly faded in.
   *
   * Theme directory: assets/sounds/music/{themeId}/
   * Files: base.mp3, texture.mp3, rhythm.mp3, melody.mp3, counter.mp3, intensity.mp3
   *
   * TODO: When assets are available, implement as:
   * ```typescript
   * await TrackPlayer.reset();
   * const tracks = STEM_NAMES.map((stemName) => ({
   *   id: `${themeId}_${stemName}`,
   *   url: buildStemPath(themeId, stemName),
   *   title: stemName,
   *   artist: 'Water Ring Puzzle',
   *   volume: 0,
   *   isLiveStream: false,
   * }));
   * await TrackPlayer.add(tracks);
   * await TrackPlayer.play();
   * ```
   */
  async loadTheme(themeId: string): Promise<void> {
    try {
      if (!this._initialized) {
        await this.initialize();
      }

      // Build stem state map for new theme
      const newStates = new Map<string, StemTrackState>();
      for (const stemName of STEM_NAMES) {
        const path = buildStemPath(themeId, stemName);
        // TODO: await TrackPlayer track preload for path when assets available
        void path;
        newStates.set(stemName, {
          loaded: false, // will be true after TrackPlayer.add() succeeds
          currentVolume: 0,
          fadeTimerId: null,
        });
      }

      this._stemStates = newStates;
      // Active theme set after tracks are successfully enqueued
      // TODO: set after TrackPlayer.add() resolves
      this._activeThemeId = themeId;
    } catch (err) {
      console.warn('[MusicLayerManager] loadTheme failed (non-fatal):', err);
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
   *
   * TODO: Replace interval-based fade with TrackPlayer's native volume fade API
   * when it is available in the linked version, e.g.:
   * ```typescript
   * await TrackPlayer.setVolume(effectiveVolume); // per-track index
   * ```
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
        // TODO: TrackPlayer.setVolumeForTrack(stemIndex, target) when linked
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

        // TODO: TrackPlayer.setVolumeForTrack(stemIndex, current) when linked

        if (step >= steps) {
          clearInterval(state.fadeTimerId!);
          state.fadeTimerId = null;
        }
      }, FADE_STEP_INTERVAL_MS);
    } catch (err) {
      console.warn('[MusicLayerManager] setStemVolume failed (non-fatal):', err);
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
      console.warn('[MusicLayerManager] setAllStemsVolume failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Theme crossfade (task 9.2.2)
  // ---------------------------------------------------------------------------

  /**
   * Crossfades from the current theme to a new theme over the given duration.
   *
   * Strategy:
   *  1. Load the new theme's tracks at volume 0
   *  2. Simultaneously fade out all current stems and fade in the new theme's base
   *  3. Update the active theme ID on completion
   *
   * Since tracks are not yet real (no audio assets), this is a documented no-op
   * that updates internal state to reflect the target theme.
   *
   * TODO: Full crossfade implementation when TrackPlayer + assets are available:
   * ```typescript
   * // 1. Load new theme tracks alongside current (two separate queues or a dual-player setup)
   * await this.loadTheme(newThemeId);            // loads at volume 0
   * this.setAllStemsVolume({ base: 0, texture: 0, rhythm: 0,
   *                          melody: 0, counter: 0, intensity: 0 }, durationMs);
   * // 2. Fade in new theme base + texture
   * this.setStemVolume('base', 1.0, durationMs);
   * this.setStemVolume('texture', 0.8, durationMs);
   * // 3. After fade completes, clean up old theme tracks
   * await new Promise(resolve => setTimeout(resolve, durationMs));
   * this.setThemeId(newThemeId);
   * ```
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

      // Load and initialize the new theme
      await this.loadTheme(newThemeId);

      // TODO: Fade in base + texture of the new theme after tracks are loaded
    } catch (err) {
      console.warn('[MusicLayerManager] crossfadeToTheme failed (non-fatal):', err);
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Stops all stem playback and resets internal state.
   *
   * TODO: Add `await TrackPlayer.reset()` when TrackPlayer is linked.
   */
  stopAll(): void {
    try {
      // Cancel all pending fades
      for (const state of this._stemStates.values()) {
        if (state.fadeTimerId !== null) {
          clearInterval(state.fadeTimerId);
          state.fadeTimerId = null;
        }
        state.currentVolume = 0;
      }

      this._activeThemeId = null;
      // TODO: await TrackPlayer.reset() when linked
    } catch (err) {
      console.warn('[MusicLayerManager] stopAll failed (non-fatal):', err);
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
      state = { loaded: false, currentVolume: 0, fadeTimerId: null };
      this._stemStates.set(stemName, state);
    }
    return state;
  }

  /**
   * Resolves after the given delay in milliseconds.
   * Safe in both RN and test environments.
   */
  private _delay(ms: number): Promise<void> {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }
}
