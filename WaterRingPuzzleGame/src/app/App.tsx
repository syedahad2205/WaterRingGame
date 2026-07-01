/**
 * App.tsx
 *
 * Root component. Wraps the entire navigation tree inside all required
 * providers so every screen has access to services and safe-area insets.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Providers from './Providers';
import Navigation from './Navigation';
import { ToastContainer } from '../components/ui/Toast';
import { DS } from '../constants/designSystem';
import ErrorBoundary from '../components/ErrorBoundary';

export default function App(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor={DS.colors.background} />
      <ErrorBoundary>
        <Providers>
          <Navigation />
          <ToastContainer />
        </Providers>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
