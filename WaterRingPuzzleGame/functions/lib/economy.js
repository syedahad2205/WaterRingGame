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
exports.spendCoins = exports.creditCoins = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
exports.creditCoins = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to credit coins.');
    }
    const { amount, source, txId } = request.data;
    if (!amount || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'amount must be > 0.');
    }
    if (amount > 10000) {
        throw new https_1.HttpsError('invalid-argument', 'amount must be <= 10000.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.doc(`users/${userId}`);
    try {
        let newBalance = 0;
        await db.runTransaction(async (tx) => {
            var _a, _b;
            const userDoc = await tx.get(userRef);
            const currentBalance = userDoc.exists ? ((_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.coinBalance) !== null && _b !== void 0 ? _b : 0) : 0;
            newBalance = currentBalance + amount;
            tx.set(userRef, { coinBalance: newBalance }, { merge: true });
        });
        const ledgerId = txId !== null && txId !== void 0 ? txId : db.collection(`economy/${userId}/ledger`).doc().id;
        await db.doc(`economy/${userId}/ledger/${ledgerId}`).set({
            type: 'credit',
            amount,
            source,
            txId: ledgerId,
            newBalance,
            timestamp: Date.now(),
        });
        return { newBalance, success: true };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to credit coins: ${err.message}`);
    }
});
exports.spendCoins = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to spend coins.');
    }
    const { amount, source, itemId } = request.data;
    if (!amount || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'amount must be > 0.');
    }
    const userId = request.auth.uid;
    const db = admin.firestore();
    const userRef = db.doc(`users/${userId}`);
    try {
        let newBalance = 0;
        let insufficient = false;
        await db.runTransaction(async (tx) => {
            var _a, _b;
            const userDoc = await tx.get(userRef);
            const currentBalance = userDoc.exists ? ((_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.coinBalance) !== null && _b !== void 0 ? _b : 0) : 0;
            if (currentBalance < amount) {
                insufficient = true;
                return;
            }
            newBalance = currentBalance - amount;
            tx.set(userRef, { coinBalance: newBalance }, { merge: true });
        });
        if (insufficient) {
            return { success: false, reason: 'insufficient_funds' };
        }
        const ledgerId = db.collection(`economy/${userId}/ledger`).doc().id;
        await db.doc(`economy/${userId}/ledger/${ledgerId}`).set({
            type: 'spend',
            amount,
            source,
            itemId: itemId !== null && itemId !== void 0 ? itemId : null,
            txId: ledgerId,
            newBalance,
            timestamp: Date.now(),
        });
        return { newBalance, success: true };
    }
    catch (err) {
        throw new https_1.HttpsError('internal', `Failed to spend coins: ${err.message}`);
    }
});
//# sourceMappingURL=economy.js.map