/**
 * Unit tests for MusicLayerManager — tasks 9.2.1, 9.2.2
 *
 * Covers:
 *  - MusicLayerManager can be instantiated and initialized without errors
 *  - initialize() sets isInitialized() to true
 *  - loadTheme() sets the active theme ID
 *  - setStemVolume() updates individual stem volumes (immediate and faded)
 *  - setAllStemsVolume() updates multiple stems at once
 *  - crossfadeToTheme() transitions to a new theme without throwing
 *  - stopAll() clears the theme and resets volumes
 *  - isInitialized() reflects correct state
 *
 * Requirements: 14.2, 8.1
 */

// ---------------------------------------------------------------------------
// MusicLayerManager has no react-native dependencies in its core logic
// (native calls are all guarded in try/catch TODOs), so no mocks needed.
// ---------------------------------------------------------------------------

import {
  MusicLayerManager,
  type MusicStemConfig,
  type StemName,
} from '@features/audio/MusicLayerManager';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh MusicLayerManager instance for each test. */
function makeManager(): MusicLayerManager {
  return new MusicLayerManager();
}

const ALL_STEMS: StemName[] = ['base', 'texture', 'rhythm', 'melody', 'counter', 'intensity'];

// ---------------------------------------------------------------------------
// 1. Instantiation
// ---------------------------------------------------------------------------

describe('MusicLayerManager — instantiation', () => {
  it('can be instantiated without throwing', () => {
    expect(() => makeManager()).not.toThrow();
  });

  it('starts uninitialized', () => {
    const manager = makeManager();
    expect(manager.isInitialized()).toBe(false);
  });

  it('starts with no active theme', () => {
    const manager = makeManager();
    expect(manager.getActiveThemeId()).toBeNull();
  });

  it('all stems start at volume 0', () => {
    const manager = makeManager();
    for (const stem of ALL_STEMS) {
      expect(manager.getStemVolume(stem)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Initialization
// ---------------------------------------------------------------------------

describe('MusicLayerManager — initialize()', () => {
  it('resolves without throwing', async () => {
    const manager = makeManager();
    await expect(manager.initialize()).resolves.not.toThrow();
  });

  it('sets isInitialized() to true after first call', async () => {
    const manager = makeManager();
    await manager.initialize();
    expect(manager.isInitialized()).toBe(true);
  });

  it('is idempotent — second call does not throw and stays initialized', async () => {
    const manager = makeManager();
    await manager.initialize();
    await expect(manager.initialize()).resolves.not.toThrow();
    expect(manager.isInitialized()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Theme loading
// ---------------------------------------------------------------------------

describe('MusicLayerManager — loadTheme()', () => {
  it('resolves without throwing', async () => {
    const manager = makeManager();
    await expect(manager.loadTheme('ocean')).resolves.not.toThrow();
  });

  it('sets the active theme ID after loading', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');
    expect(manager.getActiveThemeId()).toBe('ocean');
  });

  it('can load multiple themes in sequence', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');
    await manager.loadTheme('forest');
    expect(manager.getActiveThemeId()).toBe('forest');
  });

  it('auto-initializes if initialize() was not called first', async () => {
    const manager = makeManager();
    await manager.loadTheme('cave');
    expect(manager.isInitialized()).toBe(true);
    expect(manager.getActiveThemeId()).toBe('cave');
  });
});

// ---------------------------------------------------------------------------
// 4. setThemeId
// ---------------------------------------------------------------------------

describe('MusicLayerManager — setThemeId()', () => {
  it('updates the active theme ID', () => {
    const manager = makeManager();
    manager.setThemeId('desert');
    expect(manager.getActiveThemeId()).toBe('desert');
  });
});

// ---------------------------------------------------------------------------
// 5. Stem volume control
// ---------------------------------------------------------------------------

describe('MusicLayerManager — setStemVolume()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('sets stem volume immediately when fadeDurationMs = 0', () => {
    const manager = makeManager();
    manager.setStemVolume('base', 0.8, 0);
    expect(manager.getStemVolume('base')).toBeCloseTo(0.8, 5);
  });

  it('clamps volume above 1.0 to 1.0', () => {
    const manager = makeManager();
    manager.setStemVolume('rhythm', 1.5, 0);
    expect(manager.getStemVolume('rhythm')).toBe(1.0);
  });

  it('clamps volume below 0 to 0', () => {
    const manager = makeManager();
    manager.setStemVolume('melody', -0.5, 0);
    expect(manager.getStemVolume('melody')).toBe(0);
  });

  it('works for all 6 stem names', () => {
    const manager = makeManager();
    for (const stem of ALL_STEMS) {
      manager.setStemVolume(stem, 0.5, 0);
      expect(manager.getStemVolume(stem)).toBeCloseTo(0.5, 5);
    }
  });

  it('starts a fade when fadeDurationMs > 0, volume reaches target after fade', () => {
    const manager = makeManager();
    manager.setStemVolume('base', 0, 0); // start at 0
    manager.setStemVolume('base', 1.0, 320); // 320 ms fade

    // Before fade completes, volume is between 0 and 1
    jest.advanceTimersByTime(160);
    const mid = manager.getStemVolume('base');
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1.0);

    // After fade completes, volume is at target
    jest.advanceTimersByTime(200);
    expect(manager.getStemVolume('base')).toBeCloseTo(1.0, 2);
  });

  it('cancels previous fade when setStemVolume is called again', () => {
    const manager = makeManager();
    manager.setStemVolume('counter', 0, 0);
    manager.setStemVolume('counter', 1.0, 1000); // long fade
    jest.advanceTimersByTime(200);

    // Cancel and snap to 0.3
    manager.setStemVolume('counter', 0.3, 0);
    expect(manager.getStemVolume('counter')).toBeCloseTo(0.3, 5);
  });

  it('does not throw on unknown stem names', () => {
    const manager = makeManager();
    expect(() => manager.setStemVolume('unknown_stem', 0.5, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 6. setAllStemsVolume
// ---------------------------------------------------------------------------

describe('MusicLayerManager — setAllStemsVolume()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('applies volumes to all specified stems immediately', () => {
    const manager = makeManager();
    const volumes: Record<string, number> = {
      base: 1.0,
      texture: 0.8,
      rhythm: 0.6,
      melody: 0.7,
      counter: 0.5,
      intensity: 0,
    };

    manager.setAllStemsVolume(volumes, 0);

    for (const [stem, vol] of Object.entries(volumes)) {
      expect(manager.getStemVolume(stem)).toBeCloseTo(vol, 5);
    }
  });

  it('does not throw on an empty volumes map', () => {
    const manager = makeManager();
    expect(() => manager.setAllStemsVolume({}, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 7. crossfadeToTheme
// ---------------------------------------------------------------------------

describe('MusicLayerManager — crossfadeToTheme()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves without throwing', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');

    const promise = manager.crossfadeToTheme('forest', 100);
    jest.runAllTimers();
    await expect(promise).resolves.not.toThrow();
  });

  it('sets the new theme ID after crossfade completes', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');

    const promise = manager.crossfadeToTheme('forest', 10);
    jest.runAllTimers();
    await promise;

    expect(manager.getActiveThemeId()).toBe('forest');
  });

  it('is a no-op when crossing to the same theme', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');
    manager.setStemVolume('base', 1.0, 0);

    const promise = manager.crossfadeToTheme('ocean', 200);
    jest.runAllTimers();
    await promise;

    // Still on ocean, base volume unchanged
    expect(manager.getActiveThemeId()).toBe('ocean');
    expect(manager.getStemVolume('base')).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// 8. stopAll
// ---------------------------------------------------------------------------

describe('MusicLayerManager — stopAll()', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not throw', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');
    manager.setStemVolume('base', 1.0, 0);
    expect(() => manager.stopAll()).not.toThrow();
  });

  it('resets all stem volumes to 0', async () => {
    const manager = makeManager();
    await manager.loadTheme('ocean');
    manager.setAllStemsVolume(
      { base: 1.0, texture: 0.8, rhythm: 0.6, melody: 0.7, counter: 0.5, intensity: 0.3 },
      0,
    );

    manager.stopAll();

    for (const stem of ALL_STEMS) {
      expect(manager.getStemVolume(stem)).toBe(0);
    }
  });

  it('clears the active theme ID', async () => {
    const manager = makeManager();
    await manager.loadTheme('cave');
    manager.stopAll();
    expect(manager.getActiveThemeId()).toBeNull();
  });

  it('cancels any pending fades', () => {
    const manager = makeManager();
    manager.setStemVolume('base', 1.0, 2000); // long fade

    manager.stopAll();
    jest.advanceTimersByTime(2001);

    // Volume should be 0, not 1.0 — fade was cancelled
    expect(manager.getStemVolume('base')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. MusicStemConfig type usage
// ---------------------------------------------------------------------------

describe('MusicStemConfig type', () => {
  it('can construct a valid MusicStemConfig object', () => {
    const config: MusicStemConfig = {
      themeId: 'ocean',
      stemName: 'base',
      filePath: 'assets/sounds/music/ocean/base.mp3',
      targetVolume: 1.0,
    };
    expect(config.themeId).toBe('ocean');
    expect(config.stemName).toBe('base');
    expect(config.targetVolume).toBe(1.0);
  });
});
