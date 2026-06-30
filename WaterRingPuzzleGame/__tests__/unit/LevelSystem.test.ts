/**
 * LevelSystem.test.ts — task 11.1.2a
 * Tests xpRequired, levelFromXP, xpProgressInLevel, MAX_LEVEL.
 */

import {
  xpRequired,
  levelFromXP,
  xpProgressInLevel,
  MAX_LEVEL,
} from '../../src/features/progression/LevelSystem';

describe('LevelSystem', () => {
  describe('MAX_LEVEL', () => {
    it('equals 2000', () => {
      expect(MAX_LEVEL).toBe(2000);
    });
  });

  describe('xpRequired', () => {
    it('xpRequired(1) = 100', () => {
      expect(xpRequired(1)).toBe(100);
    });

    it('xpRequired(10) = 3162', () => {
      expect(xpRequired(10)).toBe(3162);
    });

    it('xpRequired(50) = 35355', () => {
      expect(xpRequired(50)).toBe(35355);
    });

    it('xpRequired(100) = 100000', () => {
      expect(xpRequired(100)).toBe(100000);
    });

    it('xpRequired is monotonically increasing', () => {
      for (let i = 1; i < 20; i++) {
        expect(xpRequired(i + 1)).toBeGreaterThan(xpRequired(i));
      }
    });
  });

  describe('levelFromXP', () => {
    it('levelFromXP(0) = 1', () => {
      expect(levelFromXP(0)).toBe(1);
    });

    it('levelFromXP(100) = 1 (xpRequired(2)=282 not yet reached)', () => {
      // xpRequired(2) = floor(100 * 2^1.5) = 282 > 100, so stays at 1
      expect(levelFromXP(100)).toBe(1);
    });

    it('levelFromXP(xpRequired(5) - 1) = 4', () => {
      // One XP below level-5 threshold stays at level 4
      const threshold = xpRequired(5); // 1118
      expect(levelFromXP(threshold - 1)).toBe(4);
    });

    it('levelFromXP(xpRequired(5)) = 5 (exactly at threshold)', () => {
      // xpRequired(5)=1118: loop condition xpRequired(5+1)<=1118? xpRequired(6)=1469>1118, stops at 5
      // Actually at xp=1118: xpRequired(5)<=1118 → level becomes 5, xpRequired(6)>1118 → stops
      expect(levelFromXP(xpRequired(5))).toBe(5);
    });

    it('levelFromXP never exceeds MAX_LEVEL', () => {
      expect(levelFromXP(Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(MAX_LEVEL);
    });

    it('minimum level is always 1', () => {
      expect(levelFromXP(-1000)).toBe(1);
    });
  });

  describe('xpProgressInLevel', () => {
    it('returns fraction between 0 and 1 for normal XP', () => {
      const { fraction } = xpProgressInLevel(500);
      expect(fraction).toBeGreaterThanOrEqual(0);
      expect(fraction).toBeLessThanOrEqual(1);
    });

    it('fraction = 1 at MAX_LEVEL', () => {
      const { fraction } = xpProgressInLevel(xpRequired(MAX_LEVEL));
      expect(fraction).toBe(1);
    });

    it('current + needed sums correctly within a level', () => {
      const totalXP = xpRequired(3) + 50; // 50 XP into level 3
      const { current, needed } = xpProgressInLevel(totalXP);
      expect(current).toBe(50);
      expect(needed).toBe(xpRequired(4) - xpRequired(3));
    });

    it('fraction equals current/needed', () => {
      const totalXP = xpRequired(2) + 100;
      const { current, needed, fraction } = xpProgressInLevel(totalXP);
      expect(fraction).toBeCloseTo(current / needed, 5);
    });

    it('at XP = 0, fraction is 0', () => {
      const { fraction } = xpProgressInLevel(0);
      expect(fraction).toBe(0);
    });
  });
});
