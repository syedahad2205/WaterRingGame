/**
 * AudioBufferManager — Epic 18 Task 18.1.2
 *
 * Manages audio buffer memory lifecycle:
 * - Tracks loaded stems and their estimated memory usage
 * - Releases inactive theme stems on theme switch within 500ms
 * - Budget: ≤ 20MB total audio buffer memory
 *
 * Requirements: 43.3
 */

const AUDIO_BUDGET_BYTES = 20 * 1024 * 1024; // 20 MB

interface StemEntry {
  id: string;
  themeId: string;
  estimatedSizeBytes: number;
  loaded: boolean;
  loadedAt: number;
}

class AudioBufferManagerClass {
  private stems: Map<string, StemEntry> = new Map();
  private activeThemeId: string | null = null;
  private totalLoadedBytes = 0;

  /**
   * Register a stem with its theme and estimated size.
   */
  register(stemId: string, themeId: string, estimatedSizeMB: number): void {
    this.stems.set(stemId, {
      id: stemId,
      themeId,
      estimatedSizeBytes: estimatedSizeMB * 1024 * 1024,
      loaded: false,
      loadedAt: 0,
    });
  }

  /**
   * Mark a stem as loaded.
   */
  markLoaded(stemId: string): void {
    const stem = this.stems.get(stemId);
    if (stem && !stem.loaded) {
      if (this.totalLoadedBytes + stem.estimatedSizeBytes > AUDIO_BUDGET_BYTES) {
        console.warn(`[AudioBufferManager] ${stemId} would exceed 20MB budget`);
        return;
      }
      stem.loaded = true;
      stem.loadedAt = Date.now();
      this.totalLoadedBytes += stem.estimatedSizeBytes;
    }
  }

  /**
   * Switch to a new theme — releases all stems from the previous theme
   * within 500ms (immediately in implementation, async in reality).
   */
  async switchTheme(newThemeId: string): Promise<void> {
    const oldThemeId = this.activeThemeId;
    this.activeThemeId = newThemeId;

    if (!oldThemeId || oldThemeId === newThemeId) return;

    // Release all stems from old theme
    const releasePromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        for (const stem of this.stems.values()) {
          if (stem.themeId === oldThemeId && stem.loaded) {
            stem.loaded = false;
            this.totalLoadedBytes -= stem.estimatedSizeBytes;
          }
        }
        resolve();
      }, 0); // immediate in practice; wrapped in setTimeout for async API
    });

    // Must complete within 500ms
    await Promise.race([
      releasePromise,
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Theme switch release exceeded 500ms')), 500);
      }),
    ]);
  }

  /**
   * Release all buffers.
   */
  releaseAll(): void {
    for (const stem of this.stems.values()) {
      stem.loaded = false;
    }
    this.totalLoadedBytes = 0;
  }

  getTotalLoadedBytes(): number { return this.totalLoadedBytes; }
  getActiveThemeId(): string | null { return this.activeThemeId; }
  getLoadedCount(): number { return Array.from(this.stems.values()).filter(s => s.loaded).length; }
  isLoaded(stemId: string): boolean { return this.stems.get(stemId)?.loaded ?? false; }
}

export const AudioBufferManager = new AudioBufferManagerClass();
