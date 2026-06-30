'use strict';

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'import',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // ─── TypeScript strict rules ─────────────────────────────────────────
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: false,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      },
    ],
    // Turn off base rule in favour of TS-aware version
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {argsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_'},
    ],
    // ─── File / function length limits ───────────────────────────────────
    'max-lines': [
      'warn',
      {
        max: 250,
        skipBlankLines: true,
        skipComments: true,
      },
    ],
    'max-lines-per-function': [
      'error',
      {
        max: 40,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true,
      },
    ],
    // ─── Promise / async safety ──────────────────────────────────────────
    'no-promise-executor-return': 'error',
    // ─── React ───────────────────────────────────────────────────────────
    'react/react-in-jsx-scope': 'off', // Not required with RN new JSX transform
    'react/prop-types': 'off',         // TypeScript handles this
    // ─── Dependency direction rules (Requirements 2.2, 2.3, 2.4) ─────────
    // Enforces architectural boundaries so layers only depend downward.
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          // Rule 1 (Req 2.2): Physics folder must not import from rendering folder.
          // The physics simulation is a pure computational layer and must remain
          // decoupled from any visual/rendering concerns.
          {
            target: './src/features/game/physics',
            from: './src/features/game/rendering',
            message:
              'Physics layer must not import from the rendering layer. ' +
              'Keep physics computation decoupled from visual rendering.',
          },
          // Rule 2 (Req 2.3): Only the physics folder may import matter-js directly.
          // All other code must go through the PhysicsWorld abstraction in
          // src/features/game/physics/ to keep the Matter.js API surface contained.
          {
            target: [
              './src/app',
              './src/screens',
              './src/features/game/core',
              './src/features/game/rendering',
              './src/features/game/generation',
              './src/features/game/adaptive',
              './src/features/audio',
              './src/features/economy',
              './src/features/progression',
              './src/features/social',
              './src/features/replay',
              './src/store',
              './src/services',
              './src/hooks',
              './src/utils',
              './src/constants',
              './src/types',
            ],
            from: './node_modules/matter-js',
            message:
              'Direct matter-js imports are only allowed inside ' +
              'src/features/game/physics/. Use the PhysicsWorld abstraction instead.',
          },
          // Rule 3 (Req 2.4): Only the generation folder may read challenge seeds.
          // SeedGenerator and ChallengeGenerator own all seed/template logic;
          // other code must call into generation/ via its public interface.
          {
            target: './src',
            from: './src/features/game/generation',
            except: ['./features/game/generation'],
            message:
              'Challenge seeds and templates may only be accessed from ' +
              'src/features/game/generation/. Call the ChallengeGenerator API instead.',
          },
          // Rule 4 (Req 2.2): UI layer (screens) must not import from services directly.
          // Screens must read state from the Zustand store and receive services
          // via the ServiceContext/useServices() hook — never by direct import.
          {
            target: './src/screens',
            from: './src/services',
            message:
              'Screens (UI layer) must not import from services directly. ' +
              'Read state from the Zustand store and access services via useServices().',
          },
        ],
      },
    ],
  },
  overrides: [
    // ── JavaScript config / build files — relax TS-specific rules ────────
    {
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    // ── Test files — relax length and return-type rules ──────────────────
    {
      files: [
        '**/__tests__/**/*.{ts,tsx,js}',
        '**/*.{spec,test}.{ts,tsx,js}',
      ],
      env: {
        jest: true,
      },
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
        'max-lines-per-function': 'off',
        'max-lines': 'off',
      },
    },
  ],
  ignorePatterns: [
    'node_modules/',
    'android/',
    'ios/',
    'coverage/',
    'babel.config.js',
    'metro.config.js',
    'jest.config.*',
    '.eslintrc.js',
    'functions/',
  ],
};
