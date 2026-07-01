/**
 * GlassCard.tsx
 *
 * Glassmorphism card with semi-transparent background, subtle border,
 * shadow, and animated entrance.
 */

import React, { memo, type PropsWithChildren } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  type AnimatedStyle,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GlassVariant = 'subtle' | 'medium' | 'strong' | 'frosted';

export interface GlassCardProps {
  /** Visual density of the glass effect. */
  variant?: GlassVariant;
  /** Corner radius override. Default 20. */
  borderRadius?: number;
  /** Adds a coloured outer shadow glow. */
  glow?: string;
  /** Disable the entrance animation. */
  noAnimation?: boolean;
  /** Custom entering delay (ms). */
  enterDelay?: number;
  /** Extra styles merged onto the card container. */
  style?: ViewStyle | AnimatedStyle<ViewStyle>;
  /** Accessibility label for the card region. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Variant styles
// ---------------------------------------------------------------------------

const VARIANT_STYLES: Record<GlassVariant, ViewStyle> = {
  subtle: {
    backgroundColor: DS.glass.subtle.backgroundColor,
    borderColor: DS.glass.subtle.borderColor,
    borderWidth: DS.glass.subtle.borderWidth,
  },
  medium: {
    backgroundColor: DS.glass.medium.backgroundColor,
    borderColor: DS.glass.medium.borderColor,
    borderWidth: DS.glass.medium.borderWidth,
  },
  strong: {
    backgroundColor: DS.glass.strong.backgroundColor,
    borderColor: DS.glass.strong.borderColor,
    borderWidth: DS.glass.strong.borderWidth,
  },
  frosted: {
    backgroundColor: DS.glass.frosted.backgroundColor,
    borderColor: DS.glass.frosted.borderColor,
    borderWidth: DS.glass.frosted.borderWidth,
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const GlassCardComponent: React.FC<PropsWithChildren<GlassCardProps>> = ({
  variant = 'medium',
  borderRadius = DS.radius.card,
  glow,
  noAnimation = false,
  enterDelay = 0,
  style,
  accessibilityLabel,
  children,
}) => {
  const glassStyle = VARIANT_STYLES[variant];

  const glowStyle: ViewStyle | undefined = glow
    ? {
        shadowColor: glow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 16,
        elevation: 12,
      }
    : undefined;

  const cardStyle: ViewStyle = {
    ...styles.card,
    ...glassStyle,
    borderRadius,
    ...(glowStyle ?? {}),
  };

  if (noAnimation) {
    return (
      <View
        style={[cardStyle, style as ViewStyle]}
        accessibilityRole="summary"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(enterDelay).duration(DS.animation.duration.normal).springify()}
      style={[cardStyle, style]}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </Animated.View>
  );
};

export const GlassCard = memo(GlassCardComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: DS.spacing.lg,
    overflow: 'hidden',
    ...DS.shadows.lg,
  },
});

export default GlassCard;
