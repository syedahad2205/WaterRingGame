/**
 * ScreenContainer.tsx
 *
 * Base container for all screens with gradient background,
 * SafeAreaView, and StatusBar configuration.
 */

import React, { memo, type PropsWithChildren } from 'react';
import { StatusBar, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DS } from '../../constants/designSystem';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScreenContainerProps {
  /** Additional styles for the inner content area. */
  style?: ViewStyle;
  /** Background colour override. */
  backgroundColor?: string;
  /** StatusBar style. Default 'light-content'. */
  statusBarStyle?: 'light-content' | 'dark-content';
  /** Whether to use SafeAreaView edges. Default all edges. */
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  /** Accessibility label for the screen container. */
  accessibilityLabel?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ScreenContainerComponent: React.FC<PropsWithChildren<ScreenContainerProps>> = ({
  style,
  backgroundColor,
  statusBarStyle = 'light-content',
  edges = ['top', 'bottom', 'left', 'right'],
  accessibilityLabel,
  children,
}) => {
  const bgColor = backgroundColor ?? DS.colors.background;

  return (
    <View style={[styles.root, { backgroundColor: bgColor }]}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor="transparent"
        translucent
      />
      <SafeAreaView
        style={[styles.safeArea, style]}
        edges={edges}
        accessibilityRole="none"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </SafeAreaView>
    </View>
  );
};

export const ScreenContainer = memo(ScreenContainerComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
});

export default ScreenContainer;
