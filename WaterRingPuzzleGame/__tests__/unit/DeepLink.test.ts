// Test the deep-link parseDeepLink from ChallengeShareService
jest.mock('react-native', () => ({ Share: { share: jest.fn() } }));
jest.mock('@react-native-firebase/functions', () => () => ({ httpsCallable: jest.fn(() => jest.fn()) }));
jest.mock('crypto-js', () => ({ HmacSHA256: jest.fn(() => ({ toString: () => 'mock_hmac' })) }));

import { challengeShareService } from '../../src/features/social/ChallengeShareService';

describe('Deep-link URL parsing (task 8.1.2a)', () => {
  it('parses challenge deep link', () => {
    const result = challengeShareService.parseDeepLink('waterring://challenge/14');
    expect(result.type).toBe('challenge');
  });

  it('parses replay deep link', () => {
    const result = challengeShareService.parseDeepLink('waterring://replay/abc123');
    expect(result.type).toBe('replay');
  });

  it('parses daily deep link', () => {
    const result = challengeShareService.parseDeepLink('waterring://daily');
    expect(result.type).toBe('daily');
  });

  it('returns unknown for unrecognized URL', () => {
    const result = challengeShareService.parseDeepLink('https://example.com/unknown');
    expect(result.type).toBe('unknown');
  });

  it('buildChallengeLink includes challenge number', () => {
    const link = challengeShareService.buildChallengeLink(42);
    expect(link).toContain('42');
    expect(link).toContain('waterring://');
  });
});
