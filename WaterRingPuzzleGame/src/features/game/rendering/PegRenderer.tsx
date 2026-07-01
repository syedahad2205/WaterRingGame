/**
 * PegRenderer — Layer: Pegs
 *
 * Renders each game peg with:
 *   1. Cone shape: trapezoid narrowing from baseRadius at bottom to tipRadius at top
 *   2. Glow: 1.5 Hz pulsing glow (opacity 0.3–0.6) in glowColor when occupied
 *   3. Color indicator: small colored dot at the tip showing the required ring color
 *
 * Uses @shopify/react-native-skia for GPU-accelerated rendering.
 *
 * Requirements: 38.3, 4.3
 */

import React, { useMemo } from 'react';
import {
  Canvas,
  Path,
  Circle,
  Skia,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';

import { RING_COLOR_MAP } from '../../../constants/ui';
import { DS } from '../../../constants/designSystem';
import type { PegSkinConfig } from '../../../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PegData {
  id: string;
  x: number;
  y: number;
  baseRadius: number;
  tipRadius: number;
  acceptedColorId: string;
  glowColor: string;
  isOccupied: boolean;
}

export interface PegRendererProps {
  pegs: PegData[];
  /** Elapsed time in seconds, used for glow animation. */
  t: number;
  /** Optional equipped peg skin config — overrides default peg body color. */
  pegSkin?: PegSkinConfig | null;
}

const DEFAULT_INDICATOR_COLOR = '#FFFFFF';

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const GLOW_FREQUENCY = 1.5; // Hz

/**
 * Maps sin(2π × freq × t) from [-1, 1] to [min, max].
 */
function pulseValue(t: number, min: number, max: number): number {
  const normalized = (Math.sin(2 * Math.PI * GLOW_FREQUENCY * t) + 1) / 2;
  return min + normalized * (max - min);
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

/** Height of the peg cone (design.md peg dimensions). */
const PEG_HEIGHT = 40;
/** Extra padding around each peg for glows. */
const CANVAS_PADDING = 24;
/** Radius of the color indicator dot at the tip. */
const INDICATOR_DOT_RADIUS = 6;
/** Color of the peg body. */
const PEG_BODY_COLOR = '#B0BEC5'; // blue-grey — Skia rendering constant, no DS equivalent

/** Module-level peg body paint — colour never changes. */
const BODY_PAINT = Skia.Paint();
BODY_PAINT.setColor(Skia.Color(PEG_BODY_COLOR));
BODY_PAINT.setAntiAlias(true);

// ---------------------------------------------------------------------------
// PegRenderer component
// ---------------------------------------------------------------------------

/**
 * PegRenderer renders all game pegs onto a single Skia Canvas.
 */
export default function PegRenderer({ pegs, t, pegSkin }: PegRendererProps): React.JSX.Element {
  if (pegs.length === 0) {
    return <Canvas style={{ width: 0, height: 0 }} />;
  }

  // Determine bounding box to size the canvas.
  let maxX = 0;
  let maxY = 0;

  for (const peg of pegs) {
    const extent = peg.baseRadius + CANVAS_PADDING;
    if (peg.x + extent > maxX) maxX = peg.x + extent;
    if (peg.y + extent > maxY) maxY = peg.y + extent;
  }

  const canvasWidth = Math.max(maxX, 1);
  const canvasHeight = Math.max(maxY, 1);

  return (
    <Canvas
      style={{ width: canvasWidth, height: canvasHeight }}
      accessibilityLabel="Peg layer"
    >
      {pegs.map((peg) => (
        <PegSingle key={peg.id} peg={peg} t={t} pegSkin={pegSkin} />
      ))}
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Single peg rendering
// ---------------------------------------------------------------------------

interface PegSingleProps {
  peg: PegData;
  t: number;
  pegSkin?: PegSkinConfig | null;
}

// eslint-disable-next-line max-lines-per-function
function PegSingle({ peg, t, pegSkin }: PegSingleProps): React.JSX.Element {
  const { x, y, baseRadius, tipRadius, acceptedColorId, glowColor, isOccupied } = peg;

  // Build peg body paint from equipped skin or default
  const bodyPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(pegSkin?.base ?? PEG_BODY_COLOR));
    p.setAntiAlias(true);
    return p;
  }, [pegSkin]);

  // ── 1. Cone (trapezoid) path ───────────────────────────────────────────────
  const topY = y - PEG_HEIGHT;
  const conePath = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(x - baseRadius, y);            // bottom-left
    p.lineTo(x + baseRadius, y);            // bottom-right
    p.lineTo(x + tipRadius, topY);          // top-right
    p.lineTo(x - tipRadius, topY);          // top-left
    p.close();
    return p;
  }, [x, y, baseRadius, tipRadius, topY]);

  // ── 2. Glow when occupied ────────────────────────────────────────────────
  const glowOpacity = isOccupied ? pulseValue(t, 0.3, 0.6) : 0;

  const glowPaint = useMemo(() => {
    const p = Skia.Paint();
    p.setColor(Skia.Color(glowColor));
    p.setAntiAlias(true);
    return p;
  }, [glowColor]);
  // Alpha changes each frame — mutate the cached paint.
  glowPaint.setAlphaf(glowOpacity);

  // Glow ellipse radius covers the whole peg.
  const glowPath = useMemo(() => {
    const glowW = baseRadius + 12;
    const glowH = (PEG_HEIGHT / 2) + 12;
    const glowCy = y - PEG_HEIGHT / 2;
    const p = Skia.Path.Make();
    p.addOval({
      x: x - glowW,
      y: glowCy - glowH,
      width: glowW * 2,
      height: glowH * 2,
    });
    return p;
  }, [x, y, baseRadius]);

  // ── 3. Color indicator dot at tip ────────────────────────────────────────
  const dotPaint = useMemo(() => {
    const indicatorColor = RING_COLOR_MAP[acceptedColorId] ?? DEFAULT_INDICATOR_COLOR;
    const p = Skia.Paint();
    p.setColor(Skia.Color(indicatorColor));
    p.setAntiAlias(true);
    return p;
  }, [acceptedColorId]);

  return (
    <Group>
      {/* Glow — rendered behind the peg body */}
      {isOccupied && glowOpacity > 0 && (
        <Path path={glowPath} paint={glowPaint}>
          <BlurMask blur={14} style="solid" respectCTM={false} />
        </Path>
      )}

      {/* Cone body */}
      <Path path={conePath} paint={bodyPaint} />

      {/* Color indicator dot at the tip */}
      <Circle
        cx={x}
        cy={topY}
        r={INDICATOR_DOT_RADIUS}
        paint={dotPaint}
      />
    </Group>
  );
}

// Re-export types for consumers.
export type { PegData as PegRendererPegData };
