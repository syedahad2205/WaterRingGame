/**
 * InputController.ts
 *
 * Translates raw touch press/release events into typed InputEvents and
 * maintains the full input state machine, including all 6 interaction
 * detection algorithms.
 *
 * ## Detection Algorithms (Requirement 16.1)
 *
 * 1. **Tap** (< 150 ms):        Hold shorter than TAP_MAX_MS → fires `tap_left` / `tap_right`
 * 2. **Hold** (150–1500 ms):    Hold within this window → fires `hold_left` / `hold_right`
 * 3. **Long Hold** (> 1500 ms): Hold exceeds HOLD_MAX_MS → intensity decays
 * 4. **Rapid Tap** (3+ in 500ms): 3+ taps in a sliding 500ms window → `rapid_tap` + turbulence
 * 5. **Simultaneous Press**:    Both buttons held within 50ms of each other → `simultaneous_press`
 * 6. **Alternating Tap** (L-R-L in 600ms): three-gesture sequence within 600ms → `alternating_tap`
 *
 * ## Intensity Ramp Model (Requirement 22.6, Task 3.2.2)
 *
 * ```
 * t < 300ms:   intensity = t / 300              (ramp up)
 * t < 1500ms:  intensity = 1.0                  (peak)
 * t >= 1500ms: intensity = max(0.3, 1.0 - (t - 1500) / 2000)  (decay)
 * ```
 *
 * Requirements: 16.1, 22.6
 */

import type { InputState } from '../physics/WaterSimulation';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** All named typed input event types. */
export type InputEventType =
  | 'tap_left'
  | 'tap_right'
  | 'hold_left'
  | 'hold_right'
  | 'hold_left_peak'
  | 'hold_right_peak'
  | 'rapid_tap'
  | 'simultaneous_press'
  | 'alternating_tap';

/** A typed input event dispatched by the InputController. */
export interface InputEvent {
  type: InputEventType;
  timestamp: number;
}

/** Re-export InputState so consumers can import from InputController alone. */
export type { InputState };

// ---------------------------------------------------------------------------
// Timing thresholds (Requirement 16.1)
// ---------------------------------------------------------------------------

/** Maximum hold duration to classify as a tap (ms). */
export const TAP_MAX_MS = 150;

/** Maximum hold duration before entering long-hold / decay phase (ms). */
export const HOLD_PEAK_MS = 1500;

/** Intensity ramp-up duration (ms) — button ramps 0→1 over this window. */
export const RAMP_UP_MS = 300;

/** Decay duration from peak to floor intensity (ms). */
const DECAY_DURATION_MS = 2000;

/** Minimum intensity floor during long-hold decay. */
const DECAY_FLOOR = 0.3;

/** Sliding window for rapid-tap detection (ms). */
const RAPID_TAP_WINDOW_MS = 500;

/** Minimum number of taps in the window to trigger rapid-tap. */
const RAPID_TAP_COUNT = 3;

/** Maximum time between both buttons being pressed to count as simultaneous (ms). */
const SIMULTANEOUS_WINDOW_MS = 50;

/** Total window for the L-R-L alternating tap sequence (ms). */
const ALTERNATING_TAP_WINDOW_MS = 600;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface ButtonState {
  /** True while the button is physically held. */
  held: boolean;
  /** Timestamp of the most recent press (ms). */
  pressTime: number;
  /** True if a "hold" or "hold_peak" event has already been fired this hold session. */
  holdFired: boolean;
  /** True if a "hold_peak" event has already been fired this hold session. */
  peakFired: boolean;
}

/** Three-stage L-R-L alternating tap tracker. */
type AlternatingStage = 'idle' | 'L1' | 'R';

interface AlternatingState {
  stage: AlternatingStage;
  /** Timestamp of the first tap that started this sequence. */
  windowStart: number;
}

interface ControllerState {
  left: ButtonState;
  right: ButtonState;
  /** Ring buffer of recent tap timestamps for rapid-tap detection. */
  tapHistory: number[];
  /** Current turbulence state. */
  turbulenceActive: boolean;
  /** Turbulence seed (set from the input timestamp). */
  turbulenceSeed: number;
  /** Alternating tap tracker. */
  alternating: AlternatingState;
  /** Arena dimensions (written by caller or defaults). */
  arenaWidth: number;
  arenaHeight: number;
  /** Collected output events since last call to drainEvents(). */
  pendingEvents: InputEvent[];
}

let _state: ControllerState = createInitialState();

function createInitialState(): ControllerState {
  return {
    left: { held: false, pressTime: 0, holdFired: false, peakFired: false },
    right: { held: false, pressTime: 0, holdFired: false, peakFired: false },
    tapHistory: [],
    turbulenceActive: false,
    turbulenceSeed: 0,
    alternating: { stage: 'idle', windowStart: 0 },
    arenaWidth: 400,
    arenaHeight: 800,
    pendingEvents: [],
  };
}

// ---------------------------------------------------------------------------
// Intensity ramp model (Task 3.2.2 / Requirement 22.6)
// ---------------------------------------------------------------------------

/**
 * Compute the 0.0–1.0 intensity for a button that has been held for `holdMs`.
 *
 * ```
 * t < 300ms:   intensity = t / 300              (ramp up)
 * t < 1500ms:  intensity = 1.0                  (peak)
 * t >= 1500ms: intensity = max(0.3, 1.0 - (t - 1500) / 2000)  (decay)
 * ```
 *
 * Requirement 22.6 / Task 3.2.2
 */
export function computeIntensity(holdMs: number): number {
  if (holdMs < 0) {
    return 0;
  }
  if (holdMs < RAMP_UP_MS) {
    // Linear ramp up 0 → 1 over RAMP_UP_MS
    return holdMs / RAMP_UP_MS;
  }
  if (holdMs < HOLD_PEAK_MS) {
    // Full intensity
    return 1.0;
  }
  // Decay after HOLD_PEAK_MS
  const decay = 1.0 - (holdMs - HOLD_PEAK_MS) / DECAY_DURATION_MS;
  return Math.max(DECAY_FLOOR, decay);
}

// ---------------------------------------------------------------------------
// Rapid-tap helpers
// ---------------------------------------------------------------------------

/**
 * Prune tap timestamps older than the sliding window relative to `now`.
 */
function pruneRapidTapHistory(history: number[], now: number): number[] {
  return history.filter((t) => now - t <= RAPID_TAP_WINDOW_MS);
}

/**
 * Record a tap and check if rapid-tap threshold is reached.
 * Returns true when the threshold is crossed.
 */
function recordTap(state: ControllerState, timestamp: number): boolean {
  state.tapHistory = pruneRapidTapHistory(state.tapHistory, timestamp);
  state.tapHistory.push(timestamp);
  return state.tapHistory.length >= RAPID_TAP_COUNT;
}

// ---------------------------------------------------------------------------
// Alternating tap helpers
// ---------------------------------------------------------------------------

/**
 * Advance the L-R-L alternating tap state machine on a tap event.
 * Returns true when the full L-R-L sequence is completed within the window.
 */
function advanceAlternating(
  state: ControllerState,
  side: 'left' | 'right',
  timestamp: number,
): boolean {
  const alt = state.alternating;

  // Check if the window has expired.
  if (
    alt.stage !== 'idle' &&
    timestamp - alt.windowStart > ALTERNATING_TAP_WINDOW_MS
  ) {
    // Reset — sequence timed out.
    alt.stage = 'idle';
  }

  switch (alt.stage) {
    case 'idle':
      if (side === 'left') {
        alt.stage = 'L1';
        alt.windowStart = timestamp;
      }
      return false;

    case 'L1':
      if (side === 'right') {
        alt.stage = 'R';
      } else {
        // Second left tap — restart from here.
        alt.stage = 'L1';
        alt.windowStart = timestamp;
      }
      return false;

    case 'R':
      if (side === 'left') {
        // Sequence complete!
        alt.stage = 'idle';
        return true;
      } else {
        // Another right tap — back to R stage (keep window open).
        return false;
      }
  }
}

// ---------------------------------------------------------------------------
// Simultaneous press detection
// ---------------------------------------------------------------------------

/**
 * Check if both buttons are held and the second press was within the window.
 * Returns true when simultaneous press is detected.
 */
function checkSimultaneous(state: ControllerState, timestamp: number): boolean {
  if (!state.left.held || !state.right.held) {
    return false;
  }
  const gap = Math.abs(state.left.pressTime - state.right.pressTime);
  // Only fire once per simultaneous session (when the SECOND button is pressed).
  // We gate this on `timestamp` being the later of the two press times.
  return gap <= SIMULTANEOUS_WINDOW_MS && timestamp === Math.max(state.left.pressTime, state.right.pressTime);
}

// ---------------------------------------------------------------------------
// Button press handler
// ---------------------------------------------------------------------------

function handlePress(side: 'left' | 'right', timestamp: number): void {
  const btn = side === 'left' ? _state.left : _state.right;

  btn.held = true;
  btn.pressTime = timestamp;
  btn.holdFired = false;
  btn.peakFired = false;

  // Simultaneous press detection.
  if (checkSimultaneous(_state, timestamp)) {
    _state.pendingEvents.push({ type: 'simultaneous_press', timestamp });
  }
}

// ---------------------------------------------------------------------------
// Button release handler
// ---------------------------------------------------------------------------

function handleRelease(side: 'left' | 'right', timestamp: number): void {
  const btn = side === 'left' ? _state.left : _state.right;
  if (!btn.held) {
    return;
  }

  const holdDuration = timestamp - btn.pressTime;
  btn.held = false;

  if (holdDuration < TAP_MAX_MS) {
    // Tap classification.
    const eventType: InputEventType = side === 'left' ? 'tap_left' : 'tap_right';
    _state.pendingEvents.push({ type: eventType, timestamp });

    // Rapid tap detection.
    const rapidTriggered = recordTap(_state, timestamp);
    if (rapidTriggered) {
      _state.pendingEvents.push({ type: 'rapid_tap', timestamp });
      _state.turbulenceActive = true;
      _state.turbulenceSeed = timestamp;
      // Reset history to avoid re-triggering every subsequent tap.
      _state.tapHistory = [];
    }

    // Alternating tap detection.
    const altComplete = advanceAlternating(_state, side, timestamp);
    if (altComplete) {
      _state.pendingEvents.push({ type: 'alternating_tap', timestamp });
    }
  } else {
    // Hold or long-hold classification.
    const eventType: InputEventType = side === 'left' ? 'hold_left' : 'hold_right';
    _state.pendingEvents.push({ type: eventType, timestamp });
  }
}

// ---------------------------------------------------------------------------
// Tick-based hold firing
// ---------------------------------------------------------------------------

/**
 * Called each game tick (from the GameLoop) to fire hold-peak events and
 * clear turbulence once it has been consumed.
 *
 * This also clears `turbulenceActive` so it is a single-tick signal.
 */
export function tick(nowMs: number): void {
  for (const [side, btn] of [
    ['left', _state.left],
    ['right', _state.right],
  ] as const) {
    if (btn.held) {
      const holdDuration = nowMs - btn.pressTime;

      // Fire hold_peak exactly once when we cross the HOLD_PEAK_MS threshold.
      if (holdDuration >= HOLD_PEAK_MS && !btn.peakFired) {
        btn.peakFired = true;
        const eventType: InputEventType =
          side === 'left' ? 'hold_left_peak' : 'hold_right_peak';
        _state.pendingEvents.push({ type: eventType, timestamp: nowMs });
      }

      // Fire hold once when crossing TAP_MAX_MS (transition from tap window to hold window).
      if (holdDuration >= TAP_MAX_MS && !btn.holdFired) {
        btn.holdFired = true;
        const eventType: InputEventType =
          side === 'left' ? 'hold_left' : 'hold_right';
        _state.pendingEvents.push({ type: eventType, timestamp: nowMs });
      }
    }
  }

  // Turbulence is a one-tick signal — clear after one call to getCurrentInputState.
  // (Cleared in getCurrentInputState to ensure the physics tick sees it.)
}

// ---------------------------------------------------------------------------
// Public API — Requirement 16.1
// ---------------------------------------------------------------------------

/**
 * Called when the left button is pressed.
 */
export function onLeftPress(event: { timestamp: number }): void {
  handlePress('left', event.timestamp);
}

/**
 * Called when the left button is released.
 */
export function onLeftRelease(event: { timestamp: number }): void {
  handleRelease('left', event.timestamp);
}

/**
 * Called when the right button is pressed.
 */
export function onRightPress(event: { timestamp: number }): void {
  handlePress('right', event.timestamp);
}

/**
 * Called when the right button is released.
 */
export function onRightRelease(event: { timestamp: number }): void {
  handleRelease('right', event.timestamp);
}

/**
 * Return the current InputState snapshot for the physics tick.
 *
 * Intensities are computed from hold durations using the ramp model.
 * `turbulenceActive` is cleared after this read so it is a one-tick signal.
 */
export function getCurrentInputState(): InputState {
  const now = performance.now();

  const leftHoldMs = _state.left.held ? now - _state.left.pressTime : 0;
  const rightHoldMs = _state.right.held ? now - _state.right.pressTime : 0;

  const state: InputState = {
    leftHeld: _state.left.held,
    rightHeld: _state.right.held,
    leftIntensity: _state.left.held ? computeIntensity(leftHoldMs) : 0,
    rightIntensity: _state.right.held ? computeIntensity(rightHoldMs) : 0,
    turbulenceActive: _state.turbulenceActive,
    turbulenceSeed: _state.turbulenceSeed,
    arenaWidth: _state.arenaWidth,
    arenaHeight: _state.arenaHeight,
  };

  // Turbulence is a one-tick signal — clear after consumption.
  _state.turbulenceActive = false;

  return state;
}

/**
 * Return the current InputState at an explicit timestamp (for deterministic testing).
 *
 * Unlike `getCurrentInputState()`, this does not consume the turbulence signal.
 */
export function getCurrentInputStateAt(nowMs: number): InputState {
  const leftHoldMs = _state.left.held ? nowMs - _state.left.pressTime : 0;
  const rightHoldMs = _state.right.held ? nowMs - _state.right.pressTime : 0;

  return {
    leftHeld: _state.left.held,
    rightHeld: _state.right.held,
    leftIntensity: _state.left.held ? computeIntensity(leftHoldMs) : 0,
    rightIntensity: _state.right.held ? computeIntensity(rightHoldMs) : 0,
    turbulenceActive: _state.turbulenceActive,
    turbulenceSeed: _state.turbulenceSeed,
    arenaWidth: _state.arenaWidth,
    arenaHeight: _state.arenaHeight,
  };
}

/**
 * Reset all input state (call between challenges).
 */
export function reset(): void {
  _state = createInitialState();
}

/**
 * Set arena dimensions (used for InputState reads by the physics layer).
 */
export function setArenaDimensions(width: number, height: number): void {
  _state.arenaWidth = width;
  _state.arenaHeight = height;
}

/**
 * Drain and return all pending input events since the last call.
 * Used by consumers that want to process typed events (analytics, replay, etc.).
 */
export function drainEvents(): InputEvent[] {
  const events = _state.pendingEvents.slice();
  _state.pendingEvents = [];
  return events;
}

// ---------------------------------------------------------------------------
// Module export (object-style, matching GameLoop/PhysicsWorld conventions)
// ---------------------------------------------------------------------------

/**
 * InputController — translates raw touch events into typed InputEvents.
 *
 * Public API per Requirement 16.1:
 *   onLeftPress, onLeftRelease, onRightPress, onRightRelease,
 *   getCurrentInputState, reset
 *
 * Additional helpers: tick, drainEvents, setArenaDimensions,
 *                     getCurrentInputStateAt (for deterministic tests)
 */
export const InputController = {
  onLeftPress,
  onLeftRelease,
  onRightPress,
  onRightRelease,
  getCurrentInputState,
  getCurrentInputStateAt,
  reset,
  tick,
  setArenaDimensions,
  drainEvents,
} as const;
