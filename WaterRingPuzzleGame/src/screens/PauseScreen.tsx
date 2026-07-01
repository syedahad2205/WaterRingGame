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

import React, { useState, useEffect, useCallback } from 'react';
import {
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
import { GameLoop } from '../features/game/core/GameLoop';
import { DS } from '@/constants/designSystem';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Icon } from '@/components/icons/GameIcons';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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
// PauseScreen
// ---------------------------------------------------------------------------

/**
 * PauseScreen — frosted glass pause overlay.
 *
 * Requirements: 34.1
 * Task: 8.3.1
 */
export default function PauseScreen({ navigation }: PauseScreenProps): React.JSX.Element {
  const [confirmDialog, setConfirmDialog] = useState<{type: 'reset' | 'quit'} | null>(null);
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
    setConfirmDialog({ type: 'reset' });
  }, []);

  const handleSettings = useCallback((): void => {
    navigation?.navigate('Settings');
  }, [navigation]);

  const handleQuitToHome = useCallback((): void => {
    setConfirmDialog({ type: 'quit' });
  }, []);

  return (
    <View style={styles.backdrop}>
      <Animated.View style={[styles.panelWrapper, animatedPanelStyle]}>
        <GlassCard
          variant="frosted"
          borderRadius={DS.radius.dialog}
          noAnimation
          style={styles.card}
        >
          <View style={styles.panelContent}>
            <Icon name="pause" size={48} color={DS.colors.secondary} />

            <Text
              style={styles.title}
              accessibilityRole="header"
              accessibilityLabel="Paused"
            >
              PAUSED
            </Text>

            <View style={styles.divider} />

            <View style={styles.buttonList}>
              <GlassButton
                label="Resume"
                variant="primary"
                iconLeft="play"
                size="lg"
                onPress={handleResume}
                style={styles.fullWidth}
              />
              <GlassButton
                label="Restart"
                variant="secondary"
                iconLeft="restart"
                size="md"
                onPress={handleRestart}
                style={styles.fullWidth}
              />
              <GlassButton
                label="Settings"
                variant="ghost"
                iconLeft="settings"
                size="md"
                onPress={handleSettings}
                style={styles.fullWidth}
              />
              <GlassButton
                label="Quit to Home"
                variant="danger"
                iconLeft="close"
                size="md"
                onPress={handleQuitToHome}
                style={styles.fullWidth}
              />
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      <ConfirmDialog
        visible={confirmDialog?.type === 'reset'}
        title="Restart Challenge?"
        message="Your current progress will be lost."
        confirmLabel="Restart"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmDialog(null);
          GameLoop.stop();
          audioEngine.setMusicVolume(1.0);
          navigation?.goBack();
          navigation?.navigate('Game');
        }}
        onCancel={() => setConfirmDialog(null)}
      />

      <ConfirmDialog
        visible={confirmDialog?.type === 'quit'}
        title="Quit to Home?"
        message="Your progress in this challenge will be lost."
        confirmLabel="Quit"
        cancelLabel="Keep Playing"
        confirmVariant="destructive"
        onConfirm={() => {
          setConfirmDialog(null);
          GameLoop.stop();
          audioEngine.setMusicVolume(1.0);
          navigation?.navigate('MainTabs');
        }}
        onCancel={() => setConfirmDialog(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: DS.zIndex.modal,
  },
  panelWrapper: {
    width: 300,
  },
  card: {
    width: '100%',
  },
  panelContent: {
    paddingHorizontal: DS.spacing.xxl,
    paddingVertical: DS.spacing.xxxl,
    alignItems: 'center',
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title1,
    fontWeight: DS.typography.weight.heavy,
    textAlign: 'center',
    letterSpacing: DS.typography.letterSpacing.title1,
    textTransform: 'uppercase',
    marginTop: DS.spacing.md,
    marginBottom: DS.spacing.lg,
  },
  divider: {
    height: 1,
    width: '100%',
    backgroundColor: DS.colors.glass.border,
    marginBottom: DS.spacing.xl,
  },
  buttonList: {
    width: '100%',
    gap: DS.spacing.md,
  },
  fullWidth: {
    width: '100%',
  },
});
