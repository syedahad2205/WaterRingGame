/**
 * audioMap.ts — Complete sound asset map for the Water Ring Puzzle Game.
 *
 * Defines every sound file the game uses, organized by category. Each entry
 * specifies the asset path (relative to assets/sounds/), default volume,
 * concurrent instance pool size, category, and whether to preload at startup.
 *
 * This file is the single source of truth for audio asset references. The
 * AudioEngine, SFXManager, and useAudio hook all reference these definitions.
 *
 * Asset naming convention:
 *   UI       → ui/{name}.mp3
 *   Gameplay → game/{name}.mp3
 *   Ambient  → ambient/{name}.mp3
 *   Music    → music/{themeId}/{stemName}.mp3
 *
 * Requirements: 14.1, 14.2, 8.1
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Describes a single sound asset and its playback characteristics.
 */
export interface SoundAsset {
  /** Filename relative to assets/sounds/. */
  file: string;
  /** Default playback volume (0 - 1). Multiplied by master + category volume. */
  volume: number;
  /** Maximum concurrent instances of this sound that can play simultaneously. */
  poolSize: number;
  /** Audio category for volume grouping. */
  category: 'sfx' | 'ambient' | 'music' | 'ui';
  /** Whether to load this asset during app startup (splash screen). */
  preload: boolean;
}

// ---------------------------------------------------------------------------
// Sound Map
// ---------------------------------------------------------------------------

/**
 * Complete catalogue of every discrete sound asset in the game.
 *
 * Volume guidelines:
 *   - UI feedback: 0.3 - 0.6 (subtle, never distracting)
 *   - Gameplay SFX: 0.4 - 0.8 (responsive, proportional to importance)
 *   - Reward / result stings: 0.8 - 1.0 (celebratory, attention-grabbing)
 *   - Ambient loops: 0.1 - 0.2 (background texture, never foreground)
 *
 * Pool size guidelines:
 *   - One-shot feedback: 1 - 2 (button presses, toggles)
 *   - Rapid-fire events: 3 - 4 (collisions, bubbles, combos)
 *   - Loops: 1 (ambient, music — only one instance ever plays)
 */
export const SOUND_MAP = {
  // ---------------------------------------------------------------------------
  // UI Sounds — menu interactions, navigation chrome
  // ---------------------------------------------------------------------------
  ui_button_press: {
    file: 'ui/button_press.mp3',
    volume: 0.6,
    poolSize: 2,
    category: 'ui',
    preload: true,
  },
  ui_button_back: {
    file: 'ui/button_back.mp3',
    volume: 0.5,
    poolSize: 1,
    category: 'ui',
    preload: true,
  },
  ui_toggle: {
    file: 'ui/toggle.mp3',
    volume: 0.4,
    poolSize: 1,
    category: 'ui',
    preload: true,
  },
  ui_tab_switch: {
    file: 'ui/tab_switch.mp3',
    volume: 0.4,
    poolSize: 1,
    category: 'ui',
    preload: true,
  },
  ui_modal_open: {
    file: 'ui/modal_open.mp3',
    volume: 0.5,
    poolSize: 1,
    category: 'ui',
    preload: false,
  },
  ui_modal_close: {
    file: 'ui/modal_close.mp3',
    volume: 0.4,
    poolSize: 1,
    category: 'ui',
    preload: false,
  },
  ui_slider_tick: {
    file: 'ui/slider_tick.mp3',
    volume: 0.3,
    poolSize: 2,
    category: 'ui',
    preload: false,
  },
  ui_swipe: {
    file: 'ui/swipe.mp3',
    volume: 0.35,
    poolSize: 1,
    category: 'ui',
    preload: false,
  },
  ui_error: {
    file: 'ui/error.mp3',
    volume: 0.55,
    poolSize: 1,
    category: 'ui',
    preload: false,
  },
  ui_success: {
    file: 'ui/success.mp3',
    volume: 0.5,
    poolSize: 1,
    category: 'ui',
    preload: false,
  },

  // ---------------------------------------------------------------------------
  // Water Sounds — button press/release physics interactions
  // ---------------------------------------------------------------------------
  water_press_light: {
    file: 'game/water_press_light.mp3',
    volume: 0.5,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  water_press_heavy: {
    file: 'game/water_press_heavy.mp3',
    volume: 0.65,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  water_release: {
    file: 'game/water_release.mp3',
    volume: 0.45,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  water_splash: {
    file: 'game/water_splash.mp3',
    volume: 0.55,
    poolSize: 3,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Bubble Sounds — water effect particle audio
  // ---------------------------------------------------------------------------
  bubble_small: {
    file: 'game/bubble_small.mp3',
    volume: 0.3,
    poolSize: 4,
    category: 'sfx',
    preload: true,
  },
  bubble_medium: {
    file: 'game/bubble_medium.mp3',
    volume: 0.4,
    poolSize: 3,
    category: 'sfx',
    preload: true,
  },
  bubble_large: {
    file: 'game/bubble_large.mp3',
    volume: 0.5,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  bubble_pop: {
    file: 'game/bubble_pop.mp3',
    volume: 0.45,
    poolSize: 4,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Ring Sounds — ring physics and landing events
  // ---------------------------------------------------------------------------
  ring_collision: {
    file: 'game/ring_collision.mp3',
    volume: 0.5,
    poolSize: 4,
    category: 'sfx',
    preload: true,
  },
  ring_wall_collision: {
    file: 'game/ring_wall_collision.mp3',
    volume: 0.45,
    poolSize: 3,
    category: 'sfx',
    preload: true,
  },
  ring_land_peg: {
    file: 'game/ring_land_peg.mp3',
    volume: 0.7,
    poolSize: 3,
    category: 'sfx',
    preload: true,
  },
  ring_perfect_land: {
    file: 'game/ring_perfect_land.mp3',
    volume: 0.85,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  ring_near_peg: {
    file: 'game/ring_near_peg.mp3',
    volume: 0.35,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },
  ring_slide: {
    file: 'game/ring_slide.mp3',
    volume: 0.4,
    poolSize: 2,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Game Events — combo system and timer
  // ---------------------------------------------------------------------------
  combo_1: {
    file: 'game/combo_1.mp3',
    volume: 0.6,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  combo_2: {
    file: 'game/combo_2.mp3',
    volume: 0.7,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  combo_3: {
    file: 'game/combo_3.mp3',
    volume: 0.8,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  combo_max: {
    file: 'game/combo_max.mp3',
    volume: 0.9,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  timer_tick: {
    file: 'game/timer_tick.mp3',
    volume: 0.35,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  timer_warning: {
    file: 'game/timer_warning.mp3',
    volume: 0.6,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  timer_critical: {
    file: 'game/timer_critical.mp3',
    volume: 0.75,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Button Hold Feedback — progressive press mechanic
  // ---------------------------------------------------------------------------
  button_hold_start: {
    file: 'game/button_hold_start.mp3',
    volume: 0.5,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  button_hold_peak: {
    file: 'game/button_hold_peak.mp3',
    volume: 0.7,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  rapid_tap: {
    file: 'game/rapid_tap.mp3',
    volume: 0.55,
    poolSize: 3,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Results — victory, defeat, star/score reveal
  // ---------------------------------------------------------------------------
  victory_fanfare: {
    file: 'results/victory_fanfare.mp3',
    volume: 0.9,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  defeat_sound: {
    file: 'results/defeat_sound.mp3',
    volume: 0.7,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  star_reveal: {
    file: 'results/star_reveal.mp3',
    volume: 0.75,
    poolSize: 3,
    category: 'sfx',
    preload: false,
  },
  coin_collect: {
    file: 'results/coin_collect.mp3',
    volume: 0.65,
    poolSize: 4,
    category: 'sfx',
    preload: false,
  },
  xp_gain: {
    file: 'results/xp_gain.mp3',
    volume: 0.55,
    poolSize: 2,
    category: 'sfx',
    preload: false,
  },
  score_count_tick: {
    file: 'results/score_count_tick.mp3',
    volume: 0.3,
    poolSize: 2,
    category: 'sfx',
    preload: false,
  },
  new_high_score: {
    file: 'results/new_high_score.mp3',
    volume: 0.85,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },

  // ---------------------------------------------------------------------------
  // Achievements & Progression
  // ---------------------------------------------------------------------------
  achievement_unlock: {
    file: 'achievements/achievement_unlock.mp3',
    volume: 0.8,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  level_up: {
    file: 'achievements/level_up.mp3',
    volume: 0.85,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  daily_reward: {
    file: 'achievements/daily_reward.mp3',
    volume: 0.75,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  purchase_success: {
    file: 'achievements/purchase_success.mp3',
    volume: 0.8,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  challenge_complete: {
    file: 'achievements/challenge_complete.mp3',
    volume: 0.8,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  rank_up: {
    file: 'achievements/rank_up.mp3',
    volume: 0.9,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },

  // ---------------------------------------------------------------------------
  // Social & Leaderboard
  // ---------------------------------------------------------------------------
  leaderboard_reveal: {
    file: 'achievements/leaderboard_reveal.mp3',
    volume: 0.6,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },
  friend_beat: {
    file: 'achievements/friend_beat.mp3',
    volume: 0.7,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },

  // ---------------------------------------------------------------------------
  // Countdown & Challenge Start
  // ---------------------------------------------------------------------------
  countdown_tick: {
    file: 'achievements/countdown_tick.mp3',
    volume: 0.6,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },
  countdown_go: {
    file: 'achievements/countdown_go.mp3',
    volume: 0.75,
    poolSize: 1,
    category: 'sfx',
    preload: true,
  },

  // ---------------------------------------------------------------------------
  // Continue / Retry
  // ---------------------------------------------------------------------------
  continue_use: {
    file: 'achievements/continue_use.mp3',
    volume: 0.6,
    poolSize: 1,
    category: 'sfx',
    preload: false,
  },

  // ---------------------------------------------------------------------------
  // Ambient Loops — per-theme background atmosphere
  // ---------------------------------------------------------------------------
  ambient_water: {
    file: 'ambient/water_ambient.mp3',
    volume: 0.15,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_bubbles: {
    file: 'ambient/bubbles_ambient.mp3',
    volume: 0.12,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_ocean: {
    file: 'ambient/ocean_ambient.mp3',
    volume: 0.15,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_forest: {
    file: 'ambient/forest_ambient.mp3',
    volume: 0.12,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_wind: {
    file: 'ambient/wind_ambient.mp3',
    volume: 0.1,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_space: {
    file: 'ambient/space_ambient.mp3',
    volume: 0.1,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_retro: {
    file: 'ambient/retro_ambient.mp3',
    volume: 0.12,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_temple: {
    file: 'ambient/temple_ambient.mp3',
    volume: 0.12,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_cyberpunk: {
    file: 'ambient/cyberpunk_ambient.mp3',
    volume: 0.12,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
  ambient_candy: {
    file: 'ambient/candy_ambient.mp3',
    volume: 0.1,
    poolSize: 1,
    category: 'ambient',
    preload: false,
  },
} as const satisfies Record<string, SoundAsset>;

/** Union type of all sound names in the map. */
export type SoundName = keyof typeof SOUND_MAP;

// ---------------------------------------------------------------------------
// Music Stems — adaptive layers per theme
// ---------------------------------------------------------------------------

/**
 * Configuration for a theme's music stems.
 * Each theme has 6 independent stems that play simultaneously and are
 * mixed via volume control by the MusicLayerManager state machine.
 *
 * Stem roles:
 *   base      — always-on harmonic foundation
 *   texture   — atmospheric pad / texture layer
 *   rhythm    — rhythmic percussion layer
 *   melody    — lead melodic phrase
 *   counter   — counter-melody / harmony
 *   intensity — high-tension escalation layer
 */
export interface MusicStemSet {
  /** Stem file paths relative to assets/sounds/. */
  stems: [string, string, string, string, string, string];
  /** BPM for bar-aligned transitions. */
  bpm: number;
  /** Time signature numerator (typically 4). */
  timeSignature: number;
}

export const MUSIC_STEMS: Record<string, MusicStemSet> = {
  classic: {
    stems: [
      'music/classic/base.mp3',
      'music/classic/texture.mp3',
      'music/classic/rhythm.mp3',
      'music/classic/melody.mp3',
      'music/classic/counter.mp3',
      'music/classic/intensity.mp3',
    ],
    bpm: 120,
    timeSignature: 4,
  },
  ocean: {
    stems: [
      'music/ocean/base.mp3',
      'music/ocean/texture.mp3',
      'music/ocean/rhythm.mp3',
      'music/ocean/melody.mp3',
      'music/ocean/counter.mp3',
      'music/ocean/intensity.mp3',
    ],
    bpm: 100,
    timeSignature: 4,
  },
  glass: {
    stems: [
      'music/glass/base.mp3',
      'music/glass/texture.mp3',
      'music/glass/rhythm.mp3',
      'music/glass/melody.mp3',
      'music/glass/counter.mp3',
      'music/glass/intensity.mp3',
    ],
    bpm: 110,
    timeSignature: 4,
  },
  ice: {
    stems: [
      'music/ice/base.mp3',
      'music/ice/texture.mp3',
      'music/ice/rhythm.mp3',
      'music/ice/melody.mp3',
      'music/ice/counter.mp3',
      'music/ice/intensity.mp3',
    ],
    bpm: 108,
    timeSignature: 4,
  },
  forest: {
    stems: [
      'music/forest/base.mp3',
      'music/forest/texture.mp3',
      'music/forest/rhythm.mp3',
      'music/forest/melody.mp3',
      'music/forest/counter.mp3',
      'music/forest/intensity.mp3',
    ],
    bpm: 95,
    timeSignature: 4,
  },
  candy: {
    stems: [
      'music/candy/base.mp3',
      'music/candy/texture.mp3',
      'music/candy/rhythm.mp3',
      'music/candy/melody.mp3',
      'music/candy/counter.mp3',
      'music/candy/intensity.mp3',
    ],
    bpm: 130,
    timeSignature: 4,
  },
  galaxy: {
    stems: [
      'music/galaxy/base.mp3',
      'music/galaxy/texture.mp3',
      'music/galaxy/rhythm.mp3',
      'music/galaxy/melody.mp3',
      'music/galaxy/counter.mp3',
      'music/galaxy/intensity.mp3',
    ],
    bpm: 115,
    timeSignature: 4,
  },
  dark: {
    stems: [
      'music/dark/base.mp3',
      'music/dark/texture.mp3',
      'music/dark/rhythm.mp3',
      'music/dark/melody.mp3',
      'music/dark/counter.mp3',
      'music/dark/intensity.mp3',
    ],
    bpm: 105,
    timeSignature: 4,
  },
  minimal: {
    stems: [
      'music/minimal/base.mp3',
      'music/minimal/texture.mp3',
      'music/minimal/rhythm.mp3',
      'music/minimal/melody.mp3',
      'music/minimal/counter.mp3',
      'music/minimal/intensity.mp3',
    ],
    bpm: 100,
    timeSignature: 4,
  },
  retro: {
    stems: [
      'music/retro/base.mp3',
      'music/retro/texture.mp3',
      'music/retro/rhythm.mp3',
      'music/retro/melody.mp3',
      'music/retro/counter.mp3',
      'music/retro/intensity.mp3',
    ],
    bpm: 140,
    timeSignature: 4,
  },
  cyberpunk: {
    stems: [
      'music/cyberpunk/base.mp3',
      'music/cyberpunk/texture.mp3',
      'music/cyberpunk/rhythm.mp3',
      'music/cyberpunk/melody.mp3',
      'music/cyberpunk/counter.mp3',
      'music/cyberpunk/intensity.mp3',
    ],
    bpm: 128,
    timeSignature: 4,
  },
  luxury: {
    stems: [
      'music/luxury/base.mp3',
      'music/luxury/texture.mp3',
      'music/luxury/rhythm.mp3',
      'music/luxury/melody.mp3',
      'music/luxury/counter.mp3',
      'music/luxury/intensity.mp3',
    ],
    bpm: 90,
    timeSignature: 4,
  },
  space: {
    stems: [
      'music/space/base.mp3',
      'music/space/texture.mp3',
      'music/space/rhythm.mp3',
      'music/space/melody.mp3',
      'music/space/counter.mp3',
      'music/space/intensity.mp3',
    ],
    bpm: 85,
    timeSignature: 4,
  },
  temple: {
    stems: [
      'music/temple/base.mp3',
      'music/temple/texture.mp3',
      'music/temple/rhythm.mp3',
      'music/temple/melody.mp3',
      'music/temple/counter.mp3',
      'music/temple/intensity.mp3',
    ],
    bpm: 92,
    timeSignature: 4,
  },
  toystore: {
    stems: [
      'music/toystore/base.mp3',
      'music/toystore/texture.mp3',
      'music/toystore/rhythm.mp3',
      'music/toystore/melody.mp3',
      'music/toystore/counter.mp3',
      'music/toystore/intensity.mp3',
    ],
    bpm: 135,
    timeSignature: 4,
  },
};

// ---------------------------------------------------------------------------
// Preload Groups — staged loading for minimal startup latency
// ---------------------------------------------------------------------------

/**
 * Groups of sound names to preload at different lifecycle stages.
 *
 * Strategy:
 *   - startup: UI sounds loaded during the splash screen (< 200 KB total)
 *   - gameplay: Core game SFX loaded when entering challenge select / countdown
 *   - results: Victory/defeat/reward sounds loaded lazily when challenge ends
 */
export const PRELOAD_GROUPS = {
  /** Loaded during splash screen. Keeps startup fast with only essential UI sounds. */
  startup: [
    'ui_button_press',
    'ui_button_back',
    'ui_toggle',
    'ui_tab_switch',
  ] as const satisfies readonly SoundName[],

  /** Loaded when the player selects a challenge (before countdown starts). */
  gameplay: [
    'water_press_light',
    'water_press_heavy',
    'water_release',
    'water_splash',
    'bubble_small',
    'bubble_medium',
    'bubble_large',
    'bubble_pop',
    'ring_collision',
    'ring_wall_collision',
    'ring_land_peg',
    'ring_perfect_land',
    'ring_near_peg',
    'ring_slide',
    'combo_1',
    'combo_2',
    'combo_3',
    'combo_max',
    'timer_tick',
    'timer_warning',
    'timer_critical',
    'button_hold_start',
    'button_hold_peak',
    'rapid_tap',
    'countdown_tick',
    'countdown_go',
  ] as const satisfies readonly SoundName[],

  /** Loaded when the challenge ends (results screen transition). */
  results: [
    'victory_fanfare',
    'defeat_sound',
    'star_reveal',
    'coin_collect',
    'xp_gain',
    'score_count_tick',
    'new_high_score',
    'achievement_unlock',
    'level_up',
    'challenge_complete',
  ] as const satisfies readonly SoundName[],
} as const;

/** Type for preload group names. */
export type PreloadGroup = keyof typeof PRELOAD_GROUPS;

// ---------------------------------------------------------------------------
// Theme-to-Ambient Mapping
// ---------------------------------------------------------------------------

/**
 * Maps each theme ID to its ambient loop sound name.
 * Themes not listed here use 'ambient_water' as the default.
 */
export const THEME_AMBIENT_MAP: Record<string, SoundName> = {
  classic: 'ambient_water',
  ocean: 'ambient_ocean',
  glass: 'ambient_water',
  ice: 'ambient_wind',
  forest: 'ambient_forest',
  candy: 'ambient_candy',
  galaxy: 'ambient_space',
  dark: 'ambient_water',
  minimal: 'ambient_bubbles',
  retro: 'ambient_retro',
  cyberpunk: 'ambient_cyberpunk',
  luxury: 'ambient_water',
  space: 'ambient_space',
  temple: 'ambient_temple',
  toystore: 'ambient_candy',
};

/** Returns the ambient sound name for a given theme, defaulting to ambient_water. */
export function getThemeAmbient(themeId: string): SoundName {
  return THEME_AMBIENT_MAP[themeId] ?? 'ambient_water';
}
