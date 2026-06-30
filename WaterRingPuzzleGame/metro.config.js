/**
 * metro.config.js
 *
 * Metro bundler configuration for React Native 0.73.0.
 *
 * Handles:
 *  - @shopify/react-native-skia WASM assets
 *  - react-native-reanimated babel plugin (already in babel.config.js)
 *  - Path alias resolution (mirrors tsconfig.json paths)
 *  - GLSL shader files as raw strings
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  resolver: {
    // Allow importing .glsl shader files as raw strings
    assetExts: [...defaultConfig.resolver.assetExts, 'glsl', 'wasm'],
    sourceExts: [...defaultConfig.resolver.sourceExts],
    // Path aliases — mirrors tsconfig.json compilerOptions.paths
    extraNodeModules: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@hooks': path.resolve(__dirname, 'src/hooks'),
      '@screens': path.resolve(__dirname, 'src/screens'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@store': path.resolve(__dirname, 'src/store'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@constants': path.resolve(__dirname, 'src/constants'),
      '@assets': path.resolve(__dirname, 'src/assets'),
    },
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(defaultConfig, config);
