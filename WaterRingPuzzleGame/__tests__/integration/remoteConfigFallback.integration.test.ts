jest.mock('@react-native-firebase/remote-config', () => () => ({
  setDefaults: jest.fn(() => Promise.resolve()),
  setConfigSettings: jest.fn(() => Promise.resolve()),
  fetchAndActivate: jest.fn(() => Promise.reject(new Error('Network unavailable'))),
  getValue: jest.fn(() => ({ asString: () => '', asNumber: () => 0, asBoolean: () => false })),
}));
jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn(() => ({ getString: jest.fn(() => null), set: jest.fn(), delete: jest.fn() })) }));

import { RemoteConfigService } from '../../src/services/firebase/RemoteConfigService';

describe('RemoteConfig fallback test (task 16.2.1a)', () => {
  it('returns hardcoded defaults when Firebase fetch fails', async () => {
    const svc = new RemoteConfigService();
    await svc.fetchAndActivate();
    const config = svc.getConfig() as import('../../src/services/firebase/RemoteConfigService').RemoteConfigValues;
    
    expect(config.base_continue_cost).toBeGreaterThan(0);
    expect(config.max_daily_ad_views).toBeGreaterThan(0);
    expect(config.max_active_bubbles).toBe(40);
    expect(config.max_active_ripples).toBe(20);
  });
  
  it('getConfig() never throws', () => {
    const svc = new RemoteConfigService();
    expect(() => svc.getConfig()).not.toThrow();
  });
  
  it('all 10 config keys are present in defaults', () => {
    const svc = new RemoteConfigService();
    const config = svc.getConfig();
    const keys = ['salt_global', 'salt_daily', 'base_continue_cost', 'base_water_force',
      'max_daily_ad_views', 'event_windows', 'quality_score_threshold',
      'near_miss_bonus_seconds', 'max_active_bubbles', 'max_active_ripples'];
    keys.forEach(k => expect(config).toHaveProperty(k));
  });
});
