/**
 * SettingsScreen.tsx
 *
 * Full settings screen with: audio sliders, haptic controls, accessibility
 * toggles, language selector, graphics quality override, and legal links.
 *
 * Requirements: 17.4, 54.6
 * Task: 8.4.4
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { useSettingsStore } from '../store/slices/settingsSlice';
import type { GraphicsQuality, ColorBlindPreset } from '../store/slices/settingsSlice';
import { DS } from '../constants/designSystem';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { GlassCard } from '../components/ui/GlassCard';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Icon, type IconName } from '../components/icons/GameIcons';
import { PurchaseService } from '../features/economy/PurchaseService';

// ---------------------------------------------------------------------------
// Custom Slider built with PanResponder
// ---------------------------------------------------------------------------

const THUMB_SIZE = 22;
const TRACK_HEIGHT = 4;

interface SliderProps {
  value: number;
  onValueChange: (v: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  style?: object;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityValue?: object;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
}

function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  step = 0,
  style,
  accessibilityLabel,
  minimumTrackTintColor = DS.colors.primary,
  maximumTrackTintColor = DS.colors.glass.highlight,
  thumbTintColor = DS.colors.text.primary,
}: SliderProps): React.JSX.Element {
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;

  const clampAndStep = useCallback(
    (raw: number): number => {
      const clamped = Math.min(maximumValue, Math.max(minimumValue, raw));
      if (step > 0) {
        return Math.round((clamped - minimumValue) / step) * step + minimumValue;
      }
      return clamped;
    },
    [minimumValue, maximumValue, step],
  );

  const positionToValue = useCallback(
    (pageX: number, layoutX: number): number => {
      const trackWidth = trackWidthRef.current;
      if (trackWidth <= 0) return valueRef.current;
      const ratio = Math.min(1, Math.max(0, (pageX - layoutX) / trackWidth));
      return clampAndStep(minimumValue + ratio * (maximumValue - minimumValue));
    },
    [clampAndStep, minimumValue, maximumValue],
  );

  const layoutXRef = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const newVal = positionToValue(evt.nativeEvent.pageX, layoutXRef.current);
        onValueChange(newVal);
      },
      onPanResponderMove: (evt: GestureResponderEvent, _gestureState: PanResponderGestureState) => {
        const newVal = positionToValue(evt.nativeEvent.pageX, layoutXRef.current);
        onValueChange(newVal);
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const handleLayout = useCallback((evt: LayoutChangeEvent) => {
    trackWidthRef.current = evt.nativeEvent.layout.width;
    layoutXRef.current = evt.nativeEvent.layout.x;
    // Measure absolute position for accurate pageX calculation
    (evt.target as unknown as { measureInWindow?: (cb: (x: number) => void) => void })
      ?.measureInWindow?.((x: number) => {
        layoutXRef.current = x;
      });
  }, []);

  const fraction = maximumValue > minimumValue
    ? (value - minimumValue) / (maximumValue - minimumValue)
    : 0;
  const pct = Math.round(fraction * 100);

  return (
    <View
      style={[{ height: 32, justifyContent: 'center' }, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase' },
        { name: 'decrement', label: 'Decrease' },
      ]}
      onAccessibilityAction={(event) => {
        const increment = step > 0 ? step : (maximumValue - minimumValue) * 0.05;
        if (event.nativeEvent.actionName === 'increment') {
          onValueChange(clampAndStep(value + increment));
        } else if (event.nativeEvent.actionName === 'decrement') {
          onValueChange(clampAndStep(value - increment));
        }
      }}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: maximumTrackTintColor, overflow: 'visible' }}>
        <View style={{ width: `${pct}%`, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: minimumTrackTintColor }} />
        <View
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: (TRACK_HEIGHT - THUMB_SIZE) / 2,
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            backgroundColor: thumbTintColor,
            marginLeft: -THUMB_SIZE / 2,
            shadowColor: DS.colors.background,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.25,
            shadowRadius: 2,
            elevation: 3,
          }}
        />
      </View>
    </View>
  );
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SettingRow({ icon, label, children }: { icon?: IconName; label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.settingRow}>
      {icon && <Icon name={icon} size={20} color={DS.colors.primary} style={{ marginRight: DS.spacing.sm }} />}
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

function VolumeSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon?: IconName;
  label: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <SettingRow label={label} icon={icon}>
      <View style={styles.sliderRow}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={DS.colors.primary}
          maximumTrackTintColor={DS.colors.glass.highlight}
          thumbTintColor={DS.colors.text.primary}
          accessibilityLabel={`${label} volume`}
          accessibilityRole="adjustable"
          accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
        />
        <Text style={styles.sliderValue}>{Math.round(value * 100)}%</Text>
      </View>
    </SettingRow>
  );
}

function SegmentControl<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon?: IconName;
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <SettingRow label={label} icon={icon}>
      <View style={styles.segmentRow}>
        {options.map((opt) => (
          <Pressable
            key={opt}
            onPress={(): void => onChange(opt)}
            style={[styles.segmentChip, value === opt && styles.segmentChipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: value === opt }}
            accessibilityLabel={opt}
          >
            <Text style={[styles.segmentText, value === opt && styles.segmentTextActive]}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>
    </SettingRow>
  );
}

// ---------------------------------------------------------------------------
// SettingsScreen
// ---------------------------------------------------------------------------

/**
 * SettingsScreen — all player-configurable settings.
 *
 * Requirements: 17.4, 54.6
 * Task: 8.4.4
 */
// eslint-disable-next-line max-lines-per-function
export default function SettingsScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [isRestoring, setIsRestoring] = useState(false);
  const settings = useSettingsStore();
  const updateAudio = useSettingsStore((s) => s.updateAudio);
  const updateHaptics = useSettingsStore((s) => s.updateHaptics);
  const updateAccessibility = useSettingsStore((s) => s.updateAccessibility);
  const setGraphicsQuality = useSettingsStore((s) => s.setGraphicsQuality);

  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(20);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 400 });
    contentTranslateY.value = withDelay(100, withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) }));
  }, []);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const handleLegalLink = useCallback((url: string): void => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={contentStyle}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
            <Icon name="back" size={28} color={DS.colors.text.primary} />
          </Pressable>
          <Text style={styles.pageTitle} accessibilityRole="header">Settings</Text>
        </View>

        {/* ── Audio ─────────────────────────────────────────────────────────── */}
        <SectionHeader title="Audio" showDivider={false} />
        <GlassCard variant="medium">
          <VolumeSlider
            icon="sound-on"
            label="Master"
            value={settings.masterVolume}
            onChange={(v): void => updateAudio({ masterVolume: v })}
          />
          <VolumeSlider
            icon="music-on"
            label="Music"
            value={settings.musicVolume}
            onChange={(v): void => updateAudio({ musicVolume: v })}
          />
          <VolumeSlider
            icon="sound-on"
            label="SFX"
            value={settings.sfxVolume}
            onChange={(v): void => updateAudio({ sfxVolume: v })}
          />
        </GlassCard>

        {/* ── Haptics ───────────────────────────────────────────────────────── */}
        <SectionHeader title="Haptics" showDivider={false} />
        <GlassCard variant="medium">
          <SettingRow label="Enable Haptics" icon="haptic-on">
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v: boolean): void => updateHaptics({ hapticsEnabled: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="Enable haptics"
              accessibilityRole="switch"
            />
          </SettingRow>
          {settings.hapticsEnabled ? (
            <SettingRow label="Intensity" icon="haptic-off">
              <View style={styles.sliderRow}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.25}
                  value={settings.hapticIntensity}
                  onValueChange={(v: number): void => updateHaptics({ hapticIntensity: v })}
                  minimumTrackTintColor={DS.colors.primary}
                  maximumTrackTintColor={DS.colors.glass.highlight}
                  thumbTintColor={DS.colors.text.primary}
                  accessibilityLabel="Haptic intensity"
                  accessibilityRole="adjustable"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(settings.hapticIntensity * 100) }}
                />
                <Text style={styles.sliderValue}>{Math.round(settings.hapticIntensity * 100)}%</Text>
              </View>
            </SettingRow>
          ) : null}
        </GlassCard>

        {/* ── Accessibility ─────────────────────────────────────────────────── */}
        <SectionHeader title="Accessibility" showDivider={false} />
        <GlassCard variant="medium">
          <SettingRow label="Reduce Motion" icon="eye-off">
            <Switch
              value={settings.reducedMotion}
              onValueChange={(v: boolean): void => updateAccessibility({ reducedMotion: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="Reduce motion"
              accessibilityRole="switch"
            />
          </SettingRow>
          <SettingRow label="High Contrast" icon="eye">
            <Switch
              value={settings.highContrast}
              onValueChange={(v: boolean): void => updateAccessibility({ highContrast: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="High contrast mode"
              accessibilityRole="switch"
            />
          </SettingRow>
          <SettingRow label="Colour-blind Mode" icon="palette">
            <Switch
              value={settings.colorBlindMode}
              onValueChange={(v: boolean): void => updateAccessibility({ colorBlindMode: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="Colour-blind mode"
              accessibilityRole="switch"
            />
          </SettingRow>
          {settings.colorBlindMode ? (
            <SegmentControl<ColorBlindPreset>
              label="Preset"
              options={['deuteranopia', 'protanopia', 'tritanopia']}
              value={settings.colorBlindPreset === 'none' ? 'deuteranopia' : settings.colorBlindPreset}
              onChange={(v): void => updateAccessibility({ colorBlindPreset: v })}
            />
          ) : null}
          <SettingRow label="Large Text" icon="eye">
            <Switch
              value={settings.largeTextMode}
              onValueChange={(v: boolean): void => updateAccessibility({ largeTextMode: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="Large text mode"
              accessibilityRole="switch"
            />
          </SettingRow>
          <SettingRow label="Motor Accessibility" icon="target">
            <Switch
              value={settings.motorAccessibilityMode}
              onValueChange={(v: boolean): void => updateAccessibility({ motorAccessibilityMode: v })}
              trackColor={{ false: DS.colors.glass.highlight, true: DS.colors.primary }}
              thumbColor={DS.colors.text.primary}
              accessibilityLabel="Motor accessibility mode"
              accessibilityRole="switch"
            />
          </SettingRow>
        </GlassCard>

        {/* ── Graphics ──────────────────────────────────────────────────────── */}
        <SectionHeader title="Graphics Quality" showDivider={false} />
        <GlassCard variant="medium">
          <SegmentControl<GraphicsQuality>
            icon="sparkle"
            label="Tier"
            options={['high', 'mid', 'low']}
            value={settings.graphicsQuality}
            onChange={setGraphicsQuality}
          />
          <Text style={styles.hint}>
            High: all water layers active. Mid: bubbles/ripples off. Low: minimal rendering.
          </Text>
        </GlassCard>

        {/* ── About ─────────────────────────────────────────────────────────── */}
        <SectionHeader title="About" showDivider={false} />
        <GlassCard variant="medium">
          <Pressable
            onPress={(): void => handleLegalLink('https://syntaxandco.com/waterring/privacy')}
            style={({ pressed }: { pressed: boolean }) => [styles.legalLink, pressed ? styles.legalLinkPressed : undefined]}
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
          >
            <View style={styles.legalLinkContent}>
              <Icon name="shield" size={18} color={DS.colors.primary} />
              <Text style={styles.legalLinkText}>Privacy Policy</Text>
            </View>
            <Icon name="chevron-right" size={16} color={DS.colors.text.tertiary} />
          </Pressable>
          <Pressable
            onPress={(): void => handleLegalLink('https://syntaxandco.com/waterring/terms')}
            style={({ pressed }: { pressed: boolean }) => [styles.legalLink, pressed ? styles.legalLinkPressed : undefined]}
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Service"
          >
            <View style={styles.legalLinkContent}>
              <Icon name="info" size={18} color={DS.colors.primary} />
              <Text style={styles.legalLinkText}>Terms of Service</Text>
            </View>
            <Icon name="chevron-right" size={16} color={DS.colors.text.tertiary} />
          </Pressable>
        </GlassCard>

        {/* ── Account ───────────────────────────────────────────────────── */}
        <SectionHeader title="Account" showDivider={false} />
        <GlassCard variant="medium">
          <Pressable
            onPress={async () => {
              if (isRestoring) return;
              setIsRestoring(true);
              try {
                await PurchaseService.getInstance().restorePurchases();
              } catch (err) {
                if (__DEV__) {
                  console.warn('[SettingsScreen] Restore purchases failed:', err);
                }
              } finally {
                setIsRestoring(false);
              }
            }}
            disabled={isRestoring}
            style={({ pressed }: { pressed: boolean }) => [styles.legalLink, pressed ? styles.legalLinkPressed : undefined, isRestoring ? { opacity: 0.5 } : undefined]}
            accessibilityRole="button"
            accessibilityLabel={isRestoring ? 'Restoring purchases...' : 'Restore purchases'}
          >
            <View style={styles.legalLinkContent}>
              <Icon name="refresh" size={18} color={DS.colors.primary} />
              <Text style={styles.legalLinkText}>{isRestoring ? 'Restoring...' : 'Restore Purchases'}</Text>
            </View>
            <Icon name="chevron-right" size={16} color={DS.colors.text.tertiary} />
          </Pressable>
        </GlassCard>

        <Text style={styles.versionText}>v1.0.0</Text>

        <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </ScreenContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: DS.spacing.xl, paddingTop: DS.spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.md, marginBottom: DS.spacing.xl },
  pageTitle: { color: DS.colors.text.primary, fontSize: DS.typography.size.title2, fontWeight: DS.typography.weight.heavy },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.md, borderBottomWidth: 1, borderBottomColor: DS.glass.subtle.borderColor },
  settingLabel: { color: DS.colors.text.primary, fontSize: DS.typography.size.subhead, flex: 1 },
  settingControl: { flexShrink: 0 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.sm },
  slider: { width: 140, height: 32 },
  sliderValue: { color: DS.colors.text.secondary, fontSize: DS.typography.size.footnote, width: 36, textAlign: 'right' },
  segmentRow: { flexDirection: 'row', gap: DS.spacing.xs },
  segmentChip: { paddingHorizontal: DS.spacing.md, paddingVertical: DS.spacing.xs, borderRadius: DS.radius.button, backgroundColor: DS.glass.medium.backgroundColor, borderWidth: 1, borderColor: DS.colors.glass.border },
  segmentChipActive: { backgroundColor: 'rgba(10, 132, 255, 0.2)', borderColor: DS.colors.primary },
  segmentText: { color: DS.colors.text.secondary, fontSize: DS.typography.size.caption1, fontWeight: DS.typography.weight.semibold },
  segmentTextActive: { color: DS.colors.primary },
  hint: { color: DS.colors.text.tertiary, fontSize: DS.typography.size.caption2, paddingHorizontal: DS.spacing.lg, paddingBottom: DS.spacing.md, lineHeight: 16 },
  legalLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: DS.spacing.lg, paddingVertical: DS.spacing.md, borderBottomWidth: 1, borderBottomColor: DS.glass.subtle.borderColor },
  legalLinkPressed: { backgroundColor: DS.glass.subtle.borderColor },
  legalLinkContent: { flexDirection: 'row', alignItems: 'center', gap: DS.spacing.sm },
  legalLinkText: { color: DS.colors.primary, fontSize: DS.typography.size.subhead },
  versionText: { color: DS.colors.text.tertiary, fontSize: DS.typography.size.caption1, textAlign: 'center', marginTop: DS.spacing.xl },
  bottomSpacer: { height: DS.spacing.huge },
});
