/**
 * AchievementEngine.test.ts — task 11.2.2a
 * Tests AchievementEngine and ACHIEVEMENT_DEFINITIONS.
 */

jest.mock('../../src/utils/GameEventEmitter', () => ({
  __esModule: true,
  default: { emit: jest.fn(), dispatch: jest.fn() },
  gameEventEmitter: { emit: jest.fn(), dispatch: jest.fn() },
}));

import {
  AchievementEngine,
  ACHIEVEMENT_DEFINITIONS,
} from '../../src/features/progression/AchievementEngine';

const EMPTY_SNAPSHOT = {
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

describe('AchievementEngine', () => {
  let engine: AchievementEngine;

  beforeEach(() => {
    engine = new AchievementEngine();
  });

  describe('ACHIEVEMENT_DEFINITIONS', () => {
    it('has at least 20 entries', () => {
      expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThanOrEqual(20);
    });

    it('every definition has required fields', () => {
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        expect(def.id).toBeTruthy();
        expect(def.name).toBeTruthy();
        expect(def.description).toBeTruthy();
        expect(def.icon).toBeTruthy();
        expect(['bronze', 'silver', 'gold', 'platinum']).toContain(def.tier);
        expect(def.xpReward).toBeGreaterThan(0);
        expect(def.conditionType).toBeTruthy();
        expect(typeof def.conditionValue).toBe('number');
      }
    });

    it('all xpReward values are positive', () => {
      for (const def of ACHIEVEMENT_DEFINITIONS) {
        expect(def.xpReward).toBeGreaterThan(0);
      }
    });

    it('all ids are unique', () => {
      const ids = ACHIEVEMENT_DEFINITIONS.map((d) => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('evaluate', () => {
    it('returns empty array when no conditions met', () => {
      const result = engine.evaluate(EMPTY_SNAPSHOT);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('returns newly unlocked achievement ids when conditions are met', () => {
      const result = engine.evaluate({ ...EMPTY_SNAPSHOT, challengesCompleted: 1 });
      expect(result).toContain('first_win');
    });

    it('does not return same achievement twice on repeated calls', () => {
      engine.evaluate({ ...EMPTY_SNAPSHOT, challengesCompleted: 1 });
      const second = engine.evaluate({ ...EMPTY_SNAPSHOT, challengesCompleted: 1 });
      expect(second).not.toContain('first_win');
    });

    it('seedUnlocked prevents previously-unlocked achievements from firing', () => {
      engine.seedUnlocked(['first_win']);
      const result = engine.evaluate({ ...EMPTY_SNAPSHOT, challengesCompleted: 1 });
      expect(result).not.toContain('first_win');
    });
  });

  describe('getProgress', () => {
    it('returns array with one entry per achievement definition', () => {
      const progress = engine.getProgress(EMPTY_SNAPSHOT, []);
      expect(progress.length).toBe(ACHIEVEMENT_DEFINITIONS.length);
    });

    it('all achievements locked when snapshot is all-zeros', () => {
      const progress = engine.getProgress(EMPTY_SNAPSHOT, []);
      for (const p of progress) {
        expect(p.unlocked).toBe(false);
      }
    });

    it('challengesCompleted=1 unlocks first_win', () => {
      const progress = engine.getProgress(
        { ...EMPTY_SNAPSHOT, challengesCompleted: 1 },
        [],
      );
      const fw = progress.find((p) => p.id === 'first_win');
      expect(fw?.unlocked).toBe(true);
    });

    it('currentWinStreak=5 unlocks streak_5', () => {
      const progress = engine.getProgress(
        { ...EMPTY_SNAPSHOT, currentWinStreak: 5 },
        [],
      );
      const streak = progress.find((p) => p.id === 'streak_5');
      expect(streak?.unlocked).toBe(true);
    });

    it('noContWins=1 unlocks pure_win_1', () => {
      const progress = engine.getProgress(
        { ...EMPTY_SNAPSHOT, noContWins: 1 },
        [],
      );
      const nc = progress.find((p) => p.id === 'pure_win_1');
      expect(nc?.unlocked).toBe(true);
    });

    it('already-unlocked id is not re-unlocked (no unlockedAt set)', () => {
      const progress = engine.getProgress(
        { ...EMPTY_SNAPSHOT, challengesCompleted: 1 },
        ['first_win'],
      );
      const fw = progress.find((p) => p.id === 'first_win');
      // It should still show as unlocked (via unlockedIds), but no new unlockedAt
      expect(fw?.unlocked).toBe(true);
      expect(fw?.unlockedAt).toBeUndefined();
    });

    it('progress fraction is clamped between 0 and 1', () => {
      const progress = engine.getProgress(
        { ...EMPTY_SNAPSHOT, challengesCompleted: 9999 },
        [],
      );
      for (const p of progress) {
        // progress field is clamped at conditionValue
        const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === p.id)!;
        expect(p.progress).toBeLessThanOrEqual(def.conditionValue);
        expect(p.progress).toBeGreaterThanOrEqual(0);
      }
    });

    it('progress value equals min(snapshotValue, conditionValue)', () => {
      const snapshot = { ...EMPTY_SNAPSHOT, challengesCompleted: 5 };
      const progress = engine.getProgress(snapshot, []);
      const firstWin = progress.find((p) => p.id === 'first_win')!;
      expect(firstWin.progress).toBe(1); // min(5, 1) = 1
      const fiftyWins = progress.find((p) => p.id === 'fifty_wins')!;
      expect(fiftyWins.progress).toBe(5); // min(5, 50) = 5
    });
  });
});
