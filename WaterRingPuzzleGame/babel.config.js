module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json', '.svg'],
        alias: {
          '^@/(.+)$': './src/\\1',
          '@app': './src/app',
          '@screens': './src/screens',
          '@features': './src/features',
          '@store': './src/store',
          '@services': './src/services',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@constants': './src/constants',
          '@types': './src/types',
          '@assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
