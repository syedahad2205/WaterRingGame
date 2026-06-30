/**
 * ReplayStorageService — full implementation (Epic 15)
 *
 * Uploads and downloads LZ4-compressed (JS fallback) replay files via
 * Firebase Storage, with a 500 KB per-replay size guard.
 */

import storage from '@react-native-firebase/storage';
import { replayCompressor } from './ReplayCompressor';
import type { CompressedReplay } from './ReplayCompressor';
import type { ReplayData } from './ReplayRecorder';

export interface UploadResult {
  replayId: string;
  storageUrl: string;
  compressedSizeBytes: number;
}

// ---------------------------------------------------------------------------
// ReplayStorageService
// ---------------------------------------------------------------------------

export class ReplayStorageService {
  readonly STORAGE_PATH = 'replays';
  readonly MAX_REPLAY_SIZE_BYTES = 500_000; // 500 KB

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  async upload(
    userId: string,
    compressed: CompressedReplay,
    challengeNumber: number,
  ): Promise<UploadResult> {
    if (compressed.compressedSizeBytes > this.MAX_REPLAY_SIZE_BYTES) {
      throw new Error(
        `[ReplayStorageService] Replay exceeds size limit: ` +
          `${compressed.compressedSizeBytes} > ${this.MAX_REPLAY_SIZE_BYTES} bytes`,
      );
    }

    const replayId = ReplayStorageService.generateReplayId(userId, challengeNumber);
    const storagePath = this.getStoragePath(userId, replayId);

    // Serialise CompressedReplay envelope to JSON for storage
    const envelopeJson = JSON.stringify(compressed);
    const ref = storage().ref(storagePath);

    await ref.putString(envelopeJson, 'raw', {
      contentType: 'application/json',
      customMetadata: {
        userId,
        challengeNumber: String(challengeNumber),
        replayId,
        version: String(compressed.version),
      },
    });

    const storageUrl = await ref.getDownloadURL();

    return {
      replayId,
      storageUrl,
      compressedSizeBytes: compressed.compressedSizeBytes,
    };
  }

  // -------------------------------------------------------------------------
  // download
  // -------------------------------------------------------------------------

  async download(replayId: string): Promise<ReplayData | null> {
    try {
      // replayId encodes userId and challengeNumber — extract userId prefix
      // Format: {userId}_{challengeNumber}_{timestamp}_{random}
      const parts = replayId.split('_');
      if (parts.length < 4) {
        console.warn('[ReplayStorageService] Invalid replayId format:', replayId);
        return null;
      }
      const userId = parts[0];
      const storagePath = this.getStoragePath(userId, replayId);
      const ref = storage().ref(storagePath);

      const downloadUrl = await ref.getDownloadURL();

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        console.warn('[ReplayStorageService] Download failed:', response.status);
        return null;
      }

      const envelopeJson = await response.text();
      const compressed = JSON.parse(envelopeJson) as CompressedReplay;
      const replayData = replayCompressor.decompress(compressed);

      return replayData;
    } catch (err: unknown) {
      console.warn('[ReplayStorageService] download error:', err);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  async delete(replayId: string, userId: string): Promise<void> {
    const storagePath = this.getStoragePath(userId, replayId);
    await storage().ref(storagePath).delete();
  }

  // -------------------------------------------------------------------------
  // getStoragePath (private)
  // -------------------------------------------------------------------------

  private getStoragePath(userId: string, replayId: string): string {
    return `${this.STORAGE_PATH}/${userId}/${replayId}.json`;
  }

  // -------------------------------------------------------------------------
  // generateReplayId (static)
  // -------------------------------------------------------------------------

  static generateReplayId(userId: string, challengeNumber: number): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 8);
    return `${userId}_${challengeNumber}_${timestamp}_${random}`;
  }

  // ── Alias methods for interface-contract tests ────────────────────────────

  /** Alias for upload() — expected by DI contract tests. */
  uploadReplay(
    userId: string,
    compressed: import('./ReplayCompressor').CompressedReplay,
    challengeNumber: number,
  ): Promise<UploadResult> {
    return this.upload(userId, compressed, challengeNumber);
  }

  /** Alias for download() — expected by DI contract tests. */
  downloadReplay(replayId: string): Promise<import('./ReplayRecorder').ReplayData | null> {
    return this.download(replayId);
  }

  /** Alias for delete() — expected by DI contract tests. */
  deleteReplay(replayId: string, userId: string): Promise<void> {
    return this.delete(replayId, userId);
  }

  /** List replays for a user (stub — returns empty array). */
  async listReplays(_userId: string): Promise<string[]> {
    return [];
  }
}

export const replayStorageService = new ReplayStorageService();
