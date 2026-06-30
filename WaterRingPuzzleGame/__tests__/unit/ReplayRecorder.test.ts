import {
  replayRecorder,
  ReplayRecorder,
} from '../../src/features/replay/ReplayRecorder';

describe('ReplayRecorder', () => {
  let recorder: ReplayRecorder;

  beforeEach(() => {
    recorder = new ReplayRecorder();
  });

  it('replayRecorder singleton is exported', () => {
    expect(replayRecorder).not.toBeNull();
    expect(replayRecorder).toBeInstanceOf(ReplayRecorder);
  });

  it('isRecording() is false initially', () => {
    expect(recorder.isRecording()).toBe(false);
  });

  it('startRecording sets isRecording() to true', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    expect(recorder.isRecording()).toBe(true);
  });

  it('recordEvent does not throw while recording', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    expect(() => recorder.recordEvent('press_left')).not.toThrow();
  });

  it('recorded events have timeMs >= 0', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    recorder.recordEvent('press_left');
    const data = recorder.stopRecording('win', 3, 0);
    for (const event of data.events) {
      expect(event.timeMs).toBeGreaterThanOrEqual(0);
    }
  });

  it('stopRecording returns ReplayData with correct fields', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    const data = recorder.stopRecording('win', 3, 0);
    expect(data).toMatchObject({
      challengeNumber: 14,
      seed: 'seed_abc',
      templateId: 'standard',
      outcome: 'win',
      starsEarned: 3,
      continuesUsed: 0,
    });
  });

  it('ReplayData.version = 1', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    const data = recorder.stopRecording('win', 3, 0);
    expect(data.version).toBe(1);
  });

  it('ReplayData.events contains at least 2 events (challenge_start + challenge_end)', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    const data = recorder.stopRecording('win', 3, 0);
    expect(data.events.length).toBeGreaterThanOrEqual(2);
    const types = data.events.map((e) => e.type);
    expect(types).toContain('challenge_start');
    expect(types).toContain('challenge_end');
  });

  it('ReplayData.challengeNumber matches the one passed to startRecording', () => {
    recorder.startRecording(42, 'seed_xyz', 'hard');
    const data = recorder.stopRecording('loss', 0, 1);
    expect(data.challengeNumber).toBe(42);
  });

  it('estimateSizeBytes() = events.length * 20', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    recorder.recordEvent('press_left');
    recorder.recordEvent('press_right');
    // 1 start event + 2 user events = 3 events before stop
    const estimate = recorder.estimateSizeBytes();
    expect(estimate).toBe(recorder['events'].length * 20);
  });

  it('reset() clears state; isRecording() = false after reset', () => {
    recorder.startRecording(14, 'seed_abc', 'standard');
    recorder.reset();
    expect(recorder.isRecording()).toBe(false);
  });

  it('recording event while not recording does not throw', () => {
    expect(() => recorder.recordEvent('press_left')).not.toThrow();
  });
});
