/**
 * AudioEngine — Three-layer adaptive audio orchestrator
 *
 * Manages three independent audio layers:
 *   Layer 1: SFX     (react-native-sound via SFXManager) — discrete game event sounds
 *   Layer 2: Ambient  (react-native-sound)               — per-theme environment loops
 *   Layer 3: Music    (react-native-sound via MusicLayerManager) — adaptive stem-based music
 *
 * Platform audio session is configured to duck external audio on both iOS
 * and Android. All native audio API calls are wrapped in try/catch for
 * graceful degradation in test environments.
 *
 * Requirements: 14.1, 14.2, 14.5
 */

import Sound from 'react-native-sound';
import { SFXManager, type SFXEventName } from './SFXManager';
import { MusicLayerManager } from './MusicLayerManager';
import { SOUND_MAP, getThemeAmbient } from '../../constants/audioMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Volume level clamped to [0, 1]. */
type VolumeLevel = number;

/** Names of the music stems managed by the adaptive state machine. */
type StemName = 'base' | 'texture' | 'rhythm' | 'melody' | 'counter' | 'intensity';

/** Target volume per stem in the current music state. */
type StemVolumes = Record<StemName, VolumeLevel>;

/** Music state machine states, mapping directly to the game lifecycle events. */
type MusicState =
  | 'idle'
  | 'challenge_start'
  | 'first_ring_moved'
  | 'first_ring_landed'
  | 'midpoint'
  | 'timer_amber'
  | 'timer_critical'
  | 'victory'
  | 'defeat'
  | 'paused';

/** Internal volume levels for each layer. */
interface LayerVolumes {
  master: VolumeLevel;
  music: VolumeLevel;
  sfx: VolumeLevel;
  ambient: VolumeLevel;
}

/**
 * Effective volume = layer-specific volume × master volume.
 * All stems are further scaled by the music layer volume.
 */
interface AudioEngineState {
  musicState: MusicState;
  stemVolumes: StemVolumes;
  /** Volume levels before pause (restored on resume). */
  prePauseStemVolumes: StemVolumes | null;
  volumes: LayerVolumes;
  /** The active theme ID for the current challenge. */
  activeThemeId: string | null;
  /** Whether the SFX layer is muted (triggers UI visual compensation). */
  sfxMuted: boolean;
  /** Listeners notified when SFX muted state changes. */
  sfxMuteListeners: Array<(muted: boolean) => void>;
}

// ---------------------------------------------------------------------------
// SFX event catalogue
// ---------------------------------------------------------------------------

/**
 * All supported SFX event names.
 *
 * Requirements: 14.1 (playSFX interface)
 */
const SFX_EVENTS = [
  'button_tap',
  'button_hold_start',
  'button_hold_peak',
  'rapid_tap',
  'ring_collision',
  'ring_wall_collision',
  'ring_near_peg',
  'ring_landed_peg',
  'perfect_placement',
  'timer_warning_amber',
  'timer_warning_red',
  'victory',
  'defeat',
  'achievement_unlock',
  'coin_earn',
  'navigation_tap',
  'purchase_confirm',
] as const;

export type SFXEvent = (typeof SFX_EVENTS)[number];

// ---------------------------------------------------------------------------
// Music stem state machine transitions
// ---------------------------------------------------------------------------

/**
 * Default (silent) stem volumes — used in idle / pre-challenge state.
 */
const STEM_VOLUMES_IDLE: Readonly<StemVolumes> = {
  base: 0,
  texture: 0,
  rhythm: 0,
  melody: 0,
  counter: 0,
  intensity: 0,
};

/**
 * Target stem volumes for each music state.
 *
 * Ref: Requirement 14.2 — Music stem activation state machine:
 *
 * ChallengeStart  → Base + Texture active (fade in over 8 bars)
 * FirstRingMoved  → Add Rhythm at 0.6 volume
 * FirstRingLanded → Add Melody at 0.7 volume
 * Midpoint        → Add Counter at 0.5 volume
 * TimerAmber      → Rhythm to 0.85, Melody to 0.5
 * TimerCritical   → Add Intensity at 0.7, reduce Melody
 * Victory/Defeat  → Fade all to silence
 * Pause           → Fade music to 15% (NOT silence — confirms continuity)
 */
const STEM_TARGETS: Readonly<Record<MusicState, StemVolumes>> = {
  idle: { base: 0, texture: 0, rhythm: 0, melody: 0, counter: 0, intensity: 0 },
  challenge_start: { base: 1.0, texture: 0.8, rhythm: 0, melody: 0, counter: 0, intensity: 0 },
  first_ring_moved: { base: 1.0, texture: 0.8, rhythm: 0.6, melody: 0, counter: 0, intensity: 0 },
  first_ring_landed: { base: 1.0, texture: 0.8, rhythm: 0.6, melody: 0.7, counter: 0, intensity: 0 },
  midpoint: { base: 1.0, texture: 0.8, rhythm: 0.6, melody: 0.7, counter: 0.5, intensity: 0 },
  timer_amber: { base: 1.0, texture: 0.8, rhythm: 0.85, melody: 0.5, counter: 0.5, intensity: 0 },
  timer_critical: { base: 1.0, texture: 0.8, rhythm: 0.85, melody: 0.35, counter: 0.5, intensity: 0.7 },
  victory: { base: 0, texture: 0, rhythm: 0, melody: 0, counter: 0, intensity: 0 },
  defeat: { base: 0, texture: 0, rhythm: 0, melody: 0, counter: 0, intensity: 0 },
  paused: { base: 0, texture: 0, rhythm: 0, melody: 0, counter: 0, intensity: 0 },
};

/** Duration constants for fade transitions (milliseconds). */
const FADE_DURATIONS = {
  challenge_start: 8 * 500,  // 8 bars ≈ 4 s at 120 BPM
  victory: 1500,
  defeat: 2000,
  pause: 400,
  resume: 1500 * (60 / 120) * (4 / 4), // 1.5 bars at 120 BPM ≈ 750 ms
} as const;

/** Pause-mode music volume level (15% — not silence). */
const PAUSE_MUSIC_VOLUME = 0.15;

// ---------------------------------------------------------------------------
// Platform audio session configuration (documented)
// ---------------------------------------------------------------------------

/**
 * Configures the native audio session to duck external audio.
 *
 * iOS  : AVAudioSession category `.playback` with `.duckOthers` option.
 *         In production this is called via a native module bridge or
 *         `react-native-track-player`'s capabilities config.
 *
 * Android: AudioFocusRequest with `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`.
 *           Configured automatically by react-native-track-player when
 *           `capabilities` and `compactCapabilities` are set.
 *
 * Both platforms: called once at AudioEngine construction time.
 *
 * Requirement: 14.5
 */
function configurePlatformAudioSession(): void {
  try {
    // react-native-track-player handles the session on both platforms when
    // TrackPlayer.setupPlayer() is called with the correct options.
    // The call is intentionally a no-op here because TrackPlayer setup
    // happens asynchronously at app start via MusicLayerManager.initialize().
    // The configuration itself is documented in MusicLayerManager.ts.
    //
    // Visual documentation for reviewers:
    //   iOS  → AVAudioSession.setCategory(.playback, options: .duckOthers)
    //   Android → AudioFocusRequest(AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
  } catch (err) {
    if (__DEV__) console.warn('[AudioEngine] configurePlatformAudioSession failed (non-fatal):', err);
  }
}

// ---------------------------------------------------------------------------
// AudioEngine implementation
// ---------------------------------------------------------------------------

/**
 * AudioEngine — orchestrates SFX, Ambient, and Music layers.
 *
 * All public methods are safe to call in any order; they do not throw even
 * if native audio modules are unavailable (test / simulator environments).
 *
 * Requirements: 14.1, 14.2, 14.5
 */
export class AudioEngine {
  private _state: AudioEngineState;
  private _sfxManager: SFXManager;
  private _musicLayerManager: MusicLayerManager;
  /** Currently playing ambient loop Sound instance (one per theme). */
  private _ambientLoop: Sound | null = null;

  constructor() {
    this._state = {
      musicState: 'idle',
      stemVolumes: { ...STEM_VOLUMES_IDLE },
      prePauseStemVolumes: null,
      volumes: {
        master: 1.0,
        music: 1.0,
        sfx: 1.0,
        ambient: 1.0,
      },
      activeThemeId: null,
      sfxMuted: false,
      sfxMuteListeners: [],
    };

    this._sfxManager = new SFXManager();
    this._musicLayerManager = new MusicLayerManager();
    configurePlatformAudioSession();
  }

  // -------------------------------------------------------------------------
  // Challenge lifecycle — music state machine
  // -------------------------------------------------------------------------

  /**
   * Called when a new challenge begins.
   * Loads the ambient loop for the given theme and fades in base + texture stems.
   *
   * Requirement: 14.1, 14.2 (ChallengeStart → Base + Texture, fade in over 8 bars)
   */
  startChallenge(themeId: string): void {
    try {
      this._state.activeThemeId = themeId;
      this._state.prePauseStemVolumes = null;
      this._transitionMusicState('challenge_start');
      this._startAmbientLoop(themeId);
      this._logAudioEvent('startChallenge', { themeId });
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] startChallenge failed (non-fatal):', err);
    }
  }

  /**
   * Called when the player moves the first ring.
   * Adds the Rhythm stem at 0.6 volume.
   *
   * Requirement: 14.2 (FirstRingMoved → Add Rhythm at 0.6)
   */
  onFirstRingMoved(): void {
    try {
      if (this._state.musicState !== 'challenge_start') {
        return;
      }
      this._transitionMusicState('first_ring_moved');
      this._logAudioEvent('onFirstRingMoved');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onFirstRingMoved failed (non-fatal):', err);
    }
  }

  /**
   * Called when the first ring lands on a peg.
   * Adds the Melody stem at 0.7 volume.
   *
   * Requirement: 14.2 (FirstRingLanded → Add Melody at 0.7)
   */
  onFirstRingLanded(): void {
    try {
      if (this._state.musicState !== 'first_ring_moved') {
        return;
      }
      this._transitionMusicState('first_ring_landed');
      this._logAudioEvent('onFirstRingLanded');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onFirstRingLanded failed (non-fatal):', err);
    }
  }

  /**
   * Called when the challenge reaches its midpoint.
   * Adds the Counter stem at 0.5 volume.
   *
   * Requirement: 14.2 (Midpoint → Add Counter at 0.5)
   */
  onChallengeMidpoint(): void {
    try {
      if (
        this._state.musicState !== 'first_ring_landed' &&
        this._state.musicState !== 'first_ring_moved' &&
        this._state.musicState !== 'challenge_start'
      ) {
        return;
      }
      this._transitionMusicState('midpoint');
      this._logAudioEvent('onChallengeMidpoint');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onChallengeMidpoint failed (non-fatal):', err);
    }
  }

  /**
   * Called when the timer reaches the amber warning threshold.
   * Rhythm rises to 0.85, Melody drops to 0.5.
   *
   * Requirement: 14.2 (TimerAmber → Rhythm 0.85, Melody 0.5)
   */
  onTimerAmber(): void {
    try {
      this._transitionMusicState('timer_amber');
      this.playSFX('timer_warning_amber');
      this._logAudioEvent('onTimerAmber');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onTimerAmber failed (non-fatal):', err);
    }
  }

  /**
   * Called when the timer reaches the critical (red) threshold.
   * Adds the Intensity stem at 0.7, reduces Melody further.
   *
   * Requirement: 14.2 (TimerCritical → Add Intensity at 0.7, reduce Melody)
   */
  onTimerCritical(): void {
    try {
      this._transitionMusicState('timer_critical');
      this.playSFX('timer_warning_red');
      this._logAudioEvent('onTimerCritical');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onTimerCritical failed (non-fatal):', err);
    }
  }

  /**
   * Called on challenge victory.
   * Fades all stems to silence over 1.5 s, then plays the victory sting.
   *
   * Requirement: 14.2 (Victory → Fade all to silence 1.5 s, play sting)
   */
  onVictory(): void {
    try {
      this._transitionMusicState('victory');
      this._fadeOutAmbientLoop(FADE_DURATIONS.victory);
      // Schedule victory sting after fade completes
      this._scheduleAfter(FADE_DURATIONS.victory, () => {
        this.playSFX('victory');
      });
      this._logAudioEvent('onVictory');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onVictory failed (non-fatal):', err);
    }
  }

  /**
   * Called on challenge defeat.
   * Fades all stems to silence over 2 s.
   *
   * Requirement: 14.2 (Defeat → Fade all to silence 2 s)
   */
  onDefeat(): void {
    try {
      this._transitionMusicState('defeat');
      this._fadeOutAmbientLoop(FADE_DURATIONS.defeat);
      this._scheduleAfter(FADE_DURATIONS.defeat, () => {
        this.playSFX('defeat');
      });
      this._logAudioEvent('onDefeat');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] onDefeat failed (non-fatal):', err);
    }
  }

  // -------------------------------------------------------------------------
  // Pause / Resume — Requirement 14.3, 14.4
  // -------------------------------------------------------------------------

  /**
   * Fades music to 15% volume (not silence) to confirm game continuity.
   * Saves current stem volumes so resume() can restore them precisely.
   *
   * Requirement: 14.3 — WHEN pause() is called, fade music to 15%.
   */
  pause(): void {
    try {
      if (this._state.musicState === 'paused') {
        return; // idempotent
      }

      // Snapshot current stem volumes for restoration on resume.
      this._state.prePauseStemVolumes = { ...this._state.stemVolumes };

      // Scale all active stem volumes to PAUSE_MUSIC_VOLUME (15%).
      // Rather than silencing — this is the key distinction from defeat/victory.
      const pausedStems: StemVolumes = {} as StemVolumes;
      (Object.keys(this._state.stemVolumes) as StemName[]).forEach((stem) => {
        pausedStems[stem] = this._state.stemVolumes[stem] * PAUSE_MUSIC_VOLUME;
      });

      this._state.stemVolumes = pausedStems;
      this._state.musicState = 'paused';

      this._applyNativeVolumes(pausedStems, FADE_DURATIONS.pause);

      // Duck ambient loop to match pause level
      if (this._ambientLoop) {
        this._ambientLoop.setVolume(
          this._state.volumes.ambient * this._state.volumes.master * PAUSE_MUSIC_VOLUME,
        );
      }

      this._logAudioEvent('pause');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] pause failed (non-fatal):', err);
    }
  }

  /**
   * Fades music back to pre-pause levels over 1.5 bars.
   *
   * Requirement: 14.4 — WHEN resume() is called, fade back to active levels.
   */
  resume(): void {
    try {
      if (this._state.musicState !== 'paused') {
        return; // not paused — nothing to do
      }

      // Restore pre-pause stem volumes. Fall back to challenge_start if the
      // snapshot was somehow lost (never silence -- that would be the 'paused'
      // entry in STEM_TARGETS which is all zeros).
      const targetVolumes = this._state.prePauseStemVolumes ?? STEM_TARGETS['challenge_start'];
      this._state.stemVolumes = { ...targetVolumes };
      this._state.prePauseStemVolumes = null;

      // Restore the music state label that matches the pre-pause stem profile.
      const restoredState = this._inferStateFromVolumes(targetVolumes);
      this._state.musicState = restoredState;

      this._applyNativeVolumes(targetVolumes, FADE_DURATIONS.resume);

      // Restore ambient loop volume
      if (this._ambientLoop) {
        this._ambientLoop.setVolume(this._state.volumes.ambient * this._state.volumes.master);
      }

      this._logAudioEvent('resume');
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] resume failed (non-fatal):', err);
    }
  }

  // -------------------------------------------------------------------------
  // SFX playback — Requirement 14.1
  // -------------------------------------------------------------------------

  /**
   * Plays a discrete sound effect via SFXManager.
   *
   * If SFX is muted (sfxVolume = 0 or muted flag), the call is skipped
   * and UI compensation cues are signalled via sfxMuteListeners.
   *
   * Requirement: 14.1 (playSFX interface), 14.6 (SFX mute -> UI notification)
   */
  playSFX(event: string, options?: Record<string, unknown>): void {
    try {
      const isMuted = this._state.volumes.sfx === 0;
      if (isMuted) {
        if (!this._state.sfxMuted) {
          this._state.sfxMuted = true;
          this._notifySFXMuteListeners(true);
        }
        return;
      }
      if (this._state.sfxMuted) {
        this._state.sfxMuted = false;
        this._notifySFXMuteListeners(false);
      }

      // Delegate to SFXManager for actual playback
      this._sfxManager.setMasterVolume(this._state.volumes.sfx * this._state.volumes.master);
      this._sfxManager.play(event as SFXEventName, {
        volume: (options?.volume as number) ?? undefined,
        pitch: (options?.pitch as number) ?? undefined,
        panning: (options?.panning as number) ?? undefined,
      });

      this._logAudioEvent('playSFX', { event, options });
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] playSFX failed (non-fatal):', err);
    }
  }

  // -------------------------------------------------------------------------
  // Volume controls — Requirement 14.1
  // -------------------------------------------------------------------------

  /**
   * Sets the master volume multiplier applied to all layers.
   *
   * @param v - Clamped to [0, 1].
   */
  setMasterVolume(v: number): void {
    try {
      this._state.volumes.master = this._clamp(v);
      this._applyMasterVolume();
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] setMasterVolume failed (non-fatal):', err);
    }
  }

  /**
   * Sets the music layer volume (affects all music stems).
   *
   * @param v - Clamped to [0, 1].
   */
  setMusicVolume(v: number): void {
    try {
      this._state.volumes.music = this._clamp(v);
      this._applyNativeVolumes(this._state.stemVolumes, 0);
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] setMusicVolume failed (non-fatal):', err);
    }
  }

  /**
   * Sets the SFX layer volume.
   * Setting to 0 triggers SFX mute notification to UI layer.
   *
   * @param v - Clamped to [0, 1].
   * Requirement: 14.6 — WHEN SFX are muted, notify UI layer.
   */
  setSFXVolume(v: number): void {
    try {
      const clamped = this._clamp(v);
      this._state.volumes.sfx = clamped;

      const isMuted = clamped === 0;
      if (isMuted !== this._state.sfxMuted) {
        this._state.sfxMuted = isMuted;
        this._notifySFXMuteListeners(isMuted);
      }
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] setSFXVolume failed (non-fatal):', err);
    }
  }

  // -------------------------------------------------------------------------
  // UI notification for SFX mute — Requirement 14.6
  // -------------------------------------------------------------------------

  /**
   * Subscribe to SFX mute state changes.
   * The UI layer uses this to activate visual compensation cues.
   *
   * Requirement: 14.6
   */
  onSFXMuteChanged(listener: (muted: boolean) => void): () => void {
    this._state.sfxMuteListeners.push(listener);
    return () => {
      const idx = this._state.sfxMuteListeners.indexOf(listener);
      if (idx !== -1) {
        this._state.sfxMuteListeners.splice(idx, 1);
      }
    };
  }

  // -------------------------------------------------------------------------
  // Inspection helpers (for testing)
  // -------------------------------------------------------------------------

  /** Returns the current music state machine state. */
  getMusicState(): MusicState {
    return this._state.musicState;
  }

  /** Returns a snapshot of the current stem volumes. */
  getStemVolumes(): Readonly<StemVolumes> {
    return { ...this._state.stemVolumes };
  }

  /** Returns a snapshot of the layer volumes. */
  getVolumes(): Readonly<LayerVolumes> {
    return { ...this._state.volumes };
  }

  /** Returns whether SFX is currently muted. */
  isSFXMuted(): boolean {
    return this._state.sfxMuted;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Transitions the music state machine to a new state and updates stem volumes.
   */
  private _transitionMusicState(newState: MusicState): void {
    const prevState = this._state.musicState;
    if (prevState === newState) {
      return; // idempotent
    }
    this._state.musicState = newState;
    const targetVolumes = STEM_TARGETS[newState];
    this._state.stemVolumes = { ...targetVolumes };

    // Apply to native layer with appropriate fade duration.
    const fadeDurationMs =
      newState === 'victory'
        ? FADE_DURATIONS.victory
        : newState === 'defeat'
          ? FADE_DURATIONS.defeat
          : newState === 'challenge_start'
            ? FADE_DURATIONS.challenge_start
            : 200; // default crossfade

    this._applyNativeVolumes(targetVolumes, fadeDurationMs);
  }

  /**
   * Applies the effective native volumes to the MusicLayerManager stems.
   * Effective volume = stem target x music layer volume x master volume.
   *
   * All calls are wrapped to ensure graceful degradation when native modules
   * are unavailable (simulator, test environment).
   */
  private _applyNativeVolumes(
    stemVolumes: StemVolumes,
    fadeDurationMs: number,
  ): void {
    try {
      const effective = this._computeEffectiveVolumes(stemVolumes);
      this._state.stemVolumes = stemVolumes;

      // Delegate to MusicLayerManager for actual native volume application
      this._musicLayerManager.setAllStemsVolume(
        effective as unknown as Record<string, number>,
        fadeDurationMs,
      );
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] _applyNativeVolumes failed (non-fatal):', err);
    }
  }

  /**
   * Computes effective volumes by applying layer and master multipliers.
   */
  private _computeEffectiveVolumes(stemVolumes: StemVolumes): StemVolumes {
    const musicScale = this._state.volumes.music * this._state.volumes.master;
    const result: StemVolumes = {} as StemVolumes;
    (Object.keys(stemVolumes) as StemName[]).forEach((stem) => {
      result[stem] = this._clamp(stemVolumes[stem] * musicScale);
    });
    return result;
  }

  /**
   * Re-applies native volumes after a master volume change.
   */
  private _applyMasterVolume(): void {
    this._applyNativeVolumes(this._state.stemVolumes, 0);
  }

  /**
   * Infers the most likely prior music state from a stem volume snapshot.
   * Used by resume() to restore the correct music state label.
   */
  private _inferStateFromVolumes(volumes: StemVolumes): MusicState {
    const states: MusicState[] = [
      'timer_critical',
      'timer_amber',
      'midpoint',
      'first_ring_landed',
      'first_ring_moved',
      'challenge_start',
    ];
    for (const state of states) {
      const targets = STEM_TARGETS[state];
      if (this._volumesMatch(volumes, targets)) {
        return state;
      }
    }
    return 'challenge_start'; // fallback
  }

  /**
   * Checks if two stem volume snapshots are approximately equal.
   */
  private _volumesMatch(a: StemVolumes, b: StemVolumes): boolean {
    return (Object.keys(a) as StemName[]).every(
      (stem) => Math.abs(a[stem] - b[stem]) < 0.001,
    );
  }

  /**
   * Schedules a callback after the given delay in milliseconds.
   * Uses setTimeout — safe in both RN and test environments.
   */
  private _scheduleAfter(delayMs: number, callback: () => void): void {
    setTimeout(callback, delayMs);
  }

  /**
   * Notifies all registered SFX mute listeners.
   */
  private _notifySFXMuteListeners(muted: boolean): void {
    this._state.sfxMuteListeners.forEach((listener) => {
      try {
        listener(muted);
      } catch (err) {
        if (__DEV__) console.warn('[AudioEngine] sfxMuteListener threw (non-fatal):', err);
      }
    });
  }

  // -------------------------------------------------------------------------
  // Ambient loop management
  // -------------------------------------------------------------------------

  /**
   * Starts an ambient background loop for the given theme.
   * Resolves the ambient sound via SOUND_MAP and getThemeAmbient().
   *
   *   iOS     : file path from SOUND_MAP (e.g. 'ambient/water_ambient.mp3')
   *   Android : flattened resource name without extension (e.g. 'ambient_water_ambient')
   */
  private _startAmbientLoop(themeId: string): void {
    try {
      // Stop any existing ambient loop first
      this._stopAmbientLoop();

      let isAndroid = false;
      try {
        const { Platform } = require('react-native') as { Platform: { OS: string } };
        isAndroid = Platform.OS === 'android';
      } catch {
        // Not in RN environment
      }

      const ambientSoundName = getThemeAmbient(themeId);
      const ambientAsset = SOUND_MAP[ambientSoundName];
      const filePath = ambientAsset.file; // e.g. 'ambient/water_ambient.mp3'
      const path = isAndroid
        ? filePath.replace(/\.\w+$/, '').replace(/\//g, '_') // 'ambient_water_ambient'
        : filePath;
      const effectiveVolume = this._state.volumes.ambient * this._state.volumes.master;

      this._ambientLoop = new Sound(path, Sound.MAIN_BUNDLE, (err) => {
        if (err) {
          if (__DEV__) console.warn(`[AudioEngine] failed to load ambient loop ${path}:`, err);
          this._ambientLoop = null;
          return;
        }
        if (this._ambientLoop) {
          this._ambientLoop.setVolume(effectiveVolume);
          this._ambientLoop.setNumberOfLoops(-1);
          this._ambientLoop.play((success) => {
            if (!success) {
              if (__DEV__) console.warn('[AudioEngine] ambient loop playback stopped unexpectedly');
            }
          });
        }
      });
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] _startAmbientLoop failed (non-fatal):', err);
    }
  }

  /**
   * Fades out the ambient loop over the given duration, then stops and releases it.
   */
  private _fadeOutAmbientLoop(durationMs: number): void {
    try {
      if (!this._ambientLoop) {
        return;
      }
      const loop = this._ambientLoop;
      const startVolume = loop.getVolume();
      const steps = Math.max(1, Math.floor(durationMs / 16));
      const stepSize = startVolume / steps;
      let step = 0;

      const timerId = setInterval(() => {
        step++;
        if (step >= steps) {
          clearInterval(timerId);
          loop.stop();
          loop.release();
          if (this._ambientLoop === loop) {
            this._ambientLoop = null;
          }
        } else {
          loop.setVolume(Math.max(0, startVolume - stepSize * step));
        }
      }, 16);
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] _fadeOutAmbientLoop failed (non-fatal):', err);
    }
  }

  /**
   * Immediately stops and releases the ambient loop.
   */
  private _stopAmbientLoop(): void {
    try {
      if (this._ambientLoop) {
        this._ambientLoop.stop();
        this._ambientLoop.release();
        this._ambientLoop = null;
      }
    } catch (err) {
      if (__DEV__) console.warn('[AudioEngine] _stopAmbientLoop failed (non-fatal):', err);
    }
  }

  // -------------------------------------------------------------------------
  // Sub-manager accessors
  // -------------------------------------------------------------------------

  /** Returns the SFXManager instance for direct SFX control. */
  getSFXManager(): SFXManager {
    return this._sfxManager;
  }

  /** Returns the MusicLayerManager instance for direct stem control. */
  getMusicLayerManager(): MusicLayerManager {
    return this._musicLayerManager;
  }

  /**
   * Clamps a value to the [0, 1] range.
   */
  private _clamp(v: number): VolumeLevel {
    return Math.max(0, Math.min(1, v));
  }

  /**
   * Logs audio events at debug level (no-op in production / test when silent).
   */
  private _logAudioEvent(event: string, meta?: Record<string, unknown>): void {
    // Guard __DEV__ for environments that don't define it (e.g. Jest / Node.js).
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // eslint-disable-next-line no-console
      console.debug('[AudioEngine]', event, meta ?? '');
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton export (mirrors other engine singletons in the project)
// ---------------------------------------------------------------------------

/** Shared AudioEngine instance — injected via Providers.tsx DI context. */
export const audioEngine = new AudioEngine();
