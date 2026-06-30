/**
 * PurchaseService.test.ts — task 12.2.1b (offline block)
 * Tests PurchaseService singleton, PRODUCT_CATALOG, and purchase flow.
 */

import {
  PurchaseService,
  PRODUCT_CATALOG,
} from '../../src/features/economy/PurchaseService';

describe('PurchaseService', () => {
  beforeEach(() => {
    // Reset singleton between tests so each test gets a fresh state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (PurchaseService as any).instance = null;
  });

  describe('getInstance', () => {
    it('returns a PurchaseService instance', () => {
      const svc = PurchaseService.getInstance();
      expect(svc).toBeInstanceOf(PurchaseService);
    });

    it('returns the same singleton on repeated calls', () => {
      const a = PurchaseService.getInstance();
      const b = PurchaseService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('PRODUCT_CATALOG', () => {
    it('has exactly 8 products', () => {
      const keys = Object.keys(PRODUCT_CATALOG);
      expect(keys.length).toBe(8);
    });

    it('each product has required fields with coinsGranted >= 0', () => {
      for (const product of Object.values(PRODUCT_CATALOG)) {
        expect(product.id).toBeTruthy();
        expect(product.title).toBeTruthy();
        expect(product.description).toBeTruthy();
        expect(product.priceString).toBeTruthy();
        // coinsGranted >= 0 (VIP products may grant 0 coins)
        expect(product.coinsGranted).toBeGreaterThanOrEqual(0);
      }
    });

    it('coin products have coinsGranted > 0', () => {
      const coinProducts = Object.values(PRODUCT_CATALOG).filter((p) =>
        p.id.startsWith('coins_'),
      );
      expect(coinProducts.length).toBeGreaterThan(0);
      for (const p of coinProducts) {
        expect(p.coinsGranted).toBeGreaterThan(0);
      }
    });
  });

  describe('isOffline', () => {
    it('returns a boolean', () => {
      const svc = PurchaseService.getInstance();
      expect(typeof svc.isOffline()).toBe('boolean');
    });
  });

  describe('purchase (uninitialized / offline guard)', () => {
    it('returns { success: false } when not initialized', async () => {
      const svc = PurchaseService.getInstance();
      const result = await svc.purchase('coins_100');
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('purchase (initialized)', () => {
    it('returns { success: true } after initialization for a valid product', async () => {
      const svc = PurchaseService.getInstance();
      await svc.initialize('mock-api-key');
      const result = await svc.purchase('coins_100');
      expect(result.success).toBe(true);
      expect(result.transactionId).toBeTruthy();
    });

    it('returns coinsGranted matching catalog for coins_550', async () => {
      const svc = PurchaseService.getInstance();
      await svc.initialize('mock-key');
      const result = await svc.purchase('coins_550');
      expect(result.coinsGranted).toBe(PRODUCT_CATALOG['coins_550'].coinsGranted);
    });
  });

  describe('fetchProducts', () => {
    it('returns array of products', async () => {
      const svc = PurchaseService.getInstance();
      const products = await svc.fetchProducts();
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe('restorePurchases', () => {
    it('returns { restoredCount: number }', async () => {
      const svc = PurchaseService.getInstance();
      const result = await svc.restorePurchases();
      expect(typeof result.restoredCount).toBe('number');
    });
  });
});
