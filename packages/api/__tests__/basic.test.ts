import { describe, it, expect } from 'vitest';

// 最もシンプルなテスト
describe('基本的なテスト', () => {
  it('真値が真であること', () => {
    expect(true).toBe(true);
  });

  it('1 + 1 = 2 であること', () => {
    expect(1 + 1).toBe(2);
  });

  // カスタムマッチャーの簡単なテスト
  it('成功レスポンスの形式が正しいこと', () => {
    const successResponse = {
      success: true,
      data: { message: 'OK' }
    };
    expect(successResponse).toBeSuccessResponse();
  });

  it('エラーレスポンスの形式が正しいこと', () => {
    const errorResponse = {
      success: false,
      error: 'Error message'
    };
    expect(errorResponse).toBeErrorResponse();
  });
});
