jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn(), set: jest.fn(), update: jest.fn() })) })),
}));
jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: null,
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));
jest.mock('@react-native-firebase/functions', () => () => ({
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
  useEmulator: jest.fn(),
}));

const mockGetDownloadURL = jest.fn(() => Promise.resolve('https://mock.url/replay.json'));
const mockPutString = jest.fn(() => Promise.resolve({}));
const mockDelete = jest.fn(() => Promise.resolve());
const mockRef = jest.fn(() => ({
  putString: mockPutString,
  getDownloadURL: mockGetDownloadURL,
  delete: mockDelete,
}));
jest.mock('@react-native-firebase/storage', () => () => ({ ref: mockRef }));

const mockDecompress = jest.fn(() => ({ version: 1, events: [], challengeNumber: 14 }));
jest.mock('../../src/features/replay/ReplayCompressor', () => ({
  replayCompressor: {
    compress: jest.fn(() => ({
      version: 1,
      originalSizeBytes: 200,
      compressedSizeBytes: 150,
      compressionRatio: 0.75,
      data: 'dGVzdA==',
    })),
    decompress: mockDecompress,
  },
  ReplayCompressor: { estimateCompressionRatio: jest.fn(() => 1.33) },
}));

import {
  replayStorageService,
  ReplayStorageService,
} from '../../src/features/replay/ReplayStorageService';
import type { CompressedReplay } from '../../src/features/replay/ReplayCompressor';

const makeCompressed = (overrides: Partial<CompressedReplay> = {}): CompressedReplay => ({
  version: 1,
  originalSizeBytes: 200,
  compressedSizeBytes: 150,
  compressionRatio: 0.75,
  data: 'dGVzdA==',
  ...overrides,
});

describe('ReplayStorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDownloadURL.mockResolvedValue('https://mock.url/replay.json');
    mockPutString.mockResolvedValue({});
    mockDelete.mockResolvedValue(undefined);
  });

  it('replayStorageService is exported', () => {
    expect(replayStorageService).not.toBeNull();
    expect(replayStorageService).toBeInstanceOf(ReplayStorageService);
  });

  it('generateReplayId returns non-empty string containing userId and challengeNumber', () => {
    const id = ReplayStorageService.generateReplayId('user1', 14);
    expect(id).toBeTruthy();
    expect(id).toContain('user1');
    expect(id).toContain('14');
  });

  it('two generateReplayId calls produce values of string type', () => {
    const id1 = ReplayStorageService.generateReplayId('user1', 14);
    const id2 = ReplayStorageService.generateReplayId('user1', 14);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });

  it('upload returns UploadResult with replayId, storageUrl, compressedSizeBytes', async () => {
    const result = await replayStorageService.upload('user1', makeCompressed(), 14);
    expect(result).toHaveProperty('replayId');
    expect(result).toHaveProperty('storageUrl');
    expect(result).toHaveProperty('compressedSizeBytes');
    expect(result.storageUrl).toBe('https://mock.url/replay.json');
  });

  it('upload throws when compressed size exceeds MAX_REPLAY_SIZE_BYTES', async () => {
    const oversized = makeCompressed({ compressedSizeBytes: 600_000 });
    await expect(replayStorageService.upload('user1', oversized, 14)).rejects.toThrow();
  });

  it('download calls Firebase Storage getDownloadURL', async () => {
    const replayId = 'user1_14_abc123_xyz';
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(makeCompressed())),
      } as Response),
    );
    await replayStorageService.download(replayId);
    expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
  });

  it('delete calls Firebase Storage .delete()', async () => {
    await replayStorageService.delete('user1_14_abc_xyz', 'user1');
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
