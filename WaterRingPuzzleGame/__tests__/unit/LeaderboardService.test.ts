jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({ doc: jest.fn(() => ({ get: jest.fn(), set: jest.fn(), update: jest.fn() })), where: jest.fn(() => ({ orderBy: jest.fn(() => ({ limit: jest.fn(() => ({ get: jest.fn(() => ({ docs: [] })) })) })) })) })),
}));
jest.mock('@react-native-firebase/auth', () => () => ({
  signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'anon123', isAnonymous: true, displayName: null, email: null, photoURL: null }, additionalUserInfo: { isNewUser: true } })),
  currentUser: null,
  onAuthStateChanged: jest.fn(() => jest.fn()),
}));
jest.mock('@react-native-firebase/functions', () => {
  const mockFn = jest.fn(() => ({
    httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: { success: true } }))),
    useEmulator: jest.fn(),
  }));
  return mockFn;
});
jest.mock('@react-native-firebase/storage', () => () => ({
  ref: jest.fn(() => ({ putString: jest.fn(() => ({ on: jest.fn() })), getDownloadURL: jest.fn(() => Promise.resolve('https://mock.url/replay.json')), delete: jest.fn() })),
}));

jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(() => ({ toString: () => 'mock-hmac-sig' })),
}));

const mockHttpsCallable = jest.fn();
jest.mock('../../src/services/firebase/CloudFunctionsService', () => ({
  cloudFunctionsService: {
    call: mockHttpsCallable,
  },
}));

import { leaderboardService, LeaderboardService } from '../../src/features/social/LeaderboardService';
import functions from '@react-native-firebase/functions';

const mockFunctions = functions as jest.MockedFunction<typeof functions>;

const makeEntry = (userId: string, score: number) => ({
  userId, displayName: 'P', score, rank: 1,
  completionTimeMs: 10000, starsEarned: 3 as const,
  continuesUsed: 0, challengeNumber: 1, timestamp: Date.now(),
  avatarUrl: null, country: 'US',
});

describe('LeaderboardService', () => {
  let callableMock: jest.Mock;

  beforeEach(() => {
    callableMock = jest.fn(() =>
      Promise.resolve({ data: { success: true, rank: 5 } }),
    );
    mockFunctions.mockReturnValue({
      httpsCallable: jest.fn(() => callableMock),
      useEmulator: jest.fn(),
    } as any);
    jest.clearAllMocks();
  });

  it('leaderboardService is exported', () => {
    expect(leaderboardService).not.toBeNull();
    expect(leaderboardService).toBeInstanceOf(LeaderboardService);
  });

  it('invalidateCache is callable without throwing', () => {
    expect(() => leaderboardService.invalidateCache(1)).not.toThrow();
  });

  it('submitScore calls firebase httpsCallable with submitScore', async () => {
    const service = new LeaderboardService();
    const httpsCallableSpy = jest.fn(() => callableMock);
    mockFunctions.mockReturnValue({ httpsCallable: httpsCallableSpy, useEmulator: jest.fn() } as any);

    callableMock.mockResolvedValueOnce({ data: { success: true, rank: 3 } });
    await service.submitScore('user1', {
      challengeNumber: 1, score: 500, completionTimeMs: 12000,
      starsEarned: 3, continuesUsed: 0,
    }, 'salt');

    expect(httpsCallableSpy).toHaveBeenCalledWith('submitScore');
  });

  it('getLeaderboard calls firebase httpsCallable with getLeaderboard', async () => {
    const service = new LeaderboardService();
    const httpsCallableSpy = jest.fn(() =>
      jest.fn(() => Promise.resolve({ data: { entries: [], totalCount: 0 } })),
    );
    mockFunctions.mockReturnValue({ httpsCallable: httpsCallableSpy, useEmulator: jest.fn() } as any);

    await service.getLeaderboard('global', 1, 'allTime', 'user1');
    expect(httpsCallableSpy).toHaveBeenCalledWith('getLeaderboard');
  });

  it('getLeaderboard result entries are ordered by score descending from mock data', async () => {
    const service = new LeaderboardService();
    const sorted = [makeEntry('a', 900), makeEntry('b', 500), makeEntry('c', 100)];
    mockFunctions.mockReturnValue({
      httpsCallable: jest.fn(() =>
        jest.fn(() => Promise.resolve({ data: { entries: sorted, totalCount: 3 } })),
      ),
      useEmulator: jest.fn(),
    } as any);

    const page = await service.getLeaderboard('global', 1, 'allTime', 'user1');
    const scores = page.entries.map((e) => e.score);
    expect(scores).toEqual([900, 500, 100]);
  });

  it('submitScore payload includes completionTimeMs', async () => {
    const service = new LeaderboardService();
    const captured: unknown[] = [];
    const callFn = jest.fn((payload: unknown) => {
      captured.push(payload);
      return Promise.resolve({ data: { success: true, rank: 1 } });
    });
    mockFunctions.mockReturnValue({
      httpsCallable: jest.fn(() => callFn),
      useEmulator: jest.fn(),
    } as any);

    await service.submitScore('user1', {
      challengeNumber: 1, score: 500, completionTimeMs: 9000,
      starsEarned: 2, continuesUsed: 0,
    }, 'salt');

    expect(captured[0]).toMatchObject({ completionTimeMs: 9000 });
  });

  it('cache miss: second call within TTL does not call server again', async () => {
    const service = new LeaderboardService();
    const callFn = jest.fn(() =>
      Promise.resolve({ data: { entries: [], totalCount: 0 } }),
    );
    mockFunctions.mockReturnValue({
      httpsCallable: jest.fn(() => callFn),
      useEmulator: jest.fn(),
    } as any);

    await service.getLeaderboard('global', 2, 'allTime', 'user1');
    await service.getLeaderboard('global', 2, 'allTime', 'user1');
    expect(callFn).toHaveBeenCalledTimes(1);
  });

  it('cache invalidation: after invalidateCache next call hits server again', async () => {
    const service = new LeaderboardService();
    const callFn = jest.fn(() =>
      Promise.resolve({ data: { entries: [], totalCount: 0 } }),
    );
    mockFunctions.mockReturnValue({
      httpsCallable: jest.fn(() => callFn),
      useEmulator: jest.fn(),
    } as any);

    await service.getLeaderboard('global', 3, 'allTime', 'user1');
    service.invalidateCache(3);
    await service.getLeaderboard('global', 3, 'allTime', 'user1');
    expect(callFn).toHaveBeenCalledTimes(2);
  });
});
