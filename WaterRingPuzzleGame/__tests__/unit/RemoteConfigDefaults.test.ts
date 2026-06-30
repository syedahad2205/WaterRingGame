/**
 * RemoteConfigDefaults.test.ts — task 1.5.3a
 * Verifies the shape and values of all Remote Config default constants.
 */

import {
  REMOTE_CONFIG_DEFAULT_SALT_GLOBAL,
  REMOTE_CONFIG_DEFAULT_SALT_DAILY,
  REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST,
  REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE,
  REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS,
  REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS,
  REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD,
  REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS,
  REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES,
  REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES,
} from '../../src/constants/remoteConfigDefaults';

describe('Remote Config defaults', () => {
  it('exports exactly 10 expected constant keys', () => {
    const mod = require('../../src/constants/remoteConfigDefaults');
    const keys = Object.keys(mod).filter((k) => k.startsWith('REMOTE_CONFIG_DEFAULT_'));
    expect(keys.length).toBe(10);
  });

  it('REMOTE_CONFIG_DEFAULT_SALT_GLOBAL is a non-empty string', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_SALT_GLOBAL).toBe('string');
    expect(REMOTE_CONFIG_DEFAULT_SALT_GLOBAL.length).toBeGreaterThan(0);
  });

  it('REMOTE_CONFIG_DEFAULT_SALT_DAILY is a non-empty string different from GLOBAL', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_SALT_DAILY).toBe('string');
    expect(REMOTE_CONFIG_DEFAULT_SALT_DAILY.length).toBeGreaterThan(0);
    expect(REMOTE_CONFIG_DEFAULT_SALT_DAILY).not.toBe(REMOTE_CONFIG_DEFAULT_SALT_GLOBAL);
  });

  it('REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST is a positive number', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST).toBe('number');
    expect(REMOTE_CONFIG_DEFAULT_BASE_CONTINUE_COST).toBeGreaterThan(0);
  });

  it('REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE is a positive number', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE).toBe('number');
    expect(REMOTE_CONFIG_DEFAULT_BASE_WATER_FORCE).toBeGreaterThan(0);
  });

  it('REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS is an integer >= 1', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS).toBe('number');
    expect(REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(REMOTE_CONFIG_DEFAULT_MAX_DAILY_AD_VIEWS)).toBe(true);
  });

  it('REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS is a plain object', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS).toBe('object');
    expect(REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS).not.toBeNull();
    expect(Array.isArray(REMOTE_CONFIG_DEFAULT_EVENT_WINDOWS)).toBe(false);
  });

  it('REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD is between 0.5 and 1.0', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD).toBe('number');
    expect(REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD).toBeGreaterThanOrEqual(0.5);
    expect(REMOTE_CONFIG_DEFAULT_QUALITY_SCORE_THRESHOLD).toBeLessThanOrEqual(1.0);
  });

  it('REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS is a positive integer', () => {
    expect(typeof REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS).toBe('number');
    expect(REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS).toBeGreaterThan(0);
    expect(Number.isInteger(REMOTE_CONFIG_DEFAULT_NEAR_MISS_BONUS_SECONDS)).toBe(true);
  });

  it('REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES equals 40', () => {
    expect(REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_BUBBLES).toBe(40);
  });

  it('REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES equals 20', () => {
    expect(REMOTE_CONFIG_DEFAULT_MAX_ACTIVE_RIPPLES).toBe(20);
  });
});
