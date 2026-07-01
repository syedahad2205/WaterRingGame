/**
 * ============================================================================
 * Water Ring Puzzle Game — Design System
 * ============================================================================
 *
 * Comprehensive, production-quality design tokens for the Water Ring Puzzle
 * mobile game built with React Native and Skia.
 *
 * This file is the single source of truth for all visual constants:
 * colors, typography, spacing, radii, shadows, animation, glass styles,
 * and z-index layering.
 *
 * Usage:
 *   import { DS } from '@/constants/designSystem';
 *   const bg = DS.colors.background;
 *   const pad = DS.spacing.lg;
 *
 * @module designSystem
 */

// ============================================================================
// SECTION: Color Palette
// ============================================================================

/**
 * Full color palette for the game UI.
 *
 * Built around a deep-navy dark theme with vibrant accent colors optimized
 * for OLED screens and glassmorphism effects.
 */
const colors = {
  // --- Core backgrounds (darkest to lightest) ---
  /** Deep navy — primary app background */
  background: '#0A0E1A',
  /** Slightly lighter — card / panel recessed background */
  surfaceDark: '#0D1229',
  /** Default surface — cards, sheets */
  surface: '#161B2E',
  /** Elevated surface — hover / active cards */
  surfaceLight: '#1E2440',
  /** Highest elevation — floating elements */
  surfaceElevated: '#252B48',

  // --- Brand ---
  /** Primary action color (iOS-style blue) */
  primary: '#0A84FF',
  /** Secondary accent (electric cyan) */
  secondary: '#00D4FF',
  /** Accent / reward highlight (gold) */
  accent: '#FFD700',

  // --- Glassmorphism surface colors ---
  glass: {
    /** Translucent white for glass panel backgrounds */
    background: 'rgba(255,255,255,0.08)',
    /** Subtle border for glass panels */
    border: 'rgba(255,255,255,0.12)',
    /** Inner highlight / shimmer edge */
    highlight: 'rgba(255,255,255,0.2)',
  },

  // --- Semantic ---
  /** Positive feedback / completion */
  success: '#34C759',
  /** Caution / timer running low */
  warning: '#FF9F0A',
  /** Destructive / failure */
  error: '#FF453A',
  /** Informational / hint */
  info: '#5AC8FA',

  // --- Text ---
  text: {
    /** High-emphasis body text */
    primary: 'rgba(255,255,255,0.95)',
    /** Medium-emphasis labels, descriptions */
    secondary: 'rgba(255,255,255,0.65)',
    /** Low-emphasis captions, placeholders */
    tertiary: 'rgba(255,255,255,0.4)',
    /** Text rendered on light / accent surfaces */
    inverse: '#0A0E1A',
  },

  // --- Water simulation palette ---
  water: {
    /** Deepest water layer */
    deep: '#0B3D91',
    /** Mid-depth water */
    mid: '#1565C0',
    /** Water surface / top layer */
    surface: '#2196F3',
    /** Foam / wave crests */
    foam: '#64B5F6',
    /** Bubble highlights */
    bubble: 'rgba(255,255,255,0.35)',
  },

  // --- Ring piece colors (vibrant pastels on dark) ---
  rings: {
    coral: '#FF6B6B',
    skyBlue: '#4ECDC4',
    mint: '#45E6A0',
    sunflower: '#FFE66D',
    lavender: '#C084FC',
    peach: '#FFA07A',
  },
} as const;

/** Ordered array of ring colors for indexed access. */
const ringColorsArray = [
  colors.rings.coral,
  colors.rings.skyBlue,
  colors.rings.mint,
  colors.rings.sunflower,
  colors.rings.lavender,
  colors.rings.peach,
] as const;

// ============================================================================
// SECTION: Typography
// ============================================================================

/**
 * Typography scale following the iOS Dynamic Type progression.
 *
 * Font sizes, weights, and letter-spacing are separated so they can be
 * composed freely in StyleSheet definitions.
 */
const typography = {
  /** Font sizes in logical pixels */
  size: {
    display: 48,
    title1: 34,
    title2: 28,
    title3: 22,
    headline: 20,
    body: 17,
    callout: 16,
    subhead: 15,
    footnote: 13,
    caption1: 12,
    caption2: 11,
  },

  /** React Native fontWeight string values */
  weight: {
    ultraLight: '100' as const,
    thin: '200' as const,
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
    black: '900' as const,
  },

  /** Letter spacing per size level (in logical pixels) */
  letterSpacing: {
    display: -1.5,
    title1: -0.8,
    title2: -0.4,
    title3: -0.2,
    headline: 0,
    body: 0,
    callout: 0,
    subhead: 0,
    footnote: 0.1,
    caption1: 0.2,
    caption2: 0.3,
  },
} as const;

// ============================================================================
// SECTION: Spacing (4pt base grid)
// ============================================================================

/**
 * Spacing scale based on a 4 pt grid.
 *
 * Use these tokens for padding, margin, and gap values to maintain a
 * consistent visual rhythm throughout the UI.
 */
const spacing = {
  xxxs: 2,
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  massive: 48,
  giant: 64,
} as const;

// ============================================================================
// SECTION: Border Radius
// ============================================================================

/**
 * Border radius tokens.
 *
 * Generic scale (`xs` through `pill`) plus semantic aliases for common
 * component shapes.
 */
const radius = {
  // --- Generic scale ---
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 9999,

  // --- Semantic ---
  /** Standard card container */
  card: 20,
  /** CTA / action buttons */
  button: 14,
  /** Alert / confirmation dialogs */
  dialog: 28,
  /** Bottom sheets */
  sheet: 32,
} as const;

// ============================================================================
// SECTION: Shadows
// ============================================================================

/** Shape of a React Native shadow style object. */
type RNShadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

/**
 * Drop-shadow presets in React Native format.
 *
 * Each level increases offset, blur, and Android elevation together so a
 * single token produces a coherent result on both platforms.
 */
const shadows: {
  none: RNShadow;
  xs: RNShadow;
  sm: RNShadow;
  md: RNShadow;
  lg: RNShadow;
  xl: RNShadow;
  glow: {
    primary: RNShadow;
    secondary: RNShadow;
    accent: RNShadow;
    success: RNShadow;
    error: RNShadow;
  };
} = {
  none: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.36,
    shadowRadius: 24,
    elevation: 12,
  },

  /**
   * Colored glow presets — use behind buttons, icons, or interactive
   * elements to draw attention. Elevation is 0 because glows are purely
   * cosmetic and should not affect Android layering.
   */
  glow: {
    primary: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 0,
    },
    secondary: {
      shadowColor: colors.secondary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
      elevation: 0,
    },
    accent: {
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 0,
    },
    success: {
      shadowColor: colors.success,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 0,
    },
    error: {
      shadowColor: colors.error,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 20,
      elevation: 0,
    },
  },
} as const;

// ============================================================================
// SECTION: Animation Timing & Springs
// ============================================================================

/**
 * Animation duration and spring-physics presets.
 *
 * Durations are in milliseconds. Spring configs use the `mass / damping /
 * stiffness` model compatible with React Native Reanimated and Animated API.
 *
 * For easing curves, use `Easing` from `react-native` or
 * `Easing` from `react-native-reanimated` directly — storing function
 * references as constants is fragile across bundler boundaries.
 */
const animation = {
  /** Duration presets (ms) */
  duration: {
    instant: 100,
    fast: 200,
    normal: 300,
    smooth: 400,
    slow: 600,
    dramatic: 1000,
  },

  /** Spring physics configs (mass, damping, stiffness) */
  spring: {
    /** Quick, minimal overshoot — micro-interactions */
    snappy: { mass: 1, damping: 15, stiffness: 200 },
    /** Noticeable bounce — toggles, switches */
    bouncy: { mass: 1, damping: 10, stiffness: 150 },
    /** Soft landing — modals, sheets */
    gentle: { mass: 1, damping: 20, stiffness: 100 },
    /** Weighty feel — dragging large elements */
    heavy: { mass: 2, damping: 18, stiffness: 180 },
  },

  /**
   * Easing hints.
   *
   * Import `Easing` from `react-native` or `react-native-reanimated` and
   * apply these curves:
   *
   * - **easeIn**:  `Easing.in(Easing.cubic)`
   * - **easeOut**: `Easing.out(Easing.cubic)`
   * - **easeInOut**: `Easing.inOut(Easing.cubic)`
   * - **sharp**: `Easing.bezier(0.4, 0, 0.6, 1)`
   * - **decelerate**: `Easing.out(Easing.poly(3))`
   * - **accelerate**: `Easing.in(Easing.poly(3))`
   */
  easing: {
    easeIn: 'Easing.in(Easing.cubic)',
    easeOut: 'Easing.out(Easing.cubic)',
    easeInOut: 'Easing.inOut(Easing.cubic)',
    sharp: 'Easing.bezier(0.4, 0, 0.6, 1)',
    decelerate: 'Easing.out(Easing.poly(3))',
    accelerate: 'Easing.in(Easing.poly(3))',
  },
} as const;

// ============================================================================
// SECTION: Glass Styles (Glassmorphism)
// ============================================================================

/** Shape of a glassmorphism style preset. */
type GlassStyle = {
  backgroundColor: string;
  borderWidth: number;
  borderColor: string;
  /** Blur radius for `@shopify/react-native-skia` BackdropBlur or similar. */
  backdropBlur: number;
};

/**
 * Glassmorphism presets from nearly-transparent to frosted.
 *
 * Apply `backgroundColor` and `borderColor/borderWidth` via StyleSheet.
 * `backdropBlur` should be passed to a Skia `BackdropBlur` filter or
 * equivalent blur component.
 */
const glass: {
  subtle: GlassStyle;
  medium: GlassStyle;
  strong: GlassStyle;
  frosted: GlassStyle;
} = {
  subtle: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backdropBlur: 8,
  },
  medium: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backdropBlur: 16,
  },
  strong: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backdropBlur: 24,
  },
  frosted: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.28)',
    backdropBlur: 32,
  },
} as const;

// ============================================================================
// SECTION: Z-Index Layers
// ============================================================================

/**
 * Z-index layer map.
 *
 * Keeps the stacking order explicit and centralized so that game elements,
 * HUD chrome, and modal overlays never fight for precedence.
 */
const zIndex = {
  background: 0,
  water: 1,
  rings: 2,
  pegs: 3,
  hud: 10,
  overlay: 20,
  modal: 30,
  toast: 40,
  debug: 100,
} as const;

// ============================================================================
// SECTION: Unified Export
// ============================================================================

/**
 * **DS** — the unified Design System token object.
 *
 * Import this single constant wherever design tokens are needed:
 *
 * ```ts
 * import { DS } from '@/constants/designSystem';
 *
 * const styles = StyleSheet.create({
 *   card: {
 *     backgroundColor: DS.colors.surface,
 *     borderRadius: DS.radius.card,
 *     padding: DS.spacing.lg,
 *     ...DS.shadows.md,
 *   },
 * });
 * ```
 */
export const DS = {
  colors: { ...colors, ringColorsArray },
  typography,
  spacing,
  radius,
  shadows,
  animation,
  glass,
  zIndex,
} as const;

// ============================================================================
// SECTION: Convenience Type Exports
// ============================================================================

/** All available ring color keys. */
export type RingColorName = keyof typeof colors.rings;

/** All spacing token keys. */
export type SpacingToken = keyof typeof spacing;

/** All shadow level keys (excluding glow). */
export type ShadowLevel = Exclude<keyof typeof shadows, 'glow'>;

/** All glow color keys. */
export type GlowColor = keyof typeof shadows.glow;

/** All glass style intensity keys. */
export type GlassIntensity = keyof typeof glass;

/** All z-index layer keys. */
export type ZIndexLayer = keyof typeof zIndex;

/** The full Design System type. */
export type DesignSystem = typeof DS;
