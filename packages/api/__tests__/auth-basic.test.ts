import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono/tiny';
import type { HonoEnv } from '../src/types';

// シンプルなルーター
const app = new Hono<HonoEnv>();
app.post('/test', async (c) => {
  return c.json({
    success: true,
    data: { message: 'ok' }
  });
});

describe('基本的なルーティングテスト', () => {
  const env: HonoEnv = {
    Bindings: {
      BLUESKY_SERVICE: 'https://bsky.social',
      JWT_SECRET: 'test-secret',
      DB: {} as D1Database
    },
    Variables: {
      userId: ''
    }
  };

  it('正常なJSONレスポンスを返す', async () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });

    const res = await app.fetch(req, env);
    console.log('Response status:', res.status);
    
    const body = await res.text();
    console.log('Response body:', body);
    
    expect(res.status).toBe(200);
    
    const json = JSON.parse(body);
    expect(json.success).toBe(true);
    expect(json.data.message).toBe('ok');
  });
});
