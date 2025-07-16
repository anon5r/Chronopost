# GitHub Actions CI/CD ドキュメント

Chronopostプロジェクトでは、コード品質の維持とデプロイの自動化のため、複数のGitHub Actionsワークフローを運用しています。

## 概要

### ワークフロー構成

| ワークフロー | ファイル | 目的 | トリガー |
|------------|---------|------|---------|
| **CI/CD Pipeline** | `ci.yml` | テスト・ビルド・デプロイ | プッシュ・PR |
| **AI Code Review** | `ai-review.yml` | AI によるコードレビュー | PR作成・更新 |
| **Docker Build** | `docker.yml` | コンテナイメージ作成 | プッシュ・タグ |

### 段階的機能対応

各ワークフローは、プロジェクトの開発フェーズに合わせて段階的に機能を有効化できるよう設計されています：

- **Phase 1 (MVP)**: 基本的なCI/CD・OAuth認証
- **Phase 2**: スレッド投稿機能
- **Phase 3**: メディア処理・リッチコンテンツ
- **Phase 4**: 課金・分析・高度な機能

## CI/CD Pipeline (`ci.yml`)

### 実行フロー

```mermaid
graph TD
    A[Push/PR] --> B[Lint & Type Check]
    A --> C[Security Audit]
    A --> D[Tests]
    B --> E[Build]
    C --> E
    D --> E
    E --> F[Migration Check]
    F --> G{Branch?}
    G -->|develop| H[Deploy Staging]
    G -->|main| I[Deploy Production]
    H --> J[E2E Tests]
    I --> K[Health Check]
```

### ジョブ詳細

#### 1. Lint & Format Check
```yaml
# コード品質チェック
- TypeScript型チェック (`pnpm run type-check`)
- ESLint検証 (`pnpm run lint`)
- Prettier整形確認 (`pnpm run format:check`)
```

**必要な package.json スクリプト:**
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint packages/*/src --ext .ts,.tsx",
    "format:check": "prettier --check packages/*/src"
  }
}
```

#### 2. Security Audit
```yaml
# セキュリティチェック
- pnpm audit (脆弱性スキャン)
- CodeQL Analysis (静的解析)
- 依存関係の脆弱性検出
```

**重要:** OAuth/DPoP実装のセキュリティが特に重視されます。

#### 3. Tests
```yaml
# テスト実行
- PostgreSQL 15 + Redis 7 環境
- 単体・統合テスト実行
- カバレッジ測定 (80%以上必須)
- テスト結果のCodecov送信
```

**データベース設定:**
```bash
DATABASE_URL=postgresql://test_user:test_password@localhost:5432/bluesky_scheduler_test
REDIS_URL=redis://localhost:6379
```

#### 4. Build
```yaml
# ビルドプロセス
1. Shared package → Backend → Frontend順でビルド
2. 成果物のアーティファクト保存
3. ビルドサイズの確認
```

#### 5. Migration Check
```yaml
# データベース整合性確認
- Prismaスキーマ検証
- マイグレーション実行テスト
- スキーマ整合性確認
```

#### 6. Deploy Staging (`develop` ブランチ)
```yaml
# ステージング環境デプロイ
- Railway (Backend)
- Vercel (Frontend)
- E2Eテスト実行
- Discord通知
```

#### 7. Deploy Production (`main` ブランチ)
```yaml
# 本番環境デプロイ
- Railway (Backend)
- Vercel (Frontend) 
- ヘルスチェック実行
- Discord通知
```

### 必要な環境変数

#### Repository Secrets

**デプロイ関連:**
```bash
# Railway (Backend hosting)
RAILWAY_TOKEN_STAGING
RAILWAY_TOKEN_PRODUCTION
RAILWAY_PROJECT_ID_STAGING
RAILWAY_PROJECT_ID_PRODUCTION

# Vercel (Frontend hosting)
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID_STAGING
VERCEL_PROJECT_ID_PRODUCTION

# 通知
DISCORD_WEBHOOK
```

**Phase 3以降 (メディア機能):**
```bash
# ストレージ (S3互換)
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_BUCKET
```

**Phase 4以降 (課金機能):**
```bash
# Stripe
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

# メール送信
EMAIL_SERVICE_KEY
```

## AI Code Review (`ai-review.yml`)

### レビュー構成

複数のAIサービスによる包括的なコードレビューを実施：

| AI サービス | モデル | 特徴 | API Key |
|------------|--------|------|---------|
| **OpenAI** | GPT-4o / GPT-4o-mini | 一般的なコード品質 | `OPENAI_API_KEY` |
| **Anthropic** | Claude | セキュリティ・ベストプラクティス | `ANTHROPIC_API_KEY` |
| **Google** | Gemini 1.5 Pro | パフォーマンス・最適化 | `GEMINI_API_KEY` |

### レビュー観点

#### 重点チェック項目
```yaml
1. セキュリティ脆弱性
   - OAuth/DPoP実装の正確性
   - トークン・秘密情報の適切な管理
   - 入力サニタイゼーション

2. TypeScript型安全性
   - 型注釈の完全性
   - any型の使用回避
   - エラーハンドリング

3. パフォーマンス問題
   - データベースクエリ最適化
   - メモリリーク防止
   - 非同期処理の適切な実装

4. コーディング規約準拠
   - CLAUDE.mdガイドライン準拠
   - 一貫したコードスタイル
   - 適切なアーキテクチャ
```

#### 無視される項目
```yaml
- Prettierで修正可能な軽微なフォーマット問題
- 単純なリネーム・リファクタリング
- テストファイルの軽微な問題
```

### 特別なレビュー

#### OAuth専用レビュー
OAuth/DPoP関連ファイルに変更がある場合、追加の専門レビューを実行：

```bash
# セキュリティチェック
- フロントエンドでのclient_secret漏洩検出
- ES256アルゴリズム使用確認
- トークン暗号化の確認
- Client Metadataの構造検証
```

#### セキュリティレビュー
```bash
# 包括的セキュリティスキャン
- ESLint セキュリティルール
- Semgrep静的解析
- 秘密情報スキャン (TruffleHog)
- SARIF形式でのレポート生成
```

#### パフォーマンスレビュー
```bash
# パフォーマンス問題検出
- バンドルサイズ分析
- N+1クエリ検出
- メモリリーク パターン検出
- 非効率なデータベースクエリ検出
```

### API Key設定方法

各AIサービスのAPI Keyは任意設定です。設定されていないサービスはスキップされます：

```bash
# GitHub Repository Settings > Secrets and variables > Actions

# OpenAI (GPT-4)
OPENAI_API_KEY=sk-...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google (Gemini)
GEMINI_API_KEY=...
```

### レビュー結果

#### サマリー例
```markdown
## 🤖 AI Review Summary

**Reviews Completed:** 5/6
**✅ Passed:** 4
**❌ Failed:** 1
**⏭️ Skipped:** 1

### Review Results:
- OpenAI Review: ✅ success
- Claude Review: ✅ success
- Gemini Review: ❌ failure
- Security Review: ✅ success
- OAuth Review: ✅ success
- Performance Review: ⏭️ skipped

⚠️ Please address the failing reviews before merging.
```

## Docker Build (`docker.yml`)

### イメージ構成

#### 対象イメージ
```yaml
Backend Image:
  - Registry: ghcr.io/[owner]/chronopost/backend
  - Base: Node.js 22 Alpine
  - Platforms: linux/amd64, linux/arm64

Frontend Image:
  - Registry: ghcr.io/[owner]/chronopost/frontend  
  - Base: Nginx Alpine
  - Platforms: linux/amd64, linux/arm64
```

#### タグ戦略
```yaml
Branch-based tags:
  - main → latest, production
  - develop → develop
  - feature/* → feature-*

Version tags (when tagged):
  - v1.2.3 → 1.2.3, 1.2, 1
  
Commit-based tags:
  - sha-{7文字のコミットハッシュ}
```

### ビルドプロセス

#### 1. Multi-architecture Build
```yaml
# Docker Buildx使用
- linux/amd64 (Intel/AMD)
- linux/arm64 (Apple Silicon/ARM)
- キャッシュ最適化 (GitHub Actions Cache)
```

#### 2. セキュリティスキャン
```yaml
# Trivy脆弱性スキャン
- イメージレイヤー解析
- 依存関係脆弱性検出
- SARIF形式での結果出力
- GitHub Security タブでの表示
```

#### 3. イメージ管理
```yaml
# 自動クリーンアップ
- 30日以上古いイメージの削除
- 開発用ブランチイメージの定期削除
- ストレージ使用量の最適化
```

### Dockerfile構成

#### Backend Dockerfile 例
```dockerfile
# Multi-stage build
FROM node:22-alpine AS base
RUN npm install -g pnpm@10.13

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm run build

FROM base AS runtime
WORKDIR /app
COPY --from=build /app/packages/backend/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 使用方法

#### イメージ取得
```bash
# 最新版 (main branch)
docker pull ghcr.io/[owner]/chronopost/backend:latest

# 特定バージョン
docker pull ghcr.io/[owner]/chronopost/backend:1.2.3

# 開発版 (develop branch)
docker pull ghcr.io/[owner]/chronopost/backend:develop
```

#### ローカル実行
```bash
# Backend
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e CLIENT_ID="..." \
  ghcr.io/[owner]/chronopost/backend:latest

# Frontend
docker run -p 80:80 \
  ghcr.io/[owner]/chronopost/frontend:latest
```

## 設定手順

### 1. Repository準備

#### GitHub Repository設定
```bash
# 1. Repositoryの作成・クローン
git clone https://github.com/[owner]/chronopost.git
cd chronopost

# 2. ブランチ保護設定 (GitHub Web UI)
- main ブランチ: Require PR, Require status checks
- develop ブランチ: Require PR
```

#### 必要なSecrets設定
```bash
# GitHub Repository > Settings > Secrets and variables > Actions

# 1. デプロイ関連 (必須)
RAILWAY_TOKEN_STAGING
RAILWAY_TOKEN_PRODUCTION
VERCEL_TOKEN
DISCORD_WEBHOOK

# 2. AIレビュー関連 (任意)
OPENAI_API_KEY
ANTHROPIC_API_KEY  
GEMINI_API_KEY

# 3. Phase 3以降 (任意)
STORAGE_ACCESS_KEY
STRIPE_SECRET_KEY
```

### 2. 環境セットアップ

#### Railway設定 (Backend)
```bash
# 1. Railway CLIインストール
npm install -g @railway/cli

# 2. プロジェクト作成
railway login
railway init

# 3. 環境変数設定
railway variables set DATABASE_URL="postgresql://..."
railway variables set CLIENT_ID="https://..."
```

#### Vercel設定 (Frontend)
```bash
# 1. Vercel CLIインストール
npm install -g vercel

# 2. プロジェクト作成
vercel login
vercel init

# 3. 環境設定
vercel env add VITE_API_URL
```

### 3. ワークフロー有効化

#### 必要なpackage.jsonスクリプト
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "eslint packages/*/src --ext .ts,.tsx",
    "lint:security": "eslint packages/*/src --config eslint-security.config.js",
    "format:check": "prettier --check packages/*/src",
    "test:coverage": "jest --coverage",
    "test:e2e:staging": "playwright test --config=playwright.staging.config.ts",
    "build": "pnpm run -r build",
    "db:migrate": "prisma migrate deploy",
    "db:migrate:test": "DATABASE_URL=$DATABASE_URL_TEST prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:validate": "prisma validate"
  }
}
```

#### 初回実行確認
```bash
# 1. ローカルでのテスト実行
pnpm install
pnpm run type-check
pnpm run lint
pnpm run test
pnpm run build

# 2. 最初のコミット・プッシュ
git add .
git commit -m "feat: setup CI/CD workflows"
git push origin develop

# 3. GitHub ActionsのWorkflow確認
# Repository > Actions タブで実行状況を確認
```

## トラブルシューティング

### よくある問題

#### 1. CI/CD実行エラー

**ビルドエラー:**
```bash
# TypeScript型エラー
Error: Type errors found
→ pnpm run type-check でローカル確認

# 依存関係エラー  
Error: Package not found
→ pnpm install --frozen-lockfile で依存関係修正

# テストエラー
Error: Tests failed
→ DATABASE_URL_TESTの設定確認
```

**デプロイエラー:**
```bash
# Railway デプロイ失敗
Error: Deployment failed
→ RAILWAY_TOKEN の有効性確認
→ 環境変数設定の確認

# Vercel デプロイ失敗
Error: Build failed
→ VERCEL_TOKEN の確認
→ フロントエンド環境変数の確認
```

#### 2. AIレビューエラー

**API Key関連:**
```bash
# OpenAI API制限
Error: Rate limit exceeded
→ API Keyのクォータ確認
→ プランのアップグレード検討

# 認証エラー
Error: Invalid API key
→ Secretsの設定確認
→ API Keyの有効性確認
```

**レビュー品質:**
```bash
# 誤った指摘
→ system_messageの調整
→ path_filtersの設定見直し

# レビュースキップ
→ changed-filesの設定確認
→ ファイルフィルターの調整
```

#### 3. Docker関連エラー

**ビルドエラー:**
```bash
# Multi-arch ビルド失敗
Error: exec format error
→ QEMUの設定確認
→ Buildxの再設定

# キャッシュエラー
Error: Cache mount failed
→ GitHub Actions Cacheの確認
→ キャッシュの手動クリア
```

**セキュリティスキャン:**
```bash
# Trivy スキャン失敗
Error: Scanner error
→ イメージの存在確認
→ 権限設定の確認

# 脆弱性検出
Warning: High severity vulnerabilities
→ 依存関係の更新
→ ベースイメージの更新
```

### ログ確認方法

#### GitHub Actions ログ
```bash
# 1. Repository > Actions
# 2. 失敗したWorkflowを選択
# 3. 失敗したJobを選択
# 4. Stepごとのログを確認

# 重要なログセクション:
- Setup steps (環境構築)
- Install dependencies (依存関係)
- Run tests (テスト実行)
- Build (ビルドプロセス)
- Deploy (デプロイ実行)
```

#### デバッグモード有効化
```yaml
# workflow に追加
- name: Enable debug logging
  run: echo "ACTIONS_STEP_DEBUG=true" >> $GITHUB_ENV
```

### パフォーマンス最適化

#### ビルド時間短縮
```yaml
# 1. キャッシュ活用
uses: actions/setup-node@v4
with:
  cache: 'pnpm'

# 2. 並列実行
strategy:
  matrix:
    node-version: [22]
  max-parallel: 4

# 3. 条件付き実行
if: contains(github.event.pull_request.changed_files, 'packages/backend')
```

#### コスト最適化
```yaml
# 1. 不要なJob skip
if: github.event.pull_request.draft == false

# 2. ブランチ限定実行
if: github.ref == 'refs/heads/main'

# 3. ファイル変更検出
uses: tj-actions/changed-files@v41
```

## Phase別拡張計画

### Phase 1 (MVP): 基本CI/CD
- [x] 基本的なLint・Test・Build
- [x] OAuth/DPoP セキュリティチェック
- [x] ステージング・本番デプロイ
- [x] AIレビュー基盤

### Phase 2: スレッド投稿対応
- [ ] スレッド関連テストの追加
- [ ] 依存関係テストの強化
- [ ] データ整合性チェック

### Phase 3: メディア機能対応
- [ ] 画像処理テスト
- [ ] ストレージ接続テスト
- [ ] メディアファイルセキュリティスキャン
- [ ] パフォーマンステスト (大容量ファイル)

### Phase 4: 高度な機能
- [ ] 決済関連セキュリティテスト
- [ ] 負荷テスト
- [ ] GDPR準拠チェック
- [ ] 本格的なE2Eテストスイート

---

このドキュメントは開発の進行に合わせて更新されます。質問や改善提案があれば、GitHub Issuesで報告してください。
