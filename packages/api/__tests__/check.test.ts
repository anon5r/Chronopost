import { describe, it, expect } from 'vitest';
import type { SuccessResponse, ErrorResponse } from '../src/types/vitest';

describe('テスト環境チェック', () => {
  it('基本的なアサーションが機能すること', () => {
    expect(1 + 1).toBe(2);
    expect(true).toBe(true);
    expect({ name: 'test' }).toEqual({ name: 'test' });
  });

  it('カスタムマッチャーが機能すること', () => {
    const successResponse: SuccessResponse = {
      success: true,
      data: { message: 'OK' }
    };
    expect(successResponse).toBeSuccessResponse();

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Error occurred'
    };
    expect(errorResponse).toBeErrorResponse();
  });

  it('非同期処理が機能すること', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });

  console.log('このテストは実行されています');
});
