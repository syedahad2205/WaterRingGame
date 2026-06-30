/**
 * ChallengeShareService — full implementation (Epic 14)
 *
 * Builds deep-link URLs and invokes the native share sheet for challenge
 * results and replay links.
 */

import { Share } from 'react-native';

export interface SharePayload {
  challengeNumber: number;
  stars?: 1 | 2 | 3;
  score?: number;
  replayId?: string;
}

// ---------------------------------------------------------------------------
// ChallengeShareService
// ---------------------------------------------------------------------------

export class ChallengeShareService {
  readonly DEEP_LINK_PREFIX = 'waterring://challenge/';
  readonly REPLAY_LINK_PREFIX = 'waterring://replay/';

  // -------------------------------------------------------------------------
  // buildChallengeLink
  // -------------------------------------------------------------------------

  buildChallengeLink(challengeNumber: number): string {
    return `${this.DEEP_LINK_PREFIX}${challengeNumber}`;
  }

  // -------------------------------------------------------------------------
  // buildReplayLink
  // -------------------------------------------------------------------------

  buildReplayLink(replayId: string): string {
    return `${this.REPLAY_LINK_PREFIX}${encodeURIComponent(replayId)}`;
  }

  // -------------------------------------------------------------------------
  // shareChallenge
  // -------------------------------------------------------------------------

  async shareChallenge(payload: SharePayload): Promise<void> {
    const { challengeNumber, stars, score, replayId } = payload;

    const link = replayId
      ? this.buildReplayLink(replayId)
      : this.buildChallengeLink(challengeNumber);

    const starsText = stars ? '⭐'.repeat(stars) : '';
    const scoreText = typeof score === 'number' ? ` with ${score} points` : '';
    const message = [
      `I just completed Water Ring Challenge #${challengeNumber}${scoreText}!`,
      starsText,
      `Try it yourself: ${link}`,
    ]
      .filter(Boolean)
      .join('\n');

    await Share.share({ message, url: link });
  }

  // -------------------------------------------------------------------------
  // shareReplay
  // -------------------------------------------------------------------------

  async shareReplay(replayId: string, challengeNumber: number): Promise<void> {
    const link = this.buildReplayLink(replayId);
    const message = `Watch my Water Ring Challenge #${challengeNumber} replay: ${link}`;
    await Share.share({ message, url: link });
  }

  // -------------------------------------------------------------------------
  // parseDeepLink
  // -------------------------------------------------------------------------

  parseDeepLink(
    url: string,
  ): { type: 'challenge' | 'replay' | 'daily' | 'unknown'; data: Record<string, string> } {
    if (!url || typeof url !== 'string') {
      return { type: 'unknown', data: {} };
    }

    if (url.startsWith(this.DEEP_LINK_PREFIX)) {
      const rest = url.slice(this.DEEP_LINK_PREFIX.length);
      const [rawNumber, ...queryParts] = rest.split('?');
      const challengeNumber = rawNumber.replace(/\D/g, '');
      const data: Record<string, string> = { challengeNumber };

      if (queryParts.length > 0) {
        const params = new URLSearchParams(queryParts.join('?'));
        params.forEach((v, k) => { data[k] = v; });
      }

      return { type: 'challenge', data };
    }

    if (url.startsWith(this.REPLAY_LINK_PREFIX)) {
      const rest = url.slice(this.REPLAY_LINK_PREFIX.length);
      const [rawId, ...queryParts] = rest.split('?');
      const replayId = decodeURIComponent(rawId);
      const data: Record<string, string> = { replayId };

      if (queryParts.length > 0) {
        const params = new URLSearchParams(queryParts.join('?'));
        params.forEach((v, k) => { data[k] = v; });
      }

      return { type: 'replay', data };
    }

    if (url.startsWith('waterring://daily')) {
      const qIdx = url.indexOf('?');
      const data: Record<string, string> = {};
      if (qIdx !== -1) {
        const params = new URLSearchParams(url.slice(qIdx + 1));
        params.forEach((v, k) => { data[k] = v; });
      }
      return { type: 'daily', data };
    }

    return { type: 'unknown', data: {} };
  }
}

export const challengeShareService = new ChallengeShareService();
