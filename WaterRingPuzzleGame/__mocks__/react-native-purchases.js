/**
 * Manual Jest mock for react-native-purchases (RevenueCat).
 * The package is a native module not available in the Node.js test environment.
 */
module.exports = {
  getProducts: jest.fn(() => Promise.resolve([])),
  purchaseProduct: jest.fn(() =>
    Promise.resolve({ customerInfo: { entitlements: { active: {} } } }),
  ),
  restorePurchases: jest.fn(() => Promise.resolve({ activeSubscriptions: [] })),
  configure: jest.fn(),
  logIn: jest.fn(() => Promise.resolve({ customerInfo: {}, created: false })),
  logOut: jest.fn(() => Promise.resolve({ customerInfo: {} })),
  getCustomerInfo: jest.fn(() =>
    Promise.resolve({ entitlements: { active: {} }, activeSubscriptions: [] }),
  ),
  Purchases: {
    configure: jest.fn(),
  },
  LOG_LEVEL: {
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    VERBOSE: 'VERBOSE',
  },
};
