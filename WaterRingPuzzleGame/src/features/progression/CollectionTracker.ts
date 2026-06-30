/**
 * CollectionTracker.ts
 * Tracks cosmetic collection completions and grants rewards.
 * Requirement: 11.3.1
 */

export interface CollectionDefinition {
  id: string;
  name: string;
  itemIds: string[];
  rewardCoins: number;
  rewardXP: number;
}

export const COLLECTION_DEFINITIONS: CollectionDefinition[] = [
  { id: 'ocean_set',      name: 'Ocean Set',      itemIds: ['skin_wave', 'skin_coral', 'skin_pearl', 'trail_bubbles'],                  rewardCoins: 500,  rewardXP: 200 },
  { id: 'fire_set',       name: 'Fire Set',        itemIds: ['skin_ember', 'skin_lava', 'skin_smoke', 'trail_sparks'],                   rewardCoins: 500,  rewardXP: 200 },
  { id: 'forest_set',     name: 'Forest Set',      itemIds: ['skin_leaf', 'skin_moss', 'skin_bark', 'trail_pollen'],                     rewardCoins: 500,  rewardXP: 200 },
  { id: 'sky_set',        name: 'Sky Set',         itemIds: ['skin_cloud', 'skin_storm', 'skin_sun', 'trail_wind'],                      rewardCoins: 500,  rewardXP: 200 },
  { id: 'neon_set',       name: 'Neon Set',        itemIds: ['skin_neon_red', 'skin_neon_blue', 'skin_neon_green', 'trail_neon_glow'],   rewardCoins: 750,  rewardXP: 300 },
  { id: 'galaxy_set',     name: 'Galaxy Set',      itemIds: ['skin_nebula', 'skin_starfield', 'skin_comet', 'trail_stardust'],           rewardCoins: 750,  rewardXP: 300 },
  { id: 'candy_set',      name: 'Candy Set',       itemIds: ['skin_bubblegum', 'skin_candy_cane', 'skin_lollipop', 'trail_sprinkles'],   rewardCoins: 500,  rewardXP: 200 },
  { id: 'ice_set',        name: 'Ice Set',         itemIds: ['skin_frost', 'skin_glacier', 'skin_snowflake', 'trail_ice_crystals'],      rewardCoins: 600,  rewardXP: 250 },
  { id: 'gold_set',       name: 'Gold Set',        itemIds: ['skin_gold', 'skin_bronze', 'skin_silver', 'trail_coins'],                  rewardCoins: 1000, rewardXP: 500 },
  { id: 'shadow_set',     name: 'Shadow Set',      itemIds: ['skin_void', 'skin_shadow', 'skin_dark_matter', 'trail_shade'],             rewardCoins: 750,  rewardXP: 300 },
  { id: 'rainbow_set',    name: 'Rainbow Set',     itemIds: ['skin_red', 'skin_orange', 'skin_yellow', 'skin_green', 'skin_violet'],     rewardCoins: 600,  rewardXP: 250 },
  { id: 'retro_set',      name: 'Retro Set',       itemIds: ['skin_pixel', 'skin_8bit', 'skin_arcade', 'trail_pixel_dust'],              rewardCoins: 500,  rewardXP: 200 },
  { id: 'nature_set',     name: 'Nature Set',      itemIds: ['skin_flower', 'skin_butterfly', 'skin_bee', 'trail_petals'],               rewardCoins: 500,  rewardXP: 200 },
  { id: 'tech_set',       name: 'Tech Set',        itemIds: ['skin_circuit', 'skin_glitch', 'skin_hologram', 'trail_data'],              rewardCoins: 750,  rewardXP: 300 },
  { id: 'music_set',      name: 'Music Set',       itemIds: ['skin_vinyl', 'skin_note', 'skin_beat', 'trail_sound_waves'],               rewardCoins: 500,  rewardXP: 200 },
  { id: 'sport_set',      name: 'Sport Set',       itemIds: ['skin_soccer', 'skin_basketball', 'skin_tennis', 'trail_sweat'],            rewardCoins: 500,  rewardXP: 200 },
  { id: 'food_set',       name: 'Food Set',        itemIds: ['skin_pizza', 'skin_donut', 'skin_taco', 'trail_crumbs'],                   rewardCoins: 500,  rewardXP: 200 },
  { id: 'season_set',     name: 'Seasons Set',     itemIds: ['skin_spring', 'skin_summer', 'skin_autumn', 'skin_winter'],                rewardCoins: 800,  rewardXP: 400 },
  { id: 'prestige_set',   name: 'Prestige Set',    itemIds: ['skin_prestige_1', 'skin_prestige_2', 'skin_prestige_3', 'trail_glory'],    rewardCoins: 2000, rewardXP: 1000 },
  { id: 'legendary_set',  name: 'Legendary Set',   itemIds: ['skin_legend_1', 'skin_legend_2', 'skin_legend_3', 'trail_legend'],        rewardCoins: 5000, rewardXP: 2500 },
];

export class CollectionTracker {
  /**
   * Returns whether the player owns all items in a given collection.
   * @param collectionId - The collection to check.
   * @param ownedIds - The player's currently owned cosmetic IDs.
   */
  isCollectionComplete(collectionId: string, ownedIds: string[]): boolean {
    const def = COLLECTION_DEFINITIONS.find((c) => c.id === collectionId);
    if (!def) return false;
    const ownedSet = new Set(ownedIds);
    return def.itemIds.every((id) => ownedSet.has(id));
  }

  /**
   * Returns completion status for every collection.
   * @param ownedIds - The player's currently owned cosmetic IDs.
   */
  getCompletionStatus(
    ownedIds: string[],
  ): { collectionId: string; ownedCount: number; totalCount: number; complete: boolean }[] {
    const ownedSet = new Set(ownedIds);
    return COLLECTION_DEFINITIONS.map((def) => {
      const ownedCount = def.itemIds.filter((id) => ownedSet.has(id)).length;
      return {
        collectionId: def.id,
        ownedCount,
        totalCount: def.itemIds.length,
        complete: ownedCount === def.itemIds.length,
      };
    });
  }

  /**
   * Compares two owned-ID snapshots and returns collections newly completed.
   * @param previousOwnedIds - Cosmetic IDs owned before the update.
   * @param newOwnedIds - Cosmetic IDs owned after the update.
   * @returns Array of CollectionDefinitions that became complete in this delta.
   */
  checkNewCompletions(
    previousOwnedIds: string[],
    newOwnedIds: string[],
  ): CollectionDefinition[] {
    return COLLECTION_DEFINITIONS.filter(
      (def) =>
        !this.isCollectionComplete(def.id, previousOwnedIds) &&
        this.isCollectionComplete(def.id, newOwnedIds),
    );
  }

  /**
   * Returns overall collection completion as a percentage (0–100).
   * @param ownedIds - The player's currently owned cosmetic IDs.
   */
  getTotalCompletionPercent(ownedIds: string[]): number {
    if (COLLECTION_DEFINITIONS.length === 0) return 0;
    const completed = COLLECTION_DEFINITIONS.filter((def) =>
      this.isCollectionComplete(def.id, ownedIds),
    ).length;
    return Math.round((completed / COLLECTION_DEFINITIONS.length) * 100);
  }
}
