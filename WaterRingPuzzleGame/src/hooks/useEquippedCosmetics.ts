/**
 * useEquippedCosmetics — resolves equipped cosmetic IDs into rendering configs.
 *
 * This hook reads the equipped cosmetic IDs from the cosmetics store, looks up
 * each one in the cosmetic catalog, and returns typed rendering configs for
 * RingRenderer, PegRenderer, WaterRenderer, and ParticleSystem.
 *
 * Requirements: 18.1, 18.2, 38.1–38.4
 */

import { useMemo } from 'react';
import { useCosmeticsStore } from '../store/slices/cosmeticsSlice';
import {
  getCosmeticById,
  type RingSkinConfig,
  type PegSkinConfig,
  type WaterStyleConfig,
  type ParticleTrailConfig,
  type VictoryAnimConfig,
} from '../constants/cosmeticCatalog';

// ---------------------------------------------------------------------------
// Default configs (used when no cosmetic is equipped)
// ---------------------------------------------------------------------------

const DEFAULT_WATER_STYLE: WaterStyleConfig = {
  deep: '#1565C0',
  mid: '#1E88E5',
  surface: '#2196F3',
  foam: '#BBDEFB',
  tint: [0.13, 0.59, 0.95],
  opacity: 0.85,
  waveAmplitude: 1.0,
  waveSpeed: 1.0,
};

const DEFAULT_PEG_SKIN: PegSkinConfig = {
  base: '#B0BEC5',
  tip: '#CFD8DC',
  glow: '#FFD600',
  occupied: '#4CAF50',
};

const DEFAULT_PARTICLE_TRAIL: ParticleTrailConfig = {
  colors: ['#FFFFFF', '#E3F2FD', '#BBDEFB'],
  speed: 1.0,
  size: 1.0,
  count: 8,
  shape: 'circle',
};

const DEFAULT_VICTORY_ANIM: VictoryAnimConfig = {
  particleType: 'burst',
  colors: ['#FFD700', '#FFA500', '#FF6347', '#FFFFFF'],
  count: 40,
  duration: 2.0,
};

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface EquippedCosmetics {
  ringSkin: RingSkinConfig | null;
  pegSkin: PegSkinConfig;
  waterStyle: WaterStyleConfig;
  particleTrail: ParticleTrailConfig;
  victoryAnim: VictoryAnimConfig;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns resolved rendering configs for all equipped cosmetics.
 * Falls back to defaults when no cosmetic is equipped in a category.
 */
export function useEquippedCosmetics(): EquippedCosmetics {
  const equippedIds = useCosmeticsStore((s) => s.equippedCosmeticIds);

  return useMemo(() => {
    // Ring skin
    const ringSkinId = equippedIds['ring_skin'];
    const ringSkinDef = ringSkinId ? getCosmeticById(ringSkinId) : null;
    const ringSkin = ringSkinDef?.category === 'ring_skin'
      ? (ringSkinDef.config as RingSkinConfig)
      : null;

    // Peg skin
    const pegSkinId = equippedIds['peg_skin'];
    const pegSkinDef = pegSkinId ? getCosmeticById(pegSkinId) : null;
    const pegSkin = pegSkinDef?.category === 'peg_skin'
      ? (pegSkinDef.config as PegSkinConfig)
      : DEFAULT_PEG_SKIN;

    // Water style
    const waterStyleId = equippedIds['water_style'];
    const waterStyleDef = waterStyleId ? getCosmeticById(waterStyleId) : null;
    const waterStyle = waterStyleDef?.category === 'water_style'
      ? (waterStyleDef.config as WaterStyleConfig)
      : DEFAULT_WATER_STYLE;

    // Particle trail
    const trailId = equippedIds['particle_trail'];
    const trailDef = trailId ? getCosmeticById(trailId) : null;
    const particleTrail = trailDef?.category === 'particle_trail'
      ? (trailDef.config as ParticleTrailConfig)
      : DEFAULT_PARTICLE_TRAIL;

    // Victory animation
    const victoryId = equippedIds['victory_animation'];
    const victoryDef = victoryId ? getCosmeticById(victoryId) : null;
    const victoryAnim = victoryDef?.category === 'victory_animation'
      ? (victoryDef.config as VictoryAnimConfig)
      : DEFAULT_VICTORY_ANIM;

    return { ringSkin, pegSkin, waterStyle, particleTrail, victoryAnim };
  }, [equippedIds]);
}

// Re-export defaults for consumers that need them directly.
export { DEFAULT_WATER_STYLE, DEFAULT_PEG_SKIN, DEFAULT_PARTICLE_TRAIL, DEFAULT_VICTORY_ANIM };
