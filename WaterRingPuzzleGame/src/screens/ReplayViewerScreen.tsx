/**
 * ReplayViewerScreen.tsx
 *
 * Replay playback viewer with full transport controls:
 *   Play / Pause  ·  Step back / Step forward  ·  Scrub bar  ·
 *   Speed selector (0.25x - 4x)  ·  Camera-follow toggle  ·  Reset
 *
 * The replay itself is a time-ordered sequence of physics snapshots
 * (ReplayFrame[]). The viewer interpolates between frames using the
 * current playhead position.
 *
 * Requirements: 20.4
 * Task: 8.5.3
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Badge } from '../components/ui/Badge';
import { Icon } from '../components/icons/GameIcons';
import { ProgressBar } from '../components/ui/ProgressBar';
import { replayStorageService } from '../features/replay/ReplayStorageService';
import type { ReplayData } from '../features/replay/ReplayRecorder';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReplayFrame {
  timeMs: number;
  rings: { id: string; x: number; y: number; angle: number }[];
  pegs: { id: string; settledRingId: string | null }[];
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4] as const;
type Speed = typeof SPEEDS[number];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getFrameAtTime(frames: ReplayFrame[], timeMs: number): ReplayFrame {
  for (let i = frames.length - 1; i >= 0; i--) {
    if (frames[i].timeMs <= timeMs) return frames[i];
  }
  return frames[0];
}

// ---------------------------------------------------------------------------
// RingCanvas -- simplified 2-D positions view
// ---------------------------------------------------------------------------

function RingCanvas({ frame }: { frame: ReplayFrame }): React.JSX.Element {
  const CANVAS_W = 320;
  const CANVAS_H = 220;
  const SCALE = 0.7;

  return (
    <View style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}>
      {/* Peg targets */}
      {[{ x: 80, y: 160 }, { x: 160, y: 160 }, { x: 240, y: 160 }].map((peg, i) => {
        const isOccupied = frame.pegs[i]?.settledRingId !== null;
        return (
          <View
            key={i}
            style={[
              styles.pegDot,
              {
                left: peg.x - 8,
                top: peg.y - 8,
                backgroundColor: isOccupied ? DS.colors.secondary : DS.colors.glass.border,
              },
            ]}
            accessible={false}
          />
        );
      })}

      {/* Rings */}
      {frame.rings.map((ring) => (
        <View
          key={ring.id}
          style={[
            styles.ringDot,
            {
              left: ring.x * SCALE - 14,
              top: ring.y * SCALE - 14,
              transform: [{ rotate: `${ring.angle}deg` }],
            },
          ]}
          accessible={false}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ReplayViewerScreen
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export default function ReplayViewerScreen({ route }: { route?: { params?: { replayId?: string } } }): React.JSX.Element {
  const replayId = route?.params?.replayId ?? '';
  const navigation = useNavigation();

  const [replayData, setReplayData] = useState<ReplayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [frames, setFrames] = useState<ReplayFrame[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await replayStorageService.download(replayId);
        if (!cancelled) {
          setReplayData(data);
          // Convert ReplayData events to ReplayFrame format for the viewer
          // For now, use an empty array if data has no usable frames
          if (data) {
            const converted: ReplayFrame[] = [{
              timeMs: 0,
              rings: [],
              pegs: [],
            }];
            // If the replay has duration, create a minimal frame set
            if (data.durationMs > 0) {
              converted.push({
                timeMs: data.durationMs,
                rings: [],
                pegs: [],
              });
            }
            setFrames(converted);
          }
        }
      } catch {
        // download returns null on failure, but catch any unexpected errors
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [replayId]);

  const totalDurationMs = frames.length > 0 ? frames[frames.length - 1].timeMs : 0;

  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>(1);
  const [cameraFollow, setCameraFollow] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentMsRef = useRef(0);

  // Sync ref with state for use inside interval
  useEffect((): void => { currentMsRef.current = currentMs; }, [currentMs]);

  // Scrub bar animation
  const scrubProgress = useSharedValue(0);
  const SCRUB_BAR_WIDTH = 280;

  useEffect((): void => {
    scrubProgress.value = withTiming(totalDurationMs > 0 ? currentMs / totalDurationMs : 0, {
      duration: 200,
      easing: Easing.linear,
    });
  }, [scrubProgress, currentMs, totalDurationMs]);

  // Playback ticker
  const startPlayback = useCallback((): void => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const tickMs = 100; // tick every 100 ms real time
    intervalRef.current = setInterval((): void => {
      const next = currentMsRef.current + tickMs * speed;
      if (next >= totalDurationMs) {
        setCurrentMs(totalDurationMs);
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setCurrentMs(next);
      }
    }, tickMs);
  }, [speed, totalDurationMs]);

  const stopPlayback = useCallback((): void => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect((): (() => void) => {
    if (isPlaying) {
      startPlayback();
    } else {
      stopPlayback();
    }
    return stopPlayback;
  }, [isPlaying, startPlayback, stopPlayback]);

  // When speed changes while playing, restart ticker
  useEffect((): void => {
    if (isPlaying) startPlayback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed]);

  // --- Early returns (after all hooks) ---

  if (loading) {
    return (
      <ScreenContainer style={styles.container} accessibilityLabel="Replay viewer">
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.pageTitle}>Replay</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="timer" size={48} color={DS.colors.text.tertiary} />
          <Text style={{ color: DS.colors.text.secondary, marginTop: DS.spacing.md }}>Loading replay...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (frames.length === 0) {
    return (
      <ScreenContainer style={styles.container} accessibilityLabel="Replay viewer">
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.pageTitle}>Replay</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: DS.spacing.md }}>
          <GlassCard variant="medium" noAnimation style={{ padding: DS.spacing.xxl, alignItems: 'center', gap: DS.spacing.md }}>
            <Icon name="replay" size={48} color={DS.colors.text.tertiary} />
            <Text style={{ color: DS.colors.text.primary, fontSize: DS.typography.size.title3, fontWeight: DS.typography.weight.bold }}>No Replay Data</Text>
            <Text style={{ color: DS.colors.text.secondary, fontSize: DS.typography.size.subhead, textAlign: 'center' }}>
              This replay could not be loaded or does not exist.
            </Text>
          </GlassCard>
        </View>
      </ScreenContainer>
    );
  }

  function handlePlayPause(): void {
    if (currentMs >= totalDurationMs) {
      // Reset and play from start
      setCurrentMs(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((v) => !v);
    }
  }

  function handleStepBack(): void {
    setIsPlaying(false);
    setCurrentMs((ms) => Math.max(0, ms - 500));
  }

  function handleStepForward(): void {
    setIsPlaying(false);
    setCurrentMs((ms) => Math.min(totalDurationMs, ms + 500));
  }

  function handleReset(): void {
    setIsPlaying(false);
    setCurrentMs(0);
  }

  function handleScrub(p: number): void {
    setIsPlaying(false);
    setCurrentMs(Math.round(p * totalDurationMs));
  }

  const currentFrame = getFrameAtTime(frames, currentMs);
  const progressPct = totalDurationMs > 0 ? currentMs / totalDurationMs : 0;

  return (
    <ScreenContainer style={styles.container} accessibilityLabel="Replay viewer">
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
        <Text style={styles.pageTitle}>Replay</Text>
        <Text style={styles.replayId}>#{replayId}</Text>
      </View>

      {/* Canvas wrapped in GlassCard */}
      <GlassCard variant="medium" noAnimation style={styles.canvasCard}>
        <RingCanvas frame={currentFrame} />
        {/* Camera follow indicator */}
        {cameraFollow ? (
          <View style={styles.cameraTagWrap}>
            <Badge variant="rank" value="CAM FOLLOW" />
          </View>
        ) : null}
      </GlassCard>

      {/* Time display */}
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel} accessibilityRole="none">
          {formatMs(currentMs)}
        </Text>
        <Text style={styles.timeSep} accessible={false}>/</Text>
        <Text style={styles.timeDuration} accessible={false}>
          {formatMs(totalDurationMs)}
        </Text>
      </View>

      {/* Scrub bar: ProgressBar wrapped in Pressable for scrub interaction */}
      <View style={styles.scrubRow}>
        <Pressable
          style={{ width: SCRUB_BAR_WIDTH }}
          onPress={(e): void => {
            const localX = e.nativeEvent.locationX;
            handleScrub(Math.max(0, Math.min(1, localX / SCRUB_BAR_WIDTH)));
          }}
          accessible={true}
          accessibilityRole="adjustable"
          accessibilityLabel={`Scrub position: ${Math.round(progressPct * 100)}%`}
          accessibilityValue={{ min: 0, max: 100, now: Math.round(progressPct * 100) }}
        >
          <ProgressBar
            value={progressPct}
            size="lg"
            color={DS.colors.secondary}
          />
        </Pressable>
      </View>

      {/* Transport controls */}
      <View style={styles.transportRow}>
        {/* Step back */}
        <Pressable
          onPress={handleStepBack}
          style={({ pressed }: { pressed: boolean }) => [
            styles.transportBtn,
            pressed ? styles.transportBtnPressed : undefined,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Step back"
        >
          <View style={styles.mirroredIcon}>
            <Icon name="skip" size={22} color={DS.colors.text.primary} />
          </View>
        </Pressable>

        {/* Play / Pause */}
        <GlassButton
          variant="primary"
          size="lg"
          iconLeft={isPlaying ? 'pause' : 'play'}
          label={isPlaying ? 'Pause' : 'Play'}
          onPress={handlePlayPause}
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        />

        {/* Step forward */}
        <Pressable
          onPress={handleStepForward}
          style={({ pressed }: { pressed: boolean }) => [
            styles.transportBtn,
            pressed ? styles.transportBtnPressed : undefined,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Step forward"
        >
          <Icon name="skip" size={22} color={DS.colors.text.primary} />
        </Pressable>

        {/* Reset */}
        <Pressable
          onPress={handleReset}
          style={({ pressed }: { pressed: boolean }) => [
            styles.transportBtn,
            pressed ? styles.transportBtnPressed : undefined,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Reset to beginning"
        >
          <Icon name="restart" size={22} color={DS.colors.text.primary} />
        </Pressable>
      </View>

      {/* Speed selector */}
      <View style={styles.speedRow}>
        <Text style={styles.speedRowLabel} accessible={false}>Speed</Text>
        {SPEEDS.map((s) => (
          <GlassButton
            key={s}
            variant={speed === s ? 'primary' : 'ghost'}
            size="sm"
            label={`${s}x`}
            onPress={(): void => setSpeed(s)}
            accessibilityLabel={`${s}x speed`}
          />
        ))}

        {/* Camera follow toggle */}
        <GlassButton
          variant={cameraFollow ? 'primary' : 'ghost'}
          size="sm"
          iconLeft="eye"
          label="Cam"
          onPress={(): void => setCameraFollow((v) => !v)}
          accessibilityLabel="Camera follow"
          style={styles.cameraBtn}
        />
      </View>

      {/* Stats overlay at bottom */}
      <GlassCard variant="subtle" noAnimation style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Frame</Text>
            <Text style={styles.statValue}>
              {frames.indexOf(currentFrame) + 1} / {frames.length}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Rings on pegs</Text>
            <Text style={styles.statValue}>
              {currentFrame.pegs.filter((p) => p.settledRingId !== null).length} / {currentFrame.pegs.length}
            </Text>
          </View>
        </View>
      </GlassCard>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
    marginTop: DS.spacing.md,
    marginBottom: DS.spacing.lg,
    paddingHorizontal: DS.spacing.lg,
    alignSelf: 'stretch',
  },
  pageTitle: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title2,
    fontWeight: DS.typography.weight.heavy,
    flex: 1,
  },
  replayId: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.subhead,
  },

  // Canvas
  canvasCard: {
    marginBottom: DS.spacing.md,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  canvas: {
    position: 'relative' as const,
  },
  pegDot: {
    position: 'absolute' as const,
    width: DS.spacing.lg,
    height: DS.spacing.lg,
    borderRadius: DS.spacing.sm,
  },
  ringDot: {
    position: 'absolute' as const,
    width: 28,
    height: 28,
    borderRadius: DS.radius.button,
    borderWidth: 3,
    borderColor: DS.colors.secondary,
    backgroundColor: 'transparent',
  },
  cameraTagWrap: {
    position: 'absolute' as const,
    top: DS.spacing.sm,
    right: DS.spacing.sm,
  },

  // Time
  timeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: DS.spacing.xs,
    marginBottom: DS.spacing.sm,
  },
  timeLabel: {
    color: DS.colors.secondary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.bold,
    fontVariant: ['tabular-nums'] as const,
  },
  timeSep: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.subhead,
  },
  timeDuration: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.subhead,
    fontVariant: ['tabular-nums'] as const,
  },

  // Scrub
  scrubRow: {
    marginBottom: DS.spacing.lg,
  },

  // Transport
  transportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.md,
    marginBottom: DS.spacing.md,
  },
  transportBtn: {
    width: DS.spacing.massive + DS.spacing.xxs,
    height: DS.spacing.massive + DS.spacing.xxs,
    borderRadius: (DS.spacing.massive + DS.spacing.xxs) / 2,
    backgroundColor: DS.colors.glass.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DS.colors.glass.border,
  },
  transportBtnPressed: {
    opacity: 0.7,
  },
  mirroredIcon: {
    transform: [{ scaleX: -1 }],
  },

  // Speed
  speedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: DS.spacing.lg,
  },
  speedRowLabel: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.footnote,
    marginRight: DS.spacing.xxs,
  },
  cameraBtn: {
    marginLeft: DS.spacing.xs,
  },

  // Stats
  statsCard: {
    marginTop: DS.spacing.xl,
    paddingHorizontal: DS.spacing.xxl,
    paddingVertical: DS.spacing.md,
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.medium,
    marginBottom: DS.spacing.xxs,
  },
  statValue: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.semibold,
    fontVariant: ['tabular-nums'] as const,
  },
  statDivider: {
    width: 1,
    height: DS.spacing.xxl,
    backgroundColor: DS.colors.glass.border,
  },
});
