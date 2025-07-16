/**
 * Security Test Setup
 * セキュリティテスト専用の追加設定
 */

import { performance } from 'perf_hooks';

/**
 * セキュリティテスト用の特別な設定
 */

// セキュリティテスト用のタイムアウト延長
jest.setTimeout(60000);

// セキュリティテスト用のより厳密なWebCryptoモック
const originalMockWebCrypto = global.mockWebCrypto;

// セキュリティテスト専用のWebCryptoモック
global.mockWebCrypto = {
  ...originalMockWebCrypto,

  // より現実的なキー生成時間をシミュレート
  generateKey: jest.fn().mockImplementation(async (algorithm, extractable, keyUsages) => {
    // セキュリティテストでは実際のキー生成時間をシミュレート
    await new Promise(resolve => setTimeout(resolve, 100));
    return originalMockWebCrypto.generateKey(algorithm, extractable, keyUsages);
  }),

  // 署名検証でのタイミングアタック対策をテスト
  verify: jest.fn().mockImplementation(async (algorithm, key, signature, data) => {
    // 一定時間待機（タイミングアタック対策）
    const startTime = performance.now();
    const result = Math.random() > 0.1; // 90%で成功

    // 最低実行時間を保証（タイミングアタック対策）
    const minExecutionTime = 10; // 10ms
    const elapsedTime = performance.now() - startTime;
    if (elapsedTime < minExecutionTime) {
      await new Promise(resolve => setTimeout(resolve, minExecutionTime - elapsedTime));
    }

    return result;
  }),

  // 暗号学的に安全な乱数生成のシミュレート
  getRandomValues: jest.fn().mockImplementation(array => {
    // より現実的な乱数生成をシミュレート
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
};

// セキュリティテスト用のより厳密なエラーハンドリング
const originalErrorCapture = global.errorCapture;
global.errorCapture = {
  ...originalErrorCapture,

  // セキュリティ関連エラーの特別な処理
  hasSecurityError: () => {
    const errors = originalErrorCapture.getErrors();
    return errors.some(
      error =>
        error.message.includes('security') ||
        error.message.includes('authentication') ||
        error.message.includes('authorization') ||
        error.message.includes('token') ||
        error.message.includes('crypto')
    );
  },

  // OAuth関連エラーの検出
  hasOAuthError: () => {
    const errors = originalErrorCapture.getErrors();
    return errors.some(
      error =>
        error.message.includes('oauth') ||
        error.message.includes('dpop') ||
        error.message.includes('invalid_grant') ||
        error.message.includes('invalid_token')
    );
  },
};

// セキュリティテスト用の追加ユーティリティ
global.testUtils = {
  ...global.testUtils,

  /**
   * タイミングアタック検出のシミュレート
   */
  simulateTimingAttack: async (operation: () => Promise<any>, iterations = 100) => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await operation();
      } catch (error) {
        // エラーも測定に含める
      }
      const end = performance.now();
      times.push(end - start);
    }

    // 統計的分析
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    return {
      average: avg,
      standardDeviation: stdDev,
      coefficient: stdDev / avg, // 変動係数
      times,
      isConstantTime: stdDev / avg < 0.1, // 10%以下の変動なら定数時間とみなす
    };
  },

  /**
   * レート制限テストのヘルパー
   */
  simulateRateLimit: async (
    operation: () => Promise<any>,
    requestsPerSecond: number,
    duration: number
  ) => {
    const interval = 1000 / requestsPerSecond;
    const totalRequests = Math.floor(duration * requestsPerSecond);
    const results: Array<{ success: boolean; time: number; error?: string }> = [];

    for (let i = 0; i < totalRequests; i++) {
      const start = performance.now();

      try {
        await operation();
        results.push({ success: true, time: performance.now() - start });
      } catch (error) {
        results.push({
          success: false,
          time: performance.now() - start,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // 次のリクエストまで待機
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return {
      totalRequests,
      successfulRequests: results.filter(r => r.success).length,
      failedRequests: results.filter(r => !r.success).length,
      averageResponseTime: results.reduce((sum, r) => sum + r.time, 0) / results.length,
      results,
    };
  },

  /**
   * メモリリーク検出のヘルパー
   */
  detectMemoryLeak: async (operation: () => Promise<any>, iterations = 100) => {
    const memoryUsages: number[] = [];

    // ガベージコレクションを強制実行（Node.js環境）
    if (global.gc) {
      global.gc();
    }

    for (let i = 0; i < iterations; i++) {
      await operation();

      // メモリ使用量を記録
      const memUsage = process.memoryUsage();
      memoryUsages.push(memUsage.heapUsed);

      // 定期的にガベージコレクション
      if (i % 10 === 0 && global.gc) {
        global.gc();
      }
    }

    // メモリ使用量の傾向を分析
    const firstHalf = memoryUsages.slice(0, Math.floor(iterations / 2));
    const secondHalf = memoryUsages.slice(Math.floor(iterations / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return {
      memoryGrowth: secondAvg - firstAvg,
      memoryUsages,
      hasLeak: (secondAvg - firstAvg) / firstAvg > 0.1, // 10%以上の増加でリークとみなす
      firstHalfAverage: firstAvg,
      secondHalfAverage: secondAvg,
    };
  },

  /**
   * 暗号化強度テストのヘルパー
   */
  testCryptographicStrength: (data: Uint8Array) => {
    // 簡易的なランダム性テスト
    const frequencies = new Array(256).fill(0);
    for (const byte of data) {
      frequencies[byte]++;
    }

    // カイ二乗検定の簡易版
    const expected = data.length / 256;
    const chiSquare = frequencies.reduce((sum, observed) => {
      return sum + Math.pow(observed - expected, 2) / expected;
    }, 0);

    // 自由度255のカイ二乗分布の臨界値（簡易）
    const criticalValue = 293.25; // α=0.05

    return {
      chiSquare,
      isRandom: chiSquare < criticalValue,
      frequencies,
      entropy: frequencies.reduce((entropy, freq) => {
        if (freq === 0) return entropy;
        const p = freq / data.length;
        return entropy - p * Math.log2(p);
      }, 0),
    };
  },
};

// セキュリティテスト用の環境変数チェック
const securityEnvVars = ['ENCRYPTION_KEY', 'CLIENT_SECRET', 'DATABASE_URL'];

securityEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('test')) {
    console.warn(`⚠️ Security Warning: ${varName} doesn't appear to be a test value`);
  }
});

// セキュリティテスト開始のログ
console.log('🔒 Security test environment initialized');
console.log('🛡️ Enhanced crypto mocks enabled');
console.log('⏱️ Timing attack simulation available');
console.log('🔍 Memory leak detection enabled');

export {};
