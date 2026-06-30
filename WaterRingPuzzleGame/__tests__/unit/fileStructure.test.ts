/**
 * fileStructure.test.ts — task 1.1.2a
 * Verifies that all 55+ required source files exist on disk.
 * Uses Node's fs.existsSync directly (no mock required; tests run in Node).
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');

const REQUIRED_FILES = [
  'src/app/App.tsx',
  'src/app/Navigation.tsx',
  'src/app/Providers.tsx',
  'src/components/WaterButton.tsx',
  'src/components/TimerArc.tsx',
  'src/components/ChallengeHUD.tsx',
  'src/components/PressCounterHUD.tsx',
  'src/components/AchievementUnlockBanner.tsx',
  'src/constants/difficulty.ts',
  'src/constants/economy.ts',
  'src/constants/physics.ts',
  'src/constants/remoteConfigDefaults.ts',
  'src/constants/ui.ts',
  'src/features/audio/AudioEngine.ts',
  'src/features/audio/HapticManager.ts',
  'src/features/audio/MusicLayerManager.ts',
  'src/features/audio/SFXManager.ts',
  'src/features/economy/AdService.ts',
  'src/features/economy/CoinLedger.ts',
  'src/features/economy/ContinueService.ts',
  'src/features/economy/EconomyService.ts',
  'src/features/economy/PurchaseService.ts',
  'src/features/game/adaptive/AdaptiveAssistController.ts',
  'src/features/game/core/GameLoop.ts',
  'src/features/game/core/InputController.ts',
  'src/features/game/core/WinCondition.ts',
  'src/features/game/generation/ChallengeGenerator.ts',
  'src/features/game/generation/ChallengeScorer.ts',
  'src/features/game/generation/DifficultyCalculator.ts',
  'src/features/game/generation/QualityEvaluator.ts',
  'src/features/game/generation/SeedGenerator.ts',
  'src/features/game/generation/TemplateRegistry.ts',
  'src/features/game/generation/ValidationSolver.ts',
  'src/features/game/physics/PhysicsWorld.ts',
  'src/features/game/physics/RingBody.ts',
  'src/features/game/physics/PegBody.ts',
  'src/features/game/rendering/BubbleSystem.ts',
  'src/features/game/rendering/DeviceTierManager.ts',
  'src/features/game/rendering/RippleSystem.ts',
  'src/features/game/rendering/WaterDisplacement.ts',
  'src/features/progression/AchievementEngine.ts',
  'src/features/progression/CollectionTracker.ts',
  'src/features/progression/LevelSystem.ts',
  'src/features/progression/MasteryTracker.ts',
  'src/features/progression/PrestigeSystem.ts',
  'src/features/progression/XPSystem.ts',
  'src/features/replay/ReplayCompressor.ts',
  'src/features/replay/ReplayPlayer.ts',
  'src/features/replay/ReplayRecorder.ts',
  'src/features/replay/ReplayStorageService.ts',
  'src/features/social/ChallengeShareService.ts',
  'src/features/social/LeaderboardService.ts',
  'src/screens/GameScreen.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/VictoryScreen.tsx',
  'src/screens/DefeatScreen.tsx',
  'src/services/firebase/AuthService.ts',
  'src/services/firebase/FirestoreService.ts',
  'src/services/firebase/RemoteConfigService.ts',
  'src/services/sync/SyncManager.ts',
  'src/services/sync/ConflictResolver.ts',
  'src/store/slices/playerSlice.ts',
  'src/store/slices/economySlice.ts',
  'src/store/slices/challengeSlice.ts',
  'src/store/slices/cosmeticsSlice.ts',
  'functions/src/leaderboard.ts',
  'functions/src/economy.ts',
  'functions/src/dailyChallenge.ts',
  'functions/src/antiCheat.ts',
];

describe('Required source files exist', () => {
  it('REQUIRED_FILES list contains at least 55 entries', () => {
    expect(REQUIRED_FILES.length).toBeGreaterThanOrEqual(55);
  });

  REQUIRED_FILES.forEach((relativePath) => {
    it(`exists: ${relativePath}`, () => {
      const fullPath = path.join(ROOT, relativePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });
});
