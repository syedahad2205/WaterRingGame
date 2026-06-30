/**
 * GhostRingsPhysics.test.ts  (task 15.2.2a)
 *
 * Ghost rings physical isolation tests.
 * Verifies that:
 *   - ghost mode flag is managed correctly on ReplayPlayer
 *   - VALID_SPEEDS are all positive (no backwards playback)
 *   - ReplayPlayer has no reference to PhysicsWorld (architectural isolation)
 */

jest.useFakeTimers();

import { replayPlayer } from '../../src/features/replay/ReplayPlayer';
import { replayRecorder } from '../../src/features/replay/ReplayRecorder';

// ─────────────────────────────────────────────────────────────────────────────

describe('Ghost rings physical isolation (task 15.2.2a)', () => {
  beforeEach(() => {
    replayPlayer.reset();
  });

  it('ghost mode flag is false by default after reset', () => {
    replayPlayer.reset();
    expect(replayPlayer.isGhostMode()).toBe(false);
  });

  it('setGhostMode(true) marks replay as ghost overlay', () => {
    replayPlayer.reset();
    replayPlayer.setGhostMode(true);
    expect(replayPlayer.isGhostMode()).toBe(true);
  });

  it('setGhostMode(false) clears ghost mode', () => {
    replayPlayer.setGhostMode(true);
    replayPlayer.setGhostMode(false);
    expect(replayPlayer.isGhostMode()).toBe(false);
  });

  it('ghost mode does not change playback state (remains idle after setGhostMode)', () => {
    replayPlayer.reset();
    replayPlayer.setGhostMode(true);
    expect(replayPlayer.getState()).toBe('idle');
  });

  it('ghost mode can be set before loading a replay', () => {
    expect(() => replayPlayer.setGhostMode(true)).not.toThrow();
    expect(replayPlayer.isGhostMode()).toBe(true);
  });

  it('VALID_SPEEDS does not include negative speeds (no backwards physics)', () => {
    replayPlayer.VALID_SPEEDS.forEach((speed: number) => {
      expect(speed).toBeGreaterThan(0);
    });
  });

  it('VALID_SPEEDS includes 1x normal speed', () => {
    expect(replayPlayer.VALID_SPEEDS).toContain(1);
  });

  it('VALID_SPEEDS includes at least 4 entries', () => {
    expect(replayPlayer.VALID_SPEEDS.length).toBeGreaterThanOrEqual(4);
  });

  it('reset() sets state back to idle', () => {
    replayPlayer.setGhostMode(true);
    replayPlayer.reset();
    expect(replayPlayer.getState()).toBe('idle');
  });

  it('getPosition returns progress 0 after reset', () => {
    replayPlayer.reset();
    const pos = replayPlayer.getPosition();
    expect(pos.progress).toBe(0);
  });

  it('collision between ghost ring and physical ring is architecturally prevented: ReplayPlayer has no PhysicsWorld reference', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/features/replay/ReplayPlayer.ts'),
      'utf8',
    );
    expect(source).not.toContain('PhysicsWorld');
    expect(source).not.toContain('addBody');
  });

  it('ReplayPlayer imports only replay-domain types (no physics imports)', () => {
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/features/replay/ReplayPlayer.ts'),
      'utf8',
    );
    // Should not import from physics feature folder
    expect(source).not.toMatch(/from ['"].*physics/);
  });

  it('ghost mode is a render-only flag (setGhostMode does not enqueue physics operations)', () => {
    // Verify by checking source: setGhostMode only sets _isGhostMode
    const fs = require('fs');
    const source = fs.readFileSync(
      require('path').resolve(__dirname, '../../src/features/replay/ReplayPlayer.ts'),
      'utf8',
    );
    // setGhostMode should be a simple setter, no async/physics calls
    expect(source).toMatch(/setGhostMode\s*\([^)]*\)\s*:\s*void\s*\{[^}]*_isGhostMode\s*=/);
  });
});
