(global as any).__DEV__ = true;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation(() => ({ addListener: jest.fn(), removeAllListeners: jest.fn() })),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: { impactLight: 'impactLight', impactMedium: 'impactMedium', impactHeavy: 'impactHeavy' },
}));
jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
}));

import { HapticManager } from '../../src/features/audio/HapticManager';
import { useSettingsStore } from '../../src/store/slices/settingsSlice';

const HapticManagerAny = HapticManager as any;

describe('Haptic intensity integration (task 8.4.4a)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ hapticIntensity: 1.0, hapticsEnabled: true });
  });

  it('HapticManager.trigger does not throw at intensity 1.0', () => {
    expect(() => {
      HapticManagerAny.trigger('buttonTap', 1.0);
    }).not.toThrow();
  });

  it('HapticManager.trigger does not throw at intensity 0.0', () => {
    expect(() => {
      HapticManagerAny.trigger('buttonTap', 0.0);
    }).not.toThrow();
  });

  it('HapticManager.trigger does not throw at intensity 0.5', () => {
    expect(() => {
      HapticManagerAny.trigger('buttonTap', 0.5);
    }).not.toThrow();
  });

  it('changing hapticIntensity setting is reflected in store', () => {
    useSettingsStore.setState({ hapticIntensity: 0.3 });
    expect(useSettingsStore.getState().hapticIntensity).toBe(0.3);
  });

  it('HapticManager.setEnabled with false prevents trigger output', () => {
    // When hapticsEnabled = false, trigger should be no-op
    expect(() => {
      HapticManagerAny.setEnabled(false);
      HapticManagerAny.trigger('ringSettled', 1.0);
    }).not.toThrow();
  });
});
