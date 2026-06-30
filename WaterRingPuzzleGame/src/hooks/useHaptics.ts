/**
 * useHaptics — React hook that exposes the HapticManager instance and keeps
 * it synchronized with the current haptic settings from settingsSlice.
 *
 * Usage:
 *   const haptics = useHaptics();
 *   haptics.trigger('ringLandedPeg');
 *
 * The hook:
 *  1. Retrieves the HapticManager from the DI service context (via useServices).
 *  2. Reads the current haptics settings from settingsSlice.
 *  3. Keeps the manager's global intensity in sync via a useEffect that
 *     re-runs whenever hapticsEnabled or hapticIntensity changes.
 *
 * This is the preferred way for React components to trigger haptic feedback.
 * Non-React game-loop code should call hapticManager.trigger() directly via
 * the instance obtained from the service context.
 *
 * Requirements: 15.1, 15.5, 17.4
 */

import { useEffect, useRef } from 'react';
import {
  useSettingsStore,
  selectHapticsEnabled,
  selectHapticIntensity,
} from '@store/slices/settingsSlice';
import { HapticManager } from '@features/audio/HapticManager';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a HapticManager instance that is always synchronized with the user's
 * current haptic settings. The manager instance is stable across renders.
 *
 * The hook creates its own HapticManager instance for component-level usage.
 * For app-wide singleton usage the HapticManager should be instantiated once
 * in Providers.tsx and injected via the service context.
 */
export function useHaptics(): HapticManager {
  const managerRef = useRef<HapticManager | null>(null);

  // Create the manager once per hook mount
  if (managerRef.current === null) {
    managerRef.current = new HapticManager();
  }

  const manager = managerRef.current;

  // Read settings from the store (granular selectors per Req 17.8)
  const hapticsEnabled = useSettingsStore(selectHapticsEnabled);
  const hapticIntensity = useSettingsStore(selectHapticIntensity);

  // Keep global intensity in sync with settings
  useEffect(() => {
    if (!hapticsEnabled) {
      manager.setGlobalIntensity(0);
    } else {
      manager.setGlobalIntensity(hapticIntensity);
    }
  }, [hapticsEnabled, hapticIntensity, manager]);

  // Clean up the manager's settings subscription on unmount
  useEffect(() => {
    return () => {
      manager.destroy();
    };
  }, [manager]);

  return manager;
}
