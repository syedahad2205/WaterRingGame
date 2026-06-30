(global as any).__DEV__ = true;

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  NativeModules: {},
  NativeEventEmitter: jest.fn().mockImplementation(() => ({ addListener: jest.fn(), removeAllListeners: jest.fn() })),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
}));

import { FrameRateController } from '../../src/utils/PerformanceBenchmark';

describe('FrameRateController auto 30fps downgrade (task 18.2.2a)', () => {
  it('starts at 60fps target', () => {
    const ctrl = new FrameRateController();
    expect(ctrl.getCurrentTarget()).toBe(60);
  });
  
  it('downgrades to 30fps after 180 frames with P10 > 14ms', () => {
    let target = 60;
    const ctrl = new FrameRateController(t => { target = t; });
    
    // Feed 180 slow frames (P10 will be ~15ms)
    for (let i = 0; i < 180; i++) {
      ctrl.recordFrameTime(15 + Math.random() * 5); // 15-20ms
    }
    
    expect(ctrl.getCurrentTarget()).toBe(30);
    expect(target).toBe(30);
  });
  
  it('restores to 60fps after 300 fast frames following downgrade', () => {
    let target = 60;
    const ctrl = new FrameRateController(t => { target = t; });
    
    // Force downgrade
    for (let i = 0; i < 180; i++) ctrl.recordFrameTime(20);
    expect(ctrl.getCurrentTarget()).toBe(30);
    
    // Feed 300 fast frames (P10 will be ~10ms)
    for (let i = 0; i < 300; i++) ctrl.recordFrameTime(10);
    expect(ctrl.getCurrentTarget()).toBe(60);
  });
  
  it('reset() restores to 60fps target', () => {
    const ctrl = new FrameRateController();
    for (let i = 0; i < 180; i++) ctrl.recordFrameTime(20);
    ctrl.reset();
    expect(ctrl.getCurrentTarget()).toBe(60);
  });
  
  it('does not downgrade if fast frames within window', () => {
    const ctrl = new FrameRateController();
    for (let i = 0; i < 180; i++) ctrl.recordFrameTime(10); // fast
    expect(ctrl.getCurrentTarget()).toBe(60);
  });
});
