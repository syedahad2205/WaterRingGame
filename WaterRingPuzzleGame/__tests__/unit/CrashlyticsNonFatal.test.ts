const mockRecordError = jest.fn();
const mockSetAttributes = jest.fn();

jest.mock('@react-native-firebase/crashlytics', () => () => ({
  recordError: mockRecordError,
  setAttributes: mockSetAttributes,
}));
jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: jest.fn(() => Promise.resolve()),
  setUserId: jest.fn(),
  setUserProperties: jest.fn(),
}));
jest.mock('react-native', () => ({
  AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
  Platform: { OS: 'ios' },
}));
jest.mock('../../src/utils/GameEventEmitter', () => ({
  gameEventEmitter: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
}));

import { AnalyticsService } from '../../src/services/firebase/AnalyticsService';

describe('Crashlytics non-fatal logging on NaN detection (task 16.2.2a)', () => {
  let svc: AnalyticsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    svc = new AnalyticsService();
  });
  
  it('logNonFatal calls crashlytics.recordError with the error', () => {
    const error = new Error('NaN detected in ring position');
    svc.logNonFatal(error);
    expect(mockRecordError).toHaveBeenCalledWith(error);
  });
  
  it('logNonFatal with context calls setAttributes before recordError', () => {
    svc.logNonFatal(new Error('NaN'), { challenge: '5', position: 'ring_x' });
    expect(mockSetAttributes).toHaveBeenCalledWith({ challenge: '5', position: 'ring_x' });
    expect(mockRecordError).toHaveBeenCalled();
  });
  
  it('setPhysicsContext sets all 4 required attributes', () => {
    svc.setPhysicsContext({ activeRingCount: 3, challengeNumber: 7, deviceTier: 'mid', platform: 'android' });
    expect(mockSetAttributes).toHaveBeenCalledWith({
      active_ring_count: '3',
      challenge_number: '7',
      device_tier: 'mid',
      platform: 'android',
    });
  });
  
  it('logNonFatal never throws even if crashlytics throws', () => {
    mockRecordError.mockImplementationOnce(() => { throw new Error('crashlytics error'); });
    expect(() => svc.logNonFatal(new Error('test'))).not.toThrow();
  });
});
