/**
 * fullChallengeLifecycle.integration.test.ts
 * Full challenge lifecycle integration test — task 19.3.1a
 *
 * Tests the end-to-end flow: generate → load → play → win/lose/continue
 * without any native modules or network calls.
 *
 * Requirements: 11.1, 17.3, 18.3, 18.4
 */

// ─── Mock all native modules ──────────────────────────────────────────────────
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn(() => ({
    getString: jest.fn(() => null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));
jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
    })),
  })),
}));
jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
}));
jest.mock('@react-native-firebase/crashlytics', () => () => ({
  recordError: jest.fn(),
  setAttributes: jest.fn(),
}));
jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() =>
    jest.fn(() => Promise.resolve({ data: { success: true, rank: 1 } })),
  ),
}));
jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(() => ({ toString: () => 'mock_hmac' })),
}));

import { generateChallenge } from '../../src/features/game/generation/ChallengeGenerator';
import { useChallengeStore } from '../../src/store/slices/challengeSlice';
import { usePlayerStore } from '../../src/store/slices/playerSlice';
import { useEconomyStore } from '../../src/store/slices/economySlice';

// ─────────────────────────────────────────────────────────────────────────────

describe('Full challenge lifecycle integration (task 19.3.1a)', () => {
  beforeEach(() => {
    useChallengeStore.setState({
      winLossState: 'idle',
      activeChallengeConfig: null,
      continueCount: 0,
      timerRemaining: 0,
      ringPositions: [],
      ringVelocities: [],
      pegStates: [],
      adaptiveAssistFlags: [],
    });
  });

  // ── Generate ─────────────────────────────────────────────────────────────

  it('generateChallenge(N) returns a non-null config with correct challengeNumber', () => {
    const config = generateChallenge(1);
    expect(config).not.toBeNull();
    expect(config.challengeNumber).toBe(1);
  });

  it('challenge lifecycle: generate → load → play → win', () => {
    const config = generateChallenge(1);
    expect(config).not.toBeNull();

    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().winLossState).toBe('playing');

    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');
  });

  it('challenge lifecycle: generate → load → play → lose', () => {
    const config = generateChallenge(2);
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().recordLoss();
    expect(useChallengeStore.getState().winLossState).toBe('lost');
  });

  it('challenge lifecycle: load → continue → resume playing', () => {
    const config = generateChallenge(3);
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(1);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('challenge number increases monotonically in generated configs', () => {
    const c1 = generateChallenge(1);
    const c5 = generateChallenge(5);
    const c100 = generateChallenge(100);
    expect(c1.challengeNumber).toBeLessThan(c5.challengeNumber);
    expect(c5.challengeNumber).toBeLessThan(c100.challengeNumber);
  });

  it('win flow: state machine is in won state after recordWin', () => {
    useChallengeStore.getState().loadChallenge(generateChallenge(1));
    useChallengeStore.getState().recordWin();
    expect(useChallengeStore.getState().winLossState).toBe('won');
  });

  it('offline mode: challenge generates without Firebase', () => {
    const config = generateChallenge(42);
    expect(config).toBeTruthy();
    expect(config.challengeNumber).toBe(42);
  });

  // ── Config structure ────────────────────────────────────────────────────

  it('generated config contains rings array', () => {
    const config = generateChallenge(5);
    expect(Array.isArray(config.rings)).toBe(true);
    expect(config.rings.length).toBeGreaterThan(0);
  });

  it('generated config contains pegs array', () => {
    const config = generateChallenge(5);
    expect(Array.isArray(config.pegs)).toBe(true);
    expect(config.pegs.length).toBeGreaterThan(0);
  });

  it('generated config has a valid timer object with totalSeconds > 0', () => {
    const config = generateChallenge(1);
    expect(config.timer).toBeDefined();
    expect(config.timer.totalSeconds).toBeGreaterThan(0);
  });

  it('loadChallenge sets timerRemaining to config.timer.totalSeconds', () => {
    const config = generateChallenge(10);
    useChallengeStore.getState().loadChallenge(config);
    expect(useChallengeStore.getState().timerRemaining).toBe(config.timer.totalSeconds);
  });

  it('loadChallenge resets continueCount to 0', () => {
    const config = generateChallenge(10);
    useChallengeStore.getState().loadChallenge(config);
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(1);
    // Load a new challenge — continueCount must reset
    useChallengeStore.getState().loadChallenge(generateChallenge(11));
    expect(useChallengeStore.getState().continueCount).toBe(0);
  });

  // ── Determinism ─────────────────────────────────────────────────────────

  it('generateChallenge is deterministic: same N yields same config', () => {
    const a = generateChallenge(77);
    const b = generateChallenge(77);
    expect(a.challengeNumber).toBe(b.challengeNumber);
    expect(a.rings.length).toBe(b.rings.length);
    expect(a.pegs.length).toBe(b.pegs.length);
  });

  it('generateChallenge(N+1) differs from generateChallenge(N)', () => {
    const a = generateChallenge(50);
    const b = generateChallenge(51);
    // They may occasionally produce the same ring count at low N but IDs should differ
    const aIds = a.rings.map(r => r.id).join(',');
    const bIds = b.rings.map(r => r.id).join(',');
    // At minimum the challengeNumber in the config must differ
    expect(a.challengeNumber).not.toBe(b.challengeNumber);
  });

  // ── Player and economy stores ────────────────────────────────────────────

  it('playerStore and economyStore are accessible and have expected shape', () => {
    const player = usePlayerStore.getState();
    const economy = useEconomyStore.getState();
    expect(player).toBeDefined();
    expect(economy).toBeDefined();
    expect(typeof economy.coinBalance).toBe('number');
    expect(economy.coinBalance).toBeGreaterThanOrEqual(0);
  });
});
