# ワークフロー設計

このドキュメントでは、Chronopostの主要な処理フローを詳細に説明します。OAuth認証、予約投稿作成、自動実行の各プロセスを可視化しています。

## 1. OAuth認証フロー

### 要件
- AT Protocol OAuth 2.0 + DPoP認証
- PKCE（Proof Key for Code Exchange）必須
- コンフィデンシャルクライアント実装
- セッション管理とトークンローテーション

### シーケンス図

```mermaid
sequenceDiagram
    actor U as User
    participant C as Client (Frontend)
    participant A as Application Server
    participant M as Metadata Endpoint
    participant O as OAuth Server
    participant P as PDS (Personal Data Server)
    
    Note over U,P: Phase 1: OAuth Discovery & Setup
    U->>C: ログインリクエスト
    C->>A: OAuth認証開始
    A->>A: PKCE Code Verifier/Challenge生成
    A->>A: DPoP Key Pair生成 (ES256)
    A->>M: Client Metadata確認
    M->>A: Client Metadata返却
    
    Note over U,P: Phase 2: Authorization Request
    A->>O: PAR (Pushed Authorization Request)
    Note right of A: client_id, code_challenge,<br/>redirect_uri, scope, DPoP proof
    O->>A: request_uri返却
    A->>C: Authorization URL返却
    C->>U: OAuth画面リダイレクト
    
    Note over U,P: Phase 3: User Authorization
    U->>O: 認証・認可
    O->>C: 認可コード返却 (callback)
    C->>A: 認可コード送信
    
    Note over U,P: Phase 4: Token Exchange
    A->>O: Token Request
    Note right of A: grant_type=authorization_code<br/>code, code_verifier, DPoP proof
    O->>A: Access/Refresh Token返却
    A->>A: トークン暗号化保存
    A->>C: 認証成功レスポンス
    C->>U: ダッシュボード画面表示
```

### DPoP実装詳細フロー

```mermaid
graph TD
    A[DPoP Key Pair生成] --> B[ES256 Private/Public Key]
    B --> C[DPoP Proof JWT作成]
    C --> D[HTTP Header: DPoP]
    D --> E[API Request送信]
    E --> F{Nonce Error?}
    F -->|Yes| G[Server Nonceを取得]
    G --> C
    F -->|No| H[Request成功]
    
    subgraph "DPoP Proof構造"
        I[Header: alg=ES256, typ=dpop+jwt, jwk]
        J[Payload: jti, htm, htu, iat, nonce]
        K[Signature: ES256]
    end
```

## 2. 予約投稿作成フロー

### Phase 1: シンプルテキスト投稿

```mermaid
graph TD
    A[ユーザー投稿画面アクセス] --> B[認証状態確認]
    B --> C{認証済み?}
    C -->|No| D[ログイン画面へ]
    C -->|Yes| E[投稿作成フォーム表示]
    
    E --> F[投稿内容入力]
    F --> G[予約日時設定]
    G --> H[投稿内容バリデーション]
    H --> I{バリデーション通過?}
    I -->|No| J[エラー表示]
    J --> F
    I -->|Yes| K[データベース保存]
    K --> L[保存完了通知]
    L --> M[投稿一覧画面表示]
    
    subgraph "バリデーション項目"
        N[文字数制限: 300文字]
        O[予約時刻: 未来の時刻]
        P[内容: 空でない]
        Q[特殊文字チェック]
    end
```

### Phase 2: スレッド投稿対応

```mermaid
graph TD
    A[投稿作成開始] --> B{スレッド投稿?}
    B -->|No| C[単体投稿作成]
    B -->|Yes| D[スレッドルート投稿作成]
    
    D --> E[リプライ投稿追加]
    E --> F[親子関係設定]
    F --> G[実行順序番号設定]
    G --> H{さらにリプライ追加?}
    H -->|Yes| E
    H -->|No| I[スレッド全体保存]
    
    C --> J[データベース保存]
    I --> J
    J --> K[保存完了]
    
    subgraph "スレッド構造例"
        L["Root Post (index: 0)"]
        M["├─ Reply 1 (index: 1)"]
        N["├─ Reply 2 (index: 2)"]
        O["└─ Reply 3 (index: 3)"]
    end
```

### Phase 3: リッチコンテンツ対応

```mermaid
graph TD
    A[投稿作成] --> B[コンテンツタイプ選択]
    B --> C{メディア添付?}
    C -->|Yes| D[ファイルアップロード]
    D --> E[メディア処理]
    E --> F[Alt Text設定]
    F --> G[メディア情報保存]
    
    C -->|No| H{URL含む?}
    G --> H
    H -->|Yes| I[OGP情報取得]
    I --> J[リンクカード生成]
    J --> K[リンクカード保存]
    
    H -->|No| L[テキスト解析]
    K --> L
    L --> M[メンション抽出]
    M --> N[ハッシュタグ抽出]
    N --> O[エンティティ保存]
    O --> P[最終データ保存]
    
    subgraph "メディア処理"
        Q[画像: リサイズ・最適化]
        R[動画: エンコード・サムネイル]
        S[形式チェック・ウイルススキャン]
    end
```

## 3. 投稿自動実行フロー

### メインスケジューラー処理

```mermaid
graph TD
    A[Cronトリガー: 毎分実行] --> B[排他制御チェック]
    B --> C{他のプロセス実行中?}
    C -->|Yes| D[スキップ]
    C -->|No| E[実行ロック取得]
    E --> F[実行対象投稿検索]
    
    F --> G[対象投稿取得]
    G --> H{投稿あり?}
    H -->|No| I[ロック解放]
    H -->|Yes| J[投稿実行処理]
    
    J --> K[全投稿処理完了]
    K --> I
    I --> L[次回実行待機]
    
    subgraph "検索条件"
        M[status = PENDING]
        N[scheduledAt <= 現在時刻]
        O[canExecute = true]
        P[retryCount < MAX_RETRY]
    end
```

### 個別投稿実行フロー

```mermaid
sequenceDiagram
    participant S as Scheduler
    participant T as Token Manager
    participant B as Bluesky API
    participant D as Database
    
    Note over S,D: Phase 1: 前処理
    S->>D: 投稿ステータス更新 (EXECUTING)
    S->>T: アクセストークン確認
    T->>T: トークン有効期限チェック
    
    alt トークン期限切れ
        T->>B: リフレッシュトークン使用
        B->>T: 新しいアクセストークン
        T->>D: 新トークン暗号化保存
    end
    
    Note over S,D: Phase 2: 投稿実行
    S->>B: DPoP Proof生成
    S->>B: 投稿API呼び出し
    B->>S: 投稿結果返却
    
    alt 成功
        S->>D: ステータス更新 (COMPLETED)
        S->>D: 実行時刻・URI保存
        S->>D: 予約データ削除
    else 失敗
        S->>D: エラーログ保存
        S->>D: リトライカウント更新
        alt リトライ可能
            S->>D: ステータス戻し (PENDING)
        else リトライ上限
            S->>D: ステータス更新 (FAILED)
        end
    end
```

### スレッド投稿実行フロー

```mermaid
graph TD
    A[スレッド実行開始] --> B[ルート投稿取得]
    B --> C[子投稿一覧取得]
    C --> D[実行順序ソート]
    D --> E[最初の投稿実行]
    E --> F{実行成功?}
    F -->|No| G[スレッド全体失敗]
    F -->|Yes| H[次の投稿あり?]
    H -->|No| I[スレッド完了]
    H -->|Yes| J[次投稿の依存関係確認]
    J --> K[親投稿URI設定]
    K --> L[リプライとして投稿]
    L --> M{実行成功?}
    M -->|No| N[残り投稿キャンセル]
    M -->|Yes| H
    
    subgraph "エラーハンドリング"
        O[親投稿失敗 → 子投稿全てキャンセル]
        P[中間投稿失敗 → 後続投稿キャンセル]
        Q[リトライは個別投稿単位]
    end
```

## 4. トークン管理フロー

### 自動リフレッシュ機構

```mermaid
graph TD
    A[API Request] --> B[アクセストークン取得]
    B --> C{有効期限チェック}
    C -->|期限内| D[トークン使用]
    C -->|期限切れ近い| E[バックグラウンドリフレッシュ]
    C -->|期限切れ| F[同期リフレッシュ]
    
    E --> G[リフレッシュ実行]
    F --> G
    G --> H{リフレッシュ成功?}
    H -->|Yes| I[新トークン保存]
    H -->|No| J[エラーハンドリング]
    I --> D
    J --> K[セッション無効化]
    K --> L[再認証要求]
    
    subgraph "同時リフレッシュ防止"
        M[Mutex Lock使用]
        N[進行中チェック]
        O[待機・再試行]
    end
```

### セッション管理フロー

```mermaid
stateDiagram-v2
    [*] --> CREATED: OAuth認証完了
    CREATED --> ACTIVE: 初回トークン取得
    ACTIVE --> REFRESHING: トークンリフレッシュ
    REFRESHING --> ACTIVE: リフレッシュ成功
    REFRESHING --> EXPIRED: リフレッシュ失敗
    ACTIVE --> EXPIRED: 期限切れ
    EXPIRED --> [*]: セッション削除
    ACTIVE --> REVOKED: ユーザーが無効化
    REVOKED --> [*]: セッション削除
    
    note right of ACTIVE
        定期的なトークンリフレッシュ
        API使用によるlastUsedAt更新
    end note
    
    note right of EXPIRED
        再認証が必要
        依存する予約投稿は失敗扱い
    end note
```

## 5. エラーハンドリングフロー

### 段階的エラー対応

```mermaid
graph TD
    A[エラー発生] --> B[エラー分類]
    B --> C{ネットワークエラー?}
    C -->|Yes| D[指数バックオフリトライ]
    C -->|No| E{認証エラー?}
    E -->|Yes| F[トークンリフレッシュ]
    E -->|No| G{レート制限?}
    G -->|Yes| H[待機後リトライ]
    G -->|No| I{サーバーエラー?}
    I -->|Yes| J[短時間後リトライ]
    I -->|No| K[致命的エラー]
    
    D --> L{リトライ上限?}
    F --> M{リフレッシュ成功?}
    H --> L
    J --> L
    K --> N[エラーログ記録]
    
    L -->|No| O[次回リトライスケジュール]
    L -->|Yes| N
    M -->|Yes| P[元処理リトライ]
    M -->|No| N
    
    N --> Q[ユーザー通知]
    O --> R[処理継続]
    P --> R
    Q --> S[処理終了]
    
    subgraph "リトライ戦略"
        T[1回目: 30秒後]
        U[2回目: 2分後]
        V[3回目: 8分後]
        W[4回目以降: 失敗扱い]
    end
```

## 6. メディア処理フロー (Phase 3)

### 画像アップロードフロー

```mermaid
graph TD
    A[画像選択] --> B[クライアント側バリデーション]
    B --> C{ファイル形式OK?}
    C -->|No| D[エラー表示]
    C -->|Yes| E[ファイルサイズチェック]
    E --> F{サイズ制限内?}
    F -->|No| G[リサイズ提案]
    F -->|Yes| H[サーバーアップロード]
    G --> I[ユーザー選択]
    I --> J{リサイズ実行?}
    J -->|Yes| K[クライアント側リサイズ]
    J -->|No| D
    K --> H
    
    H --> L[サーバー側処理開始]
    L --> M[ウイルススキャン]
    M --> N{安全?}
    N -->|No| O[アップロード拒否]
    N -->|Yes| P[画像最適化]
    P --> Q[Alt Text入力待機]
    Q --> R[メタデータ保存]
    R --> S[Blob作成準備]
    
    subgraph "画像最適化処理"
        T[EXIF削除]
        U[形式統一: WebP/JPEG]
        V[品質調整]
        W[サムネイル生成]
    end
```

### 動画処理フロー (Phase 4)

```mermaid
graph TD
    A[動画アップロード] --> B[プラン確認]
    B --> C{動画機能有効?}
    C -->|No| D[プラン升级提案]
    C -->|Yes| E[容量制限チェック]
    E --> F{制限内?}
    F -->|No| G[容量不足通知]
    F -->|Yes| H[アップロード開始]
    
    H --> I[チャンク分割アップロード]
    I --> J[サーバー側結合]
    J --> K[形式・コーデックチェック]
    K --> L{対応形式?}
    L -->|No| M[変換処理]
    L -->|Yes| N[メタデータ抽出]
    M --> N
    N --> O[サムネイル生成]
    O --> P[プレビュー作成]
    P --> Q[Blob準備完了]
    
    subgraph "動画処理"
        R[H.264エンコード]
        S[解像度調整]
        T[ビットレート最適化]
        U[複数フォーマット出力]
    end
```

## 7. 監視・ログフロー

### システム監視フロー

```mermaid
graph TD
    A[システム稼働] --> B[メトリクス収集]
    B --> C[ヘルスチェック]
    C --> D[パフォーマンス監視]
    D --> E[エラー率監視]
    E --> F{閾値超過?}
    F -->|No| G[正常状態]
    F -->|Yes| H[アラート発生]
    H --> I[管理者通知]
    I --> J[自動復旧試行]
    J --> K{復旧成功?}
    K -->|Yes| L[正常復帰ログ]
    K -->|No| M[緊急対応要請]
    
    G --> N[定期レポート生成]
    L --> N
    M --> O[緊急メンテナンス]
    N --> B
    
    subgraph "監視項目"
        P[API応答時間]
        Q[投稿成功率]
        R[認証エラー率]
        S[データベース接続]
        T[メモリ使用量]
    end
```

### ログ管理フロー

```mermaid
graph TD
    A[アプリケーション動作] --> B[ログ生成]
    B --> C[ログレベル判定]
    C --> D{重要度}
    D -->|DEBUG| E[開発環境のみ]
    D -->|INFO| F[標準ログ]
    D -->|WARN| G[警告ログ]
    D -->|ERROR| H[エラーログ]
    
    F --> I[ローテーション]
    G --> I
    H --> J[即座にアラート]
    J --> I
    I --> K[ログ保存]
    K --> L[検索インデックス]
    L --> M[分析・集計]
    
    subgraph "機密情報除外"
        N[トークンマスク]
        O[パスワード除外]
        P[PII匿名化]
    end
```

## 8. データベース管理フロー

### マイグレーション管理

```mermaid
graph TD
    A[スキーマ変更] --> B[マイグレーションファイル作成]
    B --> C[開発環境テスト]
    C --> D{テスト通過?}
    D -->|No| E[修正・再テスト]
    D -->|Yes| F[ステージング環境デプロイ]
    F --> G[統合テスト]
    G --> H{問題なし?}
    H -->|No| I[ロールバック]
    H -->|Yes| J[本番環境準備]
    J --> K[メンテナンス時間設定]
    K --> L[バックアップ作成]
    L --> M[マイグレーション実行]
    M --> N[動作確認]
    N --> O{成功?}
    O -->|No| P[緊急ロールバック]
    O -->|Yes| Q[サービス再開]
    
    E --> C
    I --> R[問題調査]
    P --> S[障害対応]
    R --> A
    S --> T[復旧作業]
```

### データクリーンアップフロー

```mermaid
graph TD
    A[定期クリーンアップ実行] --> B[期限切れセッション検索]
    B --> C[無効セッション削除]
    C --> D[完了済み投稿検索]
    D --> E[古い投稿データ削除]
    E --> F[孤立メディアファイル検索]
    F --> G[未使用ファイル削除]
    G --> H[ログファイルローテーション]
    H --> I[統計情報更新]
    I --> J[クリーンアップ完了]
    
    subgraph "削除対象"
        K[30日以上前の完了投稿]
        L[7日以上前の失敗投稿]
        M[90日以上前の無効セッション]
        N[参照されていないメディア]
    end
```

## 9. デプロイメントフロー

### CI/CDパイプライン

```mermaid
graph TD
    A[Git Push] --> B[CI/CDトリガー]
    B --> C[コードチェックアウト]
    C --> D[依存関係インストール]
    D --> E[TypeScript型チェック]
    E --> F[ESLint + Prettier]
    F --> G[単体テスト実行]
    G --> H[統合テスト実行]
    H --> I[セキュリティスキャン]
    I --> J{全テスト通過?}
    J -->|No| K[ビルド失敗通知]
    J -->|Yes| L[Dockerイメージビルド]
    L --> M[イメージプッシュ]
    M --> N{ブランチ判定}
    N -->|main| O[本番デプロイ]
    N -->|staging| P[ステージングデプロイ]
    N -->|other| Q[テスト環境デプロイ]
    
    O --> R[ヘルスチェック]
    P --> R
    Q --> R
    R --> S{正常?}
    S -->|Yes| T[デプロイ完了通知]
    S -->|No| U[ロールバック]
    K --> V[開発者通知]
    U --> V
```

## 10. セキュリティフロー

### セキュリティ監視

```mermaid
graph TD
    A[リクエスト受信] --> B[レート制限チェック]
    B --> C{制限内?}
    C -->|No| D[リクエスト拒否]
    C -->|Yes| E[認証チェック]
    E --> F{認証済み?}
    F -->|No| G[認証エラー]
    F -->|Yes| H[権限チェック]
    H --> I{権限OK?}
    I -->|No| J[認可エラー]
    I -->|Yes| K[入力バリデーション]
    K --> L{安全?}
    L -->|No| M[不正入力拒否]
    L -->|Yes| N[処理実行]
    
    D --> O[ログ記録]
    G --> O
    J --> O
    M --> O
    O --> P[セキュリティ分析]
    P --> Q{攻撃パターン?}
    Q -->|Yes| R[IP自動ブロック]
    Q -->|No| S[正常ログ]
    
    subgraph "セキュリティ対策"
        T[SQL Injection防止]
        U[XSS防止]
        V[CSRF保護]
        W[DDoS対策]
    end
```

このワークフロー設計により、OAuth認証からメディア処理、システム監視まで、包括的な処理フローが可視化されました。各フェーズの実装時には、対応するフローを参考に詳細な実装を進めることができます。