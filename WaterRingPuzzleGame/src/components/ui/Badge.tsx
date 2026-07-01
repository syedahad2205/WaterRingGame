/**
 * Badge.tsx
 *
 * Compact badge for counts, status indicators, ranks, and premium markers.
 * Optional pulse animation for attention.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, type ViewStyle, type TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeVariant = 'count' | 'status' | 'rank' | 'premium';

export interface BadgeProps {
  /** Display text or number. */
  value: string | number;
  /** Visual variant. */
  variant?: BadgeVariant;
  /** Enable pulsing glow animation. */
  pulse?: boolean;
  /** Custom background colour override. */
  color?: string;
  /** Container style overrides. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

interface VariantStyle {
  bg: string;
  text: string;
  border?: string;
  minWidth: number;
}

const VARIANT_MAP: Record<BadgeVariant, VariantStyle> = {
  count: {
    bg: DS.colors.error,
    text: DS.colors.text.primary,
    minWidth: 20,
  },
  status: {
    bg: DS.colors.success,
    text: DS.colors.text.primary,
    minWidth: 8,
  },
  rank: {
    bg: 'rgba(10, 132, 255, 0.25)',
    text: DS.colors.primary,
    border: 'rgba(10, 132, 255, 0.4)',
    minWidth: 28,
  },
  premium: {
    bg: 'rgba(255, 215, 0, 0.2)',
    text: DS.colors.accent,
    border: 'rgba(255, 215, 0, 0.45)',
    minWidth: 28,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const BadgeComponent: React.FC<BadgeProps> = ({
  value,
  variant = 'count',
  pulse = false,
  color,
  style,
}) => {
  const scaleAnim = useSharedValue(1);
  const vs = VARIANT_MAP[variant];

  useEffect(() => {
    if (pulse) {
      scaleAnim.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    } else {
      scaleAnim.value = withTiming(1, { duration: 200 });
    }
  }, [pulse, scaleAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  const displayValue = typeof value === 'number' && value > 99 ? '99+' : String(value);

  const containerStyle: ViewStyle = {
    backgroundColor: color ?? vs.bg,
    minWidth: vs.minWidth,
    borderColor: vs.border ?? 'transparent',
    borderWidth: vs.border ? 1 : 0,
  };

  const textStyle: TextStyle = {
    color: vs.text,
  };

  // Status variant is just a dot
  if (variant === 'status') {
    return (
      <Animated.View
        style={[styles.dot, containerStyle, animatedStyle, style]}
        accessibilityRole="text"
        accessibilityLabel={`Status: ${displayValue}`}
      />
    );
  }

  return (
    <Animated.View
      style={[styles.badge, containerStyle, animatedStyle, style]}
      accessibilityRole="text"
      accessibilityLabel={displayValue}
    >
      <Text style={[styles.text, textStyle]} allowFontScaling={false}>
        {displayValue}
      </Text>
    </Animated.View>
  );
};

export const Badge = memo(BadgeComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: DS.spacing.sm,
    paddingVertical: 2,
    borderRadius: DS.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  text: {
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.bold,
    textAlign: 'center',
  },
});

export default Badge;
