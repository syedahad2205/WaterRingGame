/**
 * ReplayPlayer — full implementation (Epic 15)
 *
 * Drives replay playback at configurable speeds, fires event callbacks as the
 * virtual timeline advances, and supports seeking and step navigation.
 */

import type { ReplayData, ReplayEvent } from './ReplayRecorder';

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'ended';

export interface PlaybackPosition {
  timeMs: number;
  frameIndex: number;
  totalDurationMs: number;
  /** 0–1 progress through the replay. */
  progress: number;
}

export interface PlaybackCallbacks {
  onEvent?: (event: ReplayEvent, timeMs: number) => void;
  onPositionUpdate?: (pos: PlaybackPosition) => void;
  onEnd?: () => void;
}

// Tick interval in real milliseconds (20 ms ≈ 50 fps).
const TICK_INTERVAL_MS = 20;

// ---------------------------------------------------------------------------
// ReplayPlayer
// ---------------------------------------------------------------------------

export class ReplayPlayer {
  private replay: ReplayData | null = null;
  private state: PlaybackState = 'idle';
  private currentTimeMs = 0;
  private speed = 1;
  private intervalRef: ReturnType<typeof setInterval> | null = null;
  private callbacks: PlaybackCallbacks = {};
  private nextEventIndex = 0;
  private _isGhostMode = false;

  readonly VALID_SPEEDS = [0.25, 0.5, 1, 1.5, 2, 4] as const;

  // -------------------------------------------------------------------------
  // load
  // -------------------------------------------------------------------------

  load(replay: ReplayData, callbacks?: PlaybackCallbacks): void {
    this.reset();
    this.replay = replay;
    this.callbacks = callbacks ?? {};
    this.state = 'idle';
    this.currentTimeMs = 0;
    this.nextEventIndex = 0;
  }

  // -------------------------------------------------------------------------
  // play
  // -------------------------------------------------------------------------

  play(): void {
    if (!this.replay) {
      console.warn('[ReplayPlayer] No replay loaded.');
      return;
    }
    if (this.state === 'ended') {
      this.seek(0);
    }
    if (this.state === 'playing') return;

    this.state = 'playing';
    this._startTicker();
  }

  // -------------------------------------------------------------------------
  // pause
  // -------------------------------------------------------------------------

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this._stopTicker();
    this._emitPosition();
  }

  // -------------------------------------------------------------------------
  // seek
  // -------------------------------------------------------------------------

  seek(targetMs: number): void {
    if (!this.replay) return;

    const clamped = Math.max(0, Math.min(targetMs, this.replay.durationMs));
    this.currentTimeMs = clamped;

    // Reset event cursor to the first event at or after targetMs
    this.nextEventIndex = this.replay.events.findIndex((e) => e.timeMs >= clamped);
    if (this.nextEventIndex === -1) {
      this.nextEventIndex = this.replay.events.length;
    }

    if (this.state === 'ended' && clamped < this.replay.durationMs) {
      this.state = 'paused';
    }

    this._emitPosition();
  }

  // -------------------------------------------------------------------------
  // setSpeed
  // -------------------------------------------------------------------------

  setSpeed(speed: number): void {
    // Clamp to the nearest valid speed
    let closest: number = this.VALID_SPEEDS[0];
    let minDiff = Math.abs(speed - closest);

    for (const s of this.VALID_SPEEDS) {
      const diff = Math.abs(speed - s);
      if (diff < minDiff) {
        minDiff = diff;
        closest = s;
      }
    }

    this.speed = closest;

    // Restart ticker with new speed if currently playing
    if (this.state === 'playing') {
      this._stopTicker();
      this._startTicker();
    }
  }

  // -------------------------------------------------------------------------
  // stepForward
  // -------------------------------------------------------------------------

  stepForward(stepMs = 500): void {
    if (!this.replay) return;
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) this._stopTicker();

    this.seek(this.currentTimeMs + stepMs);

    if (wasPlaying) this._startTicker();
  }

  // -------------------------------------------------------------------------
  // stepBackward
  // -------------------------------------------------------------------------

  stepBackward(stepMs = 500): void {
    if (!this.replay) return;
    const wasPlaying = this.state === 'playing';
    if (wasPlaying) this._stopTicker();

    this.seek(this.currentTimeMs - stepMs);

    if (wasPlaying) this._startTicker();
  }

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  reset(): void {
    this._stopTicker();
    this.replay = null;
    this.state = 'idle';
    this.currentTimeMs = 0;
    this.speed = 1;
    this.callbacks = {};
    this.nextEventIndex = 0;
    this._isGhostMode = false;
  }

  // -------------------------------------------------------------------------
  // getState / getPosition
  // -------------------------------------------------------------------------

  getState(): PlaybackState {
    return this.state;
  }

  getPosition(): PlaybackPosition {
    const totalDurationMs = this.replay?.durationMs ?? 0;
    const progress = totalDurationMs > 0 ? this.currentTimeMs / totalDurationMs : 0;
    return {
      timeMs: this.currentTimeMs,
      frameIndex: this.nextEventIndex,
      totalDurationMs,
      progress: Math.min(1, Math.max(0, progress)),
    };
  }

  // -------------------------------------------------------------------------
  // Ghost mode
  // -------------------------------------------------------------------------

  isGhostMode(): boolean {
    return this._isGhostMode;
  }

  setGhostMode(enabled: boolean): void {
    this._isGhostMode = enabled;
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private _startTicker(): void {
    if (this.intervalRef !== null) return;

    this.intervalRef = setInterval(() => {
      this._tick();
    }, TICK_INTERVAL_MS);
  }

  private _stopTicker(): void {
    if (this.intervalRef !== null) {
      clearInterval(this.intervalRef);
      this.intervalRef = null;
    }
  }

  private _tick(): void {
    if (!this.replay || this.state !== 'playing') return;

    // Advance virtual time by (tickInterval * speed)
    const virtualAdvance = TICK_INTERVAL_MS * this.speed;
    this.currentTimeMs = Math.min(
      this.currentTimeMs + virtualAdvance,
      this.replay.durationMs,
    );

    // Fire any events whose timeMs has been passed
    while (
      this.nextEventIndex < this.replay.events.length &&
      this.replay.events[this.nextEventIndex].timeMs <= this.currentTimeMs
    ) {
      const event = this.replay.events[this.nextEventIndex];
      this.callbacks.onEvent?.(event, this.currentTimeMs);
      this.nextEventIndex++;
    }

    this._emitPosition();

    // Check for end
    if (this.currentTimeMs >= this.replay.durationMs) {
      this.state = 'ended';
      this._stopTicker();
      this.callbacks.onEnd?.();
    }
  }

  private _emitPosition(): void {
    if (this.callbacks.onPositionUpdate) {
      this.callbacks.onPositionUpdate(this.getPosition());
    }
  }
}

export const replayPlayer = new ReplayPlayer();
