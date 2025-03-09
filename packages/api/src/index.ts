import { Hono } from 'hono/tiny';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';
import { HTTPException } from 'hono/http-exception';
import auth from './routes/auth';
import posts from './routes/posts';
import type { HonoEnv, ApiResponse } from './types';

// APIアプリケーションの作成
const app = new Hono<HonoEnv>();

// ミドルウェアの設定
app.use('*', cors());
app.use('*', prettyJSON());

// ヘルスチェックエンドポイント
app.get('/', (c) => c.json({ status: 'ok' }));

// ルーターのマウント
app.route('/auth', auth);
app.route('/posts', posts);

// エラーハンドリング
app.onError((err: unknown, c) => {
  console.error(`[Error] ${err}`);

  if (err instanceof Response) {
    return err;
  }

  if (err instanceof HTTPException) {
    const response: ApiResponse<never> = {
      success: false,
      error: err.message,
    };
    return c.json(response, err.status);
  }

  const response: ApiResponse<never> = {
    success: false,
    error: err instanceof Error ? err.message : 'Internal Server Error',
  };

  return c.json(response, 500);
});

// 404ハンドリング
app.notFound((c) => {
  const response: ApiResponse<never> = {
    success: false,
    error: 'Not Found',
  };

  return c.json(response, 404);
});

export default app;

// 型定義のエクスポート（クライアント用）
export type {
  ScheduledPost,
  UserSession,
  ScheduledPostStatus,
  ApiResponse,
  LoginResponse,
  CreatePostRequest,
  UpdatePostRequest,
} from './types';
