/**
 * AchievementsScreen.tsx
 *
 * Full achievement browser: all achievements in a grid, colour-coded by
 * locked/unlocked state, with in-progress bars for partially completed ones.
 * Tapping an achievement shows its description and unlock condition.
 *
 * Requirements: 35.6
 * Task: 8.5.3
 */

import React, { useState, useCallback } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: AchievementTier;
  unlocked: boolean;
  /** 0–1 progress for in-progress achievements. 1 = complete. */
  progress: number;
  progressLabel?: string; // e.g. "12 / 50"
  xpReward: number;
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_win',    name: 'First Ring',       description: 'Complete your first challenge.',            icon: '🏅', tier: 'bronze',   unlocked: true,  progress: 1,    xpReward: 50 },
  { id: 'no_continue', name: 'Pure Run',           description: 'Win without using a continue.',            icon: '💎', tier: 'gold',     unlocked: true,  progress: 1,    xpReward: 200 },
  { id: 'streak_5',    name: 'On a Roll',          description: 'Win 5 challenges in a row.',               icon: '🔥', tier: 'silver',   unlocked: true,  progress: 1,    xpReward: 100 },
  { id: 'streak_25',   name: 'Unstoppable',        description: 'Win 25 challenges in a row.',              icon: '⚡', tier: 'platinum', unlocked: false, progress: 0.2, progressLabel: '5 / 25',  xpReward: 500 },
  { id: 'daily_7',     name: 'Daily Devotee',      description: 'Complete 7 daily challenges.',             icon: '🗓️', tier: 'silver',   unlocked: false, progress: 0.57, progressLabel: '4 / 7', xpReward: 150 },
  { id: 'daily_30',    name: 'Monthly Master',     description: 'Complete 30 daily challenges.',            icon: '📅', tier: 'gold',     unlocked: false, progress: 0.13, progressLabel: '4 / 30', xpReward: 400 },
  { id: 'stars_100',   name: 'Star Collector',     description: 'Earn 100 total stars.',                   icon: '⭐', tier: 'silver',   unlocked: false, progress: 0.42, progressLabel: '42 / 100', xpReward: 200 },
  { id: 'stars_500',   name: 'Constellation',      description: 'Earn 500 total stars.',                   icon: '🌟', tier: 'gold',     unlocked: false, progress: 0.08, progressLabel: '42 / 500', xpReward: 600 },
  { id: 'precision',   name: 'Precision Artist',   description: 'Complete 10 Precision challenges.',       icon: '🎯', tier: 'silver',   unlocked: false, progress: 0.3,  progressLabel: '3 / 10', xpReward: 250 },
  { id: 'no_time',     name: 'Speed Demon',        description: 'Win a challenge with > 45 s remaining.',  icon: '💨', tier: 'gold',     unlocked: false, progress: 0,    xpReward: 300 },
  { id: 'top_10',      name: 'Leaderboard Climber',description: 'Reach the global top 10.',                icon: '🏆', tier: 'platinum', unlocked: false, progress: 0,    xpReward: 1000 },
  { id: 'prestige',    name: 'Reborn',             description: 'Reach Prestige 1.',                       icon: '♾️', tier: 'platinum', unlocked: false, progress: 0,    xpReward: 2000 },
];

const TIER_COLOURS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#B0BEC5',
  gold: '#FFD740',
  platinum: '#80DEEA',
};

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------

function ProgressBar({ progress, color }: { progress: number; color: string }): React.JSX.Element {
  const fillWidth = useSharedValue(0);

  React.useEffect((): void => {
    fillWidth.value = withTiming(Math.min(1, progress), { duration: 600, easing: Easing.out(Easing.ease) });
  }, [fillWidth, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// AchievementCard
// ---------------------------------------------------------------------------

function AchievementCard({ item, onPress }: { item: Achievement; onPress: () => void }): React.JSX.Element {
  const tierColor = TIER_COLOURS[item.tier];
  const isPartial = !item.unlocked && item.progress > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.card,
        item.unlocked && { borderColor: `${tierColor}55` },
        !item.unlocked && styles.cardLocked,
        pressed ? styles.cardPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.unlocked ? 'Unlocked' : 'Locked'}. ${item.description}`}
      accessibilityState={{ disabled: false }}
    >
      <Text style={[styles.cardIcon, !item.unlocked && styles.cardIconLocked]} accessible={false}>
        {item.unlocked ? item.icon : '🔒'}
      </Text>
      <Text style={[styles.cardName, !item.unlocked && styles.cardNameLocked]} numberOfLines={2}>
        {item.name}
      </Text>
      {/* Tier dot */}
      <View style={[styles.tierDot, { backgroundColor: item.unlocked ? tierColor : 'rgba(255,255,255,0.15)' }]} />
      {/* In-progress bar */}
      {isPartial ? (
        <ProgressBar progress={item.progress} color={tierColor} />
      ) : null}
      {item.unlocked ? (
        <Text style={[styles.xpTag, { color: tierColor }]}>+{item.xpReward} XP</Text>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// DetailModal
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
function DetailModal({ item, onClose }: { item: Achievement | null; onClose: () => void }): React.JSX.Element | null {
  if (!item) return null;
  const tierColor = TIER_COLOURS[item.tier];

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose} accessible={false}>
        <View style={[styles.modalPanel, { borderColor: `${tierColor}55` }]}>
          <Text style={styles.modalIcon} accessible={false}>
            {item.unlocked ? item.icon : '🔒'}
          </Text>
          <Text style={styles.modalName} accessibilityRole="header">{item.name}</Text>
          <View style={[styles.tierPill, { backgroundColor: `${tierColor}22`, borderColor: `${tierColor}55` }]}>
            <Text style={[styles.tierPillText, { color: tierColor }]}>
              {item.tier.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.modalDesc}>{item.description}</Text>
          {!item.unlocked && item.progress > 0 ? (
            <View style={styles.modalProgress}>
              <ProgressBar progress={item.progress} color={tierColor} />
              {item.progressLabel ? (
                <Text style={styles.modalProgressLabel}>{item.progressLabel}</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.modalXp}>Reward: +{item.xpReward} XP</Text>
          <Pressable
            onPress={onClose}
            style={styles.modalClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// AchievementsScreen
// ---------------------------------------------------------------------------

export default function AchievementsScreen(): React.JSX.Element {
  const [selected, setSelected] = useState<Achievement | null>(null);

  const unlockedCount = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  const renderItem = useCallback(({ item }: { item: Achievement }): React.JSX.Element => (
    <AchievementCard item={item} onPress={(): void => setSelected(item)} />
  ), []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">Achievements</Text>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {unlockedCount} / {ACHIEVEMENTS.length} unlocked
        </Text>
        <View style={styles.summaryTrack}>
          <View style={[styles.summaryFill, { width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }]} />
        </View>
      </View>

      <FlatList
        data={ACHIEVEMENTS}
        renderItem={renderItem}
        keyExtractor={(a): string => a.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <DetailModal item={selected} onClose={(): void => setSelected(null)} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  title: { color: '#fff', fontSize: 28, fontWeight: '800', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  summaryBar: { paddingHorizontal: 20, gap: 6, marginBottom: 12 },
  summaryText: { color: 'rgba(255,255,255,0.55)', fontSize: 13 },
  summaryTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  summaryFill: { height: '100%', borderRadius: 2, backgroundColor: '#4FC3F7' },
  listContent: { paddingHorizontal: 12, paddingBottom: 32 },
  row: { gap: 10, marginBottom: 10 },
  card: {
    flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16, padding: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)', gap: 6, minHeight: 130,
  },
  cardLocked: { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' },
  cardPressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  cardIcon: { fontSize: 32 },
  cardIconLocked: { opacity: 0.25 },
  cardName: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  cardNameLocked: { color: 'rgba(255,255,255,0.3)' },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  progressTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  xpTag: { fontSize: 10, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  modalPanel: { width: '100%', backgroundColor: '#0d2137', borderRadius: 24, padding: 28, alignItems: 'center', gap: 10, borderWidth: 1.5 },
  modalIcon: { fontSize: 48 },
  modalName: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' },
  tierPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  tierPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  modalDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalProgress: { width: '100%', gap: 6 },
  modalProgressLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center' },
  modalXp: { color: '#FFD740', fontSize: 14, fontWeight: '700' },
  modalClose: { marginTop: 8, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14 },
  modalCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
