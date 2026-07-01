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
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { AdService } from '../features/economy/AdService';
import { DS } from '@/constants/designSystem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Icon } from '@/components/icons/GameIcons';
import { ProgressBar } from '@/components/ui/ProgressBar';

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
export default function DefeatScreen({ navigation, route }: DefeatScreenProps): React.JSX.Element {
  const continueCount = useChallengeStore((state) => state.continueCount);
  const ringsPlaced = route?.params?.ringsPlaced ?? 0;
  const ringsTotal = route?.params?.ringsTotal ?? 0;
  const challengeNumber = route?.params?.challengeNumber ?? 1;

  const progressPercent = ringsTotal > 0 ? Math.round((ringsPlaced / ringsTotal) * 100) : 0;

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withDelay(100, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  return (
    <View style={styles.backdrop}>
      <GlassCard
        variant="frosted"
        borderRadius={DS.radius.dialog}
        glow={DS.colors.warning}
        noAnimation={false}
        style={styles.card}
      >
        <Animated.View style={[styles.content, contentStyle]}>
          {/* Encouraging header -- NEVER discouraging (Requirement 34.4) */}
          <Icon
            name="timer"
            size={56}
            color={DS.colors.warning}
            style={styles.icon}
          />

          <Text
            style={styles.title}
            accessibilityRole="header"
          >
            {"Time's Up!"}
          </Text>

          <Text style={styles.subtitle}>
            So close -- keep practising!
          </Text>

          {/* Progress indicator */}
          {ringsTotal > 0 ? (
            <View style={styles.progressSection}>
              <Text style={styles.progressLabel}>RINGS PLACED</Text>
              <ProgressBar
                value={ringsTotal > 0 ? ringsPlaced / ringsTotal : 0}
                size="lg"
                color={DS.colors.secondary}
                showLabel
                label={`${ringsPlaced} / ${ringsTotal}`}
                style={styles.progressBar}
              />
            </View>
          ) : null}

          {/* Continues used info */}
          {continueCount > 0 ? (
            <Text style={styles.continueNote}>
              {continueCount} continue{continueCount !== 1 ? 's' : ''} used
            </Text>
          ) : null}

          <View style={styles.buttonRow}>
            <GlassButton
              label="Try Again"
              variant="primary"
              iconLeft="replay"
              size="lg"
              onPress={(): void => {
                navigation?.navigate('Game', { challengeNumber });
              }}
              style={styles.button}
            />

            <GlassButton
              label="Watch Ad +50"
              variant="accent"
              iconLeft="coin"
              size="lg"
              onPress={async () => {
                const adService = AdService.getInstance();
                try {
                  const reward = await adService.showRewardedAd('coins');
                  if (reward) {
                    useEconomyStore.getState().creditCoins(reward.amount, 'ad_reward');
                  }
                } catch (err) {
                  if (__DEV__) {
                    console.warn('[DefeatScreen] Rewarded ad failed:', err);
                  }
                }
              }}
              style={styles.button}
            />

            <GlassButton
              label="Home"
              variant="ghost"
              iconLeft="home"
              size="lg"
              onPress={(): void => navigation?.navigate('MainTabs')}
              style={styles.button}
            />
          </View>
        </Animated.View>
      </GlassCard>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 320,
  },
  content: {
    padding: DS.spacing.xxl,
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  icon: {
    marginBottom: DS.spacing.xxs,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
    textAlign: 'center',
  },
  subtitle: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.subhead,
    textAlign: 'center',
    marginBottom: DS.spacing.sm,
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
    gap: DS.spacing.xs,
    marginVertical: DS.spacing.sm,
  },
  progressLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: DS.typography.letterSpacing.caption1,
  },
  progressBar: {
    width: '100%',
  },
  continueNote: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.footnote,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginTop: DS.spacing.md,
  },
  button: {
    flex: 1,
  },
});
