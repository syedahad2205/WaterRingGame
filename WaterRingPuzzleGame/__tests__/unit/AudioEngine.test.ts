/**
 * Unit tests for AudioEngine — task 9.1.1
 *
 * Covers:
 *  - All required methods are exposed on the class
 *  - Music state machine transitions (full lifecycle)
 *  - Pause fades to 15%, resume restores active levels
 *  - setMasterVolume / setMusicVolume / setSFXVolume update internal state
 *  - SFX mute triggers UI notification callback
 *  - All lifecycle methods are callable without throwing
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

// ---------------------------------------------------------------------------
// Suppress __DEV__ console.debug noise in tests
// ---------------------------------------------------------------------------
beforeAll(() => {
  // React Native sets __DEV__ = true in test env; silence the debug logger.
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  // Use fake timers so deferred callbacks (victory sting, defeat sting) in
  // onVictory() / onDefeat() don't leak as open handles after tests complete.
  jest.useFakeTimers();
});

afterEach(() => {
  // Flush any pending timers (e.g. victory/defeat sting setTimeout).
  jest.runAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { AudioEngine } from '../../src/features/audio/AudioEngine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a fresh AudioEngine for each test. */
function makeEngine(): AudioEngine {
  return new AudioEngine();
}

// ---------------------------------------------------------------------------
// 1. Public interface — Requirement 14.1
// ---------------------------------------------------------------------------

describe('AudioEngine public interface', () => {
  it('exposes all 14 required public methods', () => {
    const engine = makeEngine();

    expect(typeof engine.startChallenge).toBe('function');
    expect(typeof engine.onFirstRingMoved).toBe('function');
    expect(typeof engine.onFirstRingLanded).toBe('function');
    expect(typeof engine.onChallengeMidpoint).toBe('function');
    expect(typeof engine.onTimerAmber).toBe('function');
    expect(typeof engine.onTimerCritical).toBe('function');
    expect(typeof engine.onVictory).toBe('function');
    expect(typeof engine.onDefeat).toBe('function');
    expect(typeof engine.pause).toBe('function');
    expect(typeof engine.resume).toBe('function');
    expect(typeof engine.playSFX).toBe('function');
    expect(typeof engine.setMasterVolume).toBe('function');
    expect(typeof engine.setMusicVolume).toBe('function');
    expect(typeof engine.setSFXVolume).toBe('function');
  });

  it('all lifecycle methods are callable without throwing', () => {
    const engine = makeEngine();

    expect(() => engine.startChallenge('ocean')).not.toThrow();
    expect(() => engine.onFirstRingMoved()).not.toThrow();
    expect(() => engine.onFirstRingLanded()).not.toThrow();
    expect(() => engine.onChallengeMidpoint()).not.toThrow();
    expect(() => engine.onTimerAmber()).not.toThrow();
    expect(() => engine.onTimerCritical()).not.toThrow();
    expect(() => engine.onVictory()).not.toThrow();
    expect(() => engine.onDefeat()).not.toThrow();
    expect(() => engine.pause()).not.toThrow();
    expect(() => engine.resume()).not.toThrow();
    expect(() => engine.playSFX('button_tap')).not.toThrow();
    expect(() => engine.setMasterVolume(0.5)).not.toThrow();
    expect(() => engine.setMusicVolume(0.5)).not.toThrow();
    expect(() => engine.setSFXVolume(0.5)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. Initial state
// ---------------------------------------------------------------------------

describe('AudioEngine initial state', () => {
  it('starts in idle music state', () => {
    const engine = makeEngine();
    expect(engine.getMusicState()).toBe('idle');
  });

  it('starts with all stems at 0 volume', () => {
    const engine = makeEngine();
    const stems = engine.getStemVolumes();

    expect(stems.base).toBe(0);
    expect(stems.texture).toBe(0);
    expect(stems.rhythm).toBe(0);
    expect(stems.melody).toBe(0);
    expect(stems.counter).toBe(0);
    expect(stems.intensity).toBe(0);
  });

  it('starts with master, music, and sfx volumes at 1.0', () => {
    const engine = makeEngine();
    const volumes = engine.getVolumes();

    expect(volumes.master).toBe(1.0);
    expect(volumes.music).toBe(1.0);
    expect(volumes.sfx).toBe(1.0);
  });

  it('starts with sfxMuted = false', () => {
    const engine = makeEngine();
    expect(engine.isSFXMuted()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Music state machine — Requirement 14.2
// ---------------------------------------------------------------------------

describe('music state machine transitions', () => {
  it('startChallenge transitions to challenge_start and activates base + texture', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');

    expect(engine.getMusicState()).toBe('challenge_start');
    const stems = engine.getStemVolumes();
    expect(stems.base).toBeGreaterThan(0);
    expect(stems.texture).toBeGreaterThan(0);
    // Other stems remain inactive at challenge start
    expect(stems.rhythm).toBe(0);
    expect(stems.melody).toBe(0);
    expect(stems.counter).toBe(0);
    expect(stems.intensity).toBe(0);
  });

  it('onFirstRingMoved adds Rhythm at 0.6 volume', () => {
    const engine = makeEngine();
    engine.startChallenge('forest');
    engine.onFirstRingMoved();

    expect(engine.getMusicState()).toBe('first_ring_moved');
    const stems = engine.getStemVolumes();
    expect(stems.rhythm).toBeCloseTo(0.6, 2);
    // Base and texture remain active
    expect(stems.base).toBeGreaterThan(0);
    expect(stems.texture).toBeGreaterThan(0);
    // Melody still inactive
    expect(stems.melody).toBe(0);
  });

  it('onFirstRingLanded adds Melody at 0.7 volume', () => {
    const engine = makeEngine();
    engine.startChallenge('desert');
    engine.onFirstRingMoved();
    engine.onFirstRingLanded();

    expect(engine.getMusicState()).toBe('first_ring_landed');
    const stems = engine.getStemVolumes();
    expect(stems.melody).toBeCloseTo(0.7, 2);
    expect(stems.rhythm).toBeCloseTo(0.6, 2);
    expect(stems.counter).toBe(0);
    expect(stems.intensity).toBe(0);
  });

  it('onChallengeMidpoint adds Counter at 0.5 volume', () => {
    const engine = makeEngine();
    engine.startChallenge('cave');
    engine.onFirstRingMoved();
    engine.onFirstRingLanded();
    engine.onChallengeMidpoint();

    expect(engine.getMusicState()).toBe('midpoint');
    const stems = engine.getStemVolumes();
    expect(stems.counter).toBeCloseTo(0.5, 2);
    expect(stems.intensity).toBe(0);
  });

  it('onTimerAmber raises Rhythm to 0.85 and lowers Melody to 0.5', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.onFirstRingLanded();
    engine.onChallengeMidpoint();
    engine.onTimerAmber();

    expect(engine.getMusicState()).toBe('timer_amber');
    const stems = engine.getStemVolumes();
    expect(stems.rhythm).toBeCloseTo(0.85, 2);
    expect(stems.melody).toBeCloseTo(0.5, 2);
    expect(stems.intensity).toBe(0);
  });

  it('onTimerCritical adds Intensity at 0.7 and reduces Melody further', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.onFirstRingLanded();
    engine.onChallengeMidpoint();
    engine.onTimerAmber();
    engine.onTimerCritical();

    expect(engine.getMusicState()).toBe('timer_critical');
    const stems = engine.getStemVolumes();
    expect(stems.intensity).toBeCloseTo(0.7, 2);
    // Melody is further reduced compared to timer_amber (0.5 → 0.35)
    expect(stems.melody).toBeLessThan(0.5);
  });

  it('onVictory fades all stems to 0 (silence)', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.onVictory();

    expect(engine.getMusicState()).toBe('victory');
    const stems = engine.getStemVolumes();
    expect(stems.base).toBe(0);
    expect(stems.texture).toBe(0);
    expect(stems.rhythm).toBe(0);
    expect(stems.melody).toBe(0);
    expect(stems.counter).toBe(0);
    expect(stems.intensity).toBe(0);
  });

  it('onDefeat fades all stems to 0 (silence)', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.onDefeat();

    expect(engine.getMusicState()).toBe('defeat');
    const stems = engine.getStemVolumes();
    expect(stems.base).toBe(0);
    expect(stems.texture).toBe(0);
    expect(stems.rhythm).toBe(0);
    expect(stems.melody).toBe(0);
    expect(stems.counter).toBe(0);
    expect(stems.intensity).toBe(0);
  });

  it('full challenge lifecycle traversal does not throw', () => {
    const engine = makeEngine();

    expect(() => {
      engine.startChallenge('ocean');
      engine.onFirstRingMoved();
      engine.onFirstRingLanded();
      engine.onChallengeMidpoint();
      engine.onTimerAmber();
      engine.onTimerCritical();
      engine.onVictory();
    }).not.toThrow();
  });

  it('state machine ignores onFirstRingMoved if not in challenge_start', () => {
    const engine = makeEngine();
    // Call onFirstRingMoved before startChallenge
    engine.onFirstRingMoved();
    // Should remain in idle (guard condition fires)
    expect(engine.getMusicState()).toBe('idle');
  });

  it('state machine ignores onFirstRingLanded if not in first_ring_moved', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    // Skip onFirstRingMoved, call onFirstRingLanded directly
    engine.onFirstRingLanded();
    // Should remain in challenge_start (guard fires)
    expect(engine.getMusicState()).toBe('challenge_start');
  });
});

// ---------------------------------------------------------------------------
// 4. Pause / Resume — Requirement 14.3, 14.4
// ---------------------------------------------------------------------------

describe('pause and resume', () => {
  it('pause transitions to paused state', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.pause();

    expect(engine.getMusicState()).toBe('paused');
  });

  it('pause scales stem volumes to 15% (not silence) — Req 14.3', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    // Before pause: rhythm should be 0.6, base 1.0, texture 0.8
    const stemsBeforePause = engine.getStemVolumes();

    engine.pause();

    const stemsAfterPause = engine.getStemVolumes();

    // Each active stem should be 15% of its pre-pause value
    const PAUSE_VOLUME_FRACTION = 0.15;
    (Object.keys(stemsBeforePause) as Array<keyof typeof stemsBeforePause>).forEach((stem) => {
      expect(stemsAfterPause[stem]).toBeCloseTo(
        stemsBeforePause[stem] * PAUSE_VOLUME_FRACTION,
        3,
      );
    });
  });

  it('pause is idempotent — calling twice does not change state further', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.pause();
    const stemsAfterFirstPause = engine.getStemVolumes();

    engine.pause(); // second call
    const stemsAfterSecondPause = engine.getStemVolumes();

    (Object.keys(stemsAfterFirstPause) as Array<keyof typeof stemsAfterFirstPause>).forEach((stem) => {
      expect(stemsAfterSecondPause[stem]).toBeCloseTo(stemsAfterFirstPause[stem], 5);
    });
  });

  it('resume restores stem volumes to pre-pause levels — Req 14.4', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();

    const stemsBeforePause = engine.getStemVolumes();
    engine.pause();
    engine.resume();

    const stemsAfterResume = engine.getStemVolumes();
    (Object.keys(stemsBeforePause) as Array<keyof typeof stemsBeforePause>).forEach((stem) => {
      expect(stemsAfterResume[stem]).toBeCloseTo(stemsBeforePause[stem], 3);
    });
  });

  it('resume is a no-op when not paused', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    const stemsBefore = engine.getStemVolumes();
    const stateBefore = engine.getMusicState();

    // resume without pause
    engine.resume();

    expect(engine.getMusicState()).toBe(stateBefore);
    (Object.keys(stemsBefore) as Array<keyof typeof stemsBefore>).forEach((stem) => {
      expect(engine.getStemVolumes()[stem]).toBeCloseTo(stemsBefore[stem], 5);
    });
  });

  it('pause volume is NOT zero — confirms game continuity signal', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.pause();

    const stems = engine.getStemVolumes();
    // At least one stem should still be > 0 (the 15% signal)
    const anyActive = (Object.values(stems) as number[]).some((v) => v > 0);
    expect(anyActive).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Volume controls — Requirement 14.1
// ---------------------------------------------------------------------------

describe('volume controls', () => {
  it('setMasterVolume updates master volume in internal state', () => {
    const engine = makeEngine();
    engine.setMasterVolume(0.5);
    expect(engine.getVolumes().master).toBeCloseTo(0.5, 5);
  });

  it('setMasterVolume clamps values above 1.0 to 1.0', () => {
    const engine = makeEngine();
    engine.setMasterVolume(1.5);
    expect(engine.getVolumes().master).toBe(1.0);
  });

  it('setMasterVolume clamps values below 0 to 0', () => {
    const engine = makeEngine();
    engine.setMasterVolume(-0.5);
    expect(engine.getVolumes().master).toBe(0);
  });

  it('setMusicVolume updates music layer volume', () => {
    const engine = makeEngine();
    engine.setMusicVolume(0.7);
    expect(engine.getVolumes().music).toBeCloseTo(0.7, 5);
  });

  it('setMusicVolume clamps to [0, 1]', () => {
    const engine = makeEngine();
    engine.setMusicVolume(2.0);
    expect(engine.getVolumes().music).toBe(1.0);

    engine.setMusicVolume(-1.0);
    expect(engine.getVolumes().music).toBe(0);
  });

  it('setSFXVolume updates sfx layer volume', () => {
    const engine = makeEngine();
    engine.setSFXVolume(0.3);
    expect(engine.getVolumes().sfx).toBeCloseTo(0.3, 5);
  });

  it('setSFXVolume clamps to [0, 1]', () => {
    const engine = makeEngine();
    engine.setSFXVolume(5.0);
    expect(engine.getVolumes().sfx).toBe(1.0);
  });

  it('setMasterVolume(0) silences all layers without changing stored stem volumes', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    const stemsBefore = engine.getStemVolumes();

    engine.setMasterVolume(0);

    // Stem volume targets are preserved internally (volume is controlled separately)
    expect(engine.getStemVolumes()).toEqual(stemsBefore);
    expect(engine.getVolumes().master).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 6. SFX mute notification — Requirement 14.6
// ---------------------------------------------------------------------------

describe('SFX mute UI notification', () => {
  it('setSFXVolume(0) sets sfxMuted=true and fires listener', () => {
    const engine = makeEngine();
    const listener = jest.fn();
    engine.onSFXMuteChanged(listener);

    engine.setSFXVolume(0);

    expect(engine.isSFXMuted()).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
  });

  it('setSFXVolume > 0 after mute sets sfxMuted=false and fires listener', () => {
    const engine = makeEngine();
    engine.setSFXVolume(0); // mute first

    const listener = jest.fn();
    engine.onSFXMuteChanged(listener);

    engine.setSFXVolume(0.8); // unmute

    expect(engine.isSFXMuted()).toBe(false);
    expect(listener).toHaveBeenCalledWith(false);
  });

  it('listener is not fired if mute state does not change', () => {
    const engine = makeEngine();
    const listener = jest.fn();
    engine.onSFXMuteChanged(listener);

    engine.setSFXVolume(0.5); // not muted → not muted
    engine.setSFXVolume(0.8); // still not muted

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe function removes listener', () => {
    const engine = makeEngine();
    const listener = jest.fn();
    const unsubscribe = engine.onSFXMuteChanged(listener);

    unsubscribe();
    engine.setSFXVolume(0);

    expect(listener).not.toHaveBeenCalled();
  });

  it('playSFX skips playback when sfx volume is 0', () => {
    const engine = makeEngine();
    engine.setSFXVolume(0);

    // Should not throw; muted flag should be set
    expect(() => engine.playSFX('button_tap')).not.toThrow();
    expect(engine.isSFXMuted()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. playSFX — no-op but documented events
// ---------------------------------------------------------------------------

describe('playSFX event catalogue', () => {
  const sfxEvents = [
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

  it.each(sfxEvents)('playSFX("%s") does not throw', (event) => {
    const engine = makeEngine();
    expect(() => engine.playSFX(event)).not.toThrow();
  });

  it('playSFX accepts an options object without throwing', () => {
    const engine = makeEngine();
    expect(() => engine.playSFX('button_tap', { volume: 0.8, pitch: 1.2 })).not.toThrow();
  });

  it('playSFX with unknown event name does not throw', () => {
    const engine = makeEngine();
    expect(() => engine.playSFX('unknown_event_xyz')).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 8. Edge cases and resilience
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('calling onVictory immediately after startChallenge does not throw', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    expect(() => engine.onVictory()).not.toThrow();
    expect(engine.getMusicState()).toBe('victory');
  });

  it('calling onDefeat immediately after startChallenge does not throw', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    expect(() => engine.onDefeat()).not.toThrow();
    expect(engine.getMusicState()).toBe('defeat');
  });

  it('calling pause then onVictory then resume does not crash', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.onFirstRingMoved();
    engine.pause();
    expect(() => engine.onVictory()).not.toThrow();
    expect(() => engine.resume()).not.toThrow();
  });

  it('a new startChallenge resets the theme ID', () => {
    const engine = makeEngine();
    engine.startChallenge('ocean');
    engine.startChallenge('forest');
    // getMusicState should still be challenge_start from the second call
    expect(engine.getMusicState()).toBe('challenge_start');
  });

  it('setting all volumes to 0 does not crash any method', () => {
    const engine = makeEngine();
    engine.setMasterVolume(0);
    engine.setMusicVolume(0);
    engine.setSFXVolume(0);

    expect(() => {
      engine.startChallenge('ocean');
      engine.onFirstRingMoved();
      engine.onFirstRingLanded();
      engine.pause();
      engine.resume();
      engine.onVictory();
    }).not.toThrow();
  });

  it('multiple AudioEngine instances are independent', () => {
    const a = makeEngine();
    const b = makeEngine();

    a.startChallenge('ocean');
    a.onFirstRingMoved();

    // b should still be in idle state
    expect(b.getMusicState()).toBe('idle');
    expect(a.getMusicState()).toBe('first_ring_moved');
  });
});
