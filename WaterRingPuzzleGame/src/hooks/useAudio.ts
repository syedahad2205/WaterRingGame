/**
 * useAudio — React hook that wraps AudioEngine for convenient component usage.
 *
 * Provides stable, memoized functions for playing sounds, controlling volume,
 * and managing the music layer. Automatically synchronizes AudioEngine volumes
 * with the user's persisted settings from settingsSlice.
 *
 * Usage:
 *   const audio = useAudio();
 *   audio.playSFX('ring_land_peg');
 *   audio.playUI('ui_button_press');
 *   audio.setMusicTheme('ocean');
 *
 * The hook:
 *  1. Retrieves (or creates) the AudioEngine singleton.
 *  2. Reads audio settings from settingsSlice via granular selectors.
 *  3. Keeps the engine's master, music, and SFX volumes in sync via useEffect.
 *  4. Returns stable callbacks via useCallback to avoid unnecessary re-renders.
 *
 * Requirements: 14.1, 14.2, 17.4
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  useSettingsStore,
  selectMasterVolume,
  selectMusicVolume,
  selectSfxVolume,
} from '@store/slices/settingsSlice';
import { AudioEngine, audioEngine } from '@features/audio/AudioEngine';
import type { SFXEventName } from '@features/audio/SFXManager';
import type { SoundName } from '@constants/audioMap';
import { SOUND_MAP, MUSIC_STEMS, PRELOAD_GROUPS, type PreloadGroup } from '@constants/audioMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The public API returned by useAudio.
 * All functions are referentially stable across renders.
 */
export interface UseAudioReturn {
  // ── SFX Playback ──────────────────────────────────────────────────────
  /**
   * Plays a named sound effect from SOUND_MAP.
   * Supports optional per-call volume, pitch, and panning overrides.
   */
  playSFX: (
    name: SoundName,
    options?: { volume?: number; pitch?: number; panning?: number },
  ) => void;

  /**
   * Shorthand for playing UI-category sounds (buttons, toggles, modals).
   * Equivalent to playSFX but typed for UI sound names specifically.
   */
  playUI: (name: SoundName) => void;

  // ── Music Control ─────────────────────────────────────────────────────
  /** Loads and crossfades to a new music theme by theme ID. */
  setMusicTheme: (themeId: string) => void;

  // ── Challenge Lifecycle ───────────────────────────────────────────────
  /** Signals challenge start — fades in base + texture stems. */
  startChallenge: (themeId: string) => void;
  /** Signals first ring moved — adds rhythm stem. */
  onFirstRingMoved: () => void;
  /** Signals first ring landed on peg — adds melody stem. */
  onFirstRingLanded: () => void;
  /** Signals challenge midpoint — adds counter-melody stem. */
  onChallengeMidpoint: () => void;
  /** Signals timer amber warning — escalates rhythm. */
  onTimerAmber: () => void;
  /** Signals timer critical — adds intensity stem. */
  onTimerCritical: () => void;
  /** Signals victory — fades out and plays victory sting. */
  onVictory: () => void;
  /** Signals defeat — fades out and plays defeat sound. */
  onDefeat: () => void;

  // ── Pause / Resume ────────────────────────────────────────────────────
  /** Fades music to 15% (pause state, not silence). */
  pause: () => void;
  /** Restores music to pre-pause levels. */
  resume: () => void;

  // ── Volume Controls ───────────────────────────────────────────────────
  /** Sets the SFX volume (0 - 1). Persists to settings store. */
  setSFXVolume: (v: number) => void;
  /** Sets the music volume (0 - 1). Persists to settings store. */
  setMusicVolume: (v: number) => void;
  /** Sets the master volume (0 - 1). Persists to settings store. */
  setMasterVolume: (v: number) => void;

  // ── Preloading ────────────────────────────────────────────────────────
  /** Preloads a group of sounds by group name (startup, gameplay, results). */
  preloadGroup: (group: PreloadGroup) => Promise<void>;

  // ── Engine Access ─────────────────────────────────────────────────────
  /** Direct access to the AudioEngine singleton for advanced use cases. */
  engine: AudioEngine;
}

// ---------------------------------------------------------------------------
// Hook Implementation
// ---------------------------------------------------------------------------

/**
 * Returns a stable audio API object that wraps the AudioEngine singleton
 * and stays synchronized with the user's audio settings.
 */
export function useAudio(): UseAudioReturn {
  const engineRef = useRef<AudioEngine>(audioEngine);

  // Read settings from Zustand store via granular selectors (Req 17.8)
  const masterVolume = useSettingsStore(selectMasterVolume);
  const musicVolume = useSettingsStore(selectMusicVolume);
  const sfxVolume = useSettingsStore(selectSfxVolume);

  // Access the store's update action (stable reference from Zustand)
  const updateAudio = useSettingsStore((s) => s.updateAudio);

  // ── Synchronize engine volumes with persisted settings ────────────────
  useEffect(() => {
    engineRef.current.setMasterVolume(masterVolume);
  }, [masterVolume]);

  useEffect(() => {
    engineRef.current.setMusicVolume(musicVolume);
  }, [musicVolume]);

  useEffect(() => {
    engineRef.current.setSFXVolume(sfxVolume);
  }, [sfxVolume]);

  // ── SFX Playback ──────────────────────────────────────────────────────

  const playSFX = useCallback(
    (
      name: SoundName,
      options?: { volume?: number; pitch?: number; panning?: number },
    ) => {
      const asset = SOUND_MAP[name];
      if (!asset) {
        if (__DEV__) {
          console.warn(`[useAudio] Unknown sound name: ${name}`);
        }
        return;
      }

      // Map SOUND_MAP names to SFXManager event names where they overlap.
      // For sounds that are not SFXManager events (UI, ambient), we still
      // route through AudioEngine.playSFX which handles all categories.
      engineRef.current.playSFX(name, {
        volume: options?.volume ?? asset.volume,
        pitch: options?.pitch,
        panning: options?.panning,
      });
    },
    [],
  );

  const playUI = useCallback(
    (name: SoundName) => {
      playSFX(name);
    },
    [playSFX],
  );

  // ── Music Control ─────────────────────────────────────────────────────

  const setMusicTheme = useCallback((themeId: string) => {
    const stemSet = MUSIC_STEMS[themeId];
    if (!stemSet) {
      if (__DEV__) {
        console.warn(`[useAudio] Unknown music theme: ${themeId}`);
      }
      return;
    }
    engineRef.current.getMusicLayerManager().crossfadeToTheme(themeId, 2000);
  }, []);

  // ── Challenge Lifecycle ───────────────────────────────────────────────

  const startChallenge = useCallback((themeId: string) => {
    engineRef.current.startChallenge(themeId);
  }, []);

  const onFirstRingMoved = useCallback(() => {
    engineRef.current.onFirstRingMoved();
  }, []);

  const onFirstRingLanded = useCallback(() => {
    engineRef.current.onFirstRingLanded();
  }, []);

  const onChallengeMidpoint = useCallback(() => {
    engineRef.current.onChallengeMidpoint();
  }, []);

  const onTimerAmber = useCallback(() => {
    engineRef.current.onTimerAmber();
  }, []);

  const onTimerCritical = useCallback(() => {
    engineRef.current.onTimerCritical();
  }, []);

  const onVictory = useCallback(() => {
    engineRef.current.onVictory();
  }, []);

  const onDefeat = useCallback(() => {
    engineRef.current.onDefeat();
  }, []);

  // ── Pause / Resume ────────────────────────────────────────────────────

  const pause = useCallback(() => {
    engineRef.current.pause();
  }, []);

  const resume = useCallback(() => {
    engineRef.current.resume();
  }, []);

  // ── Volume Controls ───────────────────────────────────────────────────
  // These update both the engine (immediate effect) and the persisted
  // settings store (survives app restart).

  const setSFXVolume = useCallback(
    (v: number) => {
      updateAudio({ sfxVolume: v });
    },
    [updateAudio],
  );

  const setMusicVolume = useCallback(
    (v: number) => {
      updateAudio({ musicVolume: v });
    },
    [updateAudio],
  );

  const setMasterVolume = useCallback(
    (v: number) => {
      updateAudio({ masterVolume: v });
    },
    [updateAudio],
  );

  // ── Preloading ────────────────────────────────────────────────────────

  const preloadGroup = useCallback(async (group: PreloadGroup) => {
    const soundNames = PRELOAD_GROUPS[group];
    // Delegate to SFXManager's preload which loads Sound instances into cache.
    // We map SOUND_MAP names to SFXEventName where applicable.
    const sfxManager = engineRef.current.getSFXManager();
    const sfxEventNames = soundNames.filter(
      (name): name is SoundName & SFXEventName =>
        typeof name === 'string',
    );
    await sfxManager.preload(sfxEventNames as unknown as SFXEventName[]);
  }, []);

  // ── Return stable object ──────────────────────────────────────────────
  // useRef ensures the returned object identity is stable. Individual
  // callbacks are stable via useCallback with empty deps.

  const apiRef = useRef<UseAudioReturn | null>(null);

  if (apiRef.current === null) {
    apiRef.current = {
      playSFX,
      playUI,
      setMusicTheme,
      startChallenge,
      onFirstRingMoved,
      onFirstRingLanded,
      onChallengeMidpoint,
      onTimerAmber,
      onTimerCritical,
      onVictory,
      onDefeat,
      pause,
      resume,
      setSFXVolume,
      setMusicVolume,
      setMasterVolume,
      preloadGroup,
      engine: engineRef.current,
    };
  } else {
    // Update function references on subsequent renders (they are stable via
    // useCallback, but this ensures the object always has the latest refs
    // in case deps change in the future).
    apiRef.current.playSFX = playSFX;
    apiRef.current.playUI = playUI;
    apiRef.current.setMusicTheme = setMusicTheme;
    apiRef.current.startChallenge = startChallenge;
    apiRef.current.onFirstRingMoved = onFirstRingMoved;
    apiRef.current.onFirstRingLanded = onFirstRingLanded;
    apiRef.current.onChallengeMidpoint = onChallengeMidpoint;
    apiRef.current.onTimerAmber = onTimerAmber;
    apiRef.current.onTimerCritical = onTimerCritical;
    apiRef.current.onVictory = onVictory;
    apiRef.current.onDefeat = onDefeat;
    apiRef.current.pause = pause;
    apiRef.current.resume = resume;
    apiRef.current.setSFXVolume = setSFXVolume;
    apiRef.current.setMusicVolume = setMusicVolume;
    apiRef.current.setMasterVolume = setMasterVolume;
    apiRef.current.preloadGroup = preloadGroup;
  }

  return apiRef.current;
}
