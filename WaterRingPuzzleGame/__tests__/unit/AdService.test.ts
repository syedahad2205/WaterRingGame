/**
 * AdService.test.ts — task 12.3.1a
 * Tests AdService singleton, constants, canWatchAd, isFatigueGapMet, getState.
 */

import { AdService } from '../../src/features/economy/AdService';

describe('AdService', () => {
  beforeEach(() => {
    // Reset singleton between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (AdService as any).instance = null;
  });

  describe('getInstance', () => {
    it('returns an AdService instance', () => {
      const svc = AdService.getInstance();
      expect(svc).toBeInstanceOf(AdService);
    });

    it('returns the same singleton on repeated calls', () => {
      const a = AdService.getInstance();
      const b = AdService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('constants', () => {
    it('MAX_DAILY_ADS = 5', () => {
      const svc = AdService.getInstance();
      expect(svc.MAX_DAILY_ADS).toBe(5);
    });

    it('AD_COINS_REWARD = 50', () => {
      const svc = AdService.getInstance();
      expect(svc.AD_COINS_REWARD).toBe(50);
    });

    it('AD_FATIGUE_MIN_GAP_MS = 300_000', () => {
      const svc = AdService.getInstance();
      expect(svc.AD_FATIGUE_MIN_GAP_MS).toBe(300_000);
    });
  });

  describe('canWatchAd', () => {
    it('canWatchAd(0) = true (none watched yet)', () => {
      const svc = AdService.getInstance();
      expect(svc.canWatchAd(0)).toBe(true);
    });

    it('canWatchAd(4) = true (one slot remaining)', () => {
      const svc = AdService.getInstance();
      expect(svc.canWatchAd(4)).toBe(true);
    });

    it('canWatchAd(5) = false (at daily limit)', () => {
      const svc = AdService.getInstance();
      expect(svc.canWatchAd(5)).toBe(false);
    });

    it('canWatchAd(99) = false (well over limit)', () => {
      const svc = AdService.getInstance();
      expect(svc.canWatchAd(99)).toBe(false);
    });
  });

  describe('isFatigueGapMet', () => {
    it('returns true when no ad has ever been shown (lastAdShownAt = 0)', () => {
      const svc = AdService.getInstance();
      expect(svc.isFatigueGapMet()).toBe(true);
    });
  });

  describe('getState', () => {
    it('initial state is "idle"', () => {
      const svc = AdService.getInstance();
      expect(svc.getState()).toBe('idle');
    });
  });

  describe('resetDailyCount', () => {
    it('resets state back to idle', () => {
      const svc = AdService.getInstance();
      svc.resetDailyCount();
      expect(svc.getState()).toBe('idle');
    });
  });
});
