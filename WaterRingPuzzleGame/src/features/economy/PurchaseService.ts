// TODO: run `npx rn-purchases-install` and link RevenueCat native SDK before production

export type ProductId =
  | 'coins_100'
  | 'coins_550'
  | 'coins_1200'
  | 'coins_2500'
  | 'coins_6500'
  | 'coins_14000'
  | 'vip_monthly'
  | 'vip_annual';

export interface Product {
  id: ProductId;
  title: string;
  description: string;
  priceString: string;
  coinsGranted: number;
}

export interface PurchaseOutcome {
  success: boolean;
  transactionId?: string;
  coinsGranted?: number;
  error?: string;
  isCancelled?: boolean;
}

export const PRODUCT_CATALOG: Record<ProductId, Product> = {
  coins_100:   { id: 'coins_100',   title: 'Handful of Coins',  description: '100 coins',        priceString: '$0.99',  coinsGranted: 100   },
  coins_550:   { id: 'coins_550',   title: 'Bag of Coins',      description: '550 coins',        priceString: '$4.99',  coinsGranted: 550   },
  coins_1200:  { id: 'coins_1200',  title: 'Pouch of Coins',    description: '1,200 coins',      priceString: '$9.99',  coinsGranted: 1200  },
  coins_2500:  { id: 'coins_2500',  title: 'Chest of Coins',    description: '2,500 coins',      priceString: '$19.99', coinsGranted: 2500  },
  coins_6500:  { id: 'coins_6500',  title: 'Vault of Coins',    description: '6,500 coins',      priceString: '$49.99', coinsGranted: 6500  },
  coins_14000: { id: 'coins_14000', title: 'Treasury of Coins', description: '14,000 coins',     priceString: '$99.99', coinsGranted: 14000 },
  vip_monthly: { id: 'vip_monthly', title: 'VIP Monthly',       description: 'VIP subscription', priceString: '$4.99',  coinsGranted: 0     },
  vip_annual:  { id: 'vip_annual',  title: 'VIP Annual',        description: 'VIP subscription', priceString: '$39.99', coinsGranted: 0     },
};

export class PurchaseService {
  private static instance: PurchaseService | null = null;
  private initialized = false;

  private constructor() { /* intentional no-op */ }

  static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService();
    }
    return PurchaseService.instance;
  }

  async initialize(revenueCatApiKey: string): Promise<void> {
    if (this.initialized) return;
    // TODO: await Purchases.configure({ apiKey: revenueCatApiKey });
    console.log('[PurchaseService] initialize called with key', revenueCatApiKey ? '***' : '(empty)');
    this.initialized = true;
  }

  async fetchProducts(): Promise<Product[]> {
    // TODO: const offerings = await Purchases.getOfferings();
    // return offerings.current?.availablePackages.map(pkg => mapPackageToProduct(pkg)) ?? [];
    return Object.values(PRODUCT_CATALOG);
  }

  async purchase(productId: ProductId): Promise<PurchaseOutcome> {
    if (!this.initialized) {
      return { success: false, error: 'PurchaseService not initialized' };
    }
    // TODO: const { customerInfo } = await Purchases.purchaseStoreProduct(storeProduct);
    const product = PRODUCT_CATALOG[productId];
    if (!product) {
      return { success: false, error: `Unknown product: ${productId}` };
    }
    // Mock successful purchase
    const transactionId = `mock_txn_${Date.now()}`;
    console.log('[PurchaseService] mock purchase', productId, transactionId);
    return {
      success: true,
      transactionId,
      coinsGranted: product.coinsGranted,
    };
  }

  async restorePurchases(): Promise<{ restoredCount: number }> {
    if (!this.initialized) return { restoredCount: 0 };
    // TODO: await Purchases.restorePurchases();
    console.log('[PurchaseService] mock restorePurchases');
    return { restoredCount: 0 };
  }

  isOffline(): boolean {
    // TODO: use NetInfo.fetch() for real network check
    // const state = await NetInfo.fetch(); return !state.isConnected;
    return false;
  }
}
