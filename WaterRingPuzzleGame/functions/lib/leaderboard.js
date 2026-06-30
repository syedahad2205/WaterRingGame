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
exports.getLeaderboard = exports.submitScore = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.submitScore = (0, https_1.onCall)(async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to submit a score.');
    }
    const { challengeNumber, score, completionTimeMs, starsEarned, continuesUsed, replayId, hmacSignature } = request.data;
    if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
        throw new https_1.HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
    }
    if (score === undefined || score < 0) {
        throw new https_1.HttpsError('invalid-argument', 'score must be >= 0.');
    }
    if (completionTimeMs === undefined || completionTimeMs < 0) {
        throw new https_1.HttpsError('invalid-argument', 'completionTimeMs must be >= 0.');
    }
    if (!starsEarned || starsEarned < 1 || starsEarned > 3) {
        throw new https_1.HttpsError('invalid-argument', 'starsEarned must be between 1 and 3.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();
    try {
        let displayName = '';
        const userDoc = await db.doc(`users/${userId}`).get();
        if (userDoc.exists) {
            displayName = (_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.displayName) !== null && _b !== void 0 ? _b : '';
        }
        const entryData = {
            userId,
            displayName,
            score,
            completionTimeMs,
            starsEarned,
            continuesUsed,
            replayId: replayId !== null && replayId !== void 0 ? replayId : null,
            hmacSignature,
            challengeNumber,
            timestamp: Date.now(),
        };
        await db.doc(`scores/${challengeNumber}/entries/${userId}`).set(entryData, { merge: true });
        await db.doc(`leaderboard/${challengeNumber}/global/${userId}`).set(entryData, { merge: true });
        const higherScoresSnap = await db
            .collection(`scores/${challengeNumber}/entries`)
            .where('score', '>', score)
            .count()
            .get();
        const rank = higherScoresSnap.data().count + 1;
        return { rank, success: true };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to submit score: ${err.message}`);
    }
});
exports.getLeaderboard = (0, https_1.onCall)(async (request) => {
    var _a, _b, _c;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to fetch leaderboard.');
    }
    const { challengeNumber, scope, limit, friendIds } = request.data;
    if (!challengeNumber || challengeNumber < 1 || challengeNumber > 10000) {
        throw new https_1.HttpsError('invalid-argument', 'challengeNumber must be between 1 and 10000.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();
    const fetchLimit = limit !== null && limit !== void 0 ? limit : 50;
    try {
        let query = db
            .collection(`scores/${challengeNumber}/entries`)
            .orderBy('score', 'desc');
        if (scope === 'friends' && friendIds && friendIds.length > 0) {
            query = query.where('userId', 'in', friendIds.slice(0, 30));
        }
        query = query.limit(fetchLimit);
        const snap = await query.get();
        const totalCountSnap = await db
            .collection(`scores/${challengeNumber}/entries`)
            .count()
            .get();
        const entries = snap.docs.map((doc, index) => {
            var _a, _b, _c;
            const d = doc.data();
            return {
                userId: d.userId,
                displayName: (_a = d.displayName) !== null && _a !== void 0 ? _a : '',
                username: (_b = d.username) !== null && _b !== void 0 ? _b : '',
                avatarUrl: (_c = d.avatarUrl) !== null && _c !== void 0 ? _c : '',
                score: d.score,
                rank: index + 1,
                completionTimeMs: d.completionTimeMs,
                challengeNumber: d.challengeNumber,
                timestamp: d.timestamp,
            };
        });
        let selfEntry = null;
        const selfDoc = await db.doc(`scores/${challengeNumber}/entries/${userId}`).get();
        if (selfDoc.exists) {
            const d = selfDoc.data();
            const higherSnap = await db
                .collection(`scores/${challengeNumber}/entries`)
                .where('score', '>', d.score)
                .count()
                .get();
            selfEntry = {
                userId: d.userId,
                displayName: (_a = d.displayName) !== null && _a !== void 0 ? _a : '',
                username: (_b = d.username) !== null && _b !== void 0 ? _b : '',
                avatarUrl: (_c = d.avatarUrl) !== null && _c !== void 0 ? _c : '',
                score: d.score,
                rank: higherSnap.data().count + 1,
                completionTimeMs: d.completionTimeMs,
                challengeNumber: d.challengeNumber,
                timestamp: d.timestamp,
            };
        }
        return {
            entries,
            selfEntry,
            totalCount: totalCountSnap.data().count,
            fetchedAt: Date.now(),
        };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to fetch leaderboard: ${err.message}`);
    }
});
//# sourceMappingURL=leaderboard.js.map