/**
 * colorBlindPalette — Epic 17 Task 17.2.1
 *
 * Provides accessible color alternatives for all 6 ring/peg colors
 * in 3 color-blind presets (deuteranopia, protanopia, tritanopia).
 *
 * Each color also has a pattern discriminator for shape-based differentiation
 * (never relying on color alone, per WCAG 1.4.1).
 *
 * Requirements: 54.3
 */

export type ColorBlindPreset = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia';
export type RingColorId = 'blue' | 'red' | 'green' | 'yellow' | 'purple' | 'orange';
export type PatternId = 'solid' | 'stripes' | 'dots' | 'crosshatch' | 'checkers' | 'waves';

export interface RingVisual {
  fill: string;
  stroke: string;
  pattern: PatternId;
  ariaLabel: string; // spoken by screen reader instead of color name
}

// Base (no color-blind adjustment)
const BASE: Record<RingColorId, RingVisual> = {
  blue:   { fill: '#4FC3F7', stroke: '#0288D1', pattern: 'solid',      ariaLabel: 'Blue ring' },
  red:    { fill: '#EF5350', stroke: '#C62828', pattern: 'stripes',    ariaLabel: 'Red ring' },
  green:  { fill: '#66BB6A', stroke: '#2E7D32', pattern: 'dots',       ariaLabel: 'Green ring' },
  yellow: { fill: '#FFEE58', stroke: '#F9A825', pattern: 'checkers',   ariaLabel: 'Yellow ring' },
  purple: { fill: '#AB47BC', stroke: '#6A1B9A', pattern: 'crosshatch', ariaLabel: 'Purple ring' },
  orange: { fill: '#FFA726', stroke: '#E65100', pattern: 'waves',      ariaLabel: 'Orange ring' },
};

// Deuteranopia (red-green blindness) — shift reds toward orange, greens toward blue
const DEUTERANOPIA: Record<RingColorId, RingVisual> = {
  blue:   { fill: '#4FC3F7', stroke: '#0288D1', pattern: 'solid',      ariaLabel: 'Blue ring (circle)' },
  red:    { fill: '#E69F00', stroke: '#B37700', pattern: 'stripes',    ariaLabel: 'Orange-stripe ring' },
  green:  { fill: '#56B4E9', stroke: '#0072B2', pattern: 'dots',       ariaLabel: 'Light-blue-dot ring' },
  yellow: { fill: '#F0E442', stroke: '#C9BC00', pattern: 'checkers',   ariaLabel: 'Yellow-check ring' },
  purple: { fill: '#CC79A7', stroke: '#8B3A6B', pattern: 'crosshatch', ariaLabel: 'Pink-cross ring' },
  orange: { fill: '#D55E00', stroke: '#9E4500', pattern: 'waves',      ariaLabel: 'Burnt-orange-wave ring' },
};

// Protanopia (red blindness) — similar to deuteranopia but different severity
const PROTANOPIA: Record<RingColorId, RingVisual> = {
  blue:   { fill: '#4FC3F7', stroke: '#0288D1', pattern: 'solid',      ariaLabel: 'Blue ring (circle)' },
  red:    { fill: '#DDAA33', stroke: '#AA7700', pattern: 'stripes',    ariaLabel: 'Gold-stripe ring' },
  green:  { fill: '#009E73', stroke: '#006B4E', pattern: 'dots',       ariaLabel: 'Teal-dot ring' },
  yellow: { fill: '#F0E442', stroke: '#C9BC00', pattern: 'checkers',   ariaLabel: 'Yellow-check ring' },
  purple: { fill: '#CC79A7', stroke: '#8B3A6B', pattern: 'crosshatch', ariaLabel: 'Pink-cross ring' },
  orange: { fill: '#999933', stroke: '#666600', pattern: 'waves',      ariaLabel: 'Olive-wave ring' },
};

// Tritanopia (blue-yellow blindness) — shift blues toward green, yellows toward pink
const TRITANOPIA: Record<RingColorId, RingVisual> = {
  blue:   { fill: '#00CED1', stroke: '#008B8B', pattern: 'solid',      ariaLabel: 'Teal ring (circle)' },
  red:    { fill: '#EF5350', stroke: '#C62828', pattern: 'stripes',    ariaLabel: 'Red-stripe ring' },
  green:  { fill: '#66BB6A', stroke: '#2E7D32', pattern: 'dots',       ariaLabel: 'Green-dot ring' },
  yellow: { fill: '#FF69B4', stroke: '#C71585', pattern: 'checkers',   ariaLabel: 'Pink-check ring' },
  purple: { fill: '#9400D3', stroke: '#6600A0', pattern: 'crosshatch', ariaLabel: 'Violet-cross ring' },
  orange: { fill: '#FF6347', stroke: '#CC3300', pattern: 'waves',      ariaLabel: 'Tomato-wave ring' },
};

const PALETTES: Record<ColorBlindPreset, Record<RingColorId, RingVisual>> = {
  none:         BASE,
  deuteranopia: DEUTERANOPIA,
  protanopia:   PROTANOPIA,
  tritanopia:   TRITANOPIA,
};

export function getRingVisual(colorId: RingColorId, preset: ColorBlindPreset): RingVisual {
  return PALETTES[preset]?.[colorId] ?? BASE[colorId];
}

export function getAllRingVisuals(preset: ColorBlindPreset): Record<RingColorId, RingVisual> {
  return PALETTES[preset] ?? BASE;
}

export const RING_COLOR_IDS: RingColorId[] = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'];
