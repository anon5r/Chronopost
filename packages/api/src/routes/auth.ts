import { Hono } from 'hono/tiny';
import { sign } from 'hono/jwt';
import { BskyAgent } from '@atproto/api';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '@chronopost/database';
import type { DbOperations } from '../database';
import type { HonoEnv, ApiResponse, LoginResponse, LoginRequest } from '../types';

// ルーターの作成
const auth = new Hono<HonoEnv>();

// リクエストのバリデーションスキーマ
const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  appPassword: z.string().min(1, 'App password is required'),
}) satisfies z.ZodType<LoginRequest>;

// ログインハンドラー
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  try {
    const { identifier, appPassword } = c.req.valid('json');

    // Blueskyの認証確認
    const agent = new BskyAgent({ service: c.env.BLUESKY_SERVICE });
    const loginResult = await agent.login({
      identifier,
      password: appPassword,
    });

    // ユーザーセッションの保存/更新
    const session = await (db as DbOperations).userSession.upsert({
      where: { userId: loginResult.data.did },
      create: {
        userId: loginResult.data.did,
        identifier,
        appPassword,
      },
      update: {
        identifier,
        appPassword,
      },
    });

    // JWTの生成
    const token = await sign(
      {
        userId: session.userId,
      },
      c.env.JWT_SECRET
    );

    const response: ApiResponse<LoginResponse> = {
      success: true,
      data: {
        token,
        user: {
          did: loginResult.data.did,
          handle: loginResult.data.handle,
        },
      },
    };

    return c.json(response);
  } catch (error) {
    const response: ApiResponse<never> = {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid credentials',
    };

    return c.json(response, 401);
  }
});

export default auth;
