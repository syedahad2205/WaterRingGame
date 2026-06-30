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
exports.reportAntiCheat = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.reportAntiCheat = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to report anti-cheat data.');
    }
    const { challengeNumber, completionTimeMs, score, pressCount, sessionId } = request.data;
    const userId = request.auth.uid;
    const db = admin.firestore();
    let flagged = false;
    let reason = null;
    if (completionTimeMs < 5000) {
        flagged = true;
        reason = 'Completion time too fast (< 5 seconds).';
    }
    else if (score > challengeNumber * 1000) {
        flagged = true;
        reason = `Score ${score} exceeds maximum possible for challenge ${challengeNumber}.`;
    }
    const reportData = {
        challengeNumber,
        completionTimeMs,
        score,
        pressCount,
        sessionId,
        userId,
        flagged,
        reason,
        timestamp: Date.now(),
    };
    try {
        await db.doc(`antiCheat/${userId}/reports/${sessionId}`).set(reportData);
        if (flagged) {
            const flaggedRef = db.doc(`antiCheat/flaggedUsers/${userId}`);
            await db.runTransaction(async (tx) => {
                var _a, _b;
                const flaggedDoc = await tx.get(flaggedRef);
                const currentCount = flaggedDoc.exists ? ((_b = (_a = flaggedDoc.data()) === null || _a === void 0 ? void 0 : _a.count) !== null && _b !== void 0 ? _b : 0) : 0;
                tx.set(flaggedRef, {
                    userId,
                    count: currentCount + 1,
                    lastFlaggedAt: Date.now(),
                    lastReason: reason,
                }, { merge: true });
            });
        }
        return { accepted: true, flagged };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to report anti-cheat data: ${err.message}`);
    }
});
//# sourceMappingURL=antiCheat.js.map