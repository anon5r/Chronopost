import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono/tiny';
import type { HonoEnv, ScheduledPost } from '../../src/types';
import { ScheduledPostStatus } from '../../src/types';
import type { SuccessResponse, ErrorResponse } from '../../src/types/vitest';
import type { Mock } from 'vitest';
import { 
  createMockDb, 
  createTestEnv, 
  createAuthMocks,
  createTestRequest,
  parseJson
} from '../setup-test';

// 共通モックデータの作成
const mockDb = createMockDb();
const authMocks = createAuthMocks();

// モジュールのモック定義（インポート前に行う必要がある）
vi.mock('@chronopost/database', () => ({
  db: mockDb
}));

vi.mock('../../src/middleware/auth', () => authMocks);

// モジュールのインポート
import posts from '../../src/routes/posts';
import { db } from '@chronopost/database';

describe('投稿ルート', () => {
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
    app.route('/', posts);
  });

  describe('POST /', () => {
    const createValidPost = (): ScheduledPost => ({
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
      updatedAt: new Date()
    });

    it('正常に投稿を作成できる', async () => {
      const validPost = createValidPost();
      const scheduledPostCreate = mockDb.scheduledPost!.create as Mock;
      scheduledPostCreate.mockResolvedValueOnce(validPost);

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: validPost.content,
          scheduledAt: validPost.scheduledAt.toISOString()
        })
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();
      expect(json.data).toEqual(validPost);

      expect(scheduledPostCreate).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          content: validPost.content,
          scheduledAt: expect.any(Date),
          status: ScheduledPostStatus.PENDING
        }
      });
    });

    it('バリデーションエラーを返す', async () => {
      const invalidPost = {
        content: {
          text: ''
        },
        scheduledAt: 'invalid-date'
      };

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidPost)
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(400);

      const json = await res.json() as ErrorResponse;
      expect(json).toBeErrorResponse();
    });
  });

  describe('GET /', () => {
    it('投稿一覧を取得できる', async () => {
      const mockPosts: ScheduledPost[] = [
        {
          id: '1',
          userId: 'test-user-id',
          content: { text: '投稿1' },
          scheduledAt: new Date(),
          status: ScheduledPostStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'test-user-id',
          content: { text: '投稿2' },
          scheduledAt: new Date(),
          status: ScheduledPostStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const scheduledPostFindMany = mockDb.scheduledPost!.findMany as Mock;
      scheduledPostFindMany.mockResolvedValueOnce(mockPosts);

      const req = new Request('http://localhost/', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();
      expect(json.data).toEqual(mockPosts);

      expect(scheduledPostFindMany).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' }
      });
    });
  });

  describe('GET /:id', () => {
    it('投稿の詳細を取得できる', async () => {
      const mockPost: ScheduledPost = {
        id: '1',
        userId: 'test-user-id',
        content: { text: 'テスト投稿' },
        scheduledAt: new Date(),
        status: ScheduledPostStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scheduledPostFindUnique = mockDb.scheduledPost!.findUnique as Mock;
      scheduledPostFindUnique.mockResolvedValueOnce(mockPost);

      const req = new Request('http://localhost/1', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();
      expect(json.data).toEqual(mockPost);

      expect(scheduledPostFindUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('存在しない投稿の場合404を返す', async () => {
      const scheduledPostFindUnique = mockDb.scheduledPost!.findUnique as Mock;
      scheduledPostFindUnique.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/999', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(404);

      const json = await res.json() as ErrorResponse;
      expect(json).toBeErrorResponse();

      expect(scheduledPostFindUnique).toHaveBeenCalledWith({
        where: { id: '999' }
      });
    });
  });

  describe('PATCH /:id', () => {
    it('投稿を更新できる', async () => {
      const updates = {
        content: {
          text: '更新されたテスト投稿'
        }
      };

      const mockUpdatedPost: ScheduledPost = {
        id: '1',
        userId: 'test-user-id',
        content: updates.content,
        scheduledAt: new Date(),
        status: ScheduledPostStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scheduledPostUpdate = mockDb.scheduledPost!.update as Mock;
      scheduledPostUpdate.mockResolvedValueOnce(mockUpdatedPost);

      const req = new Request('http://localhost/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();
      expect(json.data).toEqual(mockUpdatedPost);

      expect(scheduledPostUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          content: updates.content,
        }
      });
    });
  });

  describe('DELETE /:id', () => {
    it('投稿を削除できる', async () => {
      const mockDeletedPost: ScheduledPost = {
        id: '1',
        userId: 'test-user-id',
        content: { text: '削除される投稿' },
        scheduledAt: new Date(),
        status: ScheduledPostStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const scheduledPostDelete = mockDb.scheduledPost!.delete as Mock;
      scheduledPostDelete.mockResolvedValueOnce(mockDeletedPost);

      const req = new Request('http://localhost/1', {
        method: 'DELETE'
      });

      const res = await app.fetch(req, mockEnv);
      expect(res.status).toBe(200);

      const json = await res.json() as SuccessResponse;
      expect(json).toBeSuccessResponse();

      expect(scheduledPostDelete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });
  });
});
