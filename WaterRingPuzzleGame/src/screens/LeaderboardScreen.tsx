/**
 * LeaderboardScreen.tsx
 *
 * Global, country, and friends leaderboard with scope and time-filter tabs.
 * The player's own row is always pinned at the bottom of the list.
 * When offline, shows last-fetched data with a "Last updated" timestamp.
 * Each row has a ghost-replay button when a replay is available.
 *
 * Requirements: 35.2, 20.2
 * Task: 8.4.2
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useSocialStore } from '../store/slices/socialSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer, GlassCard, GlassButton, Badge } from '../components/ui';
import { Icon } from '../components/icons/GameIcons';
import type { LeaderboardEntry as SocialLeaderboardEntry } from '../../types/social';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScopeFilter = 'global' | 'country' | 'friends';
type TimeFilter = 'today' | 'week' | 'allTime';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  country: string;
  score: number;
  completionTime: number; // seconds
  continuesUsed: number;
  hasReplay: boolean;
  avatarIconName: string;
}

// ---------------------------------------------------------------------------
// Fallback data (used when store cache is empty)
// ---------------------------------------------------------------------------

const FALLBACK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', displayName: 'AquaMaster', country: 'US', score: 9850, completionTime: 42, continuesUsed: 0, hasReplay: true, avatarIconName: 'trophy' },
  { rank: 2, userId: 'u2', displayName: 'RingKing', country: 'JP', score: 9720, completionTime: 51, continuesUsed: 0, hasReplay: true, avatarIconName: 'crown' },
  { rank: 3, userId: 'u3', displayName: 'WaveRider', country: 'DE', score: 9500, completionTime: 58, continuesUsed: 1, hasReplay: false, avatarIconName: 'water-drop' },
  { rank: 4, userId: 'u4', displayName: 'PegPro', country: 'BR', score: 9200, completionTime: 63, continuesUsed: 0, hasReplay: true, avatarIconName: 'target' },
  { rank: 5, userId: 'u5', displayName: 'Splasher99', country: 'GB', score: 8900, completionTime: 71, continuesUsed: 2, hasReplay: false, avatarIconName: 'water-drop' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSocialEntries(entries: SocialLeaderboardEntry[], ghosts: Record<string, string>): LeaderboardEntry[] {
  return entries.map((e) => ({
    rank: e.rank,
    userId: e.userId,
    displayName: e.displayName,
    country: '',
    score: e.score,
    completionTime: Math.round(e.completionTimeMs / 1000),
    continuesUsed: 0,
    hasReplay: ghosts[`${e.userId}_${e.challengeNumber}`] !== undefined,
    avatarIconName: e.avatarUrl || 'profile',
  }));
}

/** Map avatar icon name to color */
const AVATAR_ICON_COLORS: Record<string, string> = {
  'trophy': DS.colors.accent,
  'crown': DS.colors.accent,
  'water-drop': DS.colors.secondary,
  'target': DS.colors.primary,
  'profile': DS.colors.text.secondary,
};

/** Trophy colors by rank */
const RANK_TROPHY_COLORS: Record<number, string> = {
  1: DS.colors.accent,           // gold
  2: DS.colors.text.secondary,   // silver
  3: DS.colors.warning,          // bronze
};

/** Scope filter config */
const SCOPE_FILTERS: { key: ScopeFilter; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { key: 'global', label: 'Global', icon: 'leaderboard' },
  { key: 'country', label: 'Country', icon: 'target' },
  { key: 'friends', label: 'Friends', icon: 'friends' },
];

/** Time filter config */
const TIME_FILTERS: { key: TimeFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'allTime', label: 'All Time' },
];

// ---------------------------------------------------------------------------
// PodiumCard — special display for top 3
// ---------------------------------------------------------------------------

interface PodiumCardProps {
  entry: LeaderboardEntry;
  onGhostPress: () => void;
}

function PodiumCard({ entry, onGhostPress }: PodiumCardProps): React.JSX.Element {
  const isFirst = entry.rank === 1;
  const avatarColor = AVATAR_ICON_COLORS[entry.avatarIconName] ?? DS.colors.text.secondary;
  const trophyColor = RANK_TROPHY_COLORS[entry.rank] ?? DS.colors.text.secondary;
  const rankLabel = entry.rank === 1 ? '1st' : entry.rank === 2 ? '2nd' : '3rd';

  return (
    <GlassCard
      variant={isFirst ? 'strong' : 'medium'}
      glow={isFirst ? DS.colors.accent : undefined}
      noAnimation
      style={[styles.podiumCard, isFirst && styles.podiumCardFirst]}
    >
      <View style={styles.podiumInner}>
        {/* Rank badge */}
        <Badge
          value={rankLabel}
          variant={isFirst ? 'premium' : 'rank'}
          style={styles.podiumBadge}
        />

        {/* Avatar */}
        <View style={[styles.podiumAvatar, isFirst && styles.podiumAvatarFirst]}>
          <Icon name={entry.avatarIconName as any} size={isFirst ? 28 : 22} color={avatarColor} />
        </View>

        {/* Name */}
        <Text style={[styles.podiumName, isFirst && styles.podiumNameFirst]} numberOfLines={1}>
          {entry.displayName}
        </Text>

        {/* Score */}
        <Text style={styles.podiumScore}>{entry.score.toLocaleString()}</Text>

        {/* Time */}
        <View style={styles.podiumTimeRow}>
          <Icon name="timer" size={12} color={DS.colors.text.tertiary} />
          <Text style={styles.podiumTime}>{entry.completionTime}s</Text>
        </View>

        {/* Ghost replay */}
        {entry.hasReplay && (
          <Pressable
            onPress={onGhostPress}
            style={styles.podiumGhost}
            accessibilityRole="button"
            accessibilityLabel={`Watch ${entry.displayName}'s ghost replay`}
          >
            <Icon name="replay" size={14} color={DS.colors.text.secondary} />
          </Pressable>
        )}
      </View>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// LeaderboardRow component (Task 8.4.2)
// ---------------------------------------------------------------------------

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentPlayer: boolean;
  onGhostPress?: () => void;
}

const LeaderboardRow = React.memo(function LeaderboardRow({ entry, isCurrentPlayer, onGhostPress }: LeaderboardRowProps): React.JSX.Element {
  const trophyColor = RANK_TROPHY_COLORS[entry.rank];
  const avatarColor = AVATAR_ICON_COLORS[entry.avatarIconName] ?? DS.colors.text.secondary;

  return (
    <GlassCard
      variant={isCurrentPlayer ? 'medium' : 'subtle'}
      glow={isCurrentPlayer ? DS.colors.primary : undefined}
      noAnimation
      style={styles.rowCard}
    >
      <View
        style={styles.row}
        accessible={true}
        accessibilityLabel={`Rank ${entry.rank}: ${entry.displayName}, score ${entry.score}, time ${entry.completionTime} seconds`}
      >
        {/* Rank */}
        <View style={styles.rankContainer}>
          {trophyColor ? (
            <Icon name="trophy" size={20} color={trophyColor} />
          ) : (
            <Text style={styles.rankText}>#{entry.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, isCurrentPlayer && styles.avatarSelf]}>
          <Icon name={entry.avatarIconName as any} size={18} color={avatarColor} />
        </View>

        {/* Name + country */}
        <View style={styles.nameBlock}>
          <Text style={[styles.displayName, isCurrentPlayer && styles.displayNameSelf]} numberOfLines={1}>
            {entry.displayName}
            {isCurrentPlayer ? ' (You)' : ''}
          </Text>
          <Text style={styles.country} accessible={false}>{entry.country}</Text>
        </View>

        {/* Score + time */}
        <View style={styles.scoreBlock}>
          <Text style={styles.score}>{entry.score.toLocaleString()}</Text>
          <Text style={styles.time}>{entry.completionTime}s</Text>
        </View>

        {/* Ghost replay button */}
        {entry.hasReplay ? (
          <Pressable
            onPress={onGhostPress}
            style={({ pressed }: { pressed: boolean }) => [styles.ghostButton, pressed && styles.ghostButtonPressed]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`Watch ${entry.displayName}'s ghost replay`}
          >
            <Icon name="replay" size={16} color={DS.colors.text.secondary} />
          </Pressable>
        ) : (
          <View style={styles.ghostPlaceholder} />
        )}
      </View>
    </GlassCard>
  );
});

// ---------------------------------------------------------------------------
// LeaderboardScreen
// ---------------------------------------------------------------------------

/**
 * LeaderboardScreen — filterable leaderboard with player row pinned at bottom.
 *
 * Requirements: 35.2, 20.2
 * Task: 8.4.2
 */
// eslint-disable-next-line max-lines-per-function
export default function LeaderboardScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [scope, setScope] = useState<ScopeFilter>('global');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  const userId = usePlayerStore((state) => state.userId);
  const displayName = usePlayerStore((state) => state.displayName);
  const country = usePlayerStore((s) => s.country);

  const leaderboardCache = useSocialStore((s) => s.leaderboardCache);
  const lastLeaderboardFetch = useSocialStore((s) => s.lastLeaderboardFetch);
  const ghostCache = useSocialStore((s) => s.ghostCache);

  const leaderboardKey = `${scope}_${timeFilter}`;
  const cachedEntries = leaderboardCache[leaderboardKey];
  const entries: LeaderboardEntry[] = cachedEntries
    ? mapSocialEntries(cachedEntries, ghostCache)
    : FALLBACK_ENTRIES;

  const lastFetchTs = lastLeaderboardFetch[leaderboardKey];
  const staleLabel = lastFetchTs
    ? `Last updated: ${new Date(lastFetchTs).toLocaleTimeString()}`
    : 'Last updated: never';

  // Split top 3 from the rest
  const podiumEntries = entries.slice(0, 3);
  const listEntries = entries.slice(3);

  // Current player's row (pinned at bottom)
  const selfEntry: LeaderboardEntry = {
    rank: 47,
    userId: userId ?? 'me',
    displayName: displayName ?? 'You',
    country: country ?? 'US',
    score: 6200,
    completionTime: 95,
    continuesUsed: 1,
    hasReplay: false,
    avatarIconName: 'profile',
  };

  const handleGhostPress = useCallback((entry: LeaderboardEntry): void => {
    const ghostKey = `${entry.userId}_0`;
    const replayPath = ghostCache[ghostKey];
    if (replayPath) {
      // Ghost replay data available; ReplayViewer navigation would go here
      if (__DEV__) console.warn('[LeaderboardScreen] Ghost replay path:', replayPath);
    }
  }, [ghostCache]);

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

  const renderItem = useCallback(({ item }: { item: LeaderboardEntry }): React.JSX.Element => (
    <LeaderboardRow
      entry={item}
      isCurrentPlayer={item.userId === selfEntry.userId}
      onGhostPress={(): void => handleGhostPress(item)}
    />
  ), [selfEntry.userId, handleGhostPress]);

  return (
    <ScreenContainer accessibilityLabel="Leaderboard screen">
      {/* Header with back button */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="back" size={28} color={DS.colors.text.primary} />
        </Pressable>
        <Text style={styles.pageTitle} accessibilityRole="header">Leaderboard</Text>
        <Icon name="leaderboard" size={24} color={DS.colors.secondary} />
      </View>

      <Animated.View style={contentStyle}>
      {/* Scope filter */}
      <View style={styles.filterRow}>
        {SCOPE_FILTERS.map((s) => (
          <GlassButton
            key={s.key}
            label={s.label}
            variant={scope === s.key ? 'primary' : 'ghost'}
            size="sm"
            iconLeft={s.icon}
            onPress={(): void => setScope(s.key)}
            style={styles.filterButton}
          />
        ))}
      </View>

      {/* Time filter */}
      <View style={styles.filterRow}>
        {TIME_FILTERS.map((t) => (
          <GlassButton
            key={t.key}
            label={t.label}
            variant={timeFilter === t.key ? 'primary' : 'ghost'}
            size="sm"
            onPress={(): void => setTimeFilter(t.key)}
            style={styles.filterButton}
          />
        ))}
      </View>

      {/* Stale indicator */}
      <Text style={styles.staleLabel}>{staleLabel}</Text>

      {/* Top 3 podium */}
      <View style={styles.podiumRow}>
        {/* 2nd place — left */}
        {podiumEntries[1] && (
          <PodiumCard
            entry={podiumEntries[1]}
            onGhostPress={() => handleGhostPress(podiumEntries[1])}
          />
        )}
        {/* 1st place — center, elevated */}
        {podiumEntries[0] && (
          <PodiumCard
            entry={podiumEntries[0]}
            onGhostPress={() => handleGhostPress(podiumEntries[0])}
          />
        )}
        {/* 3rd place — right */}
        {podiumEntries[2] && (
          <PodiumCard
            entry={podiumEntries[2]}
            onGhostPress={() => handleGhostPress(podiumEntries[2])}
          />
        )}
      </View>

      {/* Remaining list */}
      <FlatList
        data={listEntries}
        renderItem={renderItem}
        keyExtractor={(item): string => item.userId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Pinned player row at bottom */}
      <View style={styles.selfRowContainer}>
        <LeaderboardRow
          entry={selfEntry}
          isCurrentPlayer={true}
        />
      </View>
      </Animated.View>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.sm,
    gap: DS.spacing.md,
  },
  pageTitle: {
    flex: 1,
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.heavy,
  },

  // Filters
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: DS.spacing.lg,
    gap: DS.spacing.sm,
    paddingVertical: DS.spacing.xs,
  },
  filterButton: {
    flex: 1,
  },

  // Stale label
  staleLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    textAlign: 'right',
    paddingHorizontal: DS.spacing.xl,
    paddingBottom: DS.spacing.xs,
  },

  // Podium
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.md,
    gap: DS.spacing.sm,
  },
  podiumCard: {
    flex: 1,
    padding: DS.spacing.sm,
  },
  podiumCardFirst: {
    marginTop: -DS.spacing.lg,
    padding: DS.spacing.md,
  },
  podiumInner: {
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  podiumBadge: {
    marginBottom: DS.spacing.xxs,
  },
  podiumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: DS.colors.glass.background,
    borderWidth: 1,
    borderColor: DS.colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarFirst: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderColor: DS.colors.accent,
    borderWidth: 2,
  },
  podiumName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
    textAlign: 'center',
  },
  podiumNameFirst: {
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
  },
  podiumScore: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
  },
  podiumTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  podiumTime: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
  },
  podiumGhost: {
    marginTop: DS.spacing.xxs,
    width: 44,
    height: 44,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // List
  list: {
    paddingHorizontal: DS.spacing.md,
    paddingBottom: DS.spacing.sm,
  },

  // Row card wrapper
  rowCard: {
    marginBottom: DS.spacing.xs,
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: DS.spacing.sm,
    paddingHorizontal: DS.spacing.md,
    gap: DS.spacing.sm,
  },

  // Rank
  rankContainer: {
    width: DS.spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.semibold,
  },

  // Avatar
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DS.colors.glass.background,
    borderWidth: 1,
    borderColor: DS.colors.glass.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelf: {
    borderColor: DS.colors.primary,
    borderWidth: 1.5,
  },

  // Name block
  nameBlock: {
    flex: 1,
    gap: 1,
  },
  displayName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.semibold,
  },
  displayNameSelf: {
    color: DS.colors.primary,
  },
  country: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
  },

  // Score block
  scoreBlock: {
    alignItems: 'flex-end',
    gap: 1,
  },
  score: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
  },
  time: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
  },

  // Ghost replay
  ghostButton: {
    width: 44,
    height: 44,
    borderRadius: DS.radius.sm,
    backgroundColor: DS.colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.colors.glass.border,
  },
  ghostButtonPressed: {
    opacity: 0.65,
  },
  ghostPlaceholder: {
    width: 44,
  },

  // Self row (pinned at bottom)
  selfRowContainer: {
    borderTopWidth: 1,
    borderTopColor: DS.colors.glass.border,
    paddingHorizontal: DS.spacing.md,
    paddingVertical: DS.spacing.xs,
    backgroundColor: DS.colors.surfaceDark,
  },
});
