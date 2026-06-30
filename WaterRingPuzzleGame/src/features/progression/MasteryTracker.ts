/**
 * MasteryTracker.ts
 * Tracks per-template challenge completions and awards mastery tiers.
 * Requirement: 11.2.1
 */

import { useEconomyStore } from '../../store/slices/economySlice';

export type TemplateType =
  | 'standard'
  | 'precision'
  | 'moving_pegs'
  | 'limited_presses'
  | 'strong_current'
  | 'multi_ball';

export type MasteryLevel = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface MasteryRecord {
  templateType: TemplateType;
  completions: number;
  masteryLevel: MasteryLevel;
}

/** Completion counts required to reach each mastery tier */
export const MASTERY_THRESHOLDS: Record<MasteryLevel, number> = {
  none: 0,
  bronze: 10,
  silver: 25,
  gold: 50,
  platinum: 100,
};

const MASTERY_ORDER: MasteryLevel[] = ['none', 'bronze', 'silver', 'gold', 'platinum'];

/**
 * Derives the mastery level for a given completion count.
 * @param completions - Number of times the template has been completed.
 */
export function masteryLevelFromCompletions(completions: number): MasteryLevel {
  let level: MasteryLevel = 'none';
  for (const tier of MASTERY_ORDER) {
    if (completions >= MASTERY_THRESHOLDS[tier]) {
      level = tier;
    }
  }
  return level;
}

/**
 * Returns the coin reward granted when reaching a mastery milestone.
 * @param level - The mastery level achieved.
 */
export function getMasteryReward(level: MasteryLevel): number {
  const rewards: Record<MasteryLevel, number> = {
    none: 0,
    bronze: 100,
    silver: 250,
    gold: 500,
    platinum: 1000,
  };
  return rewards[level];
}

const ALL_TEMPLATES: TemplateType[] = [
  'standard',
  'precision',
  'moving_pegs',
  'limited_presses',
  'strong_current',
  'multi_ball',
];

export class MasteryTracker {
  private records: Map<TemplateType, MasteryRecord>;

  constructor(initialRecords?: Partial<Record<TemplateType, number>>) {
    this.records = new Map();
    for (const type of ALL_TEMPLATES) {
      const completions = initialRecords?.[type] ?? 0;
      this.records.set(type, {
        templateType: type,
        completions,
        masteryLevel: masteryLevelFromCompletions(completions),
      });
    }
  }

  /**
   * Records a single completion for the given template type.
   * Automatically credits mastery rewards when a new tier is reached.
   * @param templateType - The template type that was completed.
   * @returns The new mastery level if a milestone was crossed, otherwise null.
   */
  recordCompletion(templateType: TemplateType): { newMasteryLevel: MasteryLevel | null } {
    const record = this.records.get(templateType)!;
    const prevLevel = record.masteryLevel;
    record.completions += 1;
    const newLevel = masteryLevelFromCompletions(record.completions);
    record.masteryLevel = newLevel;

    if (newLevel !== prevLevel) {
      const reward = getMasteryReward(newLevel);
      if (reward > 0) {
        useEconomyStore
          .getState()
          .creditCoins(reward, `mastery_${templateType}_${newLevel}`);
      }
      return { newMasteryLevel: newLevel };
    }

    return { newMasteryLevel: null };
  }

  /**
   * Returns the mastery record for a specific template type.
   */
  getRecord(templateType: TemplateType): MasteryRecord {
    return { ...this.records.get(templateType)! };
  }

  /** Returns all mastery records as an array. */
  getAllRecords(): MasteryRecord[] {
    return Array.from(this.records.values()).map((r) => ({ ...r }));
  }

  /**
   * Serialises completion counts for persistence.
   * @returns A plain object mapping each template type to its completion count.
   */
  serialize(): Record<TemplateType, number> {
    return Object.fromEntries(
      Array.from(this.records.entries()).map(([k, v]) => [k, v.completions]),
    ) as Record<TemplateType, number>;
  }
}
