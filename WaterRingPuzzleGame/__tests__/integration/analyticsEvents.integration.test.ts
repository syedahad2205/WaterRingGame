const mockLogEvent = jest.fn(() => Promise.resolve());
jest.mock('@react-native-firebase/analytics', () => () => ({
  logEvent: mockLogEvent,
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

const onHandlers: Record<string, Function[]> = {};
jest.mock('../../src/utils/GameEventEmitter', () => ({
  gameEventEmitter: {
    subscribe: jest.fn((event: string, handler: Function) => {
      if (!onHandlers[event]) onHandlers[event] = [];
      onHandlers[event].push(handler);
    }),
    unsubscribe: jest.fn(),
    emit: jest.fn((event: string, data?: unknown) => {
      onHandlers[event]?.forEach(h => h(data));
    }),
  },
}));

import { AnalyticsService } from '../../src/services/firebase/AnalyticsService';
import { gameEventEmitter } from '../../src/utils/GameEventEmitter';

describe('AnalyticsService integration — events fire with mandatory context fields', () => {
  let svc: AnalyticsService;
  
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(onHandlers).forEach(k => delete onHandlers[k]);
    svc = new AnalyticsService();
    svc.start();
    svc.setUserId('test_user_123');
    svc.setChallenge(5);
    svc.setDeviceTier('high');
  });
  
  afterEach(() => svc.stop());
  
  it('16.1.1b: logEvent enqueues event with all 7 mandatory context fields', async () => {
    svc.logEvent('test_event', { foo: 'bar' });
    // Force flush
    await (svc as any).flush();
    
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    const [, params] = (mockLogEvent.mock.calls[0] as unknown as [string, Record<string, unknown>]);
    expect(params).toHaveProperty('user_id');
    expect(params).toHaveProperty('session_id');
    expect(params).toHaveProperty('challenge_number');
    expect(params).toHaveProperty('timestamp');
    expect(params).toHaveProperty('platform');
    expect(params).toHaveProperty('app_version');
    expect(params).toHaveProperty('generator_version');
    expect(params).toHaveProperty('device_tier');
  });
  
  it('16.1.2a: all gameplay events are subscribed and fire', async () => {
    const gameplayEvents = [
      'challenge_start', 'challenge_complete', 'challenge_fail',
      'button_tap', 'ring_settled', 'physics_nan_recovery',
    ];
    
    for (const evt of gameplayEvents) {
      ;(gameEventEmitter as any).emit(evt, { challengeNumber: 5 });
    }
    
    await (svc as any).flush();
    expect(mockLogEvent.mock.calls.length).toBeGreaterThanOrEqual(gameplayEvents.length);
  });
  
  it('16.1.3a: progression and economy events fire', async () => {
    const events = ['xp_earned', 'level_up', 'coin_earned', 'coin_spent', 'iap_initiated', 'ad_view_start'];
    
    for (const evt of events) {
      ;(gameEventEmitter as any).emit(evt, { amount: 100 });
    }
    
    await (svc as any).flush();
    expect(mockLogEvent.mock.calls.length).toBeGreaterThanOrEqual(events.length);
  });
  
  it('subscribes to at least 50 distinct event types', () => {
    expect(Object.keys(onHandlers).length).toBeGreaterThanOrEqual(50);
  });
});
