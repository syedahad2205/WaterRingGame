/**
 * ReplayRecorder — full implementation (Epic 15)
 *
 * Records all input events during a challenge session and packages them into
 * a ReplayData snapshot that can be compressed and uploaded.
 */

export type ReplayEventType =
  | 'press_left'
  | 'press_right'
  | 'release_left'
  | 'release_right'
  | 'challenge_start'
  | 'challenge_end';

export interface ReplayEvent {
  type: ReplayEventType;
  /** Milliseconds since challenge start. */
  timeMs: number;
  metadata?: Record<string, unknown>;
}

export interface ReplayData {
  /** Schema version — bump when format changes. */
  version: number; // = 1
  challengeNumber: number;
  seed: string;
  templateId: string;
  durationMs: number;
  events: ReplayEvent[];
  outcome: 'win' | 'loss';
  starsEarned: 0 | 1 | 2 | 3;
  continuesUsed: number;
}

// Approximate bytes per serialised event (JSON overhead included).
const BYTES_PER_EVENT = 20;

// ---------------------------------------------------------------------------
// ReplayRecorder
// ---------------------------------------------------------------------------

export class ReplayRecorder {
  private events: ReplayEvent[] = [];
  private startTimeMs = 0;
  private recording = false;

  // Transient state set at startRecording() and cleared on reset()
  private _challengeNumber = 0;
  private _seed = '';
  private _templateId = '';

  // -------------------------------------------------------------------------
  // startRecording
  // -------------------------------------------------------------------------

  startRecording(challengeNumber: number, seed: string, templateId: string): void {
    if (this.recording) {
      if (__DEV__) console.warn('[ReplayRecorder] Already recording — call reset() first.');
      this.reset();
    }

    this._challengeNumber = challengeNumber;
    this._seed = seed;
    this._templateId = templateId;
    this.events = [];
    this.startTimeMs = Date.now();
    this.recording = true;

    // Synthetic start event
    this.events.push({ type: 'challenge_start', timeMs: 0 });
  }

  // -------------------------------------------------------------------------
  // recordEvent
  // -------------------------------------------------------------------------

  recordEvent(type: ReplayEventType, metadata?: Record<string, unknown>): void {
    if (!this.recording) {
      if (__DEV__) console.warn('[ReplayRecorder] Not recording — call startRecording() first.');
      return;
    }

    const timeMs = Date.now() - this.startTimeMs;
    const event: ReplayEvent = { type, timeMs };
    if (metadata && Object.keys(metadata).length > 0) {
      event.metadata = metadata;
    }
    this.events.push(event);
  }

  // -------------------------------------------------------------------------
  // stopRecording
  // -------------------------------------------------------------------------

  stopRecording(
    outcome: 'win' | 'loss',
    starsEarned: 0 | 1 | 2 | 3,
    continuesUsed: number,
  ): ReplayData {
    if (!this.recording) {
      throw new Error('[ReplayRecorder] Not recording.');
    }

    const durationMs = Date.now() - this.startTimeMs;
    this.recording = false;

    // Synthetic end event
    this.events.push({ type: 'challenge_end', timeMs: durationMs });

    const data: ReplayData = {
      version: 1,
      challengeNumber: this._challengeNumber,
      seed: this._seed,
      templateId: this._templateId,
      durationMs,
      events: [...this.events],
      outcome,
      starsEarned,
      continuesUsed,
    };

    return data;
  }

  // -------------------------------------------------------------------------
  // isRecording
  // -------------------------------------------------------------------------

  isRecording(): boolean {
    return this.recording;
  }

  // -------------------------------------------------------------------------
  // estimateSizeBytes
  // -------------------------------------------------------------------------

  estimateSizeBytes(): number {
    return this.events.length * BYTES_PER_EVENT;
  }

  // -------------------------------------------------------------------------
  // reset
  // -------------------------------------------------------------------------

  reset(): void {
    this.events = [];
    this.startTimeMs = 0;
    this.recording = false;
    this._challengeNumber = 0;
    this._seed = '';
    this._templateId = '';
  }
}

export const replayRecorder = new ReplayRecorder();
