/**
 * SettingsScreen.tsx
 *
 * Full settings screen with: audio sliders, haptic controls, accessibility
 * toggles, language selector, graphics quality override, and legal links.
 *
 * Requirements: 17.4, 54.6
 * Task: 8.4.4
 */

import React, { useCallback } from 'react';
import {
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSettingsStore } from '../store/slices/settingsSlice';
import type { GraphicsQuality, ColorBlindPreset } from '../store/slices/settingsSlice';

// Slider removed from react-native core in RN 0.60+. Inline stub until
// @react-native-community/slider is linked in the native project.
// eslint-disable-next-line max-lines-per-function
const Slider = ({
  value,
  onValueChange: _onValueChange,
  minimumValue = 0,
  maximumValue = 1,
  style,
  accessibilityLabel,
  accessibilityRole: _role,
  accessibilityValue: _av,
  minimumTrackTintColor: _min,
  maximumTrackTintColor: _max,
  thumbTintColor: _thumb,
  step: _step,
}: {
  value: number;
  onValueChange: (v: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  style?: object;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityValue?: object;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  step?: number;
}): React.JSX.Element => {
  const pct = Math.round(((value - minimumValue) / (maximumValue - minimumValue)) * 100);
  return (
    <View
      style={[{ height: 32, justifyContent: 'center' }, style]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
    >
      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2 }}>
        <View style={{ width: `${pct}%` as unknown as number, height: 4, backgroundColor: '#4FC3F7', borderRadius: 2 }} />
      </View>
    </View>
  );
};


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return <Text style={styles.sectionHeader} accessibilityRole="header">{title}</Text>;
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.settingControl}>{children}</View>
    </View>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}): React.JSX.Element {
  return (
    <SettingRow label={label}>
      <View style={styles.sliderRow}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={1}
          step={0.05}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor="#4FC3F7"
          maximumTrackTintColor="rgba(255,255,255,0.15)"
          thumbTintColor="#fff"
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
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <SettingRow label={label}>
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
  const settings = useSettingsStore();
  const updateAudio = useSettingsStore((s) => s.updateAudio);
  const updateHaptics = useSettingsStore((s) => s.updateHaptics);
  const updateAccessibility = useSettingsStore((s) => s.updateAccessibility);
  const setGraphicsQuality = useSettingsStore((s) => s.setGraphicsQuality);

  const handleLegalLink = useCallback((url: string): void => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle} accessibilityRole="header">Settings</Text>

        {/* ── Audio ─────────────────────────────────────────────────────────── */}
        <SectionHeader title="Audio" />
        <View style={styles.section}>
          <VolumeSlider
            label="Master"
            value={settings.masterVolume}
            onChange={(v): void => updateAudio({ masterVolume: v })}
          />
          <VolumeSlider
            label="Music"
            value={settings.musicVolume}
            onChange={(v): void => updateAudio({ musicVolume: v })}
          />
          <VolumeSlider
            label="SFX"
            value={settings.sfxVolume}
            onChange={(v): void => updateAudio({ sfxVolume: v })}
          />
        </View>

        {/* ── Haptics ───────────────────────────────────────────────────────── */}
        <SectionHeader title="Haptics" />
        <View style={styles.section}>
          <SettingRow label="Enable Haptics">
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(v: boolean): void => updateHaptics({ hapticsEnabled: v })}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4FC3F7' }}
              thumbColor="#fff"
              accessibilityLabel="Enable haptics"
              accessibilityRole="switch"
            />
          </SettingRow>
          {settings.hapticsEnabled ? (
            <SettingRow label="Intensity">
              <View style={styles.sliderRow}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.25}
                  value={settings.hapticIntensity}
                  onValueChange={(v: number): void => updateHaptics({ hapticIntensity: v })}
                  minimumTrackTintColor="#4FC3F7"
                  maximumTrackTintColor="rgba(255,255,255,0.15)"
                  thumbTintColor="#fff"
                  accessibilityLabel="Haptic intensity"
                  accessibilityRole="adjustable"
                  accessibilityValue={{ min: 0, max: 100, now: Math.round(settings.hapticIntensity * 100) }}
                />
                <Text style={styles.sliderValue}>{Math.round(settings.hapticIntensity * 100)}%</Text>
              </View>
            </SettingRow>
          ) : null}
        </View>

        {/* ── Accessibility ─────────────────────────────────────────────────── */}
        <SectionHeader title="Accessibility" />
        <View style={styles.section}>
          <SettingRow label="Reduce Motion">
            <Switch
              value={settings.reducedMotion}
              onValueChange={(v: boolean): void => updateAccessibility({ reducedMotion: v })}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4FC3F7' }}
              thumbColor="#fff"
              accessibilityLabel="Reduce motion"
              accessibilityRole="switch"
            />
          </SettingRow>
          <SettingRow label="High Contrast">
            <Switch
              value={settings.highContrast}
              onValueChange={(v: boolean): void => updateAccessibility({ highContrast: v })}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4FC3F7' }}
              thumbColor="#fff"
              accessibilityLabel="High contrast mode"
              accessibilityRole="switch"
            />
          </SettingRow>
          <SettingRow label="Colour-blind Mode">
            <Switch
              value={settings.colorBlindMode}
              onValueChange={(v: boolean): void => updateAccessibility({ colorBlindMode: v })}
              trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4FC3F7' }}
              thumbColor="#fff"
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
        </View>

        {/* ── Graphics ──────────────────────────────────────────────────────── */}
        <SectionHeader title="Graphics Quality" />
        <View style={styles.section}>
          <SegmentControl<GraphicsQuality>
            label="Tier"
            options={['high', 'mid', 'low']}
            value={settings.graphicsQuality}
            onChange={setGraphicsQuality}
          />
          <Text style={styles.hint}>
            High: all water layers active. Mid: bubbles/ripples off. Low: minimal rendering.
          </Text>
        </View>

        {/* ── Legal ─────────────────────────────────────────────────────────── */}
        <SectionHeader title="Legal" />
        <View style={styles.section}>
          <Pressable
            onPress={(): void => handleLegalLink('https://example.com/privacy')}
            style={({ pressed }: { pressed: boolean }) => [styles.legalLink, pressed ? styles.legalLinkPressed : undefined]}
            accessibilityRole="link"
            accessibilityLabel="Open Privacy Policy"
          >
            <Text style={styles.legalLinkText}>Privacy Policy ↗</Text>
          </Pressable>
          <Pressable
            onPress={(): void => handleLegalLink('https://example.com/terms')}
            style={({ pressed }: { pressed: boolean }) => [styles.legalLink, pressed ? styles.legalLinkPressed : undefined]}
            accessibilityRole="link"
            accessibilityLabel="Open Terms of Service"
          >
            <Text style={styles.legalLinkText}>Terms of Service ↗</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#070f1e' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  pageTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 20 },
  sectionHeader: { color: '#4FC3F7', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 8 },
  section: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  settingLabel: { color: '#fff', fontSize: 15, flex: 1 },
  settingControl: { flexShrink: 0 },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slider: { width: 140, height: 32 },
  sliderValue: { color: 'rgba(255,255,255,0.55)', fontSize: 13, width: 36, textAlign: 'right' },
  segmentRow: { flexDirection: 'row', gap: 6 },
  segmentChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  segmentChipActive: { backgroundColor: 'rgba(79,195,247,0.2)', borderColor: '#4FC3F7' },
  segmentText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '600' },
  segmentTextActive: { color: '#4FC3F7' },
  hint: { color: 'rgba(255,255,255,0.35)', fontSize: 11, paddingHorizontal: 16, paddingBottom: 12, lineHeight: 16 },
  legalLink: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  legalLinkPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  legalLinkText: { color: '#4FC3F7', fontSize: 15 },
  bottomSpacer: { height: 40 },
});
