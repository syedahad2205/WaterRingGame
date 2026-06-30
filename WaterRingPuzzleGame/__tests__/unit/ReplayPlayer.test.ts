import {
  replayPlayer,
  ReplayPlayer,
} from '../../src/features/replay/ReplayPlayer';
import type { ReplayData } from '../../src/features/replay/ReplayRecorder';

function makeReplay(durationMs = 10000): ReplayData {
  return {
    version: 1,
    challengeNumber: 5,
    seed: 'seed-player',
    templateId: 'standard',
    durationMs,
    events: [
      { type: 'challenge_start', timeMs: 0 },
      { type: 'press_left', timeMs: 3000 },
      { type: 'challenge_end', timeMs: durationMs },
    ],
    outcome: 'win',
    starsEarned: 3,
    continuesUsed: 0,
  };
}

describe('ReplayPlayer', () => {
  let player: ReplayPlayer;

  beforeEach(() => {
    jest.useFakeTimers();
    player = new ReplayPlayer();
  });

  afterEach(() => {
    player.reset();
    jest.useRealTimers();
  });

  it('replayPlayer singleton is exported', () => {
    expect(replayPlayer).not.toBeNull();
    expect(replayPlayer).toBeInstanceOf(ReplayPlayer);
  });

  it('initial getState() = "idle"', () => {
    expect(player.getState()).toBe('idle');
  });

  it('load sets state to "idle" (ready to play)', () => {
    player.load(makeReplay());
    expect(player.getState()).toBe('idle');
  });

  it('play() after load sets state to "playing"', () => {
    player.load(makeReplay());
    player.play();
    expect(player.getState()).toBe('playing');
  });

  it('pause() after play sets state to "paused"', () => {
    player.load(makeReplay());
    player.play();
    player.pause();
    expect(player.getState()).toBe('paused');
  });

  it('reset() sets state back to "idle" and position to 0', () => {
    player.load(makeReplay());
    player.play();
    player.reset();
    expect(player.getState()).toBe('idle');
    expect(player.getPosition().timeMs).toBe(0);
  });

  it('setSpeed(2) — valid speed, does not throw', () => {
    player.load(makeReplay());
    expect(() => player.setSpeed(2)).not.toThrow();
  });

  it('setSpeed(999) — invalid speed, clamps to nearest valid (no throw)', () => {
    player.load(makeReplay());
    expect(() => player.setSpeed(999)).not.toThrow();
  });

  it('VALID_SPEEDS includes 0.25, 0.5, 1, 1.5, 2, 4', () => {
    const speeds = [...player.VALID_SPEEDS];
    expect(speeds).toContain(0.25);
    expect(speeds).toContain(0.5);
    expect(speeds).toContain(1);
    expect(speeds).toContain(1.5);
    expect(speeds).toContain(2);
    expect(speeds).toContain(4);
  });

  it('getPosition().progress is between 0 and 1', () => {
    player.load(makeReplay());
    const { progress } = player.getPosition();
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('getPosition().totalDurationMs matches replay durationMs', () => {
    player.load(makeReplay(8000));
    expect(player.getPosition().totalDurationMs).toBe(8000);
  });

  it('isGhostMode() starts false', () => {
    expect(player.isGhostMode()).toBe(false);
  });

  it('setGhostMode(true) → isGhostMode() = true', () => {
    player.setGhostMode(true);
    expect(player.isGhostMode()).toBe(true);
  });

  it('seek(5000) after load sets position.timeMs ≈ 5000', () => {
    player.load(makeReplay(10000));
    player.seek(5000);
    expect(player.getPosition().timeMs).toBe(5000);
  });
});
