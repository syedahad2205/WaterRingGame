/**
 * XPSystem.test.ts — task 11.1.1a
 * Tests xpForChallenge, STAR_MULTIPLIERS, and XP_BASE.
 */

jest.mock('../../src/store/slices/playerSlice', () => ({}));
jest.mock('../../src/store/slices/economySlice', () => ({}));

import {
  xpForChallenge,
  STAR_MULTIPLIERS,
  XP_BASE,
} from '../../src/features/progression/XPSystem';

describe('XPSystem', () => {
  describe('constants', () => {
    it('XP_BASE equals 100', () => {
      expect(XP_BASE).toBe(100);
    });

    it('STAR_MULTIPLIERS has correct values', () => {
      expect(STAR_MULTIPLIERS[1]).toBe(0.5);
      expect(STAR_MULTIPLIERS[2]).toBe(0.8);
      expect(STAR_MULTIPLIERS[3]).toBe(1.0);
    });
  });

  describe('xpForChallenge', () => {
    it('D=0 (challengeNumber=0), 1 star, 0 continues → 50', () => {
      // 100 * 0.5 * (1+0) * 1.0 = 50
      expect(xpForChallenge(0, 1, 0)).toBe(50);
    });

    it('D=0.5 (challengeNumber=50), 2 stars, 0 continues → 120', () => {
      // 100 * 0.8 * 1.5 * 1.0 = 120
      expect(xpForChallenge(50, 2, 0)).toBe(120);
    });

    it('D=1.0 (challengeNumber=100), 3 stars, 0 continues → 200', () => {
      // 100 * 1.0 * 2.0 * 1.0 = 200
      expect(xpForChallenge(100, 3, 0)).toBe(200);
    });

    it('D=1.0, 3 stars, 1 continue → 160', () => {
      // 200 * 0.8 = 160
      expect(xpForChallenge(100, 3, 1)).toBe(160);
    });

    it('D=1.0, 3 stars, 2 continues → 120', () => {
      // 200 * 0.6 = 120
      expect(xpForChallenge(100, 3, 2)).toBe(120);
    });

    it('D=1.0, 3 stars, 3+ continues also applies 0.6 penalty', () => {
      // Same as 2 continues — penalty floor is 0.6
      expect(xpForChallenge(100, 3, 5)).toBe(120);
    });

    it('result is always a positive integer', () => {
      const cases: [number, 1 | 2 | 3, number][] = [
        [0, 1, 0], [25, 2, 1], [75, 3, 2], [100, 1, 0], [50, 3, 1],
      ];
      for (const [ch, st, cont] of cases) {
        const result = xpForChallenge(ch, st, cont);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThan(0);
      }
    });

    it('challengeNumber > 100 is clamped to D=1.0', () => {
      // challengeNumber=200 → D=min(2,1)=1.0, same as challengeNumber=100
      expect(xpForChallenge(200, 3, 0)).toBe(xpForChallenge(100, 3, 0));
    });

    it('1-star always yields lower XP than 3-star at same difficulty', () => {
      expect(xpForChallenge(50, 1, 0)).toBeLessThan(xpForChallenge(50, 3, 0));
    });
  });
});
