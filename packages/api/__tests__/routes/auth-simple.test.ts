import { describe, it, expect } from 'vitest';
import { Hono } from 'hono/tiny';
import type { HonoEnv } from '../../src/types';

describe('Auth API Simple Test', () => {
  const app = new Hono<HonoEnv>();
  
  app.post('/login', async (c) => {
    console.log('Request received');
    return c.json({
      success: true,
      data: {
        token: 'test-token',
        user: {
          did: 'test-did',
          handle: 'test-handle'
        }
      }
    });
  });

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

  it('should return success response', async () => {
    console.log('Starting test');
    
    const req = new Request('http://localhost/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'test@example.com',
        appPassword: 'test-password'
      })
    });

    const res = await app.fetch(req, env);
    console.log('Response status:', res.status);
    
    const body = await res.text();
    console.log('Response body:', body);

    expect(res.status).toBe(200);
    
    const json = JSON.parse(body);
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.user).toBeDefined();
  });
});
