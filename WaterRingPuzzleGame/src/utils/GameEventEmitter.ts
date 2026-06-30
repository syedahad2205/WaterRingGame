/**
 * GameEventEmitter — typed event bus for the Water Ring Puzzle Game.
 *
 * All 9 game event types are expressed as a TypeScript discriminated union
 * (GameEvent). The emitter is exported as a singleton so Analytics, Audio,
 * and Haptic services share a single passive observer bus without ever calling
 * back into game systems.
 *
 * Requirements: 3.1, 3.3
 */

// ---------------------------------------------------------------------------
// InputEventType
// ---------------------------------------------------------------------------

export type InputEventType =
  | 'tap_left'
  | 'tap_right'
  | 'hold_left'
  | 'hold_right'
  | 'hold_left_peak'
  | 'hold_right_peak'
  | 'rapid_tap'
  | 'simultaneous_press'
  | 'alternating_tap';

// ---------------------------------------------------------------------------
// Individual event payload types
// ---------------------------------------------------------------------------

export interface InputProcessedPayload {
  type: InputEventType;
  timestamp: number;
  intensity?: number;
}

export interface PhysicsSteppedPayload {
  dt: number;
  tickNumber: number;
}

export interface WinConditionMetPayload {
  challengeNumber: number;
  timeRemaining: number;
}

export interface TimerExpiredPayload {
  challengeNumber: number;
}

export interface RingSettledPayload {
  ringId: string;
  pegId: string;
  challengeNumber: number;
}

export interface RingNearPegPayload {
  ringId: string;
  pegId: string;
  distance: number;
}

export interface RingCollisionPayload {
  ringIdA: string;
  ringIdB: string;
  speed: number;
}

export interface ObstacleCollisionPayload {
  ringId: string;
  obstacleId: string;
  speed: number;
}

export interface AssistTriggeredPayload {
  assistType: string;
  challengeNumber: number;
}

// ---------------------------------------------------------------------------
// Discriminated union of all 9 game events
// ---------------------------------------------------------------------------

export type GameEvent =
  | { event: 'input_processed'; payload: InputProcessedPayload }
  | { event: 'physics_stepped'; payload: PhysicsSteppedPayload }
  | { event: 'win_condition_met'; payload: WinConditionMetPayload }
  | { event: 'timer_expired'; payload: TimerExpiredPayload }
  | { event: 'ring_settled'; payload: RingSettledPayload }
  | { event: 'ring_near_peg'; payload: RingNearPegPayload }
  | { event: 'ring_collision'; payload: RingCollisionPayload }
  | { event: 'obstacle_collision'; payload: ObstacleCollisionPayload }
  | { event: 'assist_triggered'; payload: AssistTriggeredPayload };

export type GameEventName = GameEvent['event'];

/** Narrows the payload type for a given event name. */
export type PayloadFor<E extends GameEventName> = Extract<GameEvent, { event: E }>['payload'];

// ---------------------------------------------------------------------------
// Subscriber type
// ---------------------------------------------------------------------------

export type GameEventListener<E extends GameEventName> = (payload: PayloadFor<E>) => void;

/** Calling the returned function removes the subscription. */
export type Unsubscribe = () => void;

// ---------------------------------------------------------------------------
// GameEventEmitterClass
// ---------------------------------------------------------------------------

export class GameEventEmitterClass {
  // Use a Map keyed by event name; each entry holds a Set of listeners so that
  // duplicate-subscribe is naturally idempotent when the same function is used.
  private readonly _listeners: Map<GameEventName, Set<GameEventListener<GameEventName>>> =
    new Map();

  /**
   * Subscribe to a typed game event.
   *
   * @returns An unsubscribe function. Call it (e.g. in useEffect cleanup) to
   *          prevent memory leaks.
   */
  subscribe<E extends GameEventName>(
    eventName: E,
    listener: GameEventListener<E>,
  ): Unsubscribe {
    if (!this._listeners.has(eventName)) {
      this._listeners.set(eventName, new Set());
    }

    // The cast is safe: the Set is keyed by eventName and only receives
    // listeners typed for that specific event. We route through `unknown` to
    // satisfy TypeScript strict mode's overlap check.
    const set = this._listeners.get(eventName) as unknown as Set<GameEventListener<E>>;
    set.add(listener);

    return (): void => {
      set.delete(listener);
    };
  }

  /**
   * Dispatch a typed game event to all current subscribers.
   *
   * The method accepts the full discriminated union so callers must always
   * provide a correctly-typed payload that matches the event name.
   */
  dispatch<E extends GameEventName>(eventName: E, payload: PayloadFor<E>): void {
    const set = this._listeners.get(eventName);
    if (!set || set.size === 0) {
      return;
    }

    // Snapshot the set before iteration so subscribers can safely unsubscribe
    // from within their own handler without disrupting the current dispatch.
    // Route through `unknown` to satisfy strict overlap checks.
    const snapshot = Array.from(set) as unknown as Array<GameEventListener<E>>;
    for (const listener of snapshot) {
      listener(payload);
    }
  }

  /**
   * Manually unsubscribe a specific listener from an event.
   * Prefer the unsubscribe function returned by `subscribe` instead.
   */
  unsubscribe<E extends GameEventName>(
    eventName: E,
    listener: GameEventListener<E>,
  ): void {
    const set = this._listeners.get(eventName) as unknown as Set<GameEventListener<E>> | undefined;
    set?.delete(listener);
  }

  /**
   * Remove ALL listeners for every event type.
   * Call this when a game session ends to ensure a clean slate for the next.
   */
  removeAllListeners(): void {
    this._listeners.clear();
  }

  /** Returns the current subscriber count for a given event (useful for tests). */
  listenerCount(eventName: GameEventName): number {
    return this._listeners.get(eventName)?.size ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance — one per game session
// ---------------------------------------------------------------------------

/**
 * The singleton GameEventEmitter for the current game session.
 *
 * Analytics, Audio, and Haptic services MUST subscribe here as passive
 * observers and MUST NEVER call back into game systems from their handlers.
 * (Requirements 3.4, 3.5, 3.6)
 */
export const gameEventEmitter = new GameEventEmitterClass();
