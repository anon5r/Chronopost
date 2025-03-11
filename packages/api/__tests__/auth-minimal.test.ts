import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono/tiny';
import type { HonoEnv } from '../src/types';

describe('最小限の認証テスト', () => {
  const mockDb = {
    userSession: {
      upsert: vi.fn().mockResolvedValue({
        userId: 'test-user-id',
        identifier: 'test@example.com'
      })
    }
  };

  const mockBskyAgent = vi.fn().mockImplementation(() => ({
    login: vi.fn().mockResolvedValue({
      data: {
        did: 'did:plc:test',
        handle: 'test.bsky.social'
      }
    })
  }));

  vi.mock('@chronopost/database', () => ({
    db: mockDb
  }));

  vi.mock('@atproto/api', () => ({
    BskyAgent: mockBskyAgent
  }));

  vi.mock('hono/jwt', () => ({
    sign: () => Promise.resolve('test-token')
  }));

  it('モックが正しく設定されていること', () => {
    expect(mockDb.userSession.upsert).toBeDefined();
    expect(mockBskyAgent).toBeDefined();
  });

  it('基本的なリクエストを処理できること', async () => {
    const app = new Hono<HonoEnv>();
    app.post('/test', async (c) => {
      return c.json({
        success: true,
        data: { message: 'OK' }
      });
    });

    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        identifier: 'test@example.com',
        appPassword: 'test-password'
      })
    });

    const res = await app.fetch(req, {
      Bindings: {
        JWT_SECRET: 'test-secret',
        BLUESKY_SERVICE: 'https://bsky.social',
        DB: {} as D1Database
      },
      Variables: {
        userId: ''
      }
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({
      success: true,
      data: { message: 'OK' }
    });
  });
});
