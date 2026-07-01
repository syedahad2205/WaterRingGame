/**
 * AnimatedNumber.tsx
 *
 * Animates numeric value changes with spring/timing animation.
 * Supports formatting with commas, decimal places, prefix, and suffix.
 */

import React, { memo, useEffect, useState } from 'react';
import { Text, type TextStyle } from 'react-native';
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimationMode = 'spring' | 'timing';

export interface AnimatedNumberProps {
  /** The target numeric value. */
  value: number;
  /** Animation mode. Default 'spring'. */
  animationMode?: AnimationMode;
  /** Duration for timing mode (ms). Default 600. */
  duration?: number;
  /** Number of decimal places. Default 0. */
  decimalPlaces?: number;
  /** Use comma separators (e.g. 1,234). Default true. */
  useCommas?: boolean;
  /** Prefix string (e.g. '$', coin emoji). */
  prefix?: string;
  /** Suffix string (e.g. '%', ' pts'). */
  suffix?: string;
  /** Text style. */
  style?: TextStyle;
  /** Accessibility label override. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function formatNumber(
  num: number,
  decimalPlaces: number,
  useCommas: boolean,
): string {
  const fixed = num.toFixed(decimalPlaces);
  if (!useCommas) return fixed;

  const [intPart, decPart] = fixed.split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart != null ? `${withCommas}.${decPart}` : withCommas;
}

// ---------------------------------------------------------------------------
// Spring config
// ---------------------------------------------------------------------------

const SPRING_CONFIG = { damping: 20, stiffness: 90, mass: 0.8 };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AnimatedNumberComponent: React.FC<AnimatedNumberProps> = ({
  value,
  animationMode = 'spring',
  duration = 600,
  decimalPlaces = 0,
  useCommas = true,
  prefix = '',
  suffix = '',
  style,
  accessibilityLabel,
}) => {
  const animatedValue = useSharedValue(value);
  const [displayText, setDisplayText] = useState(
    `${prefix}${formatNumber(value, decimalPlaces, useCommas)}${suffix}`,
  );

  useEffect(() => {
    if (animationMode === 'spring') {
      animatedValue.value = withSpring(value, SPRING_CONFIG);
    } else {
      animatedValue.value = withTiming(value, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [value, animationMode, duration, animatedValue]);

  useDerivedValue(() => {
    const current =
      decimalPlaces > 0 ? animatedValue.value : Math.round(animatedValue.value);
    const formatted = formatNumber(current, decimalPlaces, useCommas);
    const text = `${prefix}${formatted}${suffix}`;
    runOnJS(setDisplayText)(text);
  });

  const defaultStyle: TextStyle = {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.headline,
    fontWeight: DS.typography.weight.bold,
  };

  return (
    <Text
      style={[defaultStyle, style]}
      allowFontScaling={false}
      accessibilityRole="text"
      accessibilityLabel={
        accessibilityLabel ?? `${prefix}${formatNumber(value, decimalPlaces, useCommas)}${suffix}`
      }
    >
      {displayText}
    </Text>
  );
};

export const AnimatedNumber = memo(AnimatedNumberComponent);

export default AnimatedNumber;
