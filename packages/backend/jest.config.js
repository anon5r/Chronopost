/**
 * Jest Configuration for Chronopost Backend
 * TypeScript + Prisma + セキュリティテスト対応
 */

export default {
  // テスト環境設定
  testEnvironment: 'node',
  preset: 'ts-jest/presets/default-esm',

  // TypeScript + ESModules設定
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'bundler',
        },
      },
    ],
  },

  // モジュール解決
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  modulePaths: ['<rootDir>/src'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
  },

  // テストファイルの検出
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  ],

  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],

  // カバレッジ設定
  collectCoverage: false, // デフォルトでは無効、npm scriptで有効化
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/test-utils/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    // セキュリティクリティカルなモジュールはより高い閾値
    './src/services/oauth/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './src/middlewares/security.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // テスト環境変数
  testEnvironmentOptions: {
    NODE_ENV: 'test',
  },

  // タイムアウト設定
  testTimeout: 30000,

  // パフォーマンス設定
  maxWorkers: '50%',

  // エラーハンドリング
  errorOnDeprecated: true,

  // キャッシュ設定
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',

  // レポーター設定
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/coverage',
        outputName: 'junit.xml',
        suiteName: 'Chronopost Backend Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // 詳細設定
  /* eslint-disable no-undef */
  verbose: process.env.DEBUG_TESTS === 'true',
  silent: process.env.DEBUG_TESTS !== 'true',
  /* eslint-enable no-undef */

  // グローバル設定
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },

  // ファイル変換設定
  transformIgnorePatterns: ['node_modules/(?!(jose|@hono|hono)/)'],

  // セキュリティテスト用の特別設定
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
        '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
      ],
      testPathIgnorePatterns: [
        '.*\\.integration\\.test\\.ts$',
        '.*\\.e2e\\.test\\.ts$',
        '.*\\.security\\.test\\.ts$',
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration.test.{ts,tsx}'],
      testTimeout: 60000,
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/src/**/*.security.test.{ts,tsx}'],
      testTimeout: 60000,
      setupFilesAfterEnv: [
        '<rootDir>/../../jest.setup.js',
        '<rootDir>/src/test-utils/security-test-setup.ts',
      ],
    },
  ],
};
