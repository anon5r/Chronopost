# Chronopost

BlueskyのOAuth認証を使用した予約投稿システム

## 概要

Chronopostは、BlueskyソーシャルネットワークのユーザーがDPoP（Demonstrating Proof
of
Possession）を使用したOAuth認証によってログインし、投稿を予約できるシステムです。

## 主な機能

- OAuth認証（AT Protocol OAuth with DPoP）
- 予約投稿の作成・管理
- cronベースのスケジューラーによる自動投稿

## 技術スタック

- **バックエンド**: Node.js 22, TypeScript, Hono, PostgreSQL, Prisma
- **フロントエンド**: React, TypeScript, Vite
- **認証**: BlueskyのOAuth with DPoP
- **コンテナ化**: Docker, Docker Compose

## 開発環境のセットアップ

### 必要条件

- Node.js 22
- pnpm 10.13.0
- PostgreSQL（ローカルまたはDocker）

### オプション1: PostgreSQLのみDockerで実行

1. PostgreSQLをDockerで起動:

```bash
# PostgreSQLのみをDockerで起動
docker compose up -d postgres
```

2. 依存関係をインストール:

```bash
pnpm install
```

3. 環境変数の設定:

```bash
# backend/.envを編集（必要に応じて）
```

4. データベースのセットアップ:

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

5. 開発モードで起動:

```bash
pnpm dev
```

6. アプリケーションにアクセス:

- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:3000
- ヘルスチェック: http://localhost:3000/health

### オプション2: すべてDockerで実行

1. リポジトリをクローン:

```bash
git clone https://github.com/yourusername/chronopost.git
cd chronopost
```

2. 依存関係のインストールとビルド（先にローカルで依存関係を解決）:

```bash
pnpm install
```

3. コンテナをビルドして起動:

```bash
docker compose build
docker compose up -d
```

4. データベースの初期化:

```bash
docker compose --profile db-init up db-init
```

## 開発コマンド

```bash
# 依存関係のインストール
pnpm install

# 開発モードで実行
pnpm dev

# データベース生成
pnpm db:generate

# マイグレーション実行
pnpm db:migrate

# シードデータ投入
pnpm db:seed

# テスト実行
pnpm test

# リント
pnpm lint

# 型チェック
pnpm type-check
```

## 実装フェーズ

プロジェクトは段階的に実装されています：

- **Phase 1**: OAuth認証・基本テキスト投稿・スケジューラー（現在の実装）
- **Phase 2**: スレッド投稿・親子関係・依存関係管理（計画中）
- **Phase 3**: 画像・リンクカード・メンション・ハッシュタグ（計画中）
- **Phase 4**: 動画・分析・有料プラン・高度な機能（計画中）

## ディレクトリ構造

```
chronopost/
├── packages/
│   ├── backend/      # バックエンドアプリケーション
│   ├── frontend/     # フロントエンドアプリケーション
│   └── shared/       # 共有型定義とユーティリティ
├── scripts/          # 開発・デプロイスクリプト
├── compose.yml       # Docker Compose設定
└── Makefile          # 開発用コマンド集
```

## ライセンス

MIT
