import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono/tiny';
import type { SuccessResponse, ErrorResponse } from '../../src/types/vitest';
import type { AtpAgentLoginOpts } from '@atproto/api';
import type { UserSession, HonoEnv } from '../../src/types';
import type { Mock } from 'vitest';
import { 
  createMockDb, 
  createTestEnv, 
  createBskyAgentMock, 
  setupJwtMock,
  createTestRequest,
  parseJson
} from '../setup-test';

// 共通モックデータの作成
const mockDb = createMockDb();
const { MockBskyAgent, mockAgentInstance } = createBskyAgentMock();

// モジュールのモック定義（インポート前に行う必要がある）
vi.mock('@chronopost/database', () => ({
  db: mockDb
}));

vi.mock('@atproto/api', () => ({
  BskyAgent: MockBskyAgent
}));

// JWT関連のモック
setupJwtMock();

// モジュールのインポート
import auth from '../../src/routes/auth';
import { db } from '@chronopost/database';
import { BskyAgent } from '@atproto/api';

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
    vi.clearAllMocks();
    app = new Hono<HonoEnv>();
    app.route('/', auth);
  });

  describe('POST /login', () => {
    const validCredentials = {
      identifier: 'test@example.com',
      appPassword: 'valid-password'
    };

    it('正常なログインでJWTトークンを返す', async () => {
      const mockUserSession: UserSession = {
        id: '1',
        userId: 'did:plc:test',
        identifier: validCredentials.identifier,
        appPassword: validCredentials.appPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const userSessionUpsert = mockDb.userSession!.upsert as Mock;
      userSessionUpsert.mockResolvedValueOnce(mockUserSession);

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validCredentials)
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();
      expect(json.data.token).toBeDefined();
      expect(json.data.user).toEqual({
        did: 'did:plc:test',
        handle: 'test.bsky.social'
      });

      const bskyAgent = vi.mocked(BskyAgent).mock.instances[0];
      expect(bskyAgent.login).toHaveBeenCalledWith({
        identifier: validCredentials.identifier,
        password: validCredentials.appPassword
      });

      expect(userSessionUpsert).toHaveBeenCalledWith({
        where: { userId: 'did:plc:test' },
        create: {
          id: expect.any(String),
          userId: 'did:plc:test',
          identifier: validCredentials.identifier,
          appPassword: validCredentials.appPassword,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        },
        update: {
          identifier: validCredentials.identifier,
          appPassword: validCredentials.appPassword,
          updatedAt: expect.any(Date)
        }
      });
    });

    it('不正な認証情報で401エラーを返す', async () => {
      const bskyAgent = vi.mocked(BskyAgent).mock.instances[0];
      vi.mocked(bskyAgent.login).mockRejectedValueOnce(new Error('Invalid credentials'));

      const req = new Request('http://localhost/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validCredentials)
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(401);

      const json = await res.json() as ErrorResponse;
      expect(json).toBeErrorResponse();
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

      const json = await res.json() as ErrorResponse;
      expect(json).toBeErrorResponse();
    });
  });
});
