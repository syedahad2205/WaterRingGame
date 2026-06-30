/**
 * Providers.tsx
 *
 * Root provider wrapper. Instantiates all top-level services once and injects
 * them via ServiceContext so UI components never import services directly.
 *
 * Services must be accessed via the `useServices()` hook — no UI component
 * may import a service class directly (ESLint `import/no-restricted-paths`
 * rule enforces this for the screens layer).
 *
 * Requirements: 1.7, 3.4, 3.5, 3.6
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AudioEngine } from '@features/audio/AudioEngine';
import { HapticManager } from '@features/audio/HapticManager';
import { AnalyticsService } from '@services/firebase/AnalyticsService';
import { EconomyService } from '@features/economy/EconomyService';
import { LeaderboardService } from '@features/social/LeaderboardService';
import { ReplayStorageService } from '@features/replay/ReplayStorageService';
import { connectToEmulators } from '@services/firebase/emulatorConfig';

// Connect Firebase to local emulators in dev / test environments.
// Must be called before any Firebase service is used.
connectToEmulators();

// ---------------------------------------------------------------------------
// Service context types
// ---------------------------------------------------------------------------

export interface Services {
  /** Three-layer adaptive audio system. */
  audioEngine: AudioEngine;
  /** Device haptic feedback service. */
  hapticManager: HapticManager;
  /** Firebase Analytics passive observer. */
  analyticsService: AnalyticsService;
  /** Coin / IAP economy service. */
  economyService: EconomyService;
  /** Leaderboard read/write service (Cloud Functions only). */
  leaderboardService: LeaderboardService;
  /** Replay record/playback storage service. */
  replayService: ReplayStorageService;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ServiceContext = createContext<Services | null>(null);

/**
 * Access all injected services from any child component.
 * Throws if called outside of <Providers />.
 */
export function useServices(): Services {
  const ctx = useContext(ServiceContext);
  if (!ctx) {
    throw new Error('useServices must be called inside <Providers />');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Module-level singleton service instances
//
// Instantiated once at module load time so they are stable across re-renders.
// Using module-level constants (rather than component state) is intentional:
// services are not React state — they are long-lived objects.
// ---------------------------------------------------------------------------

const audioEngine = new AudioEngine();
const hapticManager = new HapticManager();
const analyticsService = new AnalyticsService();
const economyService = new EconomyService();
const leaderboardService = new LeaderboardService();
const replayService = new ReplayStorageService();

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Wraps the entire app with every required provider.
 * Add new services here as features are implemented.
 */
export default function Providers({ children }: ProvidersProps): JSX.Element {
  // useMemo ensures the context value object reference is stable across
  // re-renders, preventing unnecessary context consumer re-renders.
  const services: Services = useMemo(
    () => ({
      audioEngine,
      hapticManager,
      analyticsService,
      economyService,
      leaderboardService,
      replayService,
    }),
    [],
  );

  return (
    <SafeAreaProvider>
      <ServiceContext.Provider value={services}>
        {children}
      </ServiceContext.Provider>
    </SafeAreaProvider>
  );
}
