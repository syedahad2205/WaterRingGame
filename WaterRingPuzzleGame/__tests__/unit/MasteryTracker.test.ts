/**
 * MasteryTracker.test.ts — task 11.2.1a
 * Tests MasteryTracker class, masteryLevelFromCompletions, getMasteryReward,
 * and MASTERY_THRESHOLDS.
 */

const mockCreditCoins = jest.fn();

jest.mock('../../src/store/slices/economySlice', () => ({
  useEconomyStore: {
    getState: () => ({ creditCoins: mockCreditCoins }),
  },
}));

import {
  MasteryTracker,
  masteryLevelFromCompletions,
  getMasteryReward,
  MASTERY_THRESHOLDS,
} from '../../src/features/progression/MasteryTracker';

describe('MasteryTracker', () => {
  beforeEach(() => {
    mockCreditCoins.mockClear();
  });

  describe('MASTERY_THRESHOLDS', () => {
    it('has correct thresholds for all tiers', () => {
      expect(MASTERY_THRESHOLDS.none).toBe(0);
      expect(MASTERY_THRESHOLDS.bronze).toBe(10);
      expect(MASTERY_THRESHOLDS.silver).toBe(25);
      expect(MASTERY_THRESHOLDS.gold).toBe(50);
      expect(MASTERY_THRESHOLDS.platinum).toBe(100);
    });
  });

  describe('masteryLevelFromCompletions', () => {
    it('0 completions → none', () => {
      expect(masteryLevelFromCompletions(0)).toBe('none');
    });

    it('9 completions → none (below bronze threshold)', () => {
      expect(masteryLevelFromCompletions(9)).toBe('none');
    });

    it('10 completions → bronze', () => {
      expect(masteryLevelFromCompletions(10)).toBe('bronze');
    });

    it('25 completions → silver', () => {
      expect(masteryLevelFromCompletions(25)).toBe('silver');
    });

    it('50 completions → gold', () => {
      expect(masteryLevelFromCompletions(50)).toBe('gold');
    });

    it('100 completions → platinum', () => {
      expect(masteryLevelFromCompletions(100)).toBe('platinum');
    });

    it('500 completions → platinum (above platinum threshold)', () => {
      expect(masteryLevelFromCompletions(500)).toBe('platinum');
    });
  });

  describe('getMasteryReward', () => {
    it('none reward = 0', () => {
      expect(getMasteryReward('none')).toBe(0);
    });

    it('bronze reward = 100', () => {
      expect(getMasteryReward('bronze')).toBe(100);
    });

    it('silver reward = 250', () => {
      expect(getMasteryReward('silver')).toBe(250);
    });

    it('gold reward = 500', () => {
      expect(getMasteryReward('gold')).toBe(500);
    });

    it('platinum reward = 1000', () => {
      expect(getMasteryReward('platinum')).toBe(1000);
    });
  });

  describe('MasteryTracker class', () => {
    it('recordCompletion returns null before reaching bronze (calls < 10)', () => {
      const tracker = new MasteryTracker();
      for (let i = 0; i < 9; i++) {
        const result = tracker.recordCompletion('standard');
        expect(result.newMasteryLevel).toBeNull();
      }
    });

    it('recordCompletion returns { newMasteryLevel: "bronze" } on 10th call', () => {
      const tracker = new MasteryTracker();
      let result;
      for (let i = 0; i < 10; i++) {
        result = tracker.recordCompletion('standard');
      }
      expect(result?.newMasteryLevel).toBe('bronze');
    });

    it('credits coins on reaching bronze milestone', () => {
      const tracker = new MasteryTracker();
      for (let i = 0; i < 10; i++) {
        tracker.recordCompletion('standard');
      }
      expect(mockCreditCoins).toHaveBeenCalledWith(100, 'mastery_standard_bronze');
    });

    it('getRecord completions increments correctly', () => {
      const tracker = new MasteryTracker();
      tracker.recordCompletion('standard');
      tracker.recordCompletion('standard');
      tracker.recordCompletion('standard');
      expect(tracker.getRecord('standard').completions).toBe(3);
    });

    it('serialize returns plain record with completion counts', () => {
      const tracker = new MasteryTracker();
      tracker.recordCompletion('precision');
      tracker.recordCompletion('precision');
      const serialized = tracker.serialize();
      expect(serialized.precision).toBe(2);
      expect(serialized.standard).toBe(0);
      expect(typeof serialized).toBe('object');
    });

    it('initialRecords constructor parameter seeds completions', () => {
      const tracker = new MasteryTracker({ standard: 50 });
      expect(tracker.getRecord('standard').completions).toBe(50);
      expect(tracker.getRecord('standard').masteryLevel).toBe('gold');
    });

    it('getRecord returns a copy (immutable snapshot)', () => {
      const tracker = new MasteryTracker();
      const record = tracker.getRecord('standard');
      record.completions = 999;
      expect(tracker.getRecord('standard').completions).toBe(0);
    });
  });
});
