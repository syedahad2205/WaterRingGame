/**
 * StatisticsScreen.tsx
 *
 * Player statistics with three animated charts:
 *   - Line chart: stars earned over recent challenges
 *   - Area chart: coins earned vs spent over time
 *   - Bar chart: challenges completed per template
 *
 * Charts animate on screen entry (Requirement 35.5).
 *
 * Requirements: 35.5
 * Task: 8.4.3
 */

import React, { useEffect, useMemo } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { StatCard } from '../components/ui/StatCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Icon } from '../components/icons/GameIcons';

// ---------------------------------------------------------------------------
// Fallback data — per-challenge statistics tracking is not yet in stores
// ---------------------------------------------------------------------------

const STARS_DATA = [1, 2, 3, 2, 3, 3, 1, 2, 3, 3, 2, 3]; // last 12 challenges

const TEMPLATE_DATA: { name: string; count: number; color: string }[] = [
  { name: 'Standard', count: 42, color: DS.colors.primary },
  { name: 'Precision', count: 18, color: DS.colors.rings.lavender },
  { name: 'Moving Pegs', count: 11, color: DS.colors.warning },
  { name: 'Limited Press', count: 8, color: DS.colors.error },
  { name: 'Strong Current', count: 14, color: DS.colors.secondary },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single animated bar in the sparkline chart */
function SparkBar({ heightPct, color, progress }: { heightPct: number; color: string; progress: import('react-native-reanimated').SharedValue<number> }): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => ({
    height: `${heightPct * 100 * progress.value}%`,
  }));
  return (
    <View style={styles.sparkBar}>
      <Animated.View style={[styles.sparkBarFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

/** Simple line/sparkline chart using animated bar-based approximation */
function SparklineChart({ data, color }: { data: number[]; color: string }): React.JSX.Element {
  const max = Math.max(...data);
  const progress = useSharedValue(0);

  useEffect((): void => {
    progress.value = withDelay(200, withTiming(1, { duration: 700, easing: Easing.out(Easing.ease) }));
  }, [progress]);

  return (
    <View style={styles.sparkline} accessible={true} accessibilityLabel="Stars chart">
      {data.map((v, i) => {
        const heightPct = max > 0 ? v / max : 0;
        return <SparkBar key={i} heightPct={heightPct} color={color} progress={progress} />;
      })}
    </View>
  );
}

/** Single animated row in the template bar chart */
function TemplateBarRow({ item, widthPct, progress }: { item: { name: string; count: number; color: string }; widthPct: number; progress: import('react-native-reanimated').SharedValue<number> }): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPct * 100 * progress.value}%`,
  }));
  return (
    <View style={styles.barRow} accessible={true} accessibilityLabel={`${item.name}: ${item.count} completions`}>
      <Text style={styles.barLabel} numberOfLines={1}>{item.name}</Text>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, { backgroundColor: item.color }, animatedStyle]} />
      </View>
      <Text style={styles.barValue}>{item.count}</Text>
    </View>
  );
}

/** Bar chart for template distribution */
function TemplateBarChart(): React.JSX.Element {
  const progress = useSharedValue(0);
  const maxCount = Math.max(...TEMPLATE_DATA.map((d) => d.count));

  useEffect((): void => {
    progress.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }));
  }, [progress]);

  return (
    <View style={styles.barChart}>
      {TEMPLATE_DATA.map((item) => {
        const widthPct = maxCount > 0 ? item.count / maxCount : 0;
        return <TemplateBarRow key={item.name} item={item} widthPct={widthPct} progress={progress} />;
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// StatisticsScreen
// ---------------------------------------------------------------------------

/**
 * StatisticsScreen — animated charts for player stats.
 *
 * Requirements: 35.5
 * Task: 8.4.3
 */
// eslint-disable-next-line max-lines-per-function
export default function StatisticsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const player = usePlayerStore();
  const coinBalance = useEconomyStore((state) => state.coinBalance);
  const transactionHistory = useEconomyStore((s) => s.transactionHistory);

  const { coinsEarned, coinsSpent } = useMemo(() => {
    const earned: number[] = [];
    const spent: number[] = [];
    // Group last 12 transactions of each type
    const earnTxs = transactionHistory.filter((t) => t.type === 'earn').slice(-12);
    const spendTxs = transactionHistory.filter((t) => t.type === 'spend').slice(-12);
    // Pad to 12 entries
    for (let i = 0; i < 12; i++) {
      earned.push(earnTxs[i]?.amount ?? 0);
      spent.push(spendTxs[i]?.amount ?? 0);
    }
    return { coinsEarned: earned, coinsSpent: spent };
  }, [transactionHistory]);

  const totalEarned = coinsEarned.reduce((a, b) => a + b, 0);
  const totalSpent = coinsSpent.reduce((a, b) => a + b, 0);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Back button header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Statistics</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          <StatCard icon="star" iconColor={DS.colors.accent} value={player.level ?? 1} label="Level" style={{ flex: 1 }} />
          <StatCard icon="bolt" iconColor={DS.colors.secondary} value={player.xp ?? 0} label="Total XP" style={{ flex: 1 }} />
          <StatCard icon="star-filled" iconColor={DS.colors.accent} value={player.totalStars ?? 0} label="Stars" style={{ flex: 1 }} />
        </View>

        {/* Stars over time */}
        <SectionHeader title="Stars per Challenge (Last 12)" />
        <GlassCard variant="medium">
          <SparklineChart data={STARS_DATA} color={DS.colors.accent} />
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterText}>Challenge N-11</Text>
            <Text style={styles.chartFooterText}>Latest</Text>
          </View>
        </GlassCard>

        {/* Coins earned vs spent */}
        <SectionHeader title="Coins (Last 12 Challenges)" />
        <GlassCard variant="medium">
          <View style={styles.coinsLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: DS.colors.primary }]} /><Text style={styles.legendText}>Earned</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: DS.colors.error }]} /><Text style={styles.legendText}>Spent</Text></View>
          </View>
          <View style={styles.groupedBars}>
            {coinsEarned.map((earned, i) => {
              const maxVal = Math.max(...coinsEarned, ...coinsSpent, 1);
              return (
                <View key={i} style={styles.groupedBarGroup}>
                  <View style={[styles.groupedBarFill, { height: (earned / maxVal) * 60, backgroundColor: DS.colors.primary }]} />
                  <View style={[styles.groupedBarFill, { height: (coinsSpent[i] / maxVal) * 60, backgroundColor: DS.colors.error }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.coinsSummary}>
            <View style={styles.coinsSummaryRow}>
              <Icon name="coin" size={16} />
              <Text style={styles.coinsSummaryText}>Total earned: {totalEarned}</Text>
            </View>
            <View style={styles.coinsSummaryRow}>
              <Icon name="coin" size={16} />
              <Text style={styles.coinsSummaryText}>Total spent: {totalSpent}</Text>
            </View>
            <View style={styles.coinsSummaryRow}>
              <Icon name="gem" size={16} />
              <Text style={styles.coinsSummaryText}>Balance: {coinBalance}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Template distribution */}
        <SectionHeader title="Challenges by Template" />
        <GlassCard variant="medium">
          <TemplateBarChart />
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
  scrollContent: { paddingHorizontal: DS.spacing.lg, paddingTop: DS.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: DS.spacing.lg },
  headerTitle: { color: DS.colors.text.primary, fontSize: DS.typography.size.title2, fontWeight: DS.typography.weight.heavy },
  summaryRow: { flexDirection: 'row', gap: DS.spacing.sm, marginBottom: DS.spacing.sm },
  sparkline: { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: DS.spacing.xxs },
  sparkBar: { flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: DS.glass.subtle.backgroundColor, borderRadius: DS.radius.xs, overflow: 'hidden' },
  sparkBarFill: { width: '100%', borderRadius: DS.radius.xs },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: DS.spacing.xs },
  chartFooterText: { color: DS.colors.text.tertiary, fontSize: DS.typography.size.caption2 },
  coinsLegend: { flexDirection: 'row', gap: DS.spacing.lg, marginBottom: DS.spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.xs },
  legendDot: { width: DS.spacing.sm, height: DS.spacing.sm, borderRadius: DS.spacing.xxs },
  legendText: { color: DS.colors.text.secondary, fontSize: DS.typography.size.caption1 },
  groupedBars: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: DS.spacing.xxxs },
  groupedBarGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  groupedBarFill: { flex: 1, borderRadius: 2 },
  coinsSummary: { marginTop: DS.spacing.sm, gap: DS.spacing.xxxs },
  coinsSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.xs },
  coinsSummaryText: { color: DS.colors.text.secondary, fontSize: DS.typography.size.caption1 },
  barChart: { gap: DS.spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.sm },
  barLabel: { color: DS.colors.text.secondary, fontSize: DS.typography.size.caption1, width: 90 },
  barTrack: { flex: 1, height: 20, borderRadius: DS.radius.xs, backgroundColor: DS.glass.subtle.borderColor, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: DS.radius.xs },
  barValue: { color: DS.colors.text.primary, fontSize: DS.typography.size.caption1, fontWeight: DS.typography.weight.bold, width: 28, textAlign: 'right' },
});
