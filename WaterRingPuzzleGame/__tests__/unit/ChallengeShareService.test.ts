jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  },
}));

import {
  challengeShareService,
  ChallengeShareService,
} from '../../src/features/social/ChallengeShareService';
import { Share } from 'react-native';

const mockShare = Share.share as jest.MockedFunction<typeof Share.share>;

describe('ChallengeShareService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('challengeShareService is exported', () => {
    expect(challengeShareService).not.toBeNull();
    expect(challengeShareService).toBeInstanceOf(ChallengeShareService);
  });

  it('buildChallengeLink(14) returns string starting with waterring://challenge/14', () => {
    const link = challengeShareService.buildChallengeLink(14);
    expect(link).toMatch(/^waterring:\/\/challenge\/14/);
  });

  it('buildReplayLink("abc123") returns string containing "abc123"', () => {
    const link = challengeShareService.buildReplayLink('abc123');
    expect(link).toContain('abc123');
  });

  it('parseDeepLink("waterring://challenge/14") returns { type: "challenge", data: { challengeNumber: "14" } }', () => {
    const result = challengeShareService.parseDeepLink('waterring://challenge/14');
    expect(result.type).toBe('challenge');
    expect(result.data.challengeNumber).toBe('14');
  });

  it('parseDeepLink("waterring://replay/abc123") returns { type: "replay" }', () => {
    const result = challengeShareService.parseDeepLink('waterring://replay/abc123');
    expect(result.type).toBe('replay');
  });

  it('parseDeepLink("waterring://daily") returns { type: "daily" }', () => {
    const result = challengeShareService.parseDeepLink('waterring://daily');
    expect(result.type).toBe('daily');
  });

  it('parseDeepLink("https://example.com") returns { type: "unknown" }', () => {
    const result = challengeShareService.parseDeepLink('https://example.com');
    expect(result.type).toBe('unknown');
  });

  it('shareChallenge calls Share.share with a message containing "14"', async () => {
    await challengeShareService.shareChallenge({ challengeNumber: 14, stars: 3 });
    expect(mockShare).toHaveBeenCalledTimes(1);
    const callArg = mockShare.mock.calls[0][0] as { message: string };
    expect(callArg.message).toContain('14');
  });

  it('buildReplayLink returns string starting with replay prefix', () => {
    const link = challengeShareService.buildReplayLink('replayXYZ');
    expect(link).toMatch(/^waterring:\/\/replay\//);
  });
});
