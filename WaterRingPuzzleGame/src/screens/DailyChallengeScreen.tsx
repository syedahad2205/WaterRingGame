/**
 * DailyChallengeScreen.tsx
 *
 * Daily challenge hub:
 *   - Countdown to midnight UTC reset
 *   - Today's challenge card with Play CTA
 *   - Daily leaderboard (top 5 + player row)
 *   - Completion state (if already played today)
 *
 * Requirements: 20.3
 * Task: 8.5.3
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useChallengeStore } from '../store/slices/challengeSlice';
import { useSocialStore } from '../store/slices/socialSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Icon } from '../components/icons/GameIcons';
import type { LeaderboardEntry as SocialLeaderboardEntry } from '../../types/social';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

function formatCountdown(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DailyEntry {
  rank: number;
  displayName: string;
  avatarIconName: string;
  score: number;
  completionTime: number;
  isCurrentPlayer?: boolean;
}

// ---------------------------------------------------------------------------
// Avatar emoji -> icon name mapping
// ---------------------------------------------------------------------------

const AVATAR_ICON_COLORS: Record<string, string> = {
  'crown': DS.colors.accent,
  'lightning': DS.colors.warning,
  'target': DS.colors.error,
  'water-drop': DS.colors.secondary,
  'profile': DS.colors.primary,
};

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

const FALLBACK_DAILY_ENTRIES: DailyEntry[] = [
  { rank: 1, displayName: 'DailyKing', avatarIconName: 'crown', score: 9950, completionTime: 38 },
  { rank: 2, displayName: 'QuickDrop', avatarIconName: 'lightning', score: 9800, completionTime: 45 },
  { rank: 3, displayName: 'PegMaster', avatarIconName: 'target', score: 9650, completionTime: 52 },
  { rank: 4, displayName: 'RingFlow', avatarIconName: 'water-drop', score: 9400, completionTime: 60 },
  { rank: 5, displayName: 'WaterPro', avatarIconName: 'water-drop', score: 9100, completionTime: 68 },
];

// ---------------------------------------------------------------------------
// CountdownDisplay — animated seconds digit
// ---------------------------------------------------------------------------

function CountdownDisplay({ seconds }: { seconds: number }): React.JSX.Element {
  const pulse = useSharedValue(1);

  useEffect((): void => {
    if (seconds <= 3600) {
      // Pulse when under an hour
      pulse.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        false,
      );
    }
  }, [pulse, seconds]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.countdownInner, pulseStyle]} accessible={true} accessibilityLabel={`Resets in ${formatCountdown(seconds)}`}>
      <View style={styles.countdownRow}>
        <Icon name="timer" size={DS.typography.size.title2} color={DS.colors.secondary} />
        <Text style={styles.countdownText}>{formatCountdown(seconds)}</Text>
      </View>
      <Text style={styles.countdownLabel}>until next daily</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// DailyLeaderboardRow
// ---------------------------------------------------------------------------

const DailyLeaderboardRow = React.memo(function DailyLeaderboardRow({ entry }: { entry: DailyEntry }): React.JSX.Element {
  const avatarInfo = { name: entry.avatarIconName as any, color: AVATAR_ICON_COLORS[entry.avatarIconName] ?? DS.colors.text.secondary };
  const isTop3 = entry.rank <= 3;

  return (
    <View
      style={[styles.lbRow, entry.isCurrentPlayer && styles.lbRowSelf]}
      accessible={true}
      accessibilityLabel={`Rank ${entry.rank}: ${entry.displayName}, score ${entry.score}, time ${entry.completionTime} seconds`}
    >
      {/* Rank column */}
      <View style={styles.lbRankContainer}>
        {isTop3 ? (
          <View style={styles.lbRankBadge}>
            <Icon name="trophy" size={DS.typography.size.callout} color={entry.rank === 1 ? DS.colors.accent : entry.rank === 2 ? DS.colors.text.secondary : DS.colors.warning} />
            <Badge
              value={entry.rank}
              variant="rank"
              color={entry.rank === 1 ? DS.colors.accent : entry.rank === 2 ? DS.colors.text.secondary : DS.colors.warning}
              style={styles.rankBadge}
            />
          </View>
        ) : (
          <Text style={styles.lbRankText} accessible={false}>#{entry.rank}</Text>
        )}
      </View>

      {/* Avatar */}
      <View style={[styles.lbAvatar, entry.isCurrentPlayer && styles.lbAvatarSelf]}>
        <Icon name={avatarInfo.name} size={DS.typography.size.callout} color={avatarInfo.color} />
      </View>

      {/* Name */}
      <Text style={[styles.lbName, entry.isCurrentPlayer && styles.lbNameSelf]} numberOfLines={1}>
        {entry.displayName}{entry.isCurrentPlayer ? ' (You)' : ''}
      </Text>

      {/* Score block */}
      <View style={styles.lbScoreBlock}>
        <Text style={styles.lbScore}>{entry.score.toLocaleString()}</Text>
        <Text style={styles.lbTime}>{entry.completionTime}s</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// DailyChallengeScreen
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export default function DailyChallengeScreen({ navigation: navProp }: { navigation?: { navigate: (s: string, p?: object) => void } }): React.JSX.Element {
  const navigation = useNavigation();
  const displayName = usePlayerStore((s) => s.displayName);
  const activeChallengeConfig = useChallengeStore((s) => s.activeChallengeConfig);
  const winLossState = useChallengeStore((s) => s.winLossState);
  const leaderboardCache = useSocialStore((s) => s.leaderboardCache);
  const [countdown, setCountdown] = useState(secondsUntilMidnightUTC);

  useEffect((): (() => void) => {
    const interval = setInterval((): void => setCountdown(secondsUntilMidnightUTC()), 1000);
    return (): void => clearInterval(interval);
  }, []);

  // Derive daily challenge number from date (consistent across the day)
  const dailyChallengeNumber = useMemo(() => {
    const now = new Date();
    const start = new Date(Date.UTC(2024, 0, 1)); // epoch for daily numbering
    return Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  }, []);

  // If the active challenge config matches today's daily and was won, mark as completed
  const todayCompleted = activeChallengeConfig?.challengeNumber === dailyChallengeNumber && winLossState === 'won';
  const todayStars = todayCompleted ? 3 : 0; // Star count not tracked per-daily; default to 3 on completion

  // Wire leaderboard data from store
  const dailyLeaderboardKey = `daily_${dailyChallengeNumber}`;
  const cachedDailyEntries = leaderboardCache[dailyLeaderboardKey];

  function mapToDailyEntry(entries: SocialLeaderboardEntry[]): DailyEntry[] {
    return entries.map((e) => ({
      rank: e.rank,
      displayName: e.displayName,
      avatarIconName: e.avatarUrl || 'profile',
      score: e.score,
      completionTime: Math.round(e.completionTimeMs / 1000),
    }));
  }

  const dailyEntries: DailyEntry[] = cachedDailyEntries
    ? mapToDailyEntry(cachedDailyEntries)
    : FALLBACK_DAILY_ENTRIES;

  const selfEntry: DailyEntry = {
    rank: 23,
    displayName: displayName ?? 'You',
    avatarIconName: 'profile',
    score: 7200,
    completionTime: 80,
    isCurrentPlayer: true,
  };

  const handlePlay = useCallback((): void => {
    // Use navProp if available (direct prop), fall back to useNavigation() hook
    const nav = navProp ?? navigation;
    (nav as any).navigate('Game', { isDaily: true });
  }, [navProp, navigation]);

  const renderRow = useCallback(({ item }: { item: DailyEntry }): React.JSX.Element => (
    <DailyLeaderboardRow entry={item} />
  ), []);

  return (
    <ScreenContainer accessibilityLabel="Daily Challenge Screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header with back button */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.pageTitle} accessibilityRole="header">Daily Challenge</Text>
        </View>

        {/* Countdown */}
        <GlassCard variant="strong" glow={DS.colors.secondary} style={styles.countdownCard}>
          <CountdownDisplay seconds={countdown} />
        </GlassCard>

        {/* Today's challenge card */}
        <GlassCard variant="medium" style={styles.challengeCard}>
          <View style={styles.challengeContent}>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeLabel}>{"TODAY'S CHALLENGE"}</Text>
              <View style={styles.challengeNumRow}>
                <Icon name="challenge" size={DS.typography.size.headline} color={DS.colors.secondary} />
                <Text style={styles.challengeNum}>{`Daily #${dailyChallengeNumber}`}</Text>
              </View>
              <Text style={styles.challengeDesc}>Precision Mode  ·  4 pegs  ·  90 seconds</Text>
              {todayCompleted ? (
                <View style={styles.completedRow}>
                  {[1, 2, 3].map((i): React.JSX.Element => (
                    <Icon
                      key={i}
                      name={i <= todayStars ? 'star-filled' : 'star-empty'}
                      size={DS.typography.size.callout}
                      color={i <= todayStars ? DS.colors.accent : DS.colors.text.tertiary}
                    />
                  ))}
                  <View style={styles.completedBadgeWrap}>
                    <Icon name="check" size={DS.typography.size.caption1} color={DS.colors.success} />
                    <Badge variant="status" value="Completed" color={DS.colors.success} />
                  </View>
                </View>
              ) : null}
            </View>
            <View style={styles.challengeAction}>
              {todayCompleted ? (
                <GlassButton
                  variant="ghost"
                  size="lg"
                  iconLeft="replay"
                  label="Replay"
                  onPress={handlePlay}
                />
              ) : (
                <GlassButton
                  variant="primary"
                  size="lg"
                  iconLeft="play"
                  label="Play"
                  onPress={handlePlay}
                />
              )}
            </View>
          </View>
        </GlassCard>

        {/* Leaderboard */}
        <SectionHeader title="Today's Leaderboard" style={styles.sectionHeader} />
        <GlassCard variant="subtle" noAnimation style={styles.lbCard}>
          <FlatList
            data={dailyEntries}
            renderItem={renderRow}
            keyExtractor={(item): string => String(item.rank)}
            scrollEnabled={false}
          />
        </GlassCard>

        {/* Pinned self row */}
        <GlassCard variant="medium" glow={DS.colors.primary} style={styles.selfRowWrap}>
          <DailyLeaderboardRow entry={selfEntry} />
        </GlassCard>

        <View style={{ height: DS.spacing.xxxl }} />
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
    paddingTop: DS.spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
    marginBottom: DS.spacing.xl,
  },
  pageTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
    letterSpacing: DS.typography.letterSpacing.title2,
  },

  // Countdown
  countdownCard: {
    alignItems: 'center',
    marginBottom: DS.spacing.lg,
  },
  countdownInner: {
    alignItems: 'center',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  countdownText: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.black,
    letterSpacing: DS.typography.letterSpacing.title1,
    fontVariant: ['tabular-nums'],
  },
  countdownLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    textAlign: 'center',
    marginTop: DS.spacing.xxs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Challenge card
  challengeCard: {
    marginBottom: DS.spacing.xl,
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  challengeInfo: {
    flex: 1,
    gap: DS.spacing.xxs,
  },
  challengeLabel: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  challengeNumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
  },
  challengeNum: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.headline,
    fontWeight: DS.typography.weight.heavy,
    letterSpacing: DS.typography.letterSpacing.headline,
  },
  challengeDesc: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
    marginTop: DS.spacing.xxs,
  },
  completedBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
    marginLeft: DS.spacing.xs,
  },
  challengeAction: {
    alignItems: 'center',
  },

  // Section header
  sectionHeader: {
    marginBottom: DS.spacing.sm,
  },

  // Leaderboard
  lbCard: {
    overflow: 'hidden',
    marginBottom: DS.spacing.xxxs,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing.md,
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.glass.border,
  },
  lbRowSelf: {
    backgroundColor: 'rgba(10,132,255,0.08)',
  },
  lbRankContainer: {
    width: DS.spacing.xxxl,
    alignItems: 'center',
  },
  lbRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxxs,
  },
  rankBadge: {
    // Positioned next to trophy icon
  },
  lbRankText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.semibold,
  },
  lbAvatar: {
    width: DS.spacing.xxxl,
    height: DS.spacing.xxxl,
    borderRadius: DS.spacing.lg,
    backgroundColor: DS.colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lbAvatarSelf: {
    backgroundColor: 'rgba(10,132,255,0.15)',
  },
  lbName: {
    flex: 1,
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.footnote,
    fontWeight: DS.typography.weight.semibold,
  },
  lbNameSelf: {
    color: DS.colors.primary,
  },
  lbScoreBlock: {
    alignItems: 'flex-end',
  },
  lbScore: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.footnote,
    fontWeight: DS.typography.weight.bold,
  },
  lbTime: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
  },

  // Self row pinned
  selfRowWrap: {
    overflow: 'hidden',
    marginTop: DS.spacing.xxs,
  },
});
