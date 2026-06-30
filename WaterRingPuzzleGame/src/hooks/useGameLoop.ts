/**
 * useGameLoop
 *
 * React hook that configures and drives the fixed-timestep game loop for
 * an active challenge.
 *
 * ## Threading model
 *
 * The game loop runs inside a Reanimated 3 worklet on the UI thread
 * (via `useFrameCallback`).  All physics-state writes happen directly to
 * Reanimated shared values — **never via React setState**.
 *
 * Requirement 4.1: "THE Game Loop Controller SHALL execute in a React Native
 * Reanimated 3 Worklet on the UI thread, never on the JS thread."
 *
 * Requirement 4.4: "THE Physics State SHALL be communicated to the React
 * render tree exclusively via Reanimated useSharedValue references; no
 * setState call SHALL originate from the game loop."
 *
 * ## IMPORTANT — no setState in this file
 *
 * This file (and any file in `src/features/game/core/GameLoop.ts`) must
 * NEVER call React's `useState` setter, `dispatch` from a Zustand store, or
 * any other JS-thread state mutation from within the worklet body.
 *
 * The only allowed side-effect from inside the worklet is a `.value =`
 * write on a `SharedValue` from `PhysicsSharedBridge`.
 *
 * @module useGameLoop
 */

import type { ChallengeConfig } from '../types/challenge';
import type { PhysicsSharedBridge } from '../types/game';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Configuration accepted by `useGameLoop`.
 */
export interface UseGameLoopOptions {
  /**
   * The fully-resolved challenge configuration returned by
   * `ChallengeGenerator.generate(n)`.  Pass `null` when no challenge is
   * active (the loop will not start).
   */
  config: ChallengeConfig | null;

  /**
   * The shared-value bridge created by `usePhysicsSharedState`.
   * The game loop writes ring positions, velocities, peg states, timer, and
   * win/loss state into this bridge every physics tick.
   */
  bridge: PhysicsSharedBridge;

  /**
   * Optional callback invoked (on the JS thread) when the win condition is
   * met.  The game loop fires `win_condition_met` and pauses physics before
   * this callback is called.
   *
   * Requirement 3.3: "WHEN the game loop detects a win, THE System SHALL
   * fire `win_condition_met` and pause physics immediately."
   */
  onWin?: () => void;

  /**
   * Optional callback invoked (on the JS thread) when the timer reaches
   * zero.
   */
  onTimerExpire?: () => void;
}

/**
 * Controls returned by `useGameLoop` for imperative game-loop management.
 */
export interface GameLoopControls {
  /**
   * Pause the physics simulation.  Safe to call when already paused.
   * The frame callback continues running but physics ticks are skipped.
   */
  pause: () => void;

  /**
   * Resume a paused simulation.  No-op when already running.
   */
  resume: () => void;

  /**
   * Hard-stop the game loop and release all physics resources.
   * Called automatically on unmount.
   */
  stop: () => void;
}

/**
 * Hook that wires up the fixed-timestep game loop to a `PhysicsSharedBridge`.
 *
 * When `options.config` is non-null the loop starts automatically.  The loop
 * is torn down when the component unmounts or when `config` becomes `null`.
 *
 * @param options - Challenge config and bridge to write into.
 * @returns Imperative controls for pause / resume / stop.
 *
 * @example
 * ```tsx
 * function GameScreen({ challengeNumber }: { challengeNumber: number }) {
 *   const config = useChallengeConfig(challengeNumber); // from challengeSlice
 *   const bridge = usePhysicsSharedState();
 *   const { pause, resume } = useGameLoop({ config, bridge, onWin: handleWin });
 *
 *   return <GameRenderer bridge={bridge} onPause={pause} onResume={resume} />;
 * }
 * ```
 *
 * Requirements: 4.1, 4.4, 9.1, 9.2, 9.3, 9.4
 *
 * @todo Implement fixed-timestep accumulator loop in a Reanimated 3
 *       `useFrameCallback` worklet (Task 3.1.1).  The stub below is a
 *       placeholder so dependent modules can import the hook signature
 *       without runtime errors.
 */
export function useGameLoop(_options: UseGameLoopOptions): GameLoopControls {
  // ---------------------------------------------------------------------------
  // STUB — full implementation in Task 3.1.1
  //
  // When implemented this hook will:
  //   1. Initialise PhysicsWorld with options.config
  //   2. Register a useFrameCallback worklet that runs the fixed-timestep loop:
  //        processInput → applyWaterForces → Matter.Engine.update
  //          → checkWinCondition → checkTimerExpiry
  //          → checkAdaptiveAssistance → persistStateIfCheckpoint
  //   3. Write interpolated positions/velocities to options.bridge each tick
  //   4. Fire options.onWin / options.onTimerExpire via runOnJS when needed
  //   5. Serialise physics state to MMKV at 1-second checkpoints
  //
  // ─── NO setState RULE ───────────────────────────────────────────────────
  // All per-frame state updates MUST go through options.bridge shared values.
  // The Zustand store (challengeSlice) is written only at checkpoint events
  // (challenge start, end, continue) — never on every tick.
  // ────────────────────────────────────────────────────────────────────────
  // ---------------------------------------------------------------------------

  const noop = (): void => {
    // intentional no-op for stub controls
  };

  return {
    pause: noop,
    resume: noop,
    stop: noop,
  };
}
