/**
 * Game domain types — shared across three or more features.
 *
 * Lives in src/types/ per Requirement 2.6.
 *
 * Requirements: 4.4, 9.1, 17.3
 */

import type { SharedValue } from 'react-native-reanimated';

import type { PegState, RingPosition, RingVelocity, WinLossState } from './challenge';

// Re-export runtime game-state primitives so consumers can import from a
// single location when they need both the bridge types and the state types.
export type { PegState, RingPosition, RingVelocity, WinLossState } from './challenge';

// ---------------------------------------------------------------------------
// PhysicsSharedBridge — the Reanimated shared-value contract between the
// game loop (UI thread / worklet) and the React render tree (JS thread).
//
// Requirement 4.4: "THE Physics State SHALL be communicated to the React
// render tree exclusively via Reanimated useSharedValue references; no
// setState call SHALL originate from the game loop."
//
// Pattern overview
// ────────────────
//   ┌────────────────────────────────┐
//   │  GameLoop (Reanimated worklet) │  writes shared values each tick
//   └──────────────┬─────────────────┘
//                  │  SharedValue<T>   (no setState, no JS bridge crossing)
//   ┌──────────────▼─────────────────┐
//   │  React render tree             │  reads via useAnimatedStyle / useDerivedValue
//   └────────────────────────────────┘
// ---------------------------------------------------------------------------

/**
 * PhysicsSharedBridge holds all Reanimated shared values that represent
 * live game-loop state for the current active challenge.
 *
 * ### Writing (game loop side)
 * The GameLoop runs inside a Reanimated 3 worklet.  It updates these
 * shared values every physics tick (16.67 ms) via direct `.value =` writes.
 * **No `setState` call is ever made from the game loop.**
 *
 * ### Reading (React render tree side)
 * UI components subscribe to these values through `useAnimatedStyle`,
 * `useAnimatedProps`, or `useDerivedValue`.  Changes are applied on the
 * UI thread without going through the React reconciler.
 *
 * @example
 * ```tsx
 * function RingView({ bridge }: { bridge: PhysicsSharedBridge }) {
 *   const style = useAnimatedStyle(() => ({
 *     transform: [
 *       { translateX: bridge.ringPositions.value[0]?.x ?? 0 },
 *       { translateY: bridge.ringPositions.value[0]?.y ?? 0 },
 *     ],
 *   }));
 *   return <Animated.View style={style} />;
 * }
 * ```
 *
 * Requirements: 4.4
 */
export interface PhysicsSharedBridge {
  /**
   * Live positions and rotations for every ring in the current challenge.
   * Array index corresponds to the ring order in `ChallengeConfig.rings`.
   *
   * Written by the GameLoop worklet after each physics tick.
   * Interpolated positions (alpha-blended) are written here, not raw
   * Matter.js body positions, so rendering is smooth at 60/90/120 Hz.
   */
  ringPositions: SharedValue<RingPosition[]>;

  /**
   * Live velocities for every ring in the current challenge.
   * Used by renderers to scale wake/ripple effects.
   */
  ringVelocities: SharedValue<RingVelocity[]>;

  /**
   * Live peg occupancy states.
   * A non-null `settledRingId` means a ring has landed and been accepted.
   */
  pegStates: SharedValue<PegState[]>;

  /**
   * Countdown timer in whole seconds (floor of remaining time).
   * Written by the GameLoop every tick; drives the HUD timer display.
   */
  timerRemaining: SharedValue<number>;

  /**
   * Current win/loss lifecycle state for the active challenge.
   *
   * The game loop writes 'won' or 'lost' when the outcome is determined.
   * UI screens observe this value to trigger transition animations without
   * relying on a React state update from the game loop.
   */
  winLossState: SharedValue<WinLossState>;
}
