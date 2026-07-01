/**
 * @file themes.ts
 * @description Complete theme system for the Water Ring Puzzle Game.
 *
 * Provides 15 distinct visual themes (10 free, 5 premium) that control every
 * visual element: backgrounds, water rendering, tank appearance, ring colors,
 * peg styles, particle effects, UI chrome, and post-processing effects.
 *
 * Each theme is designed for Skia-based rendering with shader-compatible
 * color values and tuned visual parameters.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Full visual theme definition for the Water Ring Puzzle Game. */
export interface GameTheme {
  /** Unique identifier used as key in the THEMES map. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Whether this theme requires a premium purchase / subscription. */
  premium: boolean;
  /** Minimum player level required to unlock (0 = available immediately). */
  unlockLevel: number;
  /** Small preview swatch shown in the theme picker. */
  preview: { gradient: [string, string, string] };

  /** Full-screen background layer. */
  background: {
    gradient: [string, string, string];
    pattern: 'waves' | 'dots' | 'grid' | 'bubbles' | 'stars' | 'none';
    patternOpacity: number;
    ambientParticles: 'bubbles' | 'sparkles' | 'snow' | 'leaves' | 'stars' | 'none';
    ambientSpeed: number;
    ambientCount: number;
  };

  /** Water simulation colors and dynamics. */
  water: {
    deep: string;
    mid: string;
    surface: string;
    foam: string;
    /** RGB multiplier fed into the Skia water shader (each channel 0-1). */
    tint: [number, number, number];
    opacity: number;
    waveAmplitude: number;
    waveSpeed: number;
  };

  /** Tank (container) chrome. */
  tank: {
    wall: string;
    wallHighlight: string;
    wallShadow: string;
    cornerRadius: number;
  };

  /**
   * Ring palette keyed by color name.
   * Every theme must supply at least: red, blue, green, yellow, purple, orange.
   */
  rings: Record<string, { fill: string; stroke: string; glow: string }>;

  /** Peg (target post) appearance. */
  pegs: {
    base: string;
    tip: string;
    glow: string;
    occupied: string;
    matchHighlight: string;
  };

  /** Particle system color pools. */
  particles: {
    bubble: string[];
    splash: string[];
    sparkle: string[];
    trail: string[];
  };

  /** UI overlay styling. */
  ui: {
    cardBackground: string;
    cardBorder: string;
    buttonPrimary: string;
    buttonSecondary: string;
    accent: string;
    textPrimary: string;
    textSecondary: string;
  };

  /** Post-processing effect intensities. */
  effects: {
    /** Glow bloom intensity (0-1). */
    glowIntensity: number;
    /** Specular reflection strength on water surface (0-1). */
    reflectionStrength: number;
    /** Ripple radius multiplier (0.5-2). */
    rippleScale: number;
    /** Ambient bubble density multiplier (0.5-2). */
    bubbleDensity: number;
  };
}

// ---------------------------------------------------------------------------
// 1. Classic
// ---------------------------------------------------------------------------

/** Default blue/white clean theme. */
const classic: GameTheme = {
  id: 'classic',
  name: 'Classic',
  premium: false,
  unlockLevel: 0,
  preview: { gradient: ['#0A0E1A', '#0D1B3C', '#142850'] },

  background: {
    gradient: ['#0A0E1A', '#0D1B3C', '#142850'],
    pattern: 'waves',
    patternOpacity: 0.08,
    ambientParticles: 'bubbles',
    ambientSpeed: 1.0,
    ambientCount: 20,
  },

  water: {
    deep: '#0B3D91',
    mid: '#1565C0',
    surface: '#2196F3',
    foam: '#64B5F6',
    tint: [0.13, 0.59, 0.95],
    opacity: 0.85,
    waveAmplitude: 1.0,
    waveSpeed: 1.0,
  },

  tank: {
    wall: '#1E3A5F',
    wallHighlight: '#2B5A8A',
    wallShadow: '#0F1E33',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF6B6B', stroke: '#E05252', glow: 'rgba(255,107,107,0.5)' },
    blue:   { fill: '#64B5F6', stroke: '#4A9ADB', glow: 'rgba(100,181,246,0.5)' },
    green:  { fill: '#66D9A0', stroke: '#4CBF86', glow: 'rgba(102,217,160,0.5)' },
    yellow: { fill: '#FFD93D', stroke: '#E6C235', glow: 'rgba(255,217,61,0.5)' },
    purple: { fill: '#B39DDB', stroke: '#9A84C2', glow: 'rgba(179,157,219,0.5)' },
    orange: { fill: '#FFAB76', stroke: '#E6925D', glow: 'rgba(255,171,118,0.5)' },
  },

  pegs: {
    base: '#37474F',
    tip: '#78909C',
    glow: 'rgba(120,144,156,0.4)',
    occupied: '#4FC3F7',
    matchHighlight: '#00E676',
  },

  particles: {
    bubble: ['#BBDEFB', '#90CAF9', '#64B5F6', '#42A5F5'],
    splash: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6'],
    sparkle: ['#FFFFFF', '#E3F2FD', '#BBDEFB', '#90CAF9'],
    trail: ['#42A5F5', '#2196F3', '#1E88E5', '#1565C0'],
  },

  ui: {
    cardBackground: 'rgba(13,27,60,0.85)',
    cardBorder: 'rgba(33,150,243,0.25)',
    buttonPrimary: '#0A84FF',
    buttonSecondary: '#1E3A5F',
    accent: '#0A84FF',
    textPrimary: '#FFFFFF',
    textSecondary: '#90CAF9',
  },

  effects: {
    glowIntensity: 0.5,
    reflectionStrength: 0.6,
    rippleScale: 1.0,
    bubbleDensity: 1.0,
  },
};

// ---------------------------------------------------------------------------
// 2. Ocean Depths
// ---------------------------------------------------------------------------

/** Deep teal and coral ocean theme. */
const ocean: GameTheme = {
  id: 'ocean',
  name: 'Ocean Depths',
  premium: false,
  unlockLevel: 3,
  preview: { gradient: ['#041C32', '#064663', '#0B6E99'] },

  background: {
    gradient: ['#041C32', '#064663', '#0B6E99'],
    pattern: 'waves',
    patternOpacity: 0.1,
    ambientParticles: 'bubbles',
    ambientSpeed: 0.8,
    ambientCount: 25,
  },

  water: {
    deep: '#033E5E',
    mid: '#04648A',
    surface: '#0891B2',
    foam: '#67E8F9',
    tint: [0.03, 0.57, 0.7],
    opacity: 0.88,
    waveAmplitude: 1.2,
    waveSpeed: 0.9,
  },

  tank: {
    wall: '#0C4A5E',
    wallHighlight: '#1A6B82',
    wallShadow: '#042A3A',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF7979', stroke: '#E06060', glow: 'rgba(255,121,121,0.5)' },
    blue:   { fill: '#22D3EE', stroke: '#18B8D0', glow: 'rgba(34,211,238,0.5)' },
    green:  { fill: '#34D399', stroke: '#28B880', glow: 'rgba(52,211,153,0.5)' },
    yellow: { fill: '#FDE68A', stroke: '#E4CD71', glow: 'rgba(253,230,138,0.5)' },
    purple: { fill: '#C4B5FD', stroke: '#AB9CE4', glow: 'rgba(196,181,253,0.5)' },
    orange: { fill: '#FB923C', stroke: '#E27D2D', glow: 'rgba(251,146,60,0.5)' },
  },

  pegs: {
    base: '#164E63',
    tip: '#0E7490',
    glow: 'rgba(14,116,144,0.4)',
    occupied: '#06B6D4',
    matchHighlight: '#2DD4BF',
  },

  particles: {
    bubble: ['#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE'],
    splash: ['#ECFEFF', '#CFFAFE', '#A5F3FC', '#67E8F9'],
    sparkle: ['#FFFFFF', '#ECFEFF', '#CFFAFE', '#A5F3FC'],
    trail: ['#06B6D4', '#0891B2', '#0E7490', '#155E75'],
  },

  ui: {
    cardBackground: 'rgba(6,70,99,0.85)',
    cardBorder: 'rgba(6,182,212,0.25)',
    buttonPrimary: '#06B6D4',
    buttonSecondary: '#164E63',
    accent: '#06B6D4',
    textPrimary: '#FFFFFF',
    textSecondary: '#A5F3FC',
  },

  effects: {
    glowIntensity: 0.55,
    reflectionStrength: 0.5,
    rippleScale: 1.1,
    bubbleDensity: 1.3,
  },
};

// ---------------------------------------------------------------------------
// 3. Crystal Glass
// ---------------------------------------------------------------------------

/** Translucent glass and silver theme. */
const glass: GameTheme = {
  id: 'glass',
  name: 'Crystal Glass',
  premium: false,
  unlockLevel: 5,
  preview: { gradient: ['#1A1A2E', '#16213E', '#0F3460'] },

  background: {
    gradient: ['#1A1A2E', '#16213E', '#0F3460'],
    pattern: 'dots',
    patternOpacity: 0.06,
    ambientParticles: 'sparkles',
    ambientSpeed: 0.7,
    ambientCount: 15,
  },

  water: {
    deep: '#1A237E',
    mid: '#283593',
    surface: '#3F51B5',
    foam: '#9FA8DA',
    tint: [0.25, 0.32, 0.71],
    opacity: 0.65,
    waveAmplitude: 0.8,
    waveSpeed: 0.7,
  },

  tank: {
    wall: '#2A2A4A',
    wallHighlight: '#4A4A7A',
    wallShadow: '#14142A',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#EF9A9A', stroke: '#D68484', glow: 'rgba(239,154,154,0.45)' },
    blue:   { fill: '#90CAF9', stroke: '#7AB4E0', glow: 'rgba(144,202,249,0.45)' },
    green:  { fill: '#A5D6A7', stroke: '#8EBF90', glow: 'rgba(165,214,167,0.45)' },
    yellow: { fill: '#FFF59D', stroke: '#E6DC87', glow: 'rgba(255,245,157,0.45)' },
    purple: { fill: '#CE93D8', stroke: '#B87CC2', glow: 'rgba(206,147,216,0.45)' },
    orange: { fill: '#FFCC80', stroke: '#E6B56A', glow: 'rgba(255,204,128,0.45)' },
  },

  pegs: {
    base: '#3D3D6B',
    tip: '#7C7CB5',
    glow: 'rgba(124,124,181,0.35)',
    occupied: '#7C4DFF',
    matchHighlight: '#69F0AE',
  },

  particles: {
    bubble: ['#E8EAF6', '#C5CAE9', '#9FA8DA', '#7986CB'],
    splash: ['#F5F5FF', '#E8EAF6', '#C5CAE9', '#9FA8DA'],
    sparkle: ['#FFFFFF', '#F5F5FF', '#E8EAF6', '#C5CAE9'],
    trail: ['#7C4DFF', '#651FFF', '#6200EA', '#5600CC'],
  },

  ui: {
    cardBackground: 'rgba(22,33,62,0.75)',
    cardBorder: 'rgba(167,139,250,0.3)',
    buttonPrimary: '#A78BFA',
    buttonSecondary: '#2A2A4A',
    accent: '#A78BFA',
    textPrimary: '#FFFFFF',
    textSecondary: '#C5CAE9',
  },

  effects: {
    glowIntensity: 0.7,
    reflectionStrength: 0.8,
    rippleScale: 0.9,
    bubbleDensity: 0.7,
  },
};

// ---------------------------------------------------------------------------
// 4. Frozen Lake
// ---------------------------------------------------------------------------

/** Icy crystalline frost theme. */
const ice: GameTheme = {
  id: 'ice',
  name: 'Frozen Lake',
  premium: false,
  unlockLevel: 8,
  preview: { gradient: ['#0C1B33', '#1B3A5C', '#2E5984'] },

  background: {
    gradient: ['#0C1B33', '#1B3A5C', '#2E5984'],
    pattern: 'dots',
    patternOpacity: 0.07,
    ambientParticles: 'snow',
    ambientSpeed: 0.6,
    ambientCount: 30,
  },

  water: {
    deep: '#0D47A1',
    mid: '#1976D2',
    surface: '#42A5F5',
    foam: '#E1F5FE',
    tint: [0.26, 0.65, 0.96],
    opacity: 0.78,
    waveAmplitude: 0.6,
    waveSpeed: 0.5,
  },

  tank: {
    wall: '#1C3F60',
    wallHighlight: '#3A6D9B',
    wallShadow: '#0C1F33',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#F48FB1', stroke: '#DB7699', glow: 'rgba(244,143,177,0.45)' },
    blue:   { fill: '#81D4FA', stroke: '#68BBE1', glow: 'rgba(129,212,250,0.5)' },
    green:  { fill: '#80CBC4', stroke: '#68B2AB', glow: 'rgba(128,203,196,0.45)' },
    yellow: { fill: '#FFF176', stroke: '#E6D85F', glow: 'rgba(255,241,118,0.45)' },
    purple: { fill: '#B39DDB', stroke: '#9A84C2', glow: 'rgba(179,157,219,0.45)' },
    orange: { fill: '#FFAB91', stroke: '#E69278', glow: 'rgba(255,171,145,0.45)' },
  },

  pegs: {
    base: '#2C5575',
    tip: '#7DD3FC',
    glow: 'rgba(125,211,252,0.35)',
    occupied: '#38BDF8',
    matchHighlight: '#BAE6FD',
  },

  particles: {
    bubble: ['#E1F5FE', '#B3E5FC', '#81D4FA', '#4FC3F7'],
    splash: ['#FFFFFF', '#E1F5FE', '#B3E5FC', '#81D4FA'],
    sparkle: ['#FFFFFF', '#F0F9FF', '#E1F5FE', '#B3E5FC'],
    trail: ['#38BDF8', '#0EA5E9', '#0284C7', '#0369A1'],
  },

  ui: {
    cardBackground: 'rgba(27,58,92,0.82)',
    cardBorder: 'rgba(125,211,252,0.25)',
    buttonPrimary: '#7DD3FC',
    buttonSecondary: '#1C3F60',
    accent: '#7DD3FC',
    textPrimary: '#FFFFFF',
    textSecondary: '#BAE6FD',
  },

  effects: {
    glowIntensity: 0.6,
    reflectionStrength: 0.9,
    rippleScale: 0.7,
    bubbleDensity: 0.6,
  },
};

// ---------------------------------------------------------------------------
// 5. Enchanted Forest
// ---------------------------------------------------------------------------

/** Emerald and earthy forest theme. */
const forest: GameTheme = {
  id: 'forest',
  name: 'Enchanted Forest',
  premium: false,
  unlockLevel: 10,
  preview: { gradient: ['#0A1F0A', '#132A13', '#1E3A1E'] },

  background: {
    gradient: ['#0A1F0A', '#132A13', '#1E3A1E'],
    pattern: 'dots',
    patternOpacity: 0.08,
    ambientParticles: 'leaves',
    ambientSpeed: 0.7,
    ambientCount: 18,
  },

  water: {
    deep: '#1B5E20',
    mid: '#2E7D32',
    surface: '#43A047',
    foam: '#A5D6A7',
    tint: [0.18, 0.49, 0.2],
    opacity: 0.82,
    waveAmplitude: 0.9,
    waveSpeed: 0.8,
  },

  tank: {
    wall: '#1A3A1A',
    wallHighlight: '#2E5A2E',
    wallShadow: '#0A1A0A',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#EF5350', stroke: '#D63C39', glow: 'rgba(239,83,80,0.5)' },
    blue:   { fill: '#42A5F5', stroke: '#328CDC', glow: 'rgba(66,165,245,0.5)' },
    green:  { fill: '#66BB6A', stroke: '#4DA251', glow: 'rgba(102,187,106,0.5)' },
    yellow: { fill: '#FFEE58', stroke: '#E6D540', glow: 'rgba(255,238,88,0.5)' },
    purple: { fill: '#AB47BC', stroke: '#923AA3', glow: 'rgba(171,71,188,0.5)' },
    orange: { fill: '#FFA726', stroke: '#E68E17', glow: 'rgba(255,167,38,0.5)' },
  },

  pegs: {
    base: '#2E4A2E',
    tip: '#4CAF50',
    glow: 'rgba(76,175,80,0.35)',
    occupied: '#66BB6A',
    matchHighlight: '#B9F6CA',
  },

  particles: {
    bubble: ['#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A'],
    splash: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784'],
    sparkle: ['#FFFFCC', '#FFF9C4', '#FFF59D', '#FFF176'],
    trail: ['#4CAF50', '#43A047', '#388E3C', '#2E7D32'],
  },

  ui: {
    cardBackground: 'rgba(19,42,19,0.85)',
    cardBorder: 'rgba(34,197,94,0.25)',
    buttonPrimary: '#22C55E',
    buttonSecondary: '#1A3A1A',
    accent: '#22C55E',
    textPrimary: '#FFFFFF',
    textSecondary: '#A5D6A7',
  },

  effects: {
    glowIntensity: 0.45,
    reflectionStrength: 0.4,
    rippleScale: 1.0,
    bubbleDensity: 0.8,
  },
};

// ---------------------------------------------------------------------------
// 6. Candy Land
// ---------------------------------------------------------------------------

/** Sweet pink, mint, and lavender theme. */
const candy: GameTheme = {
  id: 'candy',
  name: 'Candy Land',
  premium: false,
  unlockLevel: 12,
  preview: { gradient: ['#2D1B35', '#3D1F48', '#4A2359'] },

  background: {
    gradient: ['#2D1B35', '#3D1F48', '#4A2359'],
    pattern: 'bubbles',
    patternOpacity: 0.1,
    ambientParticles: 'sparkles',
    ambientSpeed: 1.0,
    ambientCount: 22,
  },

  water: {
    deep: '#880E4F',
    mid: '#AD1457',
    surface: '#E91E63',
    foam: '#F8BBD0',
    tint: [0.91, 0.12, 0.39],
    opacity: 0.8,
    waveAmplitude: 1.1,
    waveSpeed: 1.1,
  },

  tank: {
    wall: '#4A1942',
    wallHighlight: '#6B2D60',
    wallShadow: '#2A0E28',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF6B9D', stroke: '#E65284', glow: 'rgba(255,107,157,0.5)' },
    blue:   { fill: '#6DD5FA', stroke: '#54BCE1', glow: 'rgba(109,213,250,0.5)' },
    green:  { fill: '#88E8B0', stroke: '#6FCF97', glow: 'rgba(136,232,176,0.5)' },
    yellow: { fill: '#FFE066', stroke: '#E6C74D', glow: 'rgba(255,224,102,0.5)' },
    purple: { fill: '#D4A5FF', stroke: '#BB8CE6', glow: 'rgba(212,165,255,0.5)' },
    orange: { fill: '#FFB74D', stroke: '#E69E34', glow: 'rgba(255,183,77,0.5)' },
  },

  pegs: {
    base: '#5A2355',
    tip: '#E91E63',
    glow: 'rgba(233,30,99,0.35)',
    occupied: '#F06292',
    matchHighlight: '#F8BBD0',
  },

  particles: {
    bubble: ['#FCE4EC', '#F8BBD0', '#F48FB1', '#F06292'],
    splash: ['#FFF0F5', '#FCE4EC', '#F8BBD0', '#F48FB1'],
    sparkle: ['#FFFFFF', '#FFF0F5', '#FCE4EC', '#F8BBD0'],
    trail: ['#F06292', '#EC407A', '#E91E63', '#D81B60'],
  },

  ui: {
    cardBackground: 'rgba(61,31,72,0.85)',
    cardBorder: 'rgba(244,114,182,0.3)',
    buttonPrimary: '#F472B6',
    buttonSecondary: '#4A1942',
    accent: '#F472B6',
    textPrimary: '#FFFFFF',
    textSecondary: '#F8BBD0',
  },

  effects: {
    glowIntensity: 0.6,
    reflectionStrength: 0.5,
    rippleScale: 1.2,
    bubbleDensity: 1.2,
  },
};

// ---------------------------------------------------------------------------
// 7. Galaxy
// ---------------------------------------------------------------------------

/** Cosmic purple and nebula theme. */
const galaxy: GameTheme = {
  id: 'galaxy',
  name: 'Galaxy',
  premium: false,
  unlockLevel: 15,
  preview: { gradient: ['#0D0221', '#150734', '#1A0A4A'] },

  background: {
    gradient: ['#0D0221', '#150734', '#1A0A4A'],
    pattern: 'stars',
    patternOpacity: 0.15,
    ambientParticles: 'stars',
    ambientSpeed: 0.5,
    ambientCount: 35,
  },

  water: {
    deep: '#1A0533',
    mid: '#2D0A5A',
    surface: '#6A1B9A',
    foam: '#CE93D8',
    tint: [0.42, 0.11, 0.6],
    opacity: 0.83,
    waveAmplitude: 0.9,
    waveSpeed: 0.7,
  },

  tank: {
    wall: '#2A0845',
    wallHighlight: '#4A1070',
    wallShadow: '#120320',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF5C8A', stroke: '#E64371', glow: 'rgba(255,92,138,0.5)' },
    blue:   { fill: '#64B5F6', stroke: '#4A9ADB', glow: 'rgba(100,181,246,0.5)' },
    green:  { fill: '#69F0AE', stroke: '#50D795', glow: 'rgba(105,240,174,0.5)' },
    yellow: { fill: '#FFD54F', stroke: '#E6BC36', glow: 'rgba(255,213,79,0.5)' },
    purple: { fill: '#E040FB', stroke: '#C727E2', glow: 'rgba(224,64,251,0.55)' },
    orange: { fill: '#FF8A65', stroke: '#E6714C', glow: 'rgba(255,138,101,0.5)' },
  },

  pegs: {
    base: '#3C1065',
    tip: '#AB47BC',
    glow: 'rgba(171,71,188,0.4)',
    occupied: '#CE93D8',
    matchHighlight: '#EA80FC',
  },

  particles: {
    bubble: ['#F3E5F5', '#E1BEE7', '#CE93D8', '#BA68C8'],
    splash: ['#F8F0FC', '#F3E5F5', '#E1BEE7', '#CE93D8'],
    sparkle: ['#FFFFFF', '#EDE7F6', '#D1C4E9', '#B39DDB'],
    trail: ['#AB47BC', '#9C27B0', '#8E24AA', '#7B1FA2'],
  },

  ui: {
    cardBackground: 'rgba(21,7,52,0.88)',
    cardBorder: 'rgba(168,85,247,0.3)',
    buttonPrimary: '#A855F7',
    buttonSecondary: '#2A0845',
    accent: '#A855F7',
    textPrimary: '#FFFFFF',
    textSecondary: '#D1C4E9',
  },

  effects: {
    glowIntensity: 0.75,
    reflectionStrength: 0.6,
    rippleScale: 1.0,
    bubbleDensity: 0.8,
  },
};

// ---------------------------------------------------------------------------
// 8. Midnight
// ---------------------------------------------------------------------------

/** Dark charcoal with neon accents. */
const dark: GameTheme = {
  id: 'dark',
  name: 'Midnight',
  premium: false,
  unlockLevel: 18,
  preview: { gradient: ['#0A0A0A', '#111111', '#1A1A1A'] },

  background: {
    gradient: ['#0A0A0A', '#111111', '#1A1A1A'],
    pattern: 'grid',
    patternOpacity: 0.05,
    ambientParticles: 'sparkles',
    ambientSpeed: 0.6,
    ambientCount: 12,
  },

  water: {
    deep: '#0A1628',
    mid: '#102040',
    surface: '#1A3358',
    foam: '#4A6A8A',
    tint: [0.1, 0.2, 0.35],
    opacity: 0.9,
    waveAmplitude: 0.7,
    waveSpeed: 0.6,
  },

  tank: {
    wall: '#222222',
    wallHighlight: '#3A3A3A',
    wallShadow: '#0A0A0A',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF4C4C', stroke: '#E63333', glow: 'rgba(255,76,76,0.55)' },
    blue:   { fill: '#22D3EE', stroke: '#18B8D0', glow: 'rgba(34,211,238,0.55)' },
    green:  { fill: '#4ADE80', stroke: '#38C567', glow: 'rgba(74,222,128,0.55)' },
    yellow: { fill: '#FACC15', stroke: '#E1B30C', glow: 'rgba(250,204,21,0.55)' },
    purple: { fill: '#C084FC', stroke: '#A76BE3', glow: 'rgba(192,132,252,0.55)' },
    orange: { fill: '#FB923C', stroke: '#E27D2D', glow: 'rgba(251,146,60,0.55)' },
  },

  pegs: {
    base: '#2A2A2A',
    tip: '#555555',
    glow: 'rgba(34,211,238,0.3)',
    occupied: '#22D3EE',
    matchHighlight: '#67E8F9',
  },

  particles: {
    bubble: ['#334155', '#475569', '#64748B', '#94A3B8'],
    splash: ['#1E293B', '#334155', '#475569', '#64748B'],
    sparkle: ['#FFFFFF', '#22D3EE', '#4ADE80', '#FACC15'],
    trail: ['#22D3EE', '#06B6D4', '#0891B2', '#0E7490'],
  },

  ui: {
    cardBackground: 'rgba(17,17,17,0.92)',
    cardBorder: 'rgba(34,211,238,0.2)',
    buttonPrimary: '#22D3EE',
    buttonSecondary: '#2A2A2A',
    accent: '#22D3EE',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
  },

  effects: {
    glowIntensity: 0.8,
    reflectionStrength: 0.3,
    rippleScale: 0.8,
    bubbleDensity: 0.5,
  },
};

// ---------------------------------------------------------------------------
// 9. Zen (Minimal)
// ---------------------------------------------------------------------------

/** Clean light theme with minimal distractions. */
const minimal: GameTheme = {
  id: 'minimal',
  name: 'Zen',
  premium: false,
  unlockLevel: 20,
  preview: { gradient: ['#F0F0F0', '#E8E8E8', '#E0E0E0'] },

  background: {
    gradient: ['#F0F0F0', '#E8E8E8', '#E0E0E0'],
    pattern: 'none',
    patternOpacity: 0,
    ambientParticles: 'none',
    ambientSpeed: 0.5,
    ambientCount: 0,
  },

  water: {
    deep: '#90CAF9',
    mid: '#BBDEFB',
    surface: '#E3F2FD',
    foam: '#FFFFFF',
    tint: [0.56, 0.79, 0.98],
    opacity: 0.7,
    waveAmplitude: 0.5,
    waveSpeed: 0.5,
  },

  tank: {
    wall: '#BDBDBD',
    wallHighlight: '#E0E0E0',
    wallShadow: '#9E9E9E',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#EF5350', stroke: '#D63C39', glow: 'rgba(239,83,80,0.35)' },
    blue:   { fill: '#42A5F5', stroke: '#328CDC', glow: 'rgba(66,165,245,0.35)' },
    green:  { fill: '#66BB6A', stroke: '#4DA251', glow: 'rgba(102,187,106,0.35)' },
    yellow: { fill: '#FFCA28', stroke: '#E6B10F', glow: 'rgba(255,202,40,0.35)' },
    purple: { fill: '#AB47BC', stroke: '#923AA3', glow: 'rgba(171,71,188,0.35)' },
    orange: { fill: '#FFA726', stroke: '#E68E17', glow: 'rgba(255,167,38,0.35)' },
  },

  pegs: {
    base: '#9E9E9E',
    tip: '#757575',
    glow: 'rgba(117,117,117,0.2)',
    occupied: '#42A5F5',
    matchHighlight: '#81C784',
  },

  particles: {
    bubble: ['#E3F2FD', '#BBDEFB', '#90CAF9', '#64B5F6'],
    splash: ['#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD'],
    sparkle: ['#FFFFFF', '#F5F5F5', '#EEEEEE', '#E0E0E0'],
    trail: ['#64B5F6', '#42A5F5', '#2196F3', '#1E88E5'],
  },

  ui: {
    cardBackground: 'rgba(255,255,255,0.9)',
    cardBorder: 'rgba(0,0,0,0.1)',
    buttonPrimary: '#3B82F6',
    buttonSecondary: '#E0E0E0',
    accent: '#3B82F6',
    textPrimary: '#212121',
    textSecondary: '#757575',
  },

  effects: {
    glowIntensity: 0.2,
    reflectionStrength: 0.3,
    rippleScale: 0.6,
    bubbleDensity: 0.5,
  },
};

// ---------------------------------------------------------------------------
// 10. Arcade (Retro)
// ---------------------------------------------------------------------------

/** Retro CRT green and amber arcade theme. */
const retro: GameTheme = {
  id: 'retro',
  name: 'Arcade',
  premium: false,
  unlockLevel: 22,
  preview: { gradient: ['#0D0208', '#1A0510', '#0D1117'] },

  background: {
    gradient: ['#0D0208', '#1A0510', '#0D1117'],
    pattern: 'grid',
    patternOpacity: 0.12,
    ambientParticles: 'sparkles',
    ambientSpeed: 1.2,
    ambientCount: 10,
  },

  water: {
    deep: '#003300',
    mid: '#004D00',
    surface: '#00802B',
    foam: '#66FF8C',
    tint: [0.0, 0.5, 0.17],
    opacity: 0.85,
    waveAmplitude: 1.0,
    waveSpeed: 1.3,
  },

  tank: {
    wall: '#1A2A1A',
    wallHighlight: '#2A4A2A',
    wallShadow: '#0A140A',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF3333', stroke: '#CC2929', glow: 'rgba(255,51,51,0.6)' },
    blue:   { fill: '#33CCFF', stroke: '#29B3E6', glow: 'rgba(51,204,255,0.6)' },
    green:  { fill: '#33FF66', stroke: '#29E65C', glow: 'rgba(51,255,102,0.6)' },
    yellow: { fill: '#FFFF33', stroke: '#E6E629', glow: 'rgba(255,255,51,0.6)' },
    purple: { fill: '#CC33FF', stroke: '#B329E6', glow: 'rgba(204,51,255,0.6)' },
    orange: { fill: '#FF9933', stroke: '#E68029', glow: 'rgba(255,153,51,0.6)' },
  },

  pegs: {
    base: '#1A3A1A',
    tip: '#4ADE80',
    glow: 'rgba(74,222,128,0.4)',
    occupied: '#22C55E',
    matchHighlight: '#86EFAC',
  },

  particles: {
    bubble: ['#33FF66', '#66FF8C', '#99FFB3', '#CCFFD9'],
    splash: ['#003300', '#004D00', '#006600', '#008000'],
    sparkle: ['#FFFFFF', '#CCFFD9', '#33FF66', '#FFFF33'],
    trail: ['#4ADE80', '#22C55E', '#16A34A', '#15803D'],
  },

  ui: {
    cardBackground: 'rgba(13,17,23,0.9)',
    cardBorder: 'rgba(74,222,128,0.3)',
    buttonPrimary: '#4ADE80',
    buttonSecondary: '#1A2A1A',
    accent: '#4ADE80',
    textPrimary: '#33FF66',
    textSecondary: '#66FF8C',
  },

  effects: {
    glowIntensity: 0.85,
    reflectionStrength: 0.3,
    rippleScale: 1.0,
    bubbleDensity: 0.6,
  },
};

// ---------------------------------------------------------------------------
// 11. Neon City (Cyberpunk) - PREMIUM
// ---------------------------------------------------------------------------

/** Neon magenta and cyan cyberpunk theme. */
const cyberpunk: GameTheme = {
  id: 'cyberpunk',
  name: 'Neon City',
  premium: true,
  unlockLevel: 0,
  preview: { gradient: ['#0D0015', '#1A002A', '#0D0D2B'] },

  background: {
    gradient: ['#0D0015', '#1A002A', '#0D0D2B'],
    pattern: 'grid',
    patternOpacity: 0.15,
    ambientParticles: 'sparkles',
    ambientSpeed: 1.5,
    ambientCount: 18,
  },

  water: {
    deep: '#1A0030',
    mid: '#2A0050',
    surface: '#5B21B6',
    foam: '#C084FC',
    tint: [0.36, 0.13, 0.71],
    opacity: 0.85,
    waveAmplitude: 1.2,
    waveSpeed: 1.3,
  },

  tank: {
    wall: '#1F0040',
    wallHighlight: '#3A0070',
    wallShadow: '#0A0018',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF0055', stroke: '#CC0044', glow: 'rgba(255,0,85,0.6)' },
    blue:   { fill: '#00D4FF', stroke: '#00AAD4', glow: 'rgba(0,212,255,0.6)' },
    green:  { fill: '#39FF14', stroke: '#2ECC10', glow: 'rgba(57,255,20,0.6)' },
    yellow: { fill: '#FFE700', stroke: '#CCB900', glow: 'rgba(255,231,0,0.6)' },
    purple: { fill: '#FF00FF', stroke: '#CC00CC', glow: 'rgba(255,0,255,0.65)' },
    orange: { fill: '#FF6600', stroke: '#CC5200', glow: 'rgba(255,102,0,0.6)' },
  },

  pegs: {
    base: '#2A004A',
    tip: '#FF00FF',
    glow: 'rgba(255,0,255,0.45)',
    occupied: '#E040FB',
    matchHighlight: '#FF80FF',
  },

  particles: {
    bubble: ['#FF00FF', '#00D4FF', '#39FF14', '#FFE700'],
    splash: ['#1A0030', '#2A0050', '#3A0070', '#5B21B6'],
    sparkle: ['#FFFFFF', '#FF00FF', '#00D4FF', '#39FF14'],
    trail: ['#FF00FF', '#E040FB', '#C084FC', '#A855F7'],
  },

  ui: {
    cardBackground: 'rgba(26,0,42,0.9)',
    cardBorder: 'rgba(255,0,255,0.35)',
    buttonPrimary: '#FF00FF',
    buttonSecondary: '#1F0040',
    accent: '#FF00FF',
    textPrimary: '#FFFFFF',
    textSecondary: '#C084FC',
  },

  effects: {
    glowIntensity: 1.0,
    reflectionStrength: 0.7,
    rippleScale: 1.3,
    bubbleDensity: 0.9,
  },
};

// ---------------------------------------------------------------------------
// 12. Royal Gold (Luxury) - PREMIUM
// ---------------------------------------------------------------------------

/** Opulent black and gold luxury theme. */
const luxury: GameTheme = {
  id: 'luxury',
  name: 'Royal Gold',
  premium: true,
  unlockLevel: 0,
  preview: { gradient: ['#0A0A0A', '#141414', '#1A1408'] },

  background: {
    gradient: ['#0A0A0A', '#141414', '#1A1408'],
    pattern: 'dots',
    patternOpacity: 0.06,
    ambientParticles: 'sparkles',
    ambientSpeed: 0.5,
    ambientCount: 14,
  },

  water: {
    deep: '#0A1628',
    mid: '#122240',
    surface: '#1A3058',
    foam: '#4A6A90',
    tint: [0.1, 0.19, 0.35],
    opacity: 0.88,
    waveAmplitude: 0.8,
    waveSpeed: 0.6,
  },

  tank: {
    wall: '#2A2008',
    wallHighlight: '#4A3810',
    wallShadow: '#141004',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#DC2626', stroke: '#B91C1C', glow: 'rgba(220,38,38,0.5)' },
    blue:   { fill: '#3B82F6', stroke: '#2563EB', glow: 'rgba(59,130,246,0.5)' },
    green:  { fill: '#059669', stroke: '#047857', glow: 'rgba(5,150,105,0.5)' },
    yellow: { fill: '#F59E0B', stroke: '#D97706', glow: 'rgba(245,158,11,0.55)' },
    purple: { fill: '#7C3AED', stroke: '#6D28D9', glow: 'rgba(124,58,237,0.5)' },
    orange: { fill: '#EA580C', stroke: '#C2410C', glow: 'rgba(234,88,12,0.5)' },
  },

  pegs: {
    base: '#3D2E0A',
    tip: '#D4A017',
    glow: 'rgba(212,160,23,0.4)',
    occupied: '#F59E0B',
    matchHighlight: '#FDE68A',
  },

  particles: {
    bubble: ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24'],
    splash: ['#1A1408', '#2A200C', '#3D2E0A', '#4A3810'],
    sparkle: ['#FFFFFF', '#FEF3C7', '#FDE68A', '#FCD34D'],
    trail: ['#F59E0B', '#D97706', '#B45309', '#92400E'],
  },

  ui: {
    cardBackground: 'rgba(20,20,20,0.92)',
    cardBorder: 'rgba(245,158,11,0.3)',
    buttonPrimary: '#F59E0B',
    buttonSecondary: '#2A2008',
    accent: '#F59E0B',
    textPrimary: '#FFFFFF',
    textSecondary: '#FDE68A',
  },

  effects: {
    glowIntensity: 0.65,
    reflectionStrength: 0.8,
    rippleScale: 0.9,
    bubbleDensity: 0.7,
  },
};

// ---------------------------------------------------------------------------
// 13. Deep Space - PREMIUM
// ---------------------------------------------------------------------------

/** Void black and cold starlight space theme. */
const space: GameTheme = {
  id: 'space',
  name: 'Deep Space',
  premium: true,
  unlockLevel: 0,
  preview: { gradient: ['#000005', '#050510', '#0A0A20'] },

  background: {
    gradient: ['#000005', '#050510', '#0A0A20'],
    pattern: 'stars',
    patternOpacity: 0.2,
    ambientParticles: 'stars',
    ambientSpeed: 0.5,
    ambientCount: 40,
  },

  water: {
    deep: '#020820',
    mid: '#051035',
    surface: '#0A1A4A',
    foam: '#3B5998',
    tint: [0.04, 0.1, 0.29],
    opacity: 0.9,
    waveAmplitude: 0.6,
    waveSpeed: 0.4,
  },

  tank: {
    wall: '#0F0F2A',
    wallHighlight: '#1F1F4A',
    wallShadow: '#050510',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#F87171', stroke: '#EF4444', glow: 'rgba(248,113,113,0.5)' },
    blue:   { fill: '#60A5FA', stroke: '#3B82F6', glow: 'rgba(96,165,250,0.5)' },
    green:  { fill: '#4ADE80', stroke: '#22C55E', glow: 'rgba(74,222,128,0.5)' },
    yellow: { fill: '#FDE047', stroke: '#FACC15', glow: 'rgba(253,224,71,0.5)' },
    purple: { fill: '#C084FC', stroke: '#A855F7', glow: 'rgba(192,132,252,0.5)' },
    orange: { fill: '#FB923C', stroke: '#F97316', glow: 'rgba(251,146,60,0.5)' },
  },

  pegs: {
    base: '#141430',
    tip: '#4A5580',
    glow: 'rgba(96,165,250,0.3)',
    occupied: '#60A5FA',
    matchHighlight: '#93C5FD',
  },

  particles: {
    bubble: ['#1E293B', '#334155', '#475569', '#64748B'],
    splash: ['#0A0A20', '#0F0F2A', '#1A1A40', '#252560'],
    sparkle: ['#FFFFFF', '#E0E7FF', '#C7D2FE', '#A5B4FC'],
    trail: ['#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8'],
  },

  ui: {
    cardBackground: 'rgba(5,5,16,0.92)',
    cardBorder: 'rgba(96,165,250,0.2)',
    buttonPrimary: '#60A5FA',
    buttonSecondary: '#0F0F2A',
    accent: '#60A5FA',
    textPrimary: '#FFFFFF',
    textSecondary: '#93C5FD',
  },

  effects: {
    glowIntensity: 0.5,
    reflectionStrength: 0.4,
    rippleScale: 0.7,
    bubbleDensity: 0.5,
  },
};

// ---------------------------------------------------------------------------
// 14. Ancient Temple - PREMIUM
// ---------------------------------------------------------------------------

/** Sandstone, jade, and gold ancient temple theme. */
const temple: GameTheme = {
  id: 'temple',
  name: 'Ancient Temple',
  premium: true,
  unlockLevel: 0,
  preview: { gradient: ['#1A1408', '#2A200C', '#1A1A0F'] },

  background: {
    gradient: ['#1A1408', '#2A200C', '#1A1A0F'],
    pattern: 'dots',
    patternOpacity: 0.08,
    ambientParticles: 'sparkles',
    ambientSpeed: 0.6,
    ambientCount: 12,
  },

  water: {
    deep: '#1B4332',
    mid: '#2D6A4F',
    surface: '#40916C',
    foam: '#95D5B2',
    tint: [0.25, 0.57, 0.42],
    opacity: 0.82,
    waveAmplitude: 0.7,
    waveSpeed: 0.6,
  },

  tank: {
    wall: '#3D2E0A',
    wallHighlight: '#5A4510',
    wallShadow: '#1A1408',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#E74C3C', stroke: '#C0392B', glow: 'rgba(231,76,60,0.5)' },
    blue:   { fill: '#3498DB', stroke: '#2980B9', glow: 'rgba(52,152,219,0.5)' },
    green:  { fill: '#2ECC71', stroke: '#27AE60', glow: 'rgba(46,204,113,0.5)' },
    yellow: { fill: '#F1C40F', stroke: '#D4AC0D', glow: 'rgba(241,196,15,0.5)' },
    purple: { fill: '#9B59B6', stroke: '#8E44AD', glow: 'rgba(155,89,182,0.5)' },
    orange: { fill: '#E67E22', stroke: '#D35400', glow: 'rgba(230,126,34,0.5)' },
  },

  pegs: {
    base: '#4A3510',
    tip: '#A3E635',
    glow: 'rgba(163,230,53,0.35)',
    occupied: '#84CC16',
    matchHighlight: '#D9F99D',
  },

  particles: {
    bubble: ['#D9F99D', '#BEF264', '#A3E635', '#84CC16'],
    splash: ['#1A1408', '#2A200C', '#3D2E0A', '#4A3510'],
    sparkle: ['#FFFFFF', '#FEF3C7', '#FDE68A', '#D9F99D'],
    trail: ['#A3E635', '#84CC16', '#65A30D', '#4D7C0F'],
  },

  ui: {
    cardBackground: 'rgba(42,32,12,0.88)',
    cardBorder: 'rgba(163,230,53,0.25)',
    buttonPrimary: '#A3E635',
    buttonSecondary: '#3D2E0A',
    accent: '#A3E635',
    textPrimary: '#FFFFFF',
    textSecondary: '#D9F99D',
  },

  effects: {
    glowIntensity: 0.45,
    reflectionStrength: 0.5,
    rippleScale: 0.8,
    bubbleDensity: 0.7,
  },
};

// ---------------------------------------------------------------------------
// 15. Toy Box - PREMIUM
// ---------------------------------------------------------------------------

/** Bright primary-color playful toy theme. */
const toystore: GameTheme = {
  id: 'toystore',
  name: 'Toy Box',
  premium: true,
  unlockLevel: 0,
  preview: { gradient: ['#1A1040', '#2A1860', '#1A2070'] },

  background: {
    gradient: ['#1A1040', '#2A1860', '#1A2070'],
    pattern: 'bubbles',
    patternOpacity: 0.1,
    ambientParticles: 'sparkles',
    ambientSpeed: 1.3,
    ambientCount: 24,
  },

  water: {
    deep: '#1565C0',
    mid: '#1E88E5',
    surface: '#42A5F5',
    foam: '#90CAF9',
    tint: [0.26, 0.65, 0.96],
    opacity: 0.82,
    waveAmplitude: 1.3,
    waveSpeed: 1.2,
  },

  tank: {
    wall: '#2A1860',
    wallHighlight: '#3D2890',
    wallShadow: '#140C30',
    cornerRadius: 16,
  },

  rings: {
    red:    { fill: '#FF3B3B', stroke: '#E62222', glow: 'rgba(255,59,59,0.55)' },
    blue:   { fill: '#3B8BFF', stroke: '#2272E6', glow: 'rgba(59,139,255,0.55)' },
    green:  { fill: '#3BFF6B', stroke: '#22E652', glow: 'rgba(59,255,107,0.55)' },
    yellow: { fill: '#FFE83B', stroke: '#E6CF22', glow: 'rgba(255,232,59,0.55)' },
    purple: { fill: '#C83BFF', stroke: '#AF22E6', glow: 'rgba(200,59,255,0.55)' },
    orange: { fill: '#FF8C3B', stroke: '#E67322', glow: 'rgba(255,140,59,0.55)' },
  },

  pegs: {
    base: '#352070',
    tip: '#FB923C',
    glow: 'rgba(251,146,60,0.4)',
    occupied: '#F97316',
    matchHighlight: '#FDBA74',
  },

  particles: {
    bubble: ['#FF3B3B', '#3B8BFF', '#3BFF6B', '#FFE83B'],
    splash: ['#1A1040', '#2A1860', '#3D2890', '#5038B0'],
    sparkle: ['#FFFFFF', '#FFE83B', '#3BFF6B', '#FF3B3B'],
    trail: ['#FB923C', '#F97316', '#EA580C', '#C2410C'],
  },

  ui: {
    cardBackground: 'rgba(42,24,96,0.88)',
    cardBorder: 'rgba(251,146,60,0.3)',
    buttonPrimary: '#FB923C',
    buttonSecondary: '#2A1860',
    accent: '#FB923C',
    textPrimary: '#FFFFFF',
    textSecondary: '#FDBA74',
  },

  effects: {
    glowIntensity: 0.7,
    reflectionStrength: 0.5,
    rippleScale: 1.4,
    bubbleDensity: 1.5,
  },
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Complete map of all available themes keyed by ID. */
export const THEMES: Record<string, GameTheme> = {
  classic,
  ocean,
  glass,
  ice,
  forest,
  candy,
  galaxy,
  dark,
  minimal,
  retro,
  cyberpunk,
  luxury,
  space,
  temple,
  toystore,
};

/** Fallback theme used when a requested ID is not found. */
export const DEFAULT_THEME_ID = 'classic';

/** IDs of all themes that require a premium purchase. */
export const PREMIUM_THEME_IDS = Object.entries(THEMES)
  .filter(([_, t]) => t.premium)
  .map(([id]) => id);

/**
 * Retrieve a theme by ID with graceful fallback.
 * @param id - Theme identifier (e.g. `'ocean'`).
 * @returns The matching `GameTheme`, or the default Classic theme if not found.
 */
export const getTheme = (id: string): GameTheme => THEMES[id] ?? THEMES[DEFAULT_THEME_ID];
