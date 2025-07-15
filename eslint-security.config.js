// Chronopost - Security-focused ESLint Configuration
import { fixupConfigRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

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
  
  // Security-focused rules configuration
  ...fixupConfigRules(compat.extends('eslint:recommended')),
  
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      // OAuth/認証セキュリティ
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // 機密情報の漏洩防止
      'no-console': ['error', { allow: ['warn', 'error'] }],
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
      'no-void': 'error',
      
      // CSRF対策
      'no-unused-expressions': 'error',
      
      // SQLインジェクション対策（基本）
      'no-template-curly-in-string': 'error',
      
      // DoS攻撃対策
      'no-await-in-loop': 'warn',
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-unreachable-loop': 'error',
      
      // メモリリーク防止
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-global-assign': 'error',
      
      // 型安全性（セキュリティ観点）
      'valid-typeof': 'error',
      'use-isnan': 'error',
      
      // 暗号化関連
      'no-bitwise': 'warn', // ビット演算は暗号化で使用する場合のみ許可
      
      // ファイルシステムセキュリティ
      'no-path-concat': 'off', // Node.js環境では path.join() を推奨
    },
  },
  
  // Backend特有のセキュリティルール
  {
    files: ['packages/backend/**/*.ts'],
    rules: {
      // サーバーサイドセキュリティ
      'no-process-env': 'off', // バックエンドでは環境変数使用を許可
      'no-process-exit': 'error',
      
      // OAuth実装セキュリティ
      'no-magic-numbers': ['warn', { 
        ignore: [0, 1, -1, 200, 201, 400, 401, 403, 404, 500],
        ignoreArrayIndexes: true 
      }],
      
      // データベースセキュリティ
      'no-template-curly-in-string': 'error',
      
      // ログセキュリティ
      'no-console': ['warn', { allow: ['info', 'warn', 'error'] }],
    },
  },
  
  // Frontend特有のセキュリティルール
  {
    files: ['packages/frontend/**/*.ts', 'packages/frontend/**/*.tsx'],
    rules: {
      // クライアントサイドセキュリティ
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-script-url': 'error',
      
      // 機密情報の露出防止
      'no-console': 'error', // フロントエンドでは console 使用禁止
      
      // XSS対策
      'no-unsanitized/property': 'off', // プラグインが必要
      'no-unsanitized/method': 'off',   // プラグインが必要
      
      // OAuth クライアントセキュリティ
      'no-template-curly-in-string': 'error',
    },
  },
  
  // 共有パッケージのセキュリティルール
  {
    files: ['packages/shared/**/*.ts'],
    rules: {
      // 共有ライブラリセキュリティ
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      
      // 型安全性強化
      'no-any': 'off', // TypeScript plugin が必要
      'prefer-unknown-to-any': 'off', // TypeScript plugin が必要
    },
  },
  
  // テストファイルのセキュリティルール
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/tests/**/*.ts'],
    rules: {
      // テスト環境では一部制限を緩和
      'no-console': 'off',
      'no-magic-numbers': 'off',
      'no-unused-expressions': 'off', // expect().toBe() などで使用
    },
  },
  
  // 設定ファイルのセキュリティルール
  {
    files: [
      '*.config.js',
      '*.config.ts',
      'eslint.config.js',
      'eslint-security.config.js',
    ],
    rules: {
      // 設定ファイルでは一部制限を緩和
      'no-console': 'off',
      'no-process-env': 'off',
    },
  },
];
