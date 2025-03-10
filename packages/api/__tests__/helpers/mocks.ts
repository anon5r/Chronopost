import { vi } from 'vitest';
import type { Context, Next } from 'hono';
import type { HonoEnv, ScheduledPost } from '../../src/types';
import { ScheduledPostStatus } from '../../src/types';
import type { AtpAgentLoginOpts } from '@atproto/api';

// データベースモック
export const createDbMock = () => ({
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
  }
});

// Blueskyモック
export const createBlueskyMock = () => {
  const mockLogin = vi.fn().mockImplementation(async (opts: AtpAgentLoginOpts) => ({
    data: {
      did: 'did:plc:test',
      handle: 'test.bsky.social'
    }
  }));

  return {
    login: mockLogin,
    agent: vi.fn().mockImplementation(() => ({
      service: new URL('https://bsky.social'),
      login: mockLogin
    }))
  };
};

// 認証ミドルウェアモック
export const createAuthMiddlewareMock = () => ({
  authMiddleware: vi.fn(async (c: Context<HonoEnv>, next: Next) => {
    c.set('userId', 'test-user-id');
    return next();
  }),
  validatePostOwnershipMiddleware: vi.fn((c: Context<HonoEnv>, next: Next) => next()),
  validateScheduledPostMiddleware: vi.fn((c: Context<HonoEnv>, next: Next) => next())
});

// テストデータ生成
export const createTestPost = (overrides = {}): ScheduledPost => ({
  id: '1',
  userId: 'test-user-id',
  content: {
    text: 'テスト投稿です',
    images: ['base64image'],
    embed: 'https://example.com'
  },
  scheduledAt: new Date(),
  status: ScheduledPostStatus.PENDING,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

// テスト環境
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
