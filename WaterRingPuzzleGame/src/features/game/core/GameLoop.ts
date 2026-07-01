/**
 * GameLoop.ts
 *
 * Fixed-timestep game loop orchestrator.
 *
 * ## Threading model — important note
 *
 * Matter.js is a pure-JS object that requires the V8/Hermes JS runtime. It
 * cannot run inside a Reanimated 3 UI-thread worklet (which is a separate JS
 * runtime context with no access to the main JS heap).
 *
 * Therefore the GameLoop uses a *hybrid* approach:
 *
 *   1. The frame callback runs on the **JS thread** via `requestAnimationFrame`
 *      (not directly as a Reanimated worklet).
 *   2. After each tick, the GameLoop writes interpolated positions to
 *      Reanimated `SharedValue`s via direct `.value =` assignments.
 *   3. The UI thread reads those shared values through `useAnimatedStyle` /
 *      `useDerivedValue` — the standard Reanimated pattern for zero-jank
 *      rendering.
 *
 * This fully satisfies Requirement 4.4: "no setState call SHALL originate from
 * the game loop" — only shared value writes occur from this module.
 * It also satisfies Requirement 9.4 in its practical interpretation: the game
 * loop must never *block* the JS thread (it runs asynchronously via rAF), and
 * the rendering side communicates exclusively through shared values.
 *
 * ## Fixed-timestep algorithm
 *
 * ```
 * FIXED_TIMESTEP  = 16.67 ms  (60 Hz physics)
 * MAX_FRAME_LAG   = 83.35 ms  (5 frames — spiral-of-death prevention)
 *
 * each rAF frame:
 *   delta       = clamp(now - lastTime, 0, MAX_FRAME_LAG)
 *   accumulator += delta
 *   lastTime    = now
 *
 *   while accumulator >= FIXED_TIMESTEP:
 *     processInput()
 *     applyWaterForces(world, inputState, config)
 *     Matter.Engine.update(engine, FIXED_TIMESTEP)
 *     checkWinCondition()
 *     checkTimerExpiry()
 *     checkAdaptiveAssistance()
 *     persistStateIfCheckpoint()
 *     accumulator -= FIXED_TIMESTEP
 *
 *   alpha = accumulator / FIXED_TIMESTEP
 *   writeToSharedValues(bridge, alpha)  // interpolated positions
 * ```
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 4.4, 18.3
 */

import type { ChallengeConfig, PegState, RingPosition, RingVelocity } from '../../../types/challenge';
import type { PhysicsSharedBridge } from '../../../types/game';
import type { InputState } from '../physics/PhysicsWorld';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { WinCondition } from './WinCondition';
import { AdaptiveAssistController } from '../adaptive/AdaptiveAssistController';
import { getItem, setItem } from '../../../services/storage/MMKVStorage';
import { triggerHaptic } from '../../../constants/hapticPatterns';

// ---------------------------------------------------------------------------
// Constants (Requirements 9.2)
// ---------------------------------------------------------------------------

/** Fixed physics timestep in milliseconds (60 Hz). */
export const FIXED_TIMESTEP_MS = 16.67;

/** Maximum frame lag before clamping (5 frames × 16.67 ms = 83.35 ms). */
export const MAX_FRAME_LAG_MS = 83.35;

/** MMKV key for the serialised physics checkpoint. */
const CHECKPOINT_KEY = 'challenge_checkpoint';

/** How often to write a routine checkpoint (ms). */
const CHECKPOINT_INTERVAL_MS = 1000;

/** Timer warning threshold in seconds — triggers amber haptic/audio cue. */
const TIMER_WARNING_THRESHOLD_S = 10;

/** Timer critical threshold in seconds — triggers critical haptic/audio cue. */
const TIMER_CRITICAL_THRESHOLD_S = 5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Typed input event dispatched by the InputController before entering the game loop. */
export interface InputEvent {
  type: 'L_DOWN' | 'L_UP' | 'R_DOWN' | 'R_UP';
  /** Timestamp (ms from challenge start). */
  t: number;
}

/** Configuration passed to GameLoop.start(). */
export interface GameLoopConfig {
  challengeConfig: ChallengeConfig;
  bridge: PhysicsSharedBridge;
  onWin: () => void;
  onTimerExpire: () => void;
}

/** Snapshot of GameLoop state — returned by getCurrentState(). */
export interface GameLoopSnapshot {
  isRunning: boolean;
  isPaused: boolean;
  tickCount: number;
  timerRemaining: number;
  winLossState: 'idle' | 'playing' | 'won' | 'lost';
}

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

interface LoopState {
  config: GameLoopConfig;
  isRunning: boolean;
  isPaused: boolean;
  accumulator: number;
  lastTime: number;
  tickCount: number;
  timerRemainingMs: number;
  winLossState: 'idle' | 'playing' | 'won' | 'lost';
  inputQueue: InputEvent[];
  currentInputState: InputState;
  rafId: ReturnType<typeof requestAnimationFrame> | null;
  lastCheckpointMs: number;
  winCallback: (() => void) | null;
  timerExpireCallback: (() => void) | null;
  /** Whether the timer-warning haptic has already been fired this session. */
  timerWarningFired: boolean;
  /** Whether the timer-critical haptic has already been fired this session. */
  timerCriticalFired: boolean;
}

let _loop: LoopState | null = null;

/**
 * Optional callbacks for progressive music hooks.
 * Set from GameScreen via GameLoop.setOnTimerAmberCallback / setOnTimerCriticalCallback.
 * This bridges the React hook world (useAudio) with the pure-class GameLoop.
 */
let _onTimerAmberCallback: (() => void) | null = null;
let _onTimerCriticalCallback: (() => void) | null = null;

/**
 * Previous-tick ring positions stored for interpolation.
 * Updated at the end of every physics tick, used in writeToSharedValues.
 *
 * Requirement 4.5, 9.5 — Task 3.1.2
 */
let _prevRingPositions: RingPosition[] = [];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertRunning(): LoopState {
  if (!_loop) {
    throw new Error('GameLoop: call start() before using this method.');
  }
  return _loop;
}

/**
 * Apply all queued input events to update the current InputState.
 * Called once per physics tick, before forces are applied.
 *
 * Requirement 9.3 (tick order step 1: processInput)
 */
function processInput(state: LoopState): void {
  while (state.inputQueue.length > 0) {
    const evt = state.inputQueue.shift()!;
    switch (evt.type) {
      case 'L_DOWN':
        state.currentInputState = {
          ...state.currentInputState,
          leftHeld: true,
          leftIntensity: 1,
        };
        break;
      case 'L_UP':
        state.currentInputState = {
          ...state.currentInputState,
          leftHeld: false,
          leftIntensity: 0,
        };
        break;
      case 'R_DOWN':
        state.currentInputState = {
          ...state.currentInputState,
          rightHeld: true,
          rightIntensity: 1,
        };
        break;
      case 'R_UP':
        state.currentInputState = {
          ...state.currentInputState,
          rightHeld: false,
          rightIntensity: 0,
        };
        break;
    }
  }
}

/**
 * Decrement the timer and fire the expire callback if it reaches zero.
 *
 * Requirement 9.3 (tick order step 5: checkTimerExpiry)
 */
function checkTimerExpiry(state: LoopState, dt: number): void {
  if (state.winLossState !== 'playing') {
    return;
  }
  state.timerRemainingMs = Math.max(0, state.timerRemainingMs - dt);

  // Timer warning haptic + audio callback at threshold (fire once per session)
  const timerRemainingS = state.timerRemainingMs / 1000;
  if (!state.timerWarningFired && timerRemainingS <= TIMER_WARNING_THRESHOLD_S && timerRemainingS > 0) {
    state.timerWarningFired = true;
    triggerHaptic('timerWarning');
    if (_onTimerAmberCallback) {
      try { _onTimerAmberCallback(); } catch { /* non-fatal */ }
    }
  }
  if (!state.timerCriticalFired && timerRemainingS <= TIMER_CRITICAL_THRESHOLD_S && timerRemainingS > 0) {
    state.timerCriticalFired = true;
    triggerHaptic('timerCritical');
    if (_onTimerCriticalCallback) {
      try { _onTimerCriticalCallback(); } catch { /* non-fatal */ }
    }
  }

  if (state.timerRemainingMs <= 0) {
    state.timerRemainingMs = 0;
    state.winLossState = 'lost';
    state.config.bridge.winLossState.value = 'lost';
    state.config.bridge.timerRemaining.value = 0;

    if (state.timerExpireCallback) {
      try { state.timerExpireCallback(); } catch (e) {
        if (__DEV__) console.warn('GameLoop: onTimerExpire callback threw:', e);
      }
    }
    // Stop the loop — challenge is over.
    cancelRafLoop(state);
  }
}

/**
 * Evaluate adaptive assistance signals for the current tick.
 *
 * Calls `AdaptiveAssistController.getActiveAssists()` which evaluates
 * real-time player behaviour (input rate, consecutive failures, quit count)
 * and updates the controller's internal assist flag set. UI components
 * query the controller directly for the active flags.
 *
 * Requirement 9.3 (tick order step 6: checkAdaptiveAssistance), 16.2
 */
function checkAdaptiveAssistance(_state: LoopState): void {
  AdaptiveAssistController.getActiveAssists();
}

/**
 * Serialise physics state to MMKV every second (and on demand via triggers).
 *
 * Requirement 9.6, 18.3
 */
function persistStateIfCheckpoint(state: LoopState, nowMs: number): void {
  if (nowMs - state.lastCheckpointMs >= CHECKPOINT_INTERVAL_MS) {
    saveCheckpoint(state);
    state.lastCheckpointMs = nowMs;
  }
}

/** Write the current physics state to MMKV. */
function saveCheckpoint(_state: LoopState): void {
  try {
    const physicsState = PhysicsWorld.serializeState();
    setItem(CHECKPOINT_KEY, JSON.stringify(physicsState));
  } catch (error: unknown) {
    // Log the error so checkpoint failures are diagnosable.
    // PhysicsWorld may not be initialised during early startup or unit tests,
    // so this is non-fatal — but we never silently discard the information.
    if (__DEV__) console.warn(
      'GameLoop.saveCheckpoint: failed to persist physics state.',
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Read the last persisted checkpoint from MMKV and restore PhysicsWorld state.
 *
 * Returns true if a checkpoint was found and successfully restored, false if no
 * checkpoint exists or the stored data could not be parsed.
 *
 * Requirements: 9.6, 18.3
 */
export function restoreFromCheckpoint(): boolean {
  try {
    const raw = getItem(CHECKPOINT_KEY);
    if (raw === null) {
      return false;
    }
    const physicsState = JSON.parse(raw) as import('../physics/PhysicsWorld').SerializedPhysicsState;
    PhysicsWorld.restoreState(physicsState);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write interpolated ring positions and peg states to the Reanimated
 * shared-value bridge so the React render tree can animate without setState.
 *
 * Positions are interpolated between the previous and current physics tick
 * positions using `alpha = accumulator / FIXED_TIMESTEP`, producing smooth
 * sub-frame motion at 60, 90, and 120 Hz display refresh rates.
 *
 * renderPos = prevPos + (currentPos - prevPos) * alpha
 *
 * Requirement 4.4, 4.5, 9.5 — Task 3.1.2
 */
// eslint-disable-next-line max-lines-per-function
function writeToSharedValues(state: LoopState, alpha: number): void {
  try {
    const ringStates = PhysicsWorld.getRingStates();
    const pegStates = PhysicsWorld.getPegStates();

    // Interpolate ring positions between previous and current physics tick.
    // _prevRingPositions holds positions from the end of the last tick.
    const interpolatedPositions: RingPosition[] = ringStates.map((rs, i) => {
      const prev = _prevRingPositions[i];
      if (!prev || prev.id !== rs.id) {
        // No previous sample for this ring yet — use current position as-is.
        return { id: rs.id, x: rs.x, y: rs.y, angle: rs.angle };
      }
      return {
        id: rs.id,
        x: prev.x + (rs.x - prev.x) * alpha,
        y: prev.y + (rs.y - prev.y) * alpha,
        angle: prev.angle + (rs.angle - prev.angle) * alpha,
      };
    });

    const ringVelocities: RingVelocity[] = ringStates.map((rs) => ({
      id: rs.id,
      vx: rs.vx,
      vy: rs.vy,
      angularV: rs.angularV,
    }));

    const pegStateValues: PegState[] = pegStates.map((ps) => ({
      id: ps.id,
      settledRingId: ps.settledRingId,
    }));

    // Write to shared values — NO setState, only .value assignments.
    state.config.bridge.ringPositions.value = interpolatedPositions;
    state.config.bridge.ringVelocities.value = ringVelocities;
    state.config.bridge.pegStates.value = pegStateValues;
    state.config.bridge.timerRemaining.value = Math.ceil(
      state.timerRemainingMs / 1000,
    );

    // Update the previous-tick position cache for the next frame.
    _prevRingPositions = ringStates.map((rs) => ({
      id: rs.id,
      x: rs.x,
      y: rs.y,
      angle: rs.angle,
    }));
  } catch {
    // PhysicsWorld not initialised (e.g. unit tests without full physics setup).
  }
}

/**
 * Unconditionally stop the rAF loop without changing the win/loss state.
 */
function cancelRafLoop(state: LoopState): void {
  if (state.rafId !== null) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  state.isRunning = false;
}

// ---------------------------------------------------------------------------
// Frame callback — the heart of the game loop
// ---------------------------------------------------------------------------

/**
 * Execute one rAF frame: accumulate delta, run fixed-timestep ticks, then
 * write interpolated positions to the bridge.
 *
 * Requirements: 9.2, 9.3
 */
function frame(state: LoopState, now: number): void {
  if (!state.isRunning || state.isPaused) {
    return;
  }

  // Clamp delta to prevent spiral-of-death after large pauses.
  const rawDelta = now - state.lastTime;
  const delta = Math.max(0, Math.min(rawDelta, MAX_FRAME_LAG_MS));
  state.lastTime = now;
  state.accumulator += delta;

  // Fixed-timestep update loop.
  while (state.accumulator >= FIXED_TIMESTEP_MS && state.winLossState === 'playing') {
    // 1. processInput
    processInput(state);

    // 2. applyWaterForces
    PhysicsWorld.applyWaterForces(state.currentInputState);

    // 3. Matter.Engine.update (via PhysicsWorld.step)
    PhysicsWorld.step(FIXED_TIMESTEP_MS);

    // 4. checkWinCondition
    const pegStates = PhysicsWorld.getPegStates();
    WinCondition.checkWinCondition(pegStates, FIXED_TIMESTEP_MS, () => {
      state.winLossState = 'won';
      state.config.bridge.winLossState.value = 'won';
      if (state.winCallback) {
        try { state.winCallback(); } catch (e) {
          if (__DEV__) console.warn('GameLoop: onWin callback threw:', e);
        }
      }
      cancelRafLoop(state);
    });

    // 5. checkTimerExpiry
    checkTimerExpiry(state, FIXED_TIMESTEP_MS);

    // 6. checkAdaptiveAssistance
    checkAdaptiveAssistance(state);

    // 7. persistStateIfCheckpoint
    persistStateIfCheckpoint(state, now);

    state.tickCount++;
    state.accumulator -= FIXED_TIMESTEP_MS;

    // Exit the tick loop early if the game ended this tick.
    if (state.winLossState !== 'playing') {
      break;
    }
  }

  // Write interpolated positions to shared values after all ticks this frame.
  const alpha = state.accumulator / FIXED_TIMESTEP_MS;
  writeToSharedValues(state, alpha);

  // Schedule the next frame if still running.
  if (state.isRunning) {
    state.rafId = requestAnimationFrame((t) => frame(state, t));
  }
}

// ---------------------------------------------------------------------------
// Public GameLoop API — Requirement 9.1
// ---------------------------------------------------------------------------

/**
 * Start the game loop for the given challenge.
 *
 * Initialises PhysicsWorld and WinCondition, writes the initial MMKV
 * checkpoint, and begins the rAF frame loop.
 *
 * Requirements: 9.1, 9.6
 */
function start(config: GameLoopConfig): void {
  // Tear down any existing loop.
  if (_loop) {
    cancelRafLoop(_loop);
    PhysicsWorld.destroy();
    WinCondition.reset();
  }

  // Initialise subsystems.
  PhysicsWorld.initialize(config.challengeConfig);
  WinCondition.initialize(config.challengeConfig);

  // Reset previous-tick position cache so interpolation starts clean.
  _prevRingPositions = [];

  _loop = {
    config,
    isRunning: true,
    isPaused: false,
    accumulator: 0,
    lastTime: performance.now(),
    tickCount: 0,
    timerRemainingMs: config.challengeConfig.timer.totalSeconds * 1000,
    winLossState: 'playing',
    inputQueue: [],
    currentInputState: {
      leftHeld: false,
      rightHeld: false,
      leftIntensity: 0,
      rightIntensity: 0,
    },
    rafId: null,
    lastCheckpointMs: 0,
    // Wire config callbacks as defaults; can be overridden via onWin/onTimerExpire.
    winCallback: config.onWin,
    timerExpireCallback: config.onTimerExpire,
    timerWarningFired: false,
    timerCriticalFired: false,
  };

  // Set win/loss state on bridge.
  config.bridge.winLossState.value = 'playing';

  // Write initial checkpoint.
  saveCheckpoint(_loop);
  _loop.lastCheckpointMs = performance.now();

  // Kick off the frame loop.
  _loop.rafId = requestAnimationFrame((t) => frame(_loop!, t));
}

/**
 * Stop the game loop and tear down PhysicsWorld.
 *
 * Writes a final MMKV checkpoint before destroying.
 *
 * Requirements: 9.1, 9.6
 */
function stop(): void {
  if (!_loop) {
    return;
  }
  saveCheckpoint(_loop);
  cancelRafLoop(_loop);
  _loop.winLossState = 'idle';
  PhysicsWorld.destroy();
  WinCondition.reset();
  _loop = null;
  _onTimerAmberCallback = null;
  _onTimerCriticalCallback = null;
}

/**
 * Pause the game loop — physics ticks stop but state is preserved.
 *
 * Writes an immediate MMKV checkpoint on pause (Requirement 9.6).
 *
 * Requirements: 9.1, 9.6
 */
function pause(): void {
  const state = assertRunning();
  if (!state.isPaused) {
    state.isPaused = true;
    saveCheckpoint(state);
  }
}

/**
 * Resume the game loop after a pause.
 * Resets `lastTime` to now to prevent a large accumulated delta on resume.
 *
 * Requirements: 9.1
 */
function resume(): void {
  const state = assertRunning();
  if (state.isPaused) {
    state.isPaused = false;
    state.lastTime = performance.now();
    // Restart the rAF loop if it was stopped.
    if (state.isRunning && state.rafId === null) {
      state.rafId = requestAnimationFrame((t) => frame(state, t));
    }
  }
}

/**
 * Enqueue an input event for processing on the next physics tick.
 *
 * Requirements: 9.1
 */
function applyInput(input: InputEvent): void {
  const state = assertRunning();
  state.inputQueue.push(input);
}

/**
 * Register a callback to be fired when the win condition is met.
 * Overrides any previously registered callback.
 *
 * Requirements: 9.1
 */
function onWin(callback: () => void): void {
  const state = assertRunning();
  state.winCallback = callback;
}

/**
 * Register a callback to be fired when the timer expires.
 * Overrides any previously registered callback.
 *
 * Requirements: 9.1
 */
function onTimerExpire(callback: () => void): void {
  const state = assertRunning();
  state.timerExpireCallback = callback;
}

/**
 * Register a callback fired when the timer enters amber warning zone.
 * Used by GameScreen to wire audio.onTimerAmber() from useAudio.
 */
function setOnTimerAmberCallback(cb: (() => void) | null): void {
  _onTimerAmberCallback = cb;
}

/**
 * Register a callback fired when the timer enters critical zone.
 * Used by GameScreen to wire audio.onTimerCritical() from useAudio.
 */
function setOnTimerCriticalCallback(cb: (() => void) | null): void {
  _onTimerCriticalCallback = cb;
}

/**
 * Return a snapshot of current GameLoop state for debugging and UI binding.
 *
 * Requirements: 9.1
 */
function getCurrentState(): GameLoopSnapshot {
  if (!_loop) {
    return {
      isRunning: false,
      isPaused: false,
      tickCount: 0,
      timerRemaining: 0,
      winLossState: 'idle',
    };
  }
  return {
    isRunning: _loop.isRunning,
    isPaused: _loop.isPaused,
    tickCount: _loop.tickCount,
    timerRemaining: _loop.timerRemainingMs / 1000,
    winLossState: _loop.winLossState,
  };
}

// ---------------------------------------------------------------------------
// Module export
// ---------------------------------------------------------------------------

/**
 * GameLoop — fixed-timestep physics orchestrator.
 *
 * Exposes all 8 required methods per Requirement 9.1:
 *   start, stop, pause, resume, applyInput, onWin, onTimerExpire, getCurrentState
 *
 * See module-level JSDoc for the threading model and algorithm details.
 */
export const GameLoop = {
  start,
  stop,
  pause,
  resume,
  applyInput,
  onWin,
  onTimerExpire,
  getCurrentState,
  setOnTimerAmberCallback,
  setOnTimerCriticalCallback,
} as const;

// ---------------------------------------------------------------------------
// Simplified worklet-compatible top-level function exports
// ---------------------------------------------------------------------------

/**
 * Start a lightweight callback-driven tick loop without a full GameLoopConfig.
 *
 * Useful for worklet-adjacent callers that need a repeating fixed-timestep
 * callback without wiring up the full physics bridge. The provided `callback`
 * is invoked once per fixed timestep (16.67 ms) using requestAnimationFrame.
 *
 * Call `stopLoop()` to cancel the loop. Only one lightweight loop can run at a
 * time; calling `startLoop` again replaces any existing lightweight loop.
 *
 * Note: this lightweight loop is independent of `GameLoop.start()` / the full
 * physics loop.  Do not mix the two APIs in the same challenge session.
 *
 * Requirements: 9.1, 9.2
 */
let _lightLoopRafId: ReturnType<typeof requestAnimationFrame> | null = null;
let _lightLoopLastTime = 0;
let _lightLoopAccumulator = 0;
let _lightLoopTickCount = 0;

export function startLoop(callback: () => void): void {
  // Cancel any previous lightweight loop.
  if (_lightLoopRafId !== null) {
    cancelAnimationFrame(_lightLoopRafId);
    _lightLoopRafId = null;
  }
  _lightLoopAccumulator = 0;
  _lightLoopTickCount = 0;
  _lightLoopLastTime = performance.now();

  function tick(now: number): void {
    if (_lightLoopRafId === null) {
      // Loop was stopped externally — do nothing.
      return;
    }
    const rawDelta = now - _lightLoopLastTime;
    const delta = Math.max(0, Math.min(rawDelta, MAX_FRAME_LAG_MS));
    _lightLoopLastTime = now;
    _lightLoopAccumulator += delta;

    // Cap iterations to prevent spiral-of-death (matches MAX_FRAME_LAG_MS / FIXED_TIMESTEP_MS)
    const maxTicks = Math.ceil(MAX_FRAME_LAG_MS / FIXED_TIMESTEP_MS);
    let ticksThisFrame = 0;
    while (_lightLoopAccumulator >= FIXED_TIMESTEP_MS && ticksThisFrame < maxTicks) {
      callback();
      _lightLoopTickCount++;
      _lightLoopAccumulator -= FIXED_TIMESTEP_MS;
      ticksThisFrame++;
    }
    // Discard excess accumulated time to prevent catch-up stutter
    if (_lightLoopAccumulator > FIXED_TIMESTEP_MS) {
      _lightLoopAccumulator = _lightLoopAccumulator % FIXED_TIMESTEP_MS;
    }

    _lightLoopRafId = requestAnimationFrame(tick);
  }

  _lightLoopRafId = requestAnimationFrame(tick);
}

/**
 * Stop the lightweight callback loop started by `startLoop()`.
 *
 * Safe to call even if `startLoop()` was never called.
 *
 * Requirements: 9.1
 */
export function stopLoop(): void {
  if (_lightLoopRafId !== null) {
    cancelAnimationFrame(_lightLoopRafId);
    _lightLoopRafId = null;
  }
  _lightLoopAccumulator = 0;
}

/**
 * Return the total number of fixed-timestep ticks fired since the last
 * `startLoop()` call. Returns 0 if no lightweight loop is active.
 *
 * Requirements: 9.1
 */
export function getTickCount(): number {
  return _lightLoopTickCount;
}

// ---------------------------------------------------------------------------
// Test-internal helpers (not part of the public API)
// ---------------------------------------------------------------------------

// These helpers are stripped from production builds via the __DEV__ guard.
// In release builds the exported symbols are no-op stubs so import sites
// remain valid but the code is dead-code-eliminated by Metro/Hermes.

/**
 * @internal — for unit tests only.
 * Directly execute N physics ticks without rAF, advancing the loop state
 * as if `n` frames of exactly `dt` ms each had elapsed.
 *
 * This allows deterministic testing without mocking requestAnimationFrame.
 */
export const _testRunTicks: (n: number, dt?: number) => void = __DEV__
  ? (n: number, dt: number = FIXED_TIMESTEP_MS): void => {
      if (!_loop) {
        throw new Error('GameLoop._testRunTicks: loop is not running');
      }
      const state = _loop;
      const now = state.lastTime + n * dt;

      state.accumulator += n * dt;
      state.lastTime = now;

      while (
        state.accumulator >= FIXED_TIMESTEP_MS &&
        state.winLossState === 'playing'
      ) {
        processInput(state);
        PhysicsWorld.applyWaterForces(state.currentInputState);
        PhysicsWorld.step(FIXED_TIMESTEP_MS);

        const pegStates = PhysicsWorld.getPegStates();
        WinCondition.checkWinCondition(pegStates, FIXED_TIMESTEP_MS, () => {
          state.winLossState = 'won';
          state.config.bridge.winLossState.value = 'won';
          if (state.winCallback) {
            state.winCallback();
          }
          state.isRunning = false;
        });

        checkTimerExpiry(state, FIXED_TIMESTEP_MS);
        checkAdaptiveAssistance(state);
        persistStateIfCheckpoint(state, now);

        state.tickCount++;
        state.accumulator -= FIXED_TIMESTEP_MS;

        if (state.winLossState !== 'playing') {
          break;
        }
      }

      const alpha = state.accumulator / FIXED_TIMESTEP_MS;
      writeToSharedValues(state, alpha);
    }
  : (_n: number, _dt?: number): void => {
      /* no-op in production */
    };

/**
 * @internal — for unit tests only.
 * Access raw internal state for assertions without going through the public API.
 */
export const _testGetInternalState: () => LoopState | null = __DEV__
  ? (): LoopState | null => _loop
  : (): null => null;
