/**
 * PrestigeSystem.test.ts — task 11.1.2b
 * Tests canPrestige, prestigeXPMultiplier, PRESTIGE_LEVEL_REQUIREMENT.
 */

const mockApplyPrestige = jest.fn();
const mockCreditCoins = jest.fn();

jest.mock('../../src/store/slices/playerSlice', () => ({
  usePlayerStore: {
    getState: () => ({ applyPrestige: mockApplyPrestige }),
  },
}));

jest.mock('../../src/store/slices/economySlice', () => ({
  useEconomyStore: {
    getState: () => ({ creditCoins: mockCreditCoins }),
  },
}));

import {
  canPrestige,
  prestigeXPMultiplier,
  PRESTIGE_LEVEL_REQUIREMENT,
} from '../../src/features/progression/PrestigeSystem';

describe('PrestigeSystem', () => {
  describe('PRESTIGE_LEVEL_REQUIREMENT', () => {
    it('equals 500', () => {
      expect(PRESTIGE_LEVEL_REQUIREMENT).toBe(500);
    });
  });

  describe('canPrestige', () => {
    it('canPrestige(499) = false', () => {
      expect(canPrestige(499)).toBe(false);
    });

    it('canPrestige(500) = true', () => {
      expect(canPrestige(500)).toBe(true);
    });

    it('canPrestige(1000) = true', () => {
      expect(canPrestige(1000)).toBe(true);
    });

    it('canPrestige(0) = false', () => {
      expect(canPrestige(0)).toBe(false);
    });

    it('canPrestige(501) = true', () => {
      expect(canPrestige(501)).toBe(true);
    });
  });

  describe('prestigeXPMultiplier', () => {
    it('prestigeXPMultiplier(0) = 1.0', () => {
      expect(prestigeXPMultiplier(0)).toBe(1.0);
    });

    it('prestigeXPMultiplier(1) = 1.1', () => {
      expect(prestigeXPMultiplier(1)).toBeCloseTo(1.1, 5);
    });

    it('prestigeXPMultiplier(10) = 2.0 (clamped at max)', () => {
      // 1 + 10*0.1 = 2.0, exactly at cap
      expect(prestigeXPMultiplier(10)).toBe(2.0);
    });

    it('prestigeXPMultiplier(100) = 2.0 (still clamped)', () => {
      expect(prestigeXPMultiplier(100)).toBe(2.0);
    });

    it('prestigeXPMultiplier(5) = 1.5', () => {
      expect(prestigeXPMultiplier(5)).toBeCloseTo(1.5, 5);
    });

    it('never exceeds 2.0 regardless of prestige count', () => {
      for (const n of [11, 50, 200, 1000]) {
        expect(prestigeXPMultiplier(n)).toBeLessThanOrEqual(2.0);
      }
    });

    it('increases monotonically up to the cap', () => {
      expect(prestigeXPMultiplier(3)).toBeGreaterThan(prestigeXPMultiplier(2));
      expect(prestigeXPMultiplier(9)).toBeGreaterThan(prestigeXPMultiplier(8));
    });
  });
});
