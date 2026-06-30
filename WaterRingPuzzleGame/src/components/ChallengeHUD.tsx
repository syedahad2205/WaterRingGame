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

/** Maps template IDs to simple emoji icons. */
const TEMPLATE_ICONS: Record<string, string> = {
  standard: '💧',
  precision: '🎯',
  moving_pegs: '⚙️',
  limited_presses: '👆',
  strong_current: '🌊',
  pressure_zones: '💨',
  maze_navigation: '🗺️',
  boss: '👑',
};

function getTemplateIcon(templateId: string): string {
  return TEMPLATE_ICONS[templateId] ?? '💧';
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
        <Text
          key={starIndex}
          style={[
            styles.starIcon,
            starIndex <= starsEarned ? styles.starActive : styles.starInactive,
          ]}
          accessible={false}
        >
          ★
        </Text>
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
  const templateIcon = getTemplateIcon(templateId);

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
        <Text
          style={styles.templateIcon}
          accessible={true}
          accessibilityLabel={`Template: ${templateId.replace(/_/g, ' ')}`}
        >
          {templateIcon}
        </Text>
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
          <Text
            style={styles.continueCount}
            accessible={true}
            accessibilityLabel={`${continueCount} continue${continueCount !== 1 ? 's' : ''} used`}
          >
            +{continueCount}🔄
          </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(10, 30, 55, 0.82)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(79,195,247,0.18)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 72,
    gap: 6,
  },
  challengeNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  templateIcon: {
    fontSize: 18,
  },
  timerArc: {
    alignSelf: 'center',
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 72,
    gap: 4,
  },
  starBar: {
    flexDirection: 'row',
    gap: 2,
  },
  starIcon: {
    fontSize: 18,
  },
  starActive: {
    color: '#FFD740',
  },
  starInactive: {
    color: 'rgba(255,255,255,0.25)',
  },
  continueCount: {
    color: '#81D4FA',
    fontSize: 12,
    fontWeight: '600',
  },
});
