/**
 * ReplayStorageService — stub
 *
 * LZ4-compressed replay record upload and retrieval via Firebase Storage.
 * Full implementation: see Requirement 13 and design.md §Replay System.
 *
 * This stub exports a class with the full public interface so that the
 * DI context in Providers.tsx can be properly typed.
 */

export interface ReplayMetadata {
  replayId: string;
  challengeNumber: number;
  userId: string;
  durationMs: number;
  compressedSizeBytes: number;
  storageUrl: string;
  createdAt: number;
}

export class ReplayStorageService {
  async uploadReplay(
    _challengeNumber: number,
    _compressedData: Uint8Array,
    _metadata: Omit<ReplayMetadata, 'replayId' | 'storageUrl' | 'createdAt'>,
  ): Promise<ReplayMetadata | null> { return null; }

  async downloadReplay(_replayId: string): Promise<Uint8Array | null> { return null; }

  async deleteReplay(_replayId: string): Promise<void> { /* stub */ }

  async listReplays(_userId: string, _limit: number): Promise<ReplayMetadata[]> { return []; }
}
