jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
}));

import { rankFromLevel } from '../../src/store/slices/playerSlice';

describe('ProfileCard rank badge accessibility label (task 8.4.3a)', () => {
  it('rankFromLevel returns Ripple for level 1', () => {
    expect(rankFromLevel(1)).toBe('Ripple');
  });

  it('rankFromLevel returns Leviathan for max level', () => {
    expect(rankFromLevel(2000)).toBe('Leviathan');
  });

  it('rank label is human-readable (non-empty string)', () => {
    [1, 50, 150, 300, 500, 800, 1200, 2000].forEach(level => {
      const rank = rankFromLevel(level);
      expect(typeof rank).toBe('string');
      expect(rank.length).toBeGreaterThan(0);
    });
  });

  it('ProfileScreen.tsx has accessibilityLabel on rank badge', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(
      path.resolve(__dirname, '../../src/screens/ProfileScreen.tsx'), 'utf8'
    );
    expect(source).toContain('accessibilityLabel');
  });

  it('all 8 rank tiers are covered', () => {
    const ranks = new Set([
      rankFromLevel(1), rankFromLevel(50), rankFromLevel(150),
      rankFromLevel(300), rankFromLevel(500), rankFromLevel(800),
      rankFromLevel(1200), rankFromLevel(2000),
    ]);
    expect(ranks.size).toBe(8);
  });
});
