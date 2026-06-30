/**
 * useChallenge
 *
 * Convenience hook that surfaces the challengeSlice Zustand store to UI
 * components. Selects each field with a granular selector so a component
 * only re-renders when the specific value it uses changes.
 *
 * Actions are accessed via `useChallengeStore.getState()` — their references
 * are stable (never change between renders) so they do not appear in the
 * hook's return-value object's reactive surface area.
 *
 * Requirements: 17.3, 17.8, 18.3, 18.4
 */

import {
  useChallengeStore,
  selectActiveChallengeConfig,
  selectTimerRemaining,
  selectWinLossState,
  selectContinueCount,
  selectPegStates,
  selectRingPositions,
  selectAdaptiveAssistFlags,
} from '../store/slices/challengeSlice';

import type { ChallengeConfig, PegState, RingPosition, WinLossState } from '../types/challenge';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface UseChallengeResult {
  /** The fully deterministic config of the active challenge, or null if idle. */
  activeChallengeConfig: ChallengeConfig | null;
  /** Remaining time in seconds. */
  timerRemaining: number;
  /** Win/loss lifecycle state. */
  winLossState: WinLossState;
  /** Number of continues used in the current session. */
  continueCount: number;
  /** Live peg states. */
  pegStates: PegState[];
  /** Live ring positions. */
  ringPositions: RingPosition[];
  /** Active adaptive assist flags. */
  adaptiveAssistFlags: string[];

  // ── Actions ──────────────────────────────────────────────────────────────

  /** Load a challenge config and transition to 'playing'. */
  loadChallenge: (config: ChallengeConfig) => void;

  /**
   * Record a win result.
   * NOTE: The params (starsEarned, coinsEarned, completionTimeMs) are
   * consumed by the caller (e.g. EconomyService / ProgressionService) before
   * calling this action; challengeSlice.recordWin only updates winLossState.
   */
  recordWin: (params: {
    starsEarned: 1 | 2 | 3;
    coinsEarned: number;
    completionTimeMs: number;
  }) => void;

  /** Record a loss and transition to 'lost'. */
  recordLoss: () => void;

  /** Consume one continue: reset timer and keep winLossState 'playing'. */
  useContinue: () => void;

  /** Alias for loadChallenge with the same config — restarts the challenge. */
  resetChallenge: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

// eslint-disable-next-line max-lines-per-function
export function useChallenge(): UseChallengeResult {
  // Granular selectors — each subscriber only re-renders when its own
  // field changes (Requirement 17.8).
  const activeChallengeConfig = useChallengeStore(selectActiveChallengeConfig);
  const timerRemaining = useChallengeStore(selectTimerRemaining);
  const winLossState = useChallengeStore(selectWinLossState);
  const continueCount = useChallengeStore(selectContinueCount);
  const pegStates = useChallengeStore(selectPegStates);
  const ringPositions = useChallengeStore(selectRingPositions);
  const adaptiveAssistFlags = useChallengeStore(selectAdaptiveAssistFlags);

  // Actions — accessed via getState() so their identity never changes and
  // they never trigger re-renders.
  const loadChallenge = (config: ChallengeConfig): void => {
    useChallengeStore.getState().loadChallenge(config);
  };

  const recordWin = (_params: {
    starsEarned: 1 | 2 | 3;
    coinsEarned: number;
    completionTimeMs: number;
  }): void => {
    // params are handled upstream by EconomyService / ProgressionService.
    useChallengeStore.getState().recordWin();
  };

  const recordLoss = (): void => {
    useChallengeStore.getState().recordLoss();
  };

  const useContinue = (): void => {
    useChallengeStore.getState().useContinue();
  };

  const resetChallenge = (): void => {
    const cfg = useChallengeStore.getState().activeChallengeConfig;
    if (cfg) {
      useChallengeStore.getState().loadChallenge(cfg);
    }
  };

  return {
    activeChallengeConfig,
    timerRemaining,
    winLossState,
    continueCount,
    pegStates,
    ringPositions,
    adaptiveAssistFlags,
    loadChallenge,
    recordWin,
    recordLoss,
    useContinue,
    resetChallenge,
  };
}
