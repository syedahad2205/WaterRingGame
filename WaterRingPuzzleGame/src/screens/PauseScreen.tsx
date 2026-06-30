/**
 * PauseScreen.tsx
 *
 * Transparent-modal overlay for the pause state. Rendered above the GameScreen
 * using React Navigation modal presentation (transparentModal).
 *
 * Displays a frosted-glass panel with four action buttons:
 *   - Resume  → pops the modal, returning to GameScreen
 *   - Restart → confirmation dialog → reloads the same challenge
 *   - Settings shortcut → navigates to SettingsScreen
 *   - Quit to Home → confirmation dialog → navigates to MainTabs
 *
 * Fades the game music to 15% on mount; restores it on unmount.
 *
 * Requirements: 34.1
 * Task: 8.3.1
 */

import React, { useEffect, useCallback } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { audioEngine } from '../features/audio/AudioEngine';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PauseScreenProps {
  navigation?: {
    goBack: () => void;
    navigate: (screen: string) => void;
  };
}

// ---------------------------------------------------------------------------
// Action button component
// ---------------------------------------------------------------------------

interface ActionButtonProps {
  label: string;
  icon: string;
  onPress: () => void;
  variant?: 'default' | 'destructive';
}

function ActionButton({ label, icon, onPress, variant = 'default' }: ActionButtonProps): React.JSX.Element {
  const isDestructive = variant === 'destructive';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.actionButton,
        isDestructive && styles.actionButtonDestructive,
        pressed ? styles.actionButtonPressed : undefined,
      ]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.actionButtonIcon} accessible={false}>{icon}</Text>
      <Text style={[styles.actionButtonLabel, isDestructive && styles.actionButtonLabelDestructive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// PauseScreen
// ---------------------------------------------------------------------------

/**
 * PauseScreen — frosted glass pause overlay.
 *
 * Requirements: 34.1
 * Task: 8.3.1
 */
// eslint-disable-next-line max-lines-per-function
export default function PauseScreen({ navigation }: PauseScreenProps): React.JSX.Element {
  const panelOpacity = useSharedValue(0);
  const panelScale = useSharedValue(0.92);

  useEffect((): (() => void) => {
    // Fade music to 15% when paused (Requirement 34.1)
    audioEngine.setMusicVolume(0.15);

    panelOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
    panelScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.back(1.1)) });

    return (): void => {
      audioEngine.setMusicVolume(1.0);
    };
  }, [panelOpacity, panelScale]);

  const animatedPanelStyle = useAnimatedStyle(() => ({
    opacity: panelOpacity.value,
    transform: [{ scale: panelScale.value }],
  }));

  const handleResume = useCallback((): void => {
    navigation?.goBack();
  }, [navigation]);

  const handleRestart = useCallback((): void => {
    Alert.alert(
      'Restart Challenge?',
      'Your current progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: (): void => {
            navigation?.goBack();
            navigation?.navigate('Game');
          },
        },
      ],
    );
  }, [navigation]);

  const handleSettings = useCallback((): void => {
    navigation?.navigate('Settings');
  }, [navigation]);

  const handleQuitToHome = useCallback((): void => {
    Alert.alert(
      'Quit to Home?',
      'Your progress in this challenge will be lost.',
      [
        { text: 'Keep Playing', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: (): void => {
            navigation?.navigate('MainTabs');
          },
        },
      ],
    );
  }, [navigation]);

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.panel, animatedPanelStyle]}>
        {/* Frosted surface — replace with <BlurView> once @react-native-community/blur is linked */}
        <View style={styles.blurSurface} />

        <View style={styles.panelContent}>
          <Text style={styles.title} accessibilityRole="header">Paused</Text>
          <View style={styles.divider} />
          <View style={styles.buttonList}>
            <ActionButton label="Resume" icon="▶" onPress={handleResume} />
            <ActionButton label="Restart" icon="↺" onPress={handleRestart} />
            <ActionButton label="Settings" icon="⚙" onPress={handleSettings} />
            <ActionButton label="Quit to Home" icon="✕" onPress={handleQuitToHome} variant="destructive" />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 15, 30, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    width: 300,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.22)',
  },
  blurSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 28, 55, 0.88)',
  },
  panelContent: {
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(79,195,247,0.2)',
    marginBottom: 20,
  },
  buttonList: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79,195,247,0.12)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.2)',
    gap: 12,
  },
  actionButtonDestructive: {
    backgroundColor: 'rgba(239,83,80,0.12)',
    borderColor: 'rgba(239,83,80,0.25)',
  },
  actionButtonPressed: {
    opacity: 0.75,
  },
  actionButtonIcon: {
    fontSize: 18,
    color: '#fff',
    width: 24,
    textAlign: 'center',
  },
  actionButtonLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonLabelDestructive: {
    color: '#EF5350',
  },
});
