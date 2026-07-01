/**
 * @file achievementVisuals.ts
 * @description Visual configuration for all 20 achievements in the Water Ring
 * Puzzle Game. Each achievement gets a distinct badge design with gradient
 * backgrounds, glow effects, frame colors, particle palettes, and unlock
 * banner text. Used by the AchievementsScreen and unlock celebration overlay.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AchievementVisual {
  /** Achievement ID matching AchievementEngine definitions. */
  id: string;
  /** SVG path data or emoji for the badge center icon. */
  iconSymbol: string;
  /** Two-stop gradient for the badge background fill. */
  badgeGradient: [string, string];
  /** Outer glow / bloom color rendered behind the badge. */
  glowColor: string;
  /** Badge frame / border stroke color. */
  frameColor: string;
  /** Particle colors used during the unlock celebration burst. */
  particleColors: string[];
  /** Text displayed on the unlock notification banner. */
  bannerText: string;
  /** Logical grouping for filtering and tab display. */
  category: 'completion' | 'stars' | 'streak' | 'skill' | 'daily' | 'advanced';
}

export interface AchievementCategory {
  /** Category key matching AchievementVisual.category. */
  key: AchievementVisual['category'];
  /** Human-readable display label. */
  displayName: string;
  /** Accent color for the category tab / header. */
  color: string;
  /** Lighter tint used for category backgrounds. */
  tintColor: string;
}

// ---------------------------------------------------------------------------
// Category Definitions
// ---------------------------------------------------------------------------

export const ACHIEVEMENT_CATEGORIES: AchievementCategory[] = [
  { key: 'completion', displayName: 'Completion',  color: '#F59E0B', tintColor: 'rgba(245,158,11,0.15)' },
  { key: 'stars',      displayName: 'Stars',       color: '#FBBF24', tintColor: 'rgba(251,191,36,0.15)' },
  { key: 'streak',     displayName: 'Streaks',     color: '#EF4444', tintColor: 'rgba(239,68,68,0.15)' },
  { key: 'skill',      displayName: 'Skill',       color: '#8B5CF6', tintColor: 'rgba(139,92,246,0.15)' },
  { key: 'daily',      displayName: 'Daily',       color: '#06B6D4', tintColor: 'rgba(6,182,212,0.15)' },
  { key: 'advanced',   displayName: 'Advanced',    color: '#EC4899', tintColor: 'rgba(236,72,153,0.15)' },
];

// ---------------------------------------------------------------------------
// Visual Definitions (one per achievement)
// ---------------------------------------------------------------------------

const visuals: AchievementVisual[] = [
  // ---- Completion ----
  {
    id: 'first_win',
    iconSymbol: '🏆',
    badgeGradient: ['#B45309', '#F59E0B'],
    glowColor: 'rgba(245,158,11,0.55)',
    frameColor: '#D97706',
    particleColors: ['#FEF3C7', '#FDE68A', '#FCD34D', '#F59E0B'],
    bannerText: 'First Victory!',
    category: 'completion',
  },
  {
    id: 'ten_wins',
    iconSymbol: '🔥',
    badgeGradient: ['#C2410C', '#FB923C'],
    glowColor: 'rgba(251,146,60,0.55)',
    frameColor: '#EA580C',
    particleColors: ['#FED7AA', '#FDBA74', '#FB923C', '#EA580C'],
    bannerText: 'Getting Warmed Up!',
    category: 'completion',
  },
  {
    id: 'fifty_wins',
    iconSymbol: '⭐',
    badgeGradient: ['#6B7280', '#D1D5DB'],
    glowColor: 'rgba(209,213,219,0.5)',
    frameColor: '#9CA3AF',
    particleColors: ['#F3F4F6', '#D1D5DB', '#9CA3AF', '#6B7280'],
    bannerText: 'Half Century!',
    category: 'completion',
  },
  {
    id: 'hundred_wins',
    iconSymbol: '🎯',
    badgeGradient: ['#B45309', '#FCD34D'],
    glowColor: 'rgba(252,211,77,0.6)',
    frameColor: '#F59E0B',
    particleColors: ['#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B'],
    bannerText: 'Centurion!',
    category: 'completion',
  },
  {
    id: 'fivehundred_wins',
    iconSymbol: '👑',
    badgeGradient: ['#4338CA', '#A78BFA'],
    glowColor: 'rgba(167,139,250,0.65)',
    frameColor: '#7C3AED',
    particleColors: ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#FCD34D'],
    bannerText: 'Legendary!',
    category: 'completion',
  },

  // ---- Stars ----
  {
    id: 'star_collector',
    iconSymbol: '✨',
    badgeGradient: ['#92400E', '#FBBF24'],
    glowColor: 'rgba(251,191,36,0.5)',
    frameColor: '#D97706',
    particleColors: ['#FEF3C7', '#FDE68A', '#FBBF24', '#F59E0B'],
    bannerText: 'Star Collector!',
    category: 'stars',
  },
  {
    id: 'star_hoarder',
    iconSymbol: '🌟',
    badgeGradient: ['#78350F', '#F59E0B'],
    glowColor: 'rgba(245,158,11,0.6)',
    frameColor: '#B45309',
    particleColors: ['#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706'],
    bannerText: 'Star Hoarder!',
    category: 'stars',
  },
  {
    id: 'star_master',
    iconSymbol: '💫',
    badgeGradient: ['#713F12', '#EAB308'],
    glowColor: 'rgba(234,179,8,0.65)',
    frameColor: '#CA8A04',
    particleColors: ['#FEF9C3', '#FEF08A', '#FDE047', '#FACC15', '#EAB308', '#FFFFFF'],
    bannerText: 'Star Master!',
    category: 'stars',
  },

  // ---- Streaks ----
  {
    id: 'streak_5',
    iconSymbol: '🎯',
    badgeGradient: ['#991B1B', '#EF4444'],
    glowColor: 'rgba(239,68,68,0.5)',
    frameColor: '#DC2626',
    particleColors: ['#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444'],
    bannerText: 'On a Roll!',
    category: 'streak',
  },
  {
    id: 'streak_20',
    iconSymbol: '⚡',
    badgeGradient: ['#7F1D1D', '#F87171'],
    glowColor: 'rgba(248,113,113,0.65)',
    frameColor: '#EF4444',
    particleColors: ['#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#FFD700'],
    bannerText: 'Unstoppable!',
    category: 'streak',
  },

  // ---- Skill ----
  {
    id: 'pure_win_1',
    iconSymbol: '🛡️',
    badgeGradient: ['#1E40AF', '#60A5FA'],
    glowColor: 'rgba(96,165,250,0.5)',
    frameColor: '#3B82F6',
    particleColors: ['#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6'],
    bannerText: 'No Safety Net!',
    category: 'skill',
  },
  {
    id: 'pure_win_25',
    iconSymbol: '🏅',
    badgeGradient: ['#1E3A8A', '#818CF8'],
    glowColor: 'rgba(129,140,248,0.6)',
    frameColor: '#6366F1',
    particleColors: ['#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#FCD34D'],
    bannerText: 'Purist!',
    category: 'skill',
  },
  {
    id: 'speed_win_1',
    iconSymbol: '⚡',
    badgeGradient: ['#5B21B6', '#C084FC'],
    glowColor: 'rgba(192,132,252,0.5)',
    frameColor: '#A855F7',
    particleColors: ['#F3E8FF', '#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7'],
    bannerText: 'Speed Demon!',
    category: 'skill',
  },
  {
    id: 'speed_win_10',
    iconSymbol: '💨',
    badgeGradient: ['#4C1D95', '#A78BFA'],
    glowColor: 'rgba(167,139,250,0.6)',
    frameColor: '#8B5CF6',
    particleColors: ['#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#FBBF24'],
    bannerText: 'Flash!',
    category: 'skill',
  },

  // ---- Daily ----
  {
    id: 'daily_10',
    iconSymbol: '📅',
    badgeGradient: ['#155E75', '#22D3EE'],
    glowColor: 'rgba(34,211,238,0.5)',
    frameColor: '#06B6D4',
    particleColors: ['#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4'],
    bannerText: 'Daily Devotee!',
    category: 'daily',
  },
  {
    id: 'daily_50',
    iconSymbol: '🗓️',
    badgeGradient: ['#0E4C5E', '#2DD4BF'],
    glowColor: 'rgba(45,212,191,0.6)',
    frameColor: '#14B8A6',
    particleColors: ['#CCFBF1', '#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#FDE68A'],
    bannerText: 'Daily Champion!',
    category: 'daily',
  },

  // ---- Advanced ----
  {
    id: 'prestige_1',
    iconSymbol: '🔄',
    badgeGradient: ['#701A75', '#E879F9'],
    glowColor: 'rgba(232,121,249,0.6)',
    frameColor: '#D946EF',
    particleColors: ['#FAE8FF', '#F5D0FE', '#F0ABFC', '#E879F9', '#D946EF', '#FBBF24'],
    bannerText: 'Reborn!',
    category: 'advanced',
  },
  {
    id: 'leaderboard',
    iconSymbol: '🏛️',
    badgeGradient: ['#831843', '#F472B6'],
    glowColor: 'rgba(244,114,182,0.6)',
    frameColor: '#EC4899',
    particleColors: ['#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899', '#FCD34D'],
    bannerText: 'Top of the World!',
    category: 'advanced',
  },
  {
    id: 'mastery_bronze',
    iconSymbol: '🛡️',
    badgeGradient: ['#78350F', '#D97706'],
    glowColor: 'rgba(217,119,6,0.55)',
    frameColor: '#B45309',
    particleColors: ['#FEF3C7', '#FDE68A', '#FCD34D', '#D97706', '#B45309'],
    bannerText: 'Versatile!',
    category: 'advanced',
  },
  {
    id: 'mastery_plat',
    iconSymbol: '💎',
    badgeGradient: ['#1E293B', '#94A3B8'],
    glowColor: 'rgba(148,163,184,0.7)',
    frameColor: '#CBD5E1',
    particleColors: ['#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#FFFFFF', '#FCD34D'],
    bannerText: 'Specialist!',
    category: 'advanced',
  },
];

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Map of achievement ID to its visual configuration. */
export const ACHIEVEMENT_VISUALS: Record<string, AchievementVisual> = Object.fromEntries(
  visuals.map((v) => [v.id, v]),
);

/**
 * Retrieve the visual config for a given achievement ID.
 * Returns a sensible default if the ID is unrecognized.
 */
export function getAchievementVisual(id: string): AchievementVisual {
  return (
    ACHIEVEMENT_VISUALS[id] ?? {
      id,
      iconSymbol: '🏅',
      badgeGradient: ['#374151', '#6B7280'] as [string, string],
      glowColor: 'rgba(107,114,128,0.4)',
      frameColor: '#4B5563',
      particleColors: ['#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563'],
      bannerText: 'Achievement Unlocked!',
      category: 'completion' as const,
    }
  );
}
