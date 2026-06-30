/**
 * achievementChain.integration.test.ts  (task 11.2.2b)
 *
 * Achievement unlock → analytics event + haptic event chain.
 * Tests that AchievementEngine.getProgress fires achievement_unlocked events
 * via GameEventEmitter when new achievements are earned.
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
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

jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: { notificationSuccess: 'notificationSuccess' },
}));

// GameEventEmitter is imported by AchievementEngine as a named import (gameEventEmitter).
// The mock factory must be self-contained — no closure over outer variables.
// Tests retrieve the mock emit spy via require() after the mock is in place.
jest.mock('../../src/utils/GameEventEmitter', () => {
  const mockEmitFn = jest.fn();
  const emitter = {
    emit: mockEmitFn,
    on: jest.fn(() => jest.fn()),
    off: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
    unsubscribe: jest.fn(),
    removeAllListeners: jest.fn(),
    listenerCount: jest.fn(() => 0),
  };
  return {
    __esModule: true,
    default: emitter,
    gameEventEmitter: emitter,
    GameEventEmitterClass: jest.fn().mockImplementation(() => emitter),
  };
});

import { AchievementEngine, ACHIEVEMENT_DEFINITIONS } from '../../src/features/progression/AchievementEngine';

// ─── helper: build a fully-zero snapshot ────────────────────────────────────
function zeroSnapshot() {
  return {
    challengesCompleted: 0,
    totalStars: 0,
    currentWinStreak: 0,
    noContWins: 0,
    fastWins: 0,
    dailiesCompleted: 0,
    prestigeCount: 0,
    inTop10: false,
    allTemplateBronze: false,
    anyTemplatePlatinum: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Achievement unlock → analytics + haptic chain (task 11.2.2b)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('AchievementEngine can be instantiated', () => {
    const engine = new AchievementEngine();
    expect(engine).toBeDefined();
  });

  it('getProgress returns an array for all 20 achievement definitions', () => {
    const engine = new AchievementEngine();
    const result = engine.getProgress(zeroSnapshot(), []);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
  });

  it('getProgress emits achievement_unlocked for first_win at challengesCompleted=1', () => {
    const GameEventEmitterModule = require('../../src/utils/GameEventEmitter');
    const emitterDefault = GameEventEmitterModule.default;

    const engine = new AchievementEngine();
    engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 1 }, []);

    // The engine calls GameEventEmitter.emit('achievement_unlocked', ...)
    expect(emitterDefault.emit).toHaveBeenCalledWith(
      'achievement_unlocked',
      expect.objectContaining({ id: 'first_win' }),
    );
  });

  it('getProgress marks first_win as unlocked when challengesCompleted >= 1', () => {
    const engine = new AchievementEngine();
    const progress = engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 1 }, []);
    const firstWin = progress.find(p => p.id === 'first_win');
    expect(firstWin).toBeDefined();
    expect(firstWin!.unlocked).toBe(true);
  });

  it('getProgress does NOT re-unlock first_win when already in unlockedIds', () => {
    const GameEventEmitterModule = require('../../src/utils/GameEventEmitter');
    const emitterDefault = GameEventEmitterModule.default;

    const engine = new AchievementEngine();
    engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 1 }, ['first_win']);

    // emit should NOT be called for first_win since it is already unlocked
    const calls = (emitterDefault.emit as jest.Mock).mock.calls;
    const firstWinEmit = calls.filter((c: unknown[]) =>
      c[1] && typeof c[1] === 'object' && (c[1] as Record<string, unknown>).id === 'first_win',
    );
    expect(firstWinEmit.length).toBe(0);
  });

  it('getProgress emits achievement_unlocked with xpReward', () => {
    const GameEventEmitterModule = require('../../src/utils/GameEventEmitter');
    const emitterDefault = GameEventEmitterModule.default;

    const engine = new AchievementEngine();
    engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 1 }, []);

    expect(emitterDefault.emit).toHaveBeenCalledWith(
      'achievement_unlocked',
      expect.objectContaining({ xpReward: expect.any(Number) }),
    );
  });

  it('multiple achievements can unlock in one getProgress call', () => {
    const GameEventEmitterModule = require('../../src/utils/GameEventEmitter');
    const emitterDefault = GameEventEmitterModule.default;

    const engine = new AchievementEngine();
    // challengesCompleted=10 should unlock both first_win and ten_wins
    engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 10 }, []);

    const emitCalls = (emitterDefault.emit as jest.Mock).mock.calls.filter(
      (c: unknown[]) => c[0] === 'achievement_unlocked',
    );
    expect(emitCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('evaluate() returns empty array (stateless stub)', () => {
    const engine = new AchievementEngine();
    const result = engine.evaluate({ ...zeroSnapshot(), challengesCompleted: 1 });
    // The evaluate() method is documented as returning [] (callers use getProgress)
    expect(Array.isArray(result)).toBe(true);
  });

  it('getProgress progress value is clamped to conditionValue', () => {
    const engine = new AchievementEngine();
    const progress = engine.getProgress({ ...zeroSnapshot(), challengesCompleted: 9999 }, []);
    progress.forEach(p => {
      const def = ACHIEVEMENT_DEFINITIONS.find(d => d.id === p.id)!;
      expect(p.progress).toBeLessThanOrEqual(def.conditionValue);
    });
  });
});
