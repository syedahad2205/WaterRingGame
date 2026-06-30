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
  user_update: 'submitScore',
  score_submit: 'submitScore',
  coin_credit: 'creditCoins',
  achievement_unlock: 'submitScore',
  replay_upload: 'uploadReplayMeta',
};

export class SyncManager {
  private state: SyncState = 'idle';
  private queue: SyncOperation[] = [];
  private lastSyncAt: number | null = null;
  private error: string | null = null;
  private isFlushing = false;

  readonly MAX_RETRY = 3;
  readonly SYNC_INTERVAL_MS = 30_000;

  enqueue(
    op: Omit<SyncOperation, 'id' | 'retryCount' | 'createdAt'>,
  ): void {
    const operation: SyncOperation = {
      ...op,
      id: generateId(),
      retryCount: 0,
      createdAt: Date.now(),
    };
    this.queue.push(operation);
    if (this.state !== 'offline' && this.state !== 'syncing') {
      void this.flush();
    }
  }

  // eslint-disable-next-line max-lines-per-function
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;
    this.state = 'syncing';
    this.error = null;

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
            console.warn(
              `[SyncManager] Operation ${op.id} (${op.type}) exceeded MAX_RETRY. Dropping.`,
            );
            this.removeFromQueue(op.id);
          }
        }
        this.error = result.error ?? 'Unknown sync error';
      }
    }

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
