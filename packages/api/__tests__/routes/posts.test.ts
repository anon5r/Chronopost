import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono/tiny';
import posts from '../../src/routes/posts';
import { db } from '@chronopost/database';
import type { HonoEnv, ApiResponse, ScheduledPost } from '../../src/types';

// データベース操作のモック
const mockDb = {
  scheduledPost: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
};

vi.mock('@chronopost/database', () => ({
  db: mockDb
}));

// 認証ミドルウェアのモック
vi.mock('../../src/middleware/auth', () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set('userId', 'test-user-id');
    return next();
  }),
  validatePostOwnershipMiddleware: vi.fn((c, next) => next()),
  validateScheduledPostMiddleware: vi.fn((c, next) => next())
}));

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
    vi.resetAllMocks();
    app = new Hono<HonoEnv>();
    app.route('/', posts);
  });

  describe('POST /', () => {
    const validPost = {
      content: {
        text: 'テスト投稿です',
        images: ['base64image'],
        embed: 'https://example.com'
      },
      scheduledAt: new Date().toISOString()
    };

    it('正常に投稿を作成できる', async () => {
      const mockCreatedPost = {
        id: '1',
        userId: 'test-user-id',
        ...validPost,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.scheduledPost.create.mockResolvedValueOnce(mockCreatedPost);

      const req = new Request('http://localhost/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validPost)
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as ApiResponse<ScheduledPost>;
      expect(json.success).toBe(true);
      if (json.success) {
        expect(json.data).toEqual(mockCreatedPost);
      }
    });

    it('バリデーションエラーを返す', async () => {
      const invalidPost = {
        content: {
          text: '', // 空の文字列は無効
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
      const json = await res.json() as ApiResponse<never>;
      expect(json.success).toBe(false);
    });
  });

  describe('GET /', () => {
    it('投稿一覧を取得できる', async () => {
      const mockPosts = [
        {
          id: '1',
          userId: 'test-user-id',
          content: { text: '投稿1' },
          scheduledAt: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          userId: 'test-user-id',
          content: { text: '投稿2' },
          scheduledAt: new Date(),
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockDb.scheduledPost.findMany.mockResolvedValueOnce(mockPosts);

      const req = new Request('http://localhost/', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as ApiResponse<ScheduledPost[]>;
      expect(json.success).toBe(true);
      if (json.success) {
        expect(json.data).toEqual(mockPosts);
      }
    });
  });

  describe('GET /:id', () => {
    it('投稿の詳細を取得できる', async () => {
      const mockPost = {
        id: '1',
        userId: 'test-user-id',
        content: { text: 'テスト投稿' },
        scheduledAt: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.scheduledPost.findUnique.mockResolvedValueOnce(mockPost);

      const req = new Request('http://localhost/1', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as ApiResponse<ScheduledPost>;
      expect(json.success).toBe(true);
      if (json.success) {
        expect(json.data).toEqual(mockPost);
      }
    });

    it('存在しない投稿の場合404を返す', async () => {
      mockDb.scheduledPost.findUnique.mockResolvedValueOnce(null);

      const req = new Request('http://localhost/999', {
        method: 'GET'
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(404);
      const json = await res.json() as ApiResponse<never>;
      expect(json.success).toBe(false);
    });
  });

  describe('PATCH /:id', () => {
    it('投稿を更新できる', async () => {
      const updates = {
        content: {
          text: '更新されたテスト投稿'
        }
      };

      const mockUpdatedPost = {
        id: '1',
        userId: 'test-user-id',
        content: updates.content,
        scheduledAt: new Date(),
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockDb.scheduledPost.update.mockResolvedValueOnce(mockUpdatedPost);

      const req = new Request('http://localhost/1', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as ApiResponse<ScheduledPost>;
      expect(json.success).toBe(true);
      if (json.success) {
        expect(json.data).toEqual(mockUpdatedPost);
      }
    });
  });

  describe('DELETE /:id', () => {
    it('投稿を削除できる', async () => {
      mockDb.scheduledPost.delete.mockResolvedValueOnce(undefined);

      const req = new Request('http://localhost/1', {
        method: 'DELETE'
      });

      const res = await app.fetch(req, mockEnv);

      expect(res.status).toBe(200);
      const json = await res.json() as ApiResponse<void>;
      expect(json.success).toBe(true);
      expect(mockDb.scheduledPost.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });
  });
});
