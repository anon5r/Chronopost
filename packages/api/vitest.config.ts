import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import type { UserConfig } from 'vitest/config';

const config: UserConfig = {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts', './__tests__/setup/index.ts'],
    include: ['__tests__/**/*.test.ts'],
    reporters: ['default', 'verbose'],
    logHeapUsage: true,
    testTimeout: 20000,
    hookTimeout: 15000,
    environmentOptions: {
      env: { NODE_ENV: 'test' }
    },
    env: {
      configFile: '.env',
    },
    maxConcurrency: 1,
    passWithNoTests: false,
    allowOnly: true,
    isolate: false,
    bail: 1,
    onConsoleLog: (log) => {
      // テストの実行中の全てのログを表示
      process.stdout.write(`[LOG] ${log}\n`);
      return false;
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'node_modules'],
      all: true,
      clean: true
    },
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    sequence: {
      concurrent: false,
      shuffle: false
    },
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 1
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@chronopost/database': resolve(__dirname, '../database/src/index.ts'),
      '@chronopost/shared': resolve(__dirname, '../shared/src/index.ts')
    }
  }
};

export default defineConfig(config);