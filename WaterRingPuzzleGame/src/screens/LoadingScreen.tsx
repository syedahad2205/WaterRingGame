/**
 * LoadingScreen.tsx
 *
 * Shown when the app is performing a time-consuming operation:
 *   - Remote Config initial fetch
 *   - Asset bundle preload
 *   - Level data hydration on first run
 *
 * Requirements: 19.1
 * Task: 8.5.1
 */

import React, { useEffect } from 'react';
import {
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');
const BAR_WIDTH = SCREEN_W - 80;
const SHIMMER_DURATION = 1200;

function IndeterminateBar(): React.JSX.Element {
  const shimmerX = useSharedValue(-BAR_WIDTH * 0.4);

  useEffect((): void => {
    shimmerX.value = withRepeat(
      withSequence(
        withTiming(BAR_WIDTH * 1.4, { duration: SHIMMER_DURATION, easing: Easing.inOut(Easing.ease) }),
        withTiming(-BAR_WIDTH * 0.4, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  return (
    <View style={styles.barTrack} accessible={true} accessibilityRole="progressbar" accessibilityLabel="Loading…">
      <View style={[styles.barFill, { width: '100%', opacity: 0.25 }]} />
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}

function DeterminateBar({ progress }: { progress: number }): React.JSX.Element {
  const fillWidth = useSharedValue(0);

  useEffect((): void => {
    fillWidth.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [fillWidth, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%`,
  }));

  const pct = Math.round(Math.max(0, Math.min(1, progress)) * 100);

  return (
    <View
      style={styles.barTrack}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityLabel={`Loading ${pct}%`}
    >
      <Animated.View style={[styles.barFill, fillStyle]} />
    </View>
  );
}

interface LoadingScreenParams {
  message?: string;
  progress?: number;
}

// eslint-disable-next-line max-lines-per-function
export default function LoadingScreen({ route }: { route?: { params?: LoadingScreenParams } }): React.JSX.Element {
  const params = route?.params as LoadingScreenParams | undefined;
  const message = params?.message ?? 'Loading…';
  const progress = params?.progress;

  const dotOpacity1 = useSharedValue(0.3);
  const dotOpacity2 = useSharedValue(0.3);
  const dotOpacity3 = useSharedValue(0.3);

  useEffect((): void => {
    const duration = 320;
    dotOpacity1.value = withRepeat(
      withSequence(withTiming(1, { duration }), withTiming(0.3, { duration })),
      -1,
      false,
    );
    setTimeout((): void => {
      dotOpacity2.value = withRepeat(
        withSequence(withTiming(1, { duration }), withTiming(0.3, { duration })),
        -1,
        false,
      );
    }, duration);
    setTimeout((): void => {
      dotOpacity3.value = withRepeat(
        withSequence(withTiming(1, { duration }), withTiming(0.3, { duration })),
        -1,
        false,
      );
    }, duration * 2);
  }, [dotOpacity1, dotOpacity2, dotOpacity3]);

  const d1Style = useAnimatedStyle(() => ({ opacity: dotOpacity1.value }));
  const d2Style = useAnimatedStyle(() => ({ opacity: dotOpacity2.value }));
  const d3Style = useAnimatedStyle(() => ({ opacity: dotOpacity3.value }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070f1e" />
      <View style={styles.logoMark}>
        <View style={styles.ringA} />
        <View style={styles.ringB} />
      </View>
      <View style={styles.barSection}>
        {progress !== undefined ? (
          <DeterminateBar progress={progress} />
        ) : (
          <IndeterminateBar />
        )}
      </View>
      <View style={styles.messageRow} accessible={true} accessibilityLiveRegion="polite">
        <Text style={styles.message}>{message}</Text>
        <Animated.Text style={[styles.dot, d1Style]} accessible={false}>.</Animated.Text>
        <Animated.Text style={[styles.dot, d2Style]} accessible={false}>.</Animated.Text>
        <Animated.Text style={[styles.dot, d3Style]} accessible={false}>.</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#070f1e', alignItems: 'center', justifyContent: 'center', gap: 32 },
  logoMark: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  ringA: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 4, borderColor: '#4FC3F7', opacity: 0.6 },
  ringB: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4FC3F7', opacity: 0.9 },
  barSection: { alignItems: 'center' },
  barTrack: { width: BAR_WIDTH, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, backgroundColor: '#4FC3F7' },
  shimmer: { position: 'absolute', top: 0, left: 0, width: BAR_WIDTH * 0.4, height: '100%', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end' },
  message: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500', letterSpacing: 0.5 },
  dot: { color: 'rgba(255,255,255,0.5)', fontSize: 18, lineHeight: 20, marginBottom: 1 },
});
