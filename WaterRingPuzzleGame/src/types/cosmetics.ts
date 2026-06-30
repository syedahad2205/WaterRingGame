/**
 * Cosmetics domain types.
 * Used by the cosmetics feature, store screens, and inventory — lives in
 * src/types/ per Requirement 2.6 (types shared across 3+ features).
 *
 * Requirements: 3.4, 8.4
 */

// ---------------------------------------------------------------------------
// Enumerations / union types
// ---------------------------------------------------------------------------

/** Rarity tier that determines drop-rate weighting and UI badge colour. */
export type CosmeticRarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Which part of the game UI / physics world the cosmetic affects. */
export type CosmeticCategory =
  | 'ring_skin'
  | 'water_theme'
  | 'board_theme'
  | 'peg_skin'
  | 'particle_effect';

/** How the player acquired (or can acquire) this cosmetic. */
export type CosmeticSource =
  | 'purchase'
  | 'achievement'
  | 'daily_reward'
  | 'bundle'
  | 'starter';

// ---------------------------------------------------------------------------
// CosmeticItem — catalogue entry
// ---------------------------------------------------------------------------

/**
 * A single item in the cosmetics catalogue.
 * Serialisable, no methods.
 */
export interface CosmeticItem {
  /** Unique identifier (e.g. 'ring_skin_ocean_blue'). */
  id: string;
  /** Display name shown in the Store / Inventory. */
  name: string;
  /** Short marketing description. */
  description: string;
  category: CosmeticCategory;
  rarity: CosmeticRarity;
  source: CosmeticSource;
  /** Remote URL for a preview thumbnail. Optional — falls back to in-app asset. */
  previewImageUrl?: string;
  /** Soft-currency price. Omitted for items that are not directly purchasable. */
  coinCost?: number;
  /** True for real-money IAP items (never purchasable with coins). */
  isPremium: boolean;
  /** Minimum player level required to unlock via progression. */
  unlocksAtLevel?: number;
}

// ---------------------------------------------------------------------------
// RingSkinVariant — per-colour ring appearance
// ---------------------------------------------------------------------------

/**
 * Defines one colour variant of a ring skin.
 * A skin may supply one RingSkinVariant per ring colorId.
 */
export interface RingSkinVariant {
  /** Matches a RingConfig.colorId (e.g. 'red', 'blue'). */
  colorId: string;
  /** Primary fill colour as a hex string (e.g. '#FF4F4F'). */
  baseColor: string;
  /** Bright specular highlight colour (hex). */
  highlightColor: string;
  /** Dark shadow / underside colour (hex). */
  shadowColor: string;
  /** Optional key into the texture atlas for a repeating surface pattern. */
  textureKey?: string;
}

// ---------------------------------------------------------------------------
// WaterTheme — visual treatment of the water surface and background
// ---------------------------------------------------------------------------

export type WaterShaderVariant = 'default' | 'tropical' | 'arctic' | 'lava' | 'neon';

/**
 * Controls every visual aspect of the water body in the arena.
 */
export interface WaterTheme {
  /** Unique identifier (e.g. 'theme_tropical'). */
  id: string;
  /** Display name. */
  name: string;
  /** Primary water fill colour (hex). */
  waterColor: string;
  /** Additive tint applied to the animated surface layer (hex). */
  surfaceTint: string;
  /** Two-stop gradient behind the arena board. */
  backgroundGradient: {
    start: string;
    end: string;
  };
  /** Colour of splash / ripple particles (hex). */
  particleColor: string;
  /** Which GLSL/Skia shader variant to load. */
  shaderVariant: WaterShaderVariant;
}

// ---------------------------------------------------------------------------
// BoardTheme — static arena background and peg colouring
// ---------------------------------------------------------------------------

/**
 * Controls the non-water, non-ring visual elements of the board.
 */
export interface BoardTheme {
  /** Unique identifier (e.g. 'board_dark'). */
  id: string;
  /** Display name. */
  name: string;
  /** Background fill behind the board surface (hex). */
  backgroundColor: string;
  /** Default peg body colour when no peg-skin is active (hex). */
  pegColor: string;
  /**
   * Opacity of the grid overlay drawn on the board.
   * Range: 0.0 (invisible) to 1.0 (fully opaque).
   */
  gridOpacity: number;
}

// ---------------------------------------------------------------------------
// Collection and equipped state
// ---------------------------------------------------------------------------

/**
 * Maps cosmetic item IDs to ownership status.
 * true = owned; omitted / false = not owned.
 */
export type CosmeticCollection = Record<string, boolean>;

/**
 * The set of cosmetics the player has currently equipped.
 * Stored in the cosmetics slice and applied to every match.
 */
export interface EquippedCosmetics {
  /**
   * Active skin ID per ring colorId.
   * Key: RingConfig.colorId (e.g. 'red')
   * Value: CosmeticItem.id of the equipped ring_skin
   */
  ringSkinsPerColor: Record<string, string>;
  /** ID of the currently equipped WaterTheme. */
  waterThemeId: string;
  /** ID of the currently equipped BoardTheme. */
  boardThemeId: string;
  /** ID of the currently equipped peg_skin item (optional). */
  pegSkinId?: string;
  /** ID of the currently equipped particle_effect item (optional). */
  particleEffectId?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

/**
 * Default equipped cosmetics — used as the initial slice state and as a
 * fallback when no cosmetics have been configured.
 */
export const DEFAULT_EQUIPPED_COSMETICS: EquippedCosmetics = {
  ringSkinsPerColor: {},
  waterThemeId: 'default',
  boardThemeId: 'default',
};
