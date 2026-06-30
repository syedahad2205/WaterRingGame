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

import React from 'react';
import {
  Canvas,
  Circle,
  Path,
  Skia,
  BlurMask,
  Group,
} from '@shopify/react-native-skia';

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
}

// ---------------------------------------------------------------------------
// Color map (design.md color palette)
// ---------------------------------------------------------------------------

const RING_COLOR_MAP: Record<string, string> = {
  red: '#F44336',
  blue: '#2196F3',
  green: '#4CAF50',
  yellow: '#FFEB3B',
  purple: '#9C27B0',
  orange: '#FF9800',
};

const DEFAULT_RING_COLOR = '#2196F3';

/** Near-peg glow color (distinct from the settled glow). */
const NEAR_PEG_GLOW_COLOR = '#FFD700'; // golden yellow
const SETTLED_GLOW_COLOR = '#FFFFFF'; // white pulse

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

// ---------------------------------------------------------------------------
// RingRenderer component
// ---------------------------------------------------------------------------

/**
 * RingRenderer renders all game rings onto a single Skia Canvas.
 * The canvas spans the full layout area; each ring is drawn at its (x, y) position.
 */
export default function RingRenderer({ rings, t }: RingRendererProps): React.JSX.Element {
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
        <RingSingle key={ring.id} ring={ring} t={t} />
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
}

function RingSingle({ ring, t }: RingSingleProps): React.JSX.Element {
  const { x, y, outerRadius, innerRadius, colorId, isSettled, isNearPeg } = ring;

  const ringColor = RING_COLOR_MAP[colorId] ?? DEFAULT_RING_COLOR;

  // ── 1. Drop shadow ────────────────────────────────────────────────────────
  // A soft dark ellipse positioned slightly below the ring centre.
  const shadowPaint = Skia.Paint();
  shadowPaint.setColor(Skia.Color('rgba(0,0,0,0.25)'));
  shadowPaint.setAntiAlias(true);

  // ── 2. Settled glow (1.5 Hz pulse, opacity 0.3–0.8) ─────────────────────
  const settledGlowOpacity = isSettled ? pulseValue(t, 0.3, 0.8) : 0;
  const settledGlowPaint = Skia.Paint();
  settledGlowPaint.setColor(Skia.Color(SETTLED_GLOW_COLOR));
  settledGlowPaint.setAlphaf(settledGlowOpacity);
  settledGlowPaint.setAntiAlias(true);

  // ── 3. Near-peg glow (1.5 Hz pulse, opacity 0.3–0.8) ────────────────────
  const nearPegGlowOpacity = isNearPeg && !isSettled ? pulseValue(t, 0.3, 0.8) : 0;
  const nearPegGlowPaint = Skia.Paint();
  nearPegGlowPaint.setColor(Skia.Color(NEAR_PEG_GLOW_COLOR));
  nearPegGlowPaint.setAlphaf(nearPegGlowOpacity);
  nearPegGlowPaint.setAntiAlias(true);

  // ── 4. Torus (outer circle minus inner circle using even-odd fill) ────────
  const torusPath = Skia.Path.Make();
  torusPath.addCircle(x, y, outerRadius);
  torusPath.addCircle(x, y, innerRadius);
  torusPath.setFillType(1); // FillType.EvenOdd = 1

  const torusPaint = Skia.Paint();
  torusPaint.setColor(Skia.Color(ringColor));
  torusPaint.setAntiAlias(true);

  // ── 5. Highlight arc (upper-left, ~30°, 70% white, 3px stroke) ────────────
  // The arc spans from ~210° to ~240° (upper-left quadrant) in standard math
  // convention. In Skia, 0° is at 3 o'clock; sweep is clockwise.
  // Upper-left is approximately 195° to 225° from 3 o'clock.
  const highlightPath = Skia.Path.Make();
  const highlightRadius = (outerRadius + innerRadius) / 2; // midpoint of torus
  const startAngleDeg = 195;
  const sweepAngleDeg = 30;
  const highlightRect = {
    x: x - highlightRadius,
    y: y - highlightRadius,
    width: highlightRadius * 2,
    height: highlightRadius * 2,
  };
  highlightPath.addArc(highlightRect, startAngleDeg, sweepAngleDeg);

  const highlightPaint = Skia.Paint();
  highlightPaint.setColor(Skia.Color('rgba(255,255,255,0.70)'));
  highlightPaint.setStyle(1); // PaintStyle.Stroke = 1
  highlightPaint.setStrokeWidth(3);
  highlightPaint.setAntiAlias(true);
  highlightPaint.setStrokeCap(1); // StrokeCap.Round = 1

  const glowRadius = outerRadius + 10;

  return (
    <Group>
      {/* Drop shadow — slightly offset ellipse below the ring */}
      <Circle
        cx={x}
        cy={y + outerRadius * 0.15}
        r={outerRadius * 0.9}
        paint={shadowPaint}
      >
        <BlurMask blur={8} style="normal" respectCTM={false} />
      </Circle>

      {/* Settled glow (rendered behind the ring) */}
      {isSettled && settledGlowOpacity > 0 && (
        <Circle cx={x} cy={y} r={glowRadius} paint={settledGlowPaint}>
          <BlurMask blur={12} style="solid" respectCTM={false} />
        </Circle>
      )}

      {/* Near-peg glow (rendered behind the ring) */}
      {isNearPeg && !isSettled && nearPegGlowOpacity > 0 && (
        <Circle cx={x} cy={y} r={glowRadius} paint={nearPegGlowPaint}>
          <BlurMask blur={12} style="solid" respectCTM={false} />
        </Circle>
      )}

      {/* Torus shape */}
      <Path path={torusPath} paint={torusPaint} />

      {/* Highlight arc */}
      <Path path={highlightPath} paint={highlightPaint} />
    </Group>
  );
}

// Re-export types for consumers.
export type { RingData as RingRendererRingData };
