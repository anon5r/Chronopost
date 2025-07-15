# Chronopost

Blueskyで予約投稿を実現するウェブアプリケーション

## 概要

このプロジェクトは、Bluesky（AT Protocol）のOAuth認証を使用して、ユーザーが指定した日時に自動投稿を行う予約投稿システムです。

### 主な機能

#### Phase 1 (MVP) - 現在実装中
- 🔐 **BlueskyのOAuth認証** - DPoP対応の安全な認証
- 📝 **予約投稿管理** - テキスト投稿の作成・編集・削除・一覧表示
- ⏰ **自動投稿実行** - 指定時刻での自動投稿
- 📊 **投稿履歴管理** - 実行結果・エラーログの確認
- 🔄 **セッション管理** - 認証状態の自動更新

#### Phase 2 - スレッド投稿対応
- 🧵 **スレッド投稿** - 親子関係を持つ投稿チェーン
- 🔗 **リプライチェーン** - 実行順序保証付きスレッド投稿
- ⚡ **依存関係管理** - 親投稿の成功/失敗による子投稿制御

#### Phase 3 - リッチコンテンツ対応
- 🖼️ **画像投稿** - 画像アップロード・最適化・Alt Text対応
- 🔗 **リンクカード** - OGPプレビュー自動生成
- 🏷️ **ハッシュタグ・メンション** - 自動解析・リンク生成
- 📱 **リッチテキスト** - フォーマット対応

#### Phase 4 - 高度な機能 (有料オプション含む)
- 🎬 **動画投稿** - 動画アップロード・エンコード (有料)
- 🛡️ **スレッドゲート** - 返信制限設定
- 📈 **投稿分析** - いいね・リポスト・インプレッション分析
- 💎 **プレミアム機能** - 容量増加・高度な分析・優先サポート

## 技術スタック

### バックエンド
- **Runtime**: Node.js 22
- **Language**: TypeScript
- **Framework**: Hono
- **Database**: PostgreSQL + Prisma
- **OAuth**: AT Protocol OAuth with DPoP

### フロントエンド
- **Framework**: Vite + Vue.js 3 / React
- **Language**: TypeScript
- **Styling**: CSS Modules / Tailwind CSS

### 開発・運用
- **Package Manager**: pnpm 10.13
- **Container**: Docker
- **CI/CD**: GitHub Actions
- **Hosting**: Railway (Backend) + Vercel (Frontend)

## プロジェクト構成

```
bluesky-scheduler/
├── packages/
│   ├── backend/          # API サーバー・スケジューラー
│   ├── frontend/         # ウェブUI
│   └── shared/           # 共通型定義・ユーティリティ
├── docs/                 # ドキュメント
│   ├── datastructure.md  # データ構造設計
│   └── workflow.md       # 処理フロー設計
└── scripts/              # 運用スクリプト
```

## 段階的開発計画

### 実装フェーズ

| フェーズ | 期間 | 主要機能 | 状態 |
|---------|------|---------|------|
| Phase 1 | 8-12週間 | OAuth認証・基本投稿・スケジューラー | 🚧 開発中 |
| Phase 2 | 2-3週間 | スレッド投稿・親子関係 | 📋 計画中 |
| Phase 3 | 3-4週間 | 画像・リンクカード・メンション | 📋 計画中 |
| Phase 4 | 4-6週間 | 動画・分析・有料機能 | 🔮 将来計画 |

詳細な設計については、[データ構造設計](./docs/datastructure.md)と[ワークフロー設計](./docs/workflow.md)を参照してください。

## 開発環境セットアップ

### 前提条件

- Node.js 22+
- pnpm 10.13+
- Docker & Docker Compose
- PostgreSQL（ローカルまたはDocker）

### 初期セットアップ

```bash
# リポジトリクローン
git clone <repository-url>
cd bluesky-scheduler

# 依存関係インストール
pnpm install

# 環境変数設定
cp packages/backend/.env.example packages/backend/.env
# .env ファイルを編集

# データベース起動（Docker使用時）
docker-compose up -d postgres

# データベースマイグレーション
pnpm db:migrate

# 開発サーバー起動
pnpm dev
```

### 環境変数設定

`packages/backend/.env` に以下を設定：

```bash
# データベース
DATABASE_URL="postgresql://dev:dev123@localhost:5432/bluesky_scheduler"

# OAuth設定
CLIENT_ID="https://your-domain.com/.well-known/bluesky-oauth.json"
CLIENT_SECRET="your-oauth-client-secret"

# 暗号化キー
ENCRYPTION_KEY="your-32-character-encryption-key"

# フロントエンドURL
FRONTEND_URL="http://localhost:5173"
```

## 利用方法

### 1. OAuth認証設定

Client Metadata を公開：
- `packages/backend/public/.well-known/bluesky-oauth.json` を設定
- HTTPSでアクセス可能なURLに配置

### 2. アプリケーションの起動

```bash
# 開発環境（フロント・バック同時起動）
pnpm dev

# バックエンドのみ
pnpm dev:backend

# フロントエンドのみ
pnpm dev:frontend
```

### 3. 基本的な使用手順

1. **認証**: Blueskyアカウントでログイン
2. **投稿作成**: 投稿内容と予約日時を設定
3. **自動実行**: スケジューラーが指定時刻に投稿実行
4. **履歴確認**: 投稿結果・エラーログを確認

### API エンドポイント

#### Phase 1: 基本機能
```
認証
├── GET /api/auth/oauth/authorize     # OAuth認証開始
├── GET /api/auth/oauth/callback      # OAuth認証コールバック
└── POST /api/auth/logout             # ログアウト

投稿管理
├── GET /api/posts                    # 予約投稿一覧
├── POST /api/posts                   # 予約投稿作成
├── PUT /api/posts/:id               # 予約投稿更新
└── DELETE /api/posts/:id            # 予約投稿削除

セッション管理
├── GET /api/sessions                 # セッション一覧
└── DELETE /api/sessions/:id         # セッション無効化
```

#### Phase 2以降: 拡張機能
```
スレッド投稿
├── POST /api/posts/thread           # スレッド投稿作成
└── GET /api/posts/:id/thread        # スレッド構造取得

メディア管理 (Phase 3+)
├── POST /api/media/upload           # メディアアップロード
├── GET /api/media/:id               # メディア情報取得
└── DELETE /api/media/:id            # メディア削除

分析・統計 (Phase 4+)
├── GET /api/analytics/posts         # 投稿分析
└── GET /api/analytics/usage         # 使用量統計

プラン管理 (Phase 4+)
├── GET /api/plans                   # プラン一覧
└── POST /api/plans/upgrade          # プラン変更
```

## デプロイ

### 本番環境デプロイ

```bash
# ビルド
pnpm build

# データベースマイグレーション
pnpm db:migrate

# 本番起動
pnpm start
```

### Docker デプロイ

```bash
# イメージビルド
docker build -t bluesky-scheduler-backend packages/backend

# コンテナ実行
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e CLIENT_ID="..." \
  bluesky-scheduler-backend
```

## 運用

### スケジューラー

投稿スケジューラーは毎分実行され、以下を行います：
- 実行予定の投稿を検索
- OAuth トークンの更新
- Bluesky APIへの投稿実行
- 結果の記録

### ログ監視

```bash
# アプリケーションログ
tail -f logs/app.log

# 投稿実行ログ
tail -f logs/scheduler.log
```

## トラブルシューティング

### よくある問題

#### Phase 1: 基本機能
**OAuth認証エラー**
- Client Metadata が正しく配置されているか確認
- HTTPS でアクセス可能か確認
- DPoP 設定を確認

**投稿実行失敗**
- トークンの有効期限を確認
- Bluesky API の制限を確認
- ネットワーク接続を確認

**データベース接続エラー**
- `DATABASE_URL` を確認
- PostgreSQL が起動しているか確認

#### Phase 2以降: 拡張機能
**スレッド投稿エラー**
- 親投稿の実行状態を確認
- 依存関係の設定を確認
- スレッド順序の設定を確認

**メディアアップロードエラー (Phase 3+)**
- ファイルサイズ制限を確認
- サポート形式を確認
- ストレージ容量を確認

**プラン制限エラー (Phase 4+)**
- 現在のプランの制限を確認
- 使用量の確認
- プラン升级の検討

### ログの確認方法

```bash
# Phase 1: 基本ログ
tail -f logs/app.log
tail -f logs/scheduler.log

# Phase 3+: メディア処理ログ
tail -f logs/media.log

# Phase 4+: 分析ログ
tail -f logs/analytics.log
```

## ライセンス

MIT License

## 貢献

1. Issue を作成して議論
2. Feature ブランチを作成
3. 変更をコミット
4. Pull Request を作成

## サポート

- **Issue**: GitHub Issues で報告
- **Discussion**: GitHub Discussions で質問
- **Security**: セキュリティ問題は非公開で報告

---

詳細な開発ルールについては [CLAUDE.md](./CLAUDE.md) を参照してください。