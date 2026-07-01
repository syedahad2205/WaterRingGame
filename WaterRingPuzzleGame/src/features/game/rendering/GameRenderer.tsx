/**
 * GameRenderer — Top-level rendering compositor
 *
 * Composes the three visual layers (water, pegs, rings) by reading live
 * physics state from the PhysicsSharedBridge shared values and mapping
 * them to the data shapes expected by each sub-renderer.
 *
 * Layer order (bottom to top):
 *   1. WaterRenderer   — water body and animated surface
 *   2. PegRenderer     — static/moving pegs with glow
 *   3. RingRenderer    — rings with shadows and glows
 *
 * This component contains NO physics logic and NO game logic.
 * It only maps shared-value data to visual props.
 *
 * Requirements: 38.1, 38.2, 38.3, 4.3, 4.4
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import type { ChallengeConfig } from '../../../types/challenge';
import type { PhysicsSharedBridge } from '../../../types/game';

import WaterRenderer from './WaterRenderer';
import PegRenderer, { type PegData } from './PegRenderer';
import RingRenderer, { type RingData } from './RingRenderer';
import { useEquippedCosmetics } from '../../../hooks/useEquippedCosmetics';
import type { RingSkinConfig } from '../../../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GameRendererProps {
  bridge: PhysicsSharedBridge;
  config: ChallengeConfig;
  width: number;
  height: number;
  /**
   * When false the water animation freezes and sub-renderers skip redraws.
   * Set to false during pause, menus, and victory screens.
   */
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Distance threshold (px) at which a ring is considered "near" its target peg. */
const NEAR_PEG_DISTANCE = 100;

// ---------------------------------------------------------------------------
// GameRenderer component
// ---------------------------------------------------------------------------

/**
 * GameRenderer reads live state from the PhysicsSharedBridge and renders
 * all visual layers.  Reanimated `useDerivedValue` hooks subscribe to shared
 * values so that ring/peg data changes flow through to renderers without
 * triggering a React re-render on every physics tick.
 */
// eslint-disable-next-line max-lines-per-function
export default function GameRenderer({
  bridge,
  config,
  width,
  height,
  isActive,
}: GameRendererProps): React.JSX.Element {
  // ── Equipped cosmetics ───────────────────────────────────────────────────
  const cosmetics = useEquippedCosmetics();

  // ── Derive RingData[] from bridge ────────────────────────────────────────
  //
  // useDerivedValue runs on the UI thread; the result is a SharedValue that
  // React Skia will observe and re-render when it changes.
  const ringDataValue = useDerivedValue<RingData[]>(() => {
    const positions = bridge.ringPositions.value;
    const pegStates = bridge.pegStates.value;

    return config.rings.map((ring) => {
      const pos = positions.find((p) => p.id === ring.id);
      const isSettled = pegStates.some((p) => p.settledRingId === ring.id);

      // Compute isNearPeg: true when the ring is within NEAR_PEG_DISTANCE of
      // any peg that accepts this ring's colour and isn't already occupied.
      const ringX = pos?.x ?? ring.initialPosition.x;
      const ringY = pos?.y ?? ring.initialPosition.y;
      let isNearPeg = false;
      if (!isSettled) {
        for (const peg of config.pegs) {
          if (peg.acceptedColorId !== ring.colorId) continue;
          const pegOccupied = pegStates.some((ps) => ps.id === peg.id && ps.settledRingId != null);
          if (pegOccupied) continue;
          const dx = ringX - peg.position.x;
          const dy = ringY - peg.position.y;
          if (dx * dx + dy * dy <= NEAR_PEG_DISTANCE * NEAR_PEG_DISTANCE) {
            isNearPeg = true;
            break;
          }
        }
      }

      return {
        id: ring.id,
        x: ringX,
        y: ringY,
        angle: pos?.angle ?? 0,
        outerRadius: ring.outerRadius,
        innerRadius: ring.innerRadius,
        colorId: ring.colorId,
        skinId: ring.skinId,
        isSettled,
        isNearPeg,
      } satisfies RingData;
    });
  });

  // ── Derive PegData[] from bridge ──────────────────────────────────────────
  const pegDataValue = useDerivedValue<PegData[]>(() => {
    const pegStates = bridge.pegStates.value;

    return config.pegs.map((peg) => {
      const pegState = pegStates.find((ps) => ps.id === peg.id);

      return {
        id: peg.id,
        x: peg.position.x,
        y: peg.position.y,
        baseRadius: peg.baseRadius,
        tipRadius: peg.tipRadius,
        acceptedColorId: peg.acceptedColorId,
        glowColor: peg.glowColor ?? '#FFD600',
        isOccupied: pegState?.settledRingId != null,
      } satisfies PegData;
    });
  });

  // Read current derived values for the JS-side render.
  // These are snapshot reads — Skia Canvases inside sub-renderers will
  // re-render reactively via their own Reanimated subscriptions.
  const rings = ringDataValue.value;
  const pegs = pegDataValue.value;

  // Elapsed time (seconds) for glow / pulse animations — PegRenderer and
  // RingRenderer both accept a `t` prop.  We source it from the bridge timer
  // inverted so it counts up (total - remaining), clamped to avoid negatives.
  const totalSecs = config.timer.totalSeconds;
  const remaining = bridge.timerRemaining.value;
  const elapsedT = Math.max(0, totalSecs - remaining);

  return (
    <View style={styles.container}>
      {/* Layer 1 — Water body (always animates when isActive) */}
      <View style={StyleSheet.absoluteFill}>
        <WaterRenderer
          width={width}
          height={height}
          waterSurfaceY={config.arena.waterSurfaceY}
          waterColor={cosmetics.waterStyle.surface}
          themeId={config.arena.themeId}
          isActive={isActive}
        />
      </View>

      {/* Layer 2 — Pegs (above water) */}
      <View style={StyleSheet.absoluteFill}>
        <PegRenderer pegs={pegs} t={elapsedT} pegSkin={cosmetics.pegSkin} />
      </View>

      {/* Layer 3 — Rings (above pegs) */}
      <View style={StyleSheet.absoluteFill}>
        <RingRenderer rings={rings} t={elapsedT} ringSkin={cosmetics.ringSkin} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
