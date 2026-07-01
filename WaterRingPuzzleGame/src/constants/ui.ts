// UI Constants for Water Ring Puzzle Game

export const COLORS = {
  background: '#0A0E1A',
  surface: '#161B2E',
  primary: '#2196F3',
  secondary: '#00BCD4',
  accent: '#FFD600',
  success: '#4CAF50',
  danger: '#F44336',
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  ring: [
    '#F44336', // red
    '#2196F3', // blue
    '#4CAF50', // green
    '#FFD600', // yellow
    '#9C27B0', // purple
    '#FF9800', // orange
  ] as const,
  water: '#1565C0',
  waterSurfaceTint: '#2196F3',
} as const;

export const TYPOGRAPHY = {
  fontSizeXS: 10,
  fontSizeSM: 12,
  fontSizeMD: 14,
  fontSizeLG: 16,
  fontSizeXL: 20,
  fontSizeXXL: 24,
  fontSizeXXXL: 32,
  fontSizeDISPLAY: 48,
  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  FULL: 9999,
} as const;

export const SHADOWS = {
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.32,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

export const ANIMATION = {
  durationFast: 150,
  durationNormal: 300,
  durationSlow: 500,
} as const;

export const ARENA = {
  width: 390,
  height: 844,
  waterSurfaceRatio: 0.05,
  pegZonePadding: 0.10,
} as const;

export const GAME = {
  /** Must match physics.ts RING_SMALL_RADIUS (Requirement 23.1). */
  ringOuterRadiusSmall: 22,
  /** Must match physics.ts RING_MEDIUM_RADIUS (Requirement 23.2). */
  ringOuterRadiusMedium: 32,
  /** Must match physics.ts RING_LARGE_RADIUS (Requirement 23.3). */
  ringOuterRadiusLarge: 44,
  pegBaseRadius: 12,
  pegTipRadius: 6,
  waterColor: '#1565C0',
} as const;

/**
 * Color-ID → hex lookup shared by RingRenderer and PegRenderer.
 * Single source of truth so updates propagate everywhere.
 */
export const RING_COLOR_MAP: Record<string, string> = {
  red: '#F44336',
  blue: '#2196F3',
  green: '#4CAF50',
  yellow: '#FFEB3B',
  purple: '#9C27B0',
  orange: '#FF9800',
} as const;

export const DEFAULT_RING_COLOR = '#2196F3';

export const Z_INDEX = {
  game: 1,
  hud: 10,
  modal: 100,
  toast: 200,
} as const;
