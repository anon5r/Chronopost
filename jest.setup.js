// Chronopost - Jest Setup
/* eslint-env node, jest */
/* global console, process, global, beforeEach, afterEach, jest */

import { jest as jestGlobal } from '@jest/globals';

// Global test configuration
global.console = {
  ...console,
  // Override console methods to reduce noise in tests
  log: jestGlobal.fn(),
  debug: jestGlobal.fn(),
  info: jestGlobal.fn(),
  warn: console.warn, // Keep warnings
  error: console.error, // Keep errors
};

// Mock環境変数
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/chronopost_test';
process.env.CLIENT_ID = 'https://test.example.com/.well-known/bluesky-oauth.json';
process.env.CLIENT_SECRET = 'test-client-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-character';
process.env.FRONTEND_URL = 'http://localhost:3000';

// Global test timeout
jestGlobal.setTimeout(30000);

// OAuth/DPoP テスト用のモック
global.crypto = {
  ...global.crypto,
  randomUUID: jestGlobal.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
  subtle: {
    generateKey: jestGlobal.fn(),
    exportKey: jestGlobal.fn(),
    sign: jestGlobal.fn(),
    verify: jestGlobal.fn(),
  },
};

// Date モックのヘルパー
global.mockDate = (date) => {
  const mockDate = new Date(date);
  jestGlobal.spyOn(global, 'Date').mockImplementation(() => mockDate);
  Date.now = jestGlobal.fn(() => mockDate.getTime());
  return mockDate;
};

// Date モックのリセット
global.resetDateMock = () => {
  jestGlobal.spyOn(global, 'Date').mockRestore();
  Date.now = jestGlobal.fn(() => new Date().getTime());
};

// テスト用のユーティリティ関数
global.testUtils = {
  // OAuth テスト用のモックデータ
  mockOAuthCode: 'test-oauth-code-12345',
  mockAccessToken: 'test-access-token-67890',
  mockRefreshToken: 'test-refresh-token-abcde',
  mockDID: 'did:plc:test123456789',
  mockHandle: 'testuser.bsky.social',
  
  // DPoP テスト用のモックキーペア
  mockDPoPKeyPair: {
    privateKey: 'mock-private-key-data',
    publicKey: 'mock-public-key-data',
  },
  
  // テスト用投稿データ
  mockPost: {
    content: 'テスト投稿です',
    scheduledAt: new Date('2025-01-01T12:00:00Z'),
  },
  
  // エラーテスト用のヘルパー
  createMockError: (message, code = 'TEST_ERROR') => {
    const error = new Error(message);
    error.code = code;
    return error;
  },
};

// エラーハンドリングのテスト用
global.suppressConsoleError = () => {
  const originalError = console.error;
  console.error = jestGlobal.fn();
  return () => {
    console.error = originalError;
  };
};

// 非同期テストのヘルパー
global.waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// テスト前後のクリーンアップ
beforeEach(() => {
  // ローカルストレージのクリア（ブラウザ環境テスト用）
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  
  // セッションストレージのクリア（ブラウザ環境テスト用）
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
  
  // Jestモックのクリア
  jestGlobal.clearAllMocks();
});

afterEach(() => {
  // 日付モックのリセット
  if (Date.now.mockRestore) {
    Date.now.mockRestore();
  }
  
  // その他のグローバルモックのリセット
  jestGlobal.restoreAllMocks();
});

// 長時間実行テスト用の設定
if (process.env.LONG_RUNNING_TESTS === 'true') {
  jestGlobal.setTimeout(60000); // 1分
}

// デバッグモード
if (process.env.DEBUG_TESTS === 'true') {
  // デバッグ時はconsole.logを有効化
  global.console.log = console.log;
  global.console.debug = console.debug;
  global.console.info = console.info;
}

console.log('Jest setup completed for Chronopost tests');
