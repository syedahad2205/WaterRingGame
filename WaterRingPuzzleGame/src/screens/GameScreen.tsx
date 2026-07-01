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
 *          → compute coins → navigate to VictoryScreen → log analytics
 *          → onboardingSlice.progressTutorial(challengeNumber)
 *   Loss : timer expires → challengeSlice.recordLoss → navigate to ContinueScreen
 *          → if declined navigate to DefeatScreen
 *   Quit : hardware back / quit button → confirmation dialog → GameLoop.stop()
 *          → navigate back → log analytics
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import GameRenderer from '../features/game/rendering/GameRenderer';

import { generateChallenge } from '../features/game/generation/ChallengeGenerator';
import { ChallengeGenerator } from '../features/game/generation/ChallengeGenerator';
import { GameLoop } from '../features/game/core/GameLoop';
import { PhysicsWorld } from '../features/game/physics/PhysicsWorld';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useOnboardingStore } from '../store/slices/onboardingSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { usePlayerProgressionStore } from '../store/slices/playerProgressionSlice';
import { usePhysicsSharedState } from '../hooks/usePhysicsSharedState';
import { useAudio } from '../hooks/useAudio';
import { triggerHaptic } from '../constants/hapticPatterns';
import { DS } from '../constants/designSystem';
import { audioEngine } from '../features/audio/AudioEngine';
import { analyticsService } from '../services/firebase/AnalyticsService';
import { ANALYTICS_EVENTS } from '../constants/analyticsEvents';
import { AdService } from '../features/economy/AdService';
import { syncManager } from '../services/sync/SyncManager';
import { updateProgress } from '../features/progression/MissionService';
import { AchievementEngine } from '../features/progression/AchievementEngine';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { ChallengeConfig } from '../types/challenge';

// Stable singleton AchievementEngine — persists across handleWin calls
// so reportedUnlocks tracks previously fired events within this session.
const achievementEngine = new AchievementEngine();

// ---------------------------------------------------------------------------
// Module-level analytics reference (uses shared singleton from AnalyticsService)
// ---------------------------------------------------------------------------

const analytics = analyticsService;

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
// eslint-disable-next-line max-lines-per-function
export default function GameScreen({ route, navigation }: GameScreenProps): React.JSX.Element {
  const bridge = usePhysicsSharedState();
  const audio = useAudio();
  const [arenaSize, setArenaSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const handleArenaLayout = useCallback((event: LayoutChangeEvent): void => {
    const { width, height } = event.nativeEvent.layout;
    setArenaSize({ width, height });
  }, []);

  // ---------------------------------------------------------------------------
  // Determine challenge number and variant
  // ---------------------------------------------------------------------------

  const highestChallengeShown = useOnboardingStore(
    (state) => state.highestChallengeShown,
  );

  const isDaily = route?.params?.isDaily ?? false;
  const rawChallengeNumber = route?.params?.challengeNumber;
  const parsedChallengeNumber = isDaily
    ? 0
    : typeof rawChallengeNumber === 'string'
      ? parseInt(rawChallengeNumber, 10) || (highestChallengeShown + 1)
      : (rawChallengeNumber ?? highestChallengeShown + 1);
  // Guard against negative, zero (non-daily), NaN, or absurdly large deep-link values
  const challengeNumber = isDaily
    ? 0
    : (!Number.isFinite(parsedChallengeNumber) || parsedChallengeNumber < 1 || parsedChallengeNumber > 10000)
      ? (highestChallengeShown + 1)
      : parsedChallengeNumber;

  // Ref mirrors to avoid stale closures in callbacks
  const loopStartedRef = useRef(false);
  const challengeNumberRef = useRef(challengeNumber);
  const challengeConfigRef = useRef<ChallengeConfig | null>(null);
  /** Guard: prevents handleWin / handleTimerExpire from firing twice (race condition). */
  const hasEndedRef = useRef(false);

  // Keep challengeNumberRef in sync when props change (e.g. deep link mid-game).
  useEffect(() => {
    challengeNumberRef.current = challengeNumber;
  }, [challengeNumber]);

  // ---------------------------------------------------------------------------
  // Win handler (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const handleWin = useCallback((): void => {
    // Guard: prevent double-fire if win and timer-expire race each other.
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

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

    // Update lifetime stats
    const progression = usePlayerProgressionStore.getState();
    progression.incrementLifetimeGamesPlayed();
    progression.incrementLifetimeCoinsEarned(coinsEarned);

    // ── Update mission progress ──────────────────────────────────────────
    // challenge_complete and star_earned are the two events always fired on win.
    const allMissions = [...progression.dailyMissions, ...progression.weeklyMissions];
    let updatedMissions = updateProgress(allMissions, 'challenge_complete', 1);
    updatedMissions = updateProgress(updatedMissions, 'star_earned', stars);
    // Split back into daily / weekly and persist
    const dailyCount = progression.dailyMissions.length;
    progression.setDailyMissions(updatedMissions.slice(0, dailyCount));
    progression.setWeeklyMissions(updatedMissions.slice(dailyCount));

    // ── Evaluate achievements (stable singleton — avoids re-fire) ────────
    try {
      const playerState = require('../store/slices/playerSlice').usePlayerStore.getState();
      achievementEngine.evaluate({
        challengesCompleted: progression.lifetimeGamesPlayed,
        totalStars: (playerState?.totalStars ?? 0) + stars,
        currentWinStreak: progression.currentStreak,
        noContWins: progression.lifetimeGamesPlayed, // best-effort proxy
        fastWins: 0, // TODO: track fast wins in progression store
        dailiesCompleted: 0, // TODO: track daily completions
        prestigeCount: playerState?.prestige ?? 0,
        inTop10: false,
        allTemplateBronze: false,
        anyTemplatePlatinum: false,
      });
    } catch (err) {
      if (__DEV__) {
        console.warn('[GameScreen] Achievement evaluation failed:', err);
      }
    }

    // ── Enqueue cloud sync for this win ──────────────────────────────────
    syncManager.enqueue({
      type: 'score_submit',
      payload: {
        challengeNumber: cn,
        stars,
        coinsEarned,
        isDaily,
        completedAt: Date.now(),
      },
    });

    // Trigger audio + haptic victory feedback
    triggerHaptic('victory');
    audio.playSFX('victory_fanfare');
    audioEngine.onVictory();

    // Preload results screen sounds
    audio.preloadGroup('results');

    // Progress onboarding tutorial (unlock features gated on this challenge number)
    useOnboardingStore.getState().progressTutorial(cn);

    // Log analytics — challenge_won event with stars, coins, challengeNumber
    analytics.logEvent(ANALYTICS_EVENTS.GAME_COMPLETE, {
      challengeNumber: cn,
      stars,
      coinsEarned,
      isDaily,
    });

    // Navigate to VictoryScreen with earned rewards
    GameLoop.stop();
    navigation?.navigate('Victory', {
      stars,
      coinsEarned,
      challengeNumber: cn,
    });

    // Show interstitial ad if frequency allows
    AdService.getInstance().showInterstitial().catch(() => {});
  }, [navigation, isDaily, audio]);

  // ---------------------------------------------------------------------------
  // Continue / Defeat flow (Task 7.1.2 — loss path helpers)
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Timer expiry / loss handler (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const handleTimerExpire = useCallback((): void => {
    // Guard: prevent double-fire if timer-expire and win race each other.
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;

    const store = useChallengeStore.getState();
    store.recordLoss();

    usePlayerProgressionStore.getState().incrementLifetimeGamesPlayed();

    const cn = challengeNumberRef.current;
    const config = challengeConfigRef.current;
    const ringsTotal = config?.rings.length ?? 0;
    const ringsPlaced = store.pegStates.filter((p) => p.settledRingId != null).length;

    // Trigger audio + haptic defeat feedback
    triggerHaptic('defeat');
    audio.playSFX('defeat_sound');

    analytics.logEvent(ANALYTICS_EVENTS.GAME_FAIL, {
      challengeNumber: cn,
      isDaily,
    });

    // Show interstitial ad if frequency allows
    AdService.getInstance().showInterstitial().catch(() => {});

    // Navigate to ContinueScreen — it handles the continue/defeat decision
    GameLoop.stop();
    navigation?.navigate('Continue', {
      challengeNumber: cn,
      ringsPlaced,
      ringsTotal,
    });
  }, [isDaily, navigation, audio]);

  // ---------------------------------------------------------------------------
  // Quit flow: hardware back button / quit action (Task 7.1.2)
  // ---------------------------------------------------------------------------

  const [showQuitDialog, setShowQuitDialog] = useState(false);

  const handleQuit = useCallback((): void => {
    setShowQuitDialog(true);
  }, []);

  const handleConfirmQuit = useCallback((): void => {
    setShowQuitDialog(false);
    const cn = challengeNumberRef.current;
    GameLoop.stop();
    audio.pause();

    analytics.logEvent(ANALYTICS_EVENTS.GAME_QUIT, {
      challengeNumber: cn,
      isDaily,
    });

    navigation?.goBack();
  }, [navigation, isDaily, audio]);

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
    let config: ChallengeConfig;
    try {
      config = isDaily
        ? new ChallengeGenerator().generateDaily(new Date())
        : generateChallenge(challengeNumber);
    } catch (err) {
      if (__DEV__) console.warn('[GameScreen] Challenge generation failed:', err);
      navigation?.goBack();
      return;
    }

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

    // ── Step 4b: Wire progressive music hooks into physics/timer callbacks ────
    // These bridge useAudio lifecycle methods into the non-React GameLoop/PhysicsWorld.
    let ringLandCount = 0;
    const totalRings = config.rings.length;
    const midpointThreshold = Math.ceil(totalRings / 2);

    PhysicsWorld.setOnRingLandedCallback(() => {
      ringLandCount++;
      if (ringLandCount === 1) {
        audio.onFirstRingLanded();
      }
      if (ringLandCount === midpointThreshold) {
        audio.onChallengeMidpoint();
      }
    });

    GameLoop.setOnTimerAmberCallback(() => {
      audio.onTimerAmber();
    });
    GameLoop.setOnTimerCriticalCallback(() => {
      audio.onTimerCritical();
    });

    // ── Step 5: Preload gameplay sounds and start audio (non-blocking) ────────
    // audioEngine.startChallenge() — Requirement 7.1.1
    audio.preloadGroup('gameplay');
    audio.startChallenge(config.arena.themeId);

    // ── Step 6: Measure load time and log analytics ───────────────────────────
    const loadTimeMs = Date.now() - startTime;

    // Analytics: challenge_start event with challengeNumber and loadTimeMs
    // — Requirement 7.1.1
    analytics.logEvent(ANALYTICS_EVENTS.GAME_START, {
      challengeNumber: config.challengeNumber,
      loadTimeMs,
      isDaily: config.isDailyChallenge,
      difficultyScore: config.difficultyScore,
      templateId: config.templateId,
    });

    // Warn if load time exceeded the < 500ms target (Requirement 7.1.1 / 43.6)
    if (loadTimeMs > 500) {
      if (__DEV__) console.warn('[GameScreen] Challenge load time exceeded 500ms target:', loadTimeMs, 'ms');
    }

    // Cleanup on unmount
    return (): void => {
      GameLoop.stop();
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const config = challengeConfigRef.current;

  if (config == null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={DS.colors.primary} />
      </View>
    );
  }

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

      <View
        style={styles.arena}
        onLayout={handleArenaLayout}
        accessible={false}
        accessibilityLabel="Game arena"
      >
        {config != null && arenaSize.width > 0 && arenaSize.height > 0 ? (
          <GameRenderer
            bridge={bridge}
            config={config}
            width={arenaSize.width}
            height={arenaSize.height}
            isActive={true}
          />
        ) : null}
      </View>

      <ConfirmDialog
        visible={showQuitDialog}
        title="Quit Challenge?"
        message="Your progress in this challenge will be lost."
        confirmLabel="Quit"
        cancelLabel="Keep Playing"
        confirmVariant="destructive"
        onConfirm={handleConfirmQuit}
        onCancel={() => setShowQuitDialog(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  challengeLabel: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.headline,
    fontWeight: DS.typography.weight.semibold,
    letterSpacing: DS.typography.letterSpacing.headline,
    marginTop: DS.spacing.massive,
    marginBottom: DS.spacing.sm,
  },
  arena: {
    flex: 1,
    width: '100%',
    backgroundColor: DS.colors.surfaceDark,
  },
});
