# 開発ガイドライン

このドキュメントは、Chronopost プロジェクトでClaude（AI）が開発作業を行う際の詳細なルールとガイドラインを定義します。

## プロジェクト理解

### システム概要
- **目的**: BlueskyのOAuth認証を使用した予約投稿システム
- **アーキテクチャ**: Monorepo構成（backend/frontend/shared）
- **認証方式**: AT Protocol OAuth with DPoP（Demonstrating Proof of Possession）
- **実行方式**: cronベースのスケジューラーによる定期実行
- **開発方針**: 段階的実装（Phase 1-4）による機能拡張

### 段階的実装戦略
- **Phase 1 (MVP)**: OAuth認証・基本テキスト投稿・スケジューラー
- **Phase 2**: スレッド投稿・親子関係・依存関係管理
- **Phase 3**: 画像・リンクカード・メンション・ハッシュタグ
- **Phase 4**: 動画・分析・有料プラン・高度な機能

### 技術的制約
- Node.js 22, TypeScript, pnpm 10.13 必須
- PostgreSQL + Prisma ORM
- Hono フレームワーク（Express.js ではない）
- BlueskyのOAuth仕様に厳密準拠（DPoP必須）
- フリーホスティング環境での動作要件
- 将来的な有料オプション対応

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

#### バックエンド（段階的拡張対応）
- `src/routes/`: APIエンドポイント定義のみ（ビジネスロジックは services へ）
- `src/services/`: ビジネスロジック実装（機能別サブディレクトリ）
- `src/lib/`: 汎用ユーティリティ・設定
- `src/types/`: プロジェクト固有の型定義
- `src/middlewares/`: Hono ミドルウェア

#### 機能別ディレクトリ（Phase対応）
```
src/services/oauth/          # OAuth関連機能 (Phase 1)
├── oauth-client.ts          # メインOAuthクライアント
├── dpop-manager.ts          # DPoP暗号化処理
├── token-manager.ts         # トークン管理
└── session-manager.ts       # セッション管理

src/services/bluesky/        # Bluesky API関連 (Phase 1)
├── api-client.ts            # API通信
├── post-service.ts          # 投稿処理
└── rate-limiter.ts          # レート制限

src/services/scheduler/      # スケジューラー関連 (Phase 1)
├── post-scheduler.ts        # メインスケジューラー
├── cron-manager.ts          # cron管理
└── job-processor.ts         # ジョブ処理

src/services/thread/         # スレッド投稿 (Phase 2)
├── thread-manager.ts        # スレッド管理
├── dependency-resolver.ts   # 依存関係解決
└── execution-order.ts       # 実行順序制御

src/services/media/          # メディア処理 (Phase 3)
├── upload-handler.ts        # アップロード処理
├── image-processor.ts       # 画像最適化
├── video-processor.ts       # 動画処理 (Phase 4)
└── storage-manager.ts       # ストレージ管理

src/services/content/        # コンテンツ解析 (Phase 3)
├── link-card-generator.ts   # OGP取得・リンクカード生成
├── entity-extractor.ts     # メンション・ハッシュタグ抽出
└── text-processor.ts       # テキスト処理

src/services/analytics/      # 分析機能 (Phase 4)
├── metrics-collector.ts    # メトリクス収集
├── usage-tracker.ts        # 使用量追跡
└── report-generator.ts     # レポート生成

src/services/billing/        # 課金管理 (Phase 4)
├── plan-manager.ts          # プラン管理
├── quota-checker.ts         # 制限チェック
└── payment-handler.ts       # 決済処理
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

#### Prismaスキーマ（段階的拡張）
```prisma
// Phase 1: 基本機能
model User {
  id          String   @id @default(cuid())
  did         String   @unique
  handle      String   @unique
  displayName String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  isActive    Boolean  @default(true)
  
  sessions    OAuthSession[]
  posts       ScheduledPost[]
  // Phase 4で追加
  mediaFiles  MediaFile[]
  plan        UserPlan?
  
  @@map("users")
}

// Phase 1: OAuth セッション
model OAuthSession {
  id               String   @id @default(cuid())
  userId           String
  accessToken      String   @db.Text  // 暗号化保存
  refreshToken     String   @db.Text  // 暗号化保存
  dPopPrivateKey   String   @db.Text  // 暗号化保存
  dPopPublicKey    String   @db.Text
  expiresAt        DateTime
  refreshExpiresAt DateTime
  isActive         Boolean  @default(true)
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("oauth_sessions")
}

// Phase 1-2: 投稿管理（段階的拡張）
model ScheduledPost {
  id          String     @id @default(cuid())
  userId      String
  content     String     @db.Text
  scheduledAt DateTime
  status      PostStatus @default(PENDING)
  
  // Phase 2: スレッド機能
  parentPostId     String?
  threadRootId     String?
  threadIndex      Int      @default(0)
  isThreadRoot     Boolean  @default(true)
  dependsOnPostId  String?
  canExecute       Boolean  @default(true)
  
  // Phase 3: リッチコンテンツ
  hasMedia      Boolean @default(false)
  hasLinkCard   Boolean @default(false)
  langs         String[]
  
  // 実行管理
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  executedAt  DateTime?
  errorMsg    String?
  retryCount  Int      @default(0)
  blueskyUri  String?
  blueskyRkey String?
  
  // リレーション
  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Phase 2: スレッド関係
  parent           ScheduledPost? @relation("PostThread", fields: [parentPostId], references: [id])
  children         ScheduledPost[] @relation("PostThread")
  threadRoot       ScheduledPost? @relation("ThreadRoot", fields: [threadRootId], references: [id])
  threadPosts      ScheduledPost[] @relation("ThreadRoot")
  dependsOn        ScheduledPost? @relation("PostDependency", fields: [dependsOnPostId], references: [id])
  dependentPosts   ScheduledPost[] @relation("PostDependency")
  
  // Phase 3: リッチコンテンツ関係
  media         PostMedia[]
  linkCard      LinkCard?
  entities      PostEntity[]
  
  // Phase 4: 高度な機能
  threadGate    ThreadGate?
  analytics     PostAnalytics?
  
  @@index([scheduledAt, status])
  @@index([userId, status])
  @@index([threadRootId, threadIndex])
  @@map("scheduled_posts")
}

// Phase 3: メディア管理
model MediaFile {
  id            String     @id @default(cuid())
  userId        String
  originalName  String
  storagePath   String
  mimeType      String
  fileSize      Int
  width         Int?
  height        Int?
  duration      Int?        // 動画用 (Phase 4)
  altText       String?
  isProcessed   Boolean    @default(false)
  blobRef       String?    // AT Protocol Blob参照
  blobSize      Int?
  
  user          User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  postMedia     PostMedia[]
  
  @@map("media_files")
}

// Phase 4: 課金・プラン管理
model UserPlan {
  id               String    @id @default(cuid())
  userId           String
  planType         PlanType  @default(FREE)
  mediaUploadQuota Int       @default(100)     // MB/月
  videoEnabled     Boolean   @default(false)
  maxPostsPerMonth Int       @default(1000)
  validUntil       DateTime?
  
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId])
  @@map("user_plans")
}

enum PlanType {
  FREE
  BASIC      // Phase 4
  PREMIUM    // Phase 4
}
```

#### インデックス設計（Phase別）
```prisma
// Phase 1: 基本インデックス
@@index([scheduledAt, status])  // スケジューラー用
@@index([userId, isActive])     // セッション検索用
@@index([expiresAt])           // 期限切れ検索用

// Phase 2: スレッド用インデックス
@@index([threadRootId, threadIndex])  // スレッド順序用
@@index([parentPostId])              // 親子検索用
@@index([dependsOnPostId])           // 依存関係用

// Phase 3: メディア用インデックス
@@index([userId, createdAt])    // ユーザーメディア検索
@@index([isProcessed])          // 処理状況検索
@@index([postId, mediaIndex])   // 投稿メディア順序

// Phase 4: 分析・課金用インデックス
@@index([userId, planType])     // プラン検索
@@index([createdAt])           // 時系列分析
@@index([status, executedAt])  // 実行統計
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

#### Cron実装（段階的拡張）
```typescript
// ✅ Phase 1: 基本スケジューラー
class PostScheduler {
  private isRunning = false;
  
  async processPendingPosts() {
    if (this.isRunning) {
      console.log('Scheduler already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    try {
      // Phase 1: 単体投稿処理
      await this.processSinglePosts();
      
      // Phase 2: スレッド投稿処理
      await this.processThreadPosts();
    } finally {
      this.isRunning = false;
    }
  }
  
  // Phase 2: スレッド投稿実行
  private async processThreadPosts() {
    const threadRoots = await this.getExecutableThreadRoots();
    
    for (const root of threadRoots) {
      await this.executeThreadSequentially(root);
    }
  }
  
  // Phase 2: 順次実行制御
  private async executeThreadSequentially(root: ScheduledPost) {
    const thread = await this.getThreadPosts(root.id);
    const sortedPosts = thread.sort((a, b) => a.threadIndex - b.threadIndex);
    
    for (const post of sortedPosts) {
      const success = await this.executePost(post);
      if (!success) {
        // 親投稿失敗時は後続をキャンセル
        await this.cancelDependentPosts(post.id);
        break;
      }
    }
  }
}
```

#### エラーハンドリング（Phase別対応）
```typescript
// ✅ Phase 1: 基本エラー処理
const MAX_RETRIES = 3;

async executePost(post: ScheduledPost) {
  try {
    // Phase 3: メディア処理確認
    if (post.hasMedia) {
      await this.validateMediaFiles(post.id);
    }
    
    await this.postToBluesky(post);
    await this.updatePostStatus(post.id, 'COMPLETED');
    
    // Phase 4: 分析データ収集
    await this.collectAnalytics(post);
    
  } catch (error) {
    await this.handlePostError(post, error);
  }
}

// Phase 2: スレッド特有のエラー処理
private async handleThreadError(post: ScheduledPost, error: Error) {
  if (post.isThreadRoot) {
    // ルート投稿失敗時は全体キャンセル
    await this.cancelEntireThread(post.threadRootId || post.id);
  } else {
    // 中間投稿失敗時は後続のみキャンセル
    await this.cancelDependentPosts(post.id);
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

#### 実装必須項目（Phase別）

**Phase 1: 基盤セキュリティ**
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

**Phase 2: スレッド投稿セキュリティ**
- [ ] スレッド実行権限確認
- [ ] 親子関係の整合性検証
- [ ] 依存関係ループ検出防止
- [ ] スレッド深度制限

**Phase 3: メディアセキュリティ**
- [ ] ファイル形式検証
- [ ] ウイルススキャン
- [ ] メタデータ除去（EXIF等）
- [ ] ファイルサイズ制限
- [ ] アップロード頻度制限
- [ ] 画像処理時のメモリ制限

**Phase 4: 高度なセキュリティ**
- [ ] 決済情報の適切な処理
- [ ] プラン制限の強制
- [ ] 使用量監視・異常検知
- [ ] 動画処理時のリソース制限
- [ ] 個人情報保護（GDPR対応）

### パフォーマンス要件

#### データベース（Phase別最適化）
```typescript
// ✅ Phase 1: 基本バッチ処理
const posts = await prisma.scheduledPost.findMany({
  take: 100,  // バッチサイズ制限
  where: { status: 'PENDING', scheduledAt: { lte: new Date() } },
  include: { user: { include: { sessions: true } } }
});

// ✅ Phase 2: スレッド投稿最適化
const threadRoots = await prisma.scheduledPost.findMany({
  where: {
    status: 'PENDING',
    isThreadRoot: true,
    scheduledAt: { lte: new Date() }
  },
  include: {
    threadPosts: {
      orderBy: { threadIndex: 'asc' }
    }
  }
});

// ✅ Phase 3: メディア処理最適化
const mediaFiles = await prisma.mediaFile.findMany({
  where: { isProcessed: false },
  include: { postMedia: { include: { post: true } } }
});

// ✅ Phase 4: 分析データ最適化
const analytics = await prisma.postAnalytics.groupBy({
  by: ['userId'],
  _sum: { likes: true, reposts: true },
  where: { lastUpdated: { gte: startDate } }
});
```

#### APIリクエスト（Phase別制限）
```typescript
// ✅ Phase 1: 基本レート制限
const RATE_LIMIT = {
  bluesky: 300,      // 5分間
  oauth: 60          // 1分間
};

// ✅ Phase 3: メディア処理制限
const MEDIA_LIMITS = {
  uploadSize: 50 * 1024 * 1024,    // 50MB
  dailyUploads: 100,               // 日次制限
  concurrentProcessing: 5          // 同時処理数
};

// ✅ Phase 4: プラン別制限
const PLAN_LIMITS = {
  FREE: {
    postsPerMonth: 1000,
    mediaQuotaMB: 100,
    videoEnabled: false
  },
  BASIC: {
    postsPerMonth: 5000,
    mediaQuotaMB: 1000,
    videoEnabled: false
  },
  PREMIUM: {
    postsPerMonth: -1,  // 無制限
    mediaQuotaMB: 10000,
    videoEnabled: true
  }
};
```

#### メモリ・リソース管理
```typescript
// ✅ Phase 3: 画像処理メモリ制限
const processImage = async (buffer: Buffer) => {
  const maxMemory = 256 * 1024 * 1024; // 256MB
  if (buffer.length > maxMemory) {
    throw new Error('Image too large for processing');
  }
  // 処理実装
};

// ✅ Phase 4: 動画処理リソース制限
const processVideo = async (filePath: string) => {
  const maxDuration = 300; // 5分
  const metadata = await getVideoMetadata(filePath);
  if (metadata.duration > maxDuration) {
    throw new Error('Video duration exceeds limit');
  }
  // 処理実装
};
```

### ログ要件

#### ログレベル（Phase別）
```typescript
// ✅ Phase 1: 基本ログ項目
logger.info('OAuth session created', { userId, sessionId });
logger.warn('Token refresh failed', { userId, error: error.message });
logger.error('Post execution failed', { postId, userId, error });
logger.debug('DPoP proof generated', { method, url });

// ✅ Phase 2: スレッド投稿ログ
logger.info('Thread execution started', { threadRootId, postCount });
logger.warn('Thread execution interrupted', { 
  threadRootId, 
  failedPostIndex, 
  cancelledCount 
});
logger.error('Thread dependency resolution failed', { 
  postId, 
  dependsOnPostId, 
  error 
});

// ✅ Phase 3: メディア処理ログ
logger.info('Media upload started', { 
  userId, 
  fileName, 
  fileSize, 
  mimeType 
});
logger.warn('Media processing slow', { 
  mediaId, 
  processingTime, 
  threshold 
});
logger.error('Media processing failed', { 
  mediaId, 
  error, 
  fileSize, 
  format 
});

// ✅ Phase 4: 分析・課金ログ
logger.info('Plan upgraded', { 
  userId, 
  fromPlan, 
  toPlan, 
  validUntil 
});
logger.warn('Quota approaching limit', { 
  userId, 
  quotaType, 
  used, 
  limit 
});
logger.error('Payment processing failed', { 
  userId, 
  planType, 
  amount, 
  error 
});
```

#### 機密情報の除外（強化）
```typescript
// ❌ 機密情報をログに出力禁止
logger.info('Token received', { token: accessToken });      // NG
logger.info('User password', { password: userPassword });   // NG
logger.info('Payment info', { cardNumber: cardNumber });    // NG

// ✅ 機密情報の除外・マスク
logger.info('Token received', { 
  tokenLength: accessToken.length,
  tokenPrefix: accessToken.substring(0, 8) + '...'
});
logger.info('User authenticated', { 
  userId, 
  handle: handle.replace(/^(.{3}).*@/, '$1***@')
});
logger.info('Payment processed', { 
  userId, 
  amount, 
  last4: cardNumber.slice(-4)
});

// ✅ セキュリティイベントログ
logger.security('Suspicious login attempt', { 
  ipAddress, 
  userAgent, 
  attemptCount, 
  blocked: true 
});
logger.security('Rate limit exceeded', { 
  userId, 
  endpoint, 
  requestCount, 
  timeWindow 
});
```

#### ログローテーション・保持期間
```typescript
// ✅ ログ設定
const LOG_CONFIG = {
  // Phase 1: 基本ログ
  application: {
    level: 'info',
    retention: '30d',
    maxSize: '100MB'
  },
  
  // Phase 1: セキュリティログ
  security: {
    level: 'warn',
    retention: '90d',
    maxSize: '50MB'
  },
  
  // Phase 3: メディア処理ログ
  media: {
    level: 'info',
    retention: '14d',
    maxSize: '200MB'
  },
  
  // Phase 4: 分析ログ
  analytics: {
    level: 'info',
    retention: '365d',
    maxSize: '1GB'
  }
};
```

### デプロイ・運用ルール

#### 環境変数検証（Phase別）
```typescript
// ✅ Phase 1: 基本環境変数
const requiredEnvVars = [
  'DATABASE_URL',
  'CLIENT_ID', 
  'CLIENT_SECRET',
  'ENCRYPTION_KEY',
  'FRONTEND_URL'
];

// ✅ Phase 3: メディア処理用
const mediaEnvVars = [
  'STORAGE_BUCKET',
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'MEDIA_CDN_URL'
];

// ✅ Phase 4: 課金・分析用
const premiumEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANALYTICS_API_KEY',
  'EMAIL_SERVICE_KEY'
];

// 段階的な検証
const validateEnvironment = (phase: 'basic' | 'media' | 'premium') => {
  let varsToCheck = requiredEnvVars;
  
  if (phase === 'media' || phase === 'premium') {
    varsToCheck = [...varsToCheck, ...mediaEnvVars];
  }
  
  if (phase === 'premium') {
    varsToCheck = [...varsToCheck, ...premiumEnvVars];
  }
  
  varsToCheck.forEach(varName => {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  });
};
```

#### ヘルスチェック（段階的拡張）
```typescript
// ✅ Phase 1: 基本ヘルスチェック
app.get('/health', async (c) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    phase: 'basic',
    checks: {
      database: await checkDatabaseHealth(),
      scheduler: getSchedulerStatus(),
      oauth: await checkOAuthHealth()
    }
  };
  
  // Phase 3: メディア処理確認
  if (process.env.ENABLE_MEDIA === 'true') {
    health.checks.storage = await checkStorageHealth();
    health.checks.mediaProcessing = getMediaProcessorStatus();
    health.phase = 'media';
  }
  
  // Phase 4: 課金・分析確認
  if (process.env.ENABLE_PREMIUM === 'true') {
    health.checks.billing = await checkBillingHealth();
    health.checks.analytics = await checkAnalyticsHealth();
    health.phase = 'premium';
  }
  
  const isHealthy = Object.values(health.checks).every(
    check => check.status === 'healthy'
  );
  
  return c.json(health, isHealthy ? 200 : 503);
});

// 詳細ヘルスチェック関数
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', responseTime: Date.now() };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

const checkStorageHealth = async () => {
  try {
    // ストレージ接続確認
    await storageClient.listBuckets();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};
```

### CI/CD要件

#### 必須チェック項目（Phase別）

**Phase 1: 基本パイプライン**
- TypeScript型チェック
- ESLint + Prettier
- 基本テスト実行（カバレッジ80%以上）
- OAuth関連のセキュリティスキャン
- Docker イメージビルド
- データベースマイグレーション確認

**Phase 2: スレッド機能**
- スレッド依存関係のテスト
- 並行実行テスト
- データ整合性テスト

**Phase 3: メディア機能**
- 画像処理パフォーマンステスト
- ファイルアップロードテスト
- ストレージ接続テスト
- セキュリティスキャン（ファイル関連）

**Phase 4: 高度な機能**
- 決済関連のセキュリティテスト
- パフォーマンス負荷テスト
- GDPR準拠チェック
- 課金ロジックのテスト

#### デプロイ前確認（段階的）
```typescript
// ✅ Phase 1: 基本確認
const basicChecks = [
  '環境変数の設定確認',
  'Client Metadata の公開確認', 
  'データベースマイグレーション実行',
  'OAuth フローの動作確認',
  'スケジューラーの動作確認'
];

// ✅ Phase 3: メディア機能確認  
const mediaChecks = [
  'ストレージバケットの設定確認',
  '画像処理ライブラリの動作確認',
  'CDN設定の確認',
  'ファイルアップロード制限の確認'
];

// ✅ Phase 4: 課金機能確認
const billingChecks = [
  '決済プロバイダー接続確認',
  'Webhook エンドポイント確認',
  'プラン制限の動作確認',
  'メール送信機能確認'
];
```

### 開発フェーズ別タスク（更新版）

#### フェーズ1: 基盤構築 (8-12週間)
**Week 1-2: プロジェクト初期設定**
- [ ] Monorepo構造作成
- [ ] TypeScript + Node.js 22環境構築
- [ ] PostgreSQL + Prisma基盤
- [ ] Hono基本セットアップ
- [ ] 基本的なCRUD操作

**Week 3-6: OAuth認証実装**
- [ ] Client Metadata作成・公開
- [ ] DPoP完全実装（ES256キーペア生成・管理）
- [ ] OAuth認証フロー（PKCE + DPoP）
- [ ] トークン暗号化保存・自動リフレッシュ
- [ ] セッション管理・有効性チェック

**Week 7-10: 予約投稿基本機能**
- [ ] 予約投稿CRUD API
- [ ] 投稿バリデーション・権限チェック
- [ ] スケジューラー実装（排他制御・エラーハンドリング）
- [ ] Bluesky API連携・レート制限対応
- [ ] リトライ機構・ログ機能

**Week 11-12: フロントエンド基盤**
- [ ] 認証フロー画面
- [ ] ダッシュボード・投稿管理画面
- [ ] 基本的なUI/UX実装

#### フェーズ2: スレッド投稿対応 (2-3週間)
- [ ] スレッド投稿データモデル拡張
- [ ] 親子関係・依存関係管理
- [ ] 順次実行制御・エラー伝播
- [ ] スレッド作成UI

#### フェーズ3: リッチコンテンツ対応 (3-4週間)
- [ ] メディアファイル管理システム
- [ ] 画像アップロード・最適化
- [ ] OGPリンクカード自動生成
- [ ] メンション・ハッシュタグ解析
- [ ] リッチエディターUI

#### フェーズ4: 高度な機能 (4-6週間)
- [ ] 動画処理・エンコーディング
- [ ] ユーザープラン・課金システム
- [ ] 投稿分析・統計機能
- [ ] スレッドゲート・高度な設定

### 品質保証ガイドライン

#### 各フェーズ完了時の確認項目
**Phase 1完了基準:**
- OAuth認証が完全動作（DPoP含む）
- 基本的なテキスト投稿の予約・実行が安定動作
- エラーハンドリング・ログが適切
- セキュリティ要件を満たす

**Phase 2完了基準:**
- スレッド投稿の順次実行が正常動作
- 親投稿失敗時の子投稿キャンセルが動作
- 依存関係の整合性が保たれる

**Phase 3完了基準:**
- 画像アップロード・最適化が安定動作
- リンクカード生成が正常動作
- メンション・ハッシュタグが正しく解析される
- セキュリティ要件（ファイル関連）を満たす

**Phase 4完了基準:**
- 動画処理が安定動作（有料プラン）
- 課金システムが正常動作
- プラン制限が適切に機能
- 分析データが正確

### トラブルシューティング（段階別）

#### Phase 1: OAuth・基本機能
```
DPoP nonce mismatch → サーバーからの最新nonceを取得
Bad token scope → Client Metadataの権限設定確認  
Invalid client → Client IDとMetadata URLの一致確認
Token refresh failed → リフレッシュトークンの有効期限確認
Scheduler not executing → 排他制御・cron設定確認
```

#### Phase 2: スレッド機能
```
Thread execution stopped → 親投稿の実行状態確認
Dependency loop detected → 依存関係の循環参照確認
Thread order incorrect → threadIndex設定確認
```

#### Phase 3: メディア機能
```
Upload failed → ファイルサイズ・形式・権限確認
Image processing slow → メモリ・CPU使用量確認
Link card generation failed → OGP取得の確認
```

#### Phase 4: 高度な機能
```
Video processing failed → エンコーダー・リソース確認
Plan limit exceeded → 使用量・プラン設定確認
Payment failed → 決済プロバイダー設定確認
Analytics data missing → データ収集・集計処理確認
```

このガイドラインに従って、一貫性のある高品質なコードを作成してください。段階的に高品質なシステムを構築してください。各フェーズで適切な機能確認と品質保証を行い、次のフェーズに進むことで、安定したサービスを提供できます。
不明な点があれば、このドキュメントを参照して判断してください。