/**
 * Jest Setup for Chronopost
 * 型安全で信頼性の高いテスト環境の構築
 */

import { config } from 'dotenv';
import path from 'path';
import { testUtils, createWebCryptoMocks, createErrorCapture } from './packages/backend/src/test-utils/index';

// テスト用環境変数を.env.testから読み込み
config({ path: path.resolve(process.cwd(), 'packages/backend/.env.test') });

// グローバルテスト設定
jest.setTimeout(30000);

// 型安全なグローバル設定
declare global {
  var testUtils: typeof testUtils;
  var errorCapture: ReturnType<typeof createErrorCapture>;
  var mockWebCrypto: ReturnType<typeof createWebCryptoMocks>;
}

// Console のモック（ノイズ削減）
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: process.env.DEBUG_TESTS === 'true' ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn, // 警告は保持
  error: originalConsole.error, // エラーは保持
};

// WebCrypto API の高度なモック
global.mockWebCrypto = createWebCryptoMocks();
global.crypto = {
  ...global.crypto,
  randomUUID: jest.fn(() => `test-uuid-${Math.random().toString(36).substr(2, 9)}`),
  getRandomValues: jest.fn((array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }),
  subtle: global.mockWebCrypto,
};

// テストユーティリティをグローバルに設定
global.testUtils = testUtils;

// エラーキャプチャをグローバルに設定
global.errorCapture = createErrorCapture();

// Fetch API のモック（OAuth/API呼び出し用）
global.fetch = jest.fn();

// Node.js固有のグローバル設定
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Buffer のポリフィル（ブラウザ環境テスト用）
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// WebIDL URL API のモック
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
}

// テスト前後のセットアップ
beforeEach(() => {
  // Jest モックのクリア
  jest.clearAllMocks();
  
  // カスタムモックのリセット
  if (global.mockWebCrypto) {
    Object.values(global.mockWebCrypto).forEach(mock => {
      if (typeof mock === 'function' && 'mockClear' in mock) {
        mock.mockClear();
      }
    });
  }
  
  // エラーキャプチャのクリア
  if (global.errorCapture) {
    global.errorCapture.clearErrors();
  }
  
  // 日付モックのリセット
  if (global.testUtils.resetDateMock) {
    global.testUtils.resetDateMock();
  }
  
  // Fetch モックのリセット
  if (global.fetch && 'mockClear' in global.fetch) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
  }
  
  // ローカルストレージのクリア（ブラウザ環境テスト用）
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  
  // セッションストレージのクリア（ブラウザ環境テスト用）
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
});

afterEach(() => {
  // すべてのモックを復元
  jest.restoreAllMocks();
  
  // エラーキャプチャを停止
  if (global.errorCapture) {
    global.errorCapture.stopCapture();
  }
});

// 長時間実行テスト用の設定
if (process.env.LONG_RUNNING_TESTS === 'true') {
  jest.setTimeout(60000); // 1分
}

// アンハンドル拒否の警告を抑制（テスト用）
process.on('unhandledRejection', (reason, promise) => {
  if (process.env.DEBUG_TESTS === 'true') {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  }
});

// 環境変数のバリデーション
const requiredEnvVars = [
  'DATABASE_URL',
  'CLIENT_ID',
  'ENCRYPTION_KEY',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.warn(`Warning: Missing test environment variables: ${missingEnvVars.join(', ')}`);
  console.warn('Some tests may fail. Check packages/backend/.env.test');
}

// テスト環境の確認
if (process.env.NODE_ENV !== 'test') {
  console.warn('Warning: NODE_ENV is not set to "test". This may cause issues.');
}

// データベースURLがテスト用かチェック
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('test')) {
  console.error('ERROR: DATABASE_URL does not appear to be a test database!');
  console.error('Current DATABASE_URL:', process.env.DATABASE_URL);
  console.error('Test databases should contain "test" in the name for safety.');
  process.exit(1);
}

// テストの開始ログ
console.log('🧪 Jest test environment initialized for Chronopost');
console.log(`📦 Test database: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***@')}`);
console.log(`🔒 Security: ${process.env.ENCRYPTION_KEY ? 'Mock encryption key loaded' : 'No encryption key'}`);
console.log(`🌐 OAuth Client: ${process.env.CLIENT_ID}`);
console.log(`🐛 Debug mode: ${process.env.DEBUG_TESTS === 'true' ? 'ON' : 'OFF'}`);

// TypeScript型エラーの確認用（開発時のみ）
if (process.env.DEBUG_TESTS === 'true') {
  // TypeScriptコンパイラのチェック
  try {
    require('typescript');
    console.log('✅ TypeScript compiler is available');
  } catch {
    console.warn('⚠️ TypeScript compiler not found - some type checking may be skipped');
  }
}
