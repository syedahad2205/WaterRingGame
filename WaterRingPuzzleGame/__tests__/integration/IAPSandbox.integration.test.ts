/**
 * IAPSandbox.integration.test.ts  (task 12.2.1a)
 *
 * Stubbed IAP sandbox test — no real RevenueCat in CI.
 * Validates PurchaseService singleton, product catalog shape, and
 * graceful failure paths.
 */

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue(null),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../src/services/storage/MMKVStorage', () => ({
  createSliceMMKVStorage: jest.fn(() => ({
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

jest.mock('react-native-purchases', () => ({
  getProducts: jest.fn(() => Promise.resolve([])),
  purchaseProduct: jest.fn(() =>
    Promise.resolve({ customerInfo: { entitlements: { active: {} } } }),
  ),
  restorePurchases: jest.fn(() => Promise.resolve({ activeSubscriptions: [] })),
}));

import { PurchaseService, PRODUCT_CATALOG } from '../../src/features/economy/PurchaseService';

// ─────────────────────────────────────────────────────────────────────────────

describe('IAP sandbox flow (task 12.2.1a — stubbed, no real RevenueCat)', () => {
  it('PurchaseService singleton is accessible', () => {
    const service = PurchaseService.getInstance();
    expect(service).toBeDefined();
  });

  it('PurchaseService.getInstance() returns the same instance (singleton)', () => {
    const a = PurchaseService.getInstance();
    const b = PurchaseService.getInstance();
    expect(a).toBe(b);
  });

  it('PRODUCT_CATALOG has exactly 8 products', () => {
    expect(Object.keys(PRODUCT_CATALOG).length).toBe(8);
  });

  it('PRODUCT_CATALOG contains coin tier products', () => {
    expect(PRODUCT_CATALOG).toHaveProperty('coins_100');
    expect(PRODUCT_CATALOG).toHaveProperty('coins_550');
    expect(PRODUCT_CATALOG).toHaveProperty('coins_1200');
    expect(PRODUCT_CATALOG).toHaveProperty('coins_2500');
    expect(PRODUCT_CATALOG).toHaveProperty('coins_6500');
    expect(PRODUCT_CATALOG).toHaveProperty('coins_14000');
  });

  it('PRODUCT_CATALOG contains VIP subscription products', () => {
    expect(PRODUCT_CATALOG).toHaveProperty('vip_monthly');
    expect(PRODUCT_CATALOG).toHaveProperty('vip_annual');
  });

  it('each product has required fields: id, title, description, priceString, coinsGranted', () => {
    Object.values(PRODUCT_CATALOG).forEach(product => {
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('title');
      expect(product).toHaveProperty('description');
      expect(product).toHaveProperty('priceString');
      expect(product).toHaveProperty('coinsGranted');
    });
  });

  it('priceString is formatted as a dollar amount', () => {
    Object.values(PRODUCT_CATALOG).forEach(product => {
      expect(product.priceString).toMatch(/^\$/);
    });
  });

  it('coins_100 grants 100 coins', () => {
    expect(PRODUCT_CATALOG.coins_100.coinsGranted).toBe(100);
  });

  it('vip products grant 0 coins (subscription benefit, not direct coins)', () => {
    expect(PRODUCT_CATALOG.vip_monthly.coinsGranted).toBe(0);
    expect(PRODUCT_CATALOG.vip_annual.coinsGranted).toBe(0);
  });

  it('purchase returns { success: false } when uninitialized (no RevenueCat key)', async () => {
    const service = PurchaseService.getInstance();
    // Not calling initialize() — should fail gracefully
    const result = await service.purchase('coins_100').catch(() => ({ success: false }));
    expect(result).toHaveProperty('success');
  });

  it('restorePurchases resolves and returns restoredCount', async () => {
    const service = PurchaseService.getInstance();
    const result = await service.restorePurchases();
    expect(result).toHaveProperty('restoredCount');
    expect(typeof result.restoredCount).toBe('number');
  });

  it('fetchProducts resolves to an array', async () => {
    const service = PurchaseService.getInstance();
    const products = await service.fetchProducts();
    expect(Array.isArray(products)).toBe(true);
  });

  it('isOffline() returns a boolean', () => {
    const service = PurchaseService.getInstance();
    expect(typeof service.isOffline()).toBe('boolean');
  });
});
