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

import React, { useEffect, useState, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
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
import { usePlayerStore } from '../store/slices/playerSlice';

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
  avatarEmoji: string;
  score: number;
  completionTime: number;
  isCurrentPlayer?: boolean;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const MOCK_DAILY_ENTRIES: DailyEntry[] = [
  { rank: 1, displayName: 'DailyKing', avatarEmoji: '👑', score: 9950, completionTime: 38 },
  { rank: 2, displayName: 'QuickDrop', avatarEmoji: '⚡', score: 9800, completionTime: 45 },
  { rank: 3, displayName: 'PegMaster', avatarEmoji: '🎯', score: 9650, completionTime: 52 },
  { rank: 4, displayName: 'RingFlow', avatarEmoji: '🌊', score: 9400, completionTime: 60 },
  { rank: 5, displayName: 'WaterPro', avatarEmoji: '💧', score: 9100, completionTime: 68 },
];

const RANK_BADGES: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

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
    <Animated.View style={pulseStyle} accessible={true} accessibilityLabel={`Resets in ${formatCountdown(seconds)}`}>
      <Text style={styles.countdownText}>{formatCountdown(seconds)}</Text>
      <Text style={styles.countdownLabel}>until next daily</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// DailyLeaderboardRow
// ---------------------------------------------------------------------------

function DailyLeaderboardRow({ entry }: { entry: DailyEntry }): React.JSX.Element {
  return (
    <View
      style={[styles.lbRow, entry.isCurrentPlayer && styles.lbRowSelf]}
      accessible={true}
      accessibilityLabel={`Rank ${entry.rank}: ${entry.displayName}, score ${entry.score}, time ${entry.completionTime} seconds`}
    >
      <Text style={styles.lbRank} accessible={false}>{RANK_BADGES[entry.rank] ?? `#${entry.rank}`}</Text>
      <View style={[styles.lbAvatar, entry.isCurrentPlayer && styles.lbAvatarSelf]}>
        <Text style={styles.lbAvatarEmoji} accessible={false}>{entry.avatarEmoji}</Text>
      </View>
      <Text style={[styles.lbName, entry.isCurrentPlayer && styles.lbNameSelf]} numberOfLines={1}>
        {entry.displayName}{entry.isCurrentPlayer ? ' (You)' : ''}
      </Text>
      <View style={styles.lbScoreBlock}>
        <Text style={styles.lbScore}>{entry.score.toLocaleString()}</Text>
        <Text style={styles.lbTime}>{entry.completionTime}s</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DailyChallengeScreen
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export default function DailyChallengeScreen({ navigation }: { navigation?: { navigate: (s: string, p?: object) => void } }): React.JSX.Element {
  const displayName = usePlayerStore((s) => s.displayName);
  const [countdown, setCountdown] = useState(secondsUntilMidnightUTC);

  useEffect((): (() => void) => {
    const interval = setInterval((): void => setCountdown(secondsUntilMidnightUTC()), 1000);
    return (): void => clearInterval(interval);
  }, []);

  // Mock: today's challenge not yet completed
  const todayCompleted = false;
  const todayStars = 0;

  const selfEntry: DailyEntry = {
    rank: 23,
    displayName: displayName ?? 'You',
    avatarEmoji: '🧑',
    score: 7200,
    completionTime: 80,
    isCurrentPlayer: true,
  };

  const handlePlay = useCallback((): void => {
    navigation?.navigate('Game', { isDaily: true });
  }, [navigation]);

  const renderRow = useCallback(({ item }: { item: DailyEntry }): React.JSX.Element => (
    <DailyLeaderboardRow entry={item} />
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Title */}
        <Text style={styles.title} accessibilityRole="header">Daily Challenge</Text>

        {/* Countdown */}
        <View style={styles.countdownCard}>
          <CountdownDisplay seconds={countdown} />
        </View>

        {/* Today's challenge card */}
        <View style={styles.challengeCard}>
          <View style={styles.challengeInfo}>
            <Text style={styles.challengeLabel}>{'TODAY\'S CHALLENGE'}</Text>
            <Text style={styles.challengeNum}>🗓️ Daily #127</Text>
            <Text style={styles.challengeDesc}>Precision Mode · 4 pegs · 90 seconds</Text>
            {todayCompleted ? (
              <View style={styles.completedRow}>
                {[1, 2, 3].map((i): React.JSX.Element => (
                  <Text key={i} style={[styles.star, i <= todayStars && styles.starFilled]} accessible={false}>
                    {i <= todayStars ? '★' : '☆'}
                  </Text>
                ))}
                <Text style={styles.completedLabel}>Completed!</Text>
              </View>
            ) : null}
          </View>
          <Pressable
            onPress={handlePlay}
            style={({ pressed }: { pressed: boolean }) => [
              styles.playBtn,
              todayCompleted && styles.playBtnReplay,
              pressed ? styles.playBtnPressed : undefined,
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={todayCompleted ? 'Replay daily challenge' : 'Play daily challenge'}
          >
            <Text style={styles.playBtnText}>{todayCompleted ? '↺ Replay' : '▶ Play'}</Text>
          </Pressable>
        </View>

        {/* Leaderboard */}
        <Text style={styles.sectionTitle}>{'Today\'s Leaderboard'}</Text>
        <View style={styles.lbCard}>
          <FlatList
            data={MOCK_DAILY_ENTRIES}
            renderItem={renderRow}
            keyExtractor={(item): string => String(item.rank)}
            scrollEnabled={false}
          />
        </View>

        {/* Pinned self row */}
        <View style={styles.selfRowWrap}>
          <DailyLeaderboardRow entry={selfEntry} />
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  countdownCard: { backgroundColor: 'rgba(79,195,247,0.07)', borderRadius: 18, padding: 20, alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(79,195,247,0.2)' },
  countdownText: { color: '#4FC3F7', fontSize: 42, fontWeight: '900', letterSpacing: 2, fontVariant: ['tabular-nums'] },
  countdownLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 12 },
  challengeInfo: { flex: 1, gap: 4 },
  challengeLabel: { color: '#4FC3F7', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  challengeNum: { color: '#fff', fontSize: 20, fontWeight: '800' },
  challengeDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  star: { fontSize: 16, color: 'rgba(255,255,255,0.2)' },
  starFilled: { color: '#FFD740' },
  completedLabel: { color: '#66BB6A', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  playBtn: { backgroundColor: '#4FC3F7', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', minWidth: 80 },
  playBtnReplay: { backgroundColor: 'rgba(79,195,247,0.2)', borderWidth: 1.5, borderColor: '#4FC3F7' },
  playBtnPressed: { opacity: 0.8 },
  playBtnText: { color: '#070f1e', fontWeight: '800', fontSize: 14 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 10 },
  lbCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginBottom: 2 },
  lbRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  lbRowSelf: { backgroundColor: 'rgba(79,195,247,0.08)' },
  lbRank: { color: '#fff', fontSize: 18, width: 30, textAlign: 'center' },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  lbAvatarSelf: { backgroundColor: 'rgba(79,195,247,0.2)' },
  lbAvatarEmoji: { fontSize: 16 },
  lbName: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  lbNameSelf: { color: '#4FC3F7' },
  lbScoreBlock: { alignItems: 'flex-end' },
  lbScore: { color: '#FFD740', fontSize: 13, fontWeight: '700' },
  lbTime: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
  selfRowWrap: { borderTopWidth: 1, borderTopColor: 'rgba(79,195,247,0.2)', backgroundColor: 'rgba(10,28,52,0.9)', borderRadius: 12, overflow: 'hidden' },
});
