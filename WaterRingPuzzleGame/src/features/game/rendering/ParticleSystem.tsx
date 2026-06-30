/**
 * ParticleSystem — Particle effect renderer and utilities
 *
 * Renders a set of short-lived particles (e.g. ring-landing splashes) using
 * @shopify/react-native-skia Canvas + Circle primitives.
 *
 * This component is display-only: it accepts a `particles` array and renders
 * it.  All animation is caller-driven — the caller updates the particles array
 * each frame using `tickParticles`, triggering a React re-render.
 *
 * Exported utilities:
 *   - `createRingLandParticles` — spawns a burst of particles at (x, y)
 *   - `tickParticles`           — advances particle physics by dt seconds
 *
 * Requirements: 38.4, 4.3
 */

import React from 'react';
import { Canvas, Circle, Skia } from '@shopify/react-native-skia';

// ---------------------------------------------------------------------------
// ParticleData interface
// ---------------------------------------------------------------------------

/**
 * Data representation of a single particle.
 * All fields are plain numbers/strings — no Skia objects stored here.
 */
export interface ParticleData {
  /** Unique identifier for React key reconciliation. */
  id: string;
  /** Horizontal position in logical pixels. */
  x: number;
  /** Vertical position in logical pixels. */
  y: number;
  /** Circle radius in logical pixels. */
  radius: number;
  /** CSS hex or rgba color string. */
  color: string;
  /** Base opacity (0–1). Final opacity is scaled by life / maxLife. */
  opacity: number;
  /** Horizontal velocity in px/s. */
  velocityX: number;
  /** Vertical velocity in px/s. */
  velocityY: number;
  /** Remaining lifetime in seconds. */
  life: number;
  /** Total lifetime in seconds (used to compute fade-out factor). */
  maxLife: number;
}

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

export interface ParticleSystemProps {
  particles: ParticleData[];
  width: number;
  height: number;
}

// ---------------------------------------------------------------------------
// ParticleSystem component
// ---------------------------------------------------------------------------

/**
 * Renders all live particles onto a Skia Canvas.
 * Each particle fades out linearly as its `life` approaches zero.
 */
export default function ParticleSystem({
  particles,
  width,
  height,
}: ParticleSystemProps): React.JSX.Element {
  if (particles.length === 0 || width <= 0 || height <= 0) {
    return <Canvas style={{ width: 0, height: 0 }} />;
  }

  return (
    <Canvas
      style={{ width, height }}
      accessibilityLabel="Particle effects layer"
    >
      {particles.map((particle) => {
        const lifeFraction = particle.maxLife > 0
          ? Math.max(0, Math.min(1, particle.life / particle.maxLife))
          : 0;
        const effectiveAlpha = particle.opacity * lifeFraction;

        // Parse base color and apply effective alpha via Skia paint.
        const paint = Skia.Paint();
        paint.setColor(Skia.Color(particle.color));
        paint.setAlphaf(effectiveAlpha);
        paint.setAntiAlias(true);

        return (
          <Circle
            key={particle.id}
            cx={particle.x}
            cy={particle.y}
            r={Math.max(0.5, particle.radius)}
            paint={paint}
          />
        );
      })}
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Utility: createRingLandParticles
// ---------------------------------------------------------------------------

/** Counter used to generate unique particle IDs without a global random suffix clash. */
let _particleCounter = 0;

/**
 * Generates a radial burst of particles centered at (x, y).
 *
 * @param x      - Center X of the burst in logical pixels.
 * @param y      - Center Y of the burst in logical pixels.
 * @param color  - Hex / rgba color string for all particles in this burst.
 * @param count  - Number of particles to spawn (default 8).
 * @returns      Array of freshly created ParticleData objects.
 */
export function createRingLandParticles(
  x: number,
  y: number,
  color: string,
  count = 8,
): ParticleData[] {
  const particles: ParticleData[] = [];
  const baseSpeed = 120; // px/s
  const speedVariance = 60; // px/s
  const baseLife = 0.6; // seconds
  const lifeVariance = 0.3;
  const baseRadius = 4;
  const radiusVariance = 3;

  for (let i = 0; i < count; i++) {
    // Spread particles evenly around the circle with a small random jitter.
    const angleStep = (2 * Math.PI) / count;
    const angle = i * angleStep + (Math.random() - 0.5) * angleStep * 0.5;
    const speed = baseSpeed + (Math.random() - 0.5) * 2 * speedVariance;

    const life = baseLife + (Math.random() - 0.5) * 2 * lifeVariance;
    const radius = baseRadius + Math.random() * radiusVariance;

    _particleCounter += 1;

    particles.push({
      id: `p_${_particleCounter}_${Date.now()}`,
      x,
      y,
      radius,
      color,
      opacity: 0.9,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      life,
      maxLife: life,
    });
  }

  return particles;
}

// ---------------------------------------------------------------------------
// Utility: tickParticles
// ---------------------------------------------------------------------------

/**
 * Advances all particles by `dt` seconds.
 *
 * - Moves each particle according to its velocity.
 * - Subtracts `dt` from each particle's remaining `life`.
 * - Filters out particles whose `life` has reached 0 or below.
 *
 * @param particles - Current particle array.
 * @param dt        - Delta time in seconds since the last tick.
 * @returns A new array containing only the still-alive particles.
 */
export function tickParticles(
  particles: ParticleData[],
  dt: number,
): ParticleData[] {
  const result: ParticleData[] = [];

  for (const p of particles) {
    const newLife = p.life - dt;
    if (newLife <= 0) {
      // Particle is dead — omit from output.
      continue;
    }

    result.push({
      ...p,
      x: p.x + p.velocityX * dt,
      y: p.y + p.velocityY * dt,
      life: newLife,
    });
  }

  return result;
}
