/**
 * useAccessibility — Epic 17
 *
 * Provides unified accessibility state:
 * - isReduceMotionEnabled: system preference OR in-app override
 * - colorBlindPreset: from settings store
 * - isMotorMode: motor accessibility enlarged targets
 * - isLargeText: large text mode
 * - announceForAccessibility: safe wrapper around AccessibilityInfo
 *
 * Requirements: 34.6, 40.4, 54.1, 54.2, 54.3
 */
import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettingsStore } from '../store/slices/settingsSlice';

export interface AccessibilityState {
  isReduceMotionEnabled: boolean;
  colorBlindPreset: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
  isMotorMode: boolean;
  isLargeText: boolean;
  announceForAccessibility: (message: string) => void;
}

export function useAccessibility(): AccessibilityState {
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const {
    colorBlindPreset = 'none',
    reducedMotionOverride = false,
    motorAccessibilityMode = false,
    largeTextMode = false,
  } = useSettingsStore();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReduceMotion).catch(() => { /* intentional no-op */ });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => sub.remove();
  }, []);

  const announceForAccessibility = useCallback((message: string) => {
    try {
      AccessibilityInfo.announceForAccessibility(message);
    } catch { /* silent */ }
  }, []);

  return {
    isReduceMotionEnabled: systemReduceMotion || reducedMotionOverride,
    colorBlindPreset: colorBlindPreset as 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia',
    isMotorMode: motorAccessibilityMode,
    isLargeText: largeTextMode,
    announceForAccessibility,
  };
}
