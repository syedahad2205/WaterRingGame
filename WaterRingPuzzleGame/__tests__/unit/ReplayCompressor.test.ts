import {
  replayCompressor,
  ReplayCompressor,
} from '../../src/features/replay/ReplayCompressor';
import { ReplayRecorder } from '../../src/features/replay/ReplayRecorder';
import type { ReplayData } from '../../src/features/replay/ReplayRecorder';

function makeFixture(): ReplayData {
  return {
    version: 1,
    challengeNumber: 7,
    seed: 'test-seed',
    templateId: 'standard',
    durationMs: 15000,
    events: [
      { type: 'challenge_start', timeMs: 0 },
      { type: 'press_left', timeMs: 2000 },
      { type: 'challenge_end', timeMs: 15000 },
    ],
    outcome: 'win',
    starsEarned: 2,
    continuesUsed: 0,
  };
}

describe('ReplayCompressor', () => {
  const fixture = makeFixture();

  it('replayCompressor is exported', () => {
    expect(replayCompressor).not.toBeNull();
    expect(replayCompressor).toBeInstanceOf(ReplayCompressor);
  });

  it('compress returns CompressedReplay with required fields', () => {
    const compressed = replayCompressor.compress(fixture);
    expect(compressed).toHaveProperty('version');
    expect(compressed).toHaveProperty('originalSizeBytes');
    expect(compressed).toHaveProperty('compressedSizeBytes');
    expect(compressed).toHaveProperty('data');
  });

  it('data field is a non-empty string', () => {
    const compressed = replayCompressor.compress(fixture);
    expect(typeof compressed.data).toBe('string');
    expect(compressed.data.length).toBeGreaterThan(0);
  });

  it('originalSizeBytes > 0', () => {
    const compressed = replayCompressor.compress(fixture);
    expect(compressed.originalSizeBytes).toBeGreaterThan(0);
  });

  it('compressedSizeBytes > 0', () => {
    const compressed = replayCompressor.compress(fixture);
    expect(compressed.compressedSizeBytes).toBeGreaterThan(0);
  });

  it('round-trip: decompress(compress(replayData)) equals original', () => {
    const compressed = replayCompressor.compress(fixture);
    const restored = replayCompressor.decompress(compressed);
    expect(restored).toEqual(fixture);
  });

  it('round-trip: events.length is preserved', () => {
    const compressed = replayCompressor.compress(fixture);
    const restored = replayCompressor.decompress(compressed);
    expect(restored.events.length).toBe(fixture.events.length);
  });

  it('round-trip: challengeNumber is preserved', () => {
    const compressed = replayCompressor.compress(fixture);
    const restored = replayCompressor.decompress(compressed);
    expect(restored.challengeNumber).toBe(fixture.challengeNumber);
  });

  it('estimateCompressionRatio(100) returns a number between 0.1 and 2.0', () => {
    const ratio = ReplayCompressor.estimateCompressionRatio(100);
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThanOrEqual(2.0);
  });

  it('compress version field is 1', () => {
    const compressed = replayCompressor.compress(fixture);
    expect(compressed.version).toBe(1);
  });

  it('decompress throws for unsupported version', () => {
    expect(() =>
      replayCompressor.decompress({ version: 99, data: 'x', originalSizeBytes: 1, compressedSizeBytes: 1, compressionRatio: 1 }),
    ).toThrow();
  });
});
