/**
 * GameScreen.tsx
 *
 * Main gameplay screen. Loads a challenge, starts the GameLoop, and manages
 * the full session lifecycle: start, win, loss, and quit.
 *
 * Navigation params:
 *   { challengeNumber?: number; isDaily?: boolean }
 *   If challengeNumber is omitted, uses onboardingSlice.highestChallengeShown + 1.
 *   If isDaily is true, generates the daily challenge for today's date.
 *
 * Requirements: 6.7, 7.1.1, 7.1.2
 *
 * ## Challenge loading (Task 7.1.1)
 *   1. generateChallenge(N) is called; challenge loads in < 500ms
 *   2. PhysicsWorld is initialized via GameLoop.start()
 *   3. challengeSlice.loadChallenge(config) is called
 *   4. audioEngine.startChallenge() is called
 *   5. Analytics challenge_start event logged with challengeNumber + loadTimeMs
 *   6. Supports both regular and daily challenges
 *
 * ## Session lifecycle (Task 7.1.2)
 *   Win  : GameLoop fires onWin → challengeSlice.recordWin → compute star count
 *          → compute coins → show VictoryModal (Alert) → log analytics
 *          → onboardingSlice.progressTutorial(challengeNumber)
 *   Loss : timer expires → challengeSlice.recordLoss → show ContinueModal (Alert)
 *          → if declined show DefeatModal (Alert)
 *   Quit : hardware back / quit button → confirmation dialog → GameLoop.stop()
 *          → navigate back → log analytics
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  BackHandler,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { generateChallenge } from '../features/game/generation/ChallengeGenerator';
import { ChallengeGenerator } from '../features/game/generation/ChallengeGenerator';
import { GameLoop } from '../features/game/core/GameLoop';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useOnboardingStore } from '../store/slices/onboardingSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { usePhysicsSharedState } from '../hooks/usePhysicsSharedState';
import { audioEngine } from '../features/audio/AudioEngine';
import { AnalyticsService } from '../services/firebase/AnalyticsService';
import type { ChallengeConfig } from '../types/challenge';

// ---------------------------------------------------------------------------
// Module-level analytics instance (lightweight stub — no network calls)
// ---------------------------------------------------------------------------

const analytics = new AnalyticsService();

// ---------------------------------------------------------------------------
// Star-count computation helpers (Task 7.1.2: win flow)
// ---------------------------------------------------------------------------

/** Maximum coins awarded per challenge, scaling with challenge number. */
const BASE_COIN_REWARD = 50;
const COIN_REWARD_PER_CHALLENGE = 5;
const STAR_BONUS_COINS = 25;

/**
 * Compute the number of stars earned based on time remaining.
 *
 * 3 stars: > 60% of timer remaining
 * 2 stars: > 30% of timer remaining
 * 1 star : any completion
 *
 * Requirements: 7.1.2
 */
export function computeStarCount(
  timerRemainingSeconds: number,
  totalTimerSeconds: number,
): 1 | 2 | 3 {
  if (totalTimerSeconds <= 0) {
    return 1;
  }
  const fraction = timerRemainingSeconds / totalTimerSeconds;
  if (fraction > 0.6) {
    return 3;
  }
  if (fraction > 0.3) {
    return 2;
  }
  return 1;
}

/**
 * Compute coins earned on win.
 *
 * base + challengeNumber × perChallengeFactor + starBonus × (stars - 1)
 *
 * Requirements: 7.1.2
 */
export function computeCoinsEarned(
  challengeNumber: number,
  stars: 1 | 2 | 3,
): number {
  const base = BASE_COIN_REWARD + challengeNumber * COIN_REWARD_PER_CHALLENGE;
  const bonus = STAR_BONUS_COINS * (stars - 1);
  return base + bonus;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Navigation route params accepted by GameScreen. */
export interface GameScreenParams {
  challengeNumber?: number;
  /** When true, generate today's daily challenge instead of the numbered one. */
  isDaily?: boolean;
}

/** Minimal navigation prop shape (React Navigation stack). */
interface GameScreenProps {
  route?: { params?: GameScreenParams };
  navigation?: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
    goBack: () => void;
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GameScreen — mounts the game loop, manages session lifecycle.
 *
 * Requirements: 7.1.1, 7.1.2
 */
export default function GameScreen({ route, navigation }: GameScreenProps): React.JSX.Element {
  const bridge = usePhysicsSharedState();

  // ---------------------------------------------------------------------------
  // Determine challenge number and variant
  // ---------------------------------------------------------------------------

  const highestChallengeShown = useOnboardingStore(
    (state) => state.highestChallengeShown,
  );

  const isDaily = route?.params?.isDaily ?? false;
  const challengeNumber = isDaily
    ? 0
    : (route?.params?.challengeNumber ?? highestChallengeShown + 1);

  // Ref mirrors to avoid stale closures in callbacks
  const loopStartedRef = useRef(false);
  const challengeNumberRef = useRef(challengeNumber);
  const challengeConfigRef = useRef<ChallengeConfig | null>(null);

  // ---------------------------------------------------------------------------
  // Win handler (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const handleWin = useCallback((): void => {
    const store = useChallengeStore.getState();
    store.recordWin();

    const config = challengeConfigRef.current;
    const timerRemaining = store.timerRemaining;
    const totalTimer = config?.timer.totalSeconds ?? 60;
    const cn = challengeNumberRef.current;

    // Compute stars and coins
    const stars = computeStarCount(timerRemaining, totalTimer);
    const coinsEarned = computeCoinsEarned(cn, stars);

    // Credit coins to economy
    useEconomyStore.getState().creditCoins(coinsEarned, 'challenge_win');

    // Trigger audio victory state
    audioEngine.onVictory();

    // Progress onboarding tutorial (unlock features gated on this challenge number)
    useOnboardingStore.getState().progressTutorial(cn);

    // Log analytics — challenge_won event with stars, coins, challengeNumber
    analytics.logEvent('challenge_won', {
      challengeNumber: cn,
      stars,
      coinsEarned,
      isDaily,
    });

    // Show Victory Modal (Alert as placeholder — will be replaced by VictoryModal component)
    const starEmojis = '⭐'.repeat(stars);
    Alert.alert(
      `🎉 Challenge Complete! ${starEmojis}`,
      `${stars} star${stars !== 1 ? 's' : ''}\nCoins earned: ${coinsEarned}`,
      [
        {
          text: 'Next Challenge',
          onPress: (): void => {
            navigation?.navigate('Game', {
              challengeNumber: cn + 1,
            });
          },
        },
        {
          text: 'Home',
          onPress: (): void => navigation?.goBack(),
        },
      ],
    );
  }, [navigation, isDaily]);

  // ---------------------------------------------------------------------------
  // Continue / Defeat flow (Task 7.1.2 — loss path helpers)
  // ---------------------------------------------------------------------------

  /** Show the Defeat modal after a player declines to continue. */
  const showDefeatModal = useCallback((): void => {
    audioEngine.onDefeat();

    const cn = challengeNumberRef.current;
    analytics.logEvent('challenge_defeated', {
      challengeNumber: cn,
      isDaily,
    });

    // Show Defeat Modal (Alert placeholder — will be replaced by DefeatModal component)
    Alert.alert(
      '💀 Challenge Failed',
      'Better luck next time!',
      [
        {
          text: 'Try Again',
          onPress: (): void => {
            // Reload the same challenge
            const config = isDaily
              ? new ChallengeGenerator().generateDaily(new Date())
              : generateChallenge(cn);

            useChallengeStore.getState().loadChallenge(config);
            challengeConfigRef.current = config;

            GameLoop.start({
              challengeConfig: config,
              bridge,
              onWin: handleWin,
              onTimerExpire: handleTimerExpire,
            });

            audioEngine.startChallenge(config.arena.themeId);
          },
        },
        {
          text: 'Home',
          style: 'cancel',
          onPress: (): void => navigation?.goBack(),
        },
      ],
    );
  }, [bridge, handleWin, isDaily, navigation]); // handleTimerExpire declared below

  // Forward ref so showDefeatModal can call handleTimerExpire after it is defined
  const handleTimerExpireRef = useRef<() => void>(() => undefined);

  // ---------------------------------------------------------------------------
  // Timer expiry / loss handler (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const handleTimerExpire = useCallback((): void => {
    const store = useChallengeStore.getState();
    store.recordLoss();

    const cn = challengeNumberRef.current;

    analytics.logEvent('timer_expired', {
      challengeNumber: cn,
      isDaily,
    });

    // Show Continue Modal (Alert placeholder — will be replaced by ContinueModal component)
    Alert.alert(
      '⏰ Time\'s Up!',
      'Would you like to continue playing?',
      [
        {
          text: 'Continue',
          onPress: (): void => {
            // Use continue: restore timer, increment continue count
            useChallengeStore.getState().useContinue();

            const config = challengeConfigRef.current;
            if (config) {
              // Restart the loop with fresh time for this continue
              GameLoop.start({
                challengeConfig: config,
                bridge,
                onWin: handleWin,
                onTimerExpire: handleTimerExpireRef.current,
              });
            }

            analytics.logEvent('continue_used', {
              challengeNumber: cn,
              continueCount: useChallengeStore.getState().continueCount,
            });
          },
        },
        {
          text: 'Give Up',
          style: 'destructive',
          onPress: (): void => showDefeatModal(),
        },
      ],
    );
  }, [bridge, handleWin, isDaily, showDefeatModal]);

  // Keep the ref up-to-date so showDefeatModal's Try Again uses the latest version
  useEffect(() => {
    handleTimerExpireRef.current = handleTimerExpire;
  }, [handleTimerExpire]);

  // ---------------------------------------------------------------------------
  // Quit flow: hardware back button / quit action (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const handleQuit = useCallback((): void => {
    const cn = challengeNumberRef.current;

    Alert.alert(
      'Quit Challenge?',
      'Your progress in this challenge will be lost.',
      [
        {
          text: 'Keep Playing',
          style: 'cancel',
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: (): void => {
            GameLoop.stop();
            audioEngine.pause();

            analytics.logEvent('challenge_quit', {
              challengeNumber: cn,
              isDaily,
            });

            navigation?.goBack();
          },
        },
      ],
    );
  }, [navigation, isDaily]);

  // Register Android hardware back handler
  useEffect(() => {
    const onBackPress = (): boolean => {
      handleQuit();
      // Return true to prevent default back navigation — our Alert handles it.
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return (): void => subscription.remove();
  }, [handleQuit]);

  // ---------------------------------------------------------------------------
  // Mount: load challenge and start game loop (Task 7.1.1)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loopStartedRef.current) {
      return;
    }
    loopStartedRef.current = true;

    // ── Step 1: Record start time for load-time measurement ──────────────────
    const startTime = Date.now();

    // ── Step 2: Generate challenge config ────────────────────────────────────
    // Supports both regular and daily challenges (Requirement 7.1.1)
    const config: ChallengeConfig = isDaily
      ? new ChallengeGenerator().generateDaily(new Date())
      : generateChallenge(challengeNumber);

    challengeConfigRef.current = config;

    // ── Step 3: Initialize challenge slice state ──────────────────────────────
    // challengeSlice.loadChallenge(config) — Requirement 7.1.1
    useChallengeStore.getState().loadChallenge(config);

    // ── Step 4: Start the game loop (initializes PhysicsWorld) ───────────────
    // PhysicsWorld is initialized via GameLoop.start() — Requirement 7.1.1
    GameLoop.start({
      challengeConfig: config,
      bridge,
      onWin: handleWin,
      onTimerExpire: handleTimerExpire,
    });

    // ── Step 5: Start audio (non-blocking) ───────────────────────────────────
    // audioEngine.startChallenge() — Requirement 7.1.1
    audioEngine.startChallenge(config.arena.themeId);

    // ── Step 6: Measure load time and log analytics ───────────────────────────
    const loadTimeMs = Date.now() - startTime;

    // Analytics: challenge_start event with challengeNumber and loadTimeMs
    // — Requirement 7.1.1
    analytics.logEvent('challenge_start', {
      challengeNumber: config.challengeNumber,
      loadTimeMs,
      isDaily: config.isDailyChallenge,
      difficultyScore: config.difficultyScore,
      templateId: config.templateId,
    });

    // Warn if load time exceeded the < 500ms target (Requirement 7.1.1 / 43.6)
    if (loadTimeMs > 500) {
      console.warn('[GameScreen] Challenge load time exceeded 500ms target:', loadTimeMs, 'ms');
    }

    // Cleanup on unmount
    return (): void => {
      GameLoop.stop();
      audioEngine.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // ---------------------------------------------------------------------------
  // Render — minimal placeholder layout
  // ---------------------------------------------------------------------------

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`Game screen, challenge ${challengeNumber}`}
      accessibilityRole="none"
    >
      <Text
        style={styles.challengeLabel}
        accessibilityRole="header"
      >
        {isDaily ? 'Daily Challenge' : `Challenge ${challengeNumber}`}
      </Text>

      {/* Game canvas will be inserted here by GameRenderer in a future task */}
      <View
        style={styles.arena}
        accessible={false}
        accessibilityLabel="Game arena"
      />

      <Text
        style={styles.hint}
        accessibilityRole="text"
      >
        Press the buttons to move the rings
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a2342',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  challengeLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 48,
    marginBottom: 8,
  },
  arena: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0d3562',
  },
  hint: {
    color: '#aac',
    fontSize: 13,
    paddingVertical: 16,
  },
});
