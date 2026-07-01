// Requires: npm install react-native-purchases
// Production-ready RevenueCat integration for Water Ring Puzzle Game

import { Platform } from 'react-native';
import { analyticsService } from '../../services/firebase/AnalyticsService';

// ---------------------------------------------------------------------------
// Dynamic import — graceful fallback if SDK is not linked yet
// ---------------------------------------------------------------------------

let Purchases: any = null;
let PURCHASES_ERROR_CODE: any = null;
let LOG_LEVEL: any = null;

try {
  const rnPurchases = require('react-native-purchases');
  Purchases = rnPurchases.default;
  PURCHASES_ERROR_CODE = rnPurchases.PURCHASES_ERROR_CODE;
  LOG_LEVEL = rnPurchases.LOG_LEVEL;
} catch {
  if (__DEV__) console.warn('[PurchaseService] react-native-purchases not installed');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductId =
  // Coin Packs
  | 'coin_pack_small'       // 500 coins - $0.99
  | 'coin_pack_medium'      // 1500 coins - $2.99
  | 'coin_pack_large'       // 5000 coins - $4.99
  | 'coin_pack_xl'          // 15000 coins - $9.99
  // Gem Packs
  | 'gem_pack_small'        // 50 gems - $1.99
  | 'gem_pack_large'        // 200 gems - $4.99
  // Bundles
  | 'starter_pack'          // 1000 coins + 3 themes - $2.99
  | 'welcome_pack'          // 2000 coins + 5 themes + remove ads 7 days - $4.99
  | 'premium_upgrade'       // Remove ads + all themes + VIP badge - $9.99
  // Cosmetic Packs
  | 'legendary_theme_pack'  // 5 legendary themes - $3.99
  | 'glass_theme_pack'      // 3 glass themes - $1.99
  | 'premium_ring_pack'     // 5 premium rings - $2.99
  | 'tank_pack'             // 3 premium tanks - $2.99
  // Single Items
  | 'remove_ads';           // Permanent ad removal - $4.99

export interface Product {
  id: ProductId;
  title: string;
  description: string;
  priceString: string;
  coinsGranted: number;
  gemsGranted: number;
  entitlements: string[];
  /** RevenueCat package reference, populated after fetch */
  _rcPackage?: any;
}

export interface PurchaseOutcome {
  success: boolean;
  transactionId?: string;
  coinsGranted?: number;
  gemsGranted?: number;
  entitlementsGranted?: string[];
  error?: string;
  isCancelled?: boolean;
}

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

export const PRODUCT_CATALOG: Record<ProductId, Product> = {
  // Coin Packs
  coin_pack_small: {
    id: 'coin_pack_small',
    title: 'Handful of Coins',
    description: '500 coins',
    priceString: '$0.99',
    coinsGranted: 500,
    gemsGranted: 0,
    entitlements: [],
  },
  coin_pack_medium: {
    id: 'coin_pack_medium',
    title: 'Bag of Coins',
    description: '1,500 coins',
    priceString: '$2.99',
    coinsGranted: 1500,
    gemsGranted: 0,
    entitlements: [],
  },
  coin_pack_large: {
    id: 'coin_pack_large',
    title: 'Chest of Coins',
    description: '5,000 coins',
    priceString: '$4.99',
    coinsGranted: 5000,
    gemsGranted: 0,
    entitlements: [],
  },
  coin_pack_xl: {
    id: 'coin_pack_xl',
    title: 'Vault of Coins',
    description: '15,000 coins',
    priceString: '$9.99',
    coinsGranted: 15000,
    gemsGranted: 0,
    entitlements: [],
  },

  // Gem Packs
  gem_pack_small: {
    id: 'gem_pack_small',
    title: 'Small Gem Pouch',
    description: '50 gems',
    priceString: '$1.99',
    coinsGranted: 0,
    gemsGranted: 50,
    entitlements: [],
  },
  gem_pack_large: {
    id: 'gem_pack_large',
    title: 'Large Gem Chest',
    description: '200 gems',
    priceString: '$4.99',
    coinsGranted: 0,
    gemsGranted: 200,
    entitlements: [],
  },

  // Bundles
  starter_pack: {
    id: 'starter_pack',
    title: 'Starter Pack',
    description: '1,000 coins + 3 themes',
    priceString: '$2.99',
    coinsGranted: 1000,
    gemsGranted: 0,
    entitlements: ['starter_themes'],
  },
  welcome_pack: {
    id: 'welcome_pack',
    title: 'Welcome Pack',
    description: '2,000 coins + 5 themes + remove ads 7 days',
    priceString: '$4.99',
    coinsGranted: 2000,
    gemsGranted: 0,
    entitlements: ['welcome_themes', 'remove_ads_7d'],
  },
  premium_upgrade: {
    id: 'premium_upgrade',
    title: 'Premium Upgrade',
    description: 'Remove ads + all themes + VIP badge',
    priceString: '$9.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['remove_ads', 'all_themes', 'vip_badge', 'premium'],
  },

  // Cosmetic Packs
  legendary_theme_pack: {
    id: 'legendary_theme_pack',
    title: 'Legendary Theme Pack',
    description: '5 legendary themes',
    priceString: '$3.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['legendary_themes'],
  },
  glass_theme_pack: {
    id: 'glass_theme_pack',
    title: 'Glass Theme Pack',
    description: '3 glass themes',
    priceString: '$1.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['glass_themes'],
  },
  premium_ring_pack: {
    id: 'premium_ring_pack',
    title: 'Premium Ring Pack',
    description: '5 premium rings',
    priceString: '$2.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['premium_rings'],
  },
  tank_pack: {
    id: 'tank_pack',
    title: 'Tank Pack',
    description: '3 premium tanks',
    priceString: '$2.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['premium_tanks'],
  },

  // Single Items
  remove_ads: {
    id: 'remove_ads',
    title: 'Remove Ads',
    description: 'Permanent ad removal',
    priceString: '$4.99',
    coinsGranted: 0,
    gemsGranted: 0,
    entitlements: ['remove_ads'],
  },
};

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

function mapRevenueCatError(errorCode: number | undefined): string {
  if (!PURCHASES_ERROR_CODE) return 'Purchase failed. Please try again.';

  switch (errorCode) {
    case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
      return 'Purchase was cancelled.';
    case PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR:
      return 'There was a problem with the app store. Please try again later.';
    case PURCHASES_ERROR_CODE.PURCHASE_NOT_ALLOWED_ERROR:
      return 'Purchases are not allowed on this device.';
    case PURCHASES_ERROR_CODE.PURCHASE_INVALID_ERROR:
      return 'This purchase is invalid. Please contact support.';
    case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
      return 'This product is currently unavailable.';
    case PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR:
      return 'You already own this product.';
    case PURCHASES_ERROR_CODE.NETWORK_ERROR:
      return 'Network error. Please check your connection and try again.';
    case PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR:
      return 'This receipt is already in use by another account.';
    case PURCHASES_ERROR_CODE.MISSING_RECEIPT_FILE_ERROR:
      return 'Receipt not found. Please try restoring purchases.';
    case PURCHASES_ERROR_CODE.INVALID_CREDENTIALS_ERROR:
      return 'Invalid credentials. Please contact support.';
    case PURCHASES_ERROR_CODE.UNEXPECTED_BACKEND_RESPONSE_ERROR:
      return 'Unexpected server response. Please try again later.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class PurchaseService {
  private static instance: PurchaseService | null = null;
  private initialized = false;
  private products: Map<ProductId, Product> = new Map();
  private customerInfoListeners: Array<(info: any) => void> = [];
  private listenerRemover: (() => void) | null = null;

  private constructor() { /* intentional no-op */ }

  static getInstance(): PurchaseService {
    if (!PurchaseService.instance) {
      PurchaseService.instance = new PurchaseService();
    }
    return PurchaseService.instance;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Configure RevenueCat with the provided API key.
   * Must be called once at app start before any purchase operations.
   */
  async initialize(apiKey: string): Promise<void> {
    if (this.initialized) return;

    if (!Purchases) {
      if (__DEV__) console.warn('[PurchaseService] RevenueCat SDK not available — running in stub mode');
      this.initialized = true;
      return;
    }

    try {
      if (__DEV__ && LOG_LEVEL) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      await Purchases.configure({ apiKey });

      // Listen for customer info changes (e.g. subscription renewals/expirations)
      this.listenerRemover = Purchases.addCustomerInfoUpdateListener(
        (info: any) => {
          for (const cb of this.customerInfoListeners) {
            try { cb(info); } catch { /* never crash on listener error */ }
          }
        },
      );

      this.initialized = true;
      analyticsService.logEvent('purchase_service_initialized', {
        platform: Platform.OS,
      });
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] initialization failed:', error);
      analyticsService.logEvent('purchase_service_init_failed', {
        error: error?.message ?? 'unknown',
      });
      // Mark as initialized in stub mode so the app doesn't block
      this.initialized = true;
    }
  }

  /**
   * Identify a logged-in user for cross-device purchase sync.
   */
  async identify(userId: string): Promise<void> {
    if (!Purchases) return;

    try {
      await Purchases.logIn(userId);
      analyticsService.logEvent('purchase_user_identified', { userId });
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] identify failed:', error);
      analyticsService.logEvent('purchase_identify_failed', {
        error: error?.message ?? 'unknown',
      });
    }
  }

  /**
   * Log out the current user, reverting to anonymous.
   */
  async logout(): Promise<void> {
    if (!Purchases) return;

    try {
      await Purchases.logOut();
      analyticsService.logEvent('purchase_user_logout');
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] logout failed:', error);
    }
  }

  // -------------------------------------------------------------------------
  // Products
  // -------------------------------------------------------------------------

  /**
   * Fetch available products from RevenueCat offerings.
   * Falls back to the static catalog if the SDK is unavailable.
   */
  async fetchProducts(): Promise<Product[]> {
    if (!Purchases) {
      return Object.values(PRODUCT_CATALOG);
    }

    try {
      const offerings = await Purchases.getOfferings();
      const packages: any[] = offerings?.current?.availablePackages ?? [];

      if (packages.length === 0) {
        if (__DEV__) console.warn('[PurchaseService] No packages in current offering');
        return Object.values(PRODUCT_CATALOG);
      }

      const fetched: Product[] = [];
      for (const pkg of packages) {
        const identifier = pkg.product?.identifier as ProductId | undefined;
        const catalogEntry = identifier ? PRODUCT_CATALOG[identifier] : undefined;

        if (catalogEntry && identifier) {
          const product: Product = {
            ...catalogEntry,
            // Use store prices when available
            priceString: pkg.product?.priceString ?? catalogEntry.priceString,
            title: pkg.product?.title ?? catalogEntry.title,
            description: pkg.product?.description ?? catalogEntry.description,
            _rcPackage: pkg,
          };
          this.products.set(identifier, product);
          fetched.push(product);
        }
      }

      analyticsService.logEvent('products_fetched', {
        count: fetched.length,
      });

      // If the offering didn't include all our products, fill in from catalog
      if (fetched.length < Object.keys(PRODUCT_CATALOG).length) {
        for (const [id, catalogProduct] of Object.entries(PRODUCT_CATALOG)) {
          if (!this.products.has(id as ProductId)) {
            this.products.set(id as ProductId, catalogProduct);
            fetched.push(catalogProduct);
          }
        }
      }

      return fetched;
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] fetchProducts failed:', error);
      analyticsService.logEvent('products_fetch_failed', {
        error: error?.message ?? 'unknown',
      });
      return Object.values(PRODUCT_CATALOG);
    }
  }

  // -------------------------------------------------------------------------
  // Purchase
  // -------------------------------------------------------------------------

  /**
   * Purchase a product via RevenueCat.
   * On success, credits coins/gems via the economy store and tracks analytics.
   */
  async purchase(productId: ProductId): Promise<PurchaseOutcome> {
    if (!this.initialized) {
      return { success: false, error: 'PurchaseService not initialized' };
    }

    const catalogProduct = PRODUCT_CATALOG[productId];
    if (!catalogProduct) {
      return { success: false, error: `Unknown product: ${productId}` };
    }

    analyticsService.logEvent('purchase_initiated', { productId });

    if (!Purchases) {
      // Stub mode — simulate successful purchase for development
      if (__DEV__) console.log('[PurchaseService] stub purchase', productId);
      return {
        success: true,
        transactionId: `stub_txn_${Date.now()}`,
        coinsGranted: catalogProduct.coinsGranted,
        gemsGranted: catalogProduct.gemsGranted,
        entitlementsGranted: catalogProduct.entitlements,
      };
    }

    try {
      // Prefer the cached RC package if available, else look up by product ID
      const cachedProduct = this.products.get(productId);
      let purchaseResult: any;

      if (cachedProduct?._rcPackage) {
        purchaseResult = await Purchases.purchasePackage(cachedProduct._rcPackage);
      } else {
        // Attempt to purchase by store product identifier directly
        const offerings = await Purchases.getOfferings();
        const pkg = offerings?.current?.availablePackages?.find(
          (p: any) => p.product?.identifier === productId,
        );
        if (pkg) {
          purchaseResult = await Purchases.purchasePackage(pkg);
        } else {
          return {
            success: false,
            error: 'Product not available in current offering.',
          };
        }
      }

      const customerInfo = purchaseResult?.customerInfo;
      const transactionId =
        customerInfo?.nonSubscriptionTransactions?.[
          customerInfo.nonSubscriptionTransactions.length - 1
        ]?.transactionIdentifier ?? `txn_${Date.now()}`;

      // Credit coins via economy store
      if (catalogProduct.coinsGranted > 0) {
        try {
          const { useEconomyStore } = require('../../store/slices/economySlice');
          useEconomyStore
            .getState()
            .creditCoins(catalogProduct.coinsGranted, `purchase:${productId}`, transactionId);
        } catch (e) {
          if (__DEV__) console.error('[PurchaseService] Failed to credit coins:', e);
        }
      }

      analyticsService.logEvent('purchase_completed', {
        productId,
        transactionId,
        coinsGranted: catalogProduct.coinsGranted,
        gemsGranted: catalogProduct.gemsGranted,
        revenue: catalogProduct.priceString,
      });

      return {
        success: true,
        transactionId,
        coinsGranted: catalogProduct.coinsGranted,
        gemsGranted: catalogProduct.gemsGranted,
        entitlementsGranted: catalogProduct.entitlements,
      };
    } catch (error: any) {
      const isCancelled =
        error?.code === PURCHASES_ERROR_CODE?.PURCHASE_CANCELLED_ERROR;

      if (isCancelled) {
        analyticsService.logEvent('purchase_cancelled', { productId });
        return {
          success: false,
          isCancelled: true,
          error: 'Purchase was cancelled.',
        };
      }

      const userMessage = mapRevenueCatError(error?.code);

      if (__DEV__) console.error('[PurchaseService] purchase failed:', error);
      analyticsService.logEvent('purchase_failed', {
        productId,
        errorCode: error?.code ?? 'unknown',
        errorMessage: error?.message ?? 'unknown',
      });

      // Log to Crashlytics for non-cancellation errors
      try {
        const crashlytics = require('@react-native-firebase/crashlytics').default;
        crashlytics().recordError(
          error instanceof Error ? error : new Error(String(error?.message ?? error)),
        );
      } catch { /* never crash on crashlytics failure */ }

      return { success: false, error: userMessage };
    }
  }

  // -------------------------------------------------------------------------
  // Restore
  // -------------------------------------------------------------------------

  /**
   * Restore previously purchased products via RevenueCat.
   * Re-grants entitlements based on the restored customer info.
   */
  async restorePurchases(): Promise<{ restoredCount: number; entitlements: string[] }> {
    if (!this.initialized) {
      return { restoredCount: 0, entitlements: [] };
    }

    if (!Purchases) {
      if (__DEV__) console.log('[PurchaseService] stub restorePurchases');
      return { restoredCount: 0, entitlements: [] };
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const activeEntitlements = Object.keys(
        customerInfo?.entitlements?.active ?? {},
      );

      analyticsService.logEvent('purchases_restored', {
        count: activeEntitlements.length,
        entitlements: activeEntitlements.join(','),
      });

      return {
        restoredCount: activeEntitlements.length,
        entitlements: activeEntitlements,
      };
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] restorePurchases failed:', error);
      analyticsService.logEvent('restore_purchases_failed', {
        error: error?.message ?? 'unknown',
      });
      return { restoredCount: 0, entitlements: [] };
    }
  }

  // -------------------------------------------------------------------------
  // Entitlement checks
  // -------------------------------------------------------------------------

  /**
   * Check if the user has an active entitlement by ID.
   */
  async checkEntitlement(entitlementId: string): Promise<boolean> {
    if (!Purchases) return false;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo?.entitlements?.active?.[entitlementId]?.isActive === true;
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] checkEntitlement failed:', error);
      return false;
    }
  }

  /**
   * Check if the user has ad-free access (via 'remove_ads' or 'premium_upgrade').
   */
  async isAdFree(): Promise<boolean> {
    if (!Purchases) return false;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const active = customerInfo?.entitlements?.active ?? {};
      return (
        active['remove_ads']?.isActive === true ||
        active['premium']?.isActive === true
      );
    } catch {
      return false;
    }
  }

  /**
   * Check if the user has the premium upgrade entitlement.
   */
  async isPremium(): Promise<boolean> {
    if (!Purchases) return false;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo?.entitlements?.active?.['premium']?.isActive === true;
    } catch {
      return false;
    }
  }

  // -------------------------------------------------------------------------
  // Customer info
  // -------------------------------------------------------------------------

  /**
   * Get the current RevenueCat customer info.
   */
  async getCustomerInfo(): Promise<any | null> {
    if (!Purchases) return null;

    try {
      return await Purchases.getCustomerInfo();
    } catch (error: any) {
      if (__DEV__) console.error('[PurchaseService] getCustomerInfo failed:', error);
      return null;
    }
  }

  /**
   * Add a listener for customer info changes (subscription renewals, expirations, etc.).
   * Returns an unsubscribe function.
   */
  addCustomerInfoListener(callback: (info: any) => void): () => void {
    this.customerInfoListeners.push(callback);
    return () => {
      const idx = this.customerInfoListeners.indexOf(callback);
      if (idx >= 0) this.customerInfoListeners.splice(idx, 1);
    };
  }
}
