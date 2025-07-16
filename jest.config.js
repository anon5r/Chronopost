// Chronopost - Jest Configuration
/* eslint-env node */

/** @type {import('jest').Config} */
export default {
  // Use TypeScript preset
  preset: 'ts-jest/presets/default-esm',

  // Test environment
  testEnvironment: 'node',

  // Enable ESM support
  extensionsToTreatAsEsm: ['.ts'],

  // Module name mapping for path aliases
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/packages/shared/src/$1',
    '^@backend/(.*)$': '<rootDir>/packages/backend/src/$1',
    '^@frontend/(.*)$': '<rootDir>/packages/frontend/src/$1',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/packages/**/src/**/__tests__/**/*.test.ts',
    '<rootDir>/packages/**/tests/**/*.test.ts',
    '<rootDir>/packages/**/*.test.ts',
    '<rootDir>/packages/**/*.spec.ts',
  ],

  // Files to ignore
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/', '/coverage/', '/.next/'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform settings
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],

  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/coverage/',
    '/.next/',
    '/prisma/',
    '.d.ts',
    'jest.config.js',
    'jest.setup.js',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Package-specific thresholds
    'packages/shared/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'packages/backend/src/services/oauth/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    'packages/backend/src/services/scheduler/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  // Files to collect coverage from
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    '!packages/*/src/**/*.d.ts',
    '!packages/*/src/**/*.test.ts',
    '!packages/*/src/**/*.spec.ts',
    '!packages/*/src/**/index.ts',
    '!packages/backend/src/index.ts',
    '!packages/frontend/src/main.ts',
  ],

  // Test timeout
  testTimeout: 30000,

  // Global setup/teardown
  globalSetup: '<rootDir>/jest.global-setup.js',
  globalTeardown: '<rootDir>/jest.global-teardown.js',

  // Verbose output
  verbose: true,

  // Clear mocks
  clearMocks: true,
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Max workers for parallel testing
  maxWorkers: '50%',

  // Project configurations for different packages
  projects: [
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/packages/shared/**/*.test.ts'],
      testEnvironment: 'node',
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/packages/backend/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/packages/backend/jest.setup.js'],
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/packages/frontend/**/*.test.ts'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/packages/frontend/jest.setup.js'],
    },
  ],

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage',
        outputName: 'jest-junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
      },
    ],
  ],

  // Watch mode
  watchPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Cache
  cacheDirectory: '<rootDir>/.jest-cache',
};
