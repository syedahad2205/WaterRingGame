/**
 * ChallengeHUD.tsx
 *
 * Top-of-screen HUD overlay for the GameScreen. Shows:
 *   - Challenge number and template icon
 *   - TimerArc (countdown arc with colour transitions)
 *   - Star progress bar (0–3 stars, fill based on time remaining)
 *   - Continue count used so far
 *
 * Rendered within the safe area inset — minimal vertical footprint.
 * All interactive/informational elements have accessibilityLabel.
 *
 * Requirements: 33.4, 33.5
 * Task: 8.2.3
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import TimerArc from './TimerArc';
import { DS } from '../constants/designSystem';
import { Icon, type IconName } from './icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChallengeHUDProps {
  /** Current challenge number (1-indexed). */
  challengeNumber: number;
  /** Template identifier string (e.g. "standard", "precision"). */
  templateId: string;
  /** Total timer seconds for this challenge. */
  totalSeconds: number;
  /** Seconds remaining on the timer. */
  remainingSeconds: number;
  /** Stars earned so far (0–3). */
  starsEarned: 0 | 1 | 2 | 3;
  /** Number of continues the player has used. */
  continueCount: number;
  /** Additional container style. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Template icon mapping
// ---------------------------------------------------------------------------

/** Maps template IDs to Icon component names. */
const TEMPLATE_ICONS: Record<string, IconName> = {
  standard: 'water-drop',
  precision: 'target',
  moving_pegs: 'settings',
  limited_presses: 'hint',
  strong_current: 'water-drop',
  pressure_zones: 'bolt',
  maze_navigation: 'search',
  boss: 'crown',
};

function getTemplateIconName(templateId: string): IconName {
  return TEMPLATE_ICONS[templateId] ?? 'water-drop';
}

// ---------------------------------------------------------------------------
// Star bar helper
// ---------------------------------------------------------------------------

function StarBar({ starsEarned }: { starsEarned: 0 | 1 | 2 | 3 }): React.JSX.Element {
  return (
    <View
      style={styles.starBar}
      accessible={true}
      accessibilityLabel={`${starsEarned} of 3 stars earned`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 3, now: starsEarned }}
    >
      {([1, 2, 3] as const).map((starIndex) => (
        <Icon
          key={starIndex}
          name="star-filled"
          size={18}
          color={starIndex <= starsEarned ? DS.colors.accent : 'rgba(255,255,255,0.25)'}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChallengeHUD Component
// ---------------------------------------------------------------------------

/**
 * ChallengeHUD — top overlay during active gameplay.
 *
 * Requirements: 33.4
 * Task: 8.2.3
 */
// eslint-disable-next-line max-lines-per-function
export default function ChallengeHUD({
  challengeNumber,
  templateId,
  totalSeconds,
  remainingSeconds,
  starsEarned,
  continueCount,
  style,
}: ChallengeHUDProps): React.JSX.Element {
  const templateIconName = getTemplateIconName(templateId);

  return (
    <View
      style={[styles.container, style]}
      accessible={false}
    >
      {/* Left section: challenge number + template icon */}
      <View style={styles.leftSection}>
        <Text
          style={styles.challengeNumber}
          accessible={true}
          accessibilityLabel={`Challenge ${challengeNumber}`}
          accessibilityRole="header"
        >
          #{challengeNumber}
        </Text>
        <Icon
          name={templateIconName}
          size={20}
          color={DS.colors.secondary}
          accessibilityLabel={`Template: ${templateId.replace(/_/g, ' ')}`}
        />
      </View>

      {/* Centre: TimerArc */}
      <TimerArc
        totalSeconds={totalSeconds}
        remainingSeconds={remainingSeconds}
        size={80}
        style={styles.timerArc}
      />

      {/* Right section: star progress + continue count */}
      <View style={styles.rightSection}>
        <StarBar starsEarned={starsEarned} />
        {continueCount > 0 ? (
          <View
            style={styles.continueRow}
            accessible={true}
            accessibilityLabel={`${continueCount} continue${continueCount !== 1 ? 's' : ''} used`}
          >
            <Text style={styles.continueCount}>+{continueCount}</Text>
            <Icon name="restart" size={14} color={DS.colors.info} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.lg,
    paddingVertical: DS.spacing.sm,
    backgroundColor: 'rgba(10, 30, 55, 0.82)',
    borderBottomWidth: 1,
    borderBottomColor: DS.colors.glass.border,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    gap: DS.spacing.xs,
  },
  challengeNumber: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.callout,
    fontWeight: DS.typography.weight.bold,
    letterSpacing: -0.5,
  },
  timerArc: {
    alignSelf: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 72,
    gap: DS.spacing.xxs,
  },
  starBar: {
    flexDirection: 'row',
    gap: DS.spacing.xxxs,
  },
  continueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxxs,
  },
  continueCount: {
    color: DS.colors.info,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
  },
});
