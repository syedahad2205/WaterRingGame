/**
 * ProfileScreen.tsx
 *
 * Player profile hub: avatar + frame + banner, username, rank badge with
 * progress bar, 3 pinned achievements, and completion score percentage.
 *
 * Requirements: 35.4
 * Task: 8.4.3
 */

import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Rank config
// ---------------------------------------------------------------------------

const RANK_ICONS: Record<string, string> = {
  Ripple: '💧', Current: '🌀', Wave: '🌊', Tide: '🌙',
  Surge: '⚡', Tempest: '🌪️', Maelstrom: '🌀', Leviathan: '🐉',
};

const RANK_COLOURS: Record<string, string> = {
  Ripple: '#90A4AE', Current: '#42A5F5', Wave: '#26C6DA',
  Tide: '#AB47BC', Surge: '#FFA726', Tempest: '#EF5350',
  Maelstrom: '#EC407A', Leviathan: '#FFD740',
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <View style={styles.statCard} accessible={true} accessibilityLabel={`${label}: ${value}`}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
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
  const player = usePlayerStore();
  const coinBalance = useEconomyStore((state) => state.coinBalance);

  const rank = (player.rank as string) ?? 'Ripple';
  const rankIcon = RANK_ICONS[rank] ?? '💧';
  const rankColor = RANK_COLOURS[rank] ?? '#90A4AE';

  // Mock progress to next rank (replace with LevelSystem calculation)
  const rankProgressPercent = 65;

  // Mock pinned achievements
  const pinnedAchievements = [
    { id: 'first_win', name: 'First Win', icon: '🏅', description: 'Complete your first challenge' },
    { id: 'no_continue', name: 'Pure Run', icon: '💎', description: 'Win without using a continue' },
    { id: 'streak_5', name: 'On a Roll', icon: '🔥', description: 'Win 5 challenges in a row' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Banner background */}
        <View style={styles.banner}>
          <View style={styles.bannerBg} />
          <Text style={styles.bannerLabel} accessible={false}>🌊🌊🌊</Text>
        </View>

        {/* Avatar + frame */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarFrame, { borderColor: rankColor }]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji} accessible={false}>
                {player.avatarUrl ?? '🧑'}
              </Text>
            </View>
          </View>
        </View>

        {/* Name + username */}
        <View style={styles.nameSection}>
          <Text
            style={styles.displayName}
            accessibilityRole="header"
            accessible={true}
            accessibilityLabel={`Player: ${player.displayName || 'Anonymous'}`}
          >
            {player.displayName || 'Anonymous'}
          </Text>
          {player.username ? (
            <Text style={styles.username} accessible={false}>@{player.username}</Text>
          ) : null}
        </View>

        {/* Rank badge + progress */}
        <View
          style={[styles.rankBadge, { borderColor: rankColor }]}
          accessible={true}
          accessibilityLabel={`Rank: ${rank}. Progress to next rank: ${rankProgressPercent}%`}
        >
          <Text style={styles.rankIcon} accessible={false}>{rankIcon}</Text>
          <View style={styles.rankInfo}>
            <Text style={[styles.rankName, { color: rankColor }]}>{rank}</Text>
            <View style={styles.rankProgressBar}>
              <View style={[styles.rankProgressFill, { width: `${rankProgressPercent}%`, backgroundColor: rankColor }]} />
            </View>
          </View>
          <Text style={styles.rankPercent}>{rankProgressPercent}%</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Level" value={player.level ?? 1} />
          <StatCard label="Coins" value={(coinBalance ?? 0).toLocaleString()} />
          <StatCard label="XP" value={(player.xp ?? 0).toLocaleString()} />
          <StatCard label="Prestige" value={player.prestige ?? 0} />
        </View>

        {/* Completion score */}
        <View style={styles.completionCard}>
          <Text style={styles.completionLabel}>Completion Score</Text>
          <Text style={styles.completionValue}>{player.completionScorePercent ?? 0}%</Text>
          <View style={styles.completionBar}>
            <View
              style={[styles.completionFill, { width: `${player.completionScorePercent ?? 0}%` }]}
            />
          </View>
        </View>

        {/* Pinned achievements */}
        <Text style={styles.sectionTitle} accessibilityRole="header">Pinned Achievements</Text>
        <View style={styles.achievementsList}>
          {pinnedAchievements.map((ach) => (
            <View
              key={ach.id}
              style={styles.achievementRow}
              accessible={true}
              accessibilityLabel={`${ach.name}: ${ach.description}`}
            >
              <Text style={styles.achievementIcon} accessible={false}>{ach.icon}</Text>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementName}>{ach.name}</Text>
                <Text style={styles.achievementDesc}>{ach.description}</Text>
              </View>
            </View>
          ))}
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
  scrollContent: { paddingBottom: 32 },
  banner: { height: 120, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  bannerBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 53, 98, 0.9)' },
  bannerLabel: { fontSize: 48, opacity: 0.25 },
  avatarSection: { alignItems: 'center', marginTop: -44 },
  avatarFrame: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, padding: 3, backgroundColor: '#070f1e' },
  avatar: { flex: 1, borderRadius: 40, backgroundColor: 'rgba(79,195,247,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 36 },
  nameSection: { alignItems: 'center', marginTop: 10, gap: 2 },
  displayName: { color: '#fff', fontSize: 22, fontWeight: '800' },
  username: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  rankBadge: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 14, borderWidth: 1.5, gap: 12 },
  rankIcon: { fontSize: 28 },
  rankInfo: { flex: 1, gap: 4 },
  rankName: { fontSize: 16, fontWeight: '700' },
  rankProgressBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  rankProgressFill: { height: '100%', borderRadius: 3 },
  rankPercent: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 3 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  completionCard: { marginHorizontal: 20, marginTop: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  completionLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  completionValue: { color: '#4FC3F7', fontSize: 24, fontWeight: '800' },
  completionBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 4, backgroundColor: '#4FC3F7' },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginHorizontal: 20, marginTop: 22, marginBottom: 10 },
  achievementsList: { marginHorizontal: 20, gap: 8 },
  achievementRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(255,215,64,0.15)', gap: 14 },
  achievementIcon: { fontSize: 28 },
  achievementInfo: { flex: 1, gap: 2 },
  achievementName: { color: '#fff', fontSize: 14, fontWeight: '700' },
  achievementDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
});
