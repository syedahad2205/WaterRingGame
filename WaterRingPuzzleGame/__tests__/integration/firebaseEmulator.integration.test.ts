/**
 * firebaseEmulator.integration.test.ts — task 1.5.2a
 *
 * Integration smoke test for the Firebase emulator connection helper.
 * The emulator is not expected to be running in CI; Firebase modules are
 * fully mocked so the module logic can be exercised without native binaries.
 */

jest.mock('@react-native-firebase/firestore', () => () => ({
  useEmulator: jest.fn(),
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({ exists: true, data: () => ({ uid: 'test' }) }),
      ),
    })),
  })),
}));

jest.mock('@react-native-firebase/auth', () => () => ({
  useEmulator: jest.fn(),
}));

jest.mock('@react-native-firebase/functions', () => () => ({
  useEmulator: jest.fn(),
}));

jest.mock('@react-native-firebase/storage', () => () => ({
  useEmulator: jest.fn(),
}));

// Reset the module between tests so `emulatorsConnected` state is fresh.
beforeEach(() => {
  jest.resetModules();
});

describe('Firebase emulator config module', () => {
  it('module loads without throwing', () => {
    expect(() => {
      require('../../src/services/firebase/emulatorConfig');
    }).not.toThrow();
  });

  it('exports connectToEmulators as a function', () => {
    const mod = require('../../src/services/firebase/emulatorConfig');
    expect(typeof mod.connectToEmulators).toBe('function');
  });

  it('exports shouldUseEmulators as a function', () => {
    const mod = require('../../src/services/firebase/emulatorConfig');
    expect(typeof mod.shouldUseEmulators).toBe('function');
  });

  it('connectToEmulators() is callable without throwing', () => {
    const { connectToEmulators } = require('../../src/services/firebase/emulatorConfig');
    expect(() => connectToEmulators()).not.toThrow();
  });

  it('connectToEmulators() is idempotent (safe to call twice)', () => {
    const { connectToEmulators } = require('../../src/services/firebase/emulatorConfig');
    expect(() => {
      connectToEmulators();
      connectToEmulators();
    }).not.toThrow();
  });

  it('shouldUseEmulators returns a boolean', () => {
    const { shouldUseEmulators } = require('../../src/services/firebase/emulatorConfig');
    const result = shouldUseEmulators();
    expect(typeof result).toBe('boolean');
  });

  it('shouldUseEmulators returns true in test environment (NODE_ENV=test)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    const { shouldUseEmulators } = require('../../src/services/firebase/emulatorConfig');
    expect(shouldUseEmulators()).toBe(true);
    process.env.NODE_ENV = originalEnv;
  });
});
