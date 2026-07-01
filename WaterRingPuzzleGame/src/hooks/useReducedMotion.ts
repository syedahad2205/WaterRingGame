import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { useSettingsStore } from '../store/slices/settingsSlice';

/**
 * Returns true if the user has enabled reduced motion either in system settings
 * or in the app's settings. Use this to skip or simplify animations.
 */
export function useReducedMotion(): boolean {
  const appReducedMotion = useSettingsStore((s) => s.reducedMotion);
  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setSystemReducedMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReducedMotion);
    return () => sub.remove();
  }, []);

  return appReducedMotion || systemReducedMotion;
}
