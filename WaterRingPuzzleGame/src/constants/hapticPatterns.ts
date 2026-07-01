/**
 * ============================================================================
 * Haptic Pattern Mappings
 * ============================================================================
 *
 * Maps semantic UI / game actions to HapticManager event names.
 * Provides a single `triggerHaptic` helper so callers never need to import
 * HapticManager directly — just the pattern key.
 *
 * Usage:
 *   import { triggerHaptic } from '@/constants/hapticPatterns';
 *   triggerHaptic('buttonPress');
 *   triggerHaptic('ringLandOnPeg');
 *
 * @module hapticPatterns
 */

import { HapticManager, type HapticEvent } from '../features/audio/HapticManager';

// ============================================================================
// SECTION: Pattern Map
// ============================================================================

/**
 * Complete mapping from semantic action names to HapticManager event names.
 *
 * Each key describes *what the user is doing*; each value maps to one of the
 * 25 named HapticEvent entries defined in HapticManager which encode the exact
 * amplitude / timing / sharpness pattern.
 */
export const HAPTIC_PATTERNS = {
  // ── UI interactions ──────────────────────────────────────────────────────

  /** Standard button tap — light, responsive. */
  buttonPress: 'buttonTap' as HapticEvent,

  /** Hard / important button (e.g. CTA, purchase) — heavier impact. */
  buttonPressHard: 'buttonHoldPeak' as HapticEvent,

  /** Toggle switch flipped. */
  toggleSwitch: 'navigationTap' as HapticEvent,

  /** Tab bar item selected. */
  tabSwitch: 'navigationTap' as HapticEvent,

  /** Slider thumb crossing a discrete tick mark. */
  sliderTick: 'navigationTap' as HapticEvent,

  /** Long-press hold initiation. */
  longPressStart: 'buttonHoldStart' as HapticEvent,

  /** Long-press sustained feedback. */
  longPressSustain: 'buttonHoldSustained' as HapticEvent,

  /** Long-press reaching peak intensity. */
  longPressPeak: 'buttonHoldPeak' as HapticEvent,

  // ── Game mechanics ───────────────────────────────────────────────────────

  /** Pressing the water-push button lightly. */
  waterPress: 'buttonTap' as HapticEvent,

  /** Pressing the water-push button hard / at full force. */
  waterPressHard: 'buttonHoldPeak' as HapticEvent,

  /** Both water buttons pressed simultaneously. */
  waterSimultaneous: 'simultaneousPress' as HapticEvent,

  /** Light ring-to-ring collision in water. */
  ringCollision: 'ringCollisionLight' as HapticEvent,

  /** Heavy ring-to-ring collision. */
  ringCollisionHeavy: 'ringCollisionHeavy' as HapticEvent,

  /** Ring hitting the arena wall. */
  ringWallHit: 'ringWallCollision' as HapticEvent,

  /** Ring entering proximity zone of a peg — subtle cue. */
  ringNearPeg: 'ringNearPeg' as HapticEvent,

  /** Ring successfully lands on a peg — satisfying thunk. */
  ringLandOnPeg: 'ringLandedPeg' as HapticEvent,

  /** Ring lands perfectly centred on a peg. */
  ringPerfectLand: 'perfectPlacement' as HapticEvent,

  /** Attempted placement on an already-occupied peg. */
  pegOccupied: 'pegOccupied' as HapticEvent,

  /** Rapid tapping during frenzy mode. */
  rapidTap: 'rapidTap' as HapticEvent,

  /** Combo multiplier incremented. */
  comboHit: 'buttonHoldStart' as HapticEvent,

  // ── Timer events ─────────────────────────────────────────────────────────

  /** Timer entering warning zone. */
  timerWarning: 'timerWarning' as HapticEvent,

  /** Timer entering critical zone. */
  timerCritical: 'timerCritical' as HapticEvent,

  // ── Outcome feedback ─────────────────────────────────────────────────────

  /** Level / challenge victory. */
  victory: 'victory' as HapticEvent,

  /** Level / challenge defeat. */
  defeat: 'defeat' as HapticEvent,

  /** Boss level victory — epic escalating pattern. */
  bossVictory: 'bossVictory' as HapticEvent,

  /** Continue granted (extra life used). */
  continueGranted: 'continueGranted' as HapticEvent,

  // ── Progression / economy ────────────────────────────────────────────────

  /** Achievement unlocked. */
  achievement: 'achievementUnlock' as HapticEvent,

  /** Generic reward received. */
  reward: 'achievementUnlock' as HapticEvent,

  /** Coin earned / collected. */
  coinEarned: 'coinEarn' as HapticEvent,

  /** In-app purchase confirmed. */
  purchaseConfirm: 'purchaseConfirm' as HapticEvent,

  /** Cosmetic item equipped. */
  cosmeticEquipped: 'cosmeticEquipped' as HapticEvent,

  // ── Error / warning feedback ─────────────────────────────────────────────

  /** Generic error feedback. */
  error: 'actionBlocked' as HapticEvent,

  /** Warning — less severe than error. */
  warning: 'timerWarning' as HapticEvent,

  /** Action blocked / not allowed. */
  actionBlocked: 'actionBlocked' as HapticEvent,

  // ── Navigation ───────────────────────────────────────────────────────────

  /** Screen transition — subtle orientation tap. */
  screenTransition: 'navigationTap' as HapticEvent,

  /** Modal / bottom sheet opening. */
  modalOpen: 'buttonTap' as HapticEvent,

  /** Modal / bottom sheet closing. */
  modalClose: 'navigationTap' as HapticEvent,

  /** Pull-to-refresh threshold reached. */
  pullToRefresh: 'buttonHoldStart' as HapticEvent,
} as const;

// ============================================================================
// SECTION: Types
// ============================================================================

/** Union type of all semantic haptic pattern keys. */
export type HapticPatternName = keyof typeof HAPTIC_PATTERNS;

// ============================================================================
// SECTION: Helper
// ============================================================================

/**
 * Trigger a haptic event by semantic pattern name.
 *
 * Looks up the HapticManager event corresponding to the given pattern and
 * fires it through the singleton HapticManager. This is the recommended
 * entry point for all haptic feedback in the app — it decouples callers
 * from the underlying HapticEvent names and amplitude patterns.
 *
 * No-op on unsupported devices or when haptics are disabled.
 *
 * @param pattern - Semantic name of the haptic pattern to trigger.
 *
 * @example
 * ```ts
 * import { triggerHaptic } from '@/constants/hapticPatterns';
 *
 * // In a button's onPressIn handler:
 * triggerHaptic('buttonPress');
 *
 * // After a ring lands on a peg:
 * triggerHaptic('ringLandOnPeg');
 * ```
 */
export function triggerHaptic(pattern: HapticPatternName): void {
  const event = HAPTIC_PATTERNS[pattern];
  HapticManager.trigger(event);
}
