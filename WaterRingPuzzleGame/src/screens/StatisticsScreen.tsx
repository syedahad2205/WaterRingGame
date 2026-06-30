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

import React, { useEffect } from 'react';
import {
  SafeAreaView,
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
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const STARS_DATA = [1, 2, 3, 2, 3, 3, 1, 2, 3, 3, 2, 3]; // last 12 challenges
const COINS_EARNED = [50, 75, 80, 120, 90, 110, 150, 100, 130, 160, 140, 200];
const COINS_SPENT = [0, 0, 150, 0, 0, 200, 0, 100, 0, 500, 0, 0];

const TEMPLATE_DATA: { name: string; count: number; color: string }[] = [
  { name: 'Standard', count: 42, color: '#4FC3F7' },
  { name: 'Precision', count: 18, color: '#AB47BC' },
  { name: 'Moving Pegs', count: 11, color: '#FFA726' },
  { name: 'Limited Press', count: 8, color: '#EF5350' },
  { name: 'Strong Current', count: 14, color: '#26C6DA' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ title }: { title: string }): React.JSX.Element {
  return <Text style={styles.sectionTitle} accessibilityRole="header">{title}</Text>;
}

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
  const player = usePlayerStore();
  const coinBalance = useEconomyStore((state) => state.coinBalance);

  const totalEarned = COINS_EARNED.reduce((a, b) => a + b, 0);
  const totalSpent = COINS_SPENT.reduce((a, b) => a + b, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle} accessibilityRole="header">Statistics</Text>

        {/* Summary row */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Level', value: player.level ?? 1 },
            { label: 'Total XP', value: (player.xp ?? 0).toLocaleString() },
            { label: 'Stars', value: (player.totalStars ?? 0).toLocaleString() },
          ].map((s) => (
            <View key={s.label} style={styles.summaryCard} accessible={true} accessibilityLabel={`${s.label}: ${s.value}`}>
              <Text style={styles.summaryValue}>{s.value}</Text>
              <Text style={styles.summaryLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Stars over time */}
        <SectionTitle title="Stars per Challenge (Last 12)" />
        <View style={styles.chartCard}>
          <SparklineChart data={STARS_DATA} color="#FFD740" />
          <View style={styles.chartFooter}>
            <Text style={styles.chartFooterText}>Challenge N-11</Text>
            <Text style={styles.chartFooterText}>Latest</Text>
          </View>
        </View>

        {/* Coins earned vs spent */}
        <SectionTitle title="Coins (Last 12 Challenges)" />
        <View style={styles.chartCard}>
          <View style={styles.coinsLegend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4FC3F7' }]} /><Text style={styles.legendText}>Earned</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#EF5350' }]} /><Text style={styles.legendText}>Spent</Text></View>
          </View>
          <View style={styles.groupedBars}>
            {COINS_EARNED.map((earned, i) => {
              const maxVal = Math.max(...COINS_EARNED, ...COINS_SPENT);
              return (
                <View key={i} style={styles.groupedBarGroup}>
                  <View style={[styles.groupedBarFill, { height: (earned / maxVal) * 60, backgroundColor: '#4FC3F7' }]} />
                  <View style={[styles.groupedBarFill, { height: (COINS_SPENT[i] / maxVal) * 60, backgroundColor: '#EF5350' }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.coinsSummary}>
            <Text style={styles.coinsSummaryText}>Total earned: 💰 {totalEarned}</Text>
            <Text style={styles.coinsSummaryText}>Total spent: 💸 {totalSpent}</Text>
            <Text style={styles.coinsSummaryText}>Balance: 💎 {coinBalance}</Text>
          </View>
        </View>

        {/* Template distribution */}
        <SectionTitle title="Challenges by Template" />
        <View style={styles.chartCard}>
          <TemplateBarChart />
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
  pageTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  summaryCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 2 },
  summaryValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { color: '#4FC3F7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  chartCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sparkline: { flexDirection: 'row', height: 80, alignItems: 'flex-end', gap: 4 },
  sparkBar: { flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
  sparkBarFill: { width: '100%', borderRadius: 3 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  chartFooterText: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  coinsLegend: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  groupedBars: { flexDirection: 'row', alignItems: 'flex-end', height: 70, gap: 2 },
  groupedBarGroup: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  groupedBarFill: { flex: 1, borderRadius: 2 },
  coinsSummary: { marginTop: 10, gap: 3 },
  coinsSummaryText: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
  barChart: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, width: 90 },
  barTrack: { flex: 1, height: 20, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { color: '#fff', fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },
});
