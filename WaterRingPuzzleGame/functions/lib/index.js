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
exports.getChallengeIntelligence = exports.reportAntiCheat = exports.generateDailyChallenge = exports.getDailyChallenge = exports.spendCoins = exports.creditCoins = exports.getLeaderboard = exports.submitScore = void 0;
const admin = __importStar(require("firebase-admin"));
// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
    admin.initializeApp();
}
var leaderboard_1 = require("./leaderboard");
Object.defineProperty(exports, "submitScore", { enumerable: true, get: function () { return leaderboard_1.submitScore; } });
Object.defineProperty(exports, "getLeaderboard", { enumerable: true, get: function () { return leaderboard_1.getLeaderboard; } });
var economy_1 = require("./economy");
Object.defineProperty(exports, "creditCoins", { enumerable: true, get: function () { return economy_1.creditCoins; } });
Object.defineProperty(exports, "spendCoins", { enumerable: true, get: function () { return economy_1.spendCoins; } });
var dailyChallenge_1 = require("./dailyChallenge");
Object.defineProperty(exports, "getDailyChallenge", { enumerable: true, get: function () { return dailyChallenge_1.getDailyChallenge; } });
Object.defineProperty(exports, "generateDailyChallenge", { enumerable: true, get: function () { return dailyChallenge_1.generateDailyChallenge; } });
var antiCheat_1 = require("./antiCheat");
Object.defineProperty(exports, "reportAntiCheat", { enumerable: true, get: function () { return antiCheat_1.reportAntiCheat; } });
var challengeIntelligence_1 = require("./challengeIntelligence");
Object.defineProperty(exports, "getChallengeIntelligence", { enumerable: true, get: function () { return challengeIntelligence_1.getChallengeIntelligence; } });
//# sourceMappingURL=index.js.map