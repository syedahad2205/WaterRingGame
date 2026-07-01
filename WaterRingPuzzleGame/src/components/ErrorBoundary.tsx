/**
 * ErrorBoundary.tsx
 *
 * Top-level error boundary that catches unhandled JS errors,
 * logs them to Firebase Crashlytics, and renders a recovery UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DS } from '../constants/designSystem';
import { GlassCard } from '../components/ui/GlassCard';
import { GlassButton } from '../components/ui/GlassButton';
import { Icon } from '../components/icons/GameIcons';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_error: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    try {
      const crashlyticsModule = require('@react-native-firebase/crashlytics').default;
      const instance = crashlyticsModule();
      instance.recordError(error);
      if (info.componentStack) {
        instance.log(`Component stack: ${info.componentStack}`);
      }
    } catch {
      // Crashlytics unavailable — swallow silently so recovery UI still shows
      if (__DEV__) {
        console.error('[ErrorBoundary] Failed to log to Crashlytics:', error);
      }
    }
  }

  private handleRestart = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <GlassCard variant="frosted" style={styles.card}>
            <Icon name="warning" size={64} color={DS.colors.error} />
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. Tap below to restart the app.
            </Text>
            <GlassButton
              label="Tap to restart"
              variant="primary"
              onPress={this.handleRestart}
              style={styles.button}
            />
          </GlassCard>
        </View>
      );
    }

    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DS.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: DS.spacing.xl,
  },
  card: {
    alignItems: 'center',
    padding: DS.spacing.xl,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: DS.typography.size.title3,
    fontWeight: DS.typography.weight.bold,
    color: DS.colors.text.primary,
    marginTop: DS.spacing.lg,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: DS.typography.size.subhead,
    color: DS.colors.text.secondary,
    marginTop: DS.spacing.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: DS.spacing.xl,
    minWidth: 200,
  },
});
