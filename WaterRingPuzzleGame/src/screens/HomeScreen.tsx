/**
 * HomeScreen.tsx
 *
 * Primary hub screen — the first thing an authenticated player sees.
 *
 * Sections:
 *   - Header: greeting, coin balance, streak indicator
 *   - Hero: current / next challenge card with Play CTA
 *   - Daily Challenge countdown card (links to DailyChallengeScreen)
 *   - Feature unlock cards (visible only after onboarding gates open)
 *   - Quick Stats row
 *
 * Requirements: 20.1, 20.2
 * Task: 8.5.2
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../app/Navigation';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useOnboardingStore } from '../store/slices/onboardingSlice';
import { usePlayerProgressionStore } from '../store/slices/playerProgressionSlice';
import { canClaimToday, claimDailyReward, getUpcomingRewards, DAILY_REWARDS } from '../features/progression/DailyRewardService';
import { DS } from '../constants/designSystem';
import { triggerHaptic } from '../constants/hapticPatterns';
import { useAudio } from '../hooks/useAudio';
import { Icon } from '../components/icons/GameIcons';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { StatCard } from '../components/ui/StatCard';
import { getActiveEvent } from '../constants/seasonalEvents';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = StackScreenProps<RootStackParamList, 'MainTabs'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds remaining as HH:MM:SS */
function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Seconds until midnight UTC */
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CoinBadge({ balance }: { balance: number }): React.JSX.Element {
  return (
    <GlassCard
      variant="subtle"
      noAnimation
      style={styles.coinBadge}
      accessibilityLabel={`Coin balance: ${balance}`}
    >
      <Icon name="coin" size={18} color={DS.colors.accent} />
      <Text style={styles.coinText}>{balance.toLocaleString()}</Text>
    </GlassCard>
  );
}

function StreakBadge({ streak }: { streak: number }): React.JSX.Element {
  return (
    <View
      style={styles.streakBadge}
      accessible={true}
      accessibilityLabel={`${streak} day streak`}
    >
      <Icon name="streak" size={18} color={DS.colors.warning} />
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

interface HeroChallengeCardProps {
  challengeNumber: number;
  onPlay: () => void;
}

function HeroChallengeCard({ challengeNumber, onPlay }: HeroChallengeCardProps): React.JSX.Element {
  return (
    <GlassCard variant="strong" glow={DS.colors.primary} style={styles.heroCard}>
      <View style={styles.heroContent}>
        <Text style={styles.heroSubtitle} accessible={false}>CURRENT CHALLENGE</Text>
        <Text
          style={styles.heroChallenge}
          accessibilityRole="header"
          accessibilityLabel={`Challenge ${challengeNumber}`}
        >
          #{challengeNumber}
        </Text>
        <Text style={styles.heroDesc} accessible={false}>
          Standard Mode · 3 pegs · 60 seconds
        </Text>

        {/* Star record */}
        <View style={styles.heroStars} accessible={true} accessibilityLabel="Best: 2 stars">
          {[1, 2, 3].map((i) => (
            <Icon
              key={i}
              name={i <= 2 ? 'star-filled' : 'star-empty'}
              size={18}
              color={i <= 2 ? DS.colors.accent : DS.colors.text.tertiary}
            />
          ))}
          <Text style={styles.heroBestLabel}>Best</Text>
        </View>
      </View>

      {/* Play button */}
      <View style={styles.playButtonWrapper}>
        <GlassButton
          label="Play"
          variant="primary"
          size="lg"
          iconLeft="play"
          onPress={onPlay}
          style={styles.playButton}
        />
      </View>
    </GlassCard>
  );
}

interface DailyCardProps {
  countdown: string;
  onPress: () => void;
}

function DailyCard({ countdown, onPress }: DailyCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Daily challenge. Resets in ${countdown}.`}
    >
      <GlassCard variant="medium" noAnimation style={styles.dailyCard}>
        <View style={styles.dailyLeft}>
          <Icon name="timer" size={28} color={DS.colors.secondary} />
          <View>
            <Text style={styles.dailyTitle}>Daily Challenge</Text>
            <Text style={styles.dailySubtitle}>Resets in {countdown}</Text>
          </View>
        </View>
        <Icon name="chevron-right" size={24} color={DS.colors.text.tertiary} />
      </GlassCard>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Feature shortcut mapping
// ---------------------------------------------------------------------------

const SHORTCUTS = [
  { icon: 'leaderboard' as const, label: 'Leaderboard', screen: 'Leaderboard' as const },
  { icon: 'store' as const, label: 'Store', screen: 'Store' as const },
  { icon: 'gift' as const, label: 'Inventory', screen: 'Inventory' as const },
  { icon: 'trophy' as const, label: 'Achievements', screen: 'Achievements' as const },
];

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

/**
 * HomeScreen — primary hub with challenge entry, daily card, and quick stats.
 *
 * Requirements: 20.1, 20.2
 * Task: 8.5.2
 */
// eslint-disable-next-line max-lines-per-function
export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const audio = useAudio();
  const displayName = usePlayerStore((s) => s.displayName);
  const level = usePlayerStore((s) => s.level);
  const totalStars = usePlayerStore((s) => s.totalStars);
  const prestige = usePlayerStore((s) => s.prestige);
  const coinBalance = useEconomyStore((s) => s.coinBalance);
  const highestChallengeShown = useOnboardingStore((s) => s.highestChallengeShown);
  const currentChallengeNumber = highestChallengeShown > 0 ? highestChallengeShown + 1 : 1;

  // Streak from progression store
  const streak = usePlayerProgressionStore((s) => s.currentStreak);

  // Daily reward state
  const lastClaimDate = usePlayerProgressionStore((s) => s.lastDailyClaimDate);
  const dailyRewardsClaimed = usePlayerProgressionStore((s) => s.dailyRewardsClaimed);
  const [showDailyReward, setShowDailyReward] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{amount: number; label: string} | null>(null);

  // Daily countdown
  const [countdown, setCountdown] = useState(secondsUntilMidnightUTC);
  useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      setCountdown(secondsUntilMidnightUTC());
    }, 1000);
    return (): void => clearInterval(interval);
  }, []);

  // Check daily reward availability on mount
  useEffect(() => {
    if (canClaimToday(lastClaimDate)) {
      setShowDailyReward(true);
    }
  }, [lastClaimDate]);

  function handleClaimDailyReward(): void {
    const progression = usePlayerProgressionStore.getState();
    const reward = claimDailyReward(progression.dailyRewardsClaimed + 1);

    // Credit coins to economy store FIRST -- if this fails, claim date stays unchanged
    try {
      useEconomyStore.getState().creditCoins(reward.amount, 'daily_reward');
    } catch {
      // creditCoins failed — do not mark as claimed so user can retry
      return;
    }

    progression.setLastDailyClaimDate(new Date().toISOString());
    progression.incrementDailyRewardsClaimed();
    setClaimedReward({ amount: reward.amount, label: reward.label });
    triggerHaptic('coinEarned');
    audio.playSFX('coin_collect');
    // Auto-hide after 2 seconds
    setTimeout(() => {
      setShowDailyReward(false);
      setClaimedReward(null);
    }, 2000);
  }

  // Entrance animations
  const headerOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(30);
  const cardsOpacity = useSharedValue(0);

  useEffect((): void => {
    headerOpacity.value = withTiming(1, { duration: 400 });
    heroTranslateY.value = withDelay(100, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
    cardsOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
  }, [headerOpacity, heroTranslateY, cardsOpacity]);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));
  const cardsStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value }));

  function handlePlay(): void {
    triggerHaptic('buttonPressHard');
    navigation.navigate('Game', { challengeNumber: currentChallengeNumber });
  }

  function handleDailyPress(): void {
    triggerHaptic('buttonPress');
    navigation.navigate('DailyChallenge');
  }

  const firstName = displayName ? displayName.split(' ')[0] : 'Player';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* -- Header --------------------------------------------------- */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting} accessibilityRole="header">
              {greeting}, {firstName}
            </Text>
            <Text style={styles.levelTag}>Level {level}</Text>
          </View>
          <View style={styles.headerRight}>
            <StreakBadge streak={streak} />
            <CoinBadge balance={coinBalance} />
          </View>
        </Animated.View>

        {/* -- Daily reward banner -------------------------------------- */}
        {showDailyReward && (
          <Animated.View style={cardsStyle}>
            <Pressable onPress={handleClaimDailyReward} accessibilityRole="button" accessibilityLabel="Claim daily reward">
              <GlassCard variant="strong" glow={DS.colors.accent} style={styles.dailyRewardCard}>
                <Icon name="gift" size={32} color={DS.colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.dailyRewardTitle}>
                    {claimedReward ? 'Claimed!' : 'Daily Reward Available!'}
                  </Text>
                  <Text style={styles.dailyRewardSubtitle}>
                    {claimedReward ? `+${claimedReward.amount} coins` : 'Tap to claim your reward'}
                  </Text>
                </View>
                {!claimedReward && <Icon name="chevron-right" size={24} color={DS.colors.accent} />}
              </GlassCard>
            </Pressable>
          </Animated.View>
        )}

        {/* -- Seasonal event banner ------------------------------------ */}
        {(() => {
          const activeEvent = getActiveEvent();
          if (!activeEvent) return null;
          const eventAccent = activeEvent.accentColor;
          const startDate = new Date(new Date().getFullYear(), activeEvent.startMonth - 1, activeEvent.startDay);
          const endDate = new Date(startDate.getTime() + activeEvent.durationDays * 86400000);
          const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000));
          return (
            <Animated.View style={cardsStyle}>
              <GlassCard variant="strong" glow={eventAccent} style={styles.eventBanner}>
                <View style={[styles.eventIconWrapper, { backgroundColor: eventAccent + '33' }]}>
                  <Icon name="sparkle" size={28} color={eventAccent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.eventTitle, { color: eventAccent }]}>
                    {activeEvent.name}
                  </Text>
                  <Text style={styles.eventSubtitle}>
                    {daysLeft} day{daysLeft !== 1 ? 's' : ''} remaining · {activeEvent.exclusiveRewards.length} exclusive rewards
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={eventAccent} />
              </GlassCard>
            </Animated.View>
          );
        })()}

        {/* -- Hero challenge card -------------------------------------- */}
        <Animated.View style={[styles.heroSection, heroStyle]}>
          <HeroChallengeCard
            challengeNumber={currentChallengeNumber}
            onPlay={handlePlay}
          />
        </Animated.View>

        {/* -- Daily challenge card ------------------------------------- */}
        <Animated.View style={[styles.dailySection, cardsStyle]}>
          <DailyCard
            countdown={formatCountdown(countdown)}
            onPress={handleDailyPress}
          />
        </Animated.View>

        {/* -- Feature shortcuts ---------------------------------------- */}
        <Animated.View style={[styles.shortcutRow, cardsStyle]}>
          {SHORTCUTS.map((item) => (
            <Pressable
              key={item.label}
              onPress={(): void => navigation.navigate(item.screen)}
              style={({ pressed }: { pressed: boolean }) => [
                styles.shortcutWrapper,
                pressed ? styles.shortcutPressed : undefined,
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <GlassCard variant="subtle" noAnimation style={styles.shortcut}>
                <Icon name={item.icon} size={24} color={DS.colors.text.secondary} />
                <Text style={styles.shortcutLabel}>{item.label}</Text>
              </GlassCard>
            </Pressable>
          ))}
        </Animated.View>

        {/* -- Quick stats ---------------------------------------------- */}
        <Animated.View style={[styles.statsRow, cardsStyle]}>
          <StatCard
            icon="star"
            iconColor={DS.colors.accent}
            value={totalStars ?? 0}
            label="Stars"
            variant="compact"
            style={styles.statItem}
          />
          <StatCard
            icon="target"
            iconColor={DS.colors.secondary}
            value={Math.max(0, currentChallengeNumber - 1)}
            label="Challenges"
            variant="compact"
            style={styles.statItem}
          />
          <StatCard
            icon="gem"
            iconColor={DS.colors.primary}
            value={prestige}
            label="Prestige"
            variant="compact"
            style={styles.statItem}
          />
        </Animated.View>

        <View style={{ height: DS.spacing.xl }} />
      </ScrollView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: DS.spacing.lg,
    paddingTop: DS.spacing.md,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: DS.spacing.xl,
  },
  headerLeft: {
    gap: DS.spacing.xxs,
  },
  headerRight: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
    alignItems: 'center',
  },
  greeting: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.heavy,
    letterSpacing: DS.typography.letterSpacing.title3,
  },
  levelTag: {
    color: DS.colors.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
    letterSpacing: DS.typography.letterSpacing.caption1,
  },

  // Coin badge
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: DS.spacing.xs,
    gap: DS.spacing.xxs,
    borderColor: 'rgba(255,215,0,0.25)',
  },
  coinText: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.bold,
  },

  // Streak badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,87,34,0.12)',
    borderRadius: DS.radius.pill,
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: DS.spacing.xs,
    gap: DS.spacing.xxs,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.25)',
  },
  streakText: {
    color: DS.colors.warning,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.bold,
  },

  // Hero card
  heroSection: {
    marginBottom: DS.spacing.md,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.lg,
    padding: DS.spacing.xl,
  },
  heroContent: {
    flex: 1,
    gap: DS.spacing.xxs,
  },
  heroSubtitle: {
    color: DS.colors.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heroChallenge: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.display,
    fontWeight: DS.typography.weight.black,
    lineHeight: DS.typography.size.display + 4,
  },
  heroDesc: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
  },
  heroStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
    marginTop: DS.spacing.xxs,
  },
  heroBestLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    marginLeft: DS.spacing.xxs,
  },

  // Play button
  playButtonWrapper: {
    ...DS.shadows.glow.primary,
  },
  playButton: {
    minWidth: 80,
  },

  // Daily card
  dailySection: {
    marginBottom: DS.spacing.md,
  },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: DS.spacing.lg,
  },
  dailyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  dailyTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
  },
  dailySubtitle: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    marginTop: 2,
  },

  // Shortcut grid
  shortcutRow: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
    marginBottom: DS.spacing.md,
  },
  shortcutWrapper: {
    flex: 1,
  },
  shortcutPressed: {
    opacity: 0.7,
  },
  shortcut: {
    alignItems: 'center',
    paddingVertical: DS.spacing.md,
    gap: DS.spacing.xs,
  },
  shortcutLabel: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.semibold,
    textTransform: 'uppercase',
    letterSpacing: DS.typography.letterSpacing.caption2,
  },

  // Quick stats
  statsRow: {
    flexDirection: 'row',
    gap: DS.spacing.sm,
  },
  statItem: {
    flex: 1,
  },

  // Daily reward banner
  dailyRewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  dailyRewardTitle: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
  },
  dailyRewardSubtitle: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption1,
    marginTop: 2,
  },

  // Seasonal event banner
  eventBanner: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: DS.spacing.lg,
    gap: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  eventIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  eventTitle: {
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
  },
  eventSubtitle: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    marginTop: 2,
  },
});
