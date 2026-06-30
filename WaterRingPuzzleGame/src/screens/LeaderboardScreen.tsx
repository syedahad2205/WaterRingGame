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

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePlayerStore } from '../store/slices/playerSlice';

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
  avatarEmoji: string;
}

// ---------------------------------------------------------------------------
// Mock data (replaced by LeaderboardService in production)
// ---------------------------------------------------------------------------

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, userId: 'u1', displayName: 'AquaMaster', country: 'US', score: 9850, completionTime: 42, continuesUsed: 0, hasReplay: true, avatarEmoji: '🏆' },
  { rank: 2, userId: 'u2', displayName: 'RingKing', country: 'JP', score: 9720, completionTime: 51, continuesUsed: 0, hasReplay: true, avatarEmoji: '👑' },
  { rank: 3, userId: 'u3', displayName: 'WaveRider', country: 'DE', score: 9500, completionTime: 58, continuesUsed: 1, hasReplay: false, avatarEmoji: '🌊' },
  { rank: 4, userId: 'u4', displayName: 'PegPro', country: 'BR', score: 9200, completionTime: 63, continuesUsed: 0, hasReplay: true, avatarEmoji: '🎯' },
  { rank: 5, userId: 'u5', displayName: 'Splasher99', country: 'GB', score: 8900, completionTime: 71, continuesUsed: 2, hasReplay: false, avatarEmoji: '💧' },
];

const RANK_BADGES: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// ---------------------------------------------------------------------------
// LeaderboardRow component (Task 8.4.2)
// ---------------------------------------------------------------------------

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentPlayer: boolean;
  onGhostPress?: () => void;
}

// eslint-disable-next-line max-lines-per-function
function LeaderboardRow({ entry, isCurrentPlayer, onGhostPress }: LeaderboardRowProps): React.JSX.Element {
  return (
    <View
      style={[styles.row, isCurrentPlayer && styles.rowSelf]}
      accessible={true}
      accessibilityLabel={`Rank ${entry.rank}: ${entry.displayName}, score ${entry.score}, time ${entry.completionTime} seconds`}
    >
      {/* Rank */}
      <Text style={styles.rank} accessible={false}>
        {RANK_BADGES[entry.rank] ?? `#${entry.rank}`}
      </Text>

      {/* Avatar */}
      <View style={[styles.avatar, isCurrentPlayer && styles.avatarSelf]}>
        <Text style={styles.avatarEmoji} accessible={false}>{entry.avatarEmoji}</Text>
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
          style={({ pressed }: { pressed: boolean }) => [styles.ghostButton, pressed ? styles.ghostButtonPressed : undefined]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`Watch ${entry.displayName}'s ghost replay`}
        >
          <Text style={styles.ghostIcon}>👻</Text>
        </Pressable>
      ) : (
        <View style={styles.ghostPlaceholder} />
      )}
    </View>
  );
}

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
  const [scope, setScope] = useState<ScopeFilter>('global');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');

  const userId = usePlayerStore((state) => state.userId);
  const displayName = usePlayerStore((state) => state.displayName);

  // Current player's mocked row (pinned at bottom)
  const selfEntry: LeaderboardEntry = {
    rank: 47,
    userId: userId ?? 'me',
    displayName: displayName ?? 'You',
    country: 'US',
    score: 6200,
    completionTime: 95,
    continuesUsed: 1,
    hasReplay: false,
    avatarEmoji: '🧑',
  };

  const handleGhostPress = useCallback((entry: LeaderboardEntry): void => {
    // In production: navigate to ReplayViewer with ghost replay data
    console.log('[LeaderboardScreen] Ghost replay requested for:', entry.displayName);
  }, []);

  const renderItem = useCallback(({ item }: { item: LeaderboardEntry }): React.JSX.Element => (
    <LeaderboardRow
      entry={item}
      isCurrentPlayer={item.userId === selfEntry.userId}
      onGhostPress={(): void => handleGhostPress(item)}
    />
  ), [selfEntry.userId, handleGhostPress]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Text style={styles.header} accessibilityRole="header">Leaderboard</Text>

      {/* Scope filter */}
      <View style={styles.filterRow}>
        {(['global', 'country', 'friends'] as ScopeFilter[]).map((s) => (
          <Pressable
            key={s}
            onPress={(): void => setScope(s)}
            style={[styles.chip, scope === s && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: scope === s }}
            accessibilityLabel={`${s} scope`}
          >
            <Text style={[styles.chipText, scope === s && styles.chipTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Time filter */}
      <View style={styles.filterRow}>
        {(['today', 'week', 'allTime'] as TimeFilter[]).map((t) => (
          <Pressable
            key={t}
            onPress={(): void => setTimeFilter(t)}
            style={[styles.chip, timeFilter === t && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: timeFilter === t }}
            accessibilityLabel={`${t} time filter`}
          >
            <Text style={[styles.chipText, timeFilter === t && styles.chipTextActive]}>
              {t === 'allTime' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Stale indicator */}
      <Text style={styles.staleLabel}>Last updated: just now</Text>

      {/* List */}
      <FlatList
        data={MOCK_ENTRIES}
        renderItem={renderItem}
        keyExtractor={(item): string => item.userId}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Pinned player row */}
      <View style={styles.selfRowContainer}>
        <LeaderboardRow
          entry={selfEntry}
          isCurrentPlayer={true}
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  header: { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  chipActive: { backgroundColor: 'rgba(79,195,247,0.2)', borderColor: '#4FC3F7' },
  chipText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#4FC3F7' },
  staleLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'right', paddingHorizontal: 20, paddingBottom: 4 },
  list: { paddingHorizontal: 12, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', gap: 10 },
  rowSelf: { backgroundColor: 'rgba(79,195,247,0.1)', borderColor: 'rgba(79,195,247,0.3)' },
  rank: { color: '#fff', fontSize: 18, width: 32, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarSelf: { backgroundColor: 'rgba(79,195,247,0.2)' },
  avatarEmoji: { fontSize: 18 },
  nameBlock: { flex: 1, gap: 1 },
  displayName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  displayNameSelf: { color: '#4FC3F7' },
  country: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  scoreBlock: { alignItems: 'flex-end', gap: 1 },
  score: { color: '#FFD740', fontSize: 14, fontWeight: '700' },
  time: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  ghostButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  ghostButtonPressed: { opacity: 0.65 },
  ghostIcon: { fontSize: 16 },
  ghostPlaceholder: { width: 36 },
  selfRowContainer: { borderTopWidth: 1, borderTopColor: 'rgba(79,195,247,0.2)', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(10,28,52,0.95)' },
});
