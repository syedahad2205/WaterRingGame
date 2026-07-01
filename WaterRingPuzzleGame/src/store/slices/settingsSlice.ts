/**
 * settingsSlice — owns audio volumes, haptic settings, accessibility settings,
 * language preference, and graphics quality tier.
 *
 * Requirements: 17.4, 18.1, 18.2, 18.4
 * Epic 17 additions: 34.6, 40.4, 54.1, 54.2, 54.3
 * Persists to MMKV key: 'settings_slice'
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColorBlindPreset = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type GraphicsQuality = 'high' | 'mid' | 'low';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
}

export interface HapticSettings {
  hapticsEnabled: boolean;
  hapticIntensity: number;
}

export interface AccessibilitySettings {
  reducedMotion: boolean;
  colorBlindMode: boolean;
  colorBlindPreset: ColorBlindPreset;
  highContrast: boolean;
  // Epic 17 additions
  reducedMotionOverride: boolean;
  motorAccessibilityMode: boolean;
  largeTextMode: boolean;
}

export interface SettingsState {
  // Audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  // Haptics
  hapticsEnabled: boolean;
  hapticIntensity: number;
  // Accessibility (original fields)
  reducedMotion: boolean;
  colorBlindMode: boolean;
  colorBlindPreset: ColorBlindPreset;
  highContrast: boolean;
  // Accessibility (Epic 17 additions — Requirements 34.6, 40.4, 54.1, 54.2, 54.3)
  reducedMotionOverride: boolean;
  motorAccessibilityMode: boolean;
  largeTextMode: boolean;
  // Language and quality
  language: string;
  graphicsQuality: GraphicsQuality;
}

export interface SettingsActions {
  updateAudio: (audio: Partial<AudioSettings>) => void;
  updateHaptics: (haptics: Partial<HapticSettings>) => void;
  updateAccessibility: (accessibility: Partial<AccessibilitySettings>) => void;
  updateLanguage: (language: string) => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
  // Epic 17 granular accessors (Requirements 34.6, 40.4, 54.1, 54.2, 54.3)
  setColorBlindPreset: (preset: ColorBlindPreset) => void;
  setReducedMotionOverride: (enabled: boolean) => void;
  setMotorAccessibilityMode: (enabled: boolean) => void;
  setLargeTextMode: (enabled: boolean) => void;
}

export type SettingsStore = SettingsState & SettingsActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultSettingsState: SettingsState = {
  masterVolume: 1.0,
  musicVolume: 0.8,
  sfxVolume: 1.0,
  hapticsEnabled: true,
  hapticIntensity: 1.0,
  reducedMotion: false,
  colorBlindMode: false,
  colorBlindPreset: 'none',
  highContrast: false,
  // Epic 17 defaults
  reducedMotionOverride: false,
  motorAccessibilityMode: false,
  largeTextMode: false,
  language: 'en',
  graphicsQuality: 'high',
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettingsState,

      updateAudio: (audio: Partial<AudioSettings>): void =>
        set((state) => ({
          masterVolume: audio.masterVolume ?? state.masterVolume,
          musicVolume: audio.musicVolume ?? state.musicVolume,
          sfxVolume: audio.sfxVolume ?? state.sfxVolume,
        })),

      updateHaptics: (haptics: Partial<HapticSettings>): void =>
        set((state) => ({
          hapticsEnabled: haptics.hapticsEnabled ?? state.hapticsEnabled,
          hapticIntensity: haptics.hapticIntensity ?? state.hapticIntensity,
        })),

      updateAccessibility: (accessibility: Partial<AccessibilitySettings>): void =>
        set((state) => ({
          reducedMotion: accessibility.reducedMotion ?? state.reducedMotion,
          colorBlindMode: accessibility.colorBlindMode ?? state.colorBlindMode,
          colorBlindPreset: accessibility.colorBlindPreset ?? state.colorBlindPreset,
          highContrast: accessibility.highContrast ?? state.highContrast,
          reducedMotionOverride: accessibility.reducedMotionOverride ?? state.reducedMotionOverride,
          motorAccessibilityMode: accessibility.motorAccessibilityMode ?? state.motorAccessibilityMode,
          largeTextMode: accessibility.largeTextMode ?? state.largeTextMode,
        })),

      updateLanguage: (language: string): void => set({ language }),

      setGraphicsQuality: (graphicsQuality: GraphicsQuality): void =>
        set({ graphicsQuality }),

      // Epic 17 granular actions
      setColorBlindPreset: (colorBlindPreset: ColorBlindPreset): void =>
        set({ colorBlindPreset }),

      setReducedMotionOverride: (reducedMotionOverride: boolean): void =>
        set({ reducedMotionOverride }),

      setMotorAccessibilityMode: (motorAccessibilityMode: boolean): void =>
        set({ motorAccessibilityMode }),

      setLargeTextMode: (largeTextMode: boolean): void =>
        set({ largeTextMode }),
    }),
    {
      name: 'settings_slice',
      storage: createJSONStorage(() => createSliceMMKVStorage('settings_slice')),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors — Requirement 17.8 (read only the specific field needed)
// ---------------------------------------------------------------------------

export const selectMasterVolume = (state: SettingsStore): number => state.masterVolume;
export const selectMusicVolume = (state: SettingsStore): number => state.musicVolume;
export const selectSfxVolume = (state: SettingsStore): number => state.sfxVolume;
export const selectHapticsEnabled = (state: SettingsStore): boolean => state.hapticsEnabled;
export const selectHapticIntensity = (state: SettingsStore): number => state.hapticIntensity;
export const selectReducedMotion = (state: SettingsStore): boolean => state.reducedMotion;
export const selectColorBlindMode = (state: SettingsStore): boolean => state.colorBlindMode;
export const selectColorBlindPreset = (state: SettingsStore): ColorBlindPreset =>
  state.colorBlindPreset;
export const selectHighContrast = (state: SettingsStore): boolean => state.highContrast;
export const selectLanguage = (state: SettingsStore): string => state.language;
export const selectGraphicsQuality = (state: SettingsStore): GraphicsQuality =>
  state.graphicsQuality;
// Epic 17 selectors
export const selectReducedMotionOverride = (state: SettingsStore): boolean =>
  state.reducedMotionOverride;
export const selectMotorAccessibilityMode = (state: SettingsStore): boolean =>
  state.motorAccessibilityMode;
export const selectLargeTextMode = (state: SettingsStore): boolean => state.largeTextMode;
