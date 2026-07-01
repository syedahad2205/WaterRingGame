/**
 * SectionHeader.tsx
 *
 * Section header with title, optional subtitle, optional action button,
 * and divider line.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View, Pressable, type ViewStyle } from 'react-native';
import { DS } from '../../constants/designSystem';
import { Icon, type IconName } from '../icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SectionHeaderProps {
  /** Section title. */
  title: string;
  /** Optional subtitle beneath the title. */
  subtitle?: string;
  /** Action button label. */
  actionLabel?: string;
  /** Action button icon. */
  actionIcon?: IconName;
  /** Action button press handler. */
  onAction?: () => void;
  /** Show bottom divider line. Default true. */
  showDivider?: boolean;
  /** Container style overrides. */
  style?: ViewStyle;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SectionHeaderComponent: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
  showDivider = true,
  style,
}) => {
  const hasAction = actionLabel != null || actionIcon != null;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <View style={styles.textContainer}>
          <Text
            style={styles.title}
            allowFontScaling={false}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle != null && (
            <Text style={styles.subtitle} allowFontScaling={false}>
              {subtitle}
            </Text>
          )}
        </View>
        {hasAction && (
          <Pressable
            onPress={onAction}
            style={styles.actionButton}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel ?? 'Action'}
          >
            {actionLabel != null && (
              <Text style={styles.actionLabel} allowFontScaling={false}>
                {actionLabel}
              </Text>
            )}
            {actionIcon != null && (
              <Icon name={actionIcon} size={16} color={DS.colors.primary} />
            )}
          </Pressable>
        )}
      </View>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
};

export const SectionHeader = memo(SectionHeaderComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: DS.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DS.spacing.xs,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.body,
    fontWeight: DS.typography.weight.bold,
  },
  subtitle: {
    color: DS.colors.text.tertiary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.regular,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DS.spacing.xxs,
  },
  actionLabel: {
    color: DS.colors.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.medium,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: DS.spacing.sm,
  },
});

export default SectionHeader;
