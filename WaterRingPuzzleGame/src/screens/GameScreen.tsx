/**
 * GameScreen.tsx
 *
 * Main gameplay screen. Loads a challenge, starts the GameLoop, and manages
 * the full session lifecycle: start, win, loss, and quit.
 *
 * Navigation params:
 *   { challengeNumber?: number }
 *   If omitted, uses onboardingSlice.highestChallengeShown + 1.
 *
 * Requirements: 6.7, 7.1.1, 7.1.2
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
import { GameLoop } from '../features/game/core/GameLoop';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useOnboardingStore } from '../store/slices/onboardingSlice';
import { usePhysicsSharedState } from '../hooks/usePhysicsSharedState';
import { audioEngine } from '../features/audio/AudioEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Navigation route params accepted by GameScreen. */
export interface GameScreenParams {
  challengeNumber?: number;
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
  // Determine challenge number
  // ---------------------------------------------------------------------------

  const highestChallengeShown = useOnboardingStore(
    (state) => state.highestChallengeShown,
  );

  const challengeNumber = route?.params?.challengeNumber ?? highestChallengeShown + 1;

  // Track whether the loop is currently running (ref avoids stale closure).
  const loopStartedRef = useRef(false);
  const challengeNumberRef = useRef(challengeNumber);

  // ---------------------------------------------------------------------------
  // Win handler
  // ---------------------------------------------------------------------------

  const handleWin = useCallback(() => {
    const store = useChallengeStore.getState();
    store.recordWin();

    // Mock rewards: 50 + challengeNumber × 5 coins.
    const coinsEarned = 50 + challengeNumberRef.current * 5;

    Alert.alert(
      '🎉 You won!',
      `Coins earned: ${coinsEarned}`,
      [
        {
          text: 'Next Challenge',
          onPress: () => {
            navigation?.navigate('Game', {
              challengeNumber: challengeNumberRef.current + 1,
            });
          },
        },
        {
          text: 'Home',
          onPress: () => navigation?.goBack(),
        },
      ],
    );

    // Analytics placeholder.
    console.log('[Analytics] challenge_won', {
      challengeNumber: challengeNumberRef.current,
      coinsEarned,
    });
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Timer expiry handler
  // ---------------------------------------------------------------------------

  const handleTimerExpire = useCallback(() => {
    const store = useChallengeStore.getState();
    store.recordLoss();

    Alert.alert(
      "⏰ Time's up!",
      'Would you like to retry?',
      [
        {
          text: 'Retry',
          onPress: () => {
            // Reload the same challenge.
            const config = generateChallenge(challengeNumberRef.current);
            useChallengeStore.getState().loadChallenge(config);

            GameLoop.start({
              challengeConfig: config,
              bridge,
              onWin: handleWin,
              onTimerExpire: handleTimerExpire,
            });
          },
        },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => navigation?.goBack(),
        },
      ],
    );

    // Analytics placeholder.
    console.log('[Analytics] challenge_lost', {
      challengeNumber: challengeNumberRef.current,
    });
  }, [bridge, handleWin, navigation]);

  // ---------------------------------------------------------------------------
  // Mount: load challenge and start game loop
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (loopStartedRef.current) return;
    loopStartedRef.current = true;

    const startTime = Date.now();

    // Step 1: generate challenge config.
    const config = generateChallenge(challengeNumber);

    // Step 2: initialize challenge slice state.
    useChallengeStore.getState().loadChallenge(config);

    // Step 3: start the game loop.
    GameLoop.start({
      challengeConfig: config,
      bridge,
      onWin: handleWin,
      onTimerExpire: handleTimerExpire,
    });

    // Step 4: start audio (non-blocking).
    audioEngine.startChallenge(config.arena.themeId);

    // Analytics placeholder.
    const loadTimeMs = Date.now() - startTime;
    console.log('[Analytics] challenge_started', {
      challengeNumber,
      loadTimeMs,
    });

    // Challenge load time < 500ms target (Requirement 7.1.1).
    if (loadTimeMs > 500) {
      console.warn('[GameScreen] Challenge load time exceeded 500ms:', loadTimeMs);
    }

    // MMKV checkpoint written by GameLoop.start internally.

    return () => {
      // Unmount cleanup.
      GameLoop.stop();
      audioEngine.pause();
    };
  }, []); // Run once on mount.

  // ---------------------------------------------------------------------------
  // Quit flow: Android back button / hardware back
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const onBackPress = (): boolean => {
      Alert.alert(
        'Quit challenge?',
        'Your progress in this challenge will be lost.',
        [
          {
            text: 'Keep Playing',
            style: 'cancel',
          },
          {
            text: 'Quit',
            style: 'destructive',
            onPress: () => {
              GameLoop.stop();
              navigation?.goBack();
            },
          },
        ],
      );
      // Return true to prevent default back navigation.
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  // ---------------------------------------------------------------------------
  // Render — minimal placeholder layout
  // ---------------------------------------------------------------------------

  return (
    <View
      style={styles.container}
      accessible
      accessibilityLabel={`Game screen, challenge ${challengeNumber}`}
      accessibilityRole="none"
    >
      <Text
        style={styles.challengeLabel}
        accessibilityRole="header"
      >
        Challenge {challengeNumber}
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
