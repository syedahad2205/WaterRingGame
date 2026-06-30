/**
 * Unit tests for challengeSlice
 *
 * Covers: Requirement 17.3
 * Tests: win state, loss state, continue count increment, state transitions,
 *        loadChallenge initialisation, updatePhysicsState, setTimer, selectors.
 */

// react-native-mmkv needs native binaries; mock it so tests run in Node.js.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import { useChallengeStore } from '../../src/store/slices/challengeSlice';
import {
  selectActiveChallengeConfig,
  selectTimerRemaining,
  selectRingPositions,
  selectRingVelocities,
  selectPegStates,
  selectWinLossState,
  selectContinueCount,
  selectAdaptiveAssistFlags,
} from '../../src/store/slices/challengeSlice';
import type {
  ChallengeConfig,
  RingPosition,
  RingVelocity,
  PegState,
} from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Minimal ChallengeConfig factory
// ---------------------------------------------------------------------------

function makeChallengeConfig(overrides?: Partial<ChallengeConfig>): ChallengeConfig {
  return {
    challengeNumber: 1,
    dailyDate: '',
    seed: 'test-seed-001',
    generatorVersion: '1.0.0',
    templateId: 'Classic',
    difficultyScore: 30,
    normalizedDifficulty: 0.3,
    arena: {
      width: 390,
      height: 844,
      waterSurfaceY: 200,
      themeId: 'ocean',
      environmentId: 'day',
    },
    timer: {
      totalSeconds: 60,
      amberThresholdSecs: 20,
      criticalThresholdSecs: 10,
    },
    rings: [
      {
        id: 'ring-1',
        outerRadius: 22,
        innerRadius: 12,
        mass: 0.5,
        buoyancy: 0.85,
        angularDamping: 0.05,
        linearDamping: 0.08,
        restitution: 0.3,
        frictionAir: 0.02,
        sizeCategory: 'small',
        colorId: 'blue',
        skinId: 'default',
        isDecoy: false,
        initialPosition: { x: 100, y: 300 },
      },
      {
        id: 'ring-2',
        outerRadius: 32,
        innerRadius: 18,
        mass: 1.0,
        buoyancy: 0.65,
        angularDamping: 0.04,
        linearDamping: 0.07,
        restitution: 0.3,
        frictionAir: 0.02,
        sizeCategory: 'medium',
        colorId: 'red',
        skinId: 'default',
        isDecoy: false,
        initialPosition: { x: 200, y: 350 },
      },
    ],
    pegs: [
      {
        id: 'peg-1',
        position: { x: 150, y: 600 },
        height: 40,
        baseRadius: 20,
        tipRadius: 8,
        acceptedRingSizes: ['small'],
        acceptedColorId: 'blue',
        isMoving: false,
        glowColor: '#0000FF',
      },
      {
        id: 'peg-2',
        position: { x: 250, y: 600 },
        height: 40,
        baseRadius: 25,
        tipRadius: 10,
        acceptedRingSizes: ['medium'],
        acceptedColorId: 'red',
        isMoving: false,
        glowColor: '#FF0000',
      },
    ],
    obstacles: [],
    waterCurrentProfile: {
      ambientForce: 0.02,
      turbulenceIntensity: 0.1,
      variationPattern: 0,
    },
    physicsModifiers: {
      gravityScale: 1.0,
      waterViscosity: 1.0,
      buoyancyMultiplier: 1.0,
    },
    intelligenceMetadata: {
      estimatedSolveTimeSecs: 45,
      successfulSolverStrategies: [0, 1],
      qualityScore: 0.82,
      difficultyDrivers: ['ring_count'],
    },
    isBossChallenge: false,
    isDailyChallenge: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helper: reset store to default state before each test
// ---------------------------------------------------------------------------

function resetStore(): void {
  useChallengeStore.setState({
    activeChallengeConfig: null,
    timerRemaining: 0,
    ringPositions: [],
    ringVelocities: [],
    pegStates: [],
    winLossState: 'idle',
    continueCount: 0,
    adaptiveAssistFlags: [],
  });
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('challengeSlice — initial state', () => {
  beforeEach(resetStore);

  it('starts in idle state with no config', () => {
    const state = useChallengeStore.getState();
    expect(state.winLossState).toBe('idle');
    expect(state.activeChallengeConfig).toBeNull();
    expect(state.timerRemaining).toBe(0);
    expect(state.continueCount).toBe(0);
    expect(state.ringPositions).toHaveLength(0);
    expect(state.ringVelocities).toHaveLength(0);
    expect(state.pegStates).toHaveLength(0);
    expect(state.adaptiveAssistFlags).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// loadChallenge
// ---------------------------------------------------------------------------

describe('challengeSlice — loadChallenge', () => {
  beforeEach(resetStore);

  it('transitions winLossState from idle to playing', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('sets activeChallengeConfig', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().activeChallengeConfig).toBe(config);
  });

  it('initialises timerRemaining from config.timer.totalSeconds', () => {
    const config = makeChallengeConfig({ timer: { totalSeconds: 90, amberThresholdSecs: 30, criticalThresholdSecs: 10 } });
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().timerRemaining).toBe(90);
  });

  it('initialises ringPositions from ring initial positions', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const positions = useChallengeStore.getState().ringPositions;
    expect(positions).toHaveLength(2);
    expect(positions[0]).toEqual({ id: 'ring-1', x: 100, y: 300, angle: 0 });
    expect(positions[1]).toEqual({ id: 'ring-2', x: 200, y: 350, angle: 0 });
  });

  it('initialises ringVelocities to zero for all rings', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const velocities = useChallengeStore.getState().ringVelocities;
    expect(velocities).toHaveLength(2);
    expect(velocities[0]).toEqual({ id: 'ring-1', vx: 0, vy: 0, angularV: 0 });
    expect(velocities[1]).toEqual({ id: 'ring-2', vx: 0, vy: 0, angularV: 0 });
  });

  it('initialises pegStates with settledRingId = null for all pegs', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const pegs = useChallengeStore.getState().pegStates;
    expect(pegs).toHaveLength(2);
    expect(pegs[0]).toEqual({ id: 'peg-1', settledRingId: null });
    expect(pegs[1]).toEqual({ id: 'peg-2', settledRingId: null });
  });

  it('resets continueCount to 0', () => {
    const config = makeChallengeConfig();
    // Manually set a non-zero continueCount before loading.
    useChallengeStore.setState({ continueCount: 3 });
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().continueCount).toBe(0);
  });

  it('resets adaptiveAssistFlags to empty', () => {
    useChallengeStore.setState({ adaptiveAssistFlags: ['slow_rings', 'near_miss_bonus'] });
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().adaptiveAssistFlags).toHaveLength(0);
  });

  it('can reload a new challenge from a won/lost state', () => {
    const config1 = makeChallengeConfig({ challengeNumber: 1 });
    const config2 = makeChallengeConfig({ challengeNumber: 2 });
    useChallengeStore.getState().loadChallenge(config1);
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');

    useChallengeStore.getState().loadChallenge(config2);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
    expect(useChallengeStore.getState().activeChallengeConfig?.challengeNumber).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// updatePhysicsState
// ---------------------------------------------------------------------------

describe('challengeSlice — updatePhysicsState', () => {
  beforeEach(resetStore);

  it('updates ring positions', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);

    const newPositions: RingPosition[] = [
      { id: 'ring-1', x: 150, y: 320, angle: 0.5 },
      { id: 'ring-2', x: 210, y: 370, angle: -0.2 },
    ];
    const newVelocities: RingVelocity[] = [
      { id: 'ring-1', vx: 1.5, vy: -0.5, angularV: 0.1 },
      { id: 'ring-2', vx: -0.3, vy: 0.8, angularV: -0.05 },
    ];
    const newPegs: PegState[] = [
      { id: 'peg-1', settledRingId: null },
      { id: 'peg-2', settledRingId: null },
    ];

    useChallengeStore.getState().updatePhysicsState(newPositions, newVelocities, newPegs);

    const state = useChallengeStore.getState();
    expect(state.ringPositions[0]).toEqual({ id: 'ring-1', x: 150, y: 320, angle: 0.5 });
    expect(state.ringVelocities[0]).toEqual({ id: 'ring-1', vx: 1.5, vy: -0.5, angularV: 0.1 });
    expect(state.pegStates[0]).toEqual({ id: 'peg-1', settledRingId: null });
  });

  it('updates peg states when a ring settles', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);

    const pegsWithSettled: PegState[] = [
      { id: 'peg-1', settledRingId: 'ring-1' },
      { id: 'peg-2', settledRingId: null },
    ];
    useChallengeStore.getState().updatePhysicsState(
      useChallengeStore.getState().ringPositions,
      useChallengeStore.getState().ringVelocities,
      pegsWithSettled,
    );

    const state = useChallengeStore.getState();
    expect(state.pegStates[0].settledRingId).toBe('ring-1');
    expect(state.pegStates[1].settledRingId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setTimer
// ---------------------------------------------------------------------------

describe('challengeSlice — setTimer', () => {
  beforeEach(resetStore);

  it('updates timerRemaining', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().setTimer(45);
    expect(useChallengeStore.getState().timerRemaining).toBe(45);
  });

  it('allows setting timer to zero (expiry)', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().setTimer(0);
    expect(useChallengeStore.getState().timerRemaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// recordWin — win state transition
// ---------------------------------------------------------------------------

describe('challengeSlice — recordWin', () => {
  beforeEach(resetStore);

  it('transitions winLossState from playing to won', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');

    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');
  });

  it('preserves activeChallengeConfig after win', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().activeChallengeConfig).toBe(config);
  });

  it('preserves peg states after win', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const settledPegs: PegState[] = [
      { id: 'peg-1', settledRingId: 'ring-1' },
      { id: 'peg-2', settledRingId: 'ring-2' },
    ];
    useChallengeStore.getState().updatePhysicsState(
      useChallengeStore.getState().ringPositions,
      useChallengeStore.getState().ringVelocities,
      settledPegs,
    );
    useChallengeStore.getState().recordWin();
    const state = useChallengeStore.getState();
    expect(state.pegStates[0].settledRingId).toBe('ring-1');
    expect(state.winLossState).toBe('won');
  });
});

// ---------------------------------------------------------------------------
// recordLoss — loss state transition
// ---------------------------------------------------------------------------

describe('challengeSlice — recordLoss', () => {
  beforeEach(resetStore);

  it('transitions winLossState from playing to lost', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');

    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().winLossState).toBe('lost');
  });

  it('preserves activeChallengeConfig after loss', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().activeChallengeConfig).toBe(config);
  });

  it('preserves timerRemaining (= 0) after loss via timer expiry', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().setTimer(0);
    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().timerRemaining).toBe(0);
    expect(useChallengeStore.getState().winLossState).toBe('lost');
  });
});

// ---------------------------------------------------------------------------
// useContinue — continue count increment
// ---------------------------------------------------------------------------

describe('challengeSlice — useContinue', () => {
  beforeEach(resetStore);

  it('increments continueCount by 1', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().continueCount).toBe(0);

    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(1);
  });

  it('increments continueCount again on a second continue', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().useContinue();
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(2);
  });

  it('restores timerRemaining to totalSeconds after continue', () => {
    const config = makeChallengeConfig({ timer: { totalSeconds: 60, amberThresholdSecs: 20, criticalThresholdSecs: 10 } });
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().setTimer(0);
    expect(useChallengeStore.getState().timerRemaining).toBe(0);

    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().timerRemaining).toBe(60);
  });

  it('keeps winLossState as playing after continue', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('does nothing when no challenge is loaded', () => {
    // No loadChallenge called — activeChallengeConfig is null.
    const before = useChallengeStore.getState().continueCount;
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe('challengeSlice — selectors', () => {
  beforeEach(resetStore);

  it('selectActiveChallengeConfig returns null when idle', () => {
    expect(selectActiveChallengeConfig(useChallengeStore.getState())).toBeNull();
  });

  it('selectActiveChallengeConfig returns config after loadChallenge', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    expect(selectActiveChallengeConfig(useChallengeStore.getState())).toBe(config);
  });

  it('selectTimerRemaining returns current timer', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().setTimer(30);
    expect(selectTimerRemaining(useChallengeStore.getState())).toBe(30);
  });

  it('selectRingPositions returns ring positions array', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const positions = selectRingPositions(useChallengeStore.getState());
    expect(positions).toHaveLength(2);
    expect(positions[0].id).toBe('ring-1');
  });

  it('selectRingVelocities returns ring velocities array', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const velocities = selectRingVelocities(useChallengeStore.getState());
    expect(velocities).toHaveLength(2);
    expect(velocities[0].vx).toBe(0);
  });

  it('selectPegStates returns peg states array', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    const pegs = selectPegStates(useChallengeStore.getState());
    expect(pegs).toHaveLength(2);
    expect(pegs[0].settledRingId).toBeNull();
  });

  it('selectWinLossState returns correct lifecycle state', () => {
    const config = makeChallengeConfig();
    expect(selectWinLossState(useChallengeStore.getState())).toBe('idle');
    useChallengeStore.getState().loadChallenge(config);
    expect(selectWinLossState(useChallengeStore.getState())).toBe('playing');
    useChallengeStore.getState().recordWin();
    expect(selectWinLossState(useChallengeStore.getState())).toBe('won');
  });

  it('selectContinueCount returns continueCount', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().useContinue();
    expect(selectContinueCount(useChallengeStore.getState())).toBe(1);
  });

  it('selectAdaptiveAssistFlags returns assist flags', () => {
    useChallengeStore.setState({ adaptiveAssistFlags: ['slow_rings'] });
    expect(selectAdaptiveAssistFlags(useChallengeStore.getState())).toEqual(['slow_rings']);
  });
});

// ---------------------------------------------------------------------------
// State machine invariants
// ---------------------------------------------------------------------------

describe('challengeSlice — state machine invariants', () => {
  beforeEach(resetStore);

  it('win followed by loadChallenge resets back to playing', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');

    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('loss followed by loadChallenge resets back to playing', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().winLossState).toBe('lost');

    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('continueCount is always non-negative', () => {
    const config = makeChallengeConfig();
    useChallengeStore.getState().loadChallenge(config);
    // useContinue increments; it should never produce a negative count.
    useChallengeStore.getState().useContinue();
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBeGreaterThanOrEqual(0);
  });
});
