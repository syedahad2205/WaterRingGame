/**
 * ProgressBar.tsx
 *
 * Animated progress bar with spring transitions, glow on high values,
 * and optional label.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProgressBarSize = 'sm' | 'md' | 'lg';

export interface ProgressBarProps {
  /** Progress value 0-1. */
  value: number;
  /** Height preset. */
  size?: ProgressBarSize;
  /** Fill colour. Defaults to primary. */
  color?: string;
  /** Secondary fill colour for gradient-like effect (right side). */
  colorEnd?: string;
  /** Show percentage label. */
  showLabel?: boolean;
  /** Custom label text (overrides percentage). */
  label?: string;
  /** Glow when value >= this threshold. Default 0.8. */
  glowThreshold?: number;
  /** Container style overrides. */
  style?: ViewStyle;
  /** Accessibility label. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Size mapping
// ---------------------------------------------------------------------------

const HEIGHT_MAP: Record<ProgressBarSize, number> = {
  sm: 4,
  md: 8,
  lg: 14,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SPRING_CONFIG = { damping: 18, stiffness: 120 };

const ProgressBarComponent: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  color = DS.colors.primary,
  colorEnd,
  showLabel = false,
  label,
  glowThreshold = 0.8,
  style,
  accessibilityLabel,
}) => {
  const clamped = Math.max(0, Math.min(1, value));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(clamped, SPRING_CONFIG);
  }, [clamped, progress]);

  const height = HEIGHT_MAP[size];
  const isGlowing = clamped >= glowThreshold;

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
    backgroundColor: color,
  }));

  const trackStyle: ViewStyle = {
    height,
    borderRadius: height / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden' as const,
    ...(isGlowing
      ? {
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 8,
          elevation: 6,
        }
      : {}),
  };

  const fillBarStyle: ViewStyle = {
    height,
    borderRadius: height / 2,
  };

  const displayLabel = label ?? `${Math.round(clamped * 100)}%`;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? 'Progress'}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      {showLabel && (
        <Text style={styles.label} allowFontScaling={false}>
          {displayLabel}
        </Text>
      )}
      <View style={trackStyle}>
        <Animated.View style={[fillBarStyle, fillStyle]} />
      </View>
    </View>
  );
};

export const ProgressBar = memo(ProgressBarComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.medium,
    marginBottom: DS.spacing.xxs,
    textAlign: 'right',
  },
});

export default ProgressBar;
