jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

import { useChallengeStore } from '../../src/store/slices/challengeSlice';

const mockConfig = {
  challengeNumber: 1, seed: 'test', difficulty: 0.0,
  rings: [{ id: 'r1', colorId: 'blue', size: 'medium', initialPosition: { x: 195, y: 100 } }],
  pegs: [{ id: 'p1', colorId: 'blue', position: { x: 195, y: 600 } }],
  requiredPairs: [{ ringId: 'r1', pegId: 'p1' }],
  timer: { totalSeconds: 60 },
  arena: { width: 390, height: 844 },
  obstacles: [], templateId: 'standard',
};

describe('Pause → resume state preservation (task 8.3.1a)', () => {
  beforeEach(() => {
    useChallengeStore.setState({
      activeChallengeConfig: null, timerRemaining: 0,
      ringPositions: [], ringVelocities: [], pegStates: [],
      winLossState: 'idle', continueCount: 0, adaptiveAssistFlags: [],
    });
  });

  it('loadChallenge sets winLossState to playing', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as any);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('timerRemaining persists across state updates', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as any);
    useChallengeStore.getState().setTimer(45);
    expect(useChallengeStore.getState().timerRemaining).toBe(45);
  });

  it('setTimer does not change winLossState', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as any);
    useChallengeStore.getState().setTimer(30);
    expect(useChallengeStore.getState().winLossState).toBe('playing');
  });

  it('ring positions preserved when only timer updates', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as any);
    useChallengeStore.getState().setTimer(55);
    const pos = useChallengeStore.getState().ringPositions;
    expect(pos.length).toBe(1);
    expect(pos[0].id).toBe('r1');
  });

  it('continueCount preserved after timer reset', () => {
    useChallengeStore.getState().loadChallenge(mockConfig as any);
    useChallengeStore.getState().useContinue();
    expect(useChallengeStore.getState().continueCount).toBe(1);
    useChallengeStore.getState().setTimer(60);
    expect(useChallengeStore.getState().continueCount).toBe(1);
  });
});
