/**
 * GlassButton.tsx
 *
 * Premium pressable button with glass morphism, scale animation,
 * icon support, loading state, and haptic feedback.
 */

import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';
import { Icon, type IconName } from '../icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface GlassButtonProps {
  /** Button label text. */
  label: string;
  /** Visual variant. */
  variant?: ButtonVariant;
  /** Size preset. */
  size?: ButtonSize;
  /** Icon rendered before the label. */
  iconLeft?: IconName;
  /** Icon rendered after the label. */
  iconRight?: IconName;
  /** Show a loading spinner and disable interaction. */
  loading?: boolean;
  /** Disable the button. */
  disabled?: boolean;
  /** Press handler. */
  onPress?: () => void;
  /** Long press handler. */
  onLongPress?: () => void;
  /** Extra container styles. */
  style?: ViewStyle;
  /** Accessibility label override. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Size presets
// ---------------------------------------------------------------------------

interface SizePreset {
  height: number;
  paddingHorizontal: number;
  fontSize: number;
  iconSize: number;
}

const SIZE_PRESETS: Record<ButtonSize, SizePreset> = {
  sm: { height: 36, paddingHorizontal: DS.spacing.md, fontSize: DS.typography.size.caption1, iconSize: 16 },
  md: { height: 48, paddingHorizontal: DS.spacing.xxl, fontSize: DS.typography.size.callout, iconSize: 20 },
  lg: { height: 56, paddingHorizontal: DS.spacing.xxxl, fontSize: DS.typography.size.body, iconSize: 24 },
};

// ---------------------------------------------------------------------------
// Variant colours
// ---------------------------------------------------------------------------

interface VariantColors {
  bg: string;
  border: string;
  text: string;
  glow?: string;
}

const VARIANT_COLORS: Record<ButtonVariant, VariantColors> = {
  primary: {
    bg: 'rgba(10, 132, 255, 0.25)',
    border: 'rgba(10, 132, 255, 0.5)',
    text: DS.colors.text.primary,
    glow: 'rgba(10, 132, 255, 0.4)',
  },
  secondary: {
    bg: 'rgba(0, 212, 255, 0.18)',
    border: 'rgba(0, 212, 255, 0.4)',
    text: DS.colors.text.primary,
  },
  accent: {
    bg: 'rgba(255, 215, 0, 0.2)',
    border: 'rgba(255, 215, 0, 0.45)',
    text: DS.colors.accent,
  },
  ghost: {
    bg: 'transparent',
    border: DS.colors.glass.border,
    text: DS.colors.text.secondary,
  },
  danger: {
    bg: 'rgba(255, 69, 58, 0.2)',
    border: 'rgba(255, 69, 58, 0.45)',
    text: DS.colors.error,
  },
};

// ---------------------------------------------------------------------------
// Haptic helper (fire-and-forget, never throws)
// ---------------------------------------------------------------------------

let hapticInstance: { trigger: (event: string) => void } | null = null;

function fireHaptic(): void {
  try {
    if (!hapticInstance) {
      // Lazy singleton -- import is synchronous; the class is already bundled.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HapticManager } = require('../../features/audio/HapticManager');
      hapticInstance = HapticManager.getInstance?.() ?? null;
    }
    hapticInstance?.trigger('buttonTap');
  } catch {
    // Haptics unavailable -- graceful no-op.
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.4 };

const GlassButtonComponent: React.FC<GlassButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  iconLeft,
  iconRight,
  loading = false,
  disabled = false,
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);
  const preset = SIZE_PRESETS[size];
  const colors = VARIANT_COLORS[variant];
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, SPRING_CONFIG);
    fireHaptic();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const containerStyle: ViewStyle = {
    height: preset.height,
    paddingHorizontal: preset.paddingHorizontal,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: preset.height / 2,
    opacity: isDisabled ? 0.45 : 1,
    ...(colors.glow && !isDisabled
      ? {
          shadowColor: colors.glow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.35,
          shadowRadius: 12,
          elevation: 8,
        }
      : {}),
  };

  const labelStyle: TextStyle = {
    color: colors.text,
    fontSize: preset.fontSize,
    fontWeight: DS.typography.weight.semibold,
  };

  const iconColor = colors.text;

  return (
    <AnimatedPressable
      onPress={isDisabled ? undefined : onPress}
      onLongPress={isDisabled ? undefined : onLongPress}
      onPressIn={isDisabled ? undefined : handlePressIn}
      onPressOut={isDisabled ? undefined : handlePressOut}
      style={[styles.button, containerStyle, animatedStyle, style]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <>
          {iconLeft != null && (
            <Icon
              name={iconLeft}
              size={preset.iconSize}
              color={iconColor}
              style={styles.iconLeft}
            />
          )}
          <Text style={labelStyle} allowFontScaling={false}>
            {label}
          </Text>
          {iconRight != null && (
            <Icon
              name={iconRight}
              size={preset.iconSize}
              color={iconColor}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </AnimatedPressable>
  );
};

export const GlassButton = memo(GlassButtonComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: DS.spacing.sm,
  },
  iconRight: {
    marginLeft: DS.spacing.sm,
  },
});

export default GlassButton;
