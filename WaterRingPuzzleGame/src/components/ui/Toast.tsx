/**
 * Toast.tsx
 *
 * Notification toast with slide-in animation, auto-dismiss,
 * and glass background. Managed imperatively via ToastManager.
 */

import React, { memo, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, Pressable, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';
import { DS } from '../../constants/designSystem';
import { Icon, type IconName } from '../icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastVariant =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'achievement'
  | 'reward';

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
  icon?: IconName;
}

export interface ToastProps extends ToastData {
  onDismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Variant config
// ---------------------------------------------------------------------------

interface VariantConfig {
  icon: IconName;
  accentColor: string;
  bgColor: string;
}

const VARIANT_CONFIG: Record<ToastVariant, VariantConfig> = {
  success: {
    icon: 'check',
    accentColor: DS.colors.success,
    bgColor: 'rgba(52, 199, 89, 0.15)',
  },
  error: {
    icon: 'error',
    accentColor: DS.colors.error,
    bgColor: 'rgba(255, 69, 58, 0.15)',
  },
  warning: {
    icon: 'warning',
    accentColor: DS.colors.warning,
    bgColor: 'rgba(255, 159, 10, 0.12)',
  },
  info: {
    icon: 'info',
    accentColor: DS.colors.info,
    bgColor: 'rgba(90, 200, 250, 0.15)',
  },
  achievement: {
    icon: 'trophy',
    accentColor: DS.colors.accent,
    bgColor: 'rgba(255, 215, 0, 0.12)',
  },
  reward: {
    icon: 'gift',
    accentColor: DS.colors.secondary,
    bgColor: 'rgba(0, 212, 255, 0.15)',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_DURATION = 3500;

const ToastComponent: React.FC<ToastProps> = ({
  id,
  variant,
  title,
  message,
  duration = DEFAULT_DURATION,
  icon,
  onDismiss,
}) => {
  const config = VARIANT_CONFIG[variant];
  const progressValue = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    onDismiss(id);
  }, [id, onDismiss]);

  useEffect(() => {
    // Animate progress bar down
    progressValue.value = withTiming(0, {
      duration,
      easing: Easing.linear,
    });

    timerRef.current = setTimeout(dismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dismiss, duration, progressValue]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%` as any,
  }));

  const displayIcon = icon ?? config.icon;

  return (
    <Animated.View
      entering={SlideInUp.springify().damping(18).stiffness(200)}
      exiting={SlideOutUp.duration(200)}
      style={[styles.toast, { backgroundColor: config.bgColor }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {/* Accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: config.accentColor }]} />

      <View style={styles.content}>
        <Icon name={displayIcon} size={24} color={config.accentColor} style={styles.icon} />
        <View style={styles.textContainer}>
          <Text style={styles.title} allowFontScaling={false} numberOfLines={1}>
            {title}
          </Text>
          {message != null && (
            <Text style={styles.message} allowFontScaling={false} numberOfLines={2}>
              {message}
            </Text>
          )}
        </View>
        <Pressable
          onPress={dismiss}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Icon name="close" size={18} color={DS.colors.text.tertiary} />
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: config.accentColor }, progressStyle]}
        />
      </View>
    </Animated.View>
  );
};

export const Toast = memo(ToastComponent);

// ---------------------------------------------------------------------------
// Toast Manager (simple global store)
// ---------------------------------------------------------------------------

type ToastListener = (toasts: ToastData[]) => void;

let _toasts: ToastData[] = [];
let _listeners: ToastListener[] = [];
let _idCounter = 0;

function notify(): void {
  _listeners.forEach((l) => l([..._toasts]));
}

export const ToastManager = {
  show(params: Omit<ToastData, 'id'>): string {
    const id = `toast_${++_idCounter}`;
    _toasts = [..._toasts, { ...params, id }];
    notify();
    return id;
  },

  dismiss(id: string): void {
    _toasts = _toasts.filter((t) => t.id !== id);
    notify();
  },

  subscribe(listener: ToastListener): () => void {
    _listeners.push(listener);
    return () => {
      _listeners = _listeners.filter((l) => l !== listener);
    };
  },

  getToasts(): ToastData[] {
    return [..._toasts];
  },
};

// ---------------------------------------------------------------------------
// Toast Container (mount once at app root)
// ---------------------------------------------------------------------------

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  useEffect(() => {
    return ToastManager.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={ToastManager.dismiss} />
      ))}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: DS.spacing.lg,
    right: DS.spacing.lg,
    zIndex: DS.zIndex.toast,
    gap: DS.spacing.sm,
  },
  toast: {
    borderRadius: DS.radius.lg,
    borderWidth: 1,
    borderColor: DS.colors.glass.border,
    overflow: 'hidden',
    ...DS.shadows.lg,
  },
  accentStrip: {
    height: 3,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: DS.spacing.sm,
    paddingHorizontal: DS.spacing.lg,
  },
  icon: {
    marginRight: DS.spacing.sm,
  },
  textContainer: {
    flex: 1,
    marginRight: DS.spacing.sm,
  },
  title: {
    color: DS.colors.text.primary,
    fontSize: DS.typography.size.caption1,
    fontWeight: DS.typography.weight.semibold,
  },
  message: {
    color: DS.colors.text.secondary,
    fontSize: DS.typography.size.caption2,
    fontWeight: DS.typography.weight.regular,
    marginTop: 2,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  progressFill: {
    height: 2,
  },
});

export default Toast;
