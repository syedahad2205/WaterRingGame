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

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { usePlayerProgressionStore } from '../store/slices/playerProgressionSlice';
import { ACHIEVEMENT_DEFINITIONS } from '../features/progression/AchievementEngine';
import type { AchievementDefinition } from '../features/progression/AchievementEngine';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { ProgressBar as DSProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Icon } from '../components/icons/GameIcons';
import type { IconName } from '../components/icons/GameIcons';
import { getAchievementVisual } from '../constants/achievementVisuals';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: IconName;
  tier: AchievementTier;
  unlocked: boolean;
  /** 0-1 progress for in-progress achievements. 1 = complete. */
  progress: number;
  progressLabel?: string; // e.g. "12 / 50"
  xpReward: number;
}

// ---------------------------------------------------------------------------
// Derive runtime achievement state from real AchievementEngine definitions
// and player store / progression store data.
// ---------------------------------------------------------------------------

/**
 * Build a snapshot value for a given condition type from real store data.
 */
function snapshotValueForCondition(
  conditionType: AchievementDefinition['conditionType'],
  stats: {
    gamesPlayed: number;
    totalStars: number;
    currentStreak: number;
    prestige: number;
  },
): number {
  switch (conditionType) {
    case 'challenge_count': return stats.gamesPlayed;
    case 'star_count':      return stats.totalStars;
    case 'win_streak':      return stats.currentStreak;
    case 'no_continue_win': return stats.gamesPlayed; // best-effort proxy
    case 'speed_win':       return 0; // not yet tracked
    case 'daily_count':     return 0; // not yet tracked
    case 'prestige':        return stats.prestige;
    case 'leaderboard_top10': return 0;
    case 'mastery_bronze_all': return 0;
    case 'mastery_platinum_any': return 0;
    default: {
      // Safety net: if a new conditionType is added to AchievementEngine but
      // not handled here, return 0 instead of undefined (which would produce
      // NaN in progress calculations).
      const _exhaustive: never = conditionType;
      void _exhaustive;
      return 0;
    }
  }
}

function computeAchievements(stats: {
  gamesPlayed: number;
  totalStars: number;
  currentStreak: number;
  prestige: number;
}): Achievement[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const currentValue = snapshotValueForCondition(def.conditionType, stats);
    const unlocked = currentValue >= def.conditionValue;
    const progress = def.conditionValue > 0
      ? Math.min(1, currentValue / def.conditionValue)
      : 0;
    const progressLabel = def.conditionValue > 1
      ? `${Math.min(currentValue, def.conditionValue)} / ${def.conditionValue}`
      : undefined;

    return {
      id: def.id,
      name: def.name,
      description: def.description,
      iconName: def.iconName as IconName,
      tier: def.tier,
      xpReward: def.xpReward,
      unlocked,
      progress,
      progressLabel,
    };
  });
}

const TIER_COLOURS: Record<AchievementTier, string> = {
  bronze: DS.colors.warning,
  silver: DS.colors.text.secondary,
  gold: DS.colors.accent,
  platinum: DS.colors.secondary,
};

// ---------------------------------------------------------------------------
// AchievementCard
// ---------------------------------------------------------------------------

const AchievementCard = React.memo(function AchievementCard({ item, onPress }: { item: Achievement; onPress: () => void }): React.JSX.Element {
  const tierColor = TIER_COLOURS[item.tier];
  const visual = getAchievementVisual(item.id);
  const isPartial = !item.unlocked && item.progress > 0;

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1 }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}. ${item.unlocked ? 'Unlocked' : 'Locked'}. ${item.description}`}
    >
      <GlassCard
        variant={item.unlocked ? 'medium' : 'subtle'}
        noAnimation
        glow={item.unlocked ? visual.glowColor : undefined}
        style={[
          styles.card,
          !item.unlocked && styles.cardLocked,
        ]}
      >
        {item.unlocked ? (
          <View style={[styles.achieveBadge, {
            backgroundColor: visual.badgeGradient[0],
            borderColor: visual.frameColor,
            shadowColor: visual.glowColor,
          }]}>
            <Icon name={item.iconName} size={24} color="#FFFFFF" />
          </View>
        ) : (
          <View style={[styles.achieveBadge, {
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderColor: 'rgba(255,255,255,0.1)',
          }]}>
            <Icon name="lock" size={24} color={DS.colors.text.tertiary} />
          </View>
        )}
        <Text style={[styles.cardName, !item.unlocked && styles.cardNameLocked]} numberOfLines={2}>
          {item.name}
        </Text>
        {/* Tier indicator */}
        <Badge variant="status" value={item.tier.toUpperCase()} color={item.unlocked ? tierColor : 'rgba(255,255,255,0.15)'} />
        {/* Progress bar for partial */}
        {isPartial && (
          <View style={{ width: '100%', gap: 2 }}>
            <DSProgressBar value={item.progress} color={visual.glowColor} size="sm" style={{ width: '100%' }} />
            {item.progressLabel ? (
              <Text style={styles.progressText}>{item.progressLabel}</Text>
            ) : null}
          </View>
        )}
        {item.unlocked && (
          <View style={styles.xpRow}>
            <Icon name="check" size={12} color={DS.colors.success} />
            <Text style={[styles.xpTag, { color: tierColor }]}>+{item.xpReward} XP</Text>
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
});

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
        <GlassCard variant="frosted" glow={tierColor} style={styles.modalPanel}>
          {item.unlocked ? (
            <Icon name={item.iconName} size={48} color={tierColor} />
          ) : (
            <Icon name="lock" size={48} color={DS.colors.text.tertiary} />
          )}
          <Text style={styles.modalName} accessibilityRole="header">{item.name}</Text>
          <Badge variant="rank" value={item.tier.toUpperCase()} color={`${tierColor}22`} />
          <Text style={styles.modalDesc}>{item.description}</Text>
          {!item.unlocked && item.progress > 0 && (
            <View style={styles.modalProgress}>
              <DSProgressBar value={item.progress} color={tierColor} size="md" />
              {item.progressLabel && <Text style={styles.modalProgressLabel}>{item.progressLabel}</Text>}
            </View>
          )}
          <View style={styles.modalXpRow}>
            <Icon name="star" size={16} />
            <Text style={styles.modalXp}>+{item.xpReward} XP</Text>
          </View>
          <GlassButton label="Close" variant="ghost" onPress={onClose} iconLeft="close" size="md" />
        </GlassCard>
      </Pressable>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// AchievementsScreen
// ---------------------------------------------------------------------------

export default function AchievementsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [selected, setSelected] = useState<Achievement | null>(null);

  const totalStars = usePlayerStore((s) => s.totalStars);
  const prestige = usePlayerStore((s) => s.prestige);
  const gamesPlayed = usePlayerProgressionStore((s) => s.lifetimeGamesPlayed);
  const currentStreak = usePlayerProgressionStore((s) => s.currentStreak);

  const achievements = useMemo(
    () => computeAchievements({ gamesPlayed, totalStars, currentStreak, prestige }),
    [gamesPlayed, totalStars, currentStreak, prestige],
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

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

  const renderItem = useCallback(({ item }: { item: Achievement }): React.JSX.Element => (
    <AchievementCard item={item} onPress={(): void => setSelected(item)} />
  ), []);

  return (
    <ScreenContainer>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <Icon name="back" size={28} color={DS.colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Achievements</Text>
        <View style={{ width: 28 }} />
      </View>

      <Animated.View style={contentStyle}>
      {/* Summary bar */}
      <GlassCard variant="medium" style={styles.summaryCard}>
        <Text style={styles.summaryText}>{unlockedCount} / {achievements.length} unlocked</Text>
        <DSProgressBar value={achievements.length > 0 ? unlockedCount / achievements.length : 0} color={DS.colors.primary} size="sm" />
      </GlassCard>

      <FlatList
        data={achievements}
        renderItem={renderItem}
        keyExtractor={(a): string => a.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>

      <DetailModal item={selected} onClose={(): void => setSelected(null)} />
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.xl,
    paddingTop: DS.spacing.lg,
    paddingBottom: DS.spacing.sm,
  },
  headerTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
  },
  summaryCard: {
    marginHorizontal: DS.spacing.xl,
    marginBottom: DS.spacing.md,
    padding: DS.spacing.lg,
    gap: DS.spacing.xs,
  },
  summaryText: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.footnote,
  },
  listContent: {
    paddingHorizontal: DS.spacing.md,
    paddingBottom: DS.spacing.xxxl,
  },
  row: {
    gap: DS.spacing.sm,
    marginBottom: DS.spacing.sm,
  },
  card: {
    alignItems: 'center' as const,
    padding: DS.spacing.lg,
    gap: DS.spacing.xs,
    minHeight: 130,
  },
  cardLocked: {
    opacity: 0.55,
  },
  achieveBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  progressText: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    textAlign: 'center' as const,
  },
  cardName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.bold,
    textAlign: 'center' as const,
  },
  cardNameLocked: {
    color: DS.colors.text.tertiary,
  },
  xpRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: DS.spacing.xxs,
  },
  xpTag: {
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.bold,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: DS.spacing.xxxl,
  },
  modalPanel: {
    width: '100%' as unknown as number,
    padding: DS.spacing.xxl,
    alignItems: 'center' as const,
    gap: DS.spacing.sm,
  },
  modalName: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.heavy,
    textAlign: 'center' as const,
  },
  modalDesc: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.subhead,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  modalProgress: {
    width: '100%' as unknown as number,
    gap: DS.spacing.xs,
  },
  modalProgressLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    textAlign: 'center' as const,
  },
  modalXpRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: DS.spacing.xxs,
  },
  modalXp: {
    color: DS.colors.accent,
    fontSize: DS.typography.size.subhead,
    fontWeight: DS.typography.weight.bold,
  },
});
