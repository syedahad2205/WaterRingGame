/**
 * ConfirmDialog.tsx
 *
 * Reusable themed confirmation modal that replaces Alert.alert.
 * Uses the glass design system: dark backdrop, GlassCard with frosted variant,
 * GlassButton for actions, and a fade-in entrance animation.
 *
 * Requirements: 34.1
 */

import React, { useCallback, useRef } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';
import { GlassCard } from './GlassCard';
import { GlassButton } from './GlassButton';
import { Icon } from '../icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmVariant?: 'primary' | 'accent' | 'destructive';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
}: ConfirmDialogProps): React.JSX.Element | null {
  const buttonVariant =
    confirmVariant === 'destructive' ? 'danger' : confirmVariant;
  const glowColor =
    confirmVariant === 'destructive' ? DS.colors.warning : undefined;

  // Guard against double-tap or simultaneous Confirm+Cancel taps
  const isProcessingRef = useRef(false);

  const guardedConfirm = useCallback((): void => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    onConfirm();
  }, [onConfirm]);

  const guardedCancel = useCallback((): void => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    onCancel();
  }, [onCancel]);

  // Reset guard when dialog becomes visible again
  if (visible) {
    isProcessingRef.current = false;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={guardedCancel}
    >
      <View style={styles.backdrop}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.panelWrapper}>
          <GlassCard
            variant="frosted"
            borderRadius={DS.radius.dialog}
            glow={glowColor}
            noAnimation
            style={styles.card}
          >
            <View style={styles.content}>
              <Icon
                name={confirmVariant === 'destructive' ? 'warning' : 'info'}
                size={36}
                color={
                  confirmVariant === 'destructive'
                    ? DS.colors.warning
                    : DS.colors.secondary
                }
              />

              <Text
                style={styles.title}
                accessibilityRole="header"
              >
                {title}
              </Text>

              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonRow}>
                <GlassButton
                  label={cancelLabel}
                  variant="ghost"
                  size="md"
                  onPress={guardedCancel}
                  style={styles.button}
                />
                <GlassButton
                  label={confirmLabel}
                  variant={buttonVariant}
                  size="md"
                  onPress={guardedConfirm}
                  style={styles.button}
                />
              </View>
            </View>
          </GlassCard>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,14,26,0.88)',
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
  content: {
    paddingHorizontal: DS.spacing.xxl,
    paddingVertical: DS.spacing.xl,
    alignItems: 'center',
    gap: DS.spacing.md,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.bold,
    textAlign: 'center',
  },
  message: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.body,
    textAlign: 'center',
    lineHeight: DS.typography.size.body * 1.4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: DS.spacing.md,
    marginTop: DS.spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
  },
});
