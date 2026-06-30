/**
 * HomeScreen.tsx
 *
 * Primary hub screen — the first thing an authenticated player sees.
 *
 * Sections:
 *   - Header: greeting, coin balance, streak indicator
 *   - Hero: current / next challenge card with Play CTA
 *   - Daily Challenge countdown card (links to DailyChallengeScreen)
 *   - Feature unlock cards (visible only after onboarding gates open)
 *   - Quick Stats row
 *
 * Requirements: 20.1, 20.2
 * Task: 8.5.2
 */

import React, { useEffect, useState } from 'react';
import {
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
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../app/Navigation';
import { usePlayerStore } from '../store/slices/playerSlice';
import { useEconomyStore } from '../store/slices/economySlice';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = StackScreenProps<RootStackParamList, 'MainTabs'>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCENT = '#4FC3F7';

/** Mock current challenge number. In production, read from ChallengeProgressService. */
const CURRENT_CHALLENGE_NUMBER = 14;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds remaining as HH:MM:SS */
function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Seconds until midnight UTC */
function secondsUntilMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CoinBadge({ balance }: { balance: number }): React.JSX.Element {
  return (
    <View
      style={styles.coinBadge}
      accessible={true}
      accessibilityLabel={`Coin balance: ${balance}`}
    >
      <Text style={styles.coinIcon} accessible={false}>💰</Text>
      <Text style={styles.coinText}>{balance.toLocaleString()}</Text>
    </View>
  );
}

function StreakBadge({ streak }: { streak: number }): React.JSX.Element {
  return (
    <View
      style={styles.streakBadge}
      accessible={true}
      accessibilityLabel={`${streak} day streak`}
    >
      <Text style={styles.streakIcon} accessible={false}>🔥</Text>
      <Text style={styles.streakText}>{streak}</Text>
    </View>
  );
}

interface HeroChallengeCardProps {
  challengeNumber: number;
  onPlay: () => void;
}

// eslint-disable-next-line max-lines-per-function
function HeroChallengeCard({ challengeNumber, onPlay }: HeroChallengeCardProps): React.JSX.Element {
  return (
    <View style={styles.heroCard}>
      {/* Background accent */}
      <View style={styles.heroBg} />

      <View style={styles.heroContent}>
        <Text style={styles.heroSubtitle} accessible={false}>CURRENT CHALLENGE</Text>
        <Text
          style={styles.heroChallenge}
          accessibilityRole="header"
          accessibilityLabel={`Challenge ${challengeNumber}`}
        >
          #{challengeNumber}
        </Text>
        <Text style={styles.heroDesc} accessible={false}>
          Standard Mode · 3 pegs · 60 seconds
        </Text>

        {/* Star record */}
        <View style={styles.heroStars} accessible={true} accessibilityLabel="Best: 2 stars">
          {[1, 2, 3].map((i) => (
            <Text key={i} style={[styles.heroStar, i <= 2 && styles.heroStarFilled]} accessible={false}>
              {i <= 2 ? '★' : '☆'}
            </Text>
          ))}
          <Text style={styles.heroBestLabel}>Best</Text>
        </View>
      </View>

      {/* Play button */}
      <Pressable
        onPress={onPlay}
        style={({ pressed }: { pressed: boolean }) => [styles.playButton, pressed ? styles.playButtonPressed : undefined]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`Play challenge ${challengeNumber}`}
        hitSlop={8}
      >
        <Text style={styles.playIcon} accessible={false}>▶</Text>
        <Text style={styles.playLabel}>Play</Text>
      </Pressable>
    </View>
  );
}

interface DailyCardProps {
  countdown: string;
  onPress: () => void;
}

function DailyCard({ countdown, onPress }: DailyCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.dailyCard, pressed ? styles.dailyCardPressed : undefined]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Daily challenge. Resets in ${countdown}.`}
    >
      <View style={styles.dailyLeft}>
        <Text style={styles.dailyIcon} accessible={false}>🗓️</Text>
        <View>
          <Text style={styles.dailyTitle}>Daily Challenge</Text>
          <Text style={styles.dailySubtitle}>Resets in {countdown}</Text>
        </View>
      </View>
      <Text style={styles.dailyArrow} accessible={false}>›</Text>
    </Pressable>
  );
}

interface QuickStatProps {
  label: string;
  value: string | number;
  icon: string;
}

function QuickStat({ label, value, icon }: QuickStatProps): React.JSX.Element {
  return (
    <View
      style={styles.quickStat}
      accessible={true}
      accessibilityLabel={`${label}: ${value}`}
    >
      <Text style={styles.quickStatIcon} accessible={false}>{icon}</Text>
      <Text style={styles.quickStatValue}>{value}</Text>
      <Text style={styles.quickStatLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------

/**
 * HomeScreen — primary hub with challenge entry, daily card, and quick stats.
 *
 * Requirements: 20.1, 20.2
 * Task: 8.5.2
 */
// eslint-disable-next-line max-lines-per-function
export default function HomeScreen({ navigation }: Props): React.JSX.Element {
  const displayName = usePlayerStore((s) => s.displayName);
  const level = usePlayerStore((s) => s.level);
  const totalStars = usePlayerStore((s) => s.totalStars);
  const coinBalance = useEconomyStore((s) => s.coinBalance);

  // Mock streak value (replace with StreakService.currentStreak)
  const streak = 5;

  // Daily countdown
  const [countdown, setCountdown] = useState(secondsUntilMidnightUTC);
  useEffect((): (() => void) => {
    const interval = setInterval((): void => {
      setCountdown(secondsUntilMidnightUTC());
    }, 1000);
    return (): void => clearInterval(interval);
  }, []);

  // Entrance animations
  const headerOpacity = useSharedValue(0);
  const heroTranslateY = useSharedValue(30);
  const cardsOpacity = useSharedValue(0);

  useEffect((): void => {
    headerOpacity.value = withTiming(1, { duration: 400 });
    heroTranslateY.value = withDelay(100, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
    cardsOpacity.value = withDelay(250, withTiming(1, { duration: 350 }));
  }, [headerOpacity, heroTranslateY, cardsOpacity]);

  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: heroTranslateY.value }],
  }));
  const cardsStyle = useAnimatedStyle(() => ({ opacity: cardsOpacity.value }));

  function handlePlay(): void {
    // Navigate to game with current challenge
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigation as any).navigate('Game', { challengeNumber: CURRENT_CHALLENGE_NUMBER });
  }

  function handleDailyPress(): void {
    navigation.navigate('DailyChallenge' as never);
  }

  const firstName = displayName ? displayName.split(' ')[0] : 'Player';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Animated.View style={[styles.header, headerStyle]}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting} accessibilityRole="header">
              {greeting}, {firstName}
            </Text>
            <Text style={styles.levelTag}>Level {level}</Text>
          </View>
          <View style={styles.headerRight}>
            <StreakBadge streak={streak} />
            <CoinBadge balance={coinBalance} />
          </View>
        </Animated.View>

        {/* ── Hero challenge card ──────────────────────────────────────── */}
        <Animated.View style={[styles.heroSection, heroStyle]}>
          <HeroChallengeCard
            challengeNumber={CURRENT_CHALLENGE_NUMBER}
            onPlay={handlePlay}
          />
        </Animated.View>

        {/* ── Daily challenge card ────────────────────────────────────── */}
        <Animated.View style={cardsStyle}>
          <DailyCard
            countdown={formatCountdown(countdown)}
            onPress={handleDailyPress}
          />
        </Animated.View>

        {/* ── Feature shortcuts ───────────────────────────────────────── */}
        <Animated.View style={[styles.shortcutRow, cardsStyle]}>
          {[
            { icon: '🏆', label: 'Leaderboard', screen: 'Leaderboard' as never },
            { icon: '🎨', label: 'Store', screen: 'Store' as never },
            { icon: '🎒', label: 'Inventory', screen: 'Inventory' as never },
            { icon: '🏅', label: 'Achievements', screen: 'Achievements' as never },
          ].map((item) => (
            <Pressable
              key={item.label}
              onPress={(): void => navigation.navigate(item.screen)}
              style={({ pressed }: { pressed: boolean }) => [styles.shortcut, pressed ? styles.shortcutPressed : undefined]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text style={styles.shortcutIcon} accessible={false}>{item.icon}</Text>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* ── Quick stats ─────────────────────────────────────────────── */}
        <Animated.View style={[styles.statsRow, cardsStyle]}>
          <QuickStat icon="⭐" label="Stars" value={(totalStars ?? 0).toLocaleString()} />
          <QuickStat icon="🎯" label="Challenges" value={CURRENT_CHALLENGE_NUMBER - 1} />
          <QuickStat icon="💎" label="Prestige" value={0} />
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerLeft: { gap: 2 },
  headerRight: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  greeting: { color: '#fff', fontSize: 22, fontWeight: '800' },
  levelTag: { color: ACCENT, fontSize: 13, fontWeight: '600' },

  // Coin / streak badges
  coinBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,215,64,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 5, borderWidth: 1, borderColor: 'rgba(255,215,64,0.25)' },
  coinIcon: { fontSize: 14 },
  coinText: { color: '#FFD740', fontSize: 13, fontWeight: '700' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,87,34,0.12)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 5, borderWidth: 1, borderColor: 'rgba(255,87,34,0.25)' },
  streakIcon: { fontSize: 14 },
  streakText: { color: '#FF7043', fontSize: 13, fontWeight: '700' },

  // Hero card
  heroSection: { marginBottom: 14 },
  heroCard: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1.5, borderColor: 'rgba(79,195,247,0.3)', padding: 20, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 16 },
  heroBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(79,195,247,0.04)' },
  heroContent: { flex: 1, gap: 4 },
  heroSubtitle: { color: ACCENT, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  heroChallenge: { color: '#fff', fontSize: 36, fontWeight: '900', lineHeight: 40 },
  heroDesc: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },
  heroStars: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 },
  heroStar: { fontSize: 16, color: 'rgba(255,255,255,0.2)' },
  heroStarFilled: { color: '#FFD740' },
  heroBestLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, marginLeft: 4 },

  // Play button
  playButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', gap: 2, shadowColor: ACCENT, shadowOpacity: 0.45, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12, elevation: 8 },
  playButtonPressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  playIcon: { color: '#070f1e', fontSize: 22 },
  playLabel: { color: '#070f1e', fontSize: 11, fontWeight: '800' },

  // Daily card
  dailyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 14 },
  dailyCardPressed: { opacity: 0.75 },
  dailyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dailyIcon: { fontSize: 28 },
  dailyTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dailySubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  dailyArrow: { color: 'rgba(255,255,255,0.3)', fontSize: 28 },

  // Shortcut grid
  shortcutRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  shortcut: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingVertical: 14, gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  shortcutPressed: { opacity: 0.7 },
  shortcutIcon: { fontSize: 22 },
  shortcutLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Quick stats
  statsRow: { flexDirection: 'row', gap: 10 },
  quickStat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, paddingVertical: 14, gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  quickStatIcon: { fontSize: 20 },
  quickStatValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  quickStatLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
});
