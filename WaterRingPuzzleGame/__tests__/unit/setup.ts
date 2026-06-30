/**
 * Jest setup for unit tests.
 * Defines React Native globals that are injected by Metro bundler
 * but are absent in the Node.js test environment.
 */

// __DEV__ is a React Native compile-time constant. Define it globally
// so that react-native and its dependencies don't throw ReferenceError.
(global as unknown as Record<string, unknown>).__DEV__ = true;
