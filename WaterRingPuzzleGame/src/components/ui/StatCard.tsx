/**
 * StatCard.tsx
 *
 * Statistics display card with icon, animated counter, and label.
 * Built on top of GlassCard for consistent glassmorphism.
 */

import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  withTiming,
  Easing,
  useDerivedValue,
  runOnJS,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';
import { Icon, type IconName } from '../icons/GameIcons';
import { GlassCard } from './GlassCard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StatCardVariant = 'compact' | 'expanded';

export interface StatCardProps {
  /** Icon displayed beside the value. */
  icon: IconName;
  /** Icon tint colour. */
  iconColor?: string;
  /** Numeric value to display (animated count-up). */
  value: number;
  /** Descriptive label beneath the value. */
  label: string;
  /** Layout variant. */
  variant?: StatCardVariant;
  /** Optional prefix string (e.g. currency symbol). */
  prefix?: string;
  /** Optional suffix string (e.g. '%', 'pts'). */
  suffix?: string;
  /** Container style overrides. */
  style?: ViewStyle;
  /** Accessibility label override. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Animated number text (workaround: reanimated Text with derived value)
// ---------------------------------------------------------------------------

const AnimatedCounter: React.FC<{
  value: number;
  prefix?: string;
  suffix?: string;
  style: any;
}> = memo(({ value, prefix, suffix, style }) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState('0');

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, animatedValue]);

  useDerivedValue(() => {
    const v = Math.round(animatedValue.value);
    const formatted = v.toLocaleString?.() ?? String(v);
    const display = `${prefix ?? ''}${formatted}${suffix ?? ''}`;
    runOnJS(setDisplayValue)(display);
  });

  return (
    <Text style={style} allowFontScaling={false} accessibilityRole="text">
      {displayValue}
    </Text>
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StatCardComponent: React.FC<StatCardProps> = ({
  icon,
  iconColor = DS.colors.primary,
  value,
  label,
  variant = 'compact',
  prefix,
  suffix,
  style,
  accessibilityLabel,
}) => {
  const isExpanded = variant === 'expanded';

  return (
    <GlassCard
      variant="subtle"
      borderRadius={DS.radius.lg}
      style={[isExpanded ? styles.expandedCard : styles.compactCard, style]}
      accessibilityLabel={accessibilityLabel ?? `${label}: ${value}`}
    >
      <View style={isExpanded ? styles.expandedLayout : styles.compactLayout}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${iconColor}20` },
          ]}
        >
          <Icon name={icon} size={isExpanded ? 28 : 22} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <AnimatedCounter
            value={value}
            prefix={prefix}
            suffix={suffix}
            style={isExpanded ? styles.valueExpanded : styles.valueCompact}
          />
          <Text
            style={styles.label}
            allowFontScaling={false}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
      </View>
    </GlassCard>
  );
};

export const StatCard = memo(StatCardComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  compactCard: {
    padding: DS.spacing.sm,
  },
  expandedCard: {
    padding: DS.spacing.lg,
  },
  compactLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandedLayout: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: DS.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DS.spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  valueCompact: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.headline,
    fontWeight: DS.typography.weight.bold,
  },
  valueExpanded: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.bold,
    marginTop: DS.spacing.sm,
  },
  label: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.medium,
    marginTop: 2,
  },
});

export default StatCard;
