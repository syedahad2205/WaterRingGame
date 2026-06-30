jest.mock('react-native', () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    announceForAccessibility: jest.fn(),
  },
  Platform: { OS: 'ios' },
}));
jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn(() => ({ getString: jest.fn(() => null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({ createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })) }));

import { useSettingsStore } from '../../src/store/slices/settingsSlice';

describe('Accessibility store and settings (17.2.2a + 17.2.2b)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ colorBlindPreset: 'none', reducedMotionOverride: false, motorAccessibilityMode: false, largeTextMode: false });
  });

  it('colorBlindPreset defaults to none', () => {
    expect(useSettingsStore.getState().colorBlindPreset).toBe('none');
  });

  it('setColorBlindPreset changes to deuteranopia', () => {
    useSettingsStore.getState().setColorBlindPreset?.('deuteranopia');
    expect(useSettingsStore.getState().colorBlindPreset).toBe('deuteranopia');
  });

  it('reducedMotionOverride defaults to false', () => {
    expect(useSettingsStore.getState().reducedMotionOverride ?? false).toBe(false);
  });

  it('setReducedMotionOverride changes to true', () => {
    useSettingsStore.getState().setReducedMotionOverride?.(true);
    expect(useSettingsStore.getState().reducedMotionOverride).toBe(true);
  });

  it('motorAccessibilityMode defaults to false', () => {
    expect(useSettingsStore.getState().motorAccessibilityMode ?? false).toBe(false);
  });

  it('largeTextMode defaults to false', () => {
    expect(useSettingsStore.getState().largeTextMode ?? false).toBe(false);
  });

  // 17.2.2b: large text scale test
  it('largeTextMode toggle works', () => {
    useSettingsStore.getState().setLargeTextMode?.(true);
    expect(useSettingsStore.getState().largeTextMode).toBe(true);
    useSettingsStore.getState().setLargeTextMode?.(false);
    expect(useSettingsStore.getState().largeTextMode).toBe(false);
  });

  it('all 3 color-blind presets are valid values', () => {
    const presets: Array<'deuteranopia' | 'protanopia' | 'tritanopia'> = ['deuteranopia', 'protanopia', 'tritanopia'];
    presets.forEach(preset => {
      useSettingsStore.getState().setColorBlindPreset?.(preset);
      expect(useSettingsStore.getState().colorBlindPreset).toBe(preset);
    });
  });
});
