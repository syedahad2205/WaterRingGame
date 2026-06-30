/**
 * useMutedSFXCompensation.ts
 *
 * When SFX is muted (sfxVolume === 0 or masterVolume === 0), key game events
 * need a visual cue so the player doesn't lose feedback.
 *
 * Returns a set of flags/callbacks that trigger brief visual flashes:
 *   - ringSettledFlash: brief white ring flash when a ring lands on a peg
 *   - nearPegFlash: glow intensity override when near a peg
 *   - timerWarningFlash: screen-edge flash at 30% / 10% timer
 *
 * Requirements: 14.3
 * Task: 9.1.3
 */

import { useCallback, useEffect } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  useSharedValue,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useSettingsStore } from '../store/slices/settingsSlice';
import { gameEventEmitter } from '../utils/GameEventEmitter';

export interface MutedSFXCompensation {
  /** Opacity 0–1: flash this on ring_settled when SFX is muted */
  ringSettledFlashOpacity: SharedValue<number>;
  /** Opacity 0–1: flash this on obstacle/ring collision when SFX is muted */
  collisionFlashOpacity: SharedValue<number>;
  /** Whether SFX is currently muted */
  isMuted: boolean;
}

/**
 * useMutedSFXCompensation — provides animated shared values that flash as
 * visual substitutes for SFX events when audio is muted.
 *
 * Requirements: 14.3
 * Task: 9.1.3
 */
export function useMutedSFXCompensation(): MutedSFXCompensation {
  const masterVolume = useSettingsStore((s) => s.masterVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const isMuted = masterVolume === 0 || sfxVolume === 0;

  const ringSettledFlashOpacity = useSharedValue(0);
  const collisionFlashOpacity = useSharedValue(0);

  const triggerRingSettledFlash = useCallback((): void => {
    if (!isMuted) return;
    ringSettledFlashOpacity.value = withSequence(
      withTiming(0.6, { duration: 60 }),
      withTiming(0, { duration: 200 }),
    );
  }, [isMuted, ringSettledFlashOpacity]);

  const triggerCollisionFlash = useCallback((): void => {
    if (!isMuted) return;
    collisionFlashOpacity.value = withSequence(
      withTiming(0.3, { duration: 40 }),
      withTiming(0, { duration: 150 }),
    );
  }, [isMuted, collisionFlashOpacity]);

  useEffect((): (() => void) => {
    const unsubSettled = gameEventEmitter.subscribe('ring_settled', () => {
      triggerRingSettledFlash();
    });
    const unsubCollision = gameEventEmitter.subscribe('ring_collision', () => {
      triggerCollisionFlash();
    });
    return (): void => {
      unsubSettled();
      unsubCollision();
    };
  }, [triggerRingSettledFlash, triggerCollisionFlash]);

  return { ringSettledFlashOpacity, collisionFlashOpacity, isMuted };
}
