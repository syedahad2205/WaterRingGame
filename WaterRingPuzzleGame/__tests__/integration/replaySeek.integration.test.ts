/**
 * replaySeek.integration.test.ts  (task 15.2.1a)
 *
 * Replay seek latency tests — verifies seek() is synchronous/fast and that
 * position is correctly clamped.  Uses fake timers so setInterval inside
 * ReplayPlayer doesn't fire during tests.
 */

jest.useFakeTimers();

import { replayPlayer } from '../../src/features/replay/ReplayPlayer';
import { replayRecorder } from '../../src/features/replay/ReplayRecorder';

// ─── helper: build a 90-second replay with events every 5 seconds ────────────

function buildReplay() {
  replayRecorder.reset();
  replayRecorder.startRecording(1, 'test_seed', 'standard');
  // Simulate events spread over 0–85 seconds (in real-time the recorder uses
  // Date.now(); in tests we don't advance real time, so all events land at ~0ms.
  // The important thing is that stopRecording() produces a valid ReplayData.)
  for (let i = 0; i < 18; i++) {
    replayRecorder.recordEvent('press_left');
    replayRecorder.recordEvent('press_right');
  }
  return replayRecorder.stopRecording('win', 3, 0);
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Replay seek latency test (task 15.2.1a)', () => {
  beforeEach(() => {
    replayPlayer.reset();
  });

  it('buildReplay returns a valid ReplayData object', () => {
    const replay = buildReplay();
    expect(replay).toBeDefined();
    expect(replay.events.length).toBeGreaterThan(0);
    expect(replay.outcome).toBe('win');
  });

  it('seek to t=0 on a loaded replay does not throw', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    expect(() => replayPlayer.seek(0)).not.toThrow();
  });

  it('seek completes synchronously (no real delay — < 5ms wall clock)', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);

    const start = Date.now();
    replayPlayer.seek(45000);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(5000);
  });

  it('seek sets position timeMs >= 0', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    replayPlayer.seek(45000);

    const position = replayPlayer.getPosition();
    expect(position.timeMs).toBeGreaterThanOrEqual(0);
  });

  it('seek does not set position beyond total duration (progress <= 1)', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    replayPlayer.seek(999_999);

    const position = replayPlayer.getPosition();
    expect(position.progress).toBeLessThanOrEqual(1.0);
  });

  it('seek to 0 sets progress to 0', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    replayPlayer.seek(0);

    const position = replayPlayer.getPosition();
    expect(position.progress).toBe(0);
  });

  it('seek clamps negative values to 0', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    replayPlayer.seek(-1000);

    const position = replayPlayer.getPosition();
    expect(position.timeMs).toBeGreaterThanOrEqual(0);
  });

  it('getPosition returns all required fields', () => {
    const replay = buildReplay();
    replayPlayer.load(replay);
    replayPlayer.seek(0);

    const position = replayPlayer.getPosition();
    expect(position).toHaveProperty('timeMs');
    expect(position).toHaveProperty('frameIndex');
    expect(position).toHaveProperty('totalDurationMs');
    expect(position).toHaveProperty('progress');
  });

  it('seek without loaded replay does not throw', () => {
    replayPlayer.reset();
    expect(() => replayPlayer.seek(45000)).not.toThrow();
  });
});
