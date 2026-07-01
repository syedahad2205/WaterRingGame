import { cloudFunctionsService } from '../firebase/CloudFunctionsService';

export type SyncState = 'idle' | 'syncing' | 'success' | 'failed' | 'offline';

export interface SyncOperation {
  id: string;
  type:
    | 'user_update'
    | 'score_submit'
    | 'coin_credit'
    | 'achievement_unlock'
    | 'replay_upload';
  payload: Record<string, unknown>;
  retryCount: number;
  createdAt: number;
}

export interface SyncStatus {
  state: SyncState;
  queueLength: number;
  lastSyncAt: number | null;
  error: string | null;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const FUNCTION_MAP: Record<SyncOperation['type'], string> = {
  user_update: 'updateUser',
  score_submit: 'submitScore',
  coin_credit: 'creditCoins',
  achievement_unlock: 'unlockAchievement',
  replay_upload: 'uploadReplayMeta',
};

/** Maximum queued operations before oldest are evicted. */
const MAX_QUEUE_SIZE = 100;

/** MMKV key for persisting the sync queue across app restarts. */
const SYNC_QUEUE_STORAGE_KEY = 'sync_manager_queue';

// ---------------------------------------------------------------------------
// Queue persistence helpers
// ---------------------------------------------------------------------------

/**
 * Persist the sync queue to MMKV so operations survive app crashes.
 * Uses a dynamic import to avoid a hard compile-time dependency on
 * the MMKVStorage module (keeps unit tests functional).
 */
function persistQueue(queue: SyncOperation[]): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { setItem } = require('../storage/MMKVStorage');
    setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // MMKV unavailable (e.g. Jest environment) — silently ignore.
  }
}

/**
 * Rehydrate the sync queue from MMKV after an app restart.
 */
function loadPersistedQueue(): SyncOperation[] {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getItem } = require('../storage/MMKVStorage');
    const raw = getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Basic shape validation on each entry.
    return parsed.filter(
      (op: unknown): op is SyncOperation =>
        typeof op === 'object' &&
        op !== null &&
        typeof (op as SyncOperation).id === 'string' &&
        typeof (op as SyncOperation).type === 'string' &&
        typeof (op as SyncOperation).retryCount === 'number',
    );
  } catch {
    return [];
  }
}

export class SyncManager {
  private state: SyncState = 'idle';
  private queue: SyncOperation[] = [];
  private lastSyncAt: number | null = null;
  private error: string | null = null;
  private isFlushing = false;

  readonly MAX_RETRY = 3;
  readonly SYNC_INTERVAL_MS = 30_000;

  /**
   * Rehydrate any operations that were queued before the last app exit/crash.
   * Call once at app startup.
   */
  rehydrate(): void {
    const persisted = loadPersistedQueue();
    if (persisted.length > 0) {
      this.queue = persisted;
      if (__DEV__) {
        console.log(`[SyncManager] Rehydrated ${persisted.length} queued operations.`);
      }
    }
  }

  enqueue(
    op: Omit<SyncOperation, 'id' | 'retryCount' | 'createdAt'>,
  ): void {
    // Guard: reject null/undefined/empty payloads to prevent corrupt sync ops.
    if (!op || !op.type || !op.payload || typeof op.payload !== 'object') {
      if (__DEV__) console.warn('[SyncManager] Rejected enqueue with invalid operation:', op);
      return;
    }

    const operation: SyncOperation = {
      ...op,
      id: generateId(),
      retryCount: 0,
      createdAt: Date.now(),
    };
    this.queue.push(operation);

    // Evict oldest operations if queue exceeds max size.
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(this.queue.length - MAX_QUEUE_SIZE);
    }

    // Persist to MMKV so the operation survives a crash.
    persistQueue(this.queue);

    if (this.state !== 'offline' && this.state !== 'syncing') {
      void this.flush();
    }
  }

  // eslint-disable-next-line max-lines-per-function
  async flush(): Promise<void> {
    // Double-flush guard: if already flushing, skip entirely.
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    this.state = 'syncing';
    this.error = null;

    // Snapshot the queue — new enqueue() calls during flush will be picked
    // up on the next flush cycle, not re-processed in this one.
    const toProcess = [...this.queue];
    let allSucceeded = true;

    for (const op of toProcess) {
      const fnName = FUNCTION_MAP[op.type] as Parameters<
        typeof cloudFunctionsService.call
      >[0];
      const result = await cloudFunctionsService.call(fnName, op.payload);

      if (result.success) {
        this.removeFromQueue(op.id);
      } else {
        allSucceeded = false;
        const idx = this.queue.findIndex(q => q.id === op.id);
        if (idx !== -1) {
          this.queue[idx] = {
            ...this.queue[idx],
            retryCount: this.queue[idx].retryCount + 1,
          };
          if (this.queue[idx].retryCount >= this.MAX_RETRY) {
            if (__DEV__) console.warn(
              `[SyncManager] Operation ${op.id} (${op.type}) exceeded MAX_RETRY. Dropping.`,
            );
            this.removeFromQueue(op.id);
          }
        }
        this.error = result.error ?? 'Unknown sync error';
      }
    }

    // Persist updated queue state after flush completes.
    persistQueue(this.queue);

    this.lastSyncAt = Date.now();
    this.state = allSucceeded ? 'success' : 'failed';
    this.isFlushing = false;

    // Return to idle after brief hold so callers can read state
    setTimeout(() => {
      if (this.state === 'success' || this.state === 'failed') {
        this.state = 'idle';
      }
    }, 2000);
  }

  startPeriodicSync(): () => void {
    const handle = setInterval(() => {
      if (this.state !== 'offline' && this.queue.length > 0) {
        void this.flush();
      }
    }, this.SYNC_INTERVAL_MS);
    return () => clearInterval(handle);
  }

  getStatus(): SyncStatus {
    return {
      state: this.state,
      queueLength: this.queue.length,
      lastSyncAt: this.lastSyncAt,
      error: this.error,
    };
  }

  onReconnect(): void {
    this.state = 'idle';
    void this.flush();
  }

  removeFromQueue(operationId: string): void {
    this.queue = this.queue.filter(op => op.id !== operationId);
  }
}

export const syncManager = new SyncManager();
