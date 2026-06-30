import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp();
}

export { submitScore, getLeaderboard } from './leaderboard';
export { creditCoins, spendCoins } from './economy';
export { getDailyChallenge, generateDailyChallenge } from './dailyChallenge';
export { reportAntiCheat } from './antiCheat';
export { getChallengeIntelligence } from './challengeIntelligence';
