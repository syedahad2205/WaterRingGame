/**
 * cosmeticsSlice — owns the set of owned cosmetic IDs and the set of equipped
 * cosmetic IDs per category.
 *
 * Requirements: 17.5, 18.1, 18.2, 18.4
 * Persists to MMKV key: 'cosmetics_slice'
 *
 * Note: Uses string[] instead of Set and Record<string, string> instead of Map
 * for MMKV serialization compatibility.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSliceMMKVStorage } from '../../services/storage/MMKVStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CosmeticsState {
  /** Flat list of owned cosmetic IDs — serialized as array for MMKV compatibility. */
  ownedCosmeticIds: string[];
  /**
   * Currently equipped cosmetic ID per category key (e.g. 'ring_skin', 'button_skin',
   * 'particle_effect', 'victory_animation', 'profile_frame', 'profile_banner', 'title').
   * Serialized as plain object for MMKV compatibility.
   */
  equippedCosmeticIds: Record<string, string>;
}

export interface CosmeticsActions {
  addCosmetic: (cosmeticId: string) => void;
  equipCosmetic: (category: string, cosmeticId: string) => void;
  unequipCosmetic: (category: string) => void;
}

export type CosmeticsStore = CosmeticsState & CosmeticsActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

const defaultCosmeticsState: CosmeticsState = {
  ownedCosmeticIds: [],
  equippedCosmeticIds: {},
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useCosmeticsStore = create<CosmeticsStore>()(
  persist(
    (set) => ({
      ...defaultCosmeticsState,

      addCosmetic: (cosmeticId: string): void =>
        set((state) => {
          if (state.ownedCosmeticIds.includes(cosmeticId)) {
            // Already owned — idempotent, no-op
            return state;
          }
          return { ownedCosmeticIds: [...state.ownedCosmeticIds, cosmeticId] };
        }),

      equipCosmetic: (category: string, cosmeticId: string): void =>
        set((state) => ({
          equippedCosmeticIds: {
            ...state.equippedCosmeticIds,
            [category]: cosmeticId,
          },
        })),

      unequipCosmetic: (category: string): void =>
        set((state) => {
          const updated = { ...state.equippedCosmeticIds };
          delete updated[category];
          return { equippedCosmeticIds: updated };
        }),
    }),
    {
      name: 'cosmetics_slice',
      storage: createJSONStorage(() => createSliceMMKVStorage('cosmetics_slice')),
    },
  ),
);

// ---------------------------------------------------------------------------
// Granular selectors — Requirement 17.8
// ---------------------------------------------------------------------------

export const selectOwnedCosmeticIds = (state: CosmeticsStore): string[] =>
  state.ownedCosmeticIds;

export const selectEquippedCosmeticIds = (
  state: CosmeticsStore,
): Record<string, string> => state.equippedCosmeticIds;

/**
 * selectIsOwned — returns true if the given cosmetic ID is in the owned list.
 * Returns a derived boolean suitable for use in a granular selector factory.
 */
export const selectIsOwned =
  (cosmeticId: string) =>
  (state: CosmeticsStore): boolean =>
    state.ownedCosmeticIds.includes(cosmeticId);

/**
 * selectEquipped — returns the equipped cosmetic ID for a given category,
 * or undefined if nothing is equipped in that category.
 */
export const selectEquipped =
  (category: string) =>
  (state: CosmeticsStore): string | undefined =>
    state.equippedCosmeticIds[category];
