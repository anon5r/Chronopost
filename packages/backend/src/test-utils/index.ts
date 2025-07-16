/**
 * Test Utilities for Chronopost Backend
 * 型安全で信頼性の高いテストサポート
 */

import type { ScheduledPostData, UserProfile, OAuthTokenResponse, DPoPProofClaims } from '@chronopost/shared';
import type { JWK } from 'jose';

/**
 * テストユーティリティの型定義
 */
export interface TestUtils {
  // OAuth関連モック
  mockOAuthCode: string;
  mockAccessToken: string;
  mockRefreshToken: string;
  mockClientId: string;
  mockDID: string;
  mockHandle: string;
  
  // DPoP関連モック
  mockDPoPKeyPair: {
    privateKey: JWK;
    publicKey: JWK;
  };
  mockDPoPProof: DPoPProofClaims;
  
  // ユーザーデータモック
  mockUser: UserProfile;
  mockPost: Omit<ScheduledPostData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  
  // ヘルパー関数
  createMockError: (message: string, code?: string) => Error & { code: string };
  createMockJWT: (payload: Record<string, unknown>, header?: Record<string, unknown>) => string;
  createMockUser: (overrides?: Partial<UserProfile>) => UserProfile;
  createMockPost: (overrides?: Partial<ScheduledPostData>) => Omit<ScheduledPostData, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;
  
  // 日付関連ヘルパー
  mockDate: (date: string | Date) => Date;
  resetDateMock: () => void;
  addDays: (date: Date, days: number) => Date;
  addHours: (date: Date, hours: number) => Date;
  
  // 非同期ヘルパー
  waitFor: (ms: number) => Promise<void>;
  waitForCondition: (condition: () => boolean, timeout?: number) => Promise<void>;
  
  // データベースヘルパー
  cleanDatabase: () => Promise<void>;
  seedTestData: () => Promise<void>;
  
  // HTTP関連ヘルパー
  createMockRequest: (method: string, url: string, headers?: Record<string, string>, body?: unknown) => Request;
  createMockContext: (request: Request) => any; // Honoのコンテキスト型
}

/**
 * テストユーティリティの実装
 */
export const testUtils: TestUtils = {
  // OAuth関連モック
  mockOAuthCode: 'test-oauth-code-12345',
  mockAccessToken: 'test-access-token-67890abcdef',
  mockRefreshToken: 'test-refresh-token-abcdefghij123',
  mockClientId: 'https://test.chronopost.example.com/.well-known/bluesky-oauth.json',
  mockDID: 'did:plc:test123456789abcdef',
  mockHandle: 'testuser.bsky.social',
  
  // DPoP関連モック
  mockDPoPKeyPair: {
    privateKey: {
      kty: 'EC',
      crv: 'P-256',
      x: 'test-x-coordinate-base64url',
      y: 'test-y-coordinate-base64url',
      d: 'test-private-key-base64url',
      use: 'sig',
      alg: 'ES256',
    },
    publicKey: {
      kty: 'EC',
      crv: 'P-256',
      x: 'test-x-coordinate-base64url',
      y: 'test-y-coordinate-base64url',
      use: 'sig',
      alg: 'ES256',
    },
  },
  
  mockDPoPProof: {
    jti: 'test-jwt-id-12345',
    htm: 'POST',
    htu: 'https://auth.bsky.social/oauth/token',
    iat: Math.floor(Date.now() / 1000),
    nonce: 'test-nonce-67890',
  },
  
  // ユーザーデータモック
  mockUser: {
    id: 'test-user-id-12345',
    did: 'did:plc:test123456789abcdef',
    handle: 'testuser.bsky.social',
    displayName: 'Test User',
    isActive: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-12-01T12:00:00Z'),
  },
  
  mockPost: {
    content: 'これはテスト投稿です。OAuth/DPoP認証のテスト用です。',
    scheduledAt: new Date('2025-01-01T12:00:00Z'),
    status: 'PENDING',
    retryCount: 0,
  },
  
  // エラー作成ヘルパー
  createMockError: (message: string, code = 'TEST_ERROR') => {
    const error = new Error(message) as Error & { code: string };
    error.code = code;
    return error;
  },
  
  // JWT作成ヘルパー
  createMockJWT: (payload: Record<string, unknown>, header?: Record<string, unknown>) => {
    const mockHeader = {
      alg: 'ES256',
      typ: 'JWT',
      ...header,
    };
    
    const encodedHeader = Buffer.from(JSON.stringify(mockHeader)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const mockSignature = 'mock-signature-' + Math.random().toString(36).substr(2, 9);
    
    return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
  },
  
  // ユーザー作成ヘルパー
  createMockUser: (overrides?: Partial<UserProfile>) => ({
    ...testUtils.mockUser,
    ...overrides,
    id: overrides?.id || `test-user-${Math.random().toString(36).substr(2, 9)}`,
  }),
  
  // 投稿作成ヘルパー
  createMockPost: (overrides?: Partial<ScheduledPostData>) => ({
    ...testUtils.mockPost,
    ...overrides,
  }),
  
  // 日付モックヘルパー
  mockDate: (date: string | Date) => {
    const mockDate = new Date(date);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    Date.now = jest.fn(() => mockDate.getTime());
    return mockDate;
  },
  
  resetDateMock: () => {
    jest.spyOn(global, 'Date').mockRestore();
    if (Date.now.mockRestore) {
      (Date.now as jest.MockedFunction<typeof Date.now>).mockRestore();
    }
  },
  
  addDays: (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  addHours: (date: Date, hours: number) => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  },
  
  // 非同期ヘルパー
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  waitForCondition: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error(`Condition not met within ${timeout}ms`);
      }
      await testUtils.waitFor(10);
    }
  },
  
  // データベースヘルパー（Prisma使用）
  cleanDatabase: async () => {
    // 実装は後で追加（Prismaクライアントが必要）
    // テーブルのクリア順序は外部キー制約を考慮
    throw new Error('Database helper not implemented yet');
  },
  
  seedTestData: async () => {
    // 実装は後で追加（Prismaクライアントが必要）
    throw new Error('Seed helper not implemented yet');
  },
  
  // HTTP関連ヘルパー
  createMockRequest: (method: string, url: string, headers?: Record<string, string>, body?: unknown) => {
    const mockHeaders = new Headers(headers);
    const mockRequest = new Request(url, {
      method,
      headers: mockHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
    return mockRequest;
  },
  
  createMockContext: (request: Request) => {
    // Honoのコンテキストモック
    return {
      req: request,
      json: jest.fn(),
      text: jest.fn(),
      header: jest.fn(),
      status: jest.fn(),
      redirect: jest.fn(),
    };
  },
};

/**
 * 高度なWebCrypto APIモック
 * DPoP実装のテストに必要な機能を提供
 */
export const createWebCryptoMocks = () => {
  const mockKeyPair = testUtils.mockDPoPKeyPair;
  
  const webCryptoMock = {
    generateKey: jest.fn().mockImplementation(async (algorithm, extractable, keyUsages) => {
      if (algorithm === 'ECDSA' || algorithm.name === 'ECDSA') {
        return {
          privateKey: mockKeyPair.privateKey,
          publicKey: mockKeyPair.publicKey,
        };
      }
      throw new Error('Unsupported algorithm in mock');
    }),
    
    exportKey: jest.fn().mockImplementation(async (format, key) => {
      if (format === 'jwk') {
        // 秘密鍵か公開鍵かを判定
        if (key.d) {
          return mockKeyPair.privateKey;
        }
        return mockKeyPair.publicKey;
      }
      throw new Error('Unsupported format in mock');
    }),
    
    sign: jest.fn().mockImplementation(async (algorithm, key, data) => {
      // テスト用の署名（実際の暗号化は行わない）
      const mockSignature = new Uint8Array([
        0x30, 0x45, 0x02, 0x20, // ASN.1 DER エンコードのモック
        ...Array(32).fill(0).map(() => Math.floor(Math.random() * 256)),
        0x02, 0x21, 0x00,
        ...Array(32).fill(0).map(() => Math.floor(Math.random() * 256)),
      ]);
      return mockSignature.buffer;
    }),
    
    verify: jest.fn().mockImplementation(async (algorithm, key, signature, data) => {
      // テスト用の検証（デフォルトでtrue）
      return true;
    }),
    
    digest: jest.fn().mockImplementation(async (algorithm, data) => {
      // SHA-256のモック
      const mockHash = new Uint8Array(32);
      crypto.getRandomValues(mockHash);
      return mockHash.buffer;
    }),
    
    // 他のメソッドも必要に応じて追加
    importKey: jest.fn(),
    deriveKey: jest.fn(),
    deriveBits: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    wrapKey: jest.fn(),
    unwrapKey: jest.fn(),
  };
  
  return webCryptoMock;
};

/**
 * エラーキャプチャユーティリティ
 * エラーハンドリングのテストを支援
 */
export const createErrorCapture = () => {
  const capturedErrors: Error[] = [];
  const originalConsoleError = console.error;
  
  const startCapture = () => {
    console.error = jest.fn((error) => {
      if (error instanceof Error) {
        capturedErrors.push(error);
      }
    });
  };
  
  const stopCapture = () => {
    console.error = originalConsoleError;
  };
  
  const getErrors = () => [...capturedErrors];
  
  const clearErrors = () => {
    capturedErrors.length = 0;
  };
  
  return {
    startCapture,
    stopCapture,
    getErrors,
    clearErrors,
    hasErrors: () => capturedErrors.length > 0,
    hasErrorWithMessage: (message: string) => 
      capturedErrors.some(error => error.message.includes(message)),
  };
};

/**
 * OAuth/DPoP テストシナリオ
 * よく使用されるテストパターンを提供
 */
export const oauthTestScenarios = {
  /**
   * 成功したOAuth認証フロー
   */
  successfulAuth: () => ({
    authorizationCode: testUtils.mockOAuthCode,
    tokenResponse: {
      access_token: testUtils.mockAccessToken,
      token_type: 'DPoP' as const,
      expires_in: 3600,
      refresh_token: testUtils.mockRefreshToken,
      scope: 'atproto transition:generic',
    } as OAuthTokenResponse,
    userProfile: testUtils.mockUser,
  }),
  
  /**
   * 失敗したOAuth認証フロー
   */
  failedAuth: (errorCode: string = 'invalid_grant') => ({
    error: errorCode,
    error_description: 'The provided authorization grant is invalid, expired, revoked, does not match the redirection URI used in the authorization request, or was issued to another client.',
  }),
  
  /**
   * 期限切れトークン
   */
  expiredToken: () => ({
    ...oauthTestScenarios.successfulAuth(),
    tokenResponse: {
      ...oauthTestScenarios.successfulAuth().tokenResponse,
      expires_in: -1, // 期限切れ
    },
  }),
  
  /**
   * DPoP検証失敗
   */
  invalidDPoP: () => ({
    error: 'invalid_dpop_proof',
    error_description: 'The DPoP proof is invalid or malformed',
  }),
};

export default testUtils;
