/**
 * challengeSlice.ts
 * Zustand slice owning all active-challenge runtime state.
 *
 * Persists to MMKV key: 'challenge_slice'
 * Requirements: 17.3, 18.3, 18.4
 *
 * ─── Persistence strategy ───────────────────────────────────────────────────
 *
 * PERIODIC WRITE (every 1 second during active gameplay):
 *   The 1-second interval checkpoint is triggered by the GameLoop, NOT by
 *   this slice directly. The GameLoop calls `persistStateIfCheckpoint()` at
 *   each 1-second mark (Requirement 9.3, 9.6). The Zustand `persist`
 *   middleware writes to MMKV synchronously whenever state changes, so any
 *   state mutation inside the 1-second window will be durable on the next
 *   `set()` call. No additional timer is needed here.
 *
 * IMMEDIATE WRITE on challenge start/end:
 *   `loadChallenge`, `recordWin`, and `recordLoss` call
 *   `mmkvSetItem(CHALLENGE_SLICE_MMKV_KEY, …)` directly after `set()` to
 *   guarantee a synchronous flush before the JS thread yields
 *   (Requirement 18.4).
 *
 * ────────────────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';
import type {
  ChallengeConfig,
  RingPosition,
  RingVelocity,
  PegState,
  WinLossState,
} from '../../types/challenge';

/** MMKV key used to persist this slice. Requirement 18.3. */
export const CHALLENGE_SLICE_MMKV_KEY = 'challenge_slice';

// ---------------------------------------------------------------------------
// CRC32-validated MMKV storage adapter for this slice.
// Lazily resolved via factory so native binaries are not required in tests.
// ---------------------------------------------------------------------------

/**
 * The slice storage adapter (CRC32-checksum validated, isolated MMKV instance).
 * Shared between the Zustand persist config and `immediateMMKVWrite`.
 */
const _challengeStorage = createSliceMMKVStorage(CHALLENGE_SLICE_MMKV_KEY);

function createChallengeMMKVStorage(): StateStorage {
  return _challengeStorage;
}

/**
 * Directly writes the serialised slice to MMKV with CRC32 checksum.
 * Called synchronously after challenge start/end mutations to guarantee
 * an immediate durable write (Requirement 18.4).
 *
 * Uses the same CRC32-validated storage adapter as the Zustand persist
 * middleware, ensuring checksum integrity for immediate writes too.
 */
function immediateMMKVWrite(sliceJson: string): void {
  _challengeStorage.setItem(CHALLENGE_SLICE_MMKV_KEY, sliceJson);
}

// ---------------------------------------------------------------------------
// State shape
// ---------------------------------------------------------------------------

export interface ChallengeState {
  /**
   * The fully deterministic config of the currently active challenge.
   * Null when no challenge is loaded (winLossState === 'idle').
   */
  activeChallengeConfig: ChallengeConfig | null;

  /**
   * Remaining time in seconds. Counts down from
   * activeChallengeConfig.timer.totalSeconds → 0.
   */
  timerRemaining: number;

  /**
   * Live ring positions in the physics world.
   * Updated every physics tick by the GameLoop via updatePhysicsState.
   */
  ringPositions: RingPosition[];

  /**
   * Live ring velocities (translation + angular) for each ring.
   * Updated every physics tick by the GameLoop via updatePhysicsState.
   */
  ringVelocities: RingVelocity[];

  /**
   * Live peg states — which ring (if any) has settled on each peg.
   * Updated whenever a ring lands or leaves a peg.
   */
  pegStates: PegState[];

  /**
   * Win/loss lifecycle state machine.
   * idle → playing → won | lost
   */
  winLossState: WinLossState;

  /**
   * Number of continues used in the current challenge session.
   * Incremented by useContinue.
   */
  continueCount: number;

  /**
   * Active adaptive assist flags from AdaptiveAssistController.
   * Each string is an AssistFlag identifier (e.g. 'near_miss_bonus', 'slow_rings').
   */
  adaptiveAssistFlags: string[];
}

// ---------------------------------------------------------------------------
// Actions shape
// ---------------------------------------------------------------------------

export interface ChallengeActions {
  /**
   * Load a challenge: set activeChallengeConfig, reset all runtime state,
   * transition winLossState to 'playing', and immediately write to MMKV.
   * Requirement 18.4: challenge start triggers immediate synchronous MMKV write.
   */
  loadChallenge: (config: ChallengeConfig) => void;

  /**
   * Batch-update ring positions, velocities, and peg states from one physics tick.
   * Called by the GameLoop on every tick. High-frequency path — keep lean.
   */
  updatePhysicsState: (
    positions: RingPosition[],
    velocities: RingVelocity[],
    pegs: PegState[],
  ) => void;

  /**
   * Update the timer countdown.
   * Called by TimerController once per second.
   */
  setTimer: (secondsRemaining: number) => void;

  /**
   * Record a win: transition winLossState to 'won', pause the timer,
   * and immediately write to MMKV.
   * Requirement 18.4: challenge end triggers immediate synchronous MMKV write.
   */
  recordWin: () => void;

  /**
   * Record a loss (timer expired, no continue): transition winLossState to 'lost'
   * and immediately write to MMKV.
   * Requirement 18.4: challenge end triggers immediate synchronous MMKV write.
   */
  recordLoss: () => void;

  /**
   * Consume one continue: reset the timer to its full value, increment
   * continueCount, and keep winLossState as 'playing'.
   */
  useContinue: () => void;
}

export type ChallengeSlice = ChallengeState & ChallengeActions;

// ---------------------------------------------------------------------------
// Default / initial state
// ---------------------------------------------------------------------------

const DEFAULT_STATE: ChallengeState = {
  activeChallengeConfig: null,
  timerRemaining: 0,
  ringPositions: [],
  ringVelocities: [],
  pegStates: [],
  winLossState: 'idle',
  continueCount: 0,
  adaptiveAssistFlags: [],
};

// ---------------------------------------------------------------------------
// Serialise helpers for immediate MMKV writes
// ---------------------------------------------------------------------------

/** Serialise only the persistable state fields to JSON. */
function serialiseForMMKV(state: ChallengeState): string {
  const { activeChallengeConfig, timerRemaining, ringPositions, ringVelocities, pegStates,
          winLossState, continueCount, adaptiveAssistFlags } = state;
  return JSON.stringify({
    state: {
      activeChallengeConfig,
      timerRemaining,
      ringPositions,
      ringVelocities,
      pegStates,
      winLossState,
      continueCount,
      adaptiveAssistFlags,
    },
    version: 0,
  });
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useChallengeStore = create<ChallengeSlice>()(
  persist(
    // eslint-disable-next-line max-lines-per-function
    (set, get) => ({
      ...DEFAULT_STATE,

      // ── loadChallenge ────────────────────────────────────────────────────
      loadChallenge: (config: ChallengeConfig): void => {
        const nextState: ChallengeState = {
          activeChallengeConfig: config,
          timerRemaining: config.timer.totalSeconds,
          ringPositions: config.rings.map((r) => ({
            id: r.id,
            x: r.initialPosition.x,
            y: r.initialPosition.y,
            angle: 0,
          })),
          ringVelocities: config.rings.map((r) => ({
            id: r.id,
            vx: 0,
            vy: 0,
            angularV: 0,
          })),
          pegStates: config.pegs.map((p) => ({
            id: p.id,
            settledRingId: null,
          })),
          winLossState: 'playing',
          continueCount: 0,
          adaptiveAssistFlags: [],
        };

        set(nextState);

        // Immediate synchronous MMKV write on challenge start (Req 18.4).
        immediateMMKVWrite(serialiseForMMKV(nextState));
      },

      // ── updatePhysicsState ───────────────────────────────────────────────
      updatePhysicsState: (
        positions: RingPosition[],
        velocities: RingVelocity[],
        pegs: PegState[],
      ): void => {
        // High-frequency: avoid spreading the whole state.
        set({
          ringPositions: positions,
          ringVelocities: velocities,
          pegStates: pegs,
        });
        // NOTE: The 1-second MMKV checkpoint is triggered by the GameLoop
        // (GameLoop.ts → persistStateIfCheckpoint), not by this action.
        // The Zustand persist middleware handles the write via MMKV storage.
      },

      // ── setTimer ─────────────────────────────────────────────────────────
      setTimer: (secondsRemaining: number): void => {
        set({ timerRemaining: secondsRemaining });
      },

      // ── recordWin ────────────────────────────────────────────────────────
      recordWin: (): void => {
        set({ winLossState: 'won' });

        // Immediate synchronous MMKV write on challenge end (Req 18.4).
        immediateMMKVWrite(serialiseForMMKV({ ...get(), winLossState: 'won' }));
      },

      // ── recordLoss ───────────────────────────────────────────────────────
      recordLoss: (): void => {
        set({ winLossState: 'lost' });

        // Immediate synchronous MMKV write on challenge end (Req 18.4).
        immediateMMKVWrite(serialiseForMMKV({ ...get(), winLossState: 'lost' }));
      },

      // ── useContinue ──────────────────────────────────────────────────────
      useContinue: (): void => {
        const { activeChallengeConfig, continueCount } = get();
        if (!activeChallengeConfig) return;

        set({
          timerRemaining: activeChallengeConfig.timer.totalSeconds,
          continueCount: continueCount + 1,
          winLossState: 'playing',
        });
        // NOTE: useContinue is an in-session recovery — the economy slice
        // handles the coin deduction separately. Requirement 18.4 lists
        // "continue granted" as an immediate-write trigger; the EconomyService
        // handles the economy-side write; here we persist the updated challenge
        // state immediately as well.
        immediateMMKVWrite(
          serialiseForMMKV({
            ...get(),
            timerRemaining: activeChallengeConfig.timer.totalSeconds,
            continueCount: continueCount + 1,
            winLossState: 'playing',
          }),
        );
      },
    }),
    {
      name: CHALLENGE_SLICE_MMKV_KEY,
      storage: createJSONStorage(createChallengeMMKVStorage),
      // Only persist state fields, not actions.
      partialize: (state): ChallengeState => ({
        activeChallengeConfig: state.activeChallengeConfig,
        timerRemaining: state.timerRemaining,
        ringPositions: state.ringPositions,
        ringVelocities: state.ringVelocities,
        pegStates: state.pegStates,
        winLossState: state.winLossState,
        continueCount: state.continueCount,
        adaptiveAssistFlags: state.adaptiveAssistFlags,
      }),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors (Requirement 17.8 — read only the specific field needed)
// ---------------------------------------------------------------------------

/** Select the active challenge config (null if no challenge loaded). */
export const selectActiveChallengeConfig = (
  state: ChallengeSlice,
): ChallengeConfig | null => state.activeChallengeConfig;

/** Select the remaining timer value in seconds. */
export const selectTimerRemaining = (state: ChallengeSlice): number => state.timerRemaining;

/** Select all ring positions. */
export const selectRingPositions = (state: ChallengeSlice): RingPosition[] =>
  state.ringPositions;

/** Select all ring velocities. */
export const selectRingVelocities = (state: ChallengeSlice): RingVelocity[] =>
  state.ringVelocities;

/** Select all peg states. */
export const selectPegStates = (state: ChallengeSlice): PegState[] => state.pegStates;

/** Select the current win/loss lifecycle state. */
export const selectWinLossState = (state: ChallengeSlice): WinLossState =>
  state.winLossState;

/** Select the continue count for the current session. */
export const selectContinueCount = (state: ChallengeSlice): number => state.continueCount;

/** Select the list of active adaptive assist flags. */
export const selectAdaptiveAssistFlags = (state: ChallengeSlice): string[] =>
  state.adaptiveAssistFlags;
