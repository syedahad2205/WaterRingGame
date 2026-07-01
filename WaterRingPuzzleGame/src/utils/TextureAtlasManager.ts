/**
 * TextureAtlasManager — Epic 18 Task 18.1.1
 *
 * Manages the lifecycle of texture atlases used during gameplay.
 * Releases all atlases when GameScreen unmounts; reloads on re-entry.
 * Memory budget: ≤ 50MB total atlas memory.
 *
 * Requirements: 40.6, 43.2
 */

interface AtlasEntry {
  id: string;
  /** Estimated memory size in bytes */
  estimatedSizeBytes: number;
  /** Whether the atlas is currently loaded */
  loaded: boolean;
  /** Loader function — returns the atlas handle or null on failure */
  loader: () => Promise<unknown>;
  /** Current atlas handle (null if not loaded) */
  handle: unknown | null;
}

const ATLAS_BUDGET_BYTES = 50 * 1024 * 1024; // 50 MB

class TextureAtlasManagerClass {
  private atlases: Map<string, AtlasEntry> = new Map();
  private totalLoadedBytes = 0;

  /**
   * Register an atlas with its estimated memory size and loader.
   * Registration does not trigger loading.
   */
  register(id: string, estimatedSizeMB: number, loader: () => Promise<unknown>): void {
    this.atlases.set(id, {
      id,
      estimatedSizeBytes: estimatedSizeMB * 1024 * 1024,
      loaded: false,
      loader,
      handle: null,
    });
  }

  /**
   * Load all registered atlases.
   * Respects the 50MB budget — will not load atlases exceeding the limit.
   */
  async loadAll(): Promise<void> {
    const entries = Array.from(this.atlases.values());
    for (const entry of entries) {
      if (entry.loaded) continue;
      if (this.totalLoadedBytes + entry.estimatedSizeBytes > ATLAS_BUDGET_BYTES) {
        if (__DEV__) console.warn(`[TextureAtlasManager] Skipping ${entry.id}: would exceed 50MB budget`);
        continue;
      }
      try {
        entry.handle = await entry.loader();
        entry.loaded = true;
        this.totalLoadedBytes += entry.estimatedSizeBytes;
      } catch (e) {
        if (__DEV__) console.error(`[TextureAtlasManager] Failed to load atlas ${entry.id}:`, e);
      }
    }
  }

  /**
   * Release all loaded atlases.
   * Call this from GameScreen useEffect cleanup.
   */
  releaseAll(): void {
    for (const entry of this.atlases.values()) {
      if (entry.loaded) {
        entry.handle = null;
        entry.loaded = false;
        this.totalLoadedBytes -= entry.estimatedSizeBytes;
      }
    }
    this.totalLoadedBytes = 0;
  }

  /**
   * Release a single atlas by ID.
   */
  release(id: string): void {
    const entry = this.atlases.get(id);
    if (entry?.loaded) {
      entry.handle = null;
      entry.loaded = false;
      this.totalLoadedBytes -= entry.estimatedSizeBytes;
    }
  }

  /** Returns the estimated total loaded memory in bytes. */
  getTotalLoadedBytes(): number {
    return this.totalLoadedBytes;
  }

  /** Returns the number of loaded atlases. */
  getLoadedCount(): number {
    return Array.from(this.atlases.values()).filter(e => e.loaded).length;
  }

  /** Returns whether a specific atlas is loaded. */
  isLoaded(id: string): boolean {
    return this.atlases.get(id)?.loaded ?? false;
  }

  /** Get the handle for a loaded atlas (null if not loaded). */
  getHandle(id: string): unknown | null {
    return this.atlases.get(id)?.handle ?? null;
  }
}

export const TextureAtlasManager = new TextureAtlasManagerClass();
