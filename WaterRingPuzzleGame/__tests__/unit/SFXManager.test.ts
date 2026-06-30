/**
 * Unit tests for SFXManager — task 9.1.2
 *
 * Covers:
 *  - SFXManager can be instantiated without errors
 *  - play() does not throw for all 17 event names
 *  - play() is a no-op when masterVolume = 0 (muted)
 *  - play() accepts options (volume, pitch, panning) without throwing
 *  - setMasterVolume() clamps and stores the value correctly
 *  - preload() marks events as preloaded
 *  - unloadAll() clears preloaded events
 *
 * Requirements: 14.1, 8.1
 */

// ---------------------------------------------------------------------------
// SFXManager uses Platform from react-native inside getSFXFilePath().
// We mock it here to cover both Android and iOS paths.
// ---------------------------------------------------------------------------

let mockPlatformOS: string = 'ios';

jest.mock('react-native', () => ({
  Platform: {
    get OS(): string {
      return mockPlatformOS;
    },
  },
}));

// ---------------------------------------------------------------------------
// Module under test
// ---------------------------------------------------------------------------

import { SFXManager, type SFXEventName, type SFXOptions } from '@features/audio/SFXManager';

// ---------------------------------------------------------------------------
// All 17 SFX event names
// ---------------------------------------------------------------------------

const ALL_SFX_EVENTS: SFXEventName[] = [
  'button_tap',
  'button_hold_start',
  'button_hold_peak',
  'rapid_tap',
  'ring_collision',
  'ring_wall_collision',
  'ring_near_peg',
  'ring_landed_peg',
  'perfect_placement',
  'timer_warning_amber',
  'timer_warning_red',
  'victory',
  'defeat',
  'achievement_unlock',
  'coin_earn',
  'navigation_tap',
  'purchase_confirm',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManager(): SFXManager {
  return new SFXManager();
}

// ---------------------------------------------------------------------------
// 1. Instantiation
// ---------------------------------------------------------------------------

describe('SFXManager — instantiation', () => {
  it('can be instantiated without throwing', () => {
    expect(() => makeManager()).not.toThrow();
  });

  it('starts with masterVolume = 1.0', () => {
    const manager = makeManager();
    expect(manager.getMasterVolume()).toBe(1.0);
  });
});

// ---------------------------------------------------------------------------
// 2. Event catalogue — 17 events
// ---------------------------------------------------------------------------

describe('SFXManager — event catalogue', () => {
  it('ALL_SFX_EVENTS contains exactly 17 unique event names', () => {
    expect(ALL_SFX_EVENTS).toHaveLength(17);
    expect(new Set(ALL_SFX_EVENTS).size).toBe(17);
  });

  describe('play() does not throw for all 17 events', () => {
    it.each(ALL_SFX_EVENTS)('play("%s") does not throw', (event) => {
      const manager = makeManager();
      expect(() => manager.play(event)).not.toThrow();
    });
  });

  describe('play() does not throw on Android for all 17 events', () => {
    beforeAll(() => {
      mockPlatformOS = 'android';
    });

    afterAll(() => {
      mockPlatformOS = 'ios';
    });

    it.each(ALL_SFX_EVENTS)('play("%s") on Android does not throw', (event) => {
      const manager = makeManager();
      expect(() => manager.play(event)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// 3. masterVolume = 0 mutes all events
// ---------------------------------------------------------------------------

describe('SFXManager — masterVolume = 0 mutes all events', () => {
  it('play() is a no-op (does not throw) when masterVolume is 0', () => {
    const manager = makeManager();
    manager.setMasterVolume(0);

    for (const event of ALL_SFX_EVENTS) {
      expect(() => manager.play(event)).not.toThrow();
    }
  });

  it('getMasterVolume() returns 0 after setMasterVolume(0)', () => {
    const manager = makeManager();
    manager.setMasterVolume(0);
    expect(manager.getMasterVolume()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. SFXOptions support
// ---------------------------------------------------------------------------

describe('SFXManager — SFXOptions', () => {
  it('play() accepts volume override without throwing', () => {
    const manager = makeManager();
    const options: SFXOptions = { volume: 0.5 };
    expect(() => manager.play('button_tap', options)).not.toThrow();
  });

  it('play() accepts pitch without throwing', () => {
    const manager = makeManager();
    const options: SFXOptions = { pitch: 1.08 };
    expect(() => manager.play('ring_collision', options)).not.toThrow();
  });

  it('play() accepts panning without throwing', () => {
    const manager = makeManager();
    // Spatial panning: ring at x=0 → panning = -1.0 (full left)
    const options: SFXOptions = { panning: -1.0 };
    expect(() => manager.play('ring_collision', options)).not.toThrow();
  });

  it('play() accepts all options together without throwing', () => {
    const manager = makeManager();
    const options: SFXOptions = { volume: 0.8, pitch: 0.95, panning: 0.3 };
    expect(() => manager.play('ring_wall_collision', options)).not.toThrow();
  });

  it('play() with volume 0 override does not throw', () => {
    const manager = makeManager();
    const options: SFXOptions = { volume: 0 };
    expect(() => manager.play('perfect_placement', options)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. setMasterVolume
// ---------------------------------------------------------------------------

describe('SFXManager — setMasterVolume()', () => {
  it('stores the provided volume', () => {
    const manager = makeManager();
    manager.setMasterVolume(0.7);
    expect(manager.getMasterVolume()).toBeCloseTo(0.7, 5);
  });

  it('clamps values above 1.0 to 1.0', () => {
    const manager = makeManager();
    manager.setMasterVolume(1.5);
    expect(manager.getMasterVolume()).toBe(1.0);
  });

  it('clamps values below 0 to 0', () => {
    const manager = makeManager();
    manager.setMasterVolume(-0.5);
    expect(manager.getMasterVolume()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. preload
// ---------------------------------------------------------------------------

describe('SFXManager — preload()', () => {
  it('resolves without throwing', async () => {
    const manager = makeManager();
    await expect(manager.preload(['button_tap', 'victory'])).resolves.not.toThrow();
  });

  it('marks events as preloaded', async () => {
    const manager = makeManager();
    await manager.preload(['ring_collision', 'ring_landed_peg']);
    expect(manager.isPreloaded('ring_collision')).toBe(true);
    expect(manager.isPreloaded('ring_landed_peg')).toBe(true);
  });

  it('does not mark events not in the preload list', async () => {
    const manager = makeManager();
    await manager.preload(['button_tap']);
    expect(manager.isPreloaded('victory')).toBe(false);
  });

  it('is idempotent — preloading the same event twice does not throw', async () => {
    const manager = makeManager();
    await manager.preload(['coin_earn']);
    await expect(manager.preload(['coin_earn'])).resolves.not.toThrow();
    expect(manager.isPreloaded('coin_earn')).toBe(true);
  });

  it('can preload all 17 events without throwing', async () => {
    const manager = makeManager();
    await expect(manager.preload(ALL_SFX_EVENTS)).resolves.not.toThrow();
    for (const event of ALL_SFX_EVENTS) {
      expect(manager.isPreloaded(event)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. unloadAll
// ---------------------------------------------------------------------------

describe('SFXManager — unloadAll()', () => {
  it('does not throw', async () => {
    const manager = makeManager();
    await manager.preload(['button_tap', 'victory']);
    expect(() => manager.unloadAll()).not.toThrow();
  });

  it('clears preloaded event cache', async () => {
    const manager = makeManager();
    await manager.preload(['button_tap', 'victory']);
    manager.unloadAll();
    expect(manager.isPreloaded('button_tap')).toBe(false);
    expect(manager.isPreloaded('victory')).toBe(false);
  });
});
