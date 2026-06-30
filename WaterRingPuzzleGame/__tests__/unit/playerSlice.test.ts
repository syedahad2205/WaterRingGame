/**
 * Unit tests for playerSlice
 *
 * Covers: Requirements 17.1, 18.1, 18.2
 * Tests: XP addition, level-up threshold, prestige reset, selectors, profile update
 */

// react-native-mmkv requires native binaries — mock for Node.js test environment.
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

import {
  usePlayerStore,
  selectPlayerLevel,
  selectPlayerXP,
  selectPrestige,
  selectPlayerRank,
  selectTotalStars,
  selectCompletionScorePercent,
  selectPlayerProfile,
  rankFromLevel,
} from '../../src/store/slices/playerSlice';
import type { PlayerSlice, PlayerRank } from '../../src/store/slices/playerSlice';

/** Reset to default state before each test. */
function resetStore(): void {
  usePlayerStore.setState({
    userId: '',
    username: '',
    displayName: '',
    avatarUrl: null,
    country: '',
    xp: 0,
    level: 1,
    prestige: 0,
    rank: 'Ripple',
    totalStars: 0,
    completionScorePercent: 0,
  });
}

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------

describe('playerSlice — updateProfile', () => {
  beforeEach(resetStore);

  it('updates profile fields without touching XP, level, prestige, or rank', () => {
    const { updateProfile, addXP, levelUp } = usePlayerStore.getState();
    addXP(500);
    levelUp();
    updateProfile({ userId: 'abc', username: 'tester', displayName: 'Tester', country: 'US' });

    const state = usePlayerStore.getState();
    expect(state.userId).toBe('abc');
    expect(state.username).toBe('tester');
    expect(state.displayName).toBe('Tester');
    expect(state.country).toBe('US');
    // XP and level must be unchanged
    expect(state.xp).toBe(500);
    expect(state.level).toBe(2);
  });

  it('supports partial profile update (only some fields)', () => {
    const { updateProfile } = usePlayerStore.getState();
    updateProfile({ username: 'partial_user' });
    expect(usePlayerStore.getState().username).toBe('partial_user');
    // Other profile fields stay default
    expect(usePlayerStore.getState().userId).toBe('');
  });

  it('updates avatarUrl to a non-null value', () => {
    const { updateProfile } = usePlayerStore.getState();
    updateProfile({ avatarUrl: 'https://example.com/avatar.png' });
    expect(usePlayerStore.getState().avatarUrl).toBe('https://example.com/avatar.png');
  });
});

// ---------------------------------------------------------------------------
// addXP
// ---------------------------------------------------------------------------

describe('playerSlice — addXP', () => {
  beforeEach(resetStore);

  it('increases XP by the given amount', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(100);
    expect(usePlayerStore.getState().xp).toBe(100);
  });

  it('accumulates XP across multiple calls', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(50);
    addXP(75);
    addXP(25);
    expect(usePlayerStore.getState().xp).toBe(150);
  });

  it('does NOT auto-apply a level-up (level stays unchanged after addXP)', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(99999); // Far above any realistic level threshold
    // Level should still be 1 — caller must dispatch levelUp separately
    expect(usePlayerStore.getState().level).toBe(1);
  });

  it('ignores zero amount', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(0);
    expect(usePlayerStore.getState().xp).toBe(0);
  });

  it('ignores negative amount', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(100);
    addXP(-50);
    // Negative XP should be rejected
    expect(usePlayerStore.getState().xp).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// levelUp
// ---------------------------------------------------------------------------

describe('playerSlice — levelUp', () => {
  beforeEach(resetStore);

  it('increments level by 1', () => {
    const { levelUp } = usePlayerStore.getState();
    levelUp();
    expect(usePlayerStore.getState().level).toBe(2);
  });

  it('multiple level-ups accumulate correctly', () => {
    const { levelUp } = usePlayerStore.getState();
    for (let i = 0; i < 5; i++) levelUp();
    expect(usePlayerStore.getState().level).toBe(6);
  });

  it('updates rank when crossing a rank threshold', () => {
    const { levelUp } = usePlayerStore.getState();
    // Level starts at 1 (Ripple). Advance to level 50 → rank becomes 'Current'.
    for (let i = 0; i < 49; i++) levelUp();
    expect(usePlayerStore.getState().level).toBe(50);
    expect(usePlayerStore.getState().rank).toBe('Current');
  });

  it('rank progresses through all 8 tiers', () => {
    const thresholds: Array<[number, PlayerRank]> = [
      [1, 'Ripple'],
      [50, 'Current'],
      [150, 'Wave'],
      [300, 'Tide'],
      [500, 'Surge'],
      [800, 'Tempest'],
      [1200, 'Maelstrom'],
      [2000, 'Leviathan'],
    ];

    for (const [level, expectedRank] of thresholds) {
      expect(rankFromLevel(level)).toBe(expectedRank);
    }
  });
});

// ---------------------------------------------------------------------------
// applyPrestige (spec action name: prestige)
// ---------------------------------------------------------------------------

describe('playerSlice — applyPrestige (prestige action)', () => {
  beforeEach(resetStore);

  it('increments prestige count by 1', () => {
    const { applyPrestige } = usePlayerStore.getState();
    applyPrestige();
    expect(usePlayerStore.getState().prestige).toBe(1);
  });

  it('resets level to 1 on prestige', () => {
    const { addXP, levelUp, applyPrestige } = usePlayerStore.getState();
    addXP(10000);
    for (let i = 0; i < 10; i++) levelUp(); // level → 11
    applyPrestige();
    expect(usePlayerStore.getState().level).toBe(1);
  });

  it('resets rank to Ripple on prestige', () => {
    const { levelUp, applyPrestige } = usePlayerStore.getState();
    for (let i = 0; i < 49; i++) levelUp(); // level → 50 (Current)
    expect(usePlayerStore.getState().rank).toBe('Current');
    applyPrestige();
    expect(usePlayerStore.getState().rank).toBe('Ripple');
  });

  it('preserves XP across prestige', () => {
    const { addXP, applyPrestige } = usePlayerStore.getState();
    addXP(5000);
    applyPrestige();
    expect(usePlayerStore.getState().xp).toBe(5000);
  });

  it('allows multiple prestiges and counts them correctly', () => {
    const { applyPrestige } = usePlayerStore.getState();
    applyPrestige();
    applyPrestige();
    applyPrestige();
    expect(usePlayerStore.getState().prestige).toBe(3);
  });

  it('level resets to 1 on every prestige call', () => {
    const { levelUp, applyPrestige } = usePlayerStore.getState();
    for (let i = 0; i < 5; i++) levelUp(); // level → 6
    applyPrestige();
    for (let i = 0; i < 8; i++) levelUp(); // level → 9
    applyPrestige(); // Should reset again
    expect(usePlayerStore.getState().level).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rankFromLevel helper
// ---------------------------------------------------------------------------

describe('rankFromLevel', () => {
  it('returns Ripple for levels 1–49', () => {
    expect(rankFromLevel(1)).toBe('Ripple');
    expect(rankFromLevel(49)).toBe('Ripple');
  });

  it('returns Current for levels 50–149', () => {
    expect(rankFromLevel(50)).toBe('Current');
    expect(rankFromLevel(149)).toBe('Current');
  });

  it('returns Wave for levels 150–299', () => {
    expect(rankFromLevel(150)).toBe('Wave');
    expect(rankFromLevel(299)).toBe('Wave');
  });

  it('returns Tide for levels 300–499', () => {
    expect(rankFromLevel(300)).toBe('Tide');
    expect(rankFromLevel(499)).toBe('Tide');
  });

  it('returns Surge for levels 500–799', () => {
    expect(rankFromLevel(500)).toBe('Surge');
    expect(rankFromLevel(799)).toBe('Surge');
  });

  it('returns Tempest for levels 800–1199', () => {
    expect(rankFromLevel(800)).toBe('Tempest');
    expect(rankFromLevel(1199)).toBe('Tempest');
  });

  it('returns Maelstrom for levels 1200–1999', () => {
    expect(rankFromLevel(1200)).toBe('Maelstrom');
    expect(rankFromLevel(1999)).toBe('Maelstrom');
  });

  it('returns Leviathan for levels 2000+', () => {
    expect(rankFromLevel(2000)).toBe('Leviathan');
    expect(rankFromLevel(99999)).toBe('Leviathan');
  });
});

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

describe('playerSlice — selectors', () => {
  beforeEach(resetStore);

  it('selectPlayerLevel returns current level', () => {
    const { levelUp } = usePlayerStore.getState();
    levelUp();
    levelUp();
    expect(selectPlayerLevel(usePlayerStore.getState())).toBe(3);
  });

  it('selectPlayerXP returns current XP', () => {
    const { addXP } = usePlayerStore.getState();
    addXP(350);
    expect(selectPlayerXP(usePlayerStore.getState())).toBe(350);
  });

  it('selectPrestige returns prestige count', () => {
    const { applyPrestige } = usePlayerStore.getState();
    applyPrestige();
    applyPrestige();
    expect(selectPrestige(usePlayerStore.getState())).toBe(2);
  });

  it('selectPlayerRank returns current rank', () => {
    const state = usePlayerStore.getState();
    expect(selectPlayerRank(state)).toBe('Ripple');
  });

  it('selectTotalStars returns total stars (initial 0)', () => {
    expect(selectTotalStars(usePlayerStore.getState())).toBe(0);
  });

  it('selectCompletionScorePercent returns completionScorePercent', () => {
    usePlayerStore.setState({ completionScorePercent: 42 });
    expect(selectCompletionScorePercent(usePlayerStore.getState())).toBe(42);
  });

  it('selectPlayerProfile returns only profile fields', () => {
    const { updateProfile } = usePlayerStore.getState();
    updateProfile({
      userId: 'uid123',
      username: 'player1',
      displayName: 'Player One',
      avatarUrl: null,
      country: 'GB',
    });
    const profile = selectPlayerProfile(usePlayerStore.getState() as PlayerSlice);
    expect(profile).toEqual({
      userId: 'uid123',
      username: 'player1',
      displayName: 'Player One',
      avatarUrl: null,
      country: 'GB',
    });
    // Profile selector must NOT expose XP, level, prestige, etc.
    const profileAsUnknown = profile as unknown as Record<string, unknown>;
    expect(profileAsUnknown.xp).toBeUndefined();
    expect(profileAsUnknown.level).toBeUndefined();
  });
});
