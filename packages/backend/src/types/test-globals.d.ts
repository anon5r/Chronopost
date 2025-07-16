/**
 * Global Test Types for Chronopost
 * Jest環境で使用されるグローバル型定義
 */

import type { testUtils, createWebCryptoMocks, createErrorCapture } from '../test-utils/index';

declare global {
  /**
   * グローバルテストユーティリティ
   * jest.setup.js で設定される
   */
  var testUtils: typeof testUtils;

  /**
   * エラーキャプチャユーティリティ
   * テスト中のエラーをキャプチャして検証
   */
  var errorCapture: ReturnType<typeof createErrorCapture>;

  /**
   * WebCrypto APIのモック
   * DPoP実装のテストで使用
   */
  var mockWebCrypto: ReturnType<typeof createWebCryptoMocks>;

  /**
   * Node.js グローバル環境のテスト拡張
   */
  namespace NodeJS {
    interface Global {
      testUtils: typeof testUtils;
      errorCapture: ReturnType<typeof createErrorCapture>;
      mockWebCrypto: ReturnType<typeof createWebCryptoMocks>;
    }
  }

  /**
   * Jest環境でのWebCrypto拡張
   */
  interface Crypto {
    subtle: ReturnType<typeof createWebCryptoMocks>;
  }

  /**
   * テスト用のFetch Mock
   */
  var fetch: jest.MockedFunction<typeof globalThis.fetch>;
}

export {};
