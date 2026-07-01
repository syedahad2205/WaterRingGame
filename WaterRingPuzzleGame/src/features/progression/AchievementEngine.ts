/**
 * AchievementEngine.ts
 * Defines and evaluates the 20 in-game achievements.
 * Requirement: 11.2.2
 */


import { gameEventEmitter } from '../../utils/GameEventEmitter';

export type AchievementId = string;

export type AchievementConditionType =
  | 'challenge_count'
  | 'star_count'
  | 'win_streak'
  | 'no_continue_win'
  | 'speed_win'
  | 'daily_count'
  | 'prestige'
  | 'leaderboard_top10'
  | 'mastery_bronze_all'
  | 'mastery_platinum_any';

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  iconName: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  xpReward: number;
  conditionType: AchievementConditionType;
  conditionValue: number;
}

export interface AchievementProgress {
  id: AchievementId;
  unlocked: boolean;
  progress: number;
  unlockedAt?: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_win',        name: 'First Victory',        description: 'Complete 1 challenge',          iconName: 'trophy',      tier: 'bronze',   xpReward: 50,   conditionType: 'challenge_count',    conditionValue: 1   },
  { id: 'ten_wins',         name: 'Getting Warmed Up',    description: 'Complete 10 challenges',        iconName: 'flame',       tier: 'bronze',   xpReward: 100,  conditionType: 'challenge_count',    conditionValue: 10  },
  { id: 'fifty_wins',       name: 'Half Century',         description: 'Complete 50 challenges',        iconName: 'star',        tier: 'silver',   xpReward: 300,  conditionType: 'challenge_count',    conditionValue: 50  },
  { id: 'hundred_wins',     name: 'Centurion',            description: 'Complete 100 challenges',       iconName: 'target',      tier: 'gold',     xpReward: 600,  conditionType: 'challenge_count',    conditionValue: 100 },
  { id: 'fivehundred_wins', name: 'Legend',               description: 'Complete 500 challenges',       iconName: 'crown',       tier: 'platinum', xpReward: 2000, conditionType: 'challenge_count',    conditionValue: 500 },
  { id: 'star_collector',   name: 'Star Collector',       description: 'Earn 50 stars total',           iconName: 'star',        tier: 'bronze',   xpReward: 150,  conditionType: 'star_count',         conditionValue: 50  },
  { id: 'star_hoarder',     name: 'Star Hoarder',         description: 'Earn 200 stars total',          iconName: 'star',        tier: 'silver',   xpReward: 400,  conditionType: 'star_count',         conditionValue: 200 },
  { id: 'star_master',      name: 'Star Master',          description: 'Earn 1000 stars total',         iconName: 'star',        tier: 'gold',     xpReward: 1200, conditionType: 'star_count',         conditionValue: 1000},
  { id: 'streak_5',         name: 'On a Roll',            description: 'Win 5 challenges in a row',     iconName: 'target',      tier: 'bronze',   xpReward: 120,  conditionType: 'win_streak',         conditionValue: 5   },
  { id: 'streak_20',        name: 'Unstoppable',          description: 'Win 20 challenges in a row',    iconName: 'lightning',   tier: 'silver',   xpReward: 350,  conditionType: 'win_streak',         conditionValue: 20  },
  { id: 'pure_win_1',       name: 'No Safety Net',        description: 'Win 1 challenge without continues', iconName: 'shield',  tier: 'bronze',   xpReward: 80,   conditionType: 'no_continue_win',    conditionValue: 1   },
  { id: 'pure_win_25',      name: 'Purist',               description: 'Win 25 challenges without continues', iconName: 'trophy', tier: 'gold',   xpReward: 700,  conditionType: 'no_continue_win',    conditionValue: 25  },
  { id: 'speed_win_1',      name: 'Speed Demon',          description: 'Win a challenge with >45s remaining', iconName: 'lightning', tier: 'bronze', xpReward: 100, conditionType: 'speed_win',         conditionValue: 1   },
  { id: 'speed_win_10',     name: 'Flash',                description: 'Win 10 challenges with >45s remaining', iconName: 'lightning', tier: 'silver', xpReward: 400, conditionType: 'speed_win',    conditionValue: 10  },
  { id: 'daily_10',         name: 'Daily Devotee',        description: 'Complete 10 daily challenges',  iconName: 'timer',       tier: 'bronze',   xpReward: 150,  conditionType: 'daily_count',        conditionValue: 10  },
  { id: 'daily_50',         name: 'Daily Champion',       description: 'Complete 50 daily challenges',  iconName: 'timer',       tier: 'gold',     xpReward: 800,  conditionType: 'daily_count',        conditionValue: 50  },
  { id: 'prestige_1',       name: 'Reborn',               description: 'Prestige for the first time',   iconName: 'crown',       tier: 'gold',     xpReward: 1000, conditionType: 'prestige',           conditionValue: 1   },
  { id: 'leaderboard',      name: 'Top of the World',     description: 'Reach top 10 on leaderboard',   iconName: 'leaderboard', tier: 'platinum', xpReward: 1500, conditionType: 'leaderboard_top10',  conditionValue: 1   },
  { id: 'mastery_bronze',   name: 'Versatile',            description: 'Reach bronze mastery on all template types', iconName: 'shield', tier: 'silver', xpReward: 500, conditionType: 'mastery_bronze_all', conditionValue: 1 },
  { id: 'mastery_plat',     name: 'Specialist',           description: 'Reach platinum mastery on any template', iconName: 'gem', tier: 'platinum', xpReward: 2000, conditionType: 'mastery_platinum_any', conditionValue: 1 },
];

type Snapshot = {
  challengesCompleted: number;
  totalStars: number;
  currentWinStreak: number;
  noContWins: number;
  fastWins: number;
  dailiesCompleted: number;
  prestigeCount: number;
  inTop10: boolean;
  allTemplateBronze: boolean;
  anyTemplatePlatinum: boolean;
};

function snapshotValue(snapshot: Snapshot, def: AchievementDefinition): number {
  switch (def.conditionType) {
    case 'challenge_count':    return snapshot.challengesCompleted;
    case 'star_count':         return snapshot.totalStars;
    case 'win_streak':         return snapshot.currentWinStreak;
    case 'no_continue_win':    return snapshot.noContWins;
    case 'speed_win':          return snapshot.fastWins;
    case 'daily_count':        return snapshot.dailiesCompleted;
    case 'prestige':           return snapshot.prestigeCount;
    case 'leaderboard_top10':  return snapshot.inTop10 ? 1 : 0;
    case 'mastery_bronze_all': return snapshot.allTemplateBronze ? 1 : 0;
    case 'mastery_platinum_any': return snapshot.anyTemplatePlatinum ? 1 : 0;
    default: {
      // Runtime safety: return 0 for any unrecognized condition type
      // (e.g. from stale persisted data or future additions).
      return 0;
    }
  }
}

export class AchievementEngine {
  /** Set of achievement IDs already reported as unlocked by this engine instance. */
  private readonly reportedUnlocks = new Set<AchievementId>();

  /**
   * Evaluates which achievements are newly unlocked given a player state snapshot.
   * Tracks previously reported unlocks internally so each achievement is only
   * returned once across the lifetime of this engine instance.
   * Fires `achievement_unlocked` events via GameEventEmitter for each new unlock.
   *
   * @param snapshot - Current player state.
   * @returns Array of newly unlocked achievement IDs (empty if none are new).
   */
  evaluate(snapshot: Snapshot): AchievementId[] {
    const newlyUnlocked: AchievementId[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      if (this.reportedUnlocks.has(def.id)) {
        continue;
      }

      const value = snapshotValue(snapshot, def);
      if (value >= def.conditionValue) {
        this.reportedUnlocks.add(def.id);
        newlyUnlocked.push(def.id);

        gameEventEmitter.emit('achievement_unlocked', {
          id: def.id,
          name: def.name,
          xpReward: def.xpReward,
          tier: def.tier,
          unlockedAt: Date.now(),
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Seed the internal unlock tracker with achievements the player has already
   * earned (e.g., loaded from persisted state). Call this before the first
   * `evaluate()` to prevent re-firing events for previously unlocked achievements.
   *
   * @param unlockedIds - Achievement IDs already unlocked.
   */
  seedUnlocked(unlockedIds: AchievementId[]): void {
    for (const id of unlockedIds) {
      this.reportedUnlocks.add(id);
    }
  }

  /**
   * Returns full progress details for all achievements, marking which are
   * newly unlocked (not in unlockedIds) and emitting events for those.
   * @param snapshot - Current player state.
   * @param unlockedIds - Achievement IDs already unlocked before this call.
   */
  getProgress(snapshot: Snapshot, unlockedIds: string[]): AchievementProgress[] {
    const unlockedSet = new Set(unlockedIds);
    const result: AchievementProgress[] = [];

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const value = snapshotValue(snapshot, def);
      const meetsCondition = value >= def.conditionValue;
      const alreadyUnlocked = unlockedSet.has(def.id);

      if (meetsCondition && !alreadyUnlocked) {
        gameEventEmitter.emit('achievement_unlocked', {
          id: def.id,
          name: def.name,
          xpReward: def.xpReward,
          tier: def.tier,
          unlockedAt: Date.now(),
        });
      }

      result.push({
        id: def.id,
        unlocked: meetsCondition || alreadyUnlocked,
        progress: Math.min(value, def.conditionValue),
        unlockedAt: meetsCondition && !alreadyUnlocked ? Date.now() : undefined,
      });
    }

    return result;
  }
}
