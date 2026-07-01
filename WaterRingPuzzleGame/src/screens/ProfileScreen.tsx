/**
 * ProfileScreen.tsx
 *
 * Player profile hub: avatar + frame, username, rank badge with
 * progress bar, 3 pinned achievements, and completion score percentage.
 *
 * Requirements: 35.4
 * Task: 8.4.3
 */

import React, { useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Icon } from '../components/icons/GameIcons';
import type { IconName } from '../components/icons/GameIcons';

// ---------------------------------------------------------------------------
// Rank config
// ---------------------------------------------------------------------------

const RANK_COLOURS: Record<string, string> = {
  Ripple: DS.colors.text.secondary, Current: DS.colors.primary, Wave: DS.colors.secondary,
  Tide: DS.colors.rings.lavender, Surge: DS.colors.warning, Tempest: DS.colors.error,
  Maelstrom: DS.colors.rings.coral, Leviathan: DS.colors.accent,
};

const RANK_THRESHOLDS: [string, number][] = [
  ['Ripple', 0], ['Current', 50], ['Wave', 150], ['Tide', 300],
  ['Surge', 500], ['Tempest', 800], ['Maelstrom', 1200], ['Leviathan', 2000],
];

function computeRankProgress(level: number): number {
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (level >= RANK_THRESHOLDS[i][1]) {
      if (i === RANK_THRESHOLDS.length - 1) return 100; // Max rank
      const currentMin = RANK_THRESHOLDS[i][1];
      const nextMin = RANK_THRESHOLDS[i + 1][1];
      return Math.round(((level - currentMin) / (nextMin - currentMin)) * 100);
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// ProfileScreen
// ---------------------------------------------------------------------------

/**
 * ProfileScreen — player profile with rank, stats, and pinned achievements.
 *
 * Requirements: 35.4
 * Task: 8.4.3
 */
// eslint-disable-next-line max-lines-per-function
export default function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const player = usePlayerStore();
  const coinBalance = useEconomyStore((state) => state.coinBalance);

  const rank = (player.rank as string) ?? 'Ripple';
  const rankColor = RANK_COLOURS[rank] ?? DS.colors.text.secondary;

  const rankProgressPercent = computeRankProgress(player.level);

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

  // Pinned achievements — static fallback until a dedicated achievements store is available
  const pinnedAchievements = [
    { id: 'first_win', name: 'First Win', iconName: 'trophy' as IconName, description: 'Complete your first challenge' },
    { id: 'no_continue', name: 'Pure Run', iconName: 'gem' as IconName, description: 'Win without using a continue' },
    { id: 'streak_5', name: 'On a Roll', iconName: 'fire' as IconName, description: 'Win 5 challenges in a row' },
  ];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={contentStyle}>

        {/* Header with back button */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Avatar + frame */}
        <View style={styles.avatarSection}>
          <GlassCard variant="strong" borderRadius={DS.radius.pill} noAnimation style={styles.avatarFrame}>
            <View style={styles.avatar}>
              <Icon name="profile" size={40} />
            </View>
          </GlassCard>
        </View>

        {/* Name + username + level badge */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text
              style={styles.displayName}
              accessibilityRole="header"
              accessible={true}
              accessibilityLabel={`Player: ${player.displayName || 'Anonymous'}`}
            >
              {player.displayName || 'Anonymous'}
            </Text>
            <Badge variant="rank" value={`Lv.${player.level}`} />
          </View>
          {player.username ? (
            <Text style={styles.username} accessible={false}>@{player.username}</Text>
          ) : null}
        </View>

        {/* Rank badge + progress */}
        <GlassCard
          variant="medium"
          style={styles.rankCard}
          accessibilityLabel={`Rank: ${rank}. Progress to next rank: ${rankProgressPercent}%`}
        >
          <View style={styles.rankRow}>
            <Icon name="crown" size={28} />
            <View style={styles.rankInfo}>
              <Text style={[styles.rankName, { color: rankColor }]}>{rank}</Text>
              <ProgressBar
                value={rankProgressPercent / 100}
                color={rankColor}
                size="sm"
                showLabel
                label={`${rankProgressPercent}%`}
              />
            </View>
          </View>
        </GlassCard>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard icon="star" iconColor={DS.colors.accent} value={player.level ?? 1} label="Level" />
          <StatCard icon="coin" iconColor={DS.colors.accent} value={coinBalance ?? 0} label="Coins" />
          <StatCard icon="bolt" iconColor={DS.colors.secondary} value={player.xp ?? 0} label="XP" />
          <StatCard icon="crown" iconColor={DS.colors.rings.lavender} value={player.prestige ?? 0} label="Prestige" />
        </View>

        {/* Completion score */}
        <GlassCard variant="medium" style={styles.completionCard}>
          <Text style={styles.completionLabel}>Completion Score</Text>
          <Text style={styles.completionValue}>{player.completionScorePercent ?? 0}%</Text>
          <ProgressBar
            value={(player.completionScorePercent ?? 0) / 100}
            color={DS.colors.primary}
            size="md"
          />
        </GlassCard>

        {/* Pinned achievements */}
        <SectionHeader title="Pinned Achievements" />
        <View style={styles.achievementsList}>
          {pinnedAchievements.map((ach) => (
            <GlassCard
              key={ach.id}
              variant="subtle"
              style={styles.achievementRow}
              accessibilityLabel={`${ach.name}: ${ach.description}`}
            >
              <View style={styles.achievementContent}>
                <Icon name={ach.iconName} size={28} color={DS.colors.accent} />
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementName}>{ach.name}</Text>
                  <Text style={styles.achievementDesc}>{ach.description}</Text>
                </View>
              </View>
            </GlassCard>
          ))}
        </View>

        <View style={{ height: DS.spacing.xxxl }} />
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: DS.spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.xl,
    paddingVertical: DS.spacing.md,
  },
  headerTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.body,
    fontWeight: DS.typography.weight.bold,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: DS.spacing.sm,
  },
  avatarFrame: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: DS.radius.pill,
    backgroundColor: 'rgba(79,195,247,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: {
    alignItems: 'center',
    marginTop: DS.spacing.md,
    gap: DS.spacing.xxxs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  displayName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.heavy,
  },
  username: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.subhead,
  },
  rankCard: {
    marginHorizontal: DS.spacing.xl,
    marginTop: DS.spacing.lg,
    padding: DS.spacing.lg,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  rankInfo: {
    flex: 1,
    gap: DS.spacing.xxs,
  },
  rankName: {
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.lg,
    marginTop: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  completionCard: {
    marginHorizontal: DS.spacing.xl,
    marginTop: DS.spacing.md,
    padding: DS.spacing.lg,
    gap: DS.spacing.sm,
  },
  completionLabel: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.footnote,
    fontWeight: DS.typography.weight.semibold,
  },
  completionValue: {
    color: DS.colors.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
  },
  achievementsList: {
    marginHorizontal: DS.spacing.xl,
    gap: DS.spacing.sm,
  },
  achievementRow: {
    padding: DS.spacing.md,
  },
  achievementContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  achievementInfo: {
    flex: 1,
    gap: DS.spacing.xxxs,
  },
  achievementName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
  },
  achievementDesc: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption1,
  },
});
