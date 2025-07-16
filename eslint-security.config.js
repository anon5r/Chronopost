// Chronopost - Security-focused ESLint Configuration
// 簡素化版：確実に動作する最小限のセキュリティルール
import noSecretsPlugin from 'eslint-plugin-no-secrets';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.next/**',
      '**/out/**',
    ],
  },
  
  // JavaScript/TypeScript共通のセキュリティルール
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        crypto: 'readonly',
        globalThis: 'readonly',
      },
    },
    plugins: {
      'no-secrets': noSecretsPlugin,
    },
    rules: {
      // 機密情報検出（高優先度）
      'no-secrets/no-secrets': ['error', {
        tolerance: 4.2,
        ignoreContent: [
          'example',
          'test',
          'demo',
          'localhost',
          'abcdef',
          '123456',
          'password',
          'secret',
        ],
        ignoreIdentifiers: [
          'PUBLIC_KEY',
          'EXAMPLE_',
          'TEST_',
          'DEMO_',
          '__dirname',
          '__filename',
        ],
        ignoreModules: true,
        additionalRegexes: {
          'DPoP Private Key': '-----BEGIN PRIVATE KEY-----[\\s\\S]*-----END PRIVATE KEY-----',
          'OAuth Token': '[A-Za-z0-9_-]{20,}',
          'Client Secret': 'client_secret[\\s]*[=:][\\s]*[\'"`]?[A-Za-z0-9_-]{20,}[\'"`]?',
          'Access Token': 'access_token[\\s]*[=:][\\s]*[\'"`]?[A-Za-z0-9_.-]{20,}[\'"`]?',
        }
      }],
      
      // OAuth/認証セキュリティ
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // 機密情報の漏洩防止
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      
      // プロトタイプ汚染対策
      'no-prototype-builtins': 'error',
      'no-extend-native': 'error',
      
      // 危険な正規表現
      'no-invalid-regexp': 'error',
      'no-regex-spaces': 'error',
      
      // XSS対策
      'no-script-url': 'error',
      
      // SQLインジェクション対策
      'no-template-curly-in-string': 'error',
      
      // DoS攻撃対策
      'no-await-in-loop': 'warn',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      
      // メモリリーク防止
      'no-unused-vars': 'error',
      'no-global-assign': 'error',
      
      // 型安全性
      'valid-typeof': 'error',
      'use-isnan': 'error',
      
      // 暗号化関連
      'no-bitwise': 'warn', // 暗号化で使用する場合のみ許可
    },
  },
  
  // Backend特有のセキュリティルール
  {
    files: ['packages/backend/**/*.ts', 'packages/backend/**/*.js'],
    rules: {
      // サーバーサイドセキュリティ
      'no-process-env': 'off', // バックエンドでは環境変数使用を許可
      'no-process-exit': 'error',
      
      // ログセキュリティ（バックエンドではinfoログ許可）
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
      
      // OAuth/DPoP実装セキュリティ
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 200, 201, 400, 401, 403, 404, 500],
        ignoreArrayIndexes: true 
      }],
      
      // 暗号化ライブラリセキュリティ
      'no-bitwise': ['warn', { 
        allow: ['&', '|', '^', '~', '<<', '>>', '>>>'],
        int32Hint: true 
      }],
    },
  },
  
  // Frontend特有のセキュリティルール
  {
    files: ['packages/frontend/**/*.ts', 'packages/frontend/**/*.tsx', 'packages/frontend/**/*.js', 'packages/frontend/**/*.jsx'],
    rules: {
      // クライアントサイドセキュリティ
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      
      // 機密情報の露出防止（フロントエンドでは厳格）
      'no-console': 'error', // フロントエンドでは console 使用禁止
      
      // OAuth クライアントセキュリティ
      'no-template-curly-in-string': 'error',
    },
  },
  
  // 共有パッケージのセキュリティルール
  {
    files: ['packages/shared/**/*.ts', 'packages/shared/**/*.js'],
    rules: {
      // 共有ライブラリセキュリティ
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
    },
  },
  
  // テストファイルのセキュリティルール
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.js', '**/*.spec.js', '**/tests/**/*.ts', '**/tests/**/*.js'],
    rules: {
      // テスト環境では一部制限を緩和
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'no-unused-expressions': 'off', // expect().toBe() などで使用
      'no-secrets/no-secrets': 'off', // テストでは機密情報のモックを使用
    },
  },
  
  // 設定ファイルのセキュリティルール
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'eslint.config.js',
      'eslint-security.config.js',
      'jest.config.js',
      'prettier.config.js',
    ],
    rules: {
      // 設定ファイルでは一部制限を緩和
      'no-console': 'off',
      'no-process-env': 'off',
      'no-secrets/no-secrets': 'off', // 設定ファイルでは例文を使用する場合がある
    },
  },
];
