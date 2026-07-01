const android = require('@react-native-community/cli-platform-android');
const ios = require('@react-native-community/cli-platform-ios');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {},
  },
  assets: ['./src/assets/fonts/', './src/assets/sounds/'],
  /**
   * Register Android and iOS platform providers explicitly.
   * react-native 0.73 does not ship its own react-native.config.js,
   * so the CLI cannot auto-discover these platforms via dependency scanning.
   * Schema only allows: projectConfig, dependencyConfig, linkConfig, npmPackageName.
   */
  platforms: {
    android: {
      projectConfig: android.projectConfig,
      dependencyConfig: android.dependencyConfig,
    },
    ios: {
      projectConfig: ios.projectConfig,
      dependencyConfig: ios.dependencyConfig,
    },
  },
};
