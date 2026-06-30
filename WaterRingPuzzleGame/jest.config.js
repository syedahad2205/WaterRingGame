/** @type {import('jest').Config} */

const babelTransform = [
  'babel-jest',
  {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
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
    ],
  },
];

const sharedModuleNameMapper = {
  '^@app/(.*)$': '<rootDir>/src/app/$1',
  '^@screens/(.*)$': '<rootDir>/src/screens/$1',
  '^@features/(.*)$': '<rootDir>/src/features/$1',
  '^@store/(.*)$': '<rootDir>/src/store/$1',
  '^@services/(.*)$': '<rootDir>/src/services/$1',
  '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@constants/(.*)$': '<rootDir>/src/constants/$1',
  '^@types/(.*)$': '<rootDir>/src/types/$1',
  '^@assets/(.*)$': '<rootDir>/src/assets/$1',
};

const config = {
  // Use jest-circus as the default test runner
  testRunner: 'jest-circus/runner',

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/assets/**',
    '!node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 70,
      functions: 80,
      lines: 75,
    },
  },

  // Separate test projects for unit, property, and integration suites
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/unit/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': babelTransform,
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: sharedModuleNameMapper,
      testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
      ],
    },
    {
      displayName: 'property',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/property/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': babelTransform,
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: sharedModuleNameMapper,
      testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/property/setup.ts'],
    },
    {
      // Integration tests talk to Firebase Emulator and require it to be running.
      // Run with: FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 jest --testPathPattern=integration
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/__tests__/integration/**/*.test.{ts,tsx}'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': babelTransform,
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: sharedModuleNameMapper,
      testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
      ],
    },
  ],
};

module.exports = config;
