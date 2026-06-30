/**
 * GhostReplayLRUCache — Epic 18 Task 18.1.3
 *
 * LRU cache for ghost replay data with a hard 50MB size limit.
 * Evicts least-recently-used entries when the limit is exceeded.
 *
 * Requirements: 40.7
 */

const LRU_BUDGET_BYTES = 50 * 1024 * 1024; // 50 MB

interface CacheEntry {
  id: string;
  data: Uint8Array;
  sizeBytes: number;
  lastAccessedAt: number;
}

export class GhostReplayLRUCache {
  private cache: Map<string, CacheEntry> = new Map();
  private totalBytes = 0;
  private readonly budgetBytes: number;
  private accessCounter = 0;

  constructor(budgetBytes = LRU_BUDGET_BYTES) {
    this.budgetBytes = budgetBytes;
  }

  /**
   * Store a replay in the cache. Evicts LRU entries to stay within budget.
   */
  set(id: string, data: Uint8Array): void {
    // Remove existing entry first if updating
    if (this.cache.has(id)) {
      this.remove(id);
    }

    const sizeBytes = data.byteLength;

    // If single entry exceeds budget, don't cache it
    if (sizeBytes > this.budgetBytes) {
      console.warn(`[GhostReplayLRUCache] Entry ${id} (${(sizeBytes / 1e6).toFixed(1)}MB) exceeds budget; not cached`);
      return;
    }

    // Evict LRU entries until we have room
    while (this.totalBytes + sizeBytes > this.budgetBytes && this.cache.size > 0) {
      this.evictLRU();
    }

    this.cache.set(id, {
      id,
      data,
      sizeBytes,
      lastAccessedAt: ++this.accessCounter,
    });
    this.totalBytes += sizeBytes;
  }

  /**
   * Get a replay. Updates last-accessed time (LRU promotion).
   */
  get(id: string): Uint8Array | null {
    const entry = this.cache.get(id);
    if (!entry) return null;
    entry.lastAccessedAt = ++this.accessCounter;
    return entry.data;
  }

  /**
   * Remove a specific entry.
   */
  remove(id: string): void {
    const entry = this.cache.get(id);
    if (entry) {
      this.totalBytes -= entry.sizeBytes;
      this.cache.delete(id);
    }
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
    this.totalBytes = 0;
  }

  /** Evict the least-recently-used entry. */
  private evictLRU(): void {
    let oldest: CacheEntry | null = null;
    for (const entry of this.cache.values()) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessedAt) {
        oldest = entry;
      }
    }
    if (oldest) {
      this.remove(oldest.id);
    }
  }

  getTotalBytes(): number { return this.totalBytes; }
  getCount(): number { return this.cache.size; }
  has(id: string): boolean { return this.cache.has(id); }
  getBudgetBytes(): number { return this.budgetBytes; }
}

// Singleton instance
export const ghostReplayLRUCache = new GhostReplayLRUCache();
