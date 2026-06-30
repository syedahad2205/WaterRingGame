/**
 * SFXMutedCompensation.test.ts  (task 9.1.3a)
 *
 * Tests the isMuted logic and structural guarantees of useMutedSFXCompensation.
 * The hook is not rendered — we test the pure-function logic inline and verify
 * source-file structure via fs.readFileSync.
 */

jest.mock('react-native-reanimated', () => ({
  useSharedValue: jest.fn((v: unknown) => ({ value: v })),
  withSequence: jest.fn((v: unknown) => v),
  withTiming: jest.fn((v: unknown) => v),
  withDelay: jest.fn((_d: unknown, v: unknown) => v),
}));

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

jest.mock('../../src/utils/GameEventEmitter', () => ({
  gameEventEmitter: {
    subscribe: jest.fn(() => jest.fn()),
    dispatch: jest.fn(),
    unsubscribe: jest.fn(),
  },
}));

// ─── Pure-function extraction of the hook's isMuted logic ────────────────────

function computeIsMuted(masterVolume: number, sfxVolume: number): boolean {
  return masterVolume === 0 || sfxVolume === 0;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SFX muted compensation — isMuted logic (task 9.1.3a)', () => {
  describe('computeIsMuted pure function', () => {
    it('returns false when masterVolume=1.0 and sfxVolume=1.0', () => {
      expect(computeIsMuted(1.0, 1.0)).toBe(false);
    });

    it('returns true when masterVolume=0', () => {
      expect(computeIsMuted(0, 1.0)).toBe(true);
    });

    it('returns true when sfxVolume=0', () => {
      expect(computeIsMuted(1.0, 0)).toBe(true);
    });

    it('returns true when both volumes are 0', () => {
      expect(computeIsMuted(0, 0)).toBe(true);
    });

    it('returns false for any non-zero combination', () => {
      expect(computeIsMuted(0.5, 0.5)).toBe(false);
      expect(computeIsMuted(1.0, 0.5)).toBe(false);
      expect(computeIsMuted(0.1, 1.0)).toBe(false);
    });

    it('masterVolume=0 triggers mute regardless of sfxVolume', () => {
      [0, 0.5, 1.0].forEach(sfx => {
        expect(computeIsMuted(0, sfx)).toBe(true);
      });
    });

    it('sfxVolume=0 triggers mute regardless of masterVolume', () => {
      [0, 0.5, 1.0].forEach(master => {
        expect(computeIsMuted(master, 0)).toBe(true);
      });
    });
  });

  describe('source file structure checks', () => {
    let source: string;

    beforeAll(() => {
      const fs = require('fs');
      const path = require('path');
      source = fs.readFileSync(
        path.resolve(__dirname, '../../src/hooks/useMutedSFXCompensation.ts'),
        'utf8',
      );
    });

    it('source file exports useMutedSFXCompensation', () => {
      expect(source).toMatch(/export\s+function\s+useMutedSFXCompensation/);
    });

    it('source file defines ringSettledFlashOpacity shared value', () => {
      expect(source).toContain('ringSettledFlashOpacity');
    });

    it('source file defines collisionFlashOpacity shared value', () => {
      expect(source).toContain('collisionFlashOpacity');
    });

    it('source file exposes isMuted in the return value', () => {
      expect(source).toContain('isMuted');
    });

    it('source file subscribes to ring_settled event', () => {
      expect(source).toContain('ring_settled');
    });

    it('source file subscribes to ring_collision event', () => {
      expect(source).toContain('ring_collision');
    });

    it('isMuted is computed from masterVolume and sfxVolume', () => {
      expect(source).toMatch(/masterVolume\s*===\s*0\s*\|\|\s*sfxVolume\s*===\s*0/);
    });

    it('uses withSequence for flash animation', () => {
      expect(source).toContain('withSequence');
    });

    it('uses withTiming for opacity transitions', () => {
      expect(source).toContain('withTiming');
    });
  });
});
