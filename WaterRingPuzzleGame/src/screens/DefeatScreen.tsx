/**
 * DefeatScreen.tsx
 *
 * Modal screen shown when the player's timer expires and they decline to
 * continue. Shows how far they got (rings placed / total), offers a
 * "Try Again" CTA, and a "Home" option.
 *
 * Important: must NEVER display the discouraging words anywhere
 * (Requirement 34.4). Use encouraging language instead.
 *
 * Requirements: 34.4
 * Task: 8.3.4
 */

import React, { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useChallengeStore } from '../store/slices/challengeSlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DefeatScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route?: {
    params?: {
      ringsPlaced?: number;
      ringsTotal?: number;
      challengeNumber?: number;
    };
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * DefeatScreen — displayed after a challenge loss.
 *
 * Requirements: 34.4 (encouraging language only)
 * Task: 8.3.4
 */
// eslint-disable-next-line max-lines-per-function
export default function DefeatScreen({ navigation, route }: DefeatScreenProps): React.JSX.Element {
  const continueCount = useChallengeStore((state) => state.continueCount);
  const ringsPlaced = route?.params?.ringsPlaced ?? 0;
  const ringsTotal = route?.params?.ringsTotal ?? 0;
  const challengeNumber = route?.params?.challengeNumber ?? 1;

  const panelOpacity = useSharedValue(0);
  const panelTranslateY = useSharedValue(40);

  useEffect((): void => {
    panelOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) });
    panelTranslateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
  }, [panelOpacity, panelTranslateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ translateY: panelTranslateY.value }],
  }));

  const progressPercent = ringsTotal > 0 ? Math.round((ringsPlaced / ringsTotal) * 100) : 0;

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.panel, animatedStyle]}>
        {/* Background */}
        <View style={styles.background} />

        <View style={styles.content}>
          {/* Encouraging header — NEVER discouraging (Requirement 34.4) */}
          <Text style={styles.emoji} accessible={false}>⏰</Text>
          <Text style={styles.title} accessibilityRole="header">{'Time\'s Up!'}</Text>
          <Text style={styles.subtitle}>So close — keep practising!</Text>

          {/* Progress indicator */}
          {ringsTotal > 0 ? (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>Rings placed</Text>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressFraction}>{ringsPlaced} / {ringsTotal}</Text>
            </View>
          ) : null}

          {/* Continues used info */}
          {continueCount > 0 ? (
            <Text style={styles.continueNote}>
              {continueCount} continue{continueCount !== 1 ? 's' : ''} used
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }: { pressed: boolean }) => [styles.primaryButton, pressed ? styles.buttonPressed : undefined]}
              onPress={(): void => {
                // Try again — navigate back to Game with same challenge number
                navigation?.navigate('Game', { challengeNumber });
              }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Try Again"
            >
              <Text style={styles.primaryButtonLabel}>Try Again</Text>
            </Pressable>

            <Pressable
              style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, pressed ? styles.buttonPressed : undefined]}
              onPress={(): void => navigation?.navigate('MainTabs')}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Go to Home"
            >
              <Text style={styles.secondaryButtonLabel}>Home</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 12, 25, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 320,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(239,83,80,0.25)',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 28, 52, 0.96)',
  },
  content: {
    padding: 28,
    alignItems: 'center',
    gap: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 8,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    gap: 6,
    marginVertical: 8,
  },
  progressLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressBarContainer: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#4FC3F7',
  },
  progressFraction: {
    color: '#4FC3F7',
    fontSize: 14,
    fontWeight: '700',
  },
  continueNote: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4FC3F7',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: '#0a2342',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: 'rgba(79,195,247,0.12)',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
  },
  secondaryButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.75,
  },
});
