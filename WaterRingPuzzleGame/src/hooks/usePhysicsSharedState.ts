/**
 * usePhysicsSharedState
 *
 * Allocates and owns the Reanimated shared values that form the
 * physics-to-render bridge (`PhysicsSharedBridge`).
 *
 * ## Responsibility split
 *
 * | Layer              | Responsibility                                       |
 * |--------------------|------------------------------------------------------|
 * | `usePhysicsSharedState` | Allocates shared values once; exposes the bridge |
 * | `GameLoop` (worklet)    | Writes to these values every physics tick        |
 * | React render tree  | Reads via `useAnimatedStyle` / `useDerivedValue`     |
 *
 * ## Why no useState?
 * The game loop runs inside a Reanimated 3 worklet on the UI thread.
 * Calling `setState` from a worklet would post a message to the JS thread
 * on every 16 ms tick — creating a minimum of 60 React re-renders per
 * second, causing guaranteed jank.  Instead, shared values are written
 * directly from the worklet and consumed by animated styles, so the React
 * reconciler is never involved in per-frame updates.
 *
 * Requirement 4.4: "THE Physics State SHALL be communicated to the React
 * render tree exclusively via Reanimated useSharedValue references; no
 * setState call SHALL originate from the game loop."
 *
 * @module usePhysicsSharedState
 */

import { useSharedValue } from 'react-native-reanimated';

import type { PhysicsSharedBridge, PegState, RingPosition, RingVelocity, WinLossState } from '../types/game';

/**
 * Allocates the set of Reanimated shared values required to bridge the
 * game-loop worklet and the React render tree.
 *
 * The hook initialises every shared value to a sensible empty/idle default.
 * The game loop (once started via `useGameLoop`) will overwrite these values
 * on each physics tick.
 *
 * ### Lifecycle
 * - Call this hook once in the `GameScreen` component.
 * - Pass the returned `PhysicsSharedBridge` to both `useGameLoop` (writer)
 *   and any animated render component (reader).
 * - Shared values are stable references — they do **not** change between
 *   renders, so downstream `useAnimatedStyle` hooks that depend on them
 *   will never re-subscribe unnecessarily.
 *
 * @returns {PhysicsSharedBridge} A stable bridge of Reanimated shared values.
 *
 * @example
 * ```tsx
 * function GameScreen() {
 *   const bridge = usePhysicsSharedState();
 *   useGameLoop(config, bridge);
 *
 *   return <GameRenderer bridge={bridge} />;
 * }
 * ```
 *
 * Requirements: 4.4
 */
export function usePhysicsSharedState(): PhysicsSharedBridge {
  // Ring positions — array of { id, x, y, angle } per ring.
  // Initialised empty; populated when a challenge is loaded.
  const ringPositions = useSharedValue<RingPosition[]>([]);

  // Ring velocities — array of { id, vx, vy, angularV } per ring.
  const ringVelocities = useSharedValue<RingVelocity[]>([]);

  // Peg occupancy states — array of { id, settledRingId } per peg.
  const pegStates = useSharedValue<PegState[]>([]);

  // Timer countdown in seconds.  Starts at the challenge's totalSeconds
  // and counts down to 0.  Initialised to 0 (no active challenge).
  const timerRemaining = useSharedValue<number>(0);

  // Win/loss lifecycle.  Starts in 'idle'; transitions:
  //   idle → playing → won | lost → idle (on next challenge load).
  const winLossState = useSharedValue<WinLossState>('idle');

  // Return a stable object.  Because each useSharedValue call returns a
  // stable reference (Reanimated guarantees this), the object literal below
  // is also stable across renders — no useMemo needed.
  return {
    ringPositions,
    ringVelocities,
    pegStates,
    timerRemaining,
    winLossState,
  };
}
