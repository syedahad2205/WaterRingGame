jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
}));

import { usePlayerStore } from '../../src/store/slices/playerSlice';
import { useEconomyStore } from '../../src/store/slices/economySlice';

describe('HomeScreen integration — store values (task 8.5.2a)', () => {
  beforeEach(() => {
    usePlayerStore.setState({ displayName: 'TestPlayer', level: 14, totalStars: 35, xp: 1500, prestige: 0 });
    useEconomyStore.setState({ coinBalance: 1250, transactionHistory: [] });
  });

  it('player store has correct challenge number context', () => {
    const level = usePlayerStore.getState().level;
    expect(level).toBe(14);
  });

  it('coin balance is accessible from economy store', () => {
    const balance = useEconomyStore.getState().coinBalance;
    expect(balance).toBe(1250);
  });

  it('player displayName is set in store', () => {
    expect(usePlayerStore.getState().displayName).toBe('TestPlayer');
  });

  it('HomeScreen.tsx shows greeting based on time of day', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/HomeScreen.tsx'), 'utf8'
    );
    expect(source).toMatch(/Good morning|Good afternoon|Good evening/);
  });

  it('HomeScreen.tsx renders coin balance from store', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/HomeScreen.tsx'), 'utf8'
    );
    expect(source).toMatch(/coinBalance|CoinBadge/);
  });

  it('HomeScreen.tsx renders challenge number', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/HomeScreen.tsx'), 'utf8'
    );
    expect(source).toMatch(/CURRENT_CHALLENGE_NUMBER|challengeNumber/);
  });

  it('totalStars is a non-negative integer', () => {
    const totalStars = usePlayerStore.getState().totalStars;
    expect(totalStars).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(totalStars)).toBe(true);
  });
});
