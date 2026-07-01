/**
 * DebugOverlay.tsx
 *
 * Developer debug overlay for the Water Ring Puzzle Game.
 *
 * ## Tree-shaking / production safety
 *
 * The entire module guards on `__DEV__`.  In production builds React Native
 * sets `__DEV__ = false` and Metro's dead-code elimination / minifier removes
 * all code in the `if (__DEV__)` branches, so nothing from this file ships in
 * a release build.
 *
 * The exported React component (`DebugOverlay`) renders `null` when
 * `__DEV__ === false`, making it safe to unconditionally include in the render
 * tree — it becomes a literal no-op at runtime and is tree-shaken at build
 * time.
 *
 * ## Usage
 *
 * ```tsx
 * import { DebugOverlay, useDebugOverlay } from './DebugOverlay';
 *
 * // In your game screen component:
 * const { isVisible, toggle, stats } = useDebugOverlay();
 *
 * // Mount the overlay once in the component tree:
 * <DebugOverlay />
 * ```
 *
 * ## Toggle
 *
 * - Call `enableDebugOverlay()` / `disableDebugOverlay()` from anywhere
 *   (e.g. a shake gesture handler or dev menu entry).
 * - Alternatively, call `toggle()` from the `useDebugOverlay()` hook result.
 *
 * ## Shake gesture integration example
 *
 * ```ts
 * import { DevSettings } from 'react-native';
 * import { enableDebugOverlay, disableDebugOverlay } from './DebugOverlay';
 *
 * if (__DEV__) {
 *   DevSettings.addMenuItem('Toggle Debug Overlay', () => {
 *     // Call enable/disable based on your own visibility state.
 *     enableDebugOverlay();
 *   });
 * }
 * ```
 *
 * Requirements: 3.3.3
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ---------------------------------------------------------------------------
// Stats interface (public API)
// ---------------------------------------------------------------------------

/**
 * All debug statistics displayed in the overlay.
 *
 * Consumers populate this struct by passing it to `updateDebugStats()`.
 */
export interface DebugStats {
  /** Frames rendered per second (smoothed). */
  fps: number;
  /** Time taken to execute one physics tick in milliseconds. */
  physicsTickMs: number;
  /** Number of ring bodies currently active in the physics world. */
  ringCount: number;
  /** Number of peg bodies currently active in the physics world. */
  pegCount: number;
  /** The current challenge number (1-based). */
  challengeNumber: number;
  /** The template ID of the current challenge (e.g. 'Classic'). */
  templateId: string;
  /** Active adaptive-assist flags (e.g. ['slow_rings', 'aim_guide']). */
  assistFlags: string[];
  /** Most-recent MMKV synchronous write latency in milliseconds. */
  mmkvWriteLatencyMs: number;
}

// ---------------------------------------------------------------------------
// Default stats
// ---------------------------------------------------------------------------

const DEFAULT_STATS: DebugStats = {
  fps: 0,
  physicsTickMs: 0,
  ringCount: 0,
  pegCount: 0,
  challengeNumber: 0,
  templateId: '',
  assistFlags: [],
  mmkvWriteLatencyMs: 0,
};

// ---------------------------------------------------------------------------
// Module-level overlay state  (outside React — imperative toggle API)
// ---------------------------------------------------------------------------

/** Registered setState dispatch functions from all mounted hooks. */
const _visibilityListeners: Set<React.Dispatch<React.SetStateAction<boolean>>> = new Set();
const _statsListeners: Set<React.Dispatch<React.SetStateAction<DebugStats>>> = new Set();

let _isVisible = false;
let _currentStats: DebugStats = { ...DEFAULT_STATS };

// ---------------------------------------------------------------------------
// Imperative public API
// ---------------------------------------------------------------------------

/**
 * Enable the debug overlay.  No-op in production (`__DEV__ === false`).
 */
export function enableDebugOverlay(): void {
  if (!__DEV__) {
    return;
  }
  _isVisible = true;
  _visibilityListeners.forEach((fn) => fn(true));
}

/**
 * Disable the debug overlay.  No-op in production (`__DEV__ === false`).
 */
export function disableDebugOverlay(): void {
  if (!__DEV__) {
    return;
  }
  _isVisible = false;
  _visibilityListeners.forEach((fn) => fn(false));
}

/**
 * Update the stats displayed in the overlay.
 * Silently ignored in production.
 *
 * Call this every game tick (or at a lower rate, e.g. every 10 ticks) from
 * the game loop or a perf-monitoring hook.
 */
export function updateDebugStats(stats: Partial<DebugStats>): void {
  if (!__DEV__) {
    return;
  }
  _currentStats = { ..._currentStats, ...stats };
  _statsListeners.forEach((fn) => fn(_currentStats));
}

/**
 * Reset the overlay to the hidden state with default stats.
 * Primarily useful between tests.
 */
export function _resetDebugOverlay(): void {
  _isVisible = false;
  _currentStats = { ...DEFAULT_STATS };
  _visibilityListeners.forEach((fn) => fn(false));
  _statsListeners.forEach((fn) => fn(_currentStats));
}

// ---------------------------------------------------------------------------
// React hook
// ---------------------------------------------------------------------------

/**
 * Hook that provides reactive access to the debug overlay state.
 *
 * Returns `{ isVisible, toggle, stats }`.
 *
 * In production (`__DEV__ === false`) this hook returns a frozen no-op
 * object — `isVisible` is always `false`, `toggle` is a no-op, and `stats`
 * is the zero-value `DEFAULT_STATS`.
 */
export function useDebugOverlay(): {
  isVisible: boolean;
  toggle: () => void;
  stats: DebugStats;
} {
  if (!__DEV__) {
    // Production no-op — stable reference, never causes re-renders.
    return PRODUCTION_NO_OP;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [isVisible, setIsVisible] = useState<boolean>(_isVisible);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [stats, setStats] = useState<DebugStats>(_currentStats);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    _visibilityListeners.add(setIsVisible);
    _statsListeners.add(setStats);
    // Sync with any state changes that occurred before this component mounted.
    setIsVisible(_isVisible);
    setStats(_currentStats);
    return () => {
      _visibilityListeners.delete(setIsVisible);
      _statsListeners.delete(setStats);
    };
  }, []);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const toggle = useCallback(() => {
    if (_isVisible) {
      disableDebugOverlay();
    } else {
      enableDebugOverlay();
    }
  }, []);

  return { isVisible, toggle, stats };
}

// Production no-op — created once outside the hook so the reference is stable
// and calling the hook in production never allocates.
const PRODUCTION_NO_OP = {
  isVisible: false,
  toggle: (): void => undefined,
  stats: DEFAULT_STATS,
} as const;

// ---------------------------------------------------------------------------
// React component
// ---------------------------------------------------------------------------

/**
 * Debug overlay component.
 *
 * Renders `null` in production (`__DEV__ === false`).
 *
 * Mount this once near the root of your game screen:
 *
 * ```tsx
 * <View style={{ flex: 1 }}>
 *   <GameCanvas />
 *   <DebugOverlay />
 * </View>
 * ```
 */
// eslint-disable-next-line max-lines-per-function
export function DebugOverlay(): React.ReactElement | null {
  if (!__DEV__) {
    return null;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const { isVisible, stats } = useDebugOverlay();

  if (!isVisible) {
    return null;
  }

  const assistFlagsText =
    stats.assistFlags.length > 0 ? stats.assistFlags.join(', ') : 'none';

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={styles.panel}>
        <Text style={styles.title}>[DBG] DEBUG</Text>
        <Text style={styles.row}>
          FPS: <Text style={styles.value}>{stats.fps.toFixed(1)}</Text>
        </Text>
        <Text style={styles.row}>
          Physics tick:{' '}
          <Text style={styles.value}>{stats.physicsTickMs.toFixed(2)} ms</Text>
        </Text>
        <Text style={styles.row}>
          Rings: <Text style={styles.value}>{stats.ringCount}</Text>
        </Text>
        <Text style={styles.row}>
          Pegs: <Text style={styles.value}>{stats.pegCount}</Text>
        </Text>
        <Text style={styles.row}>
          Challenge: <Text style={styles.value}>{stats.challengeNumber}</Text>
        </Text>
        <Text style={styles.row}>
          Template: <Text style={styles.value}>{stats.templateId}</Text>
        </Text>
        <Text style={styles.row}>
          Assist: <Text style={styles.value}>{assistFlagsText}</Text>
        </Text>
        <Text style={styles.row}>
          MMKV: <Text style={styles.value}>{stats.mmkvWriteLatencyMs.toFixed(2)} ms</Text>
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 48,
    right: 8,
    zIndex: 9999,
  },
  panel: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    padding: 8,
    minWidth: 180,
  },
  title: {
    color: '#00ff88',
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  row: {
    color: '#cccccc',
    fontSize: 10,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  value: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
});
