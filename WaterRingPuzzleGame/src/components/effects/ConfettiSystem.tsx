/**
 * ============================================================================
 * ConfettiSystem — Reusable Particle VFX Overlay
 * ============================================================================
 *
 * A performant, self-cleaning confetti / sparkle / coin / star particle system
 * built on react-native-reanimated for 60 fps animation.
 *
 * Features:
 *  - Four visual modes: confetti, sparkles, coins, stars
 *  - Particle pooling with configurable max count
 *  - Random position, velocity, rotation, color, size, and opacity decay
 *  - Colors sourced from the design system
 *  - Auto-cleanup: particles fade out and the component unmounts cleanly
 *  - Runs entirely on the UI thread via worklets
 *
 * Usage:
 *   <ConfettiSystem active type="confetti" count={40} />
 *   <ConfettiSystem active type="sparkles" count={25} origin={{ x: 200, y: 400 }} />
 *
 * @module ConfettiSystem
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DS } from '../../constants/designSystem';

// ============================================================================
// Types
// ============================================================================

/** Supported particle visual modes. */
export type ParticleType = 'confetti' | 'sparkles' | 'coins' | 'stars';

/** Optional origin point for the particle burst. */
export interface ParticleOrigin {
  x: number;
  y: number;
}

export interface ConfettiSystemProps {
  /** Whether the system is currently emitting. */
  active: boolean;
  /** Visual style of the particles. */
  type?: ParticleType;
  /** Number of particles to emit per burst. Clamped to MAX_PARTICLES. */
  count?: number;
  /** Origin point for the burst. Defaults to center-top of the screen. */
  origin?: ParticleOrigin;
  /** Duration in ms before auto-cleanup. Defaults to 2000. */
  duration?: number;
  /** Callback when all particles have finished. */
  onComplete?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Hard ceiling on particle count for performance. */
const MAX_PARTICLES = 80;

/** Default particle count per type. */
const DEFAULT_COUNTS: Record<ParticleType, number> = {
  confetti: 50,
  sparkles: 30,
  coins: 15,
  stars: 20,
};

/** Color palettes per type sourced from DS. */
const TYPE_COLORS: Record<ParticleType, readonly string[]> = {
  confetti: [
    DS.colors.accent,
    DS.colors.secondary,
    DS.colors.success,
    DS.colors.rings.coral,
    DS.colors.rings.lavender,
    DS.colors.rings.mint,
    DS.colors.rings.sunflower,
    DS.colors.rings.skyBlue,
  ],
  sparkles: [
    '#FFFFFF',
    DS.colors.accent,
    DS.colors.secondary,
    DS.colors.rings.sunflower,
  ],
  coins: [
    DS.colors.accent,
    '#FFC107',
    '#FFB300',
    '#FFD54F',
  ],
  stars: [
    DS.colors.accent,
    DS.colors.secondary,
    '#FFFFFF',
    DS.colors.rings.sunflower,
  ],
};

/** Size ranges per type [min, max] in logical pixels. */
const TYPE_SIZES: Record<ParticleType, readonly [number, number]> = {
  confetti: [6, 14],
  sparkles: [3, 8],
  coins: [10, 16],
  stars: [8, 14],
};

// ============================================================================
// Helpers
// ============================================================================

/** Pseudo-random number in range [min, max]. */
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Pick a random element from an array. */
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================================================
// Particle Data
// ============================================================================

interface ParticleConfig {
  /** Initial x position. */
  x: number;
  /** Initial y position. */
  y: number;
  /** Horizontal velocity (px/s). */
  vx: number;
  /** Vertical velocity — negative is upward (px/s). */
  vy: number;
  /** Rotation speed (rad/s). */
  rotationSpeed: number;
  /** Initial rotation. */
  rotation: number;
  /** Particle size. */
  size: number;
  /** Color string. */
  color: string;
  /** Aspect ratio for confetti rectangles. */
  aspectRatio: number;
  /** Delay before this particle starts (ms). */
  delay: number;
  /** Total lifetime (ms). */
  lifetime: number;
  /** Border radius factor (0 = square, 0.5 = circle). */
  borderRadiusFactor: number;
}

function generateParticles(
  count: number,
  type: ParticleType,
  origin: ParticleOrigin,
  duration: number,
): ParticleConfig[] {
  const clamped = Math.min(count, MAX_PARTICLES);
  const colors = TYPE_COLORS[type];
  const [minSize, maxSize] = TYPE_SIZES[type];

  const particles: ParticleConfig[] = [];

  for (let i = 0; i < clamped; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(200, 600);

    const baseLifetime = duration * rand(0.6, 1.0);
    const delay = rand(0, duration * 0.15);

    let aspectRatio = 1;
    let borderRadiusFactor = 0.5;

    switch (type) {
      case 'confetti':
        aspectRatio = rand(0.4, 1);
        borderRadiusFactor = rand(0, 0.15);
        break;
      case 'sparkles':
        borderRadiusFactor = 0.5;
        break;
      case 'coins':
        borderRadiusFactor = 0.5;
        break;
      case 'stars':
        // Stars use rotation and a diamond-ish shape
        borderRadiusFactor = rand(0.1, 0.3);
        break;
    }

    particles.push({
      x: origin.x + rand(-20, 20),
      y: origin.y + rand(-10, 10),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * -1, // negative = upward bias
      rotationSpeed: rand(-8, 8),
      rotation: rand(0, Math.PI * 2),
      size: rand(minSize, maxSize),
      color: pick(colors),
      aspectRatio,
      delay,
      lifetime: baseLifetime,
      borderRadiusFactor,
    });
  }

  return particles;
}

// ============================================================================
// Single Particle Component
// ============================================================================

interface ParticleProps {
  config: ParticleConfig;
  gravity: number;
}

const Particle = React.memo(function Particle({ config, gravity }: ParticleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: config.lifetime,
        easing: Easing.out(Easing.quad),
      }),
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [config, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const elapsed = t * config.lifetime;
    const seconds = elapsed / 1000;

    // Physics: position = initial + velocity*t + 0.5*gravity*t^2
    const x = config.x + config.vx * seconds;
    const y = config.y + config.vy * seconds + 0.5 * gravity * seconds * seconds;

    const rotation = config.rotation + config.rotationSpeed * seconds;

    // Opacity: hold at 1 for first 40%, then fade out
    const fadeStart = 0.4;
    const opacity = t < fadeStart ? 1 : 1 - (t - fadeStart) / (1 - fadeStart);

    // Scale: slight shrink as particle dies
    const scale = 1 - t * 0.3;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}rad` },
        { scale: Math.max(0, scale) },
      ],
      opacity: Math.max(0, opacity),
    };
  });

  const particleStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      width: config.size * config.aspectRatio,
      height: config.size,
      backgroundColor: config.color,
      borderRadius: config.size * config.borderRadiusFactor,
    }),
    [config],
  );

  return <Animated.View style={[particleStyle, animatedStyle]} />;
});

// ============================================================================
// ConfettiSystem Component
// ============================================================================

export const ConfettiSystem: React.FC<ConfettiSystemProps> = React.memo(
  function ConfettiSystem({
    active,
    type = 'confetti',
    count,
    origin,
    duration = 2000,
    onComplete,
  }) {
    const effectiveCount = count ?? DEFAULT_COUNTS[type];
    const effectiveOrigin = origin ?? { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.2 };
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [particles, setParticles] = React.useState<ParticleConfig[]>([]);

    // Gravity: confetti/coins fall harder, sparkles/stars float
    const gravity = useMemo(() => {
      switch (type) {
        case 'confetti':
          return 800;
        case 'coins':
          return 1000;
        case 'sparkles':
          return 200;
        case 'stars':
          return 300;
      }
    }, [type]);

    const handleComplete = useCallback(() => {
      setParticles([]);
      onComplete?.();
    }, [onComplete]);

    useEffect(() => {
      if (active) {
        const generated = generateParticles(
          effectiveCount,
          type,
          effectiveOrigin,
          duration,
        );
        setParticles(generated);

        // Auto-cleanup after the longest particle lifetime + buffer
        const maxLifetime = Math.max(...generated.map((p) => p.delay + p.lifetime));
        timeoutRef.current = setTimeout(() => {
          runOnJS(handleComplete)();
        }, maxLifetime + 100);
      } else {
        setParticles([]);
      }

      return () => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [active, effectiveCount, type, effectiveOrigin.x, effectiveOrigin.y, duration, handleComplete]);

    if (particles.length === 0) {
      return null;
    }

    return (
      <View style={styles.container} pointerEvents="none">
        {particles.map((config, index) => (
          <Particle key={index} config={config} gravity={gravity} />
        ))}
      </View>
    );
  },
);

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: DS.zIndex.overlay,
    overflow: 'hidden',
  },
});

export default ConfettiSystem;
