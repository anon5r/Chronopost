import { expect, afterEach, vi } from 'vitest';

// テスト後のクリーンアップ
afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

// グローバルのエラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// エラーメッセージの詳細表示設定
Error.stackTraceLimit = Infinity;

// テスト環境のグローバル設定
// node-fetch等のポリフィルを使用するためのコード
try {
  // グローバルWeb APIクラスが未定義の場合のみポリフィルを設定
  if (typeof globalThis.Request === 'undefined') {
    // @ts-ignore - インポートエラーを無視
    globalThis.Request = Request || class {};
  }
  
  if (typeof globalThis.Response === 'undefined') {
    // @ts-ignore - インポートエラーを無視
    globalThis.Response = Response || class {};
  }
  
  if (typeof globalThis.Headers === 'undefined') {
    // @ts-ignore - インポートエラーを無視
    globalThis.Headers = Headers || class {};
  }
  
  if (typeof globalThis.FormData === 'undefined') {
    // @ts-ignore - インポートエラーを無視
    globalThis.FormData = FormData || class {};
  }
} catch (error) {
  console.warn('Web API globals setup failed:', error);
}

// カスタムマッチャーの定義
expect.extend({
  toBeSuccessResponse(received: any) {
    const pass = received?.success === true && 
                 typeof received?.data !== 'undefined' &&
                 Object.keys(received).length === 2;  // success と data のみ
    if (pass) {
      return {
        pass: true,
        message: () => `期待された成功レスポンス: ${JSON.stringify(received, null, 2)}`
      };
    } else {
      return {
        pass: false,
        message: () => 
          `期待された成功レスポンスではありません:\n` +
          `受け取ったレスポンス: ${JSON.stringify(received, null, 2)}\n` +
          `期待される形式: { success: true, data: any }`
      };
    }
  },
  toBeErrorResponse(received: any) {
    const pass = received?.success === false && 
                 typeof received?.error === 'string' &&
                 Object.keys(received).length === 2;  // success と error のみ
    if (pass) {
      return {
        pass: true,
        message: () => `期待されたエラーレスポンス: ${JSON.stringify(received, null, 2)}`
      };
    } else {
      return {
        pass: false,
        message: () => 
          `期待されたエラーレスポンスではありません:\n` +
          `受け取ったレスポンス: ${JSON.stringify(received, null, 2)}\n` +
          `期待される形式: { success: false, error: string }`
      };
    }
  }
});
