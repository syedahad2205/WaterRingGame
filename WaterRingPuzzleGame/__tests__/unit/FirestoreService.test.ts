jest.mock('@react-native-firebase/firestore', () => {
  const mockFn = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(),
            set: jest.fn(),
            collection: jest.fn(() => ({
              doc: jest.fn(() => ({ set: jest.fn(), get: jest.fn() })),
            })),
          })),
        })),
      })),
    })),
    collectionGroup: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
      })),
    })),
  }));
  return mockFn;
});

import { firestoreService, FirestoreService } from '../../src/services/firebase/FirestoreService';
import firestore from '@react-native-firebase/firestore';

const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;

describe('FirestoreService', () => {
  let getMock: jest.Mock;
  let setMock: jest.Mock;
  let updateMock: jest.Mock;

  beforeEach(() => {
    getMock = jest.fn();
    setMock = jest.fn();
    updateMock = jest.fn();
    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: getMock,
          set: setMock,
          update: updateMock,
          collection: jest.fn(() => ({
            doc: jest.fn(() => ({
              get: getMock,
              set: setMock,
              collection: jest.fn(() => ({
                doc: jest.fn(() => ({ set: setMock, get: getMock })),
              })),
            })),
          })),
        })),
      })),
      collectionGroup: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({ docs: [] })),
            })),
          })),
        })),
      })),
    } as any);
  });

  it('firestoreService is exported and not null', () => {
    expect(firestoreService).not.toBeNull();
    expect(firestoreService).toBeInstanceOf(FirestoreService);
  });

  it('getUser calls collection → doc → get', async () => {
    getMock.mockResolvedValue({ exists: true, data: () => ({ userId: 'u1' }) });
    const result = await firestoreService.getUser('u1');
    expect(getMock).toHaveBeenCalledTimes(1);
  });

  it('getUser returns null when document does not exist', async () => {
    getMock.mockResolvedValue({ exists: false });
    const result = await firestoreService.getUser('ghost');
    expect(result).toBeNull();
  });

  it('setUser calls .set() on the doc', async () => {
    setMock.mockResolvedValue(undefined);
    await firestoreService.setUser('u1', { displayName: 'Alice' });
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('updateUser calls .update() on the doc', async () => {
    updateMock.mockResolvedValue(undefined);
    await firestoreService.updateUser('u1', { level: 5 });
    expect(updateMock).toHaveBeenCalledTimes(1);
  });

  it('getTopScores returns empty array when no docs found', async () => {
    const scores = await firestoreService.getTopScores('global', 1);
    expect(scores).toEqual([]);
  });

  it('submitScore calls .set() on the score doc path', async () => {
    setMock.mockResolvedValue(undefined);
    const score = {
      userId: 'u1', displayName: 'Alice', score: 500,
      completionTimeMs: 12000, starsEarned: 3 as const,
      continuesUsed: 0, challengeNumber: 1, timestamp: Date.now(),
    };
    await firestoreService.submitScore('global', 1, score);
    expect(setMock).toHaveBeenCalledTimes(1);
  });

  it('getUser is async and returns a promise', () => {
    getMock.mockResolvedValue({ exists: false });
    const promise = firestoreService.getUser('u1');
    expect(promise).toBeInstanceOf(Promise);
  });

  it('setUser is async and returns a promise', () => {
    setMock.mockResolvedValue(undefined);
    const promise = firestoreService.setUser('u1', {});
    expect(promise).toBeInstanceOf(Promise);
  });

  it('updateUser is async and returns a promise', () => {
    updateMock.mockResolvedValue(undefined);
    const promise = firestoreService.updateUser('u1', {});
    expect(promise).toBeInstanceOf(Promise);
  });
});
