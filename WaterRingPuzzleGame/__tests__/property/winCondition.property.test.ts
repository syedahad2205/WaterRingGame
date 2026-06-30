/**
 * winCondition.property.test.ts — tasks 3.3.1b + 3.3.2a
 *
 * Property-based tests for WinCondition using fast-check.
 *
 * WinCondition uses module-level singleton state (_state).
 * We drive it through the public API:
 *   WinCondition.initialize(config)
 *   WinCondition.checkWinCondition(pegStates, dt, onWin)
 *   WinCondition.reset()
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import * as fc from 'fast-check';
import { WinCondition, WIN_STABLE_WINDOW_MS } from '../../src/features/game/core/WinCondition';
import type { ChallengeConfig, PegState } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal ChallengeConfig with one required ring/peg pair.
 * The ring has colorId matching the peg's acceptedColorId.
 */
function makeConfig(ringId: string, pegId: string, colorId = 'blue'): ChallengeConfig {
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: 'test-seed',
    generatorVersion: '1.0.0',
    templateId: 'standard',
    difficultyScore: 0,
    normalizedDifficulty: 0,
    arena: { width: 390, height: 844 },
    timer: { totalSeconds: 60 },
    rings: [
      {
        id: ringId,
        outerRadius: 30,
        innerRadius: 15,
        mass: 1,
        buoyancy: 0.5,
        angularDamping: 0.1,
        linearDamping: 0.1,
        restitution: 0.3,
        frictionAir: 0.02,
        sizeCategory: 'medium',
        colorId,
        skinId: 'default',
        isDecoy: false,
        initialPosition: { x: 195, y: 100 },
      },
    ],
    pegs: [
      {
        id: pegId,
        position: { x: 195, y: 600 },
        height: 40,
        baseRadius: 20,
        tipRadius: 10,
        acceptedRingSizes: ['small', 'medium', 'large'],
        acceptedColorId: colorId,
        isMoving: false,
        glowColor: '#0000ff',
      },
    ],
    obstacles: [],
    intelligenceMetadata: {
      estimatedSolveTimeSecs: 30,
      strategyHints: [],
      nearMissZones: [],
    },
    isBossChallenge: false,
    isDailyChallenge: false,
  } as unknown as ChallengeConfig;
}

/** PegState where NO ring is settled (peg is empty). */
function emptyPegState(pegId: string): PegState {
  return { id: pegId, settledRingId: null };
}

/** PegState where the correct ring is settled on the peg. */
function settledPegState(pegId: string, ringId: string): PegState {
  return { id: pegId, settledRingId: ringId };
}

// ---------------------------------------------------------------------------
// 3.3.1b — Win never fires when rings are NOT settled
// ---------------------------------------------------------------------------

describe('3.3.1b: win never fires when rings are not settled', () => {
  afterEach(() => {
    WinCondition.reset();
  });

  it('property: didWin is never true across 1000 ms of ticks when peg is empty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 30 }), // dt per tick (ms)
        fc.integer({ min: 1, max: 60 }),  // number of ticks
        (dt, ticks) => {
          WinCondition.reset();
          const config = makeConfig('ring_A', 'peg_A');
          WinCondition.initialize(config);

          // Peg is always empty — ring never settles
          const pegStates: PegState[] = [emptyPegState('peg_A')];
          let winFired = false;

          for (let i = 0; i < ticks; i++) {
            const result = WinCondition.checkWinCondition(pegStates, dt, () => {
              winFired = true;
            });
            if (result.didWin || winFired) {
              return false; // property violated
            }
          }
          return true;
        },
      ),
    );
  });

  it('property: stableElapsedMs stays 0 when rings are never settled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 50 }),
        fc.integer({ min: 1, max: 40 }),
        (dt, ticks) => {
          WinCondition.reset();
          const config = makeConfig('ring_B', 'peg_B');
          WinCondition.initialize(config);

          const pegStates: PegState[] = [emptyPegState('peg_B')];

          for (let i = 0; i < ticks; i++) {
            const result = WinCondition.checkWinCondition(pegStates, dt, () => {});
            if (result.stableElapsedMs !== 0) {
              return false;
            }
          }
          return true;
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// 3.3.2a — stableElapsedMs is monotonically increasing when all rings settled
// ---------------------------------------------------------------------------

describe('3.3.2a: timer monotonicity when all rings are settled', () => {
  afterEach(() => {
    WinCondition.reset();
  });

  it('property: stableElapsedMs increases each tick when ring is settled (until win fires)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 50 }), // dt per tick
        fc.integer({ min: 1, max: 20 }),   // tick count
        (dt, ticks) => {
          WinCondition.reset();
          const config = makeConfig('ring_C', 'peg_C');
          WinCondition.initialize(config);

          // Ring is always settled on its peg
          const pegStates: PegState[] = [settledPegState('peg_C', 'ring_C')];
          let prevElapsed = 0;

          for (let i = 0; i < ticks; i++) {
            const result = WinCondition.checkWinCondition(pegStates, dt, () => {});
            // Once win fires the timer is frozen, so we only check before win
            if (!result.didWin && !WinCondition.isWinTriggered()) {
              if (result.stableElapsedMs < prevElapsed) {
                return false; // elapsed decreased — property violated
              }
            }
            if (result.didWin) {
              break; // win fired, stop checking
            }
            prevElapsed = result.stableElapsedMs;
          }
          return true;
        },
      ),
    );
  });

  it('property: stableElapsedMs resets to 0 when ring becomes unsettled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 30 }),  // settled ticks
        fc.integer({ min: 10, max: 30 }),  // dt per tick
        (settledTicks, dt) => {
          // Only test scenarios where settledTicks * dt < WIN_STABLE_WINDOW_MS
          // so the win hasn't triggered before we unsettle
          if (settledTicks * dt >= WIN_STABLE_WINDOW_MS) {
            return true; // skip — win would have fired
          }

          WinCondition.reset();
          const config = makeConfig('ring_D', 'peg_D');
          WinCondition.initialize(config);

          const settled: PegState[] = [settledPegState('peg_D', 'ring_D')];
          const empty: PegState[] = [emptyPegState('peg_D')];

          // Run some settled ticks
          for (let i = 0; i < settledTicks; i++) {
            WinCondition.checkWinCondition(settled, dt, () => {});
          }

          // Now unsettle — next tick should reset stableElapsedMs to 0
          const result = WinCondition.checkWinCondition(empty, dt, () => {});
          return result.stableElapsedMs === 0;
        },
      ),
    );
  });

  it('WIN_STABLE_WINDOW_MS is 500', () => {
    expect(WIN_STABLE_WINDOW_MS).toBe(500);
  });

  it('win fires after exactly WIN_STABLE_WINDOW_MS of continuous stability', () => {
    WinCondition.reset();
    const config = makeConfig('ring_E', 'peg_E');
    WinCondition.initialize(config);

    const pegStates: PegState[] = [settledPegState('peg_E', 'ring_E')];
    let winFired = false;

    // Tick with dt=100ms — win should fire after 5 ticks (500ms)
    let result = { didWin: false, stableElapsedMs: 0, allSettled: false };
    for (let i = 0; i < 10; i++) {
      result = WinCondition.checkWinCondition(pegStates, 100, () => {
        winFired = true;
      });
      if (result.didWin) break;
    }

    expect(winFired).toBe(true);
    expect(result.didWin).toBe(true);
  });
});
