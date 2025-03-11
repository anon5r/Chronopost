import { afterEach, beforeEach, vi } from 'vitest';
import { Hono } from 'hono/tiny';
import type { Context, Next } from 'hono';
import type { HonoEnv } from '../src/types';
import type { Mock } from 'vitest';

// 共通のモックオブジェクト
export const createMockDb = () => ({
  userSession: {
    upsert: vi.fn(),
    findUnique: vi.fn()
  },
  scheduledPost: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  getScheduledPostCount: vi.fn(),
  getScheduledPostsAt: vi.fn(),
  logFailure: vi.fn(),
  markAsPublished: vi.fn()
});

// 認証ミドルウェアのモック
export const createAuthMocks = () => {
  const authMiddleware = vi.fn(async (c: Context<HonoEnv>, next: Next) => {
    c.set('userId', 'test-user-id');
    return next();
  });

  const validatePostOwnership = vi.fn(async (c: Context<HonoEnv>, next: Next) => {
    return next();
  });

  const validateScheduledPost = vi.fn(async (c: Context<HonoEnv>, next: Next) => {
    return next();
  });

  return {
    authMiddleware,
    validatePostOwnershipMiddleware: validatePostOwnership,
    validateScheduledPostMiddleware: validateScheduledPost
  };
};

// テスト環境を作成
export const createTestEnv = (): HonoEnv => ({
  Bindings: {
    BLUESKY_SERVICE: 'https://bsky.social',
    JWT_SECRET: 'test-secret',
    DB: {} as D1Database
  },
  Variables: {
    userId: ''
  }
});

// テスト用のBlueskyエージェントモック
export const createBskyAgentMock = () => {
  const mockLogin = vi.fn().mockResolvedValue({
    data: {
      did: 'did:plc:test',
      handle: 'test.bsky.social',
      accessJwt: 'test-access-jwt',
      refreshJwt: 'test-refresh-jwt'
    }
  });

  class MockBskyAgent {
    service: string;
    login: typeof mockLogin;

    constructor(opts: { service: string }) {
      this.service = opts.service;
      this.login = mockLogin;
    }
  }

  const mockedClass = vi.fn().mockImplementation((opts: { service: string }) => {
    return new MockBskyAgent(opts);
  });

  return {
    MockBskyAgent: mockedClass,
    mockLogin,
    mockAgentInstance: {
      service: 'https://bsky.social',
      login: mockLogin
    }
  };
};

// テスト共通セットアップ
beforeEach(() => {
  // consoleのログ出力をスパイ
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// テスト後のクリーンアップ
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

// JWT署名のモック
export const setupJwtMock = () => {
  vi.mock('hono/jwt', () => ({
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
    verify: vi.fn().mockResolvedValue({ userId: 'test-user-id' })
  }));
};

// テスト用リクエスト作成ヘルパー
export const createTestRequest = (
  path: string,
  method = 'GET',
  body?: any,
  headers: Record<string, string> = {}
) => {
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new Request(`http://localhost${path}`, requestInit);
};

// レスポンスの解析ヘルパー
export const parseJson = async (res: Response) => {
  try {
    return await res.json();
  } catch (e) {
    console.error('Response parsing failed:', e);
    return null;
  }
};
