jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(() => Promise.resolve()),
  setUserProperties: jest.fn(() => Promise.resolve()),
}));
jest.mock('@react-native-firebase/crashlytics', () => () => ({
  recordError: jest.fn(),
  setAttributes: jest.fn(),
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios' },
}));
jest.mock('../../src/utils/GameEventEmitter', () => ({
  gameEventEmitter: { on: jest.fn(), off: jest.fn(), emit: jest.fn(), subscribe: jest.fn(() => jest.fn()) },
}));

import { AnalyticsService } from '../../src/services/firebase/AnalyticsService';

describe('AnalyticsService — task 16.1.1a', () => {
  let svc: AnalyticsService;
  
  beforeEach(() => {
    svc = new AnalyticsService();
  });
  
  it('logEvent never throws with valid params', () => {
    expect(() => svc.logEvent('challenge_start', { challengeNumber: 1 })).not.toThrow();
  });
  
  it('logEvent never throws with undefined params', () => {
    expect(() => svc.logEvent('challenge_start', undefined)).not.toThrow();
  });
  
  it('logEvent never throws with null values in params', () => {
    expect(() => svc.logEvent('test_event', { key: null as any, value: undefined as any })).not.toThrow();
  });
  
  it('logEvent never throws with empty string event name', () => {
    expect(() => svc.logEvent('')).not.toThrow();
  });
  
  it('logEvent never throws with very long event name', () => {
    expect(() => svc.logEvent('a'.repeat(1000))).not.toThrow();
  });
  
  it('setUserId never throws', () => {
    expect(() => svc.setUserId('test_user')).not.toThrow();
  });
  
  it('setUserProperty never throws', () => {
    expect(() => svc.setUserProperty('level', '42')).not.toThrow();
  });
  
  it('logNonFatal never throws', () => {
    expect(() => svc.logNonFatal(new Error('test error'))).not.toThrow();
  });
  
  it('setPhysicsContext never throws', () => {
    expect(() => svc.setPhysicsContext({ activeRingCount: 3, challengeNumber: 5, deviceTier: 'high', platform: 'ios' })).not.toThrow();
  });
  
  it('stop() never throws', () => {
    svc.start();
    expect(() => svc.stop()).not.toThrow();
  });
});
