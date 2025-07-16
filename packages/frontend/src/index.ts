/**
 * Chronopost Frontend Entry Point
 * OAuth認証フローとUI実装（将来実装予定）
 */

import type { OAuthTokenResponse, UserProfile } from '@chronopost/shared';

// セキュリティ注意: フロントエンドではclient_secretを使用禁止
// OAuth認証はPKCE (Proof Key for Code Exchange) を使用

export interface OAuthConfig {
  clientId: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  redirectUri: string;
  scope: string;
  // client_secret は含めない（セキュリティ要件）
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  error: string | null;
}

// フロントエンド用のセキュアなOAuth設定例
export const defaultOAuthConfig: OAuthConfig = {
  clientId: process.env.VITE_OAUTH_CLIENT_ID || '',
  authorizationEndpoint: 'https://auth.bsky.social/oauth/authorize',
  tokenEndpoint: 'https://auth.bsky.social/oauth/token',
  redirectUri: `${window.location.origin}/oauth/callback`,
  scope: 'atproto transition:generic',
};

// 将来実装される機能のプレースホルダー
export const authService = {
  // OAuth認証開始
  startOAuthFlow: async (config: OAuthConfig) => {
    // PKCE実装
    throw new Error('Not implemented yet');
  },
  
  // OAuth コールバック処理
  handleOAuthCallback: async (code: string, state: string) => {
    // 認証コード交換
    throw new Error('Not implemented yet');
  },
  
  // ログアウト
  logout: async () => {
    // セッション無効化
    throw new Error('Not implemented yet');
  },
};

export default authService;
