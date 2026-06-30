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
exports.generateDailyChallenge = exports.getDailyChallenge = void 0;
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
function hashDate(dateStr) {
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
        const char = dateStr.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}
exports.getDailyChallenge = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to get daily challenge.');
    }
    const { date } = request.data;
    const targetDate = date !== null && date !== void 0 ? date : new Date().toISOString().slice(0, 10);
    const db = admin.firestore();
    try {
        const docRef = db.doc(`dailyChallenges/${targetDate}`);
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            return {
                challengeNumber: data.challengeNumber,
                date: data.date,
                seed: data.seed,
            };
        }
        const dateHash = hashDate(targetDate);
        const challengeNumber = (dateHash % 500) + 1;
        const seed = dateHash % 100000;
        return {
            challengeNumber,
            date: targetDate,
            seed,
        };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to get daily challenge: ${err.message}`);
    }
});
exports.generateDailyChallenge = (0, scheduler_1.onSchedule)('every 24 hours', async () => {
    const db = admin.firestore();
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const dateHash = hashDate(tomorrow);
    const challengeNumber = (dateHash % 500) + 1;
    const seed = Date.now() % 100000;
    await db.doc(`dailyChallenges/${tomorrow}`).set({
        challengeNumber,
        date: tomorrow,
        seed,
        generatedAt: Date.now(),
    });
});
//# sourceMappingURL=dailyChallenge.js.map