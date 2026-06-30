jest.mock('react-native-mmkv', () => ({ MMKV: jest.fn().mockImplementation(() => ({ getString: jest.fn().mockReturnValue(null), set: jest.fn(), delete: jest.fn() })) }));
jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
}));

import { useCosmeticsStore } from '../../src/store/slices/cosmeticsSlice';

describe('CosmeticCard owned/unowned/locked states (task 8.4.1a)', () => {
  beforeEach(() => {
    useCosmeticsStore.setState({ ownedCosmeticIds: [], equippedCosmeticIds: {} });
  });

  it('unowned state: isOwned returns false for a cosmetic not in ownedCosmeticIds', () => {
    const state = useCosmeticsStore.getState();
    expect(state.ownedCosmeticIds.includes('skin_blue_diamond')).toBe(false);
  });

  it('owned state: isOwned returns true after addCosmetic', () => {
    useCosmeticsStore.getState().addCosmetic('skin_blue_diamond');
    expect(useCosmeticsStore.getState().ownedCosmeticIds.includes('skin_blue_diamond')).toBe(true);
  });

  it('equipped state: equipCosmetic sets the category slot', () => {
    useCosmeticsStore.getState().addCosmetic('skin_blue_diamond');
    useCosmeticsStore.getState().equipCosmetic('ring_skin', 'skin_blue_diamond');
    expect(useCosmeticsStore.getState().equippedCosmeticIds['ring_skin']).toBe('skin_blue_diamond');
  });

  it('unequip state: unequipCosmetic clears category slot', () => {
    useCosmeticsStore.getState().equipCosmetic('ring_skin', 'skin_blue_diamond');
    useCosmeticsStore.getState().unequipCosmetic('ring_skin');
    expect(useCosmeticsStore.getState().equippedCosmeticIds['ring_skin']).toBeUndefined();
  });

  it('addCosmetic is idempotent — adding same cosmetic twice still has one entry', () => {
    useCosmeticsStore.getState().addCosmetic('skin_fire');
    useCosmeticsStore.getState().addCosmetic('skin_fire');
    const owned = useCosmeticsStore.getState().ownedCosmeticIds;
    expect(owned.filter(id => id === 'skin_fire').length).toBe(1);
  });

  it('multiple categories can be equipped independently', () => {
    useCosmeticsStore.getState().equipCosmetic('ring_skin', 'skin_a');
    useCosmeticsStore.getState().equipCosmetic('button_skin', 'skin_b');
    expect(useCosmeticsStore.getState().equippedCosmeticIds['ring_skin']).toBe('skin_a');
    expect(useCosmeticsStore.getState().equippedCosmeticIds['button_skin']).toBe('skin_b');
  });
});
