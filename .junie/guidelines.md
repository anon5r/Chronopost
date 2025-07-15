# 開発ガイドライン

このドキュメントは、Chronopost プロジェクトでClaude（AI）が開発作業を行う際の詳細なルールとガイドラインを定義します。

## プロジェクト理解

### システム概要
- **目的**: BlueskyのOAuth認証を使用した予約投稿システム
- **アーキテクチャ**: Monorepo構成（backend/frontend/shared）
- **認証方式**: AT Protocol OAuth with DPoP（Demonstrating Proof of Possession）
- **実行方式**: cronベースのスケジューラーによる定期実行

### 技術的制約
- Node.js 22, TypeScript, pnpm 10.13 必須
- PostgreSQL + Prisma ORM
- Hono フレームワーク（Express.js ではない）
- BlueskyのOAuth仕様に厳密準拠（DPoP必須）
- フリーホスティング環境での動作要件

## 開発ルール

### コーディング規約

#### TypeScript
```typescript
// ✅ 良い例
interface CreatePostRequest {
  content: string;
  scheduledAt: Date;
  userId: string;
}

// ❌ 悪い例
interface createPostRequest {
  content: any;
  scheduledAt: string;
  user_id: string;
}
```

**必須ルール:**
- 全ての型定義に明示的な型注釈
- `any` 型の使用禁止（`unknown` を使用）
- PascalCase: インターface, Type, Class
- camelCase: 変数, 関数, プロパティ
- SCREAMING_SNAKE_CASE: 定数

#### ファイル命名規約
```
// ✅ 良い例
oauth-client.ts          # kebab-case
DPoPManager.ts          # PascalCase（クラス名と一致）
api-types.ts            # kebab-case
constants.ts            # camelCase

// ❌ 悪い例
oauthClient.ts
dpop_manager.ts
APITypes.ts
```

#### インポート規約
```typescript
// ✅ 順序: 外部ライブラリ → 内部ライブラリ → 型定義
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { prisma } from '../lib/prisma';
import { OAuthClient } from '../services/oauth/oauth-client';

import type { CreatePostRequest } from '../types/api';
```

### ディレクトリ構造ルール

#### バックエンド
- `src/routes/`: APIエンドポイント定義のみ（ビジネスロジックは services へ）
- `src/services/`: ビジネスロジック実装
- `src/lib/`: 汎用ユーティリティ・設定
- `src/types/`: プロジェクト固有の型定義
- `src/middlewares/`: Hono ミドルウェア

#### 機能別ディレクトリ
```
src/services/oauth/          # OAuth関連機能
├── oauth-client.ts          # メインOAuthクライアント
├── dpop-manager.ts          # DPoP暗号化処理
├── token-manager.ts         # トークン管理
└── session-manager.ts       # セッション管理

src/services/bluesky/        # Bluesky API関連
├── api-client.ts            # API通信
├── post-service.ts          # 投稿処理
└── rate-limiter.ts          # レート制限

src/services/scheduler/      # スケジューラー関連
├── post-scheduler.ts        # メインスケジューラー
├── cron-manager.ts          # cron管理
└── job-processor.ts         # ジョブ処理
```

### OAuth実装ルール

#### DPoP実装必須要件
```typescript
// ✅ 必須: ES256アルゴリズム使用
const keyPair = await generateKeyPair('ES256', {
  extractable: false  // セキュリティ要件
});

// ✅ 必須: DPoP Proof構造
const dPopProof = {
  jti: crypto.randomUUID(),
  htm: method,
  htu: url,
  iat: Math.floor(Date.now() / 1000),
  nonce: serverNonce  // サーバーから取得
};
```

#### Client Metadata要件
```json
{
  "client_id": "https://example.com/.well-known/bluesky-oauth.json",
  "application_type": "web",
  "dpop_bound_access_tokens": true,
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "scope": "atproto transition:generic",
  "token_endpoint_auth_method": "none",
  "require_pkce": true
}
```

#### セキュリティ要件
- 全てのトークンはデータベースで暗号化保存
- DPoPキーペアはセッション期間中のみ保持
- リフレッシュトークンは使用時にローテーション
- 同時リフレッシュリクエストの防止機構実装

### データベース設計ルール

#### Prismaスキーマ
```prisma
// ✅ 必須フィールド
model OAuthSession {
  id               String   @id @default(cuid())
  userId           String
  accessToken      String   @db.Text  // 暗号化保存
  refreshToken     String   @db.Text  // 暗号化保存
  dPopPrivateKey   String   @db.Text  // 暗号化保存
  dPopPublicKey    String   @db.Text
  expiresAt        DateTime
  refreshExpiresAt DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  isActive         Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("oauth_sessions")
}
```

#### インデックス設計
```prisma
// ✅ 必須インデックス
@@index([scheduledAt, status])  // スケジューラー用
@@index([userId, isActive])     // セッション検索用
@@index([expiresAt])           // 期限切れ検索用
```

### API設計ルール

#### Honoルーター構造
```typescript
// ✅ 標準構造
const app = new Hono();

// ミドルウェア順序固定
app.use('*', cors(corsConfig));
app.use('*', logger());
app.use('/api/*', authMiddleware);
app.use('*', errorHandler);

// ルート定義
app.route('/api/auth', authRouter);
app.route('/api/posts', postsRouter);
```

#### エラーハンドリング
```typescript
// ✅ 統一エラー形式
interface APIError {
  error: string;
  message: string;
  code: number;
  details?: any;
}

// ✅ エラーレスポンス例
return c.json({
  error: 'OAUTH_ERROR',
  message: 'Failed to refresh access token',
  code: 401,
  details: { reason: 'refresh_token_expired' }
}, 401);
```

#### バリデーション
```typescript
// ✅ Zod使用（推奨）
import { z } from 'zod';

const CreatePostSchema = z.object({
  content: z.string().min(1).max(300),
  scheduledAt: z.string().datetime(),
});
```

### スケジューラー実装ルール

#### Cron実装
```typescript
// ✅ 必須: 排他制御実装
class PostScheduler {
  private isRunning = false;
  
  async processPendingPosts() {
    if (this.isRunning) {
      console.log('Scheduler already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    try {
      // 処理実装
    } finally {
      this.isRunning = false;
    }
  }
}
```

#### エラーハンドリング
```typescript
// ✅ 投稿失敗時の必須処理
const MAX_RETRIES = 3;

async executePost(post: ScheduledPost) {
  try {
    await this.postToBluesky(post);
    await this.updatePostStatus(post.id, 'COMPLETED');
  } catch (error) {
    if (post.retryCount < MAX_RETRIES) {
      await this.scheduleRetry(post);
    } else {
      await this.updatePostStatus(post.id, 'FAILED', error.message);
    }
  }
}
```

### テスト要件

#### 必須テストケース
```typescript
describe('OAuth Client', () => {
  test('DPoP proof generation', async () => {
    // DPoP証明の正しい生成
  });
  
  test('Token refresh with rotation', async () => {
    // リフレッシュトークンローテーション
  });
  
  test('Concurrent refresh prevention', async () => {
    // 同時リフレッシュ防止
  });
});

describe('Post Scheduler', () => {
  test('Pending posts execution', async () => {
    // 予約投稿実行
  });
  
  test('Failed post retry mechanism', async () => {
    // リトライ機構
  });
  
  test('OAuth token refresh during execution', async () => {
    // 実行中のトークンリフレッシュ
  });
});
```

### セキュリティチェックリスト

#### 実装必須項目
- [ ] 全トークンの暗号化保存
- [ ] DPoPキーペアの適切な管理
- [ ] PKCE実装（S256のみ）
- [ ] CSRF保護
- [ ] SQLインジェクション対策
- [ ] XSS対策
- [ ] レート制限実装
- [ ] セキュリティヘッダー設定
- [ ] 入力サニタイゼーション
- [ ] 秘密情報のログ出力防止

### パフォーマンス要件

#### データベース
```typescript
// ✅ バッチ処理の実装
const posts = await prisma.scheduledPost.findMany({
  take: 100,  // バッチサイズ制限
  where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
  include: { user: { include: { sessions: true } } }
});
```

#### APIリクエスト
```typescript
// ✅ レート制限対応
const RATE_LIMIT = {
  bluesky: 300,  // 5分間
  oauth: 60      // 1分間
};
```

### ログ要件

#### ログレベル
```typescript
// ✅ 必須ログ項目
logger.info('OAuth session created', { userId, sessionId });
logger.warn('Token refresh failed', { userId, error: error.message });
logger.error('Post execution failed', { postId, userId, error });
logger.debug('DPoP proof generated', { method, url });
```

#### 機密情報の除外
```typescript
// ❌ 機密情報をログに出力禁止
logger.info('Token received', { token: accessToken });  // NG

// ✅ 機密情報の除外
logger.info('Token received', { tokenLength: accessToken.length });  // OK
```

### デプロイ・運用ルール

#### 環境変数検証
```typescript
// ✅ 起動時検証必須
const requiredEnvVars = [
  'DATABASE_URL',
  'CLIENT_ID', 
  'CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'FRONTEND_URL'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Required environment variable ${varName} is not set`);
  }
});
```

#### ヘルスチェック
```typescript
// ✅ 必須エンドポイント
app.get('/health', async (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    database: await checkDatabaseHealth(),
    scheduler: getSchedulerStatus()
  });
});
```

### CI/CD要件

#### 必須チェック項目
- TypeScript型チェック
- ESLint + Prettier
- テスト実行（カバレッジ80%以上）
- セキュリティ脆弱性スキャン
- Docker イメージビルド
- データベースマイグレーション確認

#### デプロイ前確認
- [ ] 環境変数の設定確認
- [ ] Client Metadata の公開確認
- [ ] データベースマイグレーション実行
- [ ] OAuth フローの動作確認
- [ ] スケジューラーの動作確認

### 開発フェーズ別タスク

#### フェーズ1: 基盤構築
- プロジェクト構造作成
- 開発環境セットアップ
- データベーススキーマ作成
- 基本的なCRUD操作

#### フェーズ2: OAuth実装
- DPoP実装
- OAuth認証フロー
- トークン管理機能
- セッション管理

#### フェーズ3-9: [README.mdのタスク分解に従う]

### トラブルシューティング

#### OAuth関連エラー
```
DPoP nonce mismatch → サーバーからの最新nonceを取得
Bad token scope → Client Metadataの権限設定確認
Invalid client → Client IDとMetadata URLの一致確認
```

#### スケジューラー関連エラー
```
Concurrent execution → 排他制御の実装確認
Token expired → リフレッシュ機構の動作確認
Rate limit exceeded → レート制限の調整
```

このガイドラインに従って、一貫性のある高品質なコードを作成してください。不明な点があれば、このドキュメントを参照して判断してください。