/**
 * challengeLoad.integration.test.ts — tasks 7.1.1a + 7.1.2a
 *
 * Integration tests for:
 *   7.1.1a — full challenge load pipeline completes in < 500ms
 *   7.1.2a — win/loss state-machine transition: playing → won
 */

// ---------------------------------------------------------------------------
// Module mocks (must be before any imports)
// ---------------------------------------------------------------------------

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: (obj: any) => obj.ios ?? obj.default },
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ exists: false, data: () => ({}) })),
      set: jest.fn(() => Promise.resolve()),
    })),
  })),
}));

jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(),
}));

jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  })),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { generateChallenge } from '../../src/features/game/generation/ChallengeGenerator';
import { useChallengeStore } from '../../src/store/slices/challengeSlice';
import type { ChallengeConfig } from '../../src/types/challenge';

// ---------------------------------------------------------------------------
// Shared fixture: minimal ChallengeConfig for state-machine tests
// ---------------------------------------------------------------------------

const mockConfig: Partial<ChallengeConfig> = {
  challengeNumber: 1,
  dailyDate: '',
  seed: 'test-seed',
  generatorVersion: '1.0.0',
  templateId: 'standard',
  difficultyScore: 0,
  normalizedDifficulty: 0,
  arena: { width: 390, height: 844 },
  timer: { totalSeconds: 60 },
  rings: [],
  pegs: [],
  obstacles: [],
  isBossChallenge: false,
  isDailyChallenge: false,
} as any;

// ---------------------------------------------------------------------------
// 7.1.1a — Challenge load pipeline performance
// ---------------------------------------------------------------------------

describe('7.1.1a: challenge load pipeline < 500ms', () => {
  it('generateChallenge(1) completes in < 500ms', () => {
    const start = Date.now();
    const config = generateChallenge(1);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(config).not.toBeNull();
    expect(config.rings.length).toBeGreaterThanOrEqual(1);
  });

  it('generateChallenge(100) completes in < 500ms', () => {
    const start = Date.now();
    const config = generateChallenge(100);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(config).not.toBeNull();
  });

  it('generateChallenge(50) (boss challenge) completes in < 500ms', () => {
    const start = Date.now();
    const config = generateChallenge(50);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
    expect(config.challengeNumber).toBe(50);
  });

  it('generated challenge has required structural fields', () => {
    const config = generateChallenge(1);
    expect(config).toHaveProperty('challengeNumber');
    expect(config).toHaveProperty('seed');
    expect(config).toHaveProperty('rings');
    expect(config).toHaveProperty('pegs');
    expect(config).toHaveProperty('timer');
    expect(config).toHaveProperty('arena');
    expect(config).toHaveProperty('templateId');
  });

  it('generateChallenge is deterministic: same number produces same seed', () => {
    const a = generateChallenge(7);
    const b = generateChallenge(7);
    expect(a.seed).toBe(b.seed);
    expect(a.rings.length).toBe(b.rings.length);
  });
});

// ---------------------------------------------------------------------------
// 7.1.2a — Win/loss state-machine transitions
// ---------------------------------------------------------------------------

describe('7.1.2a: win/loss state-machine transitions', () => {
  beforeEach(() => {
    // Reset to idle state before each test
    useChallengeStore.setState({
      winLossState: 'idle',
      activeChallengeConfig: null,
    } as any);
  });

  it('initial winLossState is "idle"', () => {
    expect(useChallengeStore.getState().winLossState).toBe('idle');
  });

  it('loadChallenge transitions winLossState from idle → playing', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as ChallengeConfig);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('recordWin transitions winLossState from playing → won', () => {
    useChallengeStore.setState({ winLossState: 'playing', activeChallengeConfig: mockConfig as ChallengeConfig } as any);
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');
  });

  it('recordLoss transitions winLossState from playing → lost', () => {
    useChallengeStore.setState({ winLossState: 'playing', activeChallengeConfig: mockConfig as ChallengeConfig } as any);
    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().winLossState).toBe('lost');
  });

  it('loadChallenge after won state resets to playing (retry / next challenge)', () => {
    useChallengeStore.setState({ winLossState: 'won', activeChallengeConfig: mockConfig as ChallengeConfig } as any);
    useChallengeStore.getState().loadChallenge(mockConfig as ChallengeConfig);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('loadChallenge after lost state resets to playing', () => {
    useChallengeStore.setState({ winLossState: 'lost', activeChallengeConfig: mockConfig as ChallengeConfig } as any);
    useChallengeStore.getState().loadChallenge(mockConfig as ChallengeConfig);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('activeChallengeConfig is set after loadChallenge', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as ChallengeConfig);
    expect(useChallengeStore.getState().activeChallengeConfig).not.toBeNull();
  });

  it('full sequence: idle → playing → won is valid', () => {
    expect(useChallengeStore.getState().winLossState).toBe('idle');
    useChallengeStore.getState().loadChallenge(mockConfig as ChallengeConfig);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');
  });
});
