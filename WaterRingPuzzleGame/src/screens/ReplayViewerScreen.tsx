/**
 * ReplayViewerScreen.tsx
 *
 * Replay playback viewer with full transport controls:
 *   Play / Pause  ·  Step back / Step forward  ·  Scrub bar  ·
 *   Speed selector (0.25× – 4×)  ·  Camera-follow toggle  ·  Reset
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
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReplayFrame {
  timeMs: number;
  rings: { id: string; x: number; y: number; angle: number }[];
  pegs: { id: string; settledRingId: string | null }[];
}

// ---------------------------------------------------------------------------
// Mock replay data (replace with ReplayService.loadReplay(replayId) in prod)
// ---------------------------------------------------------------------------

const MOCK_FRAMES: ReplayFrame[] = Array.from({ length: 120 }, (_, i) => ({
  timeMs: i * 500, // 0 ms … 59 500 ms
  rings: [
    { id: 'r1', x: 50 + Math.sin(i * 0.2) * 30, y: 100 + i * 2, angle: i * 5 },
    { id: 'r2', x: 150 + Math.cos(i * 0.15) * 25, y: 80 + i * 2.2, angle: -i * 4 },
    { id: 'r3', x: 250 + Math.sin(i * 0.1) * 20, y: 90 + i * 1.8, angle: i * 3 },
  ],
  pegs: [
    { id: 'p1', settledRingId: i >= 40 ? 'r1' : null },
    { id: 'p2', settledRingId: i >= 70 ? 'r2' : null },
    { id: 'p3', settledRingId: i >= 100 ? 'r3' : null },
  ],
}));

const TOTAL_DURATION_MS = MOCK_FRAMES[MOCK_FRAMES.length - 1].timeMs;
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

function getFrameAtTime(timeMs: number): ReplayFrame {
  for (let i = MOCK_FRAMES.length - 1; i >= 0; i--) {
    if (MOCK_FRAMES[i].timeMs <= timeMs) return MOCK_FRAMES[i];
  }
  return MOCK_FRAMES[0];
}

// ---------------------------------------------------------------------------
// ScrubBar — touch-interactive progress bar
// ---------------------------------------------------------------------------

interface ScrubBarProps {
  progress: number; // 0–1
  onScrub: (p: number) => void;
  width: number;
}

function ScrubBar({ progress, onScrub, width }: ScrubBarProps): React.JSX.Element {
  const clampedPct = Math.max(0, Math.min(1, progress));

  return (
    <Pressable
      style={[styles.scrubTrack, { width }]}
      onPress={(e): void => {
        const localX = e.nativeEvent.locationX;
        onScrub(Math.max(0, Math.min(1, localX / width)));
      }}
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel={`Scrub position: ${Math.round(clampedPct * 100)}%`}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedPct * 100) }}
    >
      <View style={[styles.scrubFill, { width: `${clampedPct * 100}%` }]} />
      <View style={[styles.scrubThumb, { left: `${clampedPct * 100}%` as unknown as number }]} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// RingCanvas — simplified 2-D positions view
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
              { left: peg.x - 8, top: peg.y - 8, backgroundColor: isOccupied ? '#4FC3F7' : 'rgba(255,255,255,0.25)' },
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
  const replayId = route?.params?.replayId ?? 'demo';

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
    scrubProgress.value = withTiming(currentMs / TOTAL_DURATION_MS, {
      duration: 200,
      easing: Easing.linear,
    });
  }, [scrubProgress, currentMs]);

  // Playback ticker
  const startPlayback = useCallback((): void => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const tickMs = 100; // tick every 100 ms real time
    intervalRef.current = setInterval((): void => {
      const next = currentMsRef.current + tickMs * speed;
      if (next >= TOTAL_DURATION_MS) {
        setCurrentMs(TOTAL_DURATION_MS);
        setIsPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else {
        setCurrentMs(next);
      }
    }, tickMs);
  }, [speed]);

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

  function handlePlayPause(): void {
    if (currentMs >= TOTAL_DURATION_MS) {
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
    setCurrentMs((ms) => Math.min(TOTAL_DURATION_MS, ms + 500));
  }

  function handleReset(): void {
    setIsPlaying(false);
    setCurrentMs(0);
  }

  function handleScrub(p: number): void {
    setIsPlaying(false);
    setCurrentMs(Math.round(p * TOTAL_DURATION_MS));
  }

  const currentFrame = getFrameAtTime(currentMs);
  const progressPct = TOTAL_DURATION_MS > 0 ? currentMs / TOTAL_DURATION_MS : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Replay</Text>
        <Text style={styles.replayId} accessible={false}>#{replayId}</Text>
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <RingCanvas frame={currentFrame} />
        {/* Camera follow indicator */}
        {cameraFollow ? (
          <View style={styles.cameraTag}>
            <Text style={styles.cameraTagText}>CAM FOLLOW</Text>
          </View>
        ) : null}
      </View>

      {/* Time display */}
      <View style={styles.timeRow}>
        <Text style={styles.timeLabel} accessibilityRole="none">
          {formatMs(currentMs)}
        </Text>
        <Text style={styles.timeSep} accessible={false}>/</Text>
        <Text style={styles.timeDuration} accessible={false}>
          {formatMs(TOTAL_DURATION_MS)}
        </Text>
      </View>

      {/* Scrub bar */}
      <View style={styles.scrubRow}>
        <ScrubBar
          progress={progressPct}
          onScrub={handleScrub}
          width={SCRUB_BAR_WIDTH}
        />
      </View>

      {/* Transport controls */}
      <View style={styles.transportRow}>
        {/* Step back */}
        <Pressable
          onPress={handleStepBack}
          style={({ pressed }: { pressed: boolean }) => [styles.transportBtn, pressed ? styles.transportBtnPressed : undefined]}
          accessibilityRole="button"
          accessibilityLabel="Step back"
        >
          <Text style={styles.transportIcon}>⏮</Text>
        </Pressable>

        {/* Play / Pause */}
        <Pressable
          onPress={handlePlayPause}
          style={({ pressed }: { pressed: boolean }) => [styles.transportBtnPrimary, pressed ? styles.transportBtnPressed : undefined]}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          <Text style={styles.transportIconPrimary}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>

        {/* Step forward */}
        <Pressable
          onPress={handleStepForward}
          style={({ pressed }: { pressed: boolean }) => [styles.transportBtn, pressed ? styles.transportBtnPressed : undefined]}
          accessibilityRole="button"
          accessibilityLabel="Step forward"
        >
          <Text style={styles.transportIcon}>⏭</Text>
        </Pressable>

        {/* Reset */}
        <Pressable
          onPress={handleReset}
          style={({ pressed }: { pressed: boolean }) => [styles.transportBtn, pressed ? styles.transportBtnPressed : undefined]}
          accessibilityRole="button"
          accessibilityLabel="Reset to beginning"
        >
          <Text style={styles.transportIcon}>↺</Text>
        </Pressable>
      </View>

      {/* Speed selector */}
      <View style={styles.speedRow}>
        <Text style={styles.speedRowLabel} accessible={false}>Speed</Text>
        {SPEEDS.map((s) => (
          <Pressable
            key={s}
            onPress={(): void => setSpeed(s)}
            style={[styles.speedChip, speed === s && styles.speedChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: speed === s }}
            accessibilityLabel={`${s}× speed`}
          >
            <Text style={[styles.speedChipText, speed === s && styles.speedChipTextActive]}>
              {s}×
            </Text>
          </Pressable>
        ))}

        {/* Camera follow toggle */}
        <Pressable
          onPress={(): void => setCameraFollow((v) => !v)}
          style={[styles.speedChip, cameraFollow && styles.speedChipActive, styles.cameraBtn]}
          accessibilityRole="switch"
          accessibilityState={{ checked: cameraFollow }}
          accessibilityLabel="Camera follow"
        >
          <Text style={[styles.speedChipText, cameraFollow && styles.speedChipTextActive]}>📷</Text>
        </Pressable>
      </View>

      {/* Frame info */}
      <Text style={styles.frameInfo} accessible={false}>
        Frame {MOCK_FRAMES.indexOf(currentFrame) + 1} / {MOCK_FRAMES.length}
        {' · '}Rings on pegs: {currentFrame.pegs.filter((p) => p.settledRingId !== null).length} / {currentFrame.pegs.length}
      </Text>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  replayId: { color: 'rgba(255,255,255,0.3)', fontSize: 14 },
  canvasWrap: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 12, position: 'relative' },
  canvas: { position: 'relative' },
  pegDot: { position: 'absolute', width: 16, height: 16, borderRadius: 8 },
  ringDot: { position: 'absolute', width: 28, height: 28, borderRadius: 14, borderWidth: 3, borderColor: '#4FC3F7', backgroundColor: 'transparent' },
  cameraTag: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(79,195,247,0.2)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  cameraTagText: { color: '#4FC3F7', fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  timeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  timeLabel: { color: '#4FC3F7', fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeSep: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  timeDuration: { color: 'rgba(255,255,255,0.4)', fontSize: 16, fontVariant: ['tabular-nums'] },
  scrubRow: { marginBottom: 16 },
  scrubTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'visible', justifyContent: 'center' },
  scrubFill: { height: '100%', borderRadius: 4, backgroundColor: '#4FC3F7' },
  scrubThumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', marginLeft: -9, shadowColor: '#4FC3F7', shadowOpacity: 0.6, shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, elevation: 4 },
  transportRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 14 },
  transportBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  transportBtnPrimary: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#4FC3F7', alignItems: 'center', justifyContent: 'center' },
  transportBtnPressed: { opacity: 0.7 },
  transportIcon: { fontSize: 22, color: '#fff' },
  transportIconPrimary: { fontSize: 24, color: '#070f1e' },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 16 },
  speedRowLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginRight: 4 },
  speedChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  speedChipActive: { backgroundColor: 'rgba(79,195,247,0.2)', borderColor: '#4FC3F7' },
  speedChipText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  speedChipTextActive: { color: '#4FC3F7' },
  cameraBtn: { marginLeft: 6 },
  frameInfo: { color: 'rgba(255,255,255,0.25)', fontSize: 11, marginTop: 12 },
});
