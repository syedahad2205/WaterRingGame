/**
 * ChallengeGenerator
 *
 * Pure, deterministic 12-step challenge generation pipeline.
 * Maps a challenge number → ChallengeConfig with no side effects,
 * no network calls, and no store access.
 *
 * Design reference: design.md § Challenge Generation System
 * Requirements: 11.1, 11.2, 11.3, 11.6
 */

import { deriveMasterSeed, deriveDailySeed, encodeChallengeCode } from './SeedGenerator';
import {
  difficultyScore,
  normalizedDifficulty,
  requiredRings as calcRequiredRings,
  decoyRings as calcDecoyRings,
  timerBase,
} from './DifficultyCalculator';
import { selectTemplate } from './TemplateRegistry';
import type {
  ChallengeConfig,
  RingConfig,
  PegConfig,
  ObstacleConfig,
  Vector2D,
} from '../../../types/challenge';

// ─── Constants ──────────────────────────────────────────────────────────────

const GENERATOR_VERSION = '1.0.0';

/** Arena dimensions (standard phone in dp). */
const ARENA_WIDTH = 390;
const ARENA_HEIGHT = 844;

/** Water surface is 5% from the top. */
const WATER_SURFACE_Y = ARENA_HEIGHT * 0.05;

/**
 * Peg count = clamp(2 + floor(D / PEG_DIFFICULTY_DIVISOR), 2, 8)
 * Divisor chosen so that at D=0 we get 2 pegs and at D=100 we get 10 (clamped to 8).
 */
const PEG_DIFFICULTY_DIVISOR = 12.5;

/** Maximum Poisson disk attempts per active point before discarding it. */
const POISSON_MAX_ATTEMPTS = 30;

/**
 * Peg zone: 10% padding from each edge of the arena.
 * Active peg zone = centre 80% width, bottom 40% height.
 */
const PEG_ZONE_X_MARGIN_FRACTION = 0.10; // 10% padding each side
const PEG_ZONE_Y_START_FRACTION = 0.60; // bottom 40% → starts at 60%

/**
 * Ring initial positions: upper 20% of arena (near water surface).
 * y ∈ [waterSurfaceY, 20% of arenaHeight]
 */
const RING_ZONE_Y_END_FRACTION = 0.20;

/** Minimum initial separation between ring spawn positions. */
const RING_MIN_SEPARATION = 60;

/** Available color palette (assigned cyclically). */
const COLOR_PALETTE = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'] as const;

/** Visual themes cycled every 20 challenges. */
const THEMES = ['ocean', 'beach', 'forest', 'desert', 'cave', 'space', 'zen'] as const;

/** Environment variants selected randomly. */
const ENVIRONMENTS = ['day', 'sunset', 'night', 'rain', 'fog'] as const;

// Ring physics defaults per size category
const RING_DEFAULTS: Record<
  'small' | 'medium' | 'large',
  {
    outerRadius: number;
    innerRadius: number;
    mass: number;
    buoyancy: number;
  }
> = {
  small: { outerRadius: 22, innerRadius: 13, mass: 0.5, buoyancy: 0.85 },
  medium: { outerRadius: 32, innerRadius: 19, mass: 1.0, buoyancy: 0.65 },
  large: { outerRadius: 44, innerRadius: 26, mass: 2.2, buoyancy: 0.45 },
};

// ─── Geometry Helpers ───────────────────────────────────────────────────────

function distance(a: Vector2D, b: Vector2D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ─── Step 5: Poisson Disk Peg Placement ─────────────────────────────────────

interface Zone {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Simplified Poisson disk sampling.
 *
 * Generates up to `count` well-separated points within `zone`.
 * Falls back to uniform random if the active list empties before reaching `count`.
 *
 * @param count     Desired point count.
 * @param zone      Bounding box for placement.
 * @param minDist   Minimum distance between any two points.
 * @param prng      Seeded PRNG (deterministic).
 */
function poissonDisk(
  count: number,
  zone: Zone,
  minDist: number,
  prng: ReturnType<typeof deriveMasterSeed>,
): Vector2D[] {
  const points: Vector2D[] = [];
  const active: Vector2D[] = [];

  // Place first point randomly inside zone.
  const firstX = zone.xMin + prng.nextFloat() * (zone.xMax - zone.xMin);
  const firstY = zone.yMin + prng.nextFloat() * (zone.yMax - zone.yMin);
  const first: Vector2D = { x: firstX, y: firstY };
  active.push(first);
  points.push(first);

  while (active.length > 0 && points.length < count) {
    // Pick a random active point.
    const activeIdx = prng.nextInt(0, active.length - 1);
    const current = active[activeIdx];
    let found = false;

    for (let attempt = 0; attempt < POISSON_MAX_ATTEMPTS; attempt++) {
      const angle = prng.nextFloat() * 2 * Math.PI;
      const dist = minDist * (1 + prng.nextFloat());
      const candidate: Vector2D = {
        x: current.x + dist * Math.cos(angle),
        y: current.y + dist * Math.sin(angle),
      };

      // Check within zone.
      if (
        candidate.x < zone.xMin ||
        candidate.x > zone.xMax ||
        candidate.y < zone.yMin ||
        candidate.y > zone.yMax
      ) {
        continue;
      }

      // Check minimum separation from all existing points.
      const tooClose = points.some(p => distance(p, candidate) < minDist);
      if (!tooClose) {
        active.push(candidate);
        points.push(candidate);
        found = true;
        break;
      }
    }

    if (!found) {
      // Remove exhausted point from active list.
      active.splice(activeIdx, 1);
    }
  }

  // Pad with random positions if Poisson disk didn't produce enough points.
  // Respect minimum separation; cap attempts to avoid infinite loops.
  const MAX_FALLBACK_ATTEMPTS = 500;
  let padAttempts = 0;
  while (points.length < count && padAttempts < MAX_FALLBACK_ATTEMPTS * count) {
    const candidate: Vector2D = {
      x: zone.xMin + prng.nextFloat() * (zone.xMax - zone.xMin),
      y: zone.yMin + prng.nextFloat() * (zone.yMax - zone.yMin),
    };
    const tooClose = points.some(p => distance(p, candidate) < minDist);
    if (!tooClose) {
      points.push(candidate);
    }
    padAttempts++;
  }
  // If we still can't reach `count` with full separation, truncate — the caller
  // will receive fewer pegs than requested. This preserves the separation
  // guarantee at the cost of peg count.


  return points;
}

// ─── Step 5: Build Pegs ──────────────────────────────────────────────────────

function buildPegs(
  d: number,
  nd: number,
  prng: ReturnType<typeof deriveMasterSeed>,
  colorIds: string[],
): PegConfig[] {
  const count = clamp(2 + Math.floor(d / PEG_DIFFICULTY_DIVISOR), 2, 8);

  // Compute peg base radius first (needed for min separation).
  const baseRadius = Math.max(10, 28 * (1 - 0.5 * nd));

  /**
   * Minimum peg separation: the larger of:
   *  - pegRadius × 2.5  (pegs need enough space relative to their size)
   *  - arenaWidth × 0.12 (absolute minimum to keep pegs readable)
   * Design reference: design.md § Step 5
   */
  const minSeparation = Math.max(baseRadius * 2.5, ARENA_WIDTH * 0.12);

  const zone: Zone = {
    xMin: ARENA_WIDTH * PEG_ZONE_X_MARGIN_FRACTION,
    xMax: ARENA_WIDTH * (1 - PEG_ZONE_X_MARGIN_FRACTION),
    yMin: ARENA_HEIGHT * PEG_ZONE_Y_START_FRACTION,
    yMax: ARENA_HEIGHT * 0.90, // 10% margin at the bottom
  };

  // Run Poisson disk with full minSeparation.
  let positions = poissonDisk(count, zone, minSeparation, prng);

  // Guarantee at least 2 pegs. If Poisson failed to produce 2, relax separation
  // by 50% and run a simple random fill that respects the relaxed distance.
  if (positions.length < 2) {
    const relaxedSep = minSeparation * 0.5;
    while (positions.length < 2) {
      const candidate: Vector2D = {
        x: zone.xMin + prng.nextFloat() * (zone.xMax - zone.xMin),
        y: zone.yMin + prng.nextFloat() * (zone.yMax - zone.yMin),
      };
      const tooClose = positions.some(p => distance(p, candidate) < relaxedSep);
      if (!tooClose) {
        positions.push(candidate);
      }
    }
  }

  return positions.slice(0, count).map((pos, idx) => {
    const colorId = colorIds[idx % colorIds.length];
    const tipRadius = baseRadius * 0.35;

    return {
      id: `peg-${idx}`,
      position: pos,
      height: baseRadius * 1.6,
      baseRadius,
      tipRadius,
      acceptedRingSizes: ['small', 'medium', 'large'] as const,
      acceptedColorId: colorId,
      isMoving: false,
      glowColor: colorId,
    };
  });
}

// ─── Step 6: Build Rings ─────────────────────────────────────────────────────

function buildRings(
  d: number,
  pegs: PegConfig[],
  prng: ReturnType<typeof deriveMasterSeed>,
): RingConfig[] {
  const nRequired = calcRequiredRings(d);
  const nDecoy = calcDecoyRings(d);
  const totalCount = nRequired + nDecoy;

  const ringZone: Zone = {
    xMin: 40,
    xMax: ARENA_WIDTH - 40,
    yMin: WATER_SURFACE_Y + 20,
    yMax: ARENA_HEIGHT * RING_ZONE_Y_END_FRACTION,
  };

  const positions = poissonDisk(totalCount, ringZone, RING_MIN_SEPARATION, prng);

  const rings: RingConfig[] = [];

  // Required rings (assigned to pegs by index).
  for (let i = 0; i < nRequired; i++) {
    const peg = pegs[i % pegs.length];
    const size: 'small' | 'medium' | 'large' = i < 2 ? 'small' : i < 4 ? 'medium' : 'large';
    const defaults = RING_DEFAULTS[size];

    rings.push({
      id: `ring-${i}`,
      outerRadius: defaults.outerRadius,
      innerRadius: defaults.innerRadius,
      mass: defaults.mass,
      buoyancy: defaults.buoyancy,
      angularDamping: 0.05,
      linearDamping: 0.08,
      restitution: 0.3,
      frictionAir: 0.02,
      sizeCategory: size,
      colorId: peg.acceptedColorId,
      skinId: 'default',
      isDecoy: false,
      initialPosition: positions[i],
    });
  }

  // Decoy rings: same colors as required rings (creates confusion at high difficulty)
  // or random colors at low difficulty.
  const nd = d / 100;
  for (let j = 0; j < nDecoy; j++) {
    const posIdx = nRequired + j;
    const size: 'small' | 'medium' | 'large' = 'medium';
    const defaults = RING_DEFAULTS[size];

    // High difficulty → reuse existing ring colors (confusing); low → random palette color
    let colorId: string;
    if (nd > 0.5 && rings.length > 0) {
      colorId = rings[prng.nextInt(0, nRequired - 1)].colorId;
    } else {
      colorId = prng.nextChoice(COLOR_PALETTE as unknown as string[]);
    }

    rings.push({
      id: `ring-${nRequired + j}`,
      outerRadius: defaults.outerRadius,
      innerRadius: defaults.innerRadius,
      mass: defaults.mass,
      buoyancy: defaults.buoyancy,
      angularDamping: 0.05,
      linearDamping: 0.08,
      restitution: 0.3,
      frictionAir: 0.02,
      sizeCategory: size,
      colorId,
      skinId: 'default',
      isDecoy: true,
      initialPosition: positions[posIdx] ?? {
        x: 40 + prng.nextFloat() * (ARENA_WIDTH - 80),
        y: WATER_SURFACE_Y + 20 + prng.nextFloat() * (ARENA_HEIGHT * 0.20),
      },
    });
  }

  return rings;
}

// ─── Step 7: Build Obstacles ─────────────────────────────────────────────────

function buildObstacles(
  template: { hasObstacles: boolean },
  prng: ReturnType<typeof deriveMasterSeed>,
): ObstacleConfig[] {
  if (!template.hasObstacles) {
    return [];
  }

  const count = prng.nextInt(1, 3);
  const obstacles: ObstacleConfig[] = [];

  for (let i = 0; i < count; i++) {
    // Place horizontal bars in the middle zone (40%–60% of arena height).
    const y = ARENA_HEIGHT * (0.40 + prng.nextFloat() * 0.20);
    const x = ARENA_WIDTH * (0.10 + prng.nextFloat() * 0.60);
    const width = 80 + prng.nextFloat() * 60;

    obstacles.push({
      id: `obstacle-${i}`,
      shape: 'rectangle',
      position: { x, y },
      angle: 0,
      width,
      height: 12,
      isMoving: false,
      restitution: 0.4,
      friction: 0.1,
    });
  }

  return obstacles;
}

// ─── Step 8: Water Current Profile ───────────────────────────────────────────

function buildWaterCurrentProfile(
  nd: number,
  template: { currentMultiplier: number },
  prng: ReturnType<typeof deriveMasterSeed>,
) {
  const ambientForce = nd * 0.05 * template.currentMultiplier * (prng.nextFloat() * 2 - 1);
  const turbulenceIntensity = 0.3 + nd * 0.5;
  const variationPattern = prng.nextInt(0, 7);

  return { ambientForce, turbulenceIntensity, variationPattern };
}

// ─── Step 9: Timer ────────────────────────────────────────────────────────────

function buildTimerConfig(d: number, template: { timerMultiplier: number }) {
  const totalSeconds = timerBase(d) * template.timerMultiplier;
  const amberThresholdSecs = totalSeconds * 0.3;
  const criticalThresholdSecs = totalSeconds * 0.1;
  return { totalSeconds, amberThresholdSecs, criticalThresholdSecs };
}

// ─── Step 10: Physics Modifiers ──────────────────────────────────────────────

function buildPhysicsModifiers(template: {
  gravityMultiplier: number;
  id: string;
}) {
  const gravityScale = template.gravityMultiplier;
  // HeavyRings → higher viscosity; LightRings → lower (not in 24 templates but handled gracefully)
  const waterViscosity =
    template.id === 'HeavyRings' ? 1.5 : template.id === 'LightRings' ? 0.7 : 1.0;
  // LowGravity → higher buoyancy
  const buoyancyMultiplier = template.id === 'LowGravity' ? 1.5 : 1.0;

  return { gravityScale, waterViscosity, buoyancyMultiplier };
}

// ─── Step 12: Challenge Intelligence Metadata ────────────────────────────────

function buildIntelligenceMetadata(
  d: number,
  nd: number,
  timer: { totalSeconds: number },
  template: { id: string },
  pegs: PegConfig[],
  rings: RingConfig[],
) {
  const predictedSolveTime = timer.totalSeconds * 0.6;
  // Placeholder until task 6.4.1 (ValidationSolver) is implemented.
  const successfulSolverStrategies = [0, 1];
  // Placeholder until task 6.4.2 (ChallengeScorer) is implemented.
  const qualityScore = 0.75;

  // Build difficulty driver descriptions based on challenge parameters.
  const difficultyDrivers: string[] = [];

  if (nd > 0.6) {
    difficultyDrivers.push('high_difficulty');
  }
  if (pegs.length >= 6) {
    difficultyDrivers.push('many_pegs');
  }
  const decoyCount = rings.filter(r => r.isDecoy).length;
  if (decoyCount >= 2) {
    difficultyDrivers.push('decoy_rings');
  }
  if (template.id === 'StrongCurrent' || template.id === 'Wind') {
    difficultyDrivers.push('strong_current');
  }
  if (template.id === 'Precision' || template.id === 'TinyPegs') {
    difficultyDrivers.push('small_pegs');
  }
  if (template.id === 'MovingPegs') {
    difficultyDrivers.push('moving_pegs');
  }
  if (template.id === 'LimitedPresses') {
    difficultyDrivers.push('limited_presses');
  }
  if (timer.totalSeconds < 90) {
    difficultyDrivers.push('tight_timer');
  }
  if (difficultyDrivers.length === 0) {
    difficultyDrivers.push('standard');
  }

  return {
    estimatedSolveTimeSecs: predictedSolveTime,
    successfulSolverStrategies,
    qualityScore,
    difficultyDrivers,
  };
}

// ─── Core Pipeline ───────────────────────────────────────────────────────────

/**
 * Execute the full 12-step challenge generation pipeline.
 *
 * @param prng            Root PRNG derived from the master/daily seed.
 * @param challengeNumber Canonical challenge number (0 = daily).
 * @param dailyDate       ISO date string for daily challenges; '' otherwise.
 * @param isBoss          True if N is a multiple of 50.
 * @param isDaily         True when generating a daily challenge.
 */
function runPipeline(
  prng: ReturnType<typeof deriveMasterSeed>,
  challengeNumber: number,
  dailyDate: string,
  isBoss: boolean,
  isDaily: boolean,
): ChallengeConfig {
  // ── Step 2: Difficulty Score (pure, no PRNG) ──────────────────────────────
  const d = difficultyScore(Math.max(1, challengeNumber));
  const nd = normalizedDifficulty(Math.max(1, challengeNumber));

  // ── Step 1: Template Selection ────────────────────────────────────────────
  const templatePrng = prng.fork();
  const template = selectTemplate(templatePrng, d, Math.max(1, challengeNumber));

  // ── Step 3: Visual Theme + Environment ───────────────────────────────────
  const themeIndex = Math.floor(Math.max(1, challengeNumber) / 20) % THEMES.length;
  const themeId = THEMES[themeIndex];
  const envPrng = prng.fork();
  const environmentId = envPrng.nextChoice(ENVIRONMENTS as unknown as string[]);

  // ── Step 4: Arena Layout ──────────────────────────────────────────────────
  const arena = {
    width: ARENA_WIDTH,
    height: ARENA_HEIGHT,
    waterSurfaceY: WATER_SURFACE_Y,
    themeId,
    environmentId,
  };

  // ── Step 5: Peg Placement (Poisson Disk) ──────────────────────────────────
  const pegPrng = prng.fork();
  const nPegs = clamp(2 + Math.floor(d / PEG_DIFFICULTY_DIVISOR), 2, 8);
  // Assign color IDs to pegs from the palette.
  const colorIds = Array.from({ length: nPegs }, (_, i) => COLOR_PALETTE[i % COLOR_PALETTE.length]);
  const pegs = buildPegs(d, nd, pegPrng, colorIds);

  // ── Step 6: Ring Placement + Bijection ────────────────────────────────────
  const ringPrng = prng.fork();
  const rings = buildRings(d, pegs, ringPrng);

  // ── Step 7: Obstacle Placement ────────────────────────────────────────────
  const obstaclePrng = prng.fork();
  const obstacles = buildObstacles(template, obstaclePrng);

  // ── Step 8: Water Current Profile ─────────────────────────────────────────
  const currentPrng = prng.fork();
  const waterCurrentProfile = buildWaterCurrentProfile(nd, template, currentPrng);

  // ── Step 9: Timer ─────────────────────────────────────────────────────────
  const timer = buildTimerConfig(d, template);

  // ── Step 10: Physics Modifiers ────────────────────────────────────────────
  const physicsModifiers = buildPhysicsModifiers(template);

  // ── Step 11: Environment Modifiers ────────────────────────────────────────
  // environmentId already set in Step 3.

  // ── Step 12: Challenge Intelligence Metadata ──────────────────────────────
  const intelligenceMetadata = buildIntelligenceMetadata(d, nd, timer, template, pegs, rings);

  return {
    challengeNumber,
    dailyDate,
    seed: encodeChallengeCode(challengeNumber),
    generatorVersion: GENERATOR_VERSION,
    templateId: template.id,
    difficultyScore: d,
    normalizedDifficulty: nd,
    arena,
    timer,
    rings,
    pegs,
    obstacles,
    waterCurrentProfile,
    physicsModifiers,
    intelligenceMetadata,
    isBossChallenge: isBoss,
    isDailyChallenge: isDaily,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Deterministically generate a ChallengeConfig for the given challenge number.
 *
 * Requirements: 1.6, 11.1, 11.2, 11.3, 11.6
 */
export function generateChallenge(challengeNumber: number): ChallengeConfig {
  const prng = deriveMasterSeed(challengeNumber);
  const isBoss = challengeNumber > 0 && challengeNumber % 50 === 0;
  return runPipeline(prng, challengeNumber, '', isBoss, false);
}

/**
 * ChallengeGenerator class — wraps the pure pipeline functions.
 *
 * Requirements: 11.1
 */
export class ChallengeGenerator {
  /**
   * Generate a challenge for the given challenge number.
   * Deterministic: same number → identical ChallengeConfig.
   */
  public generate(challengeNumber: number): ChallengeConfig {
    return generateChallenge(challengeNumber);
  }

  /**
   * Generate the daily challenge for the given calendar date.
   * All players on the same date receive the same config.
   */
  public generateDaily(date: Date): ChallengeConfig {
    const prng = deriveDailySeed(date);
    // Use a synthetic challenge number based on the Unix day number so
    // daily challenges get a meaningful difficulty progression.
    const dayNumber = Math.floor(date.getTime() / 86_400_000);
    const dailyDate = date.toISOString().split('T')[0];
    return runPipeline(prng, dayNumber, dailyDate, false, true);
  }
}
