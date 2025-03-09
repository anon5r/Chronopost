import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { Hono } from 'hono/tiny';
import { BskyAgent } from '@atproto/api';
import auth from '../../src/routes/auth';
import { db } from '@chronopost/database';
import type { HonoEnv } from '../../src/types';

// Bluesky APIのモック
vi.mock('@atproto/api', () => ({
  BskyAgent: vi.fn().mockImplementation(() => ({
    login: vi.fn()
  }))
}));

const mockBskyAgent = vi.mocked(BskyAgent);

const mockUserSessionUpsert = vi.fn();

// データベース操作のモック
vi.mock('@chronopost/database', () => ({
  db: {
    userSession: {
      upsert: mockUserSessionUpsert
    },
    getScheduledPostCount: vi.fn(),
    getScheduledPostsAt: vi.fn(),
    logFailure: vi.fn(),
    markAsPublished: vi.fn()
  }
}));

describe('認証ルート', () => {
  let app: Hono<HonoEnv>;
  const mockEnv: HonoEnv = {
    Bindings: {
      BLUESKY_SERVICE: 'https://bsky.social',
      JWT_SECRET: 'test-secret',
      DB: {} as D1Database
    },
    Variables: {
      userId: ''
    }
  };

  beforeEach(() => {
    vi.resetAllMocks();
    app = new Hono<HonoEnv>();
    app.route('/', auth);
  });

  describe('POST /login', () => {
    const validCredentials = {
      identifier: 'test@example.com',
      appPassword: 'valid-password'
    };

    it('正常なログインでJWTトークンを返す', async () => {
      // Bluesky APIのレスポンスをモック
      const mockLoginResponse = {
        data: {
          did: 'did:plc:test',
          handle: 'test.bsky.social'
        }
      };
      mockBskyAgent.mock.results[0].value.login.mockResolvedValueOnce(mockLoginResponse);

      // データベース操作のレスポンスをモック
      const mockSession = {
        id: '1',
        userId: mockLoginResponse.data.did,
        identifier: validCredentials.identifier,
        appPassword: validCredentials.appPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockUserSessionUpsert.mockResolvedValueOnce(mockSession);

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validCredentials)
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as {
        success: boolean;
        data: {
          token: string;
          user: {
            did: string;
            handle: string;
          };
        };
      };
      expect(json.success).toBe(true);
      expect(json.data.token).toBeDefined();
      expect(json.data.user).toEqual({
        did: mockLoginResponse.data.did,
        handle: mockLoginResponse.data.handle
      });
    });

    it('不正な認証情報で401エラーを返す', async () => {
      // Bluesky APIのエラーをモック
      mockBskyAgent.mock.results[0].value.login.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validCredentials)
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(401);
      const json = await res.json() as {
        success: boolean;
        error: string;
      };
      expect(json.success).toBe(false);
      expect(json.error).toBe('Invalid credentials');
    });

    it('バリデーションエラーを返す', async () => {
      const invalidCredentials = {
        identifier: '',
        appPassword: ''
      };

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidCredentials)
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(400);
      const json = await res.json() as {
        success: boolean;
        error: string;
      };
      expect(json.success).toBe(false);
    });
  });
});
