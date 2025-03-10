import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import type { UserConfig } from 'vitest/config';

const config: UserConfig = {
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['__tests__/**/*.test.ts'],
    reporters: ['default', 'verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'node_modules'],
      all: true,
      clean: true
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    isolate: false,  // これを変更
    sequence: {
      concurrent: false,
      shuffle: false
    },
    pool: 'forks',  // threadsからforksに変更
    poolOptions: {
      forks: {
        isolate: false
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
};

export default defineConfig(config);
