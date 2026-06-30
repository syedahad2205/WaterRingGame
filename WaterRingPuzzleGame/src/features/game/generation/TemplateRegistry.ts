/**
 * TemplateRegistry
 *
 * Defines all 24 challenge template definitions with per-template physics
 * modifiers, timer multipliers, and weighted selection.
 *
 * Design reference: design.md § Challenge Templates
 * Requirements: 11.1
 *
 * Pure module — no side effects, no network calls, no store access.
 */

import { Xoshiro128StarStar } from './SeedGenerator';

// ─── Types ──────────────────────────────────────────────────────────────────

export type TemplateId =
  | 'Classic'
  | 'Precision'
  | 'MovingPegs'
  | 'LimitedPresses'
  | 'StrongCurrent'
  | 'TinyPegs'
  | 'HeavyRings'
  | 'LowGravity'
  | 'HighGravity'
  | 'RotatingObstacles'
  | 'Wind'
  | 'Maze'
  | 'BossChallenge'
  | 'ColorRestriction'
  | 'ConveyorBelt'
  | 'FrozenZones'
  | 'MultiplierRush'
  | 'MirrorMode'
  | 'ChainReaction'
  | 'InvisibleWater'
  | 'PressureZones'
  | 'DailyChallenge'
  | 'WeeklyBoss'
  | 'Seasonal';

export interface ChallengeTemplate {
  id: TemplateId;
  displayName: string;
  description: string;
  /** First challenge number this template can appear in. */
  minChallengeNumber: number;
  /** Multiplied by the base timer computed by DifficultyCalculator. */
  timerMultiplier: number;
  /** Peg size multiplier. 1.0 = normal, 0.6 = Precision, 0.25 = TinyPegs. */
  pegSizeMultiplier: number;
  /** Ring settle angle tolerance in degrees. Default 15°, Precision = 8°. */
  settleAngleTolerance: number;
  /** Gravity multiplier. 1.0 = normal. */
  gravityMultiplier: number;
  /** Ambient current multiplier. 1.0 = normal. */
  currentMultiplier: number;
  hasObstacles: boolean;
  hasMovingPegs: boolean;
  hasPressLimit: boolean;
  isBoss: boolean;
  isDaily: boolean;
  isWeekly: boolean;
  isSeasonal: boolean;
  /**
   * Secondary template IDs that cannot be combined with this template.
   * Checked by canCombine() for both directions.
   */
  forbiddenCombinations: TemplateId[];
  /**
   * Selection weights across four difficulty ranges:
   * [D < 10, D 10–30, D 30–60, D 60+]
   * Weight 0 means the template never appears in that range.
   */
  weights: [number, number, number, number];
}

// ─── Template Definitions ───────────────────────────────────────────────────

const TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'Classic',
    displayName: 'Classic',
    description: 'The standard Water Ring experience. Float the rings onto the pegs.',
    minChallengeNumber: 1,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [80, 35, 20, 12],
  },
  {
    id: 'Precision',
    displayName: 'Precision',
    description: 'Smaller pegs and tighter settle tolerance demand pinpoint control.',
    minChallengeNumber: 15,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 0.6,
    settleAngleTolerance: 8,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 15, 12, 8],
  },
  {
    id: 'MovingPegs',
    displayName: 'Moving Pegs',
    description: 'The pegs slide back and forth. Time your placement carefully.',
    minChallengeNumber: 40,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: true,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['TinyPegs'],
    weights: [0, 8, 10, 9],
  },
  {
    id: 'LimitedPresses',
    displayName: 'Limited Presses',
    description: 'You have a fixed number of button presses. Make every press count.',
    minChallengeNumber: 30,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: true,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['MultiplierRush'],
    weights: [0, 10, 8, 7],
  },
  {
    id: 'StrongCurrent',
    displayName: 'Strong Current',
    description: 'A powerful ambient current pushes rings off course. Fight the flow.',
    minChallengeNumber: 25,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 4.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 10, 8, 7],
  },
  {
    id: 'TinyPegs',
    displayName: 'Tiny Pegs',
    description: 'Minuscule pegs — only the most precise placement will land.',
    minChallengeNumber: 100,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 0.25,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['MovingPegs', 'InvisibleWater', 'PressureZones'],
    weights: [0, 0, 5, 6],
  },
  {
    id: 'HeavyRings',
    displayName: 'Heavy Rings',
    description: 'Rings sink faster and carry more momentum. Handle with care.',
    minChallengeNumber: 20,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 10, 8, 6],
  },
  {
    id: 'LowGravity',
    displayName: 'Low Gravity',
    description: 'Rings float dreamily — but overshooting is easy in the low-g field.',
    minChallengeNumber: 50,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 0.35,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 0, 7, 6],
  },
  {
    id: 'HighGravity',
    displayName: 'High Gravity',
    description: 'Crushing gravity accelerates rings downward. React fast.',
    minChallengeNumber: 60,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 2.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 0, 5, 5],
  },
  {
    id: 'RotatingObstacles',
    displayName: 'Rotating Obstacles',
    description: 'Spinning barriers sweep the arena. Thread the needle between rotations.',
    minChallengeNumber: 70,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: true,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 0, 4, 5],
  },
  {
    id: 'Wind',
    displayName: 'Wind',
    description: 'Gusts of wind periodically push rings sideways — a constant battle.',
    minChallengeNumber: 55,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 0, 5, 5],
  },
  {
    id: 'Maze',
    displayName: 'Maze',
    description: 'Walls and channels force rings through a labyrinthine path.',
    minChallengeNumber: 90,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: true,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['ChainReaction', 'MirrorMode'],
    weights: [0, 0, 3, 4],
  },
  {
    id: 'BossChallenge',
    displayName: 'Boss Challenge',
    description: 'An intense gauntlet with shortened timer. Prove your mastery.',
    minChallengeNumber: 50,
    timerMultiplier: 0.7,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: true,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['BossChallenge', 'DailyChallenge', 'WeeklyBoss'],
    weights: [0, 0, 0, 0],
  },
  {
    id: 'ColorRestriction',
    displayName: 'Color Restriction',
    description: 'Only rings of certain colors may be placed on each peg. Read the rules.',
    minChallengeNumber: 45,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['InvisibleWater'],
    weights: [0, 0, 5, 5],
  },
  {
    id: 'ConveyorBelt',
    displayName: 'Conveyor Belt',
    description: 'Invisible conveyor zones steadily drift rings toward hazards.',
    minChallengeNumber: 35,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 5, 5, 5],
  },
  {
    id: 'FrozenZones',
    displayName: 'Frozen Zones',
    description: 'Pockets of ice temporarily lock rings in place — use them or avoid them.',
    minChallengeNumber: 80,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: [],
    weights: [0, 0, 3, 4],
  },
  {
    id: 'MultiplierRush',
    displayName: 'Multiplier Rush',
    description: 'Chain placements quickly to build score multipliers. Speed matters.',
    minChallengeNumber: 1,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['LimitedPresses'],
    weights: [20, 15, 10, 8],
  },
  {
    id: 'MirrorMode',
    displayName: 'Mirror Mode',
    description: 'The arena is flipped horizontally. Left is right, right is left.',
    minChallengeNumber: 110,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['Maze'],
    weights: [0, 0, 0, 3],
  },
  {
    id: 'ChainReaction',
    displayName: 'Chain Reaction',
    description: 'Landing one ring triggers a shockwave that nudges all others.',
    minChallengeNumber: 130,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['Maze', 'InvisibleWater'],
    weights: [0, 0, 0, 3],
  },
  {
    id: 'InvisibleWater',
    displayName: 'Invisible Water',
    description: 'The water is hidden — navigate by feel alone.',
    minChallengeNumber: 150,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['TinyPegs', 'ColorRestriction', 'ChainReaction'],
    weights: [0, 0, 0, 2],
  },
  {
    id: 'PressureZones',
    displayName: 'Pressure Zones',
    description: 'High-pressure regions amplify water forces in certain areas of the arena.',
    minChallengeNumber: 120,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['TinyPegs'],
    weights: [0, 0, 0, 3],
  },
  {
    id: 'DailyChallenge',
    displayName: 'Daily Challenge',
    description: 'A globally shared challenge seeded by the calendar date. Compete worldwide.',
    minChallengeNumber: 1,
    timerMultiplier: 1.2,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: true,
    isWeekly: false,
    isSeasonal: false,
    forbiddenCombinations: ['BossChallenge', 'WeeklyBoss'],
    weights: [0, 0, 0, 0],
  },
  {
    id: 'WeeklyBoss',
    displayName: 'Weekly Boss',
    description: 'A punishing week-long boss challenge. Only the best will prevail.',
    minChallengeNumber: 1,
    timerMultiplier: 0.7,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: true,
    isDaily: false,
    isWeekly: true,
    isSeasonal: false,
    forbiddenCombinations: ['BossChallenge', 'DailyChallenge'],
    weights: [0, 0, 0, 0],
  },
  {
    id: 'Seasonal',
    displayName: 'Seasonal',
    description: 'A limited-time seasonal event challenge with unique visuals and rewards.',
    minChallengeNumber: 1,
    timerMultiplier: 1.0,
    pegSizeMultiplier: 1.0,
    settleAngleTolerance: 15,
    gravityMultiplier: 1.0,
    currentMultiplier: 1.0,
    hasObstacles: false,
    hasMovingPegs: false,
    hasPressLimit: false,
    isBoss: false,
    isDaily: false,
    isWeekly: false,
    isSeasonal: true,
    forbiddenCombinations: [],
    weights: [0, 0, 0, 0],
  },
];

// ─── Internal Lookup Map ─────────────────────────────────────────────────────

const TEMPLATE_MAP = new Map<TemplateId, ChallengeTemplate>(
  TEMPLATES.map(t => [t.id, t]),
);

// ─── Difficulty Range Index ──────────────────────────────────────────────────

/**
 * Map a difficulty score to the weight-array index.
 *
 * Index 0: D < 10
 * Index 1: D 10–30
 * Index 2: D 30–60
 * Index 3: D 60+
 */
function difficultyRangeIndex(difficultyScore: number): 0 | 1 | 2 | 3 {
  if (difficultyScore < 10) return 0;
  if (difficultyScore < 30) return 1;
  if (difficultyScore < 60) return 2;
  return 3;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Return the template with the given ID.
 * Throws if the ID is not registered.
 */
export function getTemplateById(id: TemplateId): ChallengeTemplate {
  const template = TEMPLATE_MAP.get(id);
  if (template === undefined) {
    throw new Error(`TemplateRegistry: unknown template id "${id}"`);
  }
  return template;
}

/**
 * Return all 24 registered templates.
 */
export function getAllTemplates(): ChallengeTemplate[] {
  return [...TEMPLATES];
}

/**
 * Return true if the primary and secondary template IDs are compatible
 * (i.e. they may be used together in the same challenge).
 *
 * The check is symmetric: if primary forbids secondary OR secondary forbids
 * primary the pair is incompatible.
 */
export function canCombine(primary: TemplateId, secondary: TemplateId): boolean {
  const primaryTemplate = getTemplateById(primary);
  const secondaryTemplate = getTemplateById(secondary);
  if (primaryTemplate.forbiddenCombinations.includes(secondary)) return false;
  if (secondaryTemplate.forbiddenCombinations.includes(primary)) return false;
  return true;
}

/**
 * Weighted-random template selection.
 *
 * Only templates whose `minChallengeNumber` ≤ `challengeNumber` are eligible.
 * Templates with weight 0 in the current difficulty range are excluded.
 *
 * If no eligible template has a non-zero weight (e.g. at very early challenge
 * numbers) the function falls back to the 'Classic' template.
 *
 * @param prng            - Seeded PRNG for deterministic selection.
 * @param difficultyScore - Current D(N) value (0–100).
 * @param challengeNumber - Current challenge number (≥ 1).
 */
export function selectTemplate(
  prng: Xoshiro128StarStar,
  difficultyScore: number,
  challengeNumber: number,
): ChallengeTemplate {
  const rangeIdx = difficultyRangeIndex(difficultyScore);

  // Build candidate list: eligible templates with positive weight in this range.
  const candidates = TEMPLATES.filter(
    t =>
      challengeNumber >= t.minChallengeNumber &&
      t.weights[rangeIdx] > 0,
  );

  if (candidates.length === 0) {
    // Fallback: Classic is always available from challenge 1.
    return getTemplateById('Classic');
  }

  // Weighted random selection.
  const totalWeight = candidates.reduce((sum, t) => sum + t.weights[rangeIdx], 0);
  let pick = prng.nextFloat() * totalWeight;

  for (const template of candidates) {
    pick -= template.weights[rangeIdx];
    if (pick <= 0) {
      return template;
    }
  }

  // Floating-point safety: return the last candidate.
  return candidates[candidates.length - 1];
}
