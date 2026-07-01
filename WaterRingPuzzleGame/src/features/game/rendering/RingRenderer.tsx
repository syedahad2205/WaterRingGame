/**
 * RingRenderer — Layer: Rings
 *
 * Renders each game ring as a torus (outer circle minus inner circle) with:
 *   1. Torus shape in the ring's assigned color
 *   2. Inner highlight arc at ~30° upper-left, 3px white stroke at 70% opacity
 *   3. Drop shadow ellipse below the ring
 *   4. Settled glow: 1.5 Hz pulsing glow when isSettled = true
 *   5. Near-peg glow: 1.5 Hz pulsing glow in a different color when isNearPeg = true
 *
 * Uses @shopify/react-native-skia for GPU-accelerated rendering.
 *
 * Requirements: 38.2, 4.3
 */

import React, { useMemo } from 'react';
import {
  Canvas,
  Circle,
  Path,
  Skia,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';

import { RING_COLOR_MAP, DEFAULT_RING_COLOR } from '../../../constants/ui';
import { DS } from '../../../constants/designSystem';
import type { RingSkinConfig } from '../../../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RingData {
  id: string;
  x: number;
  y: number;
  angle: number;
  outerRadius: number;
  innerRadius: number;
  colorId: string;
  skinId: string;
  isSettled: boolean;
  /** True when the ring is within 100px of its target peg. */
  isNearPeg: boolean;
}

export interface RingRendererProps {
  rings: RingData[];
  /** Elapsed time in seconds, used for animations. */
  t: number;
  /** Optional equipped ring skin config — overrides default ring colors. */
  ringSkin?: RingSkinConfig | null;
}

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

/** Near-peg glow color (distinct from the settled glow). */
const NEAR_PEG_GLOW_COLOR = DS.colors.accent; // golden yellow
const SETTLED_GLOW_COLOR = '#FFFFFF'; // white pulse (pure white needed for Skia blend)

// ---------------------------------------------------------------------------
// Animation helpers
// ---------------------------------------------------------------------------

const GLOW_FREQUENCY = 1.5; // Hz

/**
 * Maps sin(2π × freq × t) from [-1, 1] to [min, max].
 */
function pulseValue(t: number, min: number, max: number): number {
  const normalized = (Math.sin(2 * Math.PI * GLOW_FREQUENCY * t) + 1) / 2; // [0, 1]
  return min + normalized * (max - min);
}

// ---------------------------------------------------------------------------
// Canvas size (fits the largest possible ring + glow margin)
// ---------------------------------------------------------------------------

/** Extra space around the ring for shadows and glows. */
const CANVAS_PADDING = 24;

// Module-level paints that never change between renders.

const SHADOW_PAINT = Skia.Paint();
SHADOW_PAINT.setColor(Skia.Color('rgba(0,0,0,0.25)'));
SHADOW_PAINT.setAntiAlias(true);

const SETTLED_GLOW_PAINT = Skia.Paint();
SETTLED_GLOW_PAINT.setColor(Skia.Color(SETTLED_GLOW_COLOR));
SETTLED_GLOW_PAINT.setAntiAlias(true);

const NEAR_PEG_GLOW_PAINT = Skia.Paint();
NEAR_PEG_GLOW_PAINT.setColor(Skia.Color(NEAR_PEG_GLOW_COLOR));
NEAR_PEG_GLOW_PAINT.setAntiAlias(true);

const HIGHLIGHT_PAINT = Skia.Paint();
HIGHLIGHT_PAINT.setColor(Skia.Color('rgba(255,255,255,0.70)'));
HIGHLIGHT_PAINT.setStyle(1); // PaintStyle.Stroke = 1
HIGHLIGHT_PAINT.setStrokeWidth(3);
HIGHLIGHT_PAINT.setAntiAlias(true);
HIGHLIGHT_PAINT.setStrokeCap(1); // StrokeCap.Round = 1

// ---------------------------------------------------------------------------
// RingRenderer component
// ---------------------------------------------------------------------------

/**
 * RingRenderer renders all game rings onto a single Skia Canvas.
 * The canvas spans the full layout area; each ring is drawn at its (x, y) position.
 */
export default function RingRenderer({ rings, t, ringSkin }: RingRendererProps): React.JSX.Element {
  if (rings.length === 0) {
    return <Canvas style={{ width: 0, height: 0 }} />;
  }

  // Determine the bounding box of all rings to size the canvas.
  let maxX = 0;
  let maxY = 0;

  for (const ring of rings) {
    const extent = ring.outerRadius + CANVAS_PADDING;
    if (ring.x + extent > maxX) maxX = ring.x + extent;
    if (ring.y + extent > maxY) maxY = ring.y + extent;
  }

  const canvasWidth = Math.max(maxX, 1);
  const canvasHeight = Math.max(maxY, 1);

  return (
    <Canvas
      style={{ width: canvasWidth, height: canvasHeight }}
      accessibilityLabel="Ring layer"
    >
      {rings.map((ring) => (
        <RingSingle key={ring.id} ring={ring} t={t} ringSkin={ringSkin} />
      ))}
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Single ring rendering
// ---------------------------------------------------------------------------

interface RingSingleProps {
  ring: RingData;
  t: number;
  ringSkin?: RingSkinConfig | null;
}

// eslint-disable-next-line max-lines-per-function
function RingSingle({ ring, t, ringSkin }: RingSingleProps): React.JSX.Element {
  const { x, y, outerRadius, innerRadius, colorId, isSettled, isNearPeg } = ring;

  // ── 1. Torus path (memoized — only changes when position/size changes) ────
  const torusPath = useMemo(() => {
    const p = Skia.Path.Make();
    p.addCircle(x, y, outerRadius);
    p.addCircle(x, y, innerRadius);
    p.setFillType(1); // FillType.EvenOdd = 1
    return p;
  }, [x, y, outerRadius, innerRadius]);

  // ── 2. Torus paint — uses equipped skin if available, else default ────────
  const torusPaint = useMemo(() => {
    let ringColor: string;
    if (ringSkin?.colors[colorId]) {
      ringColor = ringSkin.colors[colorId].fill;
    } else {
      ringColor = RING_COLOR_MAP[colorId] ?? DEFAULT_RING_COLOR;
    }
    const p = Skia.Paint();
    p.setColor(Skia.Color(ringColor));
    p.setAntiAlias(true);
    return p;
  }, [colorId, ringSkin]);

  // ── 3. Highlight arc path ─────────────────────────────────────────────────
  const highlightPath = useMemo(() => {
    const highlightRadius = (outerRadius + innerRadius) / 2;
    const p = Skia.Path.Make();
    p.addArc(
      {
        x: x - highlightRadius,
        y: y - highlightRadius,
        width: highlightRadius * 2,
        height: highlightRadius * 2,
      },
      195, // startAngleDeg
      30,  // sweepAngleDeg
    );
    return p;
  }, [x, y, outerRadius, innerRadius]);

  // ── 4. Glow opacity (changes every frame via pulse) ───────────────────────
  const settledGlowOpacity = isSettled ? pulseValue(t, 0.3, 0.8) : 0;
  const nearPegGlowOpacity = isNearPeg && !isSettled ? pulseValue(t, 0.3, 0.8) : 0;

  // Mutate module-level glow paints' alpha for this frame.
  // Safe because Skia renders synchronously within the same frame.
  SETTLED_GLOW_PAINT.setAlphaf(settledGlowOpacity);
  NEAR_PEG_GLOW_PAINT.setAlphaf(nearPegGlowOpacity);

  const glowRadius = outerRadius + 10;

  return (
    <Group>
      {/* Drop shadow — slightly offset ellipse below the ring */}
      <Circle
        cx={x}
        cy={y + outerRadius * 0.15}
        r={outerRadius * 0.9}
        paint={SHADOW_PAINT}
      >
        <BlurMask blur={8} style="normal" respectCTM={false} />
      </Circle>

      {/* Settled glow (rendered behind the ring) */}
      {isSettled && settledGlowOpacity > 0 && (
        <Circle cx={x} cy={y} r={glowRadius} paint={SETTLED_GLOW_PAINT}>
          <BlurMask blur={12} style="solid" respectCTM={false} />
        </Circle>
      )}

      {/* Near-peg glow (rendered behind the ring) */}
      {isNearPeg && !isSettled && nearPegGlowOpacity > 0 && (
        <Circle cx={x} cy={y} r={glowRadius} paint={NEAR_PEG_GLOW_PAINT}>
          <BlurMask blur={12} style="solid" respectCTM={false} />
        </Circle>
      )}

      {/* Torus shape */}
      <Path path={torusPath} paint={torusPaint} />

      {/* Highlight arc */}
      <Path path={highlightPath} paint={HIGHLIGHT_PAINT} />
    </Group>
  );
}

// Re-export types for consumers.
export type { RingData as RingRendererRingData };
