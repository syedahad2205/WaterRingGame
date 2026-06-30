"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChallengeIntelligence = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
function computeMedian(sortedValues) {
    if (sortedValues.length === 0)
        return 0;
    const mid = Math.floor(sortedValues.length / 2);
    if (sortedValues.length % 2 === 0) {
        return (sortedValues[mid - 1] + sortedValues[mid]) / 2;
    }
    return sortedValues[mid];
}
function computePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0)
        return 0;
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
}
exports.getChallengeIntelligence = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to get challenge intelligence.');
    }
    const { challengeNumber } = request.data;
    if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
        throw new https_1.HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();
    try {
        const entriesSnap = await db
            .collection(`scores/${challengeNumber}/entries`)
            .limit(1000)
            .get();
        const scores = [];
        const times = [];
        const starDist = { '1': 0, '2': 0, '3': 0 };
        for (const doc of entriesSnap.docs) {
            const d = doc.data();
            if (typeof d.score === 'number')
                scores.push(d.score);
            if (typeof d.completionTimeMs === 'number')
                times.push(d.completionTimeMs);
            if (d.starsEarned === 1)
                starDist['1']++;
            else if (d.starsEarned === 2)
                starDist['2']++;
            else if (d.starsEarned === 3)
                starDist['3']++;
        }
        scores.sort((a, b) => a - b);
        times.sort((a, b) => a - b);
        const totalEntries = entriesSnap.size;
        const averageCompletionTimeMs = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
        const medianScore = computeMedian(scores);
        const topPercentileScore = computePercentile(scores, 95);
        let completionRate = 0;
        if (challengeNumber > 1) {
            const prevCountSnap = await db
                .collection(`scores/${challengeNumber - 1}/entries`)
                .count()
                .get();
            const prevCount = prevCountSnap.data().count;
            completionRate = prevCount > 0 ? totalEntries / prevCount : 0;
        }
        else {
            completionRate = 1;
        }
        const personalBestDoc = await db
            .doc(`users/${userId}/progress/${challengeNumber}`)
            .get();
        const personalBest = personalBestDoc.exists ? (_a = personalBestDoc.data()) !== null && _a !== void 0 ? _a : null : null;
        return {
            globalStats: {
                averageCompletionTimeMs,
                medianScore,
                completionRate,
                starDistribution: starDist,
                topPercentileScore,
                totalEntries,
            },
            personalBest,
            fetchedAt: Date.now(),
        };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to get challenge intelligence: ${err.message}`);
    }
});
//# sourceMappingURL=challengeIntelligence.js.map